/**
 * api/process-queue.js - Audio Generation Queue Processor
 * 
 * PURPOSE: Processes pending audio generation jobs from Supabase queue
 * PROCESSING: Contains the original FFmpeg audio processing logic from combine-audio.js
 * DATABASE: Updates audio_generation_jobs table with processing status and results
 * 
 * REQUEST FORMAT:
 * GET /api/process-queue (manual trigger)
 * 
 * QUEUE WORKFLOW:
 * 1. Find oldest pending job (FIFO)
 * 2. Update status to 'processing'
 * 3. Execute FFmpeg audio processing
 * 4. Upload result to Bunny.net
 * 5. Update status to 'completed' with results
 * 6. Handle errors by updating status to 'failed'
 * 
 * MEMORY OPTIMIZATION:
 * - Processes only ONE job at a time
 * - Automatic cleanup of temp files
 * - Memory-efficient FFmpeg operations
 * - Proper error handling and recovery
 */

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import https from 'https';
import http from 'http';
import { createWriteStream } from 'fs';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Global processing lock to prevent concurrent processing
let isProcessing = false;
let processingJobId = null;

export default async function handler(req, res) {
    // Secure CORS headers
    const { setCorsHeaders } = await import('../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['GET', 'POST', 'OPTIONS']);
    corsHandler(req);

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Allow GET and POST requests
    if (!['GET', 'POST'].includes(req.method)) {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if already processing (prevent race conditions)
    if (isProcessing) {
        console.log(`⏳ Queue processor already busy with job: ${processingJobId}`);
        return res.status(429).json({
            success: false,
            error: 'Queue processor is busy',
            message: `Already processing job: ${processingJobId}. Please try again later.`,
            retryAfter: 5
        });
    }

    // Check if specific job ID provided (immediate trigger)
            const { specificJobId, triggeredBy } = req.body || {};
    
    console.log(`📥 process-queue called with method: ${req.method}`);
    console.log(`📦 Request body:`, req.body);
    console.log(`🔍 Extracted - specificJobId: ${specificJobId}, triggeredBy: ${triggeredBy}`);
    
    if (specificJobId) {
        console.log(`🎯 Processing specific job: ${specificJobId} (triggered by: ${triggeredBy || 'unknown'})`);
    } else {
        console.log('🔄 Processing oldest pending job from queue');
    }

    try {
        console.log('🎵 Audio queue processor started');
        
        // Set processing lock
        isProcessing = true;
        processingJobId = specificJobId || 'unknown';

        // Import Supabase client
        const { getSupabaseClient } = await import('../utils/database-utils.js');
        const supabase = getSupabaseClient();

        let job = null;
        
        if (specificJobId) {
            // Process specific job (immediate trigger)
            const { data: specificJob, error: specificError } = await supabase
                .from('audio_generation_jobs')
                .select('*')
                .eq('id', specificJobId)
                .eq('status', 'pending')
                .single();
                
            if (specificError) {
                console.error(`❌ Failed to fetch specific job ${specificJobId}:`, specificError);
                return res.status(500).json({ 
                    error: 'Failed to fetch specific job',
                    details: specificError.message
                });
            }
            
            if (!specificJob) {
                console.log(`📭 Specific job ${specificJobId} not found or not pending`);
                return res.status(404).json({
                    success: false,
                    message: `Job ${specificJobId} not found or already processed`
                });
            }
            
            job = specificJob;
            
        } else {
            // Find oldest pending job (original cron behavior)
            const { data: jobs, error: fetchError } = await supabase
                .from('audio_generation_jobs')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(1);

            if (fetchError) {
                console.error('❌ Failed to fetch pending jobs:', fetchError);
                return res.status(500).json({ 
                    error: 'Failed to fetch pending jobs',
                    details: fetchError.message
                });
            }

            if (!jobs || jobs.length === 0) {
                console.log('📭 No pending jobs found');
                return res.status(200).json({
                    success: true,
                    message: 'No pending jobs to process',
                    processed: 0
                });
            }

            job = jobs[0];
        }
        console.log(`🎯 Processing job: ${job.id} | LMID: ${job.lmid} | World: ${job.world} | Type: ${job.type}`);

        // Atomically update job status to 'processing'
        const { error: updateError } = await supabase
            .from('audio_generation_jobs')
            .update({ 
                status: 'processing', 
                started_at: new Date().toISOString() 
            })
            .eq('id', job.id)
            .eq('status', 'pending'); // Only update if still pending (race condition protection)

        if (updateError) {
            console.error('❌ Failed to update job status:', updateError);
            return res.status(500).json({ 
                error: 'Failed to update job status',
                details: updateError.message
            });
        }

        const startTime = Date.now();

        try {
            // Process the audio job using FFmpeg (audioSegments from database)
            const result = await processAudioJob(job);
            
            const processingDuration = Date.now() - startTime;
            console.log(`✅ Job processed successfully in ${processingDuration}ms: ${result.programUrl}`);

            // Update job status to completed with results (SIMPLIFIED)
            const { error: completeError } = await supabase
                .from('audio_generation_jobs')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    program_url: result.programUrl,
                    file_count: result.fileCount,
                    processing_duration_ms: processingDuration
                })
                .eq('id', job.id);

            if (completeError) {
                console.error('❌ Failed to update job completion:', completeError);
                // Job was processed but status update failed - log for manual recovery
            }

            return res.status(200).json({
                success: true,
                message: 'Job processed successfully',
                jobId: job.id,
                programUrl: result.programUrl,
                processingDuration: processingDuration,
                processed: 1
            });

        } catch (processingError) {
            console.error('❌ Job processing failed:', processingError);
            
            const processingDuration = Date.now() - startTime;

            // Update job status to failed
            const { error: failError } = await supabase
                .from('audio_generation_jobs')
                .update({
                    status: 'failed',
                    completed_at: new Date().toISOString(),
                    error_message: processingError.message,
                    processing_duration_ms: processingDuration
                })
                .eq('id', job.id);

            if (failError) {
                console.error('❌ Failed to update job failure status:', failError);
            }

            return res.status(500).json({
                success: false,
                message: 'Job processing failed',
                jobId: job.id,
                error: processingError.message,
                processingDuration: processingDuration,
                processed: 0
            });
        }

    } catch (error) {
        console.error('❌ Queue processor error:', error);
        
        // Release processing lock on error
        isProcessing = false;
        processingJobId = null;
        
        return res.status(500).json({ 
            error: 'Queue processor failed',
            details: error.message 
        });
    } finally {
        // Always release processing lock
        isProcessing = false;
        processingJobId = null;
        console.log('🔓 Released processing lock');
    }
}

