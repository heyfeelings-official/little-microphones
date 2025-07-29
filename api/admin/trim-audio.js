/**
 * api/admin/trim-audio.js - Admin Audio Trim Service
 * 
 * PURPOSE: Trim audio files with silence detection and manual trim options
 * DEPENDENCIES: Bunny.net Storage API, FFmpeg, audio-trim utilities
 * 
 * REQUEST FORMAT:
 * POST /api/admin/trim-audio
 * Body: {
 *   path: "audio/other/intro.webm",  // Bunny.net path
 *   mode: "auto" | "manual",
 *   trimStart: 1.5,  // For manual mode (seconds)
 *   trimEnd: 10.2,   // For manual mode (seconds)
 *   detectSilence: true  // For auto mode
 * }
 * 
 * RESPONSE FORMAT:
 * {
 *   success: true,
 *   originalDuration: 12.5,
 *   newDuration: 8.7,
 *   trimStart: 1.5,
 *   trimEnd: 10.2,
 *   url: "https://cdn.../audio/other/intro.webm"
 * }
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { detectSilence, trimAudio, autoTrimAudio, getAudioDuration } from '../../utils/audio-trim.js';
import { downloadFile } from '../../utils/audio-ffmpeg.js';

export default async function handler(req, res) {
    // Secure CORS headers
    const { setCorsHeaders } = await import('../../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['POST', 'OPTIONS']);
    corsHandler(req);

    // Rate limiting - 10 trim operations per minute
    const { checkRateLimit } = await import('../../utils/simple-rate-limiter.js');
    if (!checkRateLimit(req, res, 'admin-trim-audio', 10)) {
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
        const { path: audioPath, mode = 'auto', trimStart, trimEnd, detectSilence: doDetectSilence = true } = req.body;

        // Validate required fields
        if (!audioPath) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required field: path' 
            });
        }

        // Validate mode
        if (!['auto', 'manual'].includes(mode)) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid mode. Must be "auto" or "manual"' 
            });
        }

        // For manual mode, validate trim points
        if (mode === 'manual' && (trimStart === undefined || trimEnd === undefined)) {
            return res.status(400).json({ 
                success: false,
                error: 'Manual mode requires trimStart and trimEnd' 
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

        console.log(`✂️ Trimming audio: ${audioPath} (mode: ${mode})`);

        // Create temp directory
        const tempDir = path.join(os.tmpdir(), `audio-trim-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });

        // Download file from Bunny.net
        const fileUrl = `https://${process.env.BUNNY_CDN_URL}/${audioPath}`;
        const filename = path.basename(audioPath);
        const inputPath = path.join(tempDir, filename);
        
        console.log(`📥 Downloading: ${fileUrl}`);
        await downloadFile(fileUrl, inputPath);

        // Get original duration
        const originalDuration = await getAudioDuration(inputPath);
        
        let result;
        let outputPath = path.join(tempDir, `trimmed-${filename}`);

        if (mode === 'auto') {
            // Auto-trim with silence detection
            result = await autoTrimAudio(inputPath, outputPath, {
                noiseLevel: -50,
                minDuration: 0.1,
                detectStart: true,
                detectEnd: true
            });
        } else {
            // Manual trim
            result = await trimAudio(inputPath, outputPath, trimStart, trimEnd);
            result.trimStart = trimStart;
            result.trimEnd = trimEnd;
            result.trimDuration = trimEnd - trimStart;
        }

        // Only upload if file was actually trimmed
        let finalUrl = fileUrl;
        
        if (result.trimmed !== false && result.success) {
            // Read trimmed file
            const trimmedBuffer = await fs.readFile(outputPath);
            const fileStats = await fs.stat(outputPath);

            // Upload back to Bunny.net (overwrite original)
            const uploadUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${audioPath}`;
            
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'AccessKey': process.env.BUNNY_API_KEY,
                    'Content-Type': 'audio/webm',
                    'Content-Length': fileStats.size.toString()
                },
                body: trimmedBuffer
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error(`Bunny.net upload failed: ${uploadResponse.status} - ${errorText}`);
                throw new Error(`Upload failed: ${uploadResponse.status}`);
            }

            // Add cache busting to URL
            finalUrl = `${fileUrl}?v=${Date.now()}`;
            console.log(`✅ Trimmed audio uploaded: ${finalUrl}`);
        }

        // Clean up temp files
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
            console.warn('Failed to cleanup temp files:', cleanupError);
        }

        // Prepare response with silence detection data if requested
        const response = {
            success: true,
            originalDuration: originalDuration,
            newDuration: result.trimDuration || originalDuration,
            trimStart: result.trimStart || 0,
            trimEnd: result.trimEnd || originalDuration,
            trimmed: result.trimmed !== false,
            url: finalUrl,
            path: audioPath,
            mode: mode
        };

        // Add silence detection data if available
        if (doDetectSilence && result.silencePeriods) {
            response.silenceDetection = {
                periods: result.silencePeriods,
                detectedStart: result.trimStart,
                detectedEnd: result.trimEnd
            };
        }

        console.log(`✅ Trim operation complete: ${response.trimmed ? 'Trimmed' : 'No trim needed'}`);

        return res.status(200).json(response);

    } catch (error) {
        console.error('Trim error:', error);
        return res.status(500).json({
            success: false,
            error: 'Trim operation failed',
            details: error.message
        });
    }
} 