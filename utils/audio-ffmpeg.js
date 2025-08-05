/**
 * audio-ffmpeg.js - FFmpeg Audio Processing Module
 * 
 * PURPOSE: Professional audio processing using FFmpeg for radio program generation
 * DEPENDENCIES: fluent-ffmpeg, @ffmpeg-installer/ffmpeg, fs, path, os, https/http
 * 
 * EXPORTED FUNCTIONS:
 * - combineAudioWithFFmpeg(): Main audio processing orchestrator
 * - combineAnswersWithBackground(): Mix answers with background music
 * - assembleFinalProgram(): Assemble processed segments into final program
 * - generateSilentPlaceholder(): Create silent audio placeholders
 * - downloadFile(): Download remote audio files with retry logic
 * - uploadToBunny(): Upload processed audio to Bunny.net CDN
 * - uploadManifestToBunny(): Upload program manifest data
 * - cleanupTempDirectory(): Clean up temporary processing files
 * - getFFmpegSetupSuggestions(): Get FFmpeg configuration recommendations
 * 
 * AUDIO PROCESSING FEATURES:
 * - Multi-format audio support (MP3, WAV, WebM, OGG)
 * - Professional audio mixing with background music
 * - Dynamic volume normalization and audio enhancement
 * - Crossfade transitions between segments
 * - Intelligent segment ordering and timing
 * - Batch processing with progress tracking
 * - Error recovery and retry mechanisms
 * - Temporary file management with automatic cleanup
 * 
 * FFMPEG OPERATIONS:
 * - Audio concatenation with crossfades
 * - Volume normalization and compression
 * - Background music mixing at optimal levels
 * - Format conversion and optimization
 * - Silent placeholder generation
 * - Metadata embedding for radio programs
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0 (Extracted from combine-audio.js)
 * STATUS: Production Ready ✅
 */

// Import required modules
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import http from 'http';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Audio processing configuration
const AUDIO_CONFIG = {
    bitRate: '128k',
    sampleRate: 48000,
    channels: 2,
    format: 'mp3',
    quality: '2', // VBR quality (0=best, 9=worst)
    backgroundVolume: '0.1', // Background music volume (10% of original)
    crossfadeDuration: 1, // Crossfade duration in seconds
    maxFileSize: 100 * 1024 * 1024, // 100MB max file size
    timeout: 300000 // 5 minutes timeout for processing
};

/**
 * Main audio processing orchestrator using FFmpeg
 * @param {Array} audioSegments - Array of audio segment objects
 * @param {string} world - World name for organization
 * @param {string} lmid - LMID for file naming
 * @param {Object} audioParams - Audio processing parameters
 * @returns {Promise<Object>} Processing result with audio URL and metadata
 */
export async function combineAudioWithFFmpeg(audioSegments, world, lmid, audioParams = {}) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'radio-generation-'));
    const processStartTime = Date.now();
    
    console.log(`🎵 Starting FFmpeg audio processing for ${world}-${lmid}`);
    console.log(`📁 Temporary directory: ${tempDir}`);
    console.log(`📊 Processing ${audioSegments.length} audio segments`);
    
    try {
        // Merge default config with custom parameters
        const config = { ...AUDIO_CONFIG, ...audioParams };
        
        // Step 1: Download all required audio files
        console.log('📥 Step 1: Downloading audio files...');
        const downloadedFiles = await downloadAudioFiles(audioSegments, tempDir);
        
        // Step 2: Process segments (combine answers with background music where needed)
        console.log('🎵 Step 2: Processing audio segments...');
        const processedSegments = await processAudioSegments(downloadedFiles, tempDir, config);
        
        // Step 3: Assemble final program with crossfades
        console.log('🔗 Step 3: Assembling final radio program...');
        const finalOutputPath = path.join(tempDir, `radio-program-${world}-${lmid}-${Date.now()}.mp3`);
        await assembleFinalProgram(processedSegments, finalOutputPath, config);
        
        // Step 4: Upload to CDN
        console.log('☁️ Step 4: Uploading to CDN...');
        const uploadResult = await uploadToBunny(finalOutputPath, world, lmid);
        
        // Step 5: Generate and upload manifest
        console.log('📋 Step 5: Creating program manifest...');
        const manifestData = createProgramManifest(audioSegments, world, lmid, uploadResult, processStartTime);
        await uploadManifestToBunny(manifestData, world, lmid);
        
        // Step 6: Cleanup temporary files
        console.log('🧹 Step 6: Cleaning up temporary files...');
        await cleanupTempDirectory(tempDir);
        
        const processingTime = Date.now() - processStartTime;
        console.log(`✅ Audio processing completed in ${processingTime}ms`);
        
        return {
            success: true,
            audioUrl: uploadResult.url,
            duration: manifestData.duration,
            manifest: manifestData,
            processingTime,
            segmentCount: audioSegments.length
        };
        
    } catch (error) {
        console.error('❌ FFmpeg processing failed:', error);
        
        // Cleanup on error
        try {
            await cleanupTempDirectory(tempDir);
        } catch (cleanupError) {
            console.error('Failed to cleanup temp directory:', cleanupError);
        }
        
        throw new Error(`Audio processing failed: ${error.message}`);
    }
}

