/**
 * api/lmid-operations.js - LMID CRUD Operations
 * 
 * PURPOSE: Handles LMID operations (add, delete) with Memberstack integration
 * DEPENDENCIES: Supabase client, Memberstack API
 * 
 * REQUEST FORMAT:
 * POST /api/lmid-operations
 * {
 *   "action": "add" | "delete",
 *   "memberId": "mem_123",
 *   "memberEmail": "teacher@school.com",
 *   "currentLmids": "1,2,3" (current LMID string),
 *   "lmidToDelete": 123 (only for delete action),
 *   "newLmidString": "1,2,3" (only for delete action - remaining LMIDs)
 * }
 * 
 * RESPONSE FORMAT:
 * {
 *   "success": true,
 *   "message": "Operation completed successfully",
 *   "lmid": 123,
 *   "shareIds": {...} (only for add action),
 *   "newLmidString": "1,2,3" (updated LMID string)
 * }
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Note: Memberstack metadata updates are handled by frontend DOM API

const worlds = ['spookyland', 'waterpark', 'shopping-spree', 'amusement-park', 'big-city', 'neighborhood'];

/**
 * Generate a random, URL-safe ShareID
 * @returns {string} 8-character random string
 */
function generateShareId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Check if a ShareID is already used in any world column
 * @param {string} shareId - ShareID to check
 * @returns {Promise<boolean>} True if already used
 */
async function isShareIdUsed(shareId) {
    const { data } = await supabase
        .from('lmids')
        .select('lmid')
        .or(`share_id_spookyland.eq.${shareId},share_id_waterpark.eq.${shareId},share_id_shopping_spree.eq.${shareId},share_id_amusement_park.eq.${shareId},share_id_big_city.eq.${shareId},share_id_neighborhood.eq.${shareId}`)
        .limit(1);
    
    return data && data.length > 0;
}

/**
 * Generate unique ShareIDs for all worlds
 * @returns {Promise<Object>} Object with world names as keys and ShareIDs as values
 */
async function generateAllShareIds() {
    const shareIds = {};
    
    for (const world of worlds) {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const shareId = generateShareId();
            const isUsed = await isShareIdUsed(shareId);
            
            if (!isUsed) {
                shareIds[world] = shareId;
                break;
            }
            
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            throw new Error(`Failed to generate unique ShareID for world: ${world}`);
        }
    }
    
    return shareIds;
}

/**
 * Find the next available LMID
 * @returns {Promise<number|null>} Next available LMID or null if none available
 */
async function findNextAvailableLmid() {
    const { data, error } = await supabase
        .from('lmids')
        .select('lmid')
        .eq('status', 'available')
        .order('lmid', { ascending: true })
        .limit(1);

    if (error) {
        console.error('Error finding available LMID:', error);
        return null;
    }

    return data.length > 0 ? data[0].lmid : null;
}

/**
 * Validate member ID format (basic validation)
 * @param {string} memberId - Memberstack member ID
 * @returns {boolean} True if format looks valid
 */
function isValidMemberId(memberId) {
    // Memberstack member IDs typically start with 'mem_' and contain alphanumeric characters
    return typeof memberId === 'string' && 
           memberId.startsWith('mem_') && 
           memberId.length > 10;
}

// Note: Memberstack metadata updates are now handled by frontend DOM API

/**
 * Handle ADD LMID operation
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
    const updateData = {
        status: 'used',
        assigned_to_member_id: memberId,
        assigned_to_member_email: memberEmail,
        assigned_at: new Date().toISOString(),
        share_id_spookyland: shareIds.spookyland,
        share_id_waterpark: shareIds.waterpark,
        share_id_shopping_spree: shareIds['shopping-spree'],
        share_id_amusement_park: shareIds['amusement-park'],
        share_id_big_city: shareIds['big-city'],
        share_id_neighborhood: shareIds.neighborhood
    };

    const { error: updateError } = await supabase
        .from('lmids')
        .update(updateData)
        .eq('lmid', availableLmid);

    if (updateError) {
        throw new Error('Failed to assign LMID to member');
    }

    // Update LMID string
    const newLmidString = currentLmids ? `${currentLmids},${availableLmid}` : String(availableLmid);
    
    console.log(`✅ LMID ${availableLmid} assigned in Supabase. Frontend will update Memberstack metadata.`);

    console.log(`✅ LMID ${availableLmid} assigned to member ${memberId} (${memberEmail})`);

    return {
        success: true,
        message: 'LMID added successfully',
        lmid: availableLmid,
        shareIds: shareIds,
        newLmidString: newLmidString
    };
}

/**
 * Handle DELETE LMID operation
 * @param {string} memberId - Memberstack member ID
 * @param {number} lmidToDelete - LMID to delete
 * @param {string} newLmidString - New LMID string after deletion
 * @returns {Promise<Object>} Operation result
 */
async function handleDeleteLmid(memberId, lmidToDelete, newLmidString) {
    // Mark LMID as deleted in database
    const { error: deleteError } = await supabase
        .from('lmids')
        .update({ status: 'deleted' })
        .eq('lmid', lmidToDelete);

    if (deleteError) {
        throw new Error('Failed to delete LMID from database');
    }

    console.log(`✅ LMID ${lmidToDelete} deleted from Supabase. Frontend will update Memberstack metadata.`);

    return {
        success: true,
        message: 'LMID deleted successfully',
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
        if (!isValidMemberId(memberId)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid member ID format' 
            });
        }

        let result;

        if (action === 'add') {
            if (!memberEmail) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing required parameter: memberEmail for add action' 
                });
            }
            result = await handleAddLmid(memberId, memberEmail, currentLmids || '');
        } else if (action === 'delete') {
            if (!lmidToDelete) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing required parameter: lmidToDelete for delete action' 
                });
            }
            result = await handleDeleteLmid(memberId, lmidToDelete, newLmidString || '');
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid action. Use "add" or "delete"' 
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