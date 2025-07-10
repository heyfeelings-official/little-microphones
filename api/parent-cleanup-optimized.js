/**
 * api/parent-cleanup-optimized.js - Optimized Parent LMID Cleanup Service
 * 
 * PURPOSE: Ultra-fast removal of deleted LMIDs from parent metadata using Member IDs
 * DEPENDENCIES: Supabase, Memberstack Admin API
 * 
 * OPTIMIZATION:
 * - Uses parent_lmids table with Member IDs (not emails!)
 * - Single database query to find affected parents
 * - Direct Memberstack API calls with Member ID
 * - No email lookups needed - MUCH FASTER!
 * 
 * VERSION: 4.0.0 - OPTIMIZED WITH MEMBER IDS
 * LAST UPDATED: January 2025
 */

import { getSupabaseClient, updateMemberstackMetadata } from '../utils/lmid-utils.js';

/**
 * Get parent Member IDs associated with a specific LMID from database
 */
async function getAssociatedParentMemberIds(lmidToFind) {
    const supabase = getSupabaseClient();
    
    console.log(`🔍 [getAssociatedParentMemberIds] Finding parent Member IDs for LMID ${lmidToFind}`);
    
    try {
        const { data, error } = await supabase
            .from('parent_lmids')
            .select('parent_member_id')
            .eq('lmid', lmidToFind);
            
        if (error) {
            console.error(`❌ Database error:`, error);
            return [];
        }
        
        const parentMemberIds = data?.map(row => row.parent_member_id) || [];
        console.log(`🔍 [getAssociatedParentMemberIds] Found ${parentMemberIds.length} associated parent Member IDs`);
        
        return parentMemberIds;
        
    } catch (error) {
        console.error(`❌ [getAssociatedParentMemberIds] Error:`, error);
        return [];
    }
}

/**
 * Get parent metadata from Memberstack by Member ID (FAST!)
 */
