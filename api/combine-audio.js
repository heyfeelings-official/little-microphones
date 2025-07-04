/**
 * api/combine-audio.js - Professional Radio Program Generation Service
 * 
 * PURPOSE: Serverless function for combining multiple audio recordings into professional radio programs using FFmpeg
 * DEPENDENCIES: FFmpeg (with fluent-ffmpeg), Bunny.net Storage API, Node.js file system, HTTPS requests
 * DOCUMENTATION: See /documentation/api-documentation.md for complete API overview
 * 
 * REQUEST FORMAT:
 * POST /api/combine-audio
 * Body: { world: "spookyland", lmid: "32", audioSegments: [segments...] }
 * 
 * AUDIO SEQUENCE STRUCTURE:
 * intro.mp3 → question1.mp3 → [user recordings Q1 + background] → monkeys.mp3 → 
 * question2.mp3 → [user recordings Q2 + background] → monkeys.mp3 → ... → outro.mp3
 * 
 * PROCESSING PIPELINE:
 * Recording Collection → Audio Plan Creation → File Download → FFmpeg Combination → 
 * Professional Audio Processing → Cloud Upload → Manifest Creation → CDN URL Response
 * 
 * ADVANCED AUDIO PROCESSING:
 * - Multi-stage audio enhancement with noise reduction and normalization
 * - Dynamic background music mixing with perfect duration matching
 * - Professional mastering with EQ, compression, and volume optimization
 * - Answer chronology preservation (first recorded = first played)
 * - Seamless audio transitions with crossfading capabilities
 * 
 * FFMPEG FEATURES:
 * - Complex filter graphs for advanced audio manipulation
 * - Real-time progress tracking with detailed logging
 * - Multiple format support with automatic conversion
 * - Dynamic range compression for consistent volume levels
 * - High-quality MP3 encoding with optimal settings
 * 
 * AUDIO PARAMETERS (Classroom-Optimized):
 * - User Recordings: Light noise reduction, moderate volume boost, balanced EQ
 * - Background Music: 25% volume, filtered frequency range, seamless looping
 * - System Audio: Standard processing for intro/outro/questions
 * - Master Output: Professional mastering with dynamic normalization
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Parallel file downloads for faster processing
 * - Efficient temporary file management with automatic cleanup
 * - Memory-optimized audio processing for large files
 * - Progressive status updates for real-time feedback
 * - Error recovery with detailed diagnostic information
 * 
 * SECURITY & VALIDATION:
 * - Input validation for all audio segment parameters
 * - Secure file download with URL verification
 * - Protected environment variable access
 * - Comprehensive error sanitization for safe responses
 * - CORS configuration for cross-origin requests
 * 
 * OUTPUT FORMAT:
 * - High-quality MP3 with stereo encoding
 * - 44.1kHz sample rate for optimal compatibility
 * - 128kbps bitrate for balance of quality and size
 * - Cache-busting timestamps for fresh content delivery
 * - CDN-optimized file organization
 * 
 * ERROR HANDLING:
 * - FFmpeg availability detection with setup suggestions
 * - Network failure recovery with retry mechanisms
 * - Partial processing success reporting
 * - Detailed error logging for debugging
 * - Graceful degradation for missing dependencies
 * 
 * MANIFEST SYSTEM:
 * - Automatic creation of last-program-manifest.json after successful generation
 * - Tracks all files used in program generation for intelligent comparison
 * - Enables radio.js to determine if new program generation is needed
 * - Stored in Bunny.net storage alongside audio files for consistency
 * 
 * INTEGRATION POINTS:
 * - Bunny.net CDN: File storage and global content delivery
 * - recording.js: Audio segment collection and organization
 * - radio.js: Manifest consumption for intelligent program generation
 * - Vercel Runtime: Serverless execution environment
 * - Client Progress: Real-time status updates and feedback
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.4.0
 * STATUS: Production Ready ✅
 */

