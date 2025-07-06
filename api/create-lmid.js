/**
 * api/create-lmid.js - LMID Creation with Auto-Generated ShareIDs
 * 
 * PURPOSE: Creates a new LMID and generates all 6 world-specific ShareIDs automatically
 * DEPENDENCIES: Supabase client
 * 
 * REQUEST FORMAT:
 * POST /api/create-lmid
 * {
 *   "memberId": "mem_123",
 *   "memberEmail": "teacher@school.com"
 * }
 * 
 * RESPONSE FORMAT:
 * {
 *   "success": true,
 *   "lmid": 123,
 *   "shareIds": {
 *     "spookyland": "abc12345",
 *     "waterpark": "def67890",
 *     "shopping-spree": "ghi13579",
 *     "amusement-park": "jkl24680",
 *     "big-city": "mno97531",
 *     "neighborhood": "pqr86420"
 *   }
 * }
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

export default async function handler(req, res) {
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
        const { memberId, memberEmail } = req.body;

        if (!memberId || !memberEmail) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameters: memberId and memberEmail' 
            });
        }

        // Find next available LMID
        const availableLmid = await findNextAvailableLmid();
        if (!availableLmid) {
            return res.status(500).json({ 
                success: false, 
                error: 'No available LMIDs for assignment' 
            });
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
            console.error('Error assigning LMID:', updateError);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to assign LMID to member' 
            });
        }

        console.log(`Successfully created LMID ${availableLmid} for ${memberEmail} with all ShareIDs`);

        return res.status(200).json({
            success: true,
            lmid: availableLmid,
            shareIds: shareIds,
            message: 'LMID created successfully with all world ShareIDs'
        });

    } catch (error) {
        console.error('Unexpected error in create-lmid:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
} 