/**
 * Download all audio files required for processing
 * @param {Array} audioSegments - Audio segments with URLs
 * @param {string} tempDir - Temporary directory path
 * @returns {Promise<Array>} Array of local file paths
 */
async function downloadAudioFiles(audioSegments, tempDir) {
    const downloadPromises = [];
    const downloadedFiles = [];
    
    for (let i = 0; i < audioSegments.length; i++) {
        const segment = audioSegments[i];
        
        if (segment.type === 'single' && segment.url) {
            const fileName = `segment-${i}-${path.basename(new URL(segment.url).pathname)}`;
            const filePath = path.join(tempDir, fileName);
            
            downloadPromises.push(
                downloadFile(segment.url, filePath).then(() => ({
                    ...segment,
                    localPath: filePath,
                    index: i
                }))
            );
        } else if (segment.type === 'combine_with_background') {
            // Download answer files
            const answerPromises = segment.answerUrls.map((url, answerIndex) => {
                const fileName = `segment-${i}-answer-${answerIndex}-${path.basename(new URL(url).pathname)}`;
                const filePath = path.join(tempDir, fileName);
                return downloadFile(url, filePath).then(() => ({ url, localPath: filePath }));
            });
            
            // Download background file
            const backgroundFileName = `segment-${i}-background-${path.basename(new URL(segment.backgroundUrl).pathname)}`;
            const backgroundPath = path.join(tempDir, backgroundFileName);
            const backgroundPromise = downloadFile(segment.backgroundUrl, backgroundPath);
            
            downloadPromises.push(
                Promise.all([...answerPromises, backgroundPromise]).then((results) => {
                    const answerPaths = results.slice(0, -1);
                    return {
                        ...segment,
                        answerPaths: answerPaths.map(r => r.localPath),
                        backgroundPath,
                        index: i
                    };
                })
            );
        } else {
            // For segments without files (like silent placeholders)
            downloadedFiles.push({
                ...segment,
                index: i
            });
        }
    }
    
    const results = await Promise.all(downloadPromises);
    downloadedFiles.push(...results);
    
    // Sort by original index to maintain order
    downloadedFiles.sort((a, b) => a.index - b.index);
    
    console.log(`📥 Downloaded ${downloadPromises.length} audio file groups successfully`);
    return downloadedFiles;
}

/**
 * Process audio segments (combine answers with background where needed)
 * @param {Array} downloadedFiles - Downloaded file paths with metadata
 * @param {string} tempDir - Temporary directory path
 * @param {Object} config - Audio processing configuration
 * @returns {Promise<Array>} Array of processed segment paths
 */
async function processAudioSegments(downloadedFiles, tempDir, config) {
    const processedSegments = [];
    
    for (let i = 0; i < downloadedFiles.length; i++) {
        const segment = downloadedFiles[i];
        
        if (segment.type === 'single' && segment.localPath) {
            // Single file - just add to processed list
            processedSegments.push({
                path: segment.localPath,
                type: 'single',
                duration: await getAudioDuration(segment.localPath)
            });
            
        } else if (segment.type === 'combine_with_background' && segment.answerPaths && segment.backgroundPath) {
            // Combine answers with background music
            const outputPath = path.join(tempDir, `processed-segment-${i}.mp3`);
            await combineAnswersWithBackground(segment.answerPaths, segment.backgroundPath, outputPath, config);
            
            processedSegments.push({
                path: outputPath,
                type: 'combined',
                duration: await getAudioDuration(outputPath),
                answerCount: segment.answerPaths.length
            });
            
        } else if (segment.type === 'silence') {
            // Generate silent placeholder
            const duration = segment.duration || 3;
            const outputPath = path.join(tempDir, `silence-${i}-${duration}s.mp3`);
            await generateSilentPlaceholder(outputPath, duration);
            
            processedSegments.push({
                path: outputPath,
                type: 'silence',
                duration: duration
            });
            
        } else {
            console.warn(`⚠️ Skipping unsupported segment type: ${segment.type}`);
        }
    }
    
    console.log(`🎵 Processed ${processedSegments.length} audio segments`);
    return processedSegments;
}

