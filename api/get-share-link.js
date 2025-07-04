/**
 * api/get-share-link.js - ShareID Generation & Retrieval Service
 * 
 * PURPOSE: Generates or retrieves a unique ShareID for a given LMID to create shareable radio program links
 * DEPENDENCIES: Supabase client, crypto for ID generation
 * 
 * REQUEST FORMAT:
 * GET /api/get-share-link?lmid=38
 * 
 * RESPONSE FORMAT:
 * { success: true, shareId: "kz7xp4v9", url: "https://domain.com/members/radio?ID=kz7xp4v9" }
 * 
 * LOGIC:
 * 1. Validate LMID parameter
 * 2. Check if ShareID already exists for this LMID
 * 3. If exists, return existing ShareID
 * 4. If not, generate new unique ShareID and save to database
 * 5. Return ShareID and complete shareable URL
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
        const { lmid } = req.query;

        // Validate LMID parameter
        if (!lmid) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameter: lmid' 
            });
        }

        const lmidNumber = parseInt(lmid);
        if (isNaN(lmidNumber)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid LMID format. Must be a number.' 
            });
        }

        // Check if ShareID already exists for this LMID
        const { data: existingRecord, error: fetchError } = await supabase
            .from('lmids')
            .select('share_id')
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

        let shareId = existingRecord?.share_id;

        // If ShareID doesn't exist, generate a new one
        if (!shareId) {
            let attempts = 0;
            const maxAttempts = 10;

            while (attempts < maxAttempts) {
                shareId = generateShareId();
                attempts++;

                // Check if this ShareID is already used
                const { data: duplicateCheck } = await supabase
                    .from('lmids')
                    .select('lmid')
                    .eq('share_id', shareId)
                    .single();

                // If no duplicate found, we can use this ShareID
                if (!duplicateCheck) {
                    // Update the record with new ShareID
                    const { error: updateError } = await supabase
                        .from('lmids')
                        .update({ share_id: shareId })
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
            lmid: lmidNumber
        });

    } catch (error) {
        console.error('Unexpected error in get-share-link:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
} 