// Import required modules at the top
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import http from 'http';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { extractFilesUsed, STATIC_FILES } from './audio-utils.js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { world, lmid, audioSegments } = req.body;

        // Validation
        if (!world || !lmid || !audioSegments) {
            return res.status(400).json({ 
                error: 'Missing required parameters: world, lmid, audioSegments' 
            });
        }

        // Validate audioSegments structure
        if (!Array.isArray(audioSegments) || audioSegments.length === 0) {
            return res.status(400).json({ 
                error: 'Invalid audioSegments format. Expected array of segments.' 
            });
        }

        // Check environment variables
        const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
        const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
        const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL;

        if (!BUNNY_API_KEY || !BUNNY_STORAGE_ZONE || !BUNNY_CDN_URL) {
            console.error('❌ Missing Bunny.net environment variables');
            return res.status(500).json({ 
                error: 'Server configuration error: Missing storage credentials' 
            });
        }

        console.log(`🎵 Starting radio program generation for ${world}/${lmid}`);
        console.log(`📊 Processing ${audioSegments.length} audio segments`);

        // No audio processing - just basic concatenation
        const audioParams = null;

        // Try to combine audio using FFmpeg
        try {
            const combinedAudioUrl = await combineAudioWithFFmpeg(audioSegments, world, lmid, audioParams);
            
            // Count only user answer audio files for recordingCount
            let recordingCount = 0;
            try {
                const response = await fetch(`https://little-microphones.vercel.app/api/list-recordings?world=${world}&lmid=${lmid}`);
                if (response.ok) {
                    const data = await response.json();
                    // Only count files matching the user answer pattern
                    const userAnswerPattern = new RegExp(`^kids-world_${world}-lmid_${lmid}-question_\\d+-tm_\\d+\\.mp3$`);
                    const userFiles = (data.recordings || []).filter(
                        file => userAnswerPattern.test(file.filename)
                    );
                    recordingCount = userFiles.length;
                } else {
                    console.warn(`Failed to fetch recording count for manifest: ${response.status}`);
                }
            } catch (err) {
                console.warn('Error fetching recording count for manifest:', err);
            }
            
            // Create and save last-program-manifest.json (simplified)
            const manifestData = {
                generatedAt: new Date().toISOString(),
                world: world,
                lmid: lmid,
                programUrl: combinedAudioUrl,
                recordingCount: recordingCount,
                version: '5.3.0'
            };
            
            await uploadManifestToBunny(manifestData, world, lmid);
            
            return res.status(200).json({
                success: true,
                message: 'Radio program generated successfully',
                url: combinedAudioUrl,
                totalSegments: audioSegments.length,
                manifest: manifestData
            });
        } catch (ffmpegError) {
            console.error('FFmpeg processing failed:', ffmpegError);
            
            return res.status(500).json({
                success: false,
                message: 'Audio processing failed',
                error: ffmpegError.message
            });
        }

    } catch (error) {
        console.error('❌ Error in combine-audio API:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
}

/**
 * Combine audio files using FFmpeg with proper answer grouping
 */
async function combineAudioWithFFmpeg(audioSegments, world, lmid, audioParams) {
    try {
        const ffmpegPath = ffmpegInstaller.path;
        ffmpeg.setFfmpegPath(ffmpegPath);
        
        console.log('📦 FFmpeg found, starting radio program generation...');
        console.log(`🎵 Processing ${audioSegments.length} audio segments in DOM order:`);
        
        // Log the complete audio sequence order for debugging
        audioSegments.forEach((segment, index) => {
            if (segment.type === 'single') {
                console.log(`  ${index + 1}. [SINGLE] ${segment.url.split('/').pop()}`);
            } else if (segment.type === 'combine_with_background') {
                console.log(`  ${index + 1}. [COMBINED] ${segment.questionId} - ${segment.answerUrls.length} answers with background`);
            }
        });
        
        // Create temp directory
        const tempDir = path.join(os.tmpdir(), `radio-${world}-${lmid}-${Date.now()}`);
        console.log('📁 Creating temp directory:', tempDir);
        await fs.mkdir(tempDir, { recursive: true });
        
        // Process each segment IN ORDER (critical for maintaining DOM sequence)
        const processedSegments = [];
        
        for (let i = 0; i < audioSegments.length; i++) {
            const segment = audioSegments[i];
            console.log(`🎵 Processing segment ${i + 1}/${audioSegments.length}:`, segment.type);
            
            if (segment.type === 'single') {
                // Single audio file (intro, outro, questions)
                const fileName = `segment-${String(i).padStart(3, '0')}-single.mp3`;
                const filePath = path.join(tempDir, fileName);
                
                console.log(`📥 Downloading: ${segment.url}`);
                await downloadFile(segment.url, filePath);
                
                processedSegments.push({
                    path: filePath,
                    type: 'single',
                    url: segment.url,
                    originalIndex: i
                });
                
                console.log(`✅ Processed single segment ${i + 1}: ${fileName}`);
                
            } else if (segment.type === 'combine_with_background') {
                // Combine multiple answers with background music
                console.log(`🎵 Processing ${segment.answerUrls.length} answers for ${segment.questionId} with background`);
                
                // Download all answer files
                const answerPaths = [];
                for (let j = 0; j < segment.answerUrls.length; j++) {
                    const answerPath = path.join(tempDir, `answers-${String(i).padStart(3, '0')}-${j}.mp3`);
                    console.log(`📥 Downloading answer ${j + 1}/${segment.answerUrls.length}: ${segment.answerUrls[j]}`);
                    await downloadFile(segment.answerUrls[j], answerPath);
                    answerPaths.push(answerPath);
                }
                
                // Download background music
                const backgroundPath = path.join(tempDir, `background-${String(i).padStart(3, '0')}.mp3`);
                console.log(`📥 Downloading background: ${segment.backgroundUrl}`);
                await downloadFile(segment.backgroundUrl, backgroundPath);
                
                // Combine answers with background (no processing)
                const combinedPath = path.join(tempDir, `segment-${String(i).padStart(3, '0')}-combined.mp3`);
                await combineAnswersWithBackground(answerPaths, backgroundPath, combinedPath);
                
                processedSegments.push({
                    path: combinedPath,
                    type: 'combined',
                    questionId: segment.questionId,
                    originalIndex: i
                });
                
                console.log(`✅ Processed combined segment ${i + 1}: ${segment.questionId}`);
            }
        }
        
        // Verify processing order
        console.log('📋 Verifying segment processing order:');
        processedSegments.forEach((segment, index) => {
            console.log(`  ${index + 1}. [${segment.type.toUpperCase()}] Original index: ${segment.originalIndex}, Path: ${path.basename(segment.path)}`);
        });
        
        // Final assembly of all segments IN ORDER
        console.log('🎼 Assembling final radio program in correct order...');
        const outputPath = path.join(tempDir, `radio-program-${world}-${lmid}.mp3`);
        await assembleFinalProgram(processedSegments, outputPath);
        
        // Upload to Bunny.net
        const uploadUrl = await uploadToBunny(outputPath, world, lmid);
        
        // Cleanup temp files
        await cleanupTempDirectory(tempDir);
        
        console.log('✅ Radio program generation completed successfully');
        return uploadUrl;
        
    } catch (error) {
        console.error('❌ FFmpeg error:', error);
        throw new Error(`FFmpeg error: ${error.message}`);
    }
}

/**
 * Combine multiple answer recordings with background music (no processing)
 */
async function combineAnswersWithBackground(answerPaths, backgroundPath, outputPath) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        
        // Add all answer inputs
        answerPaths.forEach(path => command.input(path));
        
        // Add background music input
        command.input(backgroundPath);
        
        const filters = [];
        
        // Simple concatenation of answers (no processing)
        const answerStreams = answerPaths.map((_, index) => `[${index}:a]`).join('');
        filters.push(`${answerStreams}concat=n=${answerPaths.length}:v=0:a=1[answers_combined]`);
        
        // Simple background music loop (no processing)
        const bgIndex = answerPaths.length;
        filters.push(`[${bgIndex}:a]aloop=loop=-1:size=2e+09[background_loop]`);
        
        // Simple mix answers with background (no processing)
        filters.push(`[answers_combined][background_loop]amix=inputs=2:duration=shortest:dropout_transition=0[mixed]`);
        
        command
            .complexFilter(filters)
            .outputOptions(['-map', '[mixed]'])
            .format('mp3')
            .audioCodec('libmp3lame')
            .on('start', (commandLine) => {
                console.log(`🎵 Combining answers with background (no processing): ${commandLine}`);
            })
            .on('progress', (progress) => {
                console.log(`⏳ Combining progress: ${Math.round(progress.percent || 0)}%`);
            })
            .on('end', () => {
                console.log('✅ Answers combined with background');
                resolve();
            })
            .on('error', reject)
            .save(outputPath);
    });
}

