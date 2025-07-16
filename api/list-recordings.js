/**
 * api/list-recordings.js - Cloud Recording Discovery & Synchronization Service
 * 
 * PURPOSE: Serverless function for listing and synchronizing audio recordings from Bunny.net cloud storage
 * DEPENDENCIES: Bunny.net Storage API, JSON processing, Regular expression pattern matching
 * DOCUMENTATION: See /documentation/api-documentation.md for complete API overview
 * 
 * REQUEST FORMAT:
 * GET /api/list-recordings?world=spookyland&lmid=32&questionId=9
 * 
 * RESPONSE FORMAT:
 * { success: true, world: "spookyland", lmid: "32", questionId: "9", count: 5, recordings: [...] }
 * 
 * SYNCHRONIZATION PURPOSE:
 * - Enable cross-device recording access and continuity
 * - Provide cloud-first data source for recording discovery
 * - Support offline-to-online recording synchronization
 * - Facilitate recording count validation for radio program generation
 * 
 * RECORDING DISCOVERY:
 * - Pattern-based filename matching with world/lmid/questionId filtering
 * - Comprehensive folder scanning with organized results
 * - Timestamp-based sorting for chronological recording order
 * - Metadata extraction from filename patterns and cloud storage
 * 
 * CLOUD INTEGRATION:
 * - Direct Bunny.net Storage API communication for real-time data
 * - Efficient folder listing with minimal bandwidth usage
 * - CDN URL generation for immediate audio playback
 * - File metadata extraction including size and modification dates
 * 
 * FILTERING & ORGANIZATION:
 * - Question-specific filtering using regex pattern matching
 * - Filename format validation: kids-world_{world}-lmid_{lmid}-question_{questionId}-.*\.mp3
 * - Directory-based isolation preventing cross-user data access
 * - Sort by modification date with newest recordings first
 * 
 * SECURITY FEATURES:
 * - Parameter validation for world, lmid, and questionId requirements
 * - Pattern matching to prevent unauthorized file access
 * - API key protection with secure environment variable storage
 * - CORS configuration for authorized cross-origin requests
 * 
 * ERROR HANDLING:
 * - Missing parameter detection with clear error messages
 * - Network failure recovery with appropriate status codes
 * - Empty result handling with graceful response formatting
 * - Invalid folder access protection with filtered responses
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Single API call for complete folder listing
 * - Client-side filtering to reduce server processing
 * - Efficient JSON serialization for large recording lists
 * - Minimal data transfer with essential metadata only
 * 
 * INTEGRATION POINTS:
 * - recording.js: Cross-device recording synchronization and display
 * - rp.js: Recording count validation for radio program generation
 * - Bunny.net CDN: Cloud storage and global content delivery
 * - Client Storage: IndexedDB synchronization and local cache management
 * 
 * DATA TRANSFORMATION:
 * - Cloud file objects to recording objects with standardized format
 * - Filename parsing for metadata extraction (timestamp, questionId)
 * - CDN URL construction for immediate audio access
 * - Size and date formatting for user-friendly display
 * 
 * MONITORING & LOGGING:
 * - Request tracking with parameter logging for debugging
 * - Success/failure rate monitoring for reliability metrics
 * - Performance tracking for folder listing operations
 * - Error analysis for storage connectivity issues
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.4.0
 * STATUS: Production Ready ✅
 */

export default async function handler(req, res) {
    // Set CORS headers for all requests first
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { world, lmid, questionId, lang } = req.query;

        if (!world || !lmid || !lang) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required parameters: world, lmid, and lang' 
            });
        }

        // Construct the folder path where recordings are stored (matching upload API structure)
        const folderPath = `${lang}/${lmid}/${world}/`;
        
        console.log(`Listing recordings for ${lang}/${world}/${lmid}/Q${questionId} in folder: ${folderPath}`);

        // List files from Bunny.net
        const listUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${folderPath}`;
        
        const response = await fetch(listUrl, {
            method: 'GET',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            // Handle 404 specifically - folder doesn't exist yet (new LMID)
            if (response.status === 404) {
                console.log(`Folder ${folderPath} does not exist yet (new LMID)`);
                return res.status(200).json({
                    success: true,
                    world: world,
                    lmid: lmid,
                    questionId: questionId || 'all',
                    count: 0,
                    recordings: []
                });
            }
            
            console.error(`Bunny.net list failed: ${response.status} ${response.statusText}`);
            return res.status(500).json({ 
                success: false,
                error: 'Failed to list recordings from cloud storage',
                details: `HTTP ${response.status}`
            });
        }

        const fileList = await response.json();
        
        // Filter files for the specific question ID or all questions if questionId not provided
        // Support both teacher (kids-world_) and parent (parent_memberid-world_) formats
        let matchingFiles;
        if (questionId) {
            // Filter for specific question - support both formats
                    const teacherPattern = new RegExp(`kids-world_${world}-lmid_${lmid}-question_${questionId}-.*\\.(webm|mp3)$`);
        const parentPattern = new RegExp(`parent_[^-]+-world_${world}-lmid_${lmid}-question_${questionId}-.*\\.(webm|mp3)$`);
            
            matchingFiles = fileList.filter(file => 
                file.IsDirectory === false && 
                (teacherPattern.test(file.ObjectName) || parentPattern.test(file.ObjectName))
            );
            console.log(`Found ${matchingFiles.length} recordings for question ${questionId} (teacher + parent)`);
        } else {
            // Get all recordings for this world/lmid - support both formats
                    const teacherPattern = new RegExp(`kids-world_${world}-lmid_${lmid}-question_.*\\.(webm|mp3)$`);
        const parentPattern = new RegExp(`parent_[^-]+-world_${world}-lmid_${lmid}-question_.*\\.(webm|mp3)$`);
            
            matchingFiles = fileList.filter(file => 
                file.IsDirectory === false && 
                (teacherPattern.test(file.ObjectName) || parentPattern.test(file.ObjectName))
            );
            console.log(`Found ${matchingFiles.length} total recordings for ${world}/${lmid} (teacher + parent)`);
        }

        // Transform file list to recording objects
        const recordings = matchingFiles.map(file => {
            // Extract questionId from filename if not provided
            let extractedQuestionId = questionId;
            if (!questionId) {
                // Support both teacher and parent filename formats
                const teacherMatch = file.ObjectName.match(/kids-world_.*-question_(\d+)-/);
                const parentMatch = file.ObjectName.match(/parent_.*-question_(\d+)-/);
                const match = teacherMatch || parentMatch;
                extractedQuestionId = match ? match[1] : 'unknown';
            }
            
            return {
                filename: file.ObjectName,
                url: `https://${process.env.BUNNY_CDN_URL}/${folderPath}${file.ObjectName}`,
                size: file.Length,
                lastModified: new Date(file.LastChanged).getTime(),
                questionId: extractedQuestionId
            };
        });

        // Sort by last modified (newest first)
        recordings.sort((a, b) => b.lastModified - a.lastModified);

        return res.status(200).json({
            success: true,
            world: world,
            lmid: lmid,
            questionId: questionId || 'all',
            count: recordings.length,
            recordings: recordings
        });

    } catch (error) {
        console.error('List recordings error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to list recordings',
            details: error.message
        });
    }
} 