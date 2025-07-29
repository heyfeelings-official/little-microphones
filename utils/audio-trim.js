/**
 * utils/audio-trim.js - Audio Trimming and Silence Detection Utilities
 * 
 * PURPOSE: Provides functions for detecting silence and trimming audio files
 * DEPENDENCIES: FFmpeg, fluent-ffmpeg
 * 
 * FEATURES:
 * - Silence detection at start and end of audio
 * - Precision trimming with millisecond accuracy
 * - Waveform data generation for visualization
 * - Duration and volume analysis
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Detect silence periods in an audio file
 * @param {string} inputPath - Path to input audio file
 * @param {Object} options - Detection options
 * @returns {Promise<Object>} Silence detection results
 */
export async function detectSilence(inputPath, options = {}) {
    const {
        noiseLevel = -50,      // dB threshold for silence
        minDuration = 0.1,     // Minimum silence duration in seconds
        detectStart = true,    // Detect silence at start
        detectEnd = true       // Detect silence at end
    } = options;

    console.log(`🔍 Detecting silence in: ${path.basename(inputPath)}`);
    console.log(`   Noise level: ${noiseLevel}dB, Min duration: ${minDuration}s`);

    const silencePeriods = [];
    
    return new Promise((resolve, reject) => {
        // Use silencedetect filter to find silence periods
        ffmpeg(inputPath)
            .audioFilters([
                `silencedetect=noise=${noiseLevel}dB:d=${minDuration}`
            ])
            .format('null')
            .on('stderr', (stderrLine) => {
                // Parse silence detection output
                const startMatch = stderrLine.match(/silence_start: ([\d.]+)/);
                const endMatch = stderrLine.match(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/);
                
                if (startMatch) {
                    silencePeriods.push({
                        type: 'start',
                        time: parseFloat(startMatch[1])
                    });
                }
                
                if (endMatch) {
                    const lastPeriod = silencePeriods[silencePeriods.length - 1];
                    if (lastPeriod && lastPeriod.type === 'start') {
                        lastPeriod.type = 'period';
                        lastPeriod.end = parseFloat(endMatch[1]);
                        lastPeriod.duration = parseFloat(endMatch[2]);
                    }
                }
            })
            .on('end', async () => {
                // Get total duration
                const duration = await getAudioDuration(inputPath);
                
                // Determine trim points
                let trimStart = 0;
                let trimEnd = duration;
                
                // Find silence at start
                if (detectStart && silencePeriods.length > 0) {
                    const firstPeriod = silencePeriods[0];
                    if (firstPeriod.time === 0 || firstPeriod.time < 0.1) {
                        trimStart = firstPeriod.end || firstPeriod.time;
                    }
                }
                
                // Find silence at end
                if (detectEnd && silencePeriods.length > 0) {
                    const lastPeriod = silencePeriods[silencePeriods.length - 1];
                    if (lastPeriod.end && Math.abs(lastPeriod.end - duration) < 0.1) {
                        trimEnd = lastPeriod.time;
                    }
                }
                
                console.log(`✅ Silence detection complete:`);
                console.log(`   Original duration: ${duration.toFixed(2)}s`);
                console.log(`   Suggested trim: ${trimStart.toFixed(2)}s - ${trimEnd.toFixed(2)}s`);
                console.log(`   New duration: ${(trimEnd - trimStart).toFixed(2)}s`);
                
                resolve({
                    duration: duration,
                    silencePeriods: silencePeriods,
                    trimStart: trimStart,
                    trimEnd: trimEnd,
                    trimDuration: trimEnd - trimStart
                });
            })
            .on('error', reject)
            .output('pipe:1')
            .run();
    });
}

/**
 * Trim an audio file based on start and end times
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputPath - Path to output audio file
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @returns {Promise<Object>} Trim operation result
 */