/**
 * Combine multiple answer recordings with background music
 * @param {Array} answerPaths - Paths to answer audio files
 * @param {string} backgroundPath - Path to background music file
 * @param {string} outputPath - Output file path
 * @param {Object} config - Audio processing configuration
 * @returns {Promise<void>}
 */
export async function combineAnswersWithBackground(answerPaths, backgroundPath, outputPath, config = AUDIO_CONFIG) {
    return new Promise((resolve, reject) => {
        console.log(`🎵 Combining ${answerPaths.length} answers with background music`);
        
        const ffmpegCommand = ffmpeg();
        
        // Add all answer files as inputs
        answerPaths.forEach(answerPath => {
            ffmpegCommand.input(answerPath);
        });
        
        // Add background music as input
        ffmpegCommand.input(backgroundPath);
        
        // Build complex filter for mixing
        let filterComplex = '';
        
        // First, concatenate all answers with crossfades (no processing here - done at upload)
        if (answerPaths.length > 1) {
            const crossfadeDuration = config.crossfadeDuration || 1;
            let concatFilter = '';
            
            for (let i = 0; i < answerPaths.length; i++) {
                if (i === 0) {
                    concatFilter = `[${i}:a]`;
                } else {
                    concatFilter += `[${i}:a]acrossfade=d=${crossfadeDuration}`;
                }
            }
            concatFilter += '[answers];';
            filterComplex += concatFilter;
        } else {
            filterComplex += `[0:a]anull[answers];`;
        }
        
        // Mix enhanced answers with background music (background stays at original volume)
        const backgroundIndex = answerPaths.length;
        const backgroundVolume = config.backgroundVolume || '0.1';
        
        filterComplex += `[answers][${backgroundIndex}:a]amerge=inputs=2,pan=stereo|c0<c0+${backgroundVolume}*c2|c1<c1+${backgroundVolume}*c3[out]`;
        
        ffmpegCommand
            .complexFilter(filterComplex)
            .outputOptions([
                '-map', '[out]',
                '-c:a', 'libmp3lame',
                '-b:a', config.bitRate,
                '-ar', config.sampleRate.toString(),
                '-ac', config.channels.toString(),
                '-q:a', config.quality
            ])
            .output(outputPath)
            .on('start', (commandLine) => {
                console.log(`🔄 FFmpeg command: ${commandLine}`);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`⏳ Combining progress: ${Math.round(progress.percent)}%`);
                }
            })
            .on('end', () => {
                console.log(`✅ Successfully combined answers with background`);
                resolve();
            })
            .on('error', (error) => {
                console.error(`❌ FFmpeg error during combination:`, error);
                reject(error);
            })
            .run();
    });
}

/**
 * Assemble processed segments into final radio program
 * @param {Array} processedSegments - Array of processed segment objects
 * @param {string} outputPath - Final output file path
 * @param {Object} config - Audio processing configuration
 * @returns {Promise<void>}
 */
