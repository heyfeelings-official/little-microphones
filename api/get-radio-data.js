/**
 * api/get-radio-data.js - Radio Program Data Retrieval Service
 * 
 * PURPOSE: Fetches all data needed for radio program page based on ShareID
 * DEPENDENCIES: Supabase client, Bunny.net API, existing list-recordings API
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

import { createClient } from '@supabase/supabase-js';
import https from 'https';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
        const manifestUrl = `https://little-microphones.b-cdn.net/${lmid}/${world}/last-program-manifest.json`;
        
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
 * Check if files have changed since last program generation
 * @param {Array} currentRecordings - Current recordings from cloud
 * @param {Object|null} manifest - Last program manifest
 * @returns {boolean} True if new program generation needed (files added or deleted)
 */
function needsNewProgram(currentRecordings, manifest) {
    // If no manifest exists, we definitely need a new program
    if (!manifest || !manifest.filesUsed) {
        console.log('📝 No manifest found - new program needed');
        return true;
    }
    
    // Get current filenames
    const currentFilenames = currentRecordings.map(rec => rec.filename);
    
    // Filter manifest files to only include user recordings (exclude system files)
    const manifestUserFiles = manifest.filesUsed.filter(filename => {
        // User recordings contain timestamp patterns like: kids-world_spookyland-lmid_38-question_1-20250103-123456.mp3
        return filename.includes('-lmid_') && filename.match(/\d{8}-\d{6}\.mp3$/);
    });
    
    // Check for NEW files (files that exist now but weren't in last generation)
    const newFiles = currentFilenames.filter(filename => !manifestUserFiles.includes(filename));
    
    // Check for DELETED files (files that were in last generation but don't exist now)
    const deletedFiles = manifestUserFiles.filter(filename => !currentFilenames.includes(filename));
    
    console.log(`🔍 Checking for file changes:`);
    console.log(`  Current recordings: ${currentFilenames.length} files`);
    console.log(`  Last generation had: ${manifestUserFiles.length} files`);
    console.log(`  New files: ${newFiles.length}`);
    console.log(`  Deleted files: ${deletedFiles.length}`);
    
    if (newFiles.length > 0) {
        console.log(`📝 NEW FILES DETECTED: [${newFiles.join(', ')}] - new program needed`);
        return true;
    }
    
    if (deletedFiles.length > 0) {
        console.log(`📝 DELETED FILES DETECTED: [${deletedFiles.join(', ')}] - new program needed`);
        return true;
    }
    
    // No changes - no need to regenerate
    console.log('✅ No file changes since last generation - no new program needed');
    return false;
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
        const { shareId } = req.query;

        // Validate ShareID parameter
        if (!shareId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameter: shareId' 
            });
        }

        // Look up LMID and world from ShareID in Supabase
        const { data: lmidRecord, error: fetchError } = await supabase
            .from('lmids')
            .select('lmid, assigned_to_member_id')
            .eq('share_id', shareId)
            .single();

        if (fetchError) {
            console.error('Database fetch error:', fetchError);
            return res.status(404).json({ 
                success: false, 
                error: 'ShareID not found or database error' 
            });
        }

        if (!lmidRecord) {
            return res.status(404).json({ 
                success: false, 
                error: 'Invalid ShareID - no matching LMID found' 
            });
        }

        const lmid = lmidRecord.lmid.toString();
        
        // For now, we'll need to determine the world from the recordings or use a default
        // TODO: Consider adding world column to lmids table in future migration
        // For now, we'll try to detect world from existing recordings
        let world = 'spookyland'; // Default fallback
        
        // Fetch current recordings from cloud storage
        const currentRecordings = await fetchAllRecordingsFromCloud(world, lmid);
        
        // Try to detect world from recording filenames if we have any
        if (currentRecordings.length > 0) {
            const firstRecording = currentRecordings[0];
            if (firstRecording.filename) {
                // Extract world from filename pattern: kids-world_{world}-lmid_{lmid}-...
                const worldMatch = firstRecording.filename.match(/kids-world_([^-]+)-lmid_/);
                if (worldMatch) {
                    world = worldMatch[1];
                }
            }
        }

        // Fetch last program manifest
        const lastManifest = await fetchLastProgramManifest(world, lmid);
        
        // Determine if new program generation is needed
        const needsNew = needsNewProgram(currentRecordings, lastManifest);

        return res.status(200).json({
            success: true,
            lmid: parseInt(lmid),
            world: world,
            currentRecordings: currentRecordings,
            lastManifest: lastManifest,
            needsNewProgram: needsNew,
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