async function getParentMetadataByMemberId(memberId) {
    const MEMBERSTACK_SECRET_KEY = process.env.MEMBERSTACK_SECRET_KEY;
    
    if (!MEMBERSTACK_SECRET_KEY) {
        throw new Error('Memberstack secret key not configured');
    }
    
    try {
        const response = await fetch(`https://admin.memberstack.com/members/${memberId}`, {
            method: 'GET',
            headers: {
                'x-api-key': MEMBERSTACK_SECRET_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return {
                id: memberId,
                email: data.data?.auth?.email || data.data?.email || 'unknown',
                metaData: data.data?.metaData || {}
            };
        } else {
            console.warn(`⚠️ Failed to fetch member ${memberId}: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error fetching member ${memberId}:`, error);
        return null;
    }
}

/**
 * Remove LMID from a member's metadata string
 */
function removeLmidFromString(lmidString, lmidToRemove) {
    if (!lmidString) return '';
    
    const lmidArray = lmidString.split(',').map(id => id.trim());
    const filteredArray = lmidArray.filter(id => id !== lmidToRemove.toString());
    return filteredArray.join(',');
}

/**
 * Remove parent Member ID from parent_lmids table
 */
async function removeParentMemberIdAssociation(lmid, parentMemberId) {
    const supabase = getSupabaseClient();
    
    try {
        const { error } = await supabase
            .from('parent_lmids')
            .delete()
            .eq('lmid', lmid)
            .eq('parent_member_id', parentMemberId);
        
        if (error) {
            console.error(`❌ Failed to remove parent Member ID association:`, error);
        } else {
            console.log(`✅ Removed parent ${parentMemberId} association with LMID ${lmid}`);
        }
    } catch (error) {
        console.error(`❌ Error removing parent Member ID association:`, error);
    }
}

/**
 * OPTIMIZED cleanup parent metadata using Member IDs (FAST!)
 */
export async function cleanupParentMetadataOptimized(lmidToRemove, teacherMemberId = null) {
    console.log(`🚀 [cleanupParentMetadataOptimized] Starting OPTIMIZED cleanup for LMID ${lmidToRemove}`);
    
    try {
        // Get associated parent Member IDs from database (FAST!)
        const parentMemberIds = await getAssociatedParentMemberIds(lmidToRemove);
        
        // Filter out teacher Member ID if needed
        const memberIdsToClean = teacherMemberId 
            ? parentMemberIds.filter(memberId => memberId !== teacherMemberId)
            : parentMemberIds;
        
        if (memberIdsToClean.length === 0) {
            console.log(`✅ [cleanupParentMetadataOptimized] No parent Member IDs to clean up`);
            return {
                success: true,
                message: 'No parents to clean up',
                cleanedParents: 0,
                details: []
            };
        }
        
        console.log(`🚀 [cleanupParentMetadataOptimized] Cleaning up ${memberIdsToClean.length} parent accounts`);
        
        const cleanupResults = [];
        let successCount = 0;
        
        // Process parents in parallel batches
        const PARALLEL_BATCH_SIZE = 5;
        
        for (let i = 0; i < memberIdsToClean.length; i += PARALLEL_BATCH_SIZE) {
            const batch = memberIdsToClean.slice(i, i + PARALLEL_BATCH_SIZE);
            
            const batchPromises = batch.map(async (parentMemberId) => {
                try {
                    // Get parent metadata directly by Member ID (FAST!)
                    const parent = await getParentMetadataByMemberId(parentMemberId);
                    
                    if (!parent) {
                        console.warn(`⚠️ Could not fetch parent data for ${parentMemberId}`);
                        return {
                            memberId: parentMemberId,
                            memberEmail: 'unknown',
                            oldLmids: 'unknown',
                            newLmids: null,
                            success: false,
                            error: 'Could not fetch parent data'
                        };
                    }
                    
                    const oldLmids = parent.metaData?.lmids || '';
                    const newLmids = removeLmidFromString(oldLmids, lmidToRemove);
                    
                    console.log(`🧹 Updating parent ${parentMemberId}: "${oldLmids}" → "${newLmids}"`);
                    
                    // Update Memberstack metadata (FAST - direct Member ID!)
                    const updateSuccess = await updateMemberstackMetadata(parentMemberId, newLmids, true);
                    
                    if (updateSuccess) {
                        // Remove from parent_lmids table
                        await removeParentMemberIdAssociation(lmidToRemove, parentMemberId);
                        successCount++;
                        console.log(`✅ Successfully updated parent ${parentMemberId}`);
                    } else {
                        console.error(`❌ Failed to update parent ${parentMemberId}`);
                    }
                    
                    return {
                        memberId: parentMemberId,
                        memberEmail: parent.email,
                        oldLmids: oldLmids,
                        newLmids: newLmids,
                        success: updateSuccess
                    };
                    
                } catch (error) {
                    console.error(`❌ Error updating parent ${parentMemberId}:`, error);
                    return {
                        memberId: parentMemberId,
                        memberEmail: 'unknown',
                        oldLmids: 'unknown',
                        newLmids: null,
                        success: false,
                        error: error.message
                    };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            cleanupResults.push(...batchResults);
        }
        
        console.log(`✅ [cleanupParentMetadataOptimized] OPTIMIZED cleanup completed: ${successCount}/${memberIdsToClean.length} successful`);
        
        return {
            success: true,
            message: `OPTIMIZED parent cleanup completed: ${successCount}/${memberIdsToClean.length} successful`,
            cleanedParents: successCount,
            totalFound: memberIdsToClean.length,
            details: cleanupResults
        };
        
    } catch (error) {
        console.error(`❌ [cleanupParentMetadataOptimized] Error during cleanup:`, error);
        throw error;
    }
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }

    try {
        const { lmidToRemove, teacherMemberId } = req.body;

        if (!lmidToRemove) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameter: lmidToRemove' 
            });
        }

        // Validate LMID is a number
        const lmidNum = parseInt(lmidToRemove, 10);
        if (isNaN(lmidNum) || lmidNum <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'LMID must be a positive integer' 
            });
        }

        console.log(`🚀 [parent-cleanup-optimized] Starting OPTIMIZED parent cleanup for LMID ${lmidNum}`);
        
        // Use OPTIMIZED cleanup method
        const result = await cleanupParentMetadataOptimized(lmidNum, teacherMemberId);

        return res.status(200).json(result);

    } catch (error) {
        console.error('❌ [parent-cleanup-optimized] Unexpected error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error during OPTIMIZED parent cleanup',
            details: error.message
        });
    }
} 