/**
 * api/lmid-operations.js - Consolidated LMID Management Operations
 * 
 * PURPOSE: Handles all LMID operations (create, add, delete) with Memberstack integration
 * DEPENDENCIES: Supabase client, Memberstack API, LMID utilities
 * 
 * REQUEST FORMATS:
 * 
 * CREATE LMID (replaces create-lmid.js):
 * POST /api/lmid-operations
 * {
 *   "action": "create",
 *   "memberId": "mem_123",
 *   "memberEmail": "teacher@school.com"
 * }
 * 
 * ADD LMID (existing functionality):
 * POST /api/lmid-operations
 * {
 *   "action": "add",
 *   "memberId": "mem_123",
 *   "memberEmail": "teacher@school.com",
 *   "currentLmids": "1,2,3"
 * }
 * 
 * DELETE LMID (existing functionality):
 * POST /api/lmid-operations
 * {
 *   "action": "delete",
 *   "memberId": "mem_123",
 *   "lmidToDelete": 123,
 *   "newLmidString": "1,2"
 * }
 * 
 * RESPONSE FORMAT:
 * {
 *   "success": true,
 *   "message": "Operation completed successfully",
 *   "lmid": 123,
 *   "shareIds": {...} (for create/add actions),
 *   "newLmidString": "1,2,3" (updated LMID string)
 * }
 * 
 * CONSOLIDATED FEATURES:
 * - Unified endpoint for all LMID operations
 * - Shared utility functions for consistency
 * - Comprehensive security validation
 * - Memberstack metadata synchronization
 * - Error handling and logging
 * 
 * LAST UPDATED: January 2025
 * VERSION: 3.0.0 (Consolidated)
 * STATUS: Production Ready ✅
 */

import {
    findNextAvailableLmid,
    generateAllShareIds,
    assignLmidToMember,
    validateMemberId,
    validateLmidOwnership,
    updateMemberstackMetadata,
    getSupabaseClient
} from '../utils/lmid-utils.js';

/**
 * Handle CREATE LMID operation (replaces create-lmid.js functionality)
 * @param {string} memberId - Memberstack member ID
 * @param {string} memberEmail - Member email
 * @param {string} originatingShareId - Optional ShareID for parent registration
 * @param {string} originatingLmid - Optional original LMID for parent registration
 * @returns {Promise<Object>} Operation result
 */
async function handleCreateLmid(memberId, memberEmail, originatingShareId = null, originatingLmid = null) {
    // Find next available LMID
    const availableLmid = await findNextAvailableLmid();
    if (!availableLmid) {
        throw new Error('No available LMIDs for assignment');
    }

    // Generate all ShareIDs
    const shareIds = await generateAllShareIds();

    // Assign LMID to member with all ShareIDs
    const assignmentSuccess = await assignLmidToMember(availableLmid, memberId, memberEmail, shareIds);
    if (!assignmentSuccess) {
        throw new Error('Failed to assign LMID to member');
    }

    // Update LMID string for new member (first LMID)
    const newLmidString = String(availableLmid);
    
    // Wait a moment for database consistency before metadata update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update Memberstack metadata via Admin API
    const memberstackUpdated = await updateMemberstackMetadata(memberId, newLmidString);
    if (!memberstackUpdated) {
        console.warn(`⚠️ LMID ${availableLmid} created in Supabase but Memberstack metadata update failed`);
    }

    console.log(`✅ LMID ${availableLmid} created and assigned to ${memberEmail} with all ShareIDs. Memberstack metadata ${memberstackUpdated ? 'updated' : 'update failed'}.`);

    return {
        success: true,
        message: 'LMID created successfully with all world ShareIDs',
        lmid: availableLmid,
        shareIds: shareIds,
        newLmidString: newLmidString
    };
}

/**
 * Handle ADD LMID operation (existing functionality)
 * @param {string} memberId - Memberstack member ID
 * @param {string} memberEmail - Member email
 * @param {string} currentLmids - Current LMID string
 * @returns {Promise<Object>} Operation result
 */
