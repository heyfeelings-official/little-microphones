/**
 * api/get-share-link.js - World-Specific ShareID Generation & Retrieval Service
 * 
 * PURPOSE: Generates or retrieves a unique ShareID for a given LMID and world to create shareable radio program links
 * DEPENDENCIES: Supabase client, crypto for ID generation
 * 
 * REQUEST FORMAT:
 * GET /api/get-share-link?lmid=38&world=spookyland
 * 
 * RESPONSE FORMAT:
 * { success: true, shareId: "kz7xp4v9", url: "https://domain.com/members/radio?ID=kz7xp4v9", world: "spookyland" }
 * 
 * LOGIC:
 * 1. Validate LMID and world parameters
 * 2. Check if ShareID already exists for this LMID+world combination
 * 3. If exists, return existing ShareID
 * 4. If not, generate new unique ShareID and save to database
 * 5. Return ShareID and complete shareable URL
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const validWorlds = ['spookyland', 'waterpark', 'shopping-spree', 'amusement-park', 'big-city', 'neighborhood'];

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
 * Get the database column name for a world
 * @param {string} world - World name
 * @returns {string} Column name
 */
function getWorldColumn(world) {
    return `share_id_${world.replace('-', '_')}`;
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use GET.' 
        });
    }

    try {
        const { lmid, world } = req.query;

        // Validate LMID parameter
        if (!lmid) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameter: lmid' 
            });
        }

        // Validate world parameter
        if (!world) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameter: world' 
            });
        }

        if (!validWorlds.includes(world)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid world. Must be one of: ${validWorlds.join(', ')}` 
            });
        }

        const lmidNumber = parseInt(lmid);
        if (isNaN(lmidNumber)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid LMID format. Must be a number.' 
            });
        }

        const worldColumn = getWorldColumn(world);

        // Check if ShareID already exists for this LMID+world combination
        const { data: existingRecord, error: fetchError } = await supabase
            .from('lmids')
            .select(worldColumn)
            .eq('lmid', lmidNumber)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Database fetch error:', fetchError);
            return res.status(500).json({ 
                success: false, 
                error: 'Database error while checking existing ShareID' 
            });
        }

        // If LMID doesn't exist
        if (fetchError && fetchError.code === 'PGRST116') {
            return res.status(404).json({ 
                success: false, 
                error: `LMID ${lmidNumber} not found in database` 
            });
        }

        let shareId = existingRecord?.[worldColumn];

        // If ShareID doesn't exist for this world, generate a new one
        if (!shareId) {
            let attempts = 0;
            const maxAttempts = 10;

            while (attempts < maxAttempts) {
                shareId = generateShareId();
                attempts++;

                // Check if this ShareID is already used in any world column
                const { data: duplicateCheck } = await supabase
                    .from('lmids')
                    .select('lmid')
                    .or(`share_id_spookyland.eq.${shareId},share_id_waterpark.eq.${shareId},share_id_shopping_spree.eq.${shareId},share_id_amusement_park.eq.${shareId},share_id_big_city.eq.${shareId},share_id_neighborhood.eq.${shareId}`)
                    .limit(1);

                // If no duplicate found, we can use this ShareID
                if (!duplicateCheck || duplicateCheck.length === 0) {
                    // Update the record with new ShareID for this world
                    const updateData = {};
                    updateData[worldColumn] = shareId;
                    
                    const { error: updateError } = await supabase
                        .from('lmids')
                        .update(updateData)
                        .eq('lmid', lmidNumber);

                    if (updateError) {
                        console.error('Database update error:', updateError);
                        return res.status(500).json({ 
                            success: false, 
                            error: 'Failed to save new ShareID to database' 
                        });
                    }

                    break;
                }
            }

            if (attempts >= maxAttempts) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'Failed to generate unique ShareID after multiple attempts' 
                });
            }
        }

        // Construct the complete shareable URL
        const baseUrl = req.headers.host?.includes('localhost') 
            ? `http://${req.headers.host}` 
            : `https://${req.headers.host}`;
        const shareableUrl = `${baseUrl}/members/radio?ID=${shareId}`;

        return res.status(200).json({
            success: true,
            shareId: shareId,
            url: shareableUrl,
            lmid: lmidNumber,
            world: world
        });

    } catch (error) {
        console.error('Unexpected error in get-share-link:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
} 