/**
 * Process audio job using FFmpeg (original combine-audio logic)
 */
async function processAudioJob(job) {
    const { lmid, world, lang, type, audio_segments: audioSegments } = job;
    
    console.log(`🎵 Starting FFmpeg processing for ${lang}/${world}/${lmid} (${type} program)`);
    console.log(`📊 Processing ${audioSegments.length} audio segments`);

    // Set FFmpeg path
    const ffmpegPath = ffmpegInstaller.path;
    ffmpeg.setFfmpegPath(ffmpegPath);

    // Create temp directory
    const tempDir = path.join(os.tmpdir(), `radio-${world}-${lmid}-${Date.now()}`);
    console.log('📁 Creating temp directory:', tempDir);
    await fs.mkdir(tempDir, { recursive: true });

    try {
        // Process each segment IN ORDER (critical for maintaining DOM sequence)
        const processedSegments = [];
        
        for (let i = 0; i < audioSegments.length; i++) {
            const segment = audioSegments[i];
            console.log(`🎵 Processing segment ${i + 1}/${audioSegments.length}:`, segment.type);
            
            if (segment.type === 'single' || segment.type === 'recording') {
                // Single audio file (intro, outro, questions, recordings)
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

        // Extract background URL from segments (use first background found)
        let backgroundUrl = null;
        for (const segment of audioSegments) {
            if (segment.type === 'combine_with_background' && segment.backgroundUrl) {
                backgroundUrl = segment.backgroundUrl;
                break;
            }
        }

        // Final assembly of all segments IN ORDER
        console.log('🎼 Final assembly: Assembling radio program with background...');
        const outputPath = path.join(tempDir, `radio-program-${type}-${world}-${lmid}.mp3`);
        await assembleFinalProgram(processedSegments, outputPath, backgroundUrl, tempDir);

        // Upload to Bunny.net
        const uploadUrl = await uploadToBunny(outputPath, world, lmid, type, lang);

        // Count unique recording files for manifest
        let recordingCount = 0;
        const uniqueRecordings = new Set();
        
        for (const segment of audioSegments) {
            if (segment.type === 'combine_with_background' && segment.answerUrls) {
                for (const url of segment.answerUrls) {
                    const filename = url.split('/').pop().split('?')[0]; // Extract filename
                    const pattern = type === 'kids'
                        ? new RegExp(`^kids-world_${world}-lmid_${lmid}-question_\\d+-tm_\\d+\\.(webm|mp3)$`)
                        : new RegExp(`^parent_[^-]+-world_${world}-lmid_${lmid}-question_\\d+-tm_\\d+\\.(webm|mp3)$`);
                    
                    if (pattern.test(filename)) {
                        uniqueRecordings.add(filename);
                    }
                }
            }
        }
        
        recordingCount = uniqueRecordings.size;
        console.log(`🔍 MANIFEST: Unique recording files matching pattern: ${recordingCount}`);

        // SIMPLIFIED: No manifest files, no lmids updates - just save program URL and file_count in job record

        // Cleanup temp files
        await cleanupTempDirectory(tempDir);

        console.log('✅ Audio job processing completed successfully');
        
        return {
            programUrl: uploadUrl,
            fileCount: recordingCount
        };

    } catch (error) {
        // Cleanup temp files on error
        await cleanupTempDirectory(tempDir);
        throw error;
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
                console.log(`🎵 Concatenating ${answerPaths.length} answers`);
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
 * Assemble final program with background music under everything except jingles
 */
async function assembleFinalProgram(processedSegments, outputPath, backgroundUrl, tempDir) {
    return new Promise(async (resolve, reject) => {
        try {
            const command = ffmpeg();
            
            console.log(`🎵 Assembling program: ${processedSegments.length} segments`);
            
            // Add all processed segments as inputs
            processedSegments.forEach(segment => command.input(segment.path));
            
            // Download background music if available
            let backgroundPath = null;
            if (backgroundUrl) {
                backgroundPath = path.join(tempDir, 'main-background.mp3');
                console.log(`📥 Downloading main background: ${backgroundUrl}`);
                await downloadFile(backgroundUrl, backgroundPath);
                command.input(backgroundPath);
            }
            
            const filters = [];
            
            // Simple concatenation of all segments
            const allSegments = processedSegments.map((_, index) => `[${index}:a]`).join('');
            filters.push(`${allSegments}concat=n=${processedSegments.length}:v=0:a=1[main_audio]`);
            
            if (backgroundPath) {
                const backgroundInputIndex = processedSegments.length;
                // Mix with background at 20% volume
                filters.push(`[${backgroundInputIndex}:a]aloop=loop=-1:size=2e+09,volume=0.2[background_loop]`);
                filters.push(`[main_audio][background_loop]amix=inputs=2:duration=first:dropout_transition=0[final]`);
                filters.push(`[final]acopy[outa]`);
            } else {
                // No background - just use main audio
                filters.push(`[main_audio]acopy[outa]`);
            }
            
            command
                .complexFilter(filters)
                .outputOptions([
                    '-map', '[outa]',
                    '-ar', '44100',
                    '-ac', '2',
                    '-b:a', '128k'
                ])
                .format('mp3')
                .audioCodec('libmp3lame')
                .on('start', () => {
                    console.log('🎵 Final assembly with background');
                })
                .on('end', () => {
                    console.log('✅ Radio program assembly complete');
                    resolve();
                })
                .on('error', reject)
                .save(outputPath);
                
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Generate a silent MP3 placeholder for missing system files
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
                console.log(`🔧 Generating ${duration}s silent placeholder`);
            })
            .on('end', () => {
                console.log(`✅ Generated silent placeholder`);
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
 * Upload combined audio to Bunny.net
 */
async function uploadToBunny(filePath, world, lmid, programType = 'kids', lang = 'en') {
    // Include program type in filename to distinguish kids vs parent programs
    const fileName = `radio-program-${programType}-${world}-${lmid}.mp3`;
    const uploadPath = `/${lang}/${lmid}/${world}/${fileName}`;
    
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
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Last-Modified': new Date().toUTCString()
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 201) {
                const downloadUrl = `${process.env.BUNNY_CDN_URL}${uploadPath}`;
                console.log(`✅ Upload successful: ${downloadUrl}`);
                
                // Ensure URL has proper protocol and add cache-busting parameter
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
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up temp directory: ${tempDir}`);
    } catch (error) {
        console.warn(`⚠️ Failed to cleanup temp directory: ${error.message}`);
    }
}

// SIMPLIFIED: No manifest files or lmids updates needed - all data stored in audio_generation_jobs table
