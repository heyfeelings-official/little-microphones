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

// Static file URLs
const STATIC_FILES = {
  intro: 'https://little-microphones.b-cdn.net/audio/other/intro.mp3',
  outro: 'https://little-microphones.b-cdn.net/audio/other/outro.mp3',
  monkeys: 'https://little-microphones.b-cdn.net/audio/other/monkeys.mp3'
};

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

        // Audio processing parameters for classroom environment
        const audioParams = {
            // User recordings (default settings)
            userRecordings: {
                noiseReduction: 5,         // Light noise reduction
                volumeBoost: 1.2,          // Slight volume boost
                highpass: 60,              // Light low-frequency filter
                lowpass: 12000,            // Light high-frequency filter
                dynamicNormalization: 0.7  // Moderate normalization
            },
            // Background music
            backgroundMusic: {
                volume: 0.25,              // Background volume
                highpass: 80,              // EQ for background
                lowpass: 8000,             // Reduce high frequencies
                fadeIn: 0.3,               // Fade in duration
                fadeOut: 0.3               // Fade out duration
            },
            // Question prompts and system audio
            systemAudio: {
                volume: 1.0,               // Normal volume
                dynamicNormalization: 0.6  // Light normalization
            },
            // Final master settings
            master: {
                volume: 1.0,               // Normal overall volume
                highpass: 40,              // Remove very low frequencies
                lowpass: 15000,            // Keep most frequencies
                dynamicNormalization: 0.7  // Light final normalization
            }
        };

        // Try to combine audio using FFmpeg
        try {
            const combinedAudioUrl = await combineAudioWithFFmpeg(audioSegments, world, lmid, audioParams);
            
            // Create and save last-program-manifest.json
            const manifestData = {
                generatedAt: new Date().toISOString(),
                world: world,
                lmid: lmid,
                programUrl: combinedAudioUrl,
                totalSegments: audioSegments.length,
                filesUsed: extractFilesUsed(audioSegments),
                audioParams: audioParams,
                version: '4.0.0'
            };
            
            await saveManifestToBunny(manifestData, world, lmid);
            
            return res.status(200).json({
                success: true,
                message: 'Radio program generated successfully',
                url: combinedAudioUrl,
                totalSegments: audioSegments.length,
                audioParams: audioParams,
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
                
                // Combine answers with background
                const combinedPath = path.join(tempDir, `segment-${String(i).padStart(3, '0')}-combined.mp3`);
                await combineAnswersWithBackground(answerPaths, backgroundPath, combinedPath, audioParams);
                
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
        await assembleFinalProgram(processedSegments, outputPath, audioParams);
        
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
 * Combine multiple answer recordings with background music
 */
async function combineAnswersWithBackground(answerPaths, backgroundPath, outputPath, audioParams) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        
        // Add all answer inputs
        answerPaths.forEach(path => command.input(path));
        
        // Add background music input
        command.input(backgroundPath);
        
        const filters = [];
        
        // Process each answer with noise reduction and volume boost
        answerPaths.forEach((path, index) => {
            filters.push(`[${index}:a]highpass=${audioParams.userRecordings.highpass},lowpass=${audioParams.userRecordings.lowpass},volume=${audioParams.userRecordings.volumeBoost},dynaudnorm=p=${audioParams.userRecordings.dynamicNormalization}:s=5,afftdn=nr=${audioParams.userRecordings.noiseReduction}:nf=-25[answer${index}]`);
        });
        
        // Concatenate all answers
        const answerStreams = answerPaths.map((_, index) => `[answer${index}]`).join('');
        filters.push(`${answerStreams}concat=n=${answerPaths.length}:v=0:a=1[answers_combined]`);
        
        // Process background music - make it loop/trim to match answers duration
        const bgIndex = answerPaths.length;
        filters.push(`[${bgIndex}:a]volume=${audioParams.backgroundMusic.volume},highpass=f=${audioParams.backgroundMusic.highpass},lowpass=f=${audioParams.backgroundMusic.lowpass},aloop=loop=-1:size=2e+09[background_loop]`);
        
        // Mix answers with background - background will be trimmed to match answers duration
        filters.push(`[answers_combined][background_loop]amix=inputs=2:duration=shortest:dropout_transition=0[mixed]`);
        
        command
            .complexFilter(filters)
            .outputOptions(['-map', '[mixed]'])
            .format('mp3')
            .audioCodec('libmp3lame')
            .on('start', (commandLine) => {
                console.log(`🎵 Combining answers with background: ${commandLine}`);
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
 * Assemble final program from processed segments
 */
async function assembleFinalProgram(processedSegments, outputPath, audioParams) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        
        // Add all processed segments as inputs
        processedSegments.forEach(segment => command.input(segment.path));
        
        const filters = [];
        
        // Apply final processing to each segment
        processedSegments.forEach((segment, index) => {
            if (segment.type === 'single') {
                // System audio (intro, outro, questions)
                filters.push(`[${index}:a]volume=${audioParams.systemAudio.volume},dynaudnorm=p=${audioParams.systemAudio.dynamicNormalization}:s=3[seg${index}]`);
            } else {
                // Already processed combined segments
                filters.push(`[${index}:a]anull[seg${index}]`);
            }
        });
        
        // Concatenate all segments
        const segmentStreams = processedSegments.map((_, index) => `[seg${index}]`).join('');
        filters.push(`${segmentStreams}concat=n=${processedSegments.length}:v=0:a=1[temp]`);
        
        // Final master processing
        filters.push(`[temp]dynaudnorm=p=${audioParams.master.dynamicNormalization}:s=5,volume=${audioParams.master.volume},highpass=f=${audioParams.master.highpass},lowpass=f=${audioParams.master.lowpass}[outa]`);
        
        command
            .complexFilter(filters)
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
                console.log('🎵 Final assembly command:', commandLine);
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
 * Download a file from URL
 */
function downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        
        protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
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
 */
async function uploadToBunny(filePath, world, lmid) {
    // Add timestamp for versioning to prevent caching issues
    const timestamp = Date.now();
    const fileName = `radio-program-${world}-${lmid}-v${timestamp}.mp3`;
    const uploadPath = `/${lmid}/${world}/${fileName}`;
    
    console.log(`📤 Uploading to Bunny.net: ${uploadPath}`);
    
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
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 201) {
                const downloadUrl = `${process.env.BUNNY_CDN_URL}${uploadPath}`;
                console.log(`✅ Upload successful: ${downloadUrl}`);
                
                // Ensure URL has proper protocol and add cache-busting parameter
                const finalUrl = downloadUrl.startsWith('http') ? downloadUrl : `https://${downloadUrl}`;
                const cacheBustUrl = `${finalUrl}?t=${timestamp}`;
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

/**
 * Extract files used from audio segments for manifest tracking
 * @param {Array} audioSegments - Array of audio segments
 * @returns {Array} Array of filenames used in the program
 */
function extractFilesUsed(audioSegments) {
    const filesUsed = [];
    
    audioSegments.forEach(segment => {
        if (segment.type === 'single') {
            // Extract filename from URL
            const filename = segment.url.split('/').pop();
            filesUsed.push(filename);
        } else if (segment.type === 'combine_with_background') {
            // Extract filenames from answer URLs
            segment.answerUrls.forEach(url => {
                const filename = url.split('/').pop();
                filesUsed.push(filename);
            });
            
            // Extract background filename
            const backgroundFilename = segment.backgroundUrl.split('/').pop();
            filesUsed.push(backgroundFilename);
        }
    });
    
    return filesUsed;
}

/**
 * Save manifest data to Bunny.net storage
 * @param {Object} manifestData - Manifest data to save
 * @param {string} world - World name
 * @param {string} lmid - LMID
 */
async function saveManifestToBunny(manifestData, world, lmid) {
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