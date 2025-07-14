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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { world, lmid, audioSegments, programType, lang } = req.body;

        if (!world || !lmid || !audioSegments || !lang) {
            return res.status(400).json({ error: 'Missing required parameters: world, lmid, audioSegments, and lang' });
        }
        
        const type = programType || 'kids';

        const lockAcquired = await acquireGenerationLock(world, lmid, type, [], lang);
        if (!lockAcquired) {
            return res.status(409).json({ success: false, message: 'Generation already in progress.' });
        }

        try {
            const combinedAudioUrl = await combineAudioWithFFmpeg(audioSegments, world, lmid, type, lang);
            
            let recordingCount = 0;
            const listUrl = `https://little-microphones.vercel.app/api/list-recordings?world=${world}&lmid=${lmid}&lang=${lang}`;
            const listRes = await fetch(listUrl);
            if (listRes.ok) {
                const data = await listRes.json();
                const recordings = data.recordings || [];
                recordingCount = recordings.filter(r => (type === 'kids' ? r.filename.startsWith('kids-world_') : r.filename.includes('parent_'))).length;
            }
            
            const manifestData = {
                generatedAt: new Date().toISOString(),
                world, lmid, lang, programType: type, recordingCount,
                programUrl: combinedAudioUrl,
                version: '5.6.0' // Final version
            };
            
            await uploadManifestToBunny(manifestData, world, lmid, type, lang);
            await releaseLock(world, lmid, type, lang);
            
            return res.status(200).json({ success: true, url: combinedAudioUrl, manifest: manifestData });

        } catch (ffmpegError) {
            console.error('FFmpeg Error:', ffmpegError);
            await releaseLock(world, lmid, type, lang);
            return res.status(500).json({ success: false, error: 'Audio processing failed', details: ffmpegError.message });
        }

    } catch (error) {
        console.error('API Error:', error);
        if (req.body?.world && req.body?.lmid && req.body?.programType && req.body?.lang) {
            await releaseLock(req.body.world, req.body.lmid, req.body.programType, req.body.lang);
        }
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

async function combineAudioWithFFmpeg(audioSegments, world, lmid, programType, lang) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    const tempDir = path.join(os.tmpdir(), `radio-${world}-${lmid}-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
        const processedSegments = [];
        for (const [i, segment] of audioSegments.entries()) {
            const segmentFilePath = path.join(tempDir, `segment-${i}.mp3`);
            if (segment.type === 'single') {
                await downloadFile(segment.url, segmentFilePath);
                processedSegments.push(segmentFilePath);
            } else if (segment.type === 'combine_with_background') {
                const answerPaths = await Promise.all(
                    segment.answerUrls.map((url, j) => {
                        const answerPath = path.join(tempDir, `answer-${i}-${j}.mp3`);
                        return downloadFile(url, answerPath).then(() => answerPath);
                    })
                );
                const backgroundPath = path.join(tempDir, `background-${i}.mp3`);
                await downloadFile(segment.backgroundUrl, backgroundPath);
                await combineAnswersWithBackground(answerPaths, backgroundPath, segmentFilePath);
                processedSegments.push(segmentFilePath);
            }
        }

        const finalOutputPath = path.join(tempDir, "final-program.mp3");
        await assembleFinalProgram(processedSegments, finalOutputPath);
        return await uploadToBunny(finalOutputPath, world, lmid, programType, lang);

    } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(err => console.error(`Cleanup failed: ${err.message}`));
    }
}

function combineAnswersWithBackground(answerPaths, backgroundPath, outputPath) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        answerPaths.forEach(p => command.input(p));
        command.input(backgroundPath);

        const astream = answerPaths.length > 1 ? '[answers]' : '[0:a]';
        let filter = answerPaths.length > 1 
            ? `${answerPaths.map((_, i) => `[${i}:a]`).join('')}concat=n=${answerPaths.length}:v=0:a=1[answers];` 
            : '';
        filter += `${astream}[${answerPaths.length}:a]amix=inputs=2:duration=first:dropout_transition=0`;
        
        command.complexFilter(filter).audioCodec('libmp3lame').on('error', reject).on('end', resolve).save(outputPath);
    });
}

function assembleFinalProgram(segmentPaths, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg().input(`concat:${segmentPaths.join('|')}`).audioCodec('copy').on('error', reject).on('end', resolve).save(outputPath);
    });
}

function downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
        protocol.get(url, response => {
            if (response.statusCode !== 200) {
                console.warn(`File not found: ${url}. Using 2s silence.`);
                generateSilentPlaceholder(filePath, 2).then(resolve).catch(reject);
                return;
            }
            const fileStream = createWriteStream(filePath).on('finish', () => fileStream.close(resolve)).on('error', reject);
            response.pipe(fileStream);
        }).on('error', reject);
    });
}

function generateSilentPlaceholder(filePath, duration) {
    return new Promise((resolve, reject) => {
        ffmpeg().input('anullsrc=channel_layout=stereo:sample_rate=44100').inputOptions(['-f', 'lavfi'])
            .duration(duration).audioCodec('libmp3lame').save(filePath)
            .on('error', reject).on('end', resolve);
    });
}

async function uploadToBunny(filePath, world, lmid, programType, lang) {
    const fileName = `radio-program-${programType}-${world}-${lmid}.mp3`;
    const uploadPath = `/${lang}/${lmid}/${world}/${fileName}`;
    const fileBuffer = await fs.readFile(filePath);
    const cdnUrl = `https://${process.env.BUNNY_CDN_URL}${uploadPath}`;

    return new Promise((resolve, reject) => {
        const req = https.request({
            method: 'PUT',
            hostname: 'storage.bunnycdn.com',
            path: `/${process.env.BUNNY_STORAGE_ZONE}${uploadPath}`,
            headers: { 'AccessKey': process.env.BUNNY_API_KEY, 'Content-Length': fileBuffer.length }
        }, res => {
            res.statusCode === 201 ? resolve(`${cdnUrl}?v=${Date.now()}`) : reject(`Upload failed: ${res.statusCode}`);
        });
        req.on('error', reject).end(fileBuffer);
    });
}

async function uploadManifestToBunny(manifestData, world, lmid, programType, lang) {
    const manifestPath = `/${lang}/${lmid}/${world}/last-program-manifest-${programType}.json`;
    const manifestJson = JSON.stringify(manifestData, null, 2);
    return new Promise((resolve, reject) => {
        const req = https.request({
            method: 'PUT',
            hostname: 'storage.bunnycdn.com',
            path: `/${process.env.BUNNY_STORAGE_ZONE}${manifestPath}`,
            headers: { 'AccessKey': process.env.BUNNY_API_KEY, 'Content-Type': 'application/json' }
        }, res => {
            res.statusCode === 201 ? resolve() : reject(`Manifest save failed: ${res.statusCode}`);
        });
        req.on('error', reject).end(manifestJson);
    });
}
// Add http to the list of imports
const protocol = http;