/**
 * create-system-audio-files.js - Generate and upload missing system audio files
 * 
 * PURPOSE: Create silent placeholder MP3 files for missing system audio
 * USAGE: node create-system-audio-files.js
 */

import fs from 'fs';
import https from 'https';

// Required system audio files that are missing
const MISSING_FILES = [
    {
        path: '/audio/other/outro.mp3',
        description: 'Program ending audio',
        duration: 3 // seconds
    },
    {
        path: '/audio/other/monkeys.mp3', 
        description: 'Background music for mixing',
        duration: 30 // seconds - should be long enough to loop
    },
    {
        path: '/audio/spookyland/spookyland-QID1.mp3',
        description: 'Spookyland Question 1 prompt',
        duration: 5 // seconds
    },
    {
        path: '/audio/spookyland/spookyland-QID2.mp3',
        description: 'Spookyland Question 2 prompt', 
        duration: 5 // seconds
    },
    {
        path: '/audio/spookyland/spookyland-QID3.mp3',
        description: 'Spookyland Question 3 prompt',
        duration: 5 // seconds
    }
];

/**
 * Generate a silent MP3 file using FFmpeg
 * @param {number} duration - Duration in seconds
 * @param {string} outputPath - Output file path
 */
async function generateSilentMp3(duration, outputPath) {
    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input('anullsrc=channel_layout=stereo:sample_rate=44100')
            .inputOptions(['-f', 'lavfi'])
            .duration(duration)
            .audioCodec('libmp3lame')
            .audioChannels(2)
            .audioFrequency(44100)
            .audioBitrate('128k')
            .format('mp3')
            .on('start', (commandLine) => {
                console.log(`🔧 Generating ${duration}s silent MP3: ${outputPath}`);
            })
            .on('progress', (progress) => {
                console.log(`⏳ Progress: ${Math.round(progress.percent || 0)}%`);
            })
            .on('end', () => {
                console.log(`✅ Generated: ${outputPath}`);
                resolve();
            })
            .on('error', reject)
            .save(outputPath);
    });
}

/**
 * Upload file to Bunny.net
 * @param {string} filePath - Local file path
 * @param {string} remotePath - Remote path on CDN
 */
async function uploadToBunny(filePath, remotePath) {
    const fileBuffer = fs.readFileSync(filePath);
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'storage.bunnycdn.com',
            port: 443,
            path: `/${process.env.BUNNY_STORAGE_ZONE}${remotePath}`,
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'audio/mpeg',
                'Content-Length': fileBuffer.length,
                'Cache-Control': 'public, max-age=2592000'
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log(`✅ Uploaded: ${remotePath}`);
                resolve();
            } else {
                reject(new Error(`Upload failed: ${res.statusCode}`));
            }
        });
        
        req.on('error', reject);
        req.write(fileBuffer);
        req.end();
    });
}

/**
 * Main function to create and upload all missing files
 */
async function createSystemAudioFiles() {
    console.log('🎵 Creating missing system audio files...');
    
    // Check environment variables
    if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE) {
        console.error('❌ Missing Bunny.net environment variables');
        console.log('Please set BUNNY_API_KEY and BUNNY_STORAGE_ZONE');
        process.exit(1);
    }
    
    // Create temp directory
    const tempDir = './temp-audio-files';
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    
    try {
        for (const file of MISSING_FILES) {
            console.log(`\n📂 Processing: ${file.description}`);
            
            const localPath = `${tempDir}/${file.path.split('/').pop()}`;
            
            // Generate silent MP3
            await generateSilentMp3(file.duration, localPath);
            
            // Upload to Bunny.net
            await uploadToBunny(localPath, file.path);
            
            // Clean up local file
            fs.unlinkSync(localPath);
        }
        
        // Clean up temp directory
        fs.rmdirSync(tempDir);
        
        console.log('\n🎉 All system audio files created and uploaded successfully!');
        console.log('📋 Created files:');
        MISSING_FILES.forEach(file => {
            console.log(`  ✅ ${file.path} (${file.duration}s) - ${file.description}`);
        });
        
    } catch (error) {
        console.error('❌ Error creating system audio files:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createSystemAudioFiles();
}

export { createSystemAudioFiles, generateSilentMp3, uploadToBunny }; 