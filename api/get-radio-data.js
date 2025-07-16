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
import { getGenerationStatus } from '../utils/generation-lock.js';
import https from 'https';

/**
 * Fetch recordings from cloud storage for given world/lmid
 * @param {string} world - World identifier
 * @param {string} lmid - LMID number
 * @param {string} lang - Language code
 * @returns {Promise<Array>} Array of recording objects
 */
async function fetchAllRecordingsFromCloud(world, lmid, lang) {
    try {
        // We need to get recordings for all questions, so we'll use the existing list-recordings API
        // but we need to discover all questions first
        
        // Get all recordings for this lmid/world combination by calling list-recordings without questionId
        const response = await fetch(`https://little-microphones.vercel.app/api/list-recordings?world=${world}&lmid=${lmid}&lang=${lang}`);
        
        if (!response.ok) {
            console.warn(`Failed to fetch recordings for ${lang}/${world}/${lmid}: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        return data.recordings || [];
        
    } catch (error) {
        console.error(`Error fetching recordings for ${lang}/${world}/${lmid}:`, error);
        return [];
    }
}

/**
 * Fetch last program manifest from cloud storage - now supports separate manifests
 * @param {string} world - World identifier  
 * @param {string} lmid - LMID number
 * @param {string} type - Program type ('kids' or 'parent')
 * @param {string} lang - Language code
 * @returns {Promise<Object|null>} Manifest object or null if doesn't exist
 */
async function fetchLastProgramManifest(world, lmid, type = '', lang) {
    return new Promise((resolve) => {
        // Use separate manifest files for kids and parent programs
        const manifestName = type ? `last-program-manifest-${type}.json` : 'last-program-manifest.json';
        const manifestUrl = `https://little-microphones.b-cdn.net/${lang}/${lmid}/${world}/${manifestName}?v=${Date.now()}`;
        
        https.get(manifestUrl, (response) => {
            if (response.statusCode === 200) {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    try {
                        const manifest = JSON.parse(data);
                        resolve(manifest);
                    } catch (parseError) {
                        console.warn(`Failed to parse ${manifestName} JSON:`, parseError);
                        resolve(null);
                    }
                });
            } else {
                // 404 means no manifest exists yet - this is normal for first-time generation
                resolve(null);
            }
        }).on('error', (error) => {
            console.warn(`Error fetching ${manifestName}:`, error);
            resolve(null);
        });
    });
}

/**
 * Check if files have changed since last program generation for kids and parent programs
 * @param {Array} currentRecordings - Current recordings from cloud
 * @param {Object|null} kidsManifest - Last kids program manifest
 * @param {Object|null} parentManifest - Last parent program manifest
 * @param {string} world - World identifier
 * @param {string} lmid - LMID number
 * @returns {Object} Object with needsKids and needsParent flags
 */
