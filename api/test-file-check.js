/**
 * api/test-file-check.js - Test endpoint to debug file checking logic
 * 
 * PURPOSE: Simple test endpoint to see what's happening with file comparison
 * USAGE: GET /api/test-file-check?shareId=your-share-id
 */

import { createClient } from '@supabase/supabase-js';
import https from 'https';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch recordings from cloud storage for given world/lmid
 */
async function fetchAllRecordingsFromCloud(world, lmid) {
    try {
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
                resolve(null);
            }
        }).on('error', (error) => {
            console.warn('Error fetching manifest:', error);
            resolve(null);
        });
    });
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

        if (fetchError || !lmidRecord) {
            return res.status(404).json({ 
                success: false, 
                error: 'ShareID not found' 
            });
        }

        const lmid = lmidRecord.lmid.toString();
        let world = 'spookyland'; // Default fallback
        
        // Fetch current recordings from cloud storage
        const currentRecordings = await fetchAllRecordingsFromCloud(world, lmid);
        
        // Try to detect world from recording filenames if we have any
        if (currentRecordings.length > 0) {
            const firstRecording = currentRecordings[0];
            if (firstRecording.filename) {
                const worldMatch = firstRecording.filename.match(/kids-world_([^-]+)-lmid_/);
                if (worldMatch) {
                    world = worldMatch[1];
                }
            }
        }

        // Fetch last program manifest
        const lastManifest = await fetchLastProgramManifest(world, lmid);
        
        // Get current recording count
        const currentFileCount = currentRecordings.length;
        
        // Get previous recording count from manifest
        let previousFileCount = 0;
        let manifestInfo = {};
        
        if (lastManifest) {
            manifestInfo = {
                exists: true,
                generatedAt: lastManifest.generatedAt,
                programUrl: !!lastManifest.programUrl,
                version: lastManifest.version,
                hasRecordingCount: lastManifest.recordingCount !== undefined,
                recordingCount: lastManifest.recordingCount,
                filesUsedLength: lastManifest.filesUsed ? lastManifest.filesUsed.length : 0
            };
            
            if (lastManifest.recordingCount !== undefined) {
                previousFileCount = lastManifest.recordingCount;
            } else if (lastManifest.filesUsed) {
                const userFiles = lastManifest.filesUsed.filter(filename => {
                    return filename.includes('-lmid_') && filename.match(/\d{8}-\d{6}\.mp3$/);
                });
                previousFileCount = userFiles.length;
            }
        } else {
            manifestInfo = {
                exists: false
            };
        }
        
        // Determine if new program is needed
        const needsNewProgram = !lastManifest || !lastManifest.programUrl || currentFileCount !== previousFileCount;
        
        return res.status(200).json({
            success: true,
            shareId: shareId,
            lmid: parseInt(lmid),
            world: world,
            fileComparison: {
                currentFileCount: currentFileCount,
                previousFileCount: previousFileCount,
                needsNewProgram: needsNewProgram,
                reason: !lastManifest ? 'No manifest' : 
                        !lastManifest.programUrl ? 'No program URL' :
                        currentFileCount !== previousFileCount ? `File count changed: ${previousFileCount} → ${currentFileCount}` :
                        'Files match - no regeneration needed'
            },
            manifestInfo: manifestInfo,
            currentRecordings: currentRecordings.map(rec => ({
                filename: rec.filename,
                questionId: rec.questionId,
                url: rec.url
            }))
        });

    } catch (error) {
        console.error('Unexpected error in test-file-check:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
} 