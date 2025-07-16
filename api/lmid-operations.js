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

// Import parent cleanup functionality
import { cleanupParentMetadata } from './parent-cleanup.js';

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
 * Handle DELETE LMID operation (existing functionality + parent cleanup)
 * @param {string} memberId - Memberstack member ID
 * @param {number} lmidToDelete - LMID to delete
 * @param {string} newLmidString - New LMID string after deletion
 * @returns {Promise<Object>} Operation result
 */
async function handleDeleteLmid(memberId, lmidToDelete, newLmidString) {
    const supabase = getSupabaseClient();
    
    // Get teacher email for cleanup exclusion
    let teacherEmail = null;
    try {
        const { data, error } = await supabase
            .from('lmids')
            .select('assigned_to_member_email')
            .eq('lmid', lmidToDelete)
            .single();
            
        if (!error && data) {
            teacherEmail = data.assigned_to_member_email;
            console.log(`📧 Teacher email for LMID ${lmidToDelete}: ${teacherEmail}`);
        } else if (error) {
            console.warn(`⚠️ Could not retrieve teacher email for LMID ${lmidToDelete} (this is non-critical):`, error.message);
        }
    } catch (error) {
        console.warn(`⚠️ Could not retrieve teacher email for LMID ${lmidToDelete}:`, error);
    }
    
    // STEP 1: Clean up parent metadata FIRST, while the LMID record still exists.
    console.log(`🚀 [handleDeleteLmid] Starting OPTIMIZED parent cleanup for deleted LMID ${lmidToDelete}`);
    let parentCleanupResult = null;
    
    try {
        const { cleanupParentMetadataOptimized } = await import('./parent-cleanup-optimized.js');
        parentCleanupResult = await cleanupParentMetadataOptimized(lmidToDelete, memberId);
        
        if (parentCleanupResult && parentCleanupResult.success) {
            console.log(`✅ [handleDeleteLmid] OPTIMIZED parent cleanup completed: ${parentCleanupResult.cleanedParents} parents updated`);
        } else {
            console.warn(`⚠️ [handleDeleteLmid] OPTIMIZED parent cleanup failed:`, parentCleanupResult?.message || 'Unknown error');
        }
    } catch (error) {
        console.error(`❌ [handleDeleteLmid] OPTIMIZED parent cleanup error:`, error);
        parentCleanupResult = {
            success: false,
            cleanedParents: 0,
            message: `OPTIMIZED parent cleanup failed: ${error.message}`
        };
    }

    // STEP 2: Now that parents are cleaned, mark the LMID as deleted instead of hard deletion
    const { error: deleteError } = await supabase
        .from('lmids')
        .update({ 
            status: 'deleted'
        })
        .eq('lmid', lmidToDelete);

    if (deleteError) {
        console.error(`🔥🔥 CRITICAL: FAILED TO MARK LMID ${lmidToDelete} AS DELETED IN DATABASE AFTER PARENT CLEANUP. MANUAL INTERVENTION REQUIRED. Error: ${deleteError.message}`);
        throw new Error('Failed to mark LMID as deleted in database after attempting parent cleanup.');
    }

    // STEP 3: Update the teacher's Memberstack metadata.
    if (newLmidString !== null) {
        const memberstackUpdated = await updateMemberstackMetadata(memberId, newLmidString);
        if (!memberstackUpdated) {
            console.warn(`⚠️ LMID ${lmidToDelete} marked as deleted in Supabase but teacher Memberstack metadata update failed`);
        }
        console.log(`✅ LMID ${lmidToDelete} marked as deleted in Supabase and teacher Memberstack metadata ${memberstackUpdated ? 'updated' : 'update failed'}.`);
    } else {
        console.log(`✅ LMID ${lmidToDelete} marked as deleted in Supabase.`);
    }

    return {
        success: true,
        message: 'LMID marked as deleted successfully (soft delete)',
        newLmidString: newLmidString,
        parentCleanup: parentCleanupResult ? {
            success: parentCleanupResult.success,
            cleanedParents: parentCleanupResult.cleanedParents || 0,
            message: parentCleanupResult.message
        } : {
            success: false,
            cleanedParents: 0,
            message: 'Parent cleanup could not be performed'
        }
    };
}

/**
 * Handle UPDATE PARENT METADATA operation (for parent registration system)
 * @param {string} memberId - Memberstack member ID
 * @param {string} newLmidString - New LMID string to set
 * @param {string} parentEmail - Parent email address (optional, will try to get from Memberstack if not provided)
 * @returns {Promise<Object>} Operation result
 */