function needsNewProgram(currentRecordings, kidsManifest, parentManifest, world, lmid) {
    // Filter recordings by type using EXACT patterns - exclude JSON files
            const kidsPattern = new RegExp(`^kids-world_${world}-lmid_${lmid}-question_\\d+-tm_\\d+\\.(webm|mp3)$`);
        const parentPattern = new RegExp(`^parent_[^-]+-world_${world}-lmid_${lmid}-question_\\d+-tm_\\d+\\.(webm|mp3)$`);
    
    // Filter out non-audio files and apply patterns
    const audioFiles = currentRecordings.filter(file => 
        file.filename && 
        (file.filename.endsWith('.webm') || file.filename.endsWith('.mp3')) && 
        !file.filename.includes('.json')
    );
    
    const kidsRecordings = audioFiles.filter(file => kidsPattern.test(file.filename));
    const parentRecordings = audioFiles.filter(file => parentPattern.test(file.filename));
    
    console.log(`📊 Found ${kidsRecordings.length} kids recordings, ${parentRecordings.length} parent recordings`);
    console.log(`📊 Kids recordings:`, kidsRecordings.map(r => r.filename));
    console.log(`📊 Parent recordings:`, parentRecordings.map(r => r.filename));
    
    // Check kids program generation needs
    let needsKids = false;
    const currentKidsCount = kidsRecordings.length;
    const previousKidsCount = kidsManifest?.recordingCount || 0;
    
    if (currentKidsCount > 0) {
        if (!kidsManifest) {
            console.log('📝 No kids manifest exists but recordings found - kids generation needed');
            needsKids = true;
        } else if (currentKidsCount !== previousKidsCount) {
            console.log(`🔄 Kids recording count changed: was ${previousKidsCount}, now ${currentKidsCount}`);
            needsKids = true;
        }
    }
    
    // Check parent program generation needs
    let needsParent = false;
    const currentParentCount = parentRecordings.length;
    const previousParentCount = parentManifest?.recordingCount || 0;
    
    if (currentParentCount > 0) {
        if (!parentManifest) {
            console.log('📝 No parent manifest exists but recordings found - parent generation needed');
            needsParent = true;
        } else if (currentParentCount !== previousParentCount) {
            console.log(`🔄 Parent recording count changed: was ${previousParentCount}, now ${currentParentCount}`);
            needsParent = true;
        }
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
    // Secure CORS headers
    const { setCorsHeaders } = await import('../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['GET', 'OPTIONS']);
    corsHandler(req);

    // Rate limiting - 30 requests per minute
    const { checkRateLimit } = await import('../utils/simple-rate-limiter.js');
    if (!checkRateLimit(req, res, 'get-radio-data', 30)) {
        return; // Rate limit exceeded
    }

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
        const { shareId, world: worldFromUrl, lang } = req.query;

        // Validate ShareID and lang parameters
        if (!shareId || !lang) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameters: shareId and lang' 
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
        const currentRecordings = await fetchAllRecordingsFromCloud(world, lmid, lang);

        // Fetch last program manifest
        const kidsManifest = await fetchLastProgramManifest(world, lmid, 'kids', lang);
        const parentManifest = await fetchLastProgramManifest(world, lmid, 'parent', lang);
        
        // Determine if new program generation is needed
        const generationNeeds = needsNewProgram(currentRecordings, kidsManifest, parentManifest, world, lmid);

        // Check generation status for both types
        const kidsGenerationStatus = await getGenerationStatus(world, lmid, 'kids', lang);
        const parentGenerationStatus = await getGenerationStatus(world, lmid, 'parent', lang);

        // Build combined manifest structure for radio.js compatibility
        const combinedManifest = {};
        
        if (kidsManifest) {
            combinedManifest.kidsProgram = kidsManifest.programUrl;
            combinedManifest.kidsRecordingCount = kidsManifest.recordingCount;
        }
        
        if (parentManifest) {
            combinedManifest.parentProgram = parentManifest.programUrl;
            combinedManifest.parentRecordingCount = parentManifest.recordingCount;
        }

        return res.status(200).json({
            success: true,
            lmid: parseInt(lmid),
            world: world,
            currentRecordings: currentRecordings,
            lastManifest: combinedManifest,
            kidsManifest: kidsManifest,
            parentManifest: parentManifest,
            needsNewProgram: generationNeeds.needsKids || generationNeeds.needsParent, // Legacy compatibility
            needsKidsProgram: generationNeeds.needsKids,
            needsParentProgram: generationNeeds.needsParent,
            kidsRecordingCount: generationNeeds.kidsCount,
            parentRecordingCount: generationNeeds.parentCount,
            hasKidsRecordings: generationNeeds.hasKidsRecordings,
            hasParentRecordings: generationNeeds.hasParentRecordings,
            recordingCount: currentRecordings.length,
            shareId: shareId,
            // NEW: Generation status information
            generationStatus: {
                kids: kidsGenerationStatus,
                parent: parentGenerationStatus
            }
        });

    } catch (error) {
        console.error('Unexpected error in get-radio-data:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
} 