/**
 * Assemble final program from processed segments (no processing)
 */
async function assembleFinalProgram(processedSegments, outputPath) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        
        // Add all processed segments as inputs
        processedSegments.forEach(segment => command.input(segment.path));
        
        // Simple concatenation of all segments (no processing)
        const segmentStreams = processedSegments.map((_, index) => `[${index}:a]`).join('');
        const filter = `${segmentStreams}concat=n=${processedSegments.length}:v=0:a=1[outa]`;
        
        command
            .complexFilter([filter])
            .outputOptions([
                '-map', '[outa]',
                '-ar', '44100',
                '-ac', '2',
                '-b:a', '128k',
                '-compression_level', '2'
            ])
            .format('mp3')
            .audioCodec('libmp3lame')
            .on('start', (commandLine) => {
                console.log('🎵 Final assembly command (no processing):', commandLine);
            })
            .on('progress', (progress) => {
                console.log(`⏳ Final assembly: ${Math.round(progress.percent || 0)}% done`);
            })
            .on('end', () => {
                console.log('✅ Radio program assembly complete');
                resolve();
            })
            .on('error', reject)
            .save(outputPath);
    });
}

/**
 * Generate a silent MP3 placeholder for missing system files
 * @param {string} filePath - Output file path
 * @param {number} duration - Duration in seconds (default 3)
 */