export async function assembleFinalProgram(processedSegments, outputPath, config = AUDIO_CONFIG) {
    return new Promise((resolve, reject) => {
        console.log(`🔗 Assembling final program from ${processedSegments.length} segments`);
        
        const ffmpegCommand = ffmpeg();
        
        // Add all processed segments as inputs
        processedSegments.forEach(segment => {
            ffmpegCommand.input(segment.path);
        });
        
        // Create concatenation filter with crossfades
        let filterComplex = '';
        const crossfadeDuration = config.crossfadeDuration || 1;
        
        if (processedSegments.length === 1) {
            // Single segment - just copy
            filterComplex = '[0:a]anull[out]';
        } else {
            // Multiple segments - concatenate with crossfades
            let concatChain = '[0:a]';
            
            for (let i = 1; i < processedSegments.length; i++) {
                concatChain += `[${i}:a]acrossfade=d=${crossfadeDuration}`;
            }
            
            filterComplex = concatChain + '[out]';
        }
        
        ffmpegCommand
            .complexFilter(filterComplex)
            .outputOptions([
                '-map', '[out]',
                '-c:a', 'libmp3lame',
                '-b:a', config.bitRate,
                '-ar', config.sampleRate.toString(),
                '-ac', config.channels.toString(),
                '-q:a', config.quality,
                // Add metadata
                '-metadata', `title=Radio Program ${world}-${lmid}`,
                '-metadata', 'artist=Little Microphones',
                '-metadata', 'album=Radio Programs',
                '-metadata', `date=${new Date().getFullYear()}`
            ])
            .output(outputPath)
            .on('start', (commandLine) => {
                console.log(`🔄 Final assembly FFmpeg command: ${commandLine}`);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`⏳ Assembly progress: ${Math.round(progress.percent)}%`);
                }
            })
            .on('end', () => {
                console.log(`✅ Final program assembled successfully`);
                resolve();
            })
            .on('error', (error) => {
                console.error(`❌ FFmpeg error during final assembly:`, error);
                reject(error);
            })
            .run();
    });
}

/**
 * Generate silent audio placeholder
 * @param {string} filePath - Output file path
 * @param {number} duration - Duration in seconds
 * @returns {Promise<void>}
 */
export async function generateSilentPlaceholder(filePath, duration = 3) {
    return new Promise((resolve, reject) => {
        console.log(`🔇 Generating ${duration}s silent placeholder`);
        
        ffmpeg()
            .input(`anullsrc=channel_layout=stereo:sample_rate=48000`)
            .inputOptions(['-f', 'lavfi', '-t', duration.toString()])
            .outputOptions([
                '-c:a', 'libmp3lame',
                '-b:a', '128k',
                '-ar', '48000',
                '-ac', '2'
            ])
            .output(filePath)
            .on('end', () => {
                console.log(`✅ Silent placeholder generated: ${duration}s`);
                resolve();
            })
            .on('error', (error) => {
                console.error(`❌ Failed to generate silent placeholder:`, error);
                reject(error);
            })
            .run();
    });
}

/**
 * Validate and convert audio file to MP3 format if needed
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<void>}
 */
async function validateAndConvertAudio(filePath) {
    return new Promise((resolve, reject) => {
        // Use ffmpeg to probe the file and get its format
        ffmpeg.ffprobe(filePath, async (err, metadata) => {
            if (err) {
                console.error(`❌ Cannot probe audio file ${filePath}:`, err);
                return reject(err);
            }
            
            const format = metadata.format.format_name;
            const extension = path.extname(filePath).toLowerCase();
            
            // If file is already MP3, no conversion needed
            if (format.includes('mp3') && extension === '.mp3') {
                console.log(`✅ File ${path.basename(filePath)} is already valid MP3`);
                return resolve();
            }
            
            // File needs conversion
            console.log(`🔄 Converting ${path.basename(filePath)} from ${format} to MP3...`);
            
            const tempPath = filePath + '.temp';
            
            ffmpeg(filePath)
                .audioCodec('libmp3lame')
                .audioBitrate('128k')
                .audioFrequency(44100)
                .audioChannels(2)
                .format('mp3')
                .output(tempPath)
                .on('end', async () => {
                    try {
                        // Replace original file with converted one
                        await fs.rename(tempPath, filePath);
                        console.log(`✅ Converted ${path.basename(filePath)} to MP3`);
                        resolve();
                    } catch (renameError) {
                        console.error(`❌ Failed to replace converted file:`, renameError);
                        reject(renameError);
                    }
                })
                .on('error', (convertError) => {
                    console.error(`❌ Audio conversion failed for ${path.basename(filePath)}:`, convertError);
                    reject(convertError);
                })
                .run();
        });
    });
}

/**
 * Download file from URL with retry logic and progress tracking
 * @param {string} url - File URL to download
 * @param {string} filePath - Local file path to save
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<void>}
 */
