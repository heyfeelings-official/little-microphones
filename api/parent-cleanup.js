/**
 * api/parent-cleanup.js - Parent LMID Cleanup Service
 * 
 * PURPOSE: Ultra-fast removal of deleted LMIDs from parent metadata using associated_parents tracking
 * DEPENDENCIES: Supabase, Memberstack Admin API
 * 
 * OPTIMIZATION:
 * - Uses associated_parents column in lmids table
 * - Single database query to find affected parents
 * - Batch updates for maximum performance
 * - Scales to millions of users without performance impact
 * 
 * VERSION: 3.0.0
 * LAST UPDATED: January 2025
 */

import { getSupabaseClient, updateMemberstackMetadata } from '../utils/lmid-utils.js';

/**
 * Get parent emails associated with a specific LMID from database
 */
async function getAssociatedParentEmails(lmidToFind) {
    const supabase = getSupabaseClient();
    
    console.log(`🔍 [getAssociatedParentEmails] Finding parent emails for LMID ${lmidToFind}`);
    
    try {
        const { data, error } = await supabase
            .from('lmids')
            .select('associated_parent_emails')
            .eq('lmid', lmidToFind)
            .single();
            
        if (error) {
            console.error(`❌ Database error:`, error);
            return [];
        }
        
        const parentEmails = data?.associated_parent_emails || [];
        console.log(`🔍 [getAssociatedParentEmails] Found ${parentEmails.length} associated parent emails`);
        
        return parentEmails;
        
    } catch (error) {
        console.error(`❌ [getAssociatedParentEmails] Error:`, error);
        return [];
    }
}

/**
 * Fetch members by email from Memberstack
 */
async function fetchMemberstackMembersByEmail(emails) {
    const MEMBERSTACK_SECRET_KEY = process.env.MEMBERSTACK_SECRET_KEY;
    
    if (!MEMBERSTACK_SECRET_KEY) {
        throw new Error('Memberstack secret key not configured');
    }
    
    const members = [];
    
    // Fetch members by email in parallel (max 5 at a time)
    const PARALLEL_LIMIT = 5;
    
    for (let i = 0; i < emails.length; i += PARALLEL_LIMIT) {
        const batch = emails.slice(i, i + PARALLEL_LIMIT);
        
        const batchPromises = batch.map(async (email) => {
            try {
                // Search for member by email using Memberstack API
                const response = await fetch(`https://admin.memberstack.com/members?email=${encodeURIComponent(email)}`, {
                    method: 'GET',
                    headers: {
                        'x-api-key': MEMBERSTACK_SECRET_KEY,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data.length > 0) {
                        return data.data[0]; // Return first match
                    }
                } else {
                    console.warn(`⚠️ Failed to fetch member by email ${email}: ${response.status}`);
                }
            } catch (error) {
                console.error(`❌ Error fetching member by email ${email}:`, error);
            }
            return null;
        });
        
        const batchResults = await Promise.all(batchPromises);
        members.push(...batchResults.filter(m => m !== null));
    }
    
    return members;
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
 * Remove parent email from associated_parent_emails in database
 */
async function removeParentEmailAssociation(lmid, parentEmail) {
    const supabase = getSupabaseClient();
    
    try {
        const { error } = await supabase.rpc('remove_parent_email_from_lmid', {
            p_lmid: lmid,
            p_parent_email: parentEmail
        });
        
        if (error) {
            console.error(`❌ Failed to remove parent email association:`, error);
        }
    } catch (error) {
        console.error(`❌ Error removing parent email association:`, error);
    }
}

/**
 * Fast cleanup parent metadata using associated_parents tracking
 */
export async function cleanupParentMetadata(lmidToRemove, teacherEmail = null) {
    console.log(`🚀 [cleanupParentMetadata] Starting cleanup for LMID ${lmidToRemove}`);
    
    try {
        // Get associated parent emails from database (FAST!)
        const parentEmails = await getAssociatedParentEmails(lmidToRemove);
        
        // Filter out teacher email if needed
        const emailsToClean = teacherEmail 
            ? parentEmails.filter(email => email !== teacherEmail)
            : parentEmails;
        
        if (emailsToClean.length === 0) {
            console.log(`✅ [cleanupParentMetadata] No parent emails to clean up`);
            return {
                success: true,
                message: 'No parents to clean up',
                cleanedParents: 0,
                details: []
            };
        }
        
        console.log(`🚀 [cleanupParentMetadata] Cleaning up ${emailsToClean.length} parent accounts`);
        
        // Fetch parent details from Memberstack by email
        const parents = await fetchMemberstackMembersByEmail(emailsToClean);
        
        if (parents.length === 0) {
            console.warn(`⚠️ [cleanupParentMetadata] Could not fetch any parent details from Memberstack`);
            return {
                success: false,
                message: 'Could not fetch parent details',
                cleanedParents: 0,
                details: []
            };
        }
        
        const cleanupResults = [];
        let successCount = 0;
        
        // Process parents in parallel batches
        const PARALLEL_BATCH_SIZE = 5;
        
        for (let i = 0; i < parents.length; i += PARALLEL_BATCH_SIZE) {
            const batch = parents.slice(i, i + PARALLEL_BATCH_SIZE);
            
            const batchPromises = batch.map(async (parent) => {
                try {
                    const oldLmids = parent.metaData?.lmids || '';
                    const newLmids = removeLmidFromString(oldLmids, lmidToRemove);
                    
                    console.log(`🧹 Updating parent ${parent.id}: "${oldLmids}" → "${newLmids}"`);
                    
                    // Update Memberstack metadata
                    const updateSuccess = await updateMemberstackMetadata(parent.id, newLmids, true);
                    
                    if (updateSuccess) {
                        // Remove from associated_parent_emails in database
                        const parentEmail = parent.auth?.email || parent.email;
                        if (parentEmail) {
                            await removeParentEmailAssociation(lmidToRemove, parentEmail);
                        }
                        successCount++;
                        console.log(`✅ Successfully updated parent ${parent.id}`);
                    } else {
                        console.error(`❌ Failed to update parent ${parent.id}`);
                    }
                    
                    return {
                        memberId: parent.id,
                        memberEmail: parent.auth?.email || 'unknown',
                        oldLmids: oldLmids,
                        newLmids: newLmids,
                        success: updateSuccess
                    };
                    
                } catch (error) {
                    console.error(`❌ Error updating parent ${parent.id}:`, error);
                    return {
                        memberId: parent.id,
                        memberEmail: parent.auth?.email || 'unknown',
                        oldLmids: parent.metaData?.lmids || '',
                        newLmids: null,
                        success: false,
                        error: error.message
                    };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            cleanupResults.push(...batchResults);
        }
        
        console.log(`✅ [cleanupParentMetadata] Cleanup completed: ${successCount}/${parents.length} successful`);
        
        return {
            success: true,
            message: `Parent cleanup completed: ${successCount}/${parents.length} successful`,
            cleanedParents: successCount,
            totalFound: parents.length,
            details: cleanupResults
        };
        
    } catch (error) {
        console.error(`❌ [cleanupParentMetadata] Error during cleanup:`, error);
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

        console.log(`🚀 [parent-cleanup] Starting parent cleanup for LMID ${lmidNum}`);
        
        // Use cleanup method
        const result = await cleanupParentMetadata(lmidNum, teacherMemberId);

        return res.status(200).json(result);

    } catch (error) {
        console.error('❌ [parent-cleanup] Unexpected error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error during parent cleanup',
            details: error.message
        });
    }
} 