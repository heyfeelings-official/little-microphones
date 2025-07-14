/**
 * api/get-lmid-new-recordings.js - Optimized New Recording Count Service
 * 
 * PURPOSE: Fast endpoint to get new recording counts for a specific LMID across all worlds
 * DEPENDENCIES: Supabase client, existing get-radio-data logic
 * 
 * REQUEST FORMAT:
 * GET /api/get-lmid-new-recordings?lmid=123&lang=en
 * 
 * RESPONSE FORMAT:
 * {
 *   success: true,
 *   lmid: 123,
 *   totalNewRecordings: 5,
 *   worldCounts: {
 *     "spookyland": 2,
 *     "waterpark": 1,
 *     "shopping-spree": 2
 *   }
 * }
 * 
 * OPTIMIZATIONS:
 * - Single API call instead of 6 separate world calls
 * - Parallel processing of all worlds
 * - Minimal data transfer
 * - Fast ShareID lookup
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Production Ready ✅
 */

import { getSupabaseClient } from '../utils/lmid-utils.js';
import https from 'https';

/**
 * Get ShareIDs for all worlds for a specific LMID
 * @param {string} lmid - LMID number
 * @returns {Promise<Object>} Object with world->shareId mapping
 */
async function getAllShareIdsForLmid(lmid) {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
        .from('lmids')
        .select('share_id_spookyland, share_id_waterpark, share_id_shopping_spree, share_id_amusement_park, share_id_big_city, share_id_neighborhood')
        .eq('lmid', parseInt(lmid))
        .eq('status', 'used')
        .single();

    if (error || !data) {
        console.warn(`No ShareIDs found for LMID ${lmid}`);
        return {};
    }

    return {
        'spookyland': data.share_id_spookyland,
        'waterpark': data.share_id_waterpark,
        'shopping-spree': data.share_id_shopping_spree,
        'amusement-park': data.share_id_amusement_park,
        'big-city': data.share_id_big_city,
        'neighborhood': data.share_id_neighborhood
    };
}

/**
 * Get new recording count for a specific world/ShareID
 * @param {string} world - World name
 * @param {string} shareId - ShareID for the world
 * @param {string} lang - Language code
 * @returns {Promise<number>} Count of new recordings for this world
 */
async function getNewRecordingCountForWorld(world, shareId, lang) {
    if (!shareId) return 0;
    
    try {
        const response = await fetch(`https://little-microphones.vercel.app/api/get-radio-data?shareId=${shareId}&world=${world}&lang=${lang}`);
        
        if (!response.ok) return 0;
        
        const data = await response.json();
        if (!data.success) return 0;
        
        let newRecordings = 0;
        
        // Count new kids recordings
        if (data.needsKidsProgram && data.hasKidsRecordings) {
            const kidsCount = data.kidsRecordingCount || 0;
            const previousKidsCount = data.kidsManifest?.recordingCount || 0;
            newRecordings += Math.max(0, kidsCount - previousKidsCount);
        }
        
        // Count new parent recordings
        if (data.needsParentProgram && data.hasParentRecordings) {
            const parentCount = data.parentRecordingCount || 0;
            const previousParentCount = data.parentManifest?.recordingCount || 0;
            newRecordings += Math.max(0, parentCount - previousParentCount);
        }
        
        return newRecordings;
        
    } catch (error) {
        console.warn(`Error checking world ${world}:`, error);
        return 0;
    }
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
        const { lmid, lang } = req.query;

        if (!lmid || !lang) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameters: lmid and lang' 
            });
        }

        console.log(`⚡ Getting new recordings for LMID ${lmid} in ${lang}`);

        // Get all ShareIDs for this LMID
        const shareIds = await getAllShareIdsForLmid(lmid);
        const worlds = Object.keys(shareIds);
        
        if (worlds.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'LMID not found or not assigned' 
            });
        }

        // Check all worlds in parallel (much faster)
        const worldPromises = worlds.map(async (world) => {
            const shareId = shareIds[world];
            const count = await getNewRecordingCountForWorld(world, shareId, lang);
            return { world, count };
        });

        const worldResults = await Promise.all(worldPromises);
        
        // Build response
        const worldCounts = {};
        let totalNewRecordings = 0;
        
        worldResults.forEach(({ world, count }) => {
            if (count > 0) {
                worldCounts[world] = count;
                totalNewRecordings += count;
            }
        });

        console.log(`✅ LMID ${lmid}: ${totalNewRecordings} total new recordings across ${Object.keys(worldCounts).length} worlds`);

        return res.status(200).json({
            success: true,
            lmid: parseInt(lmid),
            totalNewRecordings,
            worldCounts,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Unexpected error in get-lmid-new-recordings:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
} 