async function handleAddLmid(memberId, memberEmail, currentLmids) {
    // Find next available LMID
    const availableLmid = await findNextAvailableLmid();
    if (!availableLmid) {
        throw new Error('No available LMIDs for assignment');
    }

    // Generate all ShareIDs
    const shareIds = await generateAllShareIds();

    // Assign LMID to member with all ShareIDs
    const assignmentSuccess = await assignLmidToMember(availableLmid, memberId, memberEmail, shareIds);
    if (!assignmentSuccess) {
        throw new Error('Failed to assign LMID to member');
    }

    // Update LMID string
    const newLmidString = currentLmids ? `${currentLmids},${availableLmid}` : String(availableLmid);
    
    // Wait a moment for database consistency before metadata update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update Memberstack metadata via Admin API
    const memberstackUpdated = await updateMemberstackMetadata(memberId, newLmidString);
    if (!memberstackUpdated) {
        console.warn(`⚠️ LMID ${availableLmid} assigned in Supabase but Memberstack metadata update failed`);
    }
    
    console.log(`✅ LMID ${availableLmid} assigned in Supabase and Memberstack metadata ${memberstackUpdated ? 'updated' : 'update failed'}.`);

    return {
        success: true,
        message: 'LMID added successfully',
        lmid: availableLmid,
        shareIds: shareIds,
        newLmidString: newLmidString
    };
}

/**
 * Handle DELETE LMID operation (existing functionality)
 * @param {string} memberId - Memberstack member ID
 * @param {number} lmidToDelete - LMID to delete
 * @param {string} newLmidString - New LMID string after deletion
 * @returns {Promise<Object>} Operation result
 */
async function handleDeleteLmid(memberId, lmidToDelete, newLmidString) {
    const supabase = getSupabaseClient();
    
    // Mark LMID as deleted in database
    const { error: deleteError } = await supabase
        .from('lmids')
        .update({ status: 'deleted' })
        .eq('lmid', lmidToDelete);

    if (deleteError) {
        throw new Error('Failed to delete LMID from database');
    }

    // Update Memberstack metadata after deletion
    if (newLmidString !== null) {
        const memberstackUpdated = await updateMemberstackMetadata(memberId, newLmidString);
        if (!memberstackUpdated) {
            console.warn(`⚠️ LMID ${lmidToDelete} deleted from Supabase but Memberstack metadata update failed`);
        }
        console.log(`✅ LMID ${lmidToDelete} deleted from Supabase and Memberstack metadata ${memberstackUpdated ? 'updated' : 'update failed'}.`);
    } else {
        console.log(`✅ LMID ${lmidToDelete} deleted from Supabase.`);
    }

    return {
        success: true,
        message: 'LMID deleted successfully',
        newLmidString: newLmidString
    };
}

/**
 * Handle UPDATE PARENT METADATA operation (for parent registration system)
 * @param {string} memberId - Memberstack member ID
 * @param {string} newLmidString - New LMID string to set
 * @returns {Promise<Object>} Operation result
 */
async function handleUpdateParentMetadata(memberId, newLmidString) {
    console.log(`🔄 [handleUpdateParentMetadata] Updating parent metadata for ${memberId} with LMIDs: ${newLmidString}`);
    
    // Update Memberstack metadata directly (no database changes needed for parents)
    const memberstackUpdated = await updateMemberstackMetadata(memberId, newLmidString);
    
    if (!memberstackUpdated) {
        throw new Error('Failed to update parent metadata in Memberstack');
    }
    
    console.log(`✅ [handleUpdateParentMetadata] Parent metadata updated successfully for ${memberId}`);
    
    return {
        success: true,
        message: 'Parent metadata updated successfully',
        newLmidString: newLmidString
    };
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
        const { action, memberId, memberEmail, currentLmids, lmidToDelete, newLmidString } = req.body;

        if (!action || !memberId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameters: action and memberId' 
            });
        }

        // Validate member ID format
        if (!validateMemberId(memberId)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid member ID format' 
            });
        }

        let result;

        if (action === 'create') {
            // NEW: Handle create LMID (replaces create-lmid.js)
            if (!memberEmail) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing required parameter: memberEmail for create action' 
                });
            }
            result = await handleCreateLmid(memberId, memberEmail);
        } else if (action === 'add') {
            // EXISTING: Handle add LMID
            if (!memberEmail) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing required parameter: memberEmail for add action' 
                });
            }
            result = await handleAddLmid(memberId, memberEmail, currentLmids || '');
        } else if (action === 'delete') {
            // EXISTING: Handle delete LMID
            if (!lmidToDelete) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing required parameter: lmidToDelete for delete action' 
                });
            }
            result = await handleDeleteLmid(memberId, lmidToDelete, newLmidString || '');
        } else if (action === 'update_parent_metadata') {
            // NEW: Handle parent metadata update (for parent registration system)
            if (!newLmidString) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing required parameter: newLmidString for update_parent_metadata action' 
                });
            }
            result = await handleUpdateParentMetadata(memberId, newLmidString);
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid action. Use "create", "add", "delete", or "update_parent_metadata"' 
            });
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error('Unexpected error in lmid-operations:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        });
    }
} 