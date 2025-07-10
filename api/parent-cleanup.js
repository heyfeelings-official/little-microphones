/**
 * api/parent-cleanup.js - Parent LMID Cleanup Service
 * 
 * PURPOSE: Remove deleted LMIDs from parent metadata when teachers delete their LMIDs
 * DEPENDENCIES: Memberstack Admin API, LMID utilities
 * 
 * REQUEST FORMAT:
 * POST /api/parent-cleanup
 * {
 *   "lmidToRemove": 123,
 *   "teacherMemberId": "mem_teacher123"  // Optional - to exclude teacher from cleanup
 * }
 * 
 * RESPONSE FORMAT:
 * {
 *   "success": true,
 *   "message": "Parent cleanup completed",
 *   "cleanedParents": 3,
 *   "details": [
 *     {
 *       "memberId": "mem_parent123",
 *       "oldLmids": "1,2,3",
 *       "newLmids": "1,3",
 *       "success": true
 *     }
 *   ]
 * }
 * 
 * FEATURES:
 * - Find all Memberstack users with deleted LMID in metadata
 * - Remove LMID from parent metadata strings
 * - Skip teacher accounts (they're handled separately)
 * - Comprehensive error handling and logging
 * - Batch processing for efficiency
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Production Ready ✅
 */

import { updateMemberstackMetadata } from '../utils/lmid-utils.js';

/**
 * Find all members with specific LMID in their metadata
 * @param {string} lmidToFind - LMID to search for
 * @param {string} excludeMemberId - Member ID to exclude from results (usually the teacher)
 * @returns {Promise<Array>} Array of member objects with LMID in metadata
 */
async function findMembersWithLmid(lmidToFind, excludeMemberId = null) {
    const MEMBERSTACK_SECRET_KEY = process.env.MEMBERSTACK_SECRET_KEY;
    
    if (!MEMBERSTACK_SECRET_KEY) {
        throw new Error('Memberstack secret key not configured');
    }
    
    console.log(`🔍 [findMembersWithLmid] Searching for members with LMID ${lmidToFind}`);
    
    try {
        let allMembers = [];
        let currentPage = 1;
        const limit = 100; // Memberstack API default limit
        
        // Paginate through all members
        while (true) {
            console.log(`🔍 [findMembersWithLmid] Fetching page ${currentPage} (limit: ${limit})`);
            
            const response = await fetch(`https://admin.memberstack.com/members?limit=${limit}&page=${currentPage}`, {
                method: 'GET',
                headers: {
                    'x-api-key': MEMBERSTACK_SECRET_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Memberstack API error: ${response.status}`);
            }
            
            const data = await response.json();
            const pageMembers = data.data || [];
            
            console.log(`🔍 [findMembersWithLmid] Page ${currentPage}: ${pageMembers.length} members`);
            
            if (pageMembers.length === 0) {
                break; // No more members
            }
            
            allMembers = allMembers.concat(pageMembers);
            currentPage++;
            
            // Safety check to prevent infinite loops
            if (currentPage > 100) {
                console.warn(`🔍 [findMembersWithLmid] Stopped at page ${currentPage} to prevent infinite loop`);
                break;
            }
        }
        
        console.log(`🔍 [findMembersWithLmid] Retrieved total of ${allMembers.length} members from Memberstack`);
        
        // Filter members who have the LMID in their metadata
        const membersWithLmid = allMembers.filter(member => {
            // Skip excluded member (usually the teacher)
            if (excludeMemberId && member.id === excludeMemberId) {
                return false;
            }
            
            // Check if member has lmids metadata
            const lmids = member.metaData?.lmids || '';
            if (!lmids) {
                return false;
            }
            
            // Check if LMID is in the string
            const lmidArray = lmids.split(',').map(id => id.trim());
            return lmidArray.includes(lmidToFind.toString());
        });
        
        console.log(`🔍 [findMembersWithLmid] Found ${membersWithLmid.length} members with LMID ${lmidToFind}`);
        
        return membersWithLmid;
        
    } catch (error) {
        console.error(`❌ [findMembersWithLmid] Error searching for members:`, error);
        throw error;
    }
}

/**
 * Remove LMID from a member's metadata string
 * @param {string} lmidString - Current LMID string
 * @param {string} lmidToRemove - LMID to remove
 * @returns {string} New LMID string without the removed LMID
 */
function removeLmidFromString(lmidString, lmidToRemove) {
    const lmidArray = lmidString.split(',').map(id => id.trim());
    const filteredArray = lmidArray.filter(id => id !== lmidToRemove.toString());
    return filteredArray.join(',');
}

/**
 * Clean up parent metadata by removing deleted LMID
 * @param {number} lmidToRemove - LMID that was deleted
 * @param {string} teacherMemberId - Teacher member ID to exclude from cleanup
 * @returns {Promise<Object>} Cleanup result
 */
export async function cleanupParentMetadata(lmidToRemove, teacherMemberId = null) {
    console.log(`🧹 [cleanupParentMetadata] Starting cleanup for LMID ${lmidToRemove}`);
    
    try {
        // Find all members with this LMID
        const membersWithLmid = await findMembersWithLmid(lmidToRemove, teacherMemberId);
        
        if (membersWithLmid.length === 0) {
            console.log(`✅ [cleanupParentMetadata] No parents found with LMID ${lmidToRemove}`);
            return {
                success: true,
                message: 'No parents to clean up',
                cleanedParents: 0,
                details: []
            };
        }
        
        console.log(`🧹 [cleanupParentMetadata] Cleaning up ${membersWithLmid.length} parent accounts`);
        
        const cleanupResults = [];
        let successCount = 0;
        
        // Process each member
        for (const member of membersWithLmid) {
            try {
                const oldLmids = member.metaData?.lmids || '';
                const newLmids = removeLmidFromString(oldLmids, lmidToRemove);
                
                console.log(`🧹 [cleanupParentMetadata] Updating member ${member.id}: "${oldLmids}" → "${newLmids}"`);
                
                // Update member metadata (skip validation since parents don't own LMIDs)
                const updateSuccess = await updateMemberstackMetadata(member.id, newLmids, true);
                
                if (updateSuccess) {
                    successCount++;
                    console.log(`✅ [cleanupParentMetadata] Successfully updated member ${member.id}`);
                } else {
                    console.error(`❌ [cleanupParentMetadata] Failed to update member ${member.id}`);
                }
                
                cleanupResults.push({
                    memberId: member.id,
                    memberEmail: member.auth?.email || 'unknown',
                    oldLmids: oldLmids,
                    newLmids: newLmids,
                    success: updateSuccess
                });
                
            } catch (error) {
                console.error(`❌ [cleanupParentMetadata] Error updating member ${member.id}:`, error);
                cleanupResults.push({
                    memberId: member.id,
                    memberEmail: member.auth?.email || 'unknown',
                    oldLmids: member.metaData?.lmids || '',
                    newLmids: null,
                    success: false,
                    error: error.message
                });
            }
        }
        
        console.log(`✅ [cleanupParentMetadata] Cleanup completed: ${successCount}/${membersWithLmid.length} successful`);
        
        return {
            success: true,
            message: `Parent cleanup completed: ${successCount}/${membersWithLmid.length} successful`,
            cleanedParents: successCount,
            totalFound: membersWithLmid.length,
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

        console.log(`🧹 [parent-cleanup] Starting parent cleanup for LMID ${lmidNum}`);
        if (teacherMemberId) {
            console.log(`🧹 [parent-cleanup] Excluding teacher member: ${teacherMemberId}`);
        }

        // Perform the cleanup
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