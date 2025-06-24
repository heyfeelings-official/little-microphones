/**
 * api/combine-audio.js - Radio Program Generation Service
 * 
 * PURPOSE: Serverless function for combining multiple audio recordings into a single radio program using FFmpeg
 * DEPENDENCIES: FFmpeg (with fluent-ffmpeg), Bunny.net Storage API, Node.js file system
 * DOCUMENTATION: See /documentation/api-documentation.md for complete API overview
 * 
 * REQUEST FORMAT:
 * POST /api/combine-audio
 * Body: { world: "spookyland", lmid: "32", audioUrls: ["https://example.com/intro.mp3", "https://example.com/question1.mp3", ...] }
 * 
 * AUDIO SEQUENCE:
 * intro.mp3 → question1.mp3 → [user recordings Q1] → monkeys.mp3 → question2.mp3 → [user recordings Q2] → monkeys.mp3 → outro.mp3
 * 
 * PROCESSING PIPELINE:
 * Recording Collection → Audio Plan Creation → File Download → FFmpeg Combination → Cloud Upload → URL Response
 * 
 * OUTPUT: Single MP3 file with all recordings combined in proper sequence
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
    // Set CORS headers - Updated to trigger fresh redeploy (2024-12-20)
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

    const startTime = Date.now();

    try {
        const { world, lmid, audioUrls } = req.body;

        // Validation
        if (!world || !lmid || !audioUrls) {
            return res.status(400).json({ 
                error: 'Missing required parameters: world, lmid, audioUrls' 
            });
        }

        // Validate audioUrls structure
        if (!Array.isArray(audioUrls) || audioUrls.length === 0) {
            return res.status(400).json({ 
                error: 'Invalid audioUrls format. Expected array of URLs.' 
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

        console.log(`🎵 Starting audio combination for ${world}/${lmid}`);
        console.log(`📊 Processing ${audioUrls.length} audio files`);

        // Create simple audio plan from URLs
        const audioPlan = audioUrls.map((url, index) => ({
            type: 'audio',
            url: url,
            order: index + 1
        }));

        console.log(`🎼 Created audio plan with ${audioPlan.length} segments`);

        // Pre-flight check for all audio files
        const missingFiles = [];
        for (const segment of audioPlan) {
            try {
                const response = await fetch(segment.url, { method: 'HEAD' });
                if (!response.ok) {
                    missingFiles.push({ url: segment.url, status: response.status });
                }
            } catch (error) {
                missingFiles.push({ url: segment.url, status: 'Network Error' });
            }
        }

        if (missingFiles.length > 0) {
            console.error('❌ Missing audio files detected:', missingFiles);
            return res.status(400).json({
                success: false,
                error: `One or more required audio files could not be found.`,
                details: 'The following files are missing or inaccessible:',
                missingFiles: missingFiles.map(f => `${f.url} (Status: ${f.status})`)
            });
        }

        // Try to combine audio using FFmpeg
        try {
            const combinedAudioUrl = await combineAudioWithFFmpeg(audioPlan, world, lmid);
            
            return res.status(200).json({
                success: true,
                message: 'Audio combination completed successfully',
                url: combinedAudioUrl,
                totalSegments: audioPlan.length
            });
        } catch (ffmpegError) {
            console.error('FFmpeg processing failed:', ffmpegError);
            
            return res.status(200).json({
                success: false,
                message: 'Audio combination plan created, but FFmpeg processing failed',
                plan: audioPlan,
                totalSegments: audioPlan.length,
                error: ffmpegError.message,
                suggestions: getFFmpegSetupSuggestions()
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
 * Combine audio files using FFmpeg
 */
