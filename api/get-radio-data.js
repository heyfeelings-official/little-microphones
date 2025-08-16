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
import { validateShareId, validateWorldName } from '../utils/input-validator.js';
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
        // Import list-recordings handler directly to avoid HTTP call loop
        const listRecordingsModule = await import('./list-recordings.js');
        const listRecordingsHandler = listRecordingsModule.default;
        
        // Create mock request/response objects
        const mockReq = {
            method: 'GET',
            query: { world, lmid, lang },
            headers: {
                'origin': 'https://little-microphones.vercel.app',
                'user-agent': 'internal-api-call'
            }
        };
        
        let responseData = null;
        let statusCode = 200;
        const mockRes = {
            status: (code) => { statusCode = code; return mockRes; },
            json: (data) => { responseData = data; return mockRes; },
            end: () => mockRes,
            setHeader: () => mockRes,
            getHeader: () => null,
            statusCode: 200
        };
        
        // Call handler directly
        await listRecordingsHandler(mockReq, mockRes);
        
        if (responseData && responseData.success) {
            return responseData.recordings || [];
        } else {
            console.warn(`Failed to fetch recordings for ${lang}/${world}/${lmid}: ${responseData?.error || 'Unknown error'}`);
            return [];
        }
        
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
        // CRITICAL: Strong cache-busting with timestamp AND random string to prevent CDN caching
        const cacheBuster = `v=${Date.now()}&cb=${Math.random().toString(36).substring(2)}`;
        const manifestUrl = `https://little-microphones.b-cdn.net/${lang}/${lmid}/${world}/${manifestName}?${cacheBuster}`;
        
        console.log(`📄 Fetching manifest: ${manifestName} with cache-buster: ${cacheBuster}`);
        
        https.get(manifestUrl, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        }, (response) => {
            if (response.statusCode === 200) {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    try {
                        const manifest = JSON.parse(data);
                        console.log(`✅ Manifest fetched for ${type}:`, {
                            recordingCount: manifest.recordingCount,
                            generatedAt: manifest.generatedAt,
                            version: manifest.version
                        });
                        resolve(manifest);
                    } catch (parseError) {
                        console.warn(`Failed to parse ${manifestName} JSON:`, parseError);
                        resolve(null);
                    }
                });
            } else {
                // 404 means no manifest exists yet - this is normal for first-time generation
                console.log(`📭 No manifest exists yet for ${type} (${response.statusCode})`);
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
function needsNewProgram(currentRecordings, lmidData, world, lmid) {
    // STRICT: Only count files that include timestamp marker -tm_{number}
    const kidsPattern = new RegExp(`^kids-world_${world}-lmid_${lmid}-question_\\d+-tm_\\d+\\.(webm|mp3)$`);
    const parentPattern = new RegExp(`^parent_[^-]+-world_${world}-lmid_${lmid}-question_\\d+-tm_\\d+\\.(webm|mp3)$`);
    
    // Apply patterns directly - list-recordings.js already filtered to audio files only
    const kidsRecordings = currentRecordings.filter(file => 
        file.filename && kidsPattern.test(file.filename)
    );
    const parentRecordings = currentRecordings.filter(file => 
        file.filename && parentPattern.test(file.filename)
    );
    
    console.log(`📊 Total files from list-recordings: ${currentRecordings.length}`);
    console.log(`📊 Found ${kidsRecordings.length} kids recordings, ${parentRecordings.length} parent recordings`);
    
    // Get counts from current storage vs lmids table
    const currentKidsCount = kidsRecordings.length;
    const currentParentCount = parentRecordings.length;
    const previousKidsCount = lmidData?.last_kids_recording_count || 0;
    const previousParentCount = lmidData?.last_parent_recording_count || 0;
    
    // Compare current vs previous counts
    const needsKids = currentKidsCount > 0 && currentKidsCount > previousKidsCount;
    const needsParent = currentParentCount > 0 && currentParentCount > previousParentCount;
    
    console.log(`🔍 KIDS ANALYSIS: Current=${currentKidsCount}, Previous=${previousKidsCount}, Needs=${needsKids}`);
    console.log(`🔍 PARENT ANALYSIS: Current=${currentParentCount}, Previous=${previousParentCount}, Needs=${needsParent}`);
    
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

        // SECURITY: Validate shareId parameter
        const shareIdValidation = validateShareId(shareId);
        if (!shareIdValidation.valid) {
            return res.status(400).json({ 
                success: false, 
                error: shareIdValidation.error 
            });
        }
        const sanitizedShareId = shareIdValidation.sanitized;

        // SECURITY: Validate world parameter if provided
        let sanitizedWorld = null;
        if (worldFromUrl) {
            const worldValidation = validateWorldName(worldFromUrl);
            if (!worldValidation.valid) {
                return res.status(400).json({ 
                    success: false, 
                    error: worldValidation.error 
                });
            }
            sanitizedWorld = worldValidation.sanitized;
        }

        const supabase = getSupabaseClient();
        let lmidRecord = null;
        let world = null;

        if (sanitizedWorld) {
            // If world is provided, we can do a direct lookup
            world = sanitizedWorld;
            console.log(`🌍 Using world from URL parameter: ${world}`);
            
            // Look up LMID using the world-specific column
            const worldColumn = `share_id_${world.replace('-', '_')}`;
            const { data, error } = await supabase
            .from('lmids')
                .select('lmid, assigned_to_member_id, status')
                .eq(worldColumn, sanitizedShareId)
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
                .select('lmid, assigned_to_member_id, status, share_id_spookyland, share_id_waterpark, share_id_shopping_spree, share_id_amusement_park, share_id_big_city, share_id_neighborhood')
                .or(`share_id_spookyland.eq.${sanitizedShareId},share_id_waterpark.eq.${sanitizedShareId},share_id_shopping_spree.eq.${sanitizedShareId},share_id_amusement_park.eq.${sanitizedShareId},share_id_big_city.eq.${sanitizedShareId},share_id_neighborhood.eq.${sanitizedShareId}`)
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
            if (data.share_id_spookyland === sanitizedShareId) world = 'spookyland';
            else if (data.share_id_waterpark === sanitizedShareId) world = 'waterpark';
            else if (data.share_id_shopping_spree === sanitizedShareId) world = 'shopping-spree';
            else if (data.share_id_amusement_park === sanitizedShareId) world = 'amusement-park';
            else if (data.share_id_big_city === sanitizedShareId) world = 'big-city';
            else if (data.share_id_neighborhood === sanitizedShareId) world = 'neighborhood';

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

        // SECURITY: Check if LMID was deleted by teacher
        if (lmidRecord.status === 'deleted') {
            return res.status(410).json({ 
                success: false, 
                error: 'Radio Program has been deleted by teacher',
                code: 'PROGRAM_DELETED'
            });
        }

        // Ensure LMID is active and assigned
        if (lmidRecord.status !== 'used') {
            return res.status(404).json({ 
                success: false, 
                error: 'Radio Program is not available',
                code: 'PROGRAM_NOT_AVAILABLE'
            });
        }

        const lmid = lmidRecord.lmid.toString();
        
        // Fetch current recordings from cloud storage
        const currentRecordings = await fetchAllRecordingsFromCloud(world, lmid, lang);

        // Determine if new program generation is needed using lmid counts
        const generationNeeds = needsNewProgram(currentRecordings, lmidRecord, world, lmid);

        // Check generation status for both types
        const kidsGenerationStatus = await getGenerationStatus(world, lmid, 'kids', lang);
        const parentGenerationStatus = await getGenerationStatus(world, lmid, 'parent', lang);

        // Fetch latest completed programs from jobs table
        const { getSupabaseClient } = await import('../utils/database-utils.js');
        const supabaseClient = getSupabaseClient();
        
        const { data: latestPrograms } = await supabaseClient
            .from('audio_generation_jobs')
            .select('program_url, completed_at, type, manifest_data')
            .eq('lmid', lmid)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(2);

        const kidsProgram = latestPrograms?.find(p => p.type === 'kids');
        const parentProgram = latestPrograms?.find(p => p.type === 'parent');

        // Build combined manifest structure for radio.js compatibility
        const combinedManifest = {};
        
        if (kidsProgram) {
            combinedManifest.kidsProgram = kidsProgram.program_url;
            combinedManifest.kidsRecordingCount = lmidRecord.last_kids_recording_count || 0;
        }
        
        if (parentProgram) {
            combinedManifest.parentProgram = parentProgram.program_url;
            combinedManifest.parentRecordingCount = lmidRecord.last_parent_recording_count || 0;
        }

        return res.status(200).json({
            success: true,
            lmid: parseInt(lmid),
            world: world,
            currentRecordings: currentRecordings,
            lastManifest: combinedManifest,
            kidsManifest: kidsProgram?.manifest_data || null,
            parentManifest: parentProgram?.manifest_data || null,
            needsNewProgram: generationNeeds.needsKids || generationNeeds.needsParent, // Legacy compatibility
            needsKidsProgram: generationNeeds.needsKids,
            needsParentProgram: generationNeeds.needsParent,
            kidsRecordingCount: generationNeeds.kidsCount,
            parentRecordingCount: generationNeeds.parentCount,
            hasKidsRecordings: generationNeeds.hasKidsRecordings,
            hasParentRecordings: generationNeeds.hasParentRecordings,
            recordingCount: currentRecordings.length,
            shareId: sanitizedShareId,
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