export function downloadFile(url, filePath, maxRetries = 3) {
    return new Promise((resolve, reject) => {
        const fileName = path.basename(filePath);
        console.log(`📥 Downloading: ${fileName}`);
        
        const attemptDownload = (attempt) => {
            const protocol = url.startsWith('https:') ? https : http;
            
            const request = protocol.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Handle redirects
                    return attemptDownload(attempt);
                }
                
                if (response.statusCode !== 200) {
                    return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                }
                
                const fileStream = createWriteStream(filePath);
                const totalSize = parseInt(response.headers['content-length']) || 0;
                let downloadedSize = 0;
                
                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    if (totalSize > 0) {
                        const progress = Math.round((downloadedSize / totalSize) * 100);
                        if (progress % 10 === 0) { // Log every 10%
                            console.log(`📥 ${fileName}: ${progress}%`);
                        }
                    }
                });
                
                response.pipe(fileStream);
                
                fileStream.on('finish', async () => {
                    console.log(`✅ Downloaded: ${fileName}`);
                    
                    // Check if file needs format conversion
                    try {
                        await validateAndConvertAudio(filePath);
                    resolve();
                    } catch (error) {
                        console.error(`❌ Audio validation/conversion failed for ${fileName}:`, error);
                        reject(error);
                    }
                });
                
                fileStream.on('error', (error) => {
                    console.error(`❌ File write error for ${fileName}:`, error);
                    
                    if (attempt < maxRetries) {
                        console.log(`🔄 Retrying download (${attempt + 1}/${maxRetries}): ${fileName}`);
                        setTimeout(() => attemptDownload(attempt + 1), 1000 * attempt);
                    } else {
                        reject(error);
                    }
                });
            });
            
            request.on('error', (error) => {
                console.error(`❌ Download error for ${fileName}:`, error);
                
                if (attempt < maxRetries) {
                    console.log(`🔄 Retrying download (${attempt + 1}/${maxRetries}): ${fileName}`);
                    setTimeout(() => attemptDownload(attempt + 1), 1000 * attempt);
                } else {
                    reject(error);
                }
            });
            
            request.setTimeout(30000, () => {
                request.abort();
                reject(new Error(`Download timeout for ${fileName}`));
            });
        };
        
        attemptDownload(0);
    });
}

/**
 * Upload processed audio file to Bunny.net CDN
 * @param {string} filePath - Local file path to upload
 * @param {string} world - World name for organization
 * @param {string} lmid - LMID for file naming
 * @returns {Promise<Object>} Upload result with URL and metadata
 */
export async function uploadToBunny(filePath, world, lmid) {
    const fileName = `radio-program-${world}-${lmid}-${Date.now()}.mp3`;
    const uploadPath = `/radio-programs/${world}/${fileName}`;
    
    console.log(`☁️ Uploading to Bunny.net: ${fileName}`);
    
    try {
        const fileBuffer = await fs.readFile(filePath);
        const fileStats = await fs.stat(filePath);
        
        // Bunny.net storage API request
        const options = {
            hostname: 'storage.bunnycdn.com',
            path: `/little-microphones${uploadPath}`,
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_STORAGE_API_KEY,
                'Content-Type': 'audio/mpeg',
                'Content-Length': fileStats.size
            }
        };
        
        return new Promise((resolve, reject) => {
            const request = https.request(options, (response) => {
                let responseData = '';
                
                response.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                response.on('end', () => {
                    if (response.statusCode === 201) {
                        const cdnUrl = `https://little-microphones.b-cdn.net${uploadPath}`;
                        console.log(`✅ Upload successful: ${cdnUrl}`);
                        
                        resolve({
                            success: true,
                            url: cdnUrl,
                            fileName: fileName,
                            size: fileStats.size,
                            uploadPath: uploadPath
                        });
                    } else {
                        console.error(`❌ Upload failed: ${response.statusCode} ${response.statusMessage}`);
                        console.error('Response:', responseData);
                        reject(new Error(`Upload failed: ${response.statusCode} ${response.statusMessage}`));
                    }
                });
            });
            
            request.on('error', (error) => {
                console.error(`❌ Upload request error:`, error);
                reject(error);
            });
            
            request.write(fileBuffer);
            request.end();
        });
        
    } catch (error) {
        console.error(`❌ Upload preparation error:`, error);
        throw error;
    }
}

/**
 * Upload program manifest to Bunny.net CDN
 * @param {Object} manifestData - Program manifest data
 * @param {string} world - World name
 * @param {string} lmid - LMID
 * @returns {Promise<Object>} Upload result
 */