async function combineAudioWithFFmpeg(audioPlan, world, lmid) {
    // Check if FFmpeg is available
    try {
        const ffmpegPath = ffmpegInstaller.path;
        ffmpeg.setFfmpegPath(ffmpegPath);
        
        console.log('📦 FFmpeg installer path:', ffmpegPath);
        console.log('📦 FFmpeg installer object:', ffmpegInstaller);
        
        // Test if FFmpeg binary actually exists
        try {
            await fs.access(ffmpegPath);
            console.log('✅ FFmpeg binary found and accessible');
        } catch (accessError) {
            console.error('❌ FFmpeg binary not accessible:', accessError);
            throw new Error(`FFmpeg binary not found at path: ${ffmpegPath}`);
        }
        
        console.log('📦 Starting audio combination...');
        
        // Create temp directory
        const tempDir = path.join(os.tmpdir(), `radio-${world}-${lmid}-${Date.now()}`);
        console.log('📁 Creating temp directory:', tempDir);
        await fs.mkdir(tempDir, { recursive: true });
        
        // Download all audio files
        console.log('📥 Starting audio file downloads...');
        const downloadedFiles = await downloadAudioFiles(audioPlan, tempDir);
        console.log('✅ All audio files downloaded successfully');
        
        // Combine audio files with professional audio processing
        const outputPath = path.join(tempDir, `radio-program-${world}-${lmid}.mp3`);
        
        return new Promise((resolve, reject) => {
            const command = ffmpeg();
            
            // Add all input files in order
            downloadedFiles.forEach(file => {
                command.input(file.path);
            });
            
            // Professional audio processing filters for classroom environment
            const filters = [];
            
            // Process each input with appropriate settings
            downloadedFiles.forEach((file, index) => {
                const url = file.segment.url;
                
                if (url.includes('/audio/other/monkeys.mp3')) {
                    // Background music: lower volume, EQ for background
                    filters.push(`[${index}:a]volume=0.15,highpass=f=100,lowpass=f=6000[a${index}]`);
                } else if (url.includes('/audio/other/intro.mp3') || url.includes('/audio/other/outro.mp3') || url.includes(`/audio/${world}/${world}-`)) {
                    // Question prompts, intro/outro: standard processing
                    filters.push(`[${index}:a]volume=1.2,dynaudnorm=p=0.7:s=3[a${index}]`);
                } else {
                    // User recordings: aggressive noise reduction, volume boost, EQ
                    filters.push(`[${index}:a]highpass=f=80,lowpass=f=8000,volume=2.5,dynaudnorm=p=0.9:s=5,afftdn=nr=20:nf=-25[a${index}]`);
                }
            });
            
            // Concatenate all processed streams
            const inputStreams = downloadedFiles.map((_, index) => `[a${index}]`).join('');
            filters.push(`${inputStreams}concat=n=${downloadedFiles.length}:v=0:a=1[temp]`);
            
            // Final master processing
            filters.push(`[temp]dynaudnorm=p=0.8:s=5,volume=0.9,highpass=f=60,lowpass=f=12000[outa]`);
            
            command
                .complexFilter(filters)
                .outputOptions([
                    '-map', '[outa]',
                    '-ar', '44100',      // Sample rate
                    '-ac', '2',          // Stereo
                    '-b:a', '128k',      // Bitrate
                    '-compression_level', '2'  // MP3 quality
                ])
                .format('mp3')
                .audioCodec('libmp3lame')
                .on('start', (commandLine) => {
                    console.log('🎵 FFmpeg command:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log(`⏳ Processing: ${Math.round(progress.percent || 0)}% done`);
                })
                .on('end', async () => {
                    console.log('✅ Audio combination complete');
                    
                    try {
                        // Upload to Bunny.net
                        const uploadUrl = await uploadToBunny(outputPath, world, lmid);
                        
                        // Cleanup temp files
                        await cleanupTempDirectory(tempDir);
                        
                        resolve(uploadUrl);
                    } catch (uploadError) {
                        reject(uploadError);
                    }
                })
                .on('error', (error) => {
                    console.error('❌ FFmpeg error:', error);
                    reject(error);
                })
                .save(outputPath);
        });
        
    } catch (error) {
        console.error('❌ FFmpeg error:', error);
        throw new Error(`FFmpeg error: ${error.message}`);
    }
}

/**
 * Download audio files from URLs
 */
async function downloadAudioFiles(audioPlan, tempDir) {
    const downloadedFiles = [];
    
    for (let i = 0; i < audioPlan.length; i++) {
        const segment = audioPlan[i];
        const url = segment.url;
        
        // Create descriptive filename based on URL
        let fileName;
        if (url.includes('/audio/other/intro.mp3')) {
            fileName = `${String(i).padStart(3, '0')}-intro.mp3`;
        } else if (url.includes('/audio/other/outro.mp3')) {
            fileName = `${String(i).padStart(3, '0')}-outro.mp3`;
        } else if (url.includes('/audio/other/monkeys.mp3')) {
            fileName = `${String(i).padStart(3, '0')}-monkeys.mp3`;
        } else if (url.includes(`/audio/`)) {
            fileName = `${String(i).padStart(3, '0')}-question.mp3`;
        } else {
            fileName = `${String(i).padStart(3, '0')}-recording.mp3`;
        }
        
        const filePath = path.join(tempDir, fileName);
        
        console.log(`📥 Downloading: ${url}`);
        
        try {
            await downloadFile(url, filePath);
            downloadedFiles.push({
                path: filePath,
                segment: segment
            });
            console.log(`✅ Downloaded: ${fileName}`);
        } catch (error) {
            console.error(`❌ Failed to download ${url}:`, error);
            throw error;
        }
    }
    
    return downloadedFiles;
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
    const fileName = `radio-program-${world}-${lmid}.mp3`;
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
                'Content-Length': fileBuffer.length
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 201) {
                const downloadUrl = `${process.env.BUNNY_CDN_URL}${uploadPath}`;
                console.log(`✅ Upload successful: ${downloadUrl}`);
                resolve(downloadUrl);
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