export async function trimAudio(inputPath, outputPath, startTime, endTime) {
    console.log(`✂️ Trimming audio: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
    
    const duration = endTime - startTime;
    
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .setStartTime(startTime)
            .setDuration(duration)
            .audioCodec('libvorbis')
            .audioChannels(2)
            .audioFrequency(44100)
            .audioBitrate('128k')
            .format('webm')
            .on('start', (cmd) => {
                console.log('🎵 FFmpeg trim command:', cmd);
            })
            .on('progress', (progress) => {
                const percent = Math.min(100, (progress.timemark ? 
                    (parseTimemark(progress.timemark) / duration) * 100 : 0));
                console.log(`⏳ Trimming: ${percent.toFixed(1)}%`);
            })
            .on('end', async () => {
                const stats = await fs.stat(outputPath);
                console.log(`✅ Trim complete: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                
                resolve({
                    success: true,
                    outputPath: outputPath,
                    duration: duration,
                    size: stats.size
                });
            })
            .on('error', reject)
            .save(outputPath);
    });
}

/**
 * Auto-trim audio by detecting and removing silence
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputPath - Path to output audio file
 * @param {Object} options - Trim options
 * @returns {Promise<Object>} Auto-trim result
 */
export async function autoTrimAudio(inputPath, outputPath, options = {}) {
    console.log(`🤖 Auto-trimming audio: ${path.basename(inputPath)}`);
    
    // Detect silence
    const silenceData = await detectSilence(inputPath, options);
    
    // Skip if no trimming needed
    if (silenceData.trimStart === 0 && silenceData.trimEnd === silenceData.duration) {
        console.log('ℹ️ No silence detected, skipping trim');
        return {
            success: true,
            trimmed: false,
            ...silenceData
        };
    }
    
    // Perform trim
    const trimResult = await trimAudio(
        inputPath, 
        outputPath, 
        silenceData.trimStart, 
        silenceData.trimEnd
    );
    
    return {
        ...trimResult,
        ...silenceData,
        trimmed: true
    };
}

/**
 * Generate waveform data for audio visualization
 * @param {string} inputPath - Path to audio file
 * @param {number} samples - Number of waveform samples
 * @returns {Promise<Array>} Array of amplitude values
 */
export async function generateWaveform(inputPath, samples = 100) {
    console.log(`📊 Generating waveform data: ${samples} samples`);
    
    const waveformData = [];
    const duration = await getAudioDuration(inputPath);
    const interval = duration / samples;
    
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioFilters([
                `aresample=8000`,
                `showwavespic=s=${samples}x1:colors=white`
            ])
            .format('null')
            .on('stderr', (stderrLine) => {
                // Parse amplitude data from FFmpeg output
                const match = stderrLine.match(/amplitude:([\d.]+)/);
                if (match) {
                    waveformData.push(parseFloat(match[1]));
                }
            })
            .on('end', () => {
                // Normalize waveform data
                const maxAmplitude = Math.max(...waveformData);
                const normalized = waveformData.map(amp => amp / maxAmplitude);
                
                console.log(`✅ Waveform generated: ${normalized.length} points`);
                resolve(normalized);
            })
            .on('error', reject)
            .output('pipe:1')
            .run();
    });
}

/**
 * Get audio file duration
 * @param {string} filePath - Path to audio file
 * @returns {Promise<number>} Duration in seconds
 */
export async function getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                resolve(metadata.format.duration || 0);
            }
        });
    });
}

/**
 * Parse FFmpeg timemark to seconds
 * @param {string} timemark - Timemark string (HH:MM:SS.MS)
 * @returns {number} Time in seconds
 */
function parseTimemark(timemark) {
    const parts = timemark.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Analyze audio levels
 * @param {string} inputPath - Path to audio file
 * @returns {Promise<Object>} Audio level analysis
 */
export async function analyzeAudioLevels(inputPath) {
    console.log(`📈 Analyzing audio levels...`);
    
    const stats = {
        peak: [],
        rms: [],
        silence: []
    };
    
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioFilters('volumedetect')
            .format('null')
            .on('stderr', (stderrLine) => {
                // Parse volume statistics
                const meanMatch = stderrLine.match(/mean_volume: ([\-\d.]+) dB/);
                const maxMatch = stderrLine.match(/max_volume: ([\-\d.]+) dB/);
                
                if (meanMatch) stats.meanVolume = parseFloat(meanMatch[1]);
                if (maxMatch) stats.maxVolume = parseFloat(maxMatch[1]);
            })
            .on('end', () => {
                console.log(`✅ Audio analysis complete:`);
                console.log(`   Mean volume: ${stats.meanVolume}dB`);
                console.log(`   Max volume: ${stats.maxVolume}dB`);
                resolve(stats);
            })
            .on('error', reject)
            .output('pipe:1')
            .run();
    });
} 