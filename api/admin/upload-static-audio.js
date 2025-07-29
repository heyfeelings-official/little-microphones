/**
 * api/admin/upload-static-audio.js - Admin Static Audio Upload Service
 * 
 * PURPOSE: Upload static audio files (intro, outro, questions) to Bunny.net
 * DEPENDENCIES: Bunny.net Storage API, FFmpeg for conversion
 * 
 * REQUEST FORMAT:
 * POST /api/admin/upload-static-audio
 * Body: {
 *   audioData: "base64_audio_data",
 *   filename: "intro.webm",
 *   path: "audio/other/intro.webm" // Full path in Bunny.net
 * }
 * 
 * RESPONSE FORMAT:
 * {
 *   success: true,
 *   url: "https://cdn.../audio/other/intro.webm",
 *   path: "audio/other/intro.webm",
 *   converted: true/false
 * }
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

export default async function handler(req, res) {
    // Secure CORS headers
    const { setCorsHeaders } = await import('../../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['POST', 'OPTIONS']);
    corsHandler(req);

    // Rate limiting - 20 uploads per minute for admin
    const { checkRateLimit } = await import('../../utils/simple-rate-limiter.js');
    if (!checkRateLimit(req, res, 'admin-upload-static', 20)) {
        return;
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        const { audioData, filename, path: uploadPath } = req.body;

        // Validate required fields
        if (!audioData || !filename || !uploadPath) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields: audioData, filename, path' 
            });
        }

        // Validate path format (must start with audio/)
        if (!uploadPath.startsWith('audio/')) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid path. Must start with "audio/"' 
            });
        }

        // Check environment variables
        if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE || !process.env.BUNNY_CDN_URL) {
            console.error('Missing Bunny.net configuration');
            return res.status(500).json({ 
                success: false,
                error: 'Server configuration error' 
            });
        }

        console.log(`📤 Uploading static audio: ${uploadPath}`);

        // Convert base64 to buffer
        const base64Data = audioData.replace(/^data:audio\/[a-zA-Z0-9+]+;base64,/, '');
        const audioBuffer = Buffer.from(base64Data, 'base64');

        // Create temp directory
        const tempDir = path.join(os.tmpdir(), `audio-upload-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });

        const originalFile = path.join(tempDir, filename);
        await fs.writeFile(originalFile, audioBuffer);

        let finalFilePath = originalFile;
        let converted = false;

        // Check if conversion is needed (non-webm files)
        if (!filename.endsWith('.webm')) {
            console.log(`🔄 Converting ${filename} to WebM format...`);
            
            // Set up FFmpeg
            ffmpeg.setFfmpegPath(ffmpegInstaller.path);
            
            const webmFilename = filename.replace(/\.[^.]+$/, '.webm');
            const webmFilePath = path.join(tempDir, webmFilename);

            // Convert to WebM
            await new Promise((resolve, reject) => {
                ffmpeg(originalFile)
                    .toFormat('webm')
                    .audioCodec('libvorbis')
                    .audioChannels(2)
                    .audioFrequency(44100)
                    .audioBitrate('128k')
                    .on('start', cmd => {
                        console.log('🎵 FFmpeg command:', cmd);
                    })
                    .on('progress', progress => {
                        console.log(`⏳ Converting: ${Math.round(progress.percent || 0)}%`);
                    })
                    .on('end', () => {
                        console.log('✅ Conversion complete');
                        resolve();
                    })
                    .on('error', reject)
                    .save(webmFilePath);
            });

            finalFilePath = webmFilePath;
            converted = true;
        }

        // Read final file
        const finalBuffer = await fs.readFile(finalFilePath);
        const fileStats = await fs.stat(finalFilePath);

        // Determine final upload path (replace extension if converted)
        let finalUploadPath = uploadPath;
        if (converted) {
            finalUploadPath = uploadPath.replace(/\.[^.]+$/, '.webm');
        }

        // Upload to Bunny.net
        const uploadUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${finalUploadPath}`;
        
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'audio/webm',
                'Content-Length': fileStats.size.toString()
            },
            body: finalBuffer
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Bunny.net upload failed: ${response.status} - ${errorText}`);
            throw new Error(`Upload failed: ${response.status}`);
        }

        // Clean up temp files
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
            console.warn('Failed to cleanup temp files:', cleanupError);
        }

        const cdnUrl = `https://${process.env.BUNNY_CDN_URL}/${finalUploadPath}`;
        console.log(`✅ Upload successful: ${cdnUrl}`);

        return res.status(200).json({
            success: true,
            url: cdnUrl,
            path: finalUploadPath,
            converted: converted,
            originalFilename: filename,
            finalFilename: path.basename(finalUploadPath),
            size: fileStats.size,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
            success: false,
            error: 'Upload failed',
            details: error.message
        });
    }
} 