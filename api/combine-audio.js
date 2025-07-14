/**
 * api/combine-audio.js - Professional Radio Program Generation Service
 * 
 * PURPOSE: Serverless function for combining multiple audio recordings into professional radio programs using FFmpeg
 * DEPENDENCIES: FFmpeg (with fluent-ffmpeg), Bunny.net Storage API, Node.js file system, HTTPS requests
 * DOCUMENTATION: See /documentation/api-documentation.md for complete API overview
 */

// Import required modules at the top
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import http from 'http';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { acquireGenerationLock, releaseLock } from '../utils/generation-lock.js';

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
        const { world, lmid, audioSegments, programType, lang } = req.body;

        // Validation
        if (!world || !lmid || !audioSegments || !lang) {
            return res.status(400).json({ 
                error: 'Missing required parameters: world, lmid, audioSegments, and lang' 
            });
        }
        
        const type = programType || 'kids';

        // NEW: Try to acquire generation lock to prevent concurrent generations
        const lockAcquired = await acquireGenerationLock(world, lmid, type, [], lang);
        if (!lockAcquired) {
            return res.status(409).json({
                success: false,
                message: 'Generation already in progress. Please wait and try again.',
                error: 'GENERATION_IN_PROGRESS'
            });
        }

        try {
            const combinedAudioUrl = await combineAudioWithFFmpeg(audioSegments, world, lmid, type, lang);
            
            // Count recordings by type for the manifest
            let recordingCount = 0;
            const listRecordingsUrl = `https://little-microphones.vercel.app/api/list-recordings?world=${world}&lmid=${lmid}&lang=${lang}`;
            const listResponse = await fetch(listRecordingsUrl);
            if (listResponse.ok) {
                const data = await listResponse.json();
                const recordings = data.recordings || [];
                if (type === 'kids') {
                    recordingCount = recordings.filter(r => r.filename.startsWith('kids-world_')).length;
                } else if (type === 'parent') {
                    recordingCount = recordings.filter(r => r.filename.includes('parent_')).length;
                }
            }
            
            // Create and save program manifest
            const manifestData = {
                generatedAt: new Date().toISOString(),
                world: world,
                lmid: lmid,
                lang: lang,
                programType: type,
                recordingCount: recordingCount,
                version: '5.5.0' // Version bump for new logic
            };
            manifestData.programUrl = combinedAudioUrl;
            if (type === 'kids') manifestData.kidsProgram = combinedAudioUrl;
            if (type === 'parent') manifestData.parentProgram = combinedAudioUrl;
            
            await uploadManifestToBunny(manifestData, world, lmid, type, lang);
            
            // Release the lock
            await releaseLock(world, lmid, type, lang);
            
            return res.status(200).json({
                success: true,
                message: 'Radio program generated successfully',
                url: combinedAudioUrl,
                manifest: manifestData
            });

        } catch (ffmpegError) {
            console.error('FFmpeg processing failed:', ffmpegError);
            await releaseLock(world, lmid, type, lang); // Release lock on error
            return res.status(500).json({
                success: false,
                message: 'Audio processing failed',
                error: ffmpegError.message
            });
        }

    } catch (error) {
        console.error('❌ Error in combine-audio API:', error);
        if (req.body?.world && req.body?.lmid && req.body?.programType && req.body?.lang) {
            await releaseLock(req.body.world, req.body.lmid, req.body.programType, req.body.lang);
        }
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

async function combineAudioWithFFmpeg(audioSegments, world, lmid, programType, lang) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    const tempDir = path.join(os.tmpdir(), `radio-${world}-${lmid}-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
        const processedSegments = [];
        for (const [i, segment] of audioSegments.entries()) {
            const segmentFileName = `segment-${String(i).padStart(3, '0')}.mp3`;
            const segmentFilePath = path.join(tempDir, segmentFileName);

            if (segment.type === 'single') {
                await downloadFile(segment.url, segmentFilePath);
                processedSegments.push(segmentFilePath);
            } else if (segment.type === 'combine_with_background') {
                const answerPaths = [];
                for (const [j, url] of segment.answerUrls.entries()) {
                    const answerPath = path.join(tempDir, `answer-${i}-${j}.mp3`);
                    await downloadFile(url, answerPath);
                    answerPaths.push(answerPath);
                }
                const backgroundPath = path.join(tempDir, `background-${i}.mp3`);
                await downloadFile(segment.backgroundUrl, backgroundPath);

                await combineAnswersWithBackground(answerPaths, backgroundPath, segmentFilePath);
                processedSegments.push(segmentFilePath);
            }
        }

        const finalOutputPath = path.join(tempDir, `radio-program-final.mp3`);
        await assembleFinalProgram(processedSegments, finalOutputPath);
        
        return await uploadToBunny(finalOutputPath, world, lmid, programType, lang);
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

async function combineAnswersWithBackground(answerPaths, backgroundPath, outputPath) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        answerPaths.forEach(p => command.input(p));
        command.input(backgroundPath);

        let filter;
        const bgInputIndex = answerPaths.length;

        if (answerPaths.length > 1) {
            // If more than one answer, concatenate them first
            const answerStreams = answerPaths.map((_, index) => `[${index}:a]`).join('');
            filter = `${answerStreams}concat=n=${answerPaths.length}:v=0:a=1[answers];[answers][${bgInputIndex}:a]amix=inputs=2:duration=first:dropout_transition=0`;
        } else {
            // If only one answer, just mix it with the background
            filter = `[0:a][${bgInputIndex}:a]amix=inputs=2:duration=first:dropout_transition=0`;
        }
        
        command.complexFilter(filter)
            .audioCodec('libmp3lame')
            .on('error', reject)
            .on('end', resolve)
            .save(outputPath);
    });
}

async function assembleFinalProgram(segmentPaths, outputPath) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        segmentPaths.forEach(p => command.input(p));
        command.mergeToFile(outputPath, path.dirname(outputPath))
            .audioCodec('libmp3lame')
            .on('error', reject)
            .on('end', resolve);
    });
}

function downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        protocol.get(url, response => {
            if (response.statusCode !== 200) {
                console.warn(`⚠️ File missing (${response.statusCode}): ${url}. Generating 2s of silence.`);
                generateSilentPlaceholder(filePath, 2).then(resolve).catch(reject);
                return;
            }
            const fileStream = createWriteStream(filePath);
            response.pipe(fileStream);
            fileStream.on('finish', () => fileStream.close(resolve));
            fileStream.on('error', reject);
        }).on('error', reject);
    });
}

async function generateSilentPlaceholder(filePath, duration) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input('anullsrc=channel_layout=stereo:sample_rate=44100')
            .inputOptions(['-f', 'lavfi'])
            .duration(duration)
            .audioCodec('libmp3lame')
            .save(filePath)
            .on('error', reject)
            .on('end', resolve);
    });
}

async function uploadToBunny(filePath, world, lmid, programType, lang) {
    const fileName = `radio-program-${programType}-${world}-${lmid}.mp3`;
    const uploadPath = `/${lang}/${lmid}/${world}/${fileName}`;
    const fileBuffer = await fs.readFile(filePath);

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'storage.bunnycdn.com',
            port: 443,
            path: `/${process.env.BUNNY_STORAGE_ZONE}${uploadPath}`,
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'audio/mpeg',
                'Content-Length': fileBuffer.length,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            }
        }, res => {
            if (res.statusCode === 201) {
                const cdnUrl = `https://${process.env.BUNNY_CDN_URL}${uploadPath}`;
                resolve(`${cdnUrl}?v=${Date.now()}`);
            } else {
                reject(new Error(`Upload failed with status: ${res.statusCode}`));
            }
        });
        req.on('error', reject);
        req.write(fileBuffer);
        req.end();
    });
}

async function uploadManifestToBunny(manifestData, world, lmid, programType, lang) {
    const typeManifestPath = `/${lang}/${lmid}/${world}/last-program-manifest-${programType}.json`;
    await saveManifestFile(manifestData, typeManifestPath);
}

async function saveManifestFile(manifestData, uploadPath) {
    const manifestJson = JSON.stringify(manifestData, null, 2);
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'storage.bunnycdn.com',
            port: 443,
            path: `/${process.env.BUNNY_STORAGE_ZONE}${uploadPath}`,
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(manifestJson, 'utf8'),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            }
        }, res => {
            res.statusCode === 201 ? resolve() : reject(new Error(`