async function handleUpdateParentMetadata(memberId, newLmidString, parentEmail = null) {
    console.log(`🔄 [handleUpdateParentMetadata] Updating parent metadata for ${memberId} with LMIDs: ${newLmidString}`);
    
    const supabase = getSupabaseClient();
    
    // Use provided email or get from Memberstack as fallback
    if (!parentEmail) {
        try {
            const MEMBERSTACK_SECRET_KEY = process.env.MEMBERSTACK_SECRET_KEY;
            if (MEMBERSTACK_SECRET_KEY) {
                const response = await fetch(`https://admin.memberstack.com/members/${memberId}`, {
                    method: 'GET',
                    headers: {
                        'x-api-key': MEMBERSTACK_SECRET_KEY,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    parentEmail = data.data?.auth?.email || data.data?.email;
                    console.log(`📧 Retrieved parent email from Memberstack: ${parentEmail}`);
                }
            }
        } catch (error) {
            console.warn(`⚠️ Could not retrieve parent email for ${memberId}:`, error);
        }
    } else {
        console.log(`📧 Using provided parent email: ${parentEmail}`);
    }
    
    // Parse new LMIDs
    const newLmids = newLmidString ? newLmidString.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];
    
    // Track parent Member ID and Email associations in Supabase for notifications and cleanup
    for (const lmid of newLmids) {
        try {
            // Add Member ID to array
            const { error: memberIdError } = await supabase.rpc('add_parent_member_id_to_lmid', {
                p_lmid: lmid,
                p_parent_member_id: memberId
            });
            
            if (memberIdError) {
                console.warn(`⚠️ Failed to track parent Member ID association for LMID ${lmid}:`, memberIdError);
            } else {
                console.log(`✅ Tracked parent Member ID ${memberId} association with LMID ${lmid}`);
            }
            
            // Add Email to array (for email notifications)
            if (parentEmail) {
                const { error: emailError } = await supabase.rpc('add_parent_email_to_lmid', {
                    p_lmid: lmid,
                    p_parent_email: parentEmail
                });
                
                if (emailError) {
                    console.warn(`⚠️ Failed to track parent email association for LMID ${lmid}:`, emailError);
                } else {
                    console.log(`✅ Tracked parent email ${parentEmail} association with LMID ${lmid}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error tracking parent associations:`, error);
        }
    }
    
    // Update Memberstack metadata directly (no database changes needed for parents)
    // Skip validation since parents share teacher's LMID (they're not owners in database)
    const memberstackUpdated = await updateMemberstackMetadata(memberId, newLmidString, true);
    
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

/**
 * Handle GET LMID DATA operation (for email notifications)
 * @param {string} lmid - LMID number
 * @returns {Promise<Object>} Operation result with LMID data
 */
async function handleGetLmidData(lmid) {
    const supabase = getSupabaseClient();
    
    console.log(`🔍 [handleGetLmidData] Getting data for LMID ${lmid}`);
    
    try {
        const { data, error } = await supabase
            .from('lmids')
            .select(`
                lmid,
                assigned_to_member_email,
                teacher_first_name,
                teacher_last_name,
                teacher_school_name,
                associated_parent_member_ids,
                associated_parent_emails,
                share_id_spookyland,
                share_id_waterpark,
                share_id_shopping_spree,
                share_id_amusement_park,
                share_id_big_city,
                share_id_neighborhood
            `)
            .eq('lmid', lmid)
            .eq('status', 'used')
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') {
                throw new Error(`LMID ${lmid} not found or not assigned`);
            }
            throw new Error(`Database error: ${error.message}`);
        }
        
        // Get parent emails directly from database (no API calls needed!)
        const parentEmails = Array.isArray(data.associated_parent_emails) ? data.associated_parent_emails : [];
        const parentMemberIds = Array.isArray(data.associated_parent_member_ids) ? data.associated_parent_member_ids : [];
        
        // Create mapping of Member ID to Email (if both arrays exist and have same length)
        let parentMemberIdToEmail = null;
        if (parentMemberIds.length > 0 && parentEmails.length > 0 && parentMemberIds.length === parentEmails.length) {
            parentMemberIdToEmail = {};
            parentMemberIds.forEach((memberId, index) => {
                if (memberId && parentEmails[index]) {
                    parentMemberIdToEmail[memberId] = parentEmails[index];
                }
            });
            console.log(`📧 Created Member ID to Email mapping for ${parentMemberIds.length} parents`);
        } else {
            console.log(`📧 Cannot create Member ID to Email mapping - arrays don't match (${parentMemberIds.length} member IDs vs ${parentEmails.length} emails)`);
            console.log(`📧 Using ${parentEmails.length} parent emails directly from database`);
        }
        
        // Find the ShareID for any world (we'll use the first one we find)
        let shareId = null;
        const worlds = ['spookyland', 'waterpark', 'shopping_spree', 'amusement_park', 'big_city', 'neighborhood'];
        for (const world of worlds) {
            const worldColumn = `share_id_${world.replace('-', '_')}`;
            if (data[worldColumn]) {
                shareId = data[worldColumn];
                break;
            }
        }
        
        const result = {
            lmid: data.lmid,
            teacherEmail: data.assigned_to_member_email,
            teacherName: `${data.teacher_first_name || ''} ${data.teacher_last_name || ''}`.trim() || 'Teacher',
            schoolName: data.teacher_school_name || 'School',
            parentEmails: parentEmails,
            parentMemberIdToEmail: parentMemberIdToEmail,
            shareId: shareId
        };
        
        console.log(`✅ [handleGetLmidData] Retrieved data for LMID ${lmid}:`, {
            teacherEmail: result.teacherEmail,
            teacherName: result.teacherName,
            schoolName: result.schoolName,
            parentCount: result.parentEmails.length,
            shareId: result.shareId
        });
        
        return {
            success: true,
            data: result
        };
        
    } catch (error) {
        console.error(`❌ [handleGetLmidData] Error:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

export default async function handler(req, res) {
    // Secure CORS headers
    const { setCorsHeaders } = await import('../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['POST', 'OPTIONS']);
    corsHandler(req);

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

        if (!action) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameter: action' 
            });
        }

        // Validate member ID format (skip for 'get' action which doesn't need memberId)
        if (action !== 'get') {
            if (!memberId) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing required parameter: memberId' 
                });
            }
            
            if (!validateMemberId(memberId)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid member ID format' 
                });
            }
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
            const { parentEmail } = req.body;
            result = await handleUpdateParentMetadata(memberId, newLmidString, parentEmail);
        } else if (action === 'get') {
            // NEW: Handle get LMID data (for email notifications)
            const { lmid } = req.body;
            if (!lmid) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing required parameter: lmid for get action' 
                });
            }
            result = await handleGetLmidData(lmid);
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid action. Use "create", "add", "delete", "update_parent_metadata", or "get"' 
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