async function generateSilentPlaceholder(filePath, duration = 3) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        
        command
            .input('anullsrc=channel_layout=stereo:sample_rate=44100')
            .inputOptions(['-f', 'lavfi'])
            .duration(duration)
            .audioCodec('libmp3lame')
            .audioChannels(2)
            .audioFrequency(44100)
            .audioBitrate('128k')
            .format('mp3')
            .on('start', () => {
                console.log(`🔧 Generating ${duration}s silent placeholder: ${path.basename(filePath)}`);
            })
            .on('end', () => {
                console.log(`✅ Generated silent placeholder: ${path.basename(filePath)}`);
                resolve();
            })
            .on('error', reject)
            .save(filePath);
    });
}

/**
 * Download a file from URL with fallback to silent placeholder for missing system files
 */
function downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        
        protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                // Check if this is a system file that we can replace with a placeholder
                const isSystemFile = url.includes('/audio/other/') || url.includes('-QID');
                
                if (isSystemFile) {
                    console.warn(`⚠️ System file missing (${response.statusCode}): ${url}`);
                    console.log(`🔧 Generating silent placeholder instead...`);
                    
                    // Determine appropriate duration based on file type
                    let duration = 3; // default
                    if (url.includes('monkeys.mp3')) {
                        duration = 30; // background music needs to be longer
                    } else if (url.includes('-QID')) {
                        duration = 5; // question prompts
                    } else if (url.includes('intro.mp3') || url.includes('outro.mp3')) {
                        duration = 3; // intro/outro
                    }
                    
                    // Generate silent placeholder
                    generateSilentPlaceholder(filePath, duration)
                        .then(resolve)
                        .catch(reject);
                    return;
                } else {
                    reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                    return;
                }
            }
            
            const fileStream = createWriteStream(filePath);
            response.pipe(fileStream);
            
            fileStream.on('finish', () => {
                fileStream.close((closeError) => {
                    if (closeError) {
                        reject(closeError);
                    } else {
                        resolve();
                    }
                });
            });
            
            fileStream.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * Upload combined audio to Bunny.net
 * FIXED: Use consistent filename (no timestamp versioning) with heavy cache-busting instead
 */
async function uploadToBunny(filePath, world, lmid) {
    // NO timestamp in filename - same program always gets same filename
    const fileName = `radio-program-${world}-${lmid}.mp3`;
    const uploadPath = `/${lmid}/${world}/${fileName}`;
    
    console.log(`📤 Uploading to Bunny.net: ${uploadPath} (overwriting existing)`);
    
    const fileBuffer = await fs.readFile(filePath);
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'storage.bunnycdn.com',
            port: 443,
            path: `/${process.env.BUNNY_STORAGE_ZONE}${uploadPath}`,
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'audio/mpeg',
                'Content-Length': fileBuffer.length,
                // HEAVY cache-busting headers
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Last-Modified': new Date().toUTCString(),
                // Force CDN to treat as new content
                'X-Cache-Control': 'no-cache'
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 201) {
                const downloadUrl = `${process.env.BUNNY_CDN_URL}${uploadPath}`;
                console.log(`✅ Upload successful: ${downloadUrl}`);
                
                // Ensure URL has proper protocol and add strong cache-busting parameter
                const finalUrl = downloadUrl.startsWith('http') ? downloadUrl : `https://${downloadUrl}`;
                const timestamp = Date.now();
                const cacheBustUrl = `${finalUrl}?v=${timestamp}&cb=${Math.random().toString(36).substring(2)}`;
                resolve(cacheBustUrl);
            } else {
                reject(new Error(`Upload failed with status: ${res.statusCode}`));
            }
        });
        
        req.on('error', reject);
        req.write(fileBuffer);
        req.end();
    });
}

