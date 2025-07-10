/**
 * api/get-radio-data.js - Radio Program Data Retrieval Service
 * 
 * PURPOSE: Fetches all data needed for radio program page based on ShareID
 * DEPENDENCIES: Supabase client, Bunny.net API, existing list-recordings API, LMID utilities
 * 
 * REQUEST FORMAT:
 * GET /api/get-radio-data?shareId=kz7xp4v9
 * 
 * RESPONSE FORMAT:
 * {
 *   success: true,
 *   lmid: 38,
 *   world: "spookyland", 
 *   currentRecordings: [...],
 *   lastManifest: {...} | null,
 *   needsNewProgram: true/false
 * }
 * 
 * LOGIC:
 * 1. Validate ShareID parameter
 * 2. Look up LMID and world from ShareID in Supabase
 * 3. Fetch current recordings from cloud storage
 * 4. Try to fetch last program manifest
 * 5. Compare recordings vs manifest to determine if new program needed
 * 6. Return all data for frontend decision making
 */

import { getSupabaseClient } from '../utils/lmid-utils.js';
import https from 'https';

/**
 * Fetch recordings from cloud storage for given world/lmid
 * @param {string} world - World identifier
 * @param {string} lmid - LMID number
 * @returns {Promise<Array>} Array of recording objects
 */
async function fetchAllRecordingsFromCloud(world, lmid) {
    try {
        // We need to get recordings for all questions, so we'll use the existing list-recordings API
        // but we need to discover all questions first
        
        // Get all recordings for this lmid/world combination by calling list-recordings without questionId
        const response = await fetch(`https://little-microphones.vercel.app/api/list-recordings?world=${world}&lmid=${lmid}`);
        
        if (!response.ok) {
            console.warn(`Failed to fetch recordings for ${world}/${lmid}: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        return data.recordings || [];
        
    } catch (error) {
        console.error(`Error fetching recordings for ${world}/${lmid}:`, error);
        return [];
    }
}

/**
 * Fetch last program manifest from cloud storage
 * @param {string} world - World identifier  
 * @param {string} lmid - LMID number
 * @returns {Promise<Object|null>} Manifest object or null if doesn't exist
 */
async function fetchLastProgramManifest(world, lmid) {
    return new Promise((resolve) => {
        // Add cache-busting query parameter
        const manifestUrl = `https://little-microphones.b-cdn.net/${lmid}/${world}/last-program-manifest.json?v=${Date.now()}`;
        
        https.get(manifestUrl, (response) => {
            if (response.statusCode === 200) {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    try {
                        const manifest = JSON.parse(data);
                        resolve(manifest);
                    } catch (parseError) {
                        console.warn('Failed to parse manifest JSON:', parseError);
                        resolve(null);
                    }
                });
            } else {
                // 404 means no manifest exists yet - this is normal for first-time generation
                resolve(null);
            }
        }).on('error', (error) => {
            console.warn('Error fetching manifest:', error);
            resolve(null);
        });
    });
}

/**
 * Check if files have changed since last program generation for kids and parent programs
 * @param {Array} currentRecordings - Current recordings from cloud
 * @param {Object|null} manifest - Last program manifest
 * @returns {Object} Object with needsKids and needsParent flags
 */
