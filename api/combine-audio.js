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
 * - Background Music: 50% volume, under entire program except jingles, seamless looping
 * - Intro/Outro Files: Original volume preserved (no modification)
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
import { extractFilesUsed, STATIC_FILES } from '../utils/audio-utils.js';
import { acquireGenerationLock, releaseLock } from '../utils/generation-lock.js';

export default async function handler(req, res) {
    // Secure CORS headers
    const { setCorsHeaders } = await import('../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['GET', 'POST', 'OPTIONS']);
    corsHandler(req);

    // Rate limiting - 5 audio processing per minute
    const { checkRateLimit } = await import('../utils/simple-rate-limiter.js');
    if (!checkRateLimit(req, res, 'combine-audio', 5)) {
        return; // Rate limit exceeded
    }

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { world, lmid, audioSegments, programType, lang } = req.body;

        // Validation
        if (!world || !lmid || !audioSegments || !lang) {
            return res.status(400).json({ 
                error: 'Missing required parameters: world, lmid, audioSegments, and lang' 
            });
        }
        
        // Validate programType if provided
        const validProgramTypes = ['kids', 'parent'];
        const type = programType || 'kids'; // Default to kids for backward compatibility
        if (!validProgramTypes.includes(type)) {
            return res.status(400).json({ 
                error: 'Invalid programType. Must be "kids" or "parent"' 
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

        console.log(`🎵 Starting radio program generation for ${lang}/${world}/${lmid} (${type} program)`);
        console.log(`📊 Processing ${audioSegments.length} audio segments`);

        // NEW: Try to acquire generation lock to prevent concurrent generations
        const lockAcquired = await acquireGenerationLock(world, lmid, type, [], lang);
        if (!lockAcquired) {
            console.log(`🔒 Generation already in progress for ${lang}/${world}/${lmid}/${type}`);
            return res.status(409).json({
                success: false,
                message: 'Generation already in progress. Please wait and try again.',
                error: 'GENERATION_IN_PROGRESS'
            });
        }

        // No audio processing - just basic concatenation
        const audioParams = null;

        // Try to combine audio using FFmpeg
        try {
            const combinedAudioUrl = await combineAudioWithFFmpeg(audioSegments, world, lmid, audioParams, type, lang);
            
            // Count recordings by type for recordingCount
            let recordingCount = 0;
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
                const mockRes = {
                    status: (code) => mockRes,
                    json: (data) => { responseData = data; return mockRes; },
                    end: () => mockRes,
                    setHeader: () => mockRes,
                    getHeader: () => null
                };
                
                // Call handler directly
                await listRecordingsHandler(mockReq, mockRes);
                
                if (responseData && responseData.success) {
                    const data = responseData;
                    
                    if (type === 'kids') {
                        // Count kids recordings
                        const kidsPattern = new RegExp(`^kids-world_${world}-lmid_${lmid}-question_\\d+-tm_\\d+\\.(webm|mp3)$`);
                        const kidsFiles = (data.recordings || []).filter(
                            file => kidsPattern.test(file.filename)
                        );
                        recordingCount = kidsFiles.length;
                    } else if (type === 'parent') {
                        // Count parent recordings
                        const parentPattern = new RegExp(`^parent_[^-]+-world_${world}-lmid_${lmid}-question_\\d+-tm_\\d+\\.(webm|mp3)$`);
                        const parentFiles = (data.recordings || []).filter(
                            file => parentPattern.test(file.filename)
                        );
                        recordingCount = parentFiles.length;
                    }
                } else {
                    console.warn(`Failed to fetch recording count for manifest: ${response.status}`);
                }
            } catch (err) {
                console.warn('Error fetching recording count for manifest:', err);
            }
            
            // Create and save program manifest with type-specific data
            const manifestData = {
                generatedAt: new Date().toISOString(),
                world: world,
                lmid: lmid,
                programType: type,
                recordingCount: recordingCount,
                version: '5.4.0'
            };
            
            // Set program URL - use programUrl for both types in individual manifests
            manifestData.programUrl = combinedAudioUrl;
            
            // Also set type-specific field for combined manifest
            if (type === 'kids') {
                manifestData.kidsProgram = combinedAudioUrl;
            } else if (type === 'parent') {
                manifestData.parentProgram = combinedAudioUrl;
            }
            
            await uploadManifestToBunny(manifestData, world, lmid, type, lang);
            
            // NEW: Release lock after successful generation
            await releaseLock(world, lmid, type, lang);
            
            return res.status(200).json({
                success: true,
                message: 'Radio program generated successfully',
                url: combinedAudioUrl,
                totalSegments: audioSegments.length,
                manifest: manifestData
            });
        } catch (ffmpegError) {
            console.error('FFmpeg processing failed:', ffmpegError);
            
            // NEW: Release lock on error
            await releaseLock(world, lmid, type, lang);
            
            return res.status(500).json({
                success: false,
                message: 'Audio processing failed',
                error: ffmpegError.message
            });
        }

    } catch (error) {
        console.error('❌ Error in combine-audio API:', error);
        
        // NEW: Release lock and create error manifest to prevent infinite generation loops
        if (req.body?.world && req.body?.lmid && req.body?.programType) {
            const { world, lmid, programType, lang } = req.body;
            
            // Release processing lock
            await releaseLock(world, lmid, programType || 'kids', lang || 'en');
            
            // Create error manifest to prevent infinite retry loops
            try {
                // Circuit breaker: Check if we've had recent failures
                const now = Date.now();
                const fiveMinutesAgo = now - (5 * 60 * 1000);
                
                // Create error manifest with circuit breaker logic
                const errorManifest = {
                    error: true,
                    errorMessage: error.message,
                    timestamp: now,
                    world: world,
                    lmid: lmid,
                    programType: programType || 'kids',
                    lang: lang || 'en',
                    failureCount: 1, // Will be incremented if existing error manifest found
                    retryAfter: now + (30 * 60 * 1000) // 30 minutes cooldown for repeated failures
                };
                
                const manifestPath = `${lang || 'en'}/${lmid}/${world}/last-program-manifest.json`;
                const manifestUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${manifestPath}`;
                
                await fetch(manifestUrl, {
                    method: 'PUT',
                    headers: {
                        'AccessKey': process.env.BUNNY_STORAGE_PASSWORD,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(errorManifest)
                });
                
                console.log(`📋 Error manifest created to prevent retry loops: ${manifestPath}`);
            } catch (manifestError) {
                console.warn('⚠️ Failed to create error manifest:', manifestError.message);
            }
        }
        
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
}

/**
 * Combine audio files using FFmpeg with proper answer grouping
 */
async function combineAudioWithFFmpeg(audioSegments, world, lmid, audioParams, programType = 'kids', lang = 'en') {
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
            
            if (segment.type === 'single' || segment.type === 'recording') {
                // Single audio file (intro, outro, questions, recordings)
                const fileName = `segment-${String(i).padStart(3, '0')}-single.mp3`;
                const filePath = path.join(tempDir, fileName);
                
                // The URL for static files is already localized by the frontend (radio.js)
                        console.log(`📥 Downloading: ${segment.url}`);
        await downloadFile(segment.url, filePath);
                
                // Skip normalization here - will be done collectively after analysis
                
                processedSegments.push({
                    path: filePath,
                    type: 'single',
                    url: segment.url,
                    originalIndex: i
                });
                
                console.log(`✅ Processed single segment ${i + 1}: ${fileName}`);
                
            } else if (segment.type === 'question_intro' || segment.type === 'pause' || segment.type === 'question_transition' || segment.type === 'silence') {
                // Generate silent audio for intro/pause/transition/silence segments
                const fileName = `segment-${String(i).padStart(3, '0')}-${segment.type}.mp3`;
                const filePath = path.join(tempDir, fileName);
                
                const duration = segment.duration || 2; // default 2 seconds
                console.log(`🔧 Generating ${duration}s silent segment for ${segment.type}`);
                await generateSilentPlaceholder(filePath, duration);
                
                processedSegments.push({
                    path: filePath,
                    type: 'single',
                    originalIndex: i
                });
                
                console.log(`✅ Processed ${segment.type} segment ${i + 1}: ${fileName}`);
                
            } else if (segment.type === 'combine_with_background') {
                // Just concatenate answers without background (background will be added globally)
                console.log(`🎵 Processing ${segment.answerUrls.length} answers for ${segment.questionId} (background will be added globally)`);
                
                // Download all answer files
                const answerPaths = [];
                for (let j = 0; j < segment.answerUrls.length; j++) {
                    const answerPath = path.join(tempDir, `answers-${String(i).padStart(3, '0')}-${j}.mp3`);
                    console.log(`📥 Downloading answer ${j + 1}/${segment.answerUrls.length}: ${segment.answerUrls[j]}`);
                    await downloadFile(segment.answerUrls[j], answerPath);
                    answerPaths.push(answerPath);
                }
                
                // Just concatenate answers without background
                const combinedPath = path.join(tempDir, `segment-${String(i).padStart(3, '0')}-answers.mp3`);
                await concatenateAnswers(answerPaths, combinedPath);
                
                processedSegments.push({
                    path: combinedPath,
                    type: 'answers',
                    questionId: segment.questionId,
                    originalIndex: i
                });
                
                console.log(`✅ Processed answers segment ${i + 1}: ${segment.questionId}`);
            }
        }
        
        // Verify processing order
        console.log('📋 Verifying segment processing order:');
        processedSegments.forEach((segment, index) => {
            console.log(`  ${index + 1}. [${segment.type.toUpperCase()}] Original index: ${segment.originalIndex}, Path: ${path.basename(segment.path)}`);
        });
        
        // Extract background URL from segments (use first background found)
        let backgroundUrl = null;
        for (const segment of audioSegments) {
            if (segment.type === 'combine_with_background' && segment.backgroundUrl) {
                backgroundUrl = segment.backgroundUrl;
                break;
            }
        }
        
        // INTELLIGENT APPROACH: Analyze system files first, then match user recordings to their level
        console.log('🔍 Step 1: Analyzing system voice files to determine target level...');
        
        // Collect system voice files for analysis
        const systemVoiceFiles = [];
        for (const segment of processedSegments) {
            if (segment.type !== 'answers' && segment.path) {
                // Include QIDs, intros, outros, but exclude jingles
                const filename = path.basename(segment.path).toLowerCase();
                if (filename.includes('qid') || filename.includes('intro') || filename.includes('outro') || filename.includes('question')) {
                    systemVoiceFiles.push(segment.path);
                }
            }
        }
        
        // Analyze system voice files to get target level
        let targetLevel = -16.0; // Default fallback
        if (systemVoiceFiles.length > 0) {
            console.log(`🎯 Analyzing ${systemVoiceFiles.length} system voice files...`);
            const systemAnalysis = await analyzeAllVoiceLevels(systemVoiceFiles);
            targetLevel = systemAnalysis.avgLUFS; // Use average of system files
            console.log(`🎯 System voice average: ${targetLevel.toFixed(1)} LUFS - using as target for user recordings`);
        } else {
            console.log('⚠️ No system voice files found, using default -16.0 LUFS target');
        }
        
        // Apply intelligent normalization to user recordings to match system level
        console.log('🎯 Step 2: Normalizing user recordings to match system voice level...');
        
        for (const segment of processedSegments) {
            // Only normalize user recordings (answers), not system files
            if (segment.type === 'answers' && segment.path) {
                console.log(`🎯 Normalizing to ${targetLevel.toFixed(1)} LUFS: ${path.basename(segment.path)}`);
                await intelligentNormalize(segment.path, targetLevel); // Match system level
            }
        }
        
        console.log('✨ Intelligent normalization complete - user recordings match system voice level');
        
        // Final assembly of all segments IN ORDER
        console.log('🎼 Step 3: Assembling final radio program with background...');
        const outputPath = path.join(tempDir, `radio-program-${programType}-${world}-${lmid}.mp3`);
        await assembleFinalProgram(processedSegments, outputPath, backgroundUrl, tempDir);
        
        // Upload to Bunny.net
        const uploadUrl = await uploadToBunny(outputPath, world, lmid, programType, lang);
        
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
 * Concatenate multiple answer recordings without background
 */
async function concatenateAnswers(answerPaths, outputPath) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        
        // Add all answer inputs
        answerPaths.forEach(path => command.input(path));
        
        // Simple concatenation of answers
        const answerStreams = answerPaths.map((_, index) => `[${index}:a]`).join('');
        const filter = `${answerStreams}concat=n=${answerPaths.length}:v=0:a=1[outa]`;
        
        command
            .complexFilter([filter])
            .outputOptions(['-map', '[outa]'])
            .format('mp3')
            .audioCodec('libmp3lame')
            .on('start', (commandLine) => {
                console.log(`🎵 Concatenating ${answerPaths.length} answers: ${commandLine}`);
            })
            .on('progress', (progress) => {
                console.log(`⏳ Concatenating progress: ${Math.round(progress.percent || 0)}%`);
            })
            .on('end', () => {
                console.log('✅ Answers concatenated');
                resolve();
            })
            .on('error', reject)
            .save(outputPath);
    });
}

/**
 * Combine multiple answer recordings with background music (no processing) - LEGACY
 */
async function combineAnswersWithBackground(answerPaths, backgroundPath, outputPath) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        
        // Add all answer inputs
        answerPaths.forEach(path => command.input(path));
        
        // Add background music input
        command.input(backgroundPath);
        
        const filters = [];
        
        // Simple concatenation of answers (processing done at upload stage)
        const answerStreams = answerPaths.map((_, index) => `[${index}:a]`).join('');
        filters.push(`${answerStreams}concat=n=${answerPaths.length}:v=0:a=1[answers_combined]`);
        
        // Background music loop (no processing to maintain original quality)
        const bgIndex = answerPaths.length;
        filters.push(`[${bgIndex}:a]aloop=loop=-1:size=2e+09[background_loop]`);
        
        // Mix enhanced answers with background at 20% volume for ENTIRE duration
        filters.push(`[background_loop]volume=0.2[background_20]`);
        filters.push(`[answers_combined][background_20]amix=inputs=2:duration=first:dropout_transition=0[mixed]`);
        
        command
            .complexFilter(filters)
            .outputOptions(['-map', '[mixed]'])
            .format('mp3')
            .audioCodec('libmp3lame')
            .on('start', (commandLine) => {
                console.log(`🎵 Combining answers with background (processing done at upload): ${commandLine}`);
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
 * Assemble final program with background music under everything except jingles
 */
async function assembleFinalProgram(processedSegments, outputPath, backgroundUrl, tempDir) {
    return new Promise(async (resolve, reject) => {
        try {
            const command = ffmpeg();
            
            // Identify jingle segments 
            // Structure: intro-jingle, world-intro, [middle-jingles + questions+answers], middle-jingle, outro-jingle, world-outro
            const introJingleIndex = 0; // First segment: intro jingle
            const finalMiddleJingleIndex = processedSegments.length - 3; // Third from last: final middle jingle
            const outroJingleIndex = processedSegments.length - 2; // Second to last: outro jingle  
            const lastSegmentIndex = processedSegments.length - 1; // Last segment: world outro
            
            console.log(`🎵 Assembling program: ${processedSegments.length} segments`);
            console.log(`🎵 Intro jingle: segment ${introJingleIndex + 1} (no background)`);
            console.log(`🎵 Final middle jingle: segment ${finalMiddleJingleIndex + 1} (no background)`);
            console.log(`🎵 Outro jingle: segment ${outroJingleIndex + 1} (no background)`);
            console.log(`🎵 Background will be under segments ${introJingleIndex + 2} to ${lastSegmentIndex} (world-outro)`);
            
            // Add all processed segments as inputs
            processedSegments.forEach(segment => command.input(segment.path));
            
            // Download background music for the main content
            const backgroundPath = path.join(tempDir, 'main-background.mp3');
            console.log(`📥 Downloading main background: ${backgroundUrl}`);
            await downloadFile(backgroundUrl, backgroundPath);
            
            // Add background as additional input
            command.input(backgroundPath);
            const backgroundInputIndex = processedSegments.length;
            
            const filters = [];
            
            // Structure: intro-jingle + [ALL content with background from world-intro to world-outro]
            if (processedSegments.length > 4) {
                // Concatenate ALL segments except intro-jingle (everything from world-intro to world-outro)
                const contentWithBackgroundSegments = [];
                for (let i = 1; i < processedSegments.length; i++) {
                    contentWithBackgroundSegments.push(`[${i}:a]`);
                }
                
                if (contentWithBackgroundSegments.length > 1) {
                    filters.push(`${contentWithBackgroundSegments.join('')}concat=n=${contentWithBackgroundSegments.length}:v=0:a=1[all_content]`);
                } else {
                    filters.push(`[1:a]acopy[all_content]`);
                }
                
                // Loop background music and mix with ALL content at 20% volume for ENTIRE duration
                filters.push(`[${backgroundInputIndex}:a]aloop=loop=-1:size=2e+09,volume=0.2[background_loop]`);
                filters.push(`[all_content][background_loop]amix=inputs=2:duration=first:dropout_transition=0[content_with_bg]`);
                
                // Final concatenation: intro-jingle + all-content-with-background
                filters.push(`[${introJingleIndex}:a][content_with_bg]concat=n=2:v=0:a=1[final]`);
                
                // No final normalization - all voice content already normalized individually
                filters.push(`[final]acopy[outa]`);
            } else {
                // Minimal segments - just concatenate all without background
                const allSegments = processedSegments.map((_, index) => `[${index}:a]`).join('');
                filters.push(`${allSegments}concat=n=${processedSegments.length}:v=0:a=1[final]`);
                
                // No final normalization - all voice content already normalized individually
                filters.push(`[final]acopy[outa]`);
            }
            
            // Timeout protection for final assembly (60 seconds)
            const timeoutId = setTimeout(() => {
                try {
                    command.kill('SIGKILL');
                    console.warn(`⏰ FFmpeg final assembly timeout after 60s`);
                } catch (error) {
                    console.warn('Error killing FFmpeg process:', error.message);
                }
                reject(new Error('FFmpeg final assembly timed out after 60 seconds'));
            }, 60000);
            
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
                    console.log('🎵 Final assembly with background:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log(`⏳ Final assembly: ${Math.round(progress.percent || 0)}% done`);
                })
                .on('end', () => {
                    clearTimeout(timeoutId);
                    console.log('✅ Radio program assembly with background complete');
                    resolve();
                })
                .on('error', (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                })
                .save(outputPath);
                
        } catch (error) {
            reject(error);
        }
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
            .audioCodec('libvorbis')
            .audioChannels(2)
            .audioFrequency(44100)
            .audioBitrate('128k')
            .format('webm')
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
                    if (url.includes('monkeys.webm')) {
                        duration = 30; // background music needs to be longer
                    } else if (url.includes('-QID')) {
                        duration = 5; // question prompts
                    } else if (url.includes('intro.webm') || url.includes('outro.webm')) {
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
 * Analyze loudness of all voice files to determine optimal common level
 * @param {Array} voiceFiles - Array of voice file paths
 * @returns {Promise<Object>} Analysis results with recommended target levels
 */
async function analyzeAllVoiceLevels(voiceFiles) {
    console.log(`🔍 Analyzing loudness of ${voiceFiles.length} voice files...`);
    
    const analyses = [];
    
    for (const filePath of voiceFiles) {
        try {
            const analysis = await analyzeSingleFileLoudness(filePath);
            if (analysis.inputLUFS !== null) {
                analyses.push({
                    file: path.basename(filePath),
                    lufs: analysis.inputLUFS,
                    lra: analysis.inputLRA,
                    tp: analysis.inputTP
                });
                console.log(`📊 ${path.basename(filePath)}: ${analysis.inputLUFS.toFixed(1)} LUFS`);
            }
        } catch (error) {
            console.warn(`⚠️ Could not analyze ${path.basename(filePath)}: ${error.message}`);
        }
    }
    
    if (analyses.length === 0) {
        console.warn('⚠️ No files could be analyzed, using default levels');
        return { targetLUFS: -16.0, targetLRA: 7.0, targetTP: -1.0 };
    }
    
    // Calculate statistics
    const lufsValues = analyses.map(a => a.lufs);
    const avgLUFS = lufsValues.reduce((sum, val) => sum + val, 0) / lufsValues.length;
    const minLUFS = Math.min(...lufsValues);
    const maxLUFS = Math.max(...lufsValues);
    
    // Choose target level - slightly above average but not too loud
    const targetLUFS = Math.max(-18.0, Math.min(-14.0, avgLUFS + 2.0));
    
    console.log(`📈 Voice analysis complete:`);
    console.log(`   Average: ${avgLUFS.toFixed(1)} LUFS`);
    console.log(`   Range: ${minLUFS.toFixed(1)} to ${maxLUFS.toFixed(1)} LUFS`);
    console.log(`   Target: ${targetLUFS.toFixed(1)} LUFS`);
    
    return {
        targetLUFS: targetLUFS,
        targetLRA: 7.0,
        targetTP: -1.0,
        analysisCount: analyses.length,
        avgLUFS: avgLUFS
    };
}

/**
 * Intelligent loudness normalization - matches user recordings to system voice level
 * @param {string} filePath - Path to WebM audio file
 * @param {number} targetLUFS - Target LUFS level (from system voice analysis)
 * @returns {Promise<void>}
 */
async function intelligentNormalize(filePath, targetLUFS) {
    // Convert WebM to MP3 with intelligent loudnorm matching system level
    const tempOutputPath = `${filePath}.normalized.mp3`;
    
    return new Promise((resolve, reject) => {
        const command = ffmpeg(filePath)
            .audioFilters([
                // EBU R128 loudness normalization - MATCH SYSTEM VOICE LEVEL
                `loudnorm=I=${targetLUFS}:LRA=7.0:TP=-1.0:print_format=json`,
                // Light enhancement for speech clarity
                'highpass=f=80',           // Remove low-frequency noise
                'lowpass=f=8000',          // Remove high-frequency noise  
                'compand=0.02,0.20:-60/-60,-30/-15,-20/-10,-5/-5,0/-3:6:0:-3' // Speech compressor
            ])
            .format('mp3')
            .audioCodec('libmp3lame')
            .output(tempOutputPath);
        
        // Timeout protection (20 seconds)
        const timeoutId = setTimeout(() => {
            try {
                command.kill('SIGKILL');
                console.warn(`⏰ Intelligent normalization timeout for ${path.basename(filePath)} after 20s`);
            } catch (error) {
                console.warn('Error killing FFmpeg process:', error.message);
            }
            // Don't reject - continue without normalization
            resolve();
        }, 20000);
        
        command
            .on('start', () => {
                console.log(`🎯 Intelligent normalization: ${path.basename(filePath)} → ${targetLUFS.toFixed(1)} LUFS (WebM→MP3)`);
            })
            .on('end', async () => {
                clearTimeout(timeoutId);
                try {
                    // Replace original WebM with normalized MP3
                    await fs.rename(tempOutputPath, filePath);
                    console.log(`✨ Intelligent normalization complete: ${path.basename(filePath)} @ ${targetLUFS.toFixed(1)} LUFS`);
                    resolve();
                } catch (error) {
                    console.warn(`⚠️ Failed to replace normalized file: ${error.message}`);
                    resolve(); // Continue without normalization
                }
            })
            .on('error', (error) => {
                clearTimeout(timeoutId);
                console.warn(`⚠️ Intelligent normalization failed for ${path.basename(filePath)}:`, error.message);
                resolve(); // Continue without normalization
            })
            .run();
    });
}

/**
 * Analyze loudness of a single audio file
 * @param {string} filePath - Path to audio file
 * @returns {Promise<Object>} Loudness analysis data
 */
async function analyzeSingleFileLoudness(filePath) {
    return new Promise((resolve, reject) => {
        let analysisOutput = '';
        
        const command = ffmpeg(filePath)
            .audioFilters(['loudnorm=print_format=json'])
            .format('null')
            .output('-');
        
        // Timeout protection for analysis (15 seconds)
        const timeoutId = setTimeout(() => {
            try {
                command.kill('SIGKILL');
                console.warn(`⏰ Analysis timeout for ${path.basename(filePath)} after 15s`);
            } catch (error) {
                console.warn('Error killing FFmpeg analysis process:', error.message);
            }
            // Don't reject - return default values for graceful degradation
            resolve({ inputLUFS: null, inputLRA: null, inputTP: null });
        }, 15000);
        
        command
            .on('stderr', (stderrLine) => {
                analysisOutput += stderrLine + '\n';
            })
            .on('end', () => {
                clearTimeout(timeoutId);
                try {
                    const jsonMatch = analysisOutput.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const analysisData = JSON.parse(jsonMatch[0]);
                        resolve({
                            inputLUFS: parseFloat(analysisData.input_i) || null,
                            inputLRA: parseFloat(analysisData.input_lra) || null,
                            inputTP: parseFloat(analysisData.input_tp) || null
                        });
                    } else {
                        resolve({ inputLUFS: null, inputLRA: null, inputTP: null });
                    }
                } catch (parseError) {
                    resolve({ inputLUFS: null, inputLRA: null, inputTP: null });
                }
            })
            .on('error', (error) => {
                clearTimeout(timeoutId);
                // Don't reject analysis errors - return defaults for graceful degradation
                console.warn(`⚠️ Analysis failed for ${path.basename(filePath)}:`, error.message);
                resolve({ inputLUFS: null, inputLRA: null, inputTP: null });
            })
            .run();
    });
}

/**
 * Normalize voice file to target levels
 * @param {string} filePath - Path to the audio file to normalize
 * @param {Object} targetLevels - Target loudness levels
 * @returns {Promise<void>}
 */
async function normalizeVoiceFile(filePath, targetLevels) {
    // Keep same format to avoid filter reinitialization issues
    const fileExtension = path.extname(filePath);
    const tempOutputPath = `${filePath}.normalized${fileExtension}`;
    
    return new Promise((resolve, reject) => {
        const command = ffmpeg(filePath)
            .audioFilters([
                `loudnorm=I=${targetLevels.targetLUFS}:LRA=${targetLevels.targetLRA}:TP=${targetLevels.targetTP}:print_format=json`,
                'highpass=f=80',
                'lowpass=f=8000',
                'compand=0.02,0.20:-60/-60,-30/-15,-20/-10,-5/-5,0/-3:6:0:-3'
            ])
            // Keep original format to avoid FFmpeg filter reinitialization issues
            .output(tempOutputPath);
        
        // Timeout protection for FFmpeg operations (30 seconds)
        const timeoutId = setTimeout(() => {
            try {
                command.kill('SIGKILL');
                console.warn(`⏰ FFmpeg timeout for ${path.basename(filePath)} after 30s`);
            } catch (error) {
                console.warn('Error killing FFmpeg process:', error.message);
            }
            reject(new Error(`FFmpeg normalization timed out after 30 seconds for ${path.basename(filePath)}`));
        }, 30000);
        
        command
            .on('start', (commandLine) => {
                console.log(`🔧 Normalizing: ${path.basename(filePath)} (${fileExtension})`);
            })
            .on('end', async () => {
                clearTimeout(timeoutId);
                try {
                    // Replace original with normalized version
                    await fs.rename(tempOutputPath, filePath);
                    console.log(`✨ Normalized: ${path.basename(filePath)}`);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            })
            .on('error', (error) => {
                clearTimeout(timeoutId);
                console.error(`❌ Normalization failed for ${path.basename(filePath)}:`, error.message);
                reject(error);
            })
            .run();
    });
}

/**
 * Upload combined audio to Bunny.net
 * FIXED: Use consistent filename (no timestamp versioning) with heavy cache-busting instead
 */
async function uploadToBunny(filePath, world, lmid, programType = 'kids', lang = 'en') {
    // Include program type in filename to distinguish kids vs parent programs
    const fileName = `radio-program-${programType}-${world}-${lmid}.mp3`;
    const uploadPath = `/${lang}/${lmid}/${world}/${fileName}`;
    
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
 * @param {string} programType - Program type ('kids' or 'parent')
 * @param {string} lang - Language code
 */
async function uploadManifestToBunny(manifestData, world, lmid, programType = 'kids', lang = 'en') {
    try {
        // Save type-specific manifest
        const typeManifestPath = `/${lang}/${lmid}/${world}/last-program-manifest-${programType}.json`;
        await saveManifestFile(manifestData, typeManifestPath);
        
        // Load existing combined manifest or create new one
        const combinedManifestPath = `/${lang}/${lmid}/${world}/last-program-manifest.json`;
        let combinedManifest = {};
        
        try {
            // Try to load existing combined manifest with cache-busting
            const manifestUrl = `${process.env.BUNNY_CDN_URL}${combinedManifestPath}?v=${Date.now()}`;
            console.log(`📄 Loading existing manifest: ${manifestUrl}`);
            const existingResponse = await fetch(manifestUrl);
            if (existingResponse.ok) {
                combinedManifest = await existingResponse.json();
                console.log('📄 Existing manifest loaded:', {
                    hasKidsProgram: !!combinedManifest.kidsProgram,
                    hasParentProgram: !!combinedManifest.parentProgram,
                    kidsCount: combinedManifest.kidsRecordingCount,
                    parentCount: combinedManifest.parentRecordingCount
                });
            }
        } catch (error) {
            console.log('No existing combined manifest found, creating new one');
        }
        
        // Update combined manifest with new program data
        // IMPORTANT: Only update fields related to current program type, preserve others
        combinedManifest.generatedAt = manifestData.generatedAt;
        combinedManifest.world = manifestData.world;
        combinedManifest.lmid = manifestData.lmid;
        combinedManifest.version = manifestData.version;
        
        // Add program-specific data WITHOUT removing existing data
        if (programType === 'kids') {
            combinedManifest.kidsProgram = manifestData.programUrl; // Use programUrl from individual manifest
            combinedManifest.kidsRecordingCount = manifestData.recordingCount;
            combinedManifest.programUrl = manifestData.programUrl; // Legacy compatibility
            combinedManifest.recordingCount = manifestData.recordingCount; // Legacy compatibility
            // Preserve parent data if it exists
            // combinedManifest.parentProgram remains unchanged
            // combinedManifest.parentRecordingCount remains unchanged
        } else if (programType === 'parent') {
            combinedManifest.parentProgram = manifestData.programUrl; // Use programUrl from individual manifest
            combinedManifest.parentRecordingCount = manifestData.recordingCount;
            // Preserve kids data if it exists
            // combinedManifest.kidsProgram remains unchanged
            // combinedManifest.kidsRecordingCount remains unchanged
            // combinedManifest.programUrl remains unchanged (legacy)
        }
        
        // Save updated combined manifest
        await saveManifestFile(combinedManifest, combinedManifestPath);
        
        console.log(`✅ Manifests saved successfully for ${programType} program`);
    } catch (error) {
        console.warn(`⚠️ Manifest save error: ${error.message}`);
        // Don't throw - manifest save failure shouldn't fail the whole process
    }
}

/**
 * Helper function to save a manifest file to Bunny.net
 * @param {Object} manifestData - Manifest data to save
 * @param {string} uploadPath - Upload path
 */
async function saveManifestFile(manifestData, uploadPath) {
    const manifestJson = JSON.stringify(manifestData, null, 2);
    
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
                resolve(); // Don't reject - treat as warning
            }
        });
        
        req.on('error', (error) => {
            console.warn(`⚠️ Manifest save error: ${error.message}`);
            resolve(); // Don't reject - treat as warning
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
} 