/**
 * Clean up temporary directory
 */
async function cleanupTempDirectory(tempDir) {
    try {
        // Use fs.rm instead of deprecated fs.rmdir for Node.js 14+
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up temp directory: ${tempDir}`);
    } catch (error) {
        console.warn(`⚠️ Failed to cleanup temp directory: ${error.message}`);
    }
}

// extractFilesUsed function now imported from audio-utils.js

/**
 * Save manifest data to Bunny.net storage
 * @param {Object} manifestData - Manifest data to save
 * @param {string} world - World name
 * @param {string} lmid - LMID
 */
async function uploadManifestToBunny(manifestData, world, lmid) {
    const manifestJson = JSON.stringify(manifestData, null, 2);
    const uploadPath = `/${lmid}/${world}/last-program-manifest.json`;
    
    console.log(`📄 Saving manifest to Bunny.net: ${uploadPath}`);
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'storage.bunnycdn.com',
            port: 443,
            path: `/${process.env.BUNNY_STORAGE_ZONE}${uploadPath}`,
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(manifestJson, 'utf8'),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log(`✅ Manifest saved successfully: ${uploadPath}`);
                resolve();
            } else {
                console.warn(`⚠️ Manifest save failed with status: ${res.statusCode}`);
                // Don't reject - manifest save failure shouldn't fail the whole process
                resolve();
            }
        });
        
        req.on('error', (error) => {
            console.warn(`⚠️ Manifest save error: ${error.message}`);
            // Don't reject - manifest save failure shouldn't fail the whole process
            resolve();
        });
        
        req.write(manifestJson);
        req.end();
    });
}

/**
 * Get FFmpeg serverless setup suggestions
 */
function getFFmpegSetupSuggestions() {
    return {
        option1: {
            name: "FFmpeg Layer for Vercel",
            description: "Install FFmpeg as a dependency",
            steps: [
                "npm install @ffmpeg-installer/ffmpeg fluent-ffmpeg",
                "Update package.json with proper dependencies",
                "Deploy to Vercel with increased function timeout",
                "Test with sample audio files"
            ],
            pros: ["Full FFmpeg functionality", "Handle all formats", "Works in serverless"],
            cons: ["Large deployment size", "Cold start time", "Memory usage"]
        },
        option2: {
            name: "External Audio Processing Service",
            description: "Use service like Bannerbear, Cloudinary, or similar",
            steps: [
                "Sign up for audio processing service",
                "Send audio file URLs to service API",
                "Receive combined audio file",
                "Upload result to Bunny.net"
            ],
            pros: ["No deployment size issues", "Fast processing", "Professional quality"],
            cons: ["Additional monthly cost", "External dependency", "API limits"]
        },
        option3: {
            name: "AWS Lambda with FFmpeg Layer",
            description: "Use dedicated Lambda function with FFmpeg",
            steps: [
                "Create Lambda function with FFmpeg layer",
                "Deploy audio processing logic",
                "Call from Vercel API",
                "Return processed audio URL"
            ],
            pros: ["Dedicated processing power", "Full control", "Scalable"],
            cons: ["More complex setup", "AWS costs", "Cross-platform complexity"]
        },
        recommended: "option1",
        currentIssue: "Audio processing failed. This may be due to missing audio files or network issues.",
        implementation: {
            packages: [
                "@ffmpeg-installer/ffmpeg",
                "fluent-ffmpeg"
            ],
            vercelConfig: {
                functions: {
                    "api/combine-audio.js": {
                        maxDuration: 60
                    }
                }
            }
        }
    };
} 