function needsNewProgram(currentRecordings, manifest, world, lmid) {
    // Filter recordings by type (exclude JSON files and other non-audio files)
    const kidsPattern = new RegExp(`^kids-world_${world}-lmid_${lmid}-question_\\d+-tm_\\d+\\.mp3$`);
    const parentPattern = new RegExp(`^parent_[^-]+-world_${world}-lmid_${lmid}-question_\\d+-tm_\\d+\\.mp3$`);
    
    const kidsRecordings = currentRecordings.filter(file => kidsPattern.test(file.filename));
    const parentRecordings = currentRecordings.filter(file => parentPattern.test(file.filename));
    
    console.log(`📊 Found ${kidsRecordings.length} kids recordings, ${parentRecordings.length} parent recordings`);
    
    // Check kids program generation needs
    let needsKids = false;
    const currentKidsCount = kidsRecordings.length;
    const previousKidsCount = manifest?.kidsRecordingCount || manifest?.recordingCount || 0; // Legacy fallback
    
    if (!manifest || !manifest.kidsProgram) {
        if (currentKidsCount > 0) {
            console.log('📝 No kids program exists but recordings found - kids generation needed');
            needsKids = true;
        }
    } else if (currentKidsCount !== previousKidsCount) {
        console.log(`🔄 Kids recording count changed: was ${previousKidsCount}, now ${currentKidsCount}`);
        needsKids = true;
    }
    
    // Check parent program generation needs
    let needsParent = false;
    const currentParentCount = parentRecordings.length;
    const previousParentCount = manifest?.parentRecordingCount || 0;
    
    if (!manifest || !manifest.parentProgram) {
        if (currentParentCount > 0) {
            console.log('📝 No parent program exists but recordings found - parent generation needed');
            needsParent = true;
        }
    } else if (currentParentCount !== previousParentCount) {
        console.log(`🔄 Parent recording count changed: was ${previousParentCount}, now ${currentParentCount}`);
        needsParent = true;
    }
    
    // Return object with specific needs for each program type
    return {
        needsKids,
        needsParent,
        kidsCount: currentKidsCount,
        parentCount: currentParentCount,
        hasKidsRecordings: currentKidsCount > 0,
        hasParentRecordings: currentParentCount > 0
    };
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
        const { shareId, world: worldFromUrl } = req.query;

        // Validate ShareID parameter
        if (!shareId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameter: shareId' 
            });
        }

        const supabase = getSupabaseClient();
        let lmidRecord = null;
        let world = null;

        if (worldFromUrl) {
            // If world is provided, we can do a direct lookup
            world = worldFromUrl;
            console.log(`🌍 Using world from URL parameter: ${world}`);
            
            // Look up LMID using the world-specific column
            const worldColumn = `share_id_${world.replace('-', '_')}`;
            const { data, error } = await supabase
            .from('lmids')
            .select('lmid, assigned_to_member_id')
                .eq(worldColumn, shareId)
                .single();

            if (error || !data) {
                console.error('Database fetch error:', error);
                return res.status(404).json({ 
                    success: false, 
                    error: 'ShareID not found for specified world' 
                });
            }
            lmidRecord = data;
        } else {
            // Search across all world-specific columns to find the shareId and determine world
            const { data, error } = await supabase
                .from('lmids')
                .select('lmid, assigned_to_member_id, share_id_spookyland, share_id_waterpark, share_id_shopping_spree, share_id_amusement_park, share_id_big_city, share_id_neighborhood')
                .or(`share_id_spookyland.eq.${shareId},share_id_waterpark.eq.${shareId},share_id_shopping_spree.eq.${shareId},share_id_amusement_park.eq.${shareId},share_id_big_city.eq.${shareId},share_id_neighborhood.eq.${shareId}`)
            .single();

            if (error || !data) {
                console.error('Database fetch error:', error);
            return res.status(404).json({ 
                success: false, 
                error: 'ShareID not found or database error' 
            });
            }

            lmidRecord = data;

            // Determine which world this shareId belongs to
            if (data.share_id_spookyland === shareId) world = 'spookyland';
            else if (data.share_id_waterpark === shareId) world = 'waterpark';
            else if (data.share_id_shopping_spree === shareId) world = 'shopping-spree';
            else if (data.share_id_amusement_park === shareId) world = 'amusement-park';
            else if (data.share_id_big_city === shareId) world = 'big-city';
            else if (data.share_id_neighborhood === shareId) world = 'neighborhood';

            if (!world) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'World not found for shareId' 
                });
            }
            
            console.log(`🌍 Detected world from database: ${world}`);
        }

        if (!lmidRecord) {
            return res.status(404).json({ 
                success: false, 
                error: 'Invalid ShareID - no matching LMID found' 
            });
        }

        const lmid = lmidRecord.lmid.toString();
        
        // Fetch current recordings from cloud storage
        const currentRecordings = await fetchAllRecordingsFromCloud(world, lmid);

        // Fetch last program manifest
        const lastManifest = await fetchLastProgramManifest(world, lmid);
        
        // Determine if new program generation is needed
        const generationNeeds = needsNewProgram(currentRecordings, lastManifest, world, lmid);

        return res.status(200).json({
            success: true,
            lmid: parseInt(lmid),
            world: world,
            currentRecordings: currentRecordings,
            lastManifest: lastManifest,
            needsNewProgram: generationNeeds.needsKids || generationNeeds.needsParent, // Legacy compatibility
            needsKidsProgram: generationNeeds.needsKids,
            needsParentProgram: generationNeeds.needsParent,
            kidsRecordingCount: generationNeeds.kidsCount,
            parentRecordingCount: generationNeeds.parentCount,
            hasKidsRecordings: generationNeeds.hasKidsRecordings,
            hasParentRecordings: generationNeeds.hasParentRecordings,
            recordingCount: currentRecordings.length,
            shareId: shareId
        });

    } catch (error) {
        console.error('Unexpected error in get-radio-data:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
} 