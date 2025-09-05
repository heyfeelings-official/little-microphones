/**
 * api/get-share-link.js - World-Specific ShareID Generation & Retrieval Service
 * 
 * PURPOSE: Generates or retrieves a unique ShareID for a given LMID and world to create shareable radio program links
 * DEPENDENCIES: Supabase client, LMID utilities
 * 
 * REQUEST FORMAT:
 * GET /api/get-share-link?lmid=38&world=spookyland
 * 
 * RESPONSE FORMAT:
 * { success: true, shareId: "kz7xp4v9", url: "https://domain.com/little-microphones?ID=kz7xp4v9", world: "spookyland" }
 * { success: true, shareId: "abc123", url: "https://domain.com/pl/little-microphones?ID=abc123", world: "spookyland" } (Polish)
 * 
 * LOGIC:
 * 1. Validate LMID and world parameters
 * 2. Check if ShareID already exists for this LMID+world combination
 * 3. If exists, return existing ShareID
 * 4. If not, generate new unique ShareID and save to database
 * 5. Return ShareID and complete shareable URL
 */

import { 
    getSupabaseClient, 
    generateShareId, 
    isShareIdUsed, 
    getWorldColumn,
    WORLDS 
} from '../utils/lmid-utils.js';

export default async function handler(req, res) {
    // Secure CORS headers
    const { setCorsHeaders } = await import('../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['GET', 'OPTIONS']);
    corsHandler(req);

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

        if (!WORLDS.includes(world)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid world. Must be one of: ${WORLDS.join(', ')}` 
            });
        }

        const lmidNumber = parseInt(lmid);
        if (isNaN(lmidNumber)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid LMID format. Must be a number.' 
            });
        }

        const supabase = getSupabaseClient();
        const worldColumn = getWorldColumn(world);

        // Check if ShareID already exists for this LMID+world combination
        const { data: existingRecord, error: fetchError } = await supabase
            .from('lmids')
            .select(`${worldColumn}, status`)
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

        // SECURITY: Check if LMID was deleted
        if (existingRecord?.status === 'deleted') {
            return res.status(410).json({ 
                success: false, 
                error: 'LMID has been deleted',
                code: 'LMID_DELETED'
            });
        }

        // Ensure LMID is active and assigned
        if (existingRecord?.status !== 'used') {
            return res.status(404).json({ 
                success: false, 
                error: 'LMID is not available',
                code: 'LMID_NOT_AVAILABLE'
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
                const isUsed = await isShareIdUsed(shareId);

                // If no duplicate found, we can use this ShareID
                if (!isUsed) {
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

        // Language detection: check referer header for locale
        let detectedLang = 'en'; // Default to English
        const referer = req.headers.referer || req.headers.referrer || '';
        if (referer.includes('/pl/')) {
            detectedLang = 'pl';
        }

        // Construct the complete shareable URL with locale
        const baseUrl = req.headers.host?.includes('localhost') 
            ? `http://${req.headers.host}` 
            : `https://${req.headers.host}`;
        const shareableUrl = detectedLang === 'en' 
            ? `${baseUrl}/little-microphones?ID=${shareId}`
            : `${baseUrl}/${detectedLang}/little-microphones?ID=${shareId}`;

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