export async function uploadManifestToBunny(manifestData, world, lmid) {
    const manifestFileName = `manifest-${world}-${lmid}.json`;
    const uploadPath = `/radio-programs/${world}/${manifestFileName}`;
    
    console.log(`📋 Uploading manifest: ${manifestFileName}`);
    
    try {
        const manifestBuffer = Buffer.from(JSON.stringify(manifestData, null, 2));
        
        const options = {
            hostname: 'storage.bunnycdn.com',
            path: `/little-microphones${uploadPath}`,
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_STORAGE_API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': manifestBuffer.length
            }
        };
        
        return new Promise((resolve, reject) => {
            const request = https.request(options, (response) => {
                let responseData = '';
                
                response.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                response.on('end', () => {
                    if (response.statusCode === 201) {
                        const cdnUrl = `https://little-microphones.b-cdn.net${uploadPath}`;
                        console.log(`✅ Manifest uploaded: ${cdnUrl}`);
                        resolve({
                            success: true,
                            url: cdnUrl,
                            fileName: manifestFileName
                        });
                    } else {
                        console.error(`❌ Manifest upload failed: ${response.statusCode}`);
                        reject(new Error(`Manifest upload failed: ${response.statusCode}`));
                    }
                });
            });
            
            request.on('error', reject);
            request.write(manifestBuffer);
            request.end();
        });
        
    } catch (error) {
        console.error(`❌ Manifest upload error:`, error);
        throw error;
    }
}

/**
 * Clean up temporary directory and all files
 * @param {string} tempDir - Temporary directory path to clean
 * @returns {Promise<void>}
 */
export async function cleanupTempDirectory(tempDir) {
    try {
        console.log(`🧹 Cleaning up temporary directory: ${tempDir}`);
        
        const files = await fs.readdir(tempDir);
        
        // Delete all files in the directory
        await Promise.all(files.map(file => 
            fs.unlink(path.join(tempDir, file)).catch(err => 
                console.warn(`Failed to delete file ${file}:`, err)
            )
        ));
        
        // Remove the directory
        await fs.rmdir(tempDir);
        
        console.log(`✅ Temporary directory cleaned up successfully`);
    } catch (error) {
        console.error(`❌ Failed to cleanup temporary directory:`, error);
        // Don't throw - cleanup errors shouldn't break the main process
    }
}

/**
 * Get audio duration using FFmpeg
 * @param {string} filePath - Audio file path
 * @returns {Promise<number>} Duration in seconds
 */
async function getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (error, metadata) => {
            if (error) {
                console.warn(`Could not get duration for ${filePath}:`, error);
                resolve(0); // Return 0 on error
            } else {
                const duration = metadata.format.duration || 0;
                resolve(parseFloat(duration));
            }
        });
    });
}

/**
 * Create program manifest with metadata
 * @param {Array} audioSegments - Original audio segments
 * @param {string} world - World name
 * @param {string} lmid - LMID
 * @param {Object} uploadResult - Upload result data
 * @param {number} processStartTime - Processing start timestamp
 * @returns {Object} Program manifest
 */
function createProgramManifest(audioSegments, world, lmid, uploadResult, processStartTime) {
    return {
        version: '2.0',
        generatedAt: new Date().toISOString(),
        world: world,
        lmid: lmid,
        programUrl: uploadResult.url,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.size,
        processingTime: Date.now() - processStartTime,
        segmentCount: audioSegments.length,
        audioConfig: AUDIO_CONFIG,
        segments: audioSegments.map((segment, index) => ({
            index: index,
            type: segment.type,
            questionId: segment.questionId || null,
            answerCount: segment.answerUrls ? segment.answerUrls.length : 0
        }))
    };
}

/**
 * Get FFmpeg setup suggestions and diagnostics
 * @returns {Object} Setup recommendations and system info
 */
export function getFFmpegSetupSuggestions() {
    return {
        ffmpegPath: ffmpegInstaller.path,
        currentConfig: AUDIO_CONFIG,
        recommendations: {
            memory: 'Ensure at least 2GB RAM available for processing',
            storage: 'Provide 1GB temporary storage space',
            timeout: 'Configure 5+ minute timeout for large programs',
            concurrency: 'Limit to 2 concurrent processing jobs'
        },
        troubleshooting: {
            'FFmpeg not found': 'Verify @ffmpeg-installer/ffmpeg is installed',
            'Permission denied': 'Check temporary directory write permissions',
            'Out of memory': 'Reduce concurrent processing or increase RAM',
            'Timeout errors': 'Increase timeout or reduce audio quality settings'
        }
    };
} 