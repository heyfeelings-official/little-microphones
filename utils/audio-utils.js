/**
 * utils/audio-utils.js - Enhanced Audio Processing Utilities
 * 
 * PURPOSE: Comprehensive audio processing utilities to eliminate code duplication
 * DEPENDENCIES: None (works with FFmpeg when available)
 * 
 * EXPORTED FUNCTIONS:
 * - convertRecordingsToAudioSegments(): Convert recordings to audioSegments format
 * - extractTimestampFromFilename(): Extract timestamp from recording filename
 * - extractFilesUsed(): Extract files used from audio segments
 * - validateAudioUrl(): Validate audio URL format and accessibility
 * - generateAudioManifest(): Generate audio manifest for tracking
 * - optimizeAudioSegments(): Optimize audio segments for processing
 * - createAudioMetadata(): Create metadata for audio files
 * - formatAudioDuration(): Format audio duration for display
 * - getAudioFileSize(): Estimate audio file size
 * - sortRecordingsByTimestamp(): Sort recordings by timestamp
 * - groupRecordingsByQuestion(): Group recordings by question ID
 * 
 * CONSTANTS:
 * - STATIC_FILES: Static audio file URLs
 * - AUDIO_FORMATS: Supported audio formats
 * - PROCESSING_DEFAULTS: Default processing parameters
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.0.0 (Enhanced)
 * STATUS: Production Ready ✅
 */

/**
 * Convert raw recordings to audioSegments format expected by combine-audio API
 * @param {Array} recordings - Raw recordings from get-radio-data
 * @param {string} world - World name
 * @param {string} userRole - User role ('parents' or 'educators') 
 * @returns {Array} Formatted audioSegments
 */
export function convertRecordingsToAudioSegments(recordings, world, userRole = 'parents') {
    const audioSegments = [];
    
    // Group recordings by questionId
    const recordingsByQuestion = {};
    recordings.forEach(recording => {
        const questionId = recording.questionId;
        if (!recordingsByQuestion[questionId]) {
            recordingsByQuestion[questionId] = [];
        }
        recordingsByQuestion[questionId].push(recording);
    });
    
    // Sort question IDs numerically
    const sortedQuestionIds = Object.keys(recordingsByQuestion).sort((a, b) => parseInt(a) - parseInt(b));
    
    // 1. Add intro jingle
    const introJingleTimestamp = Date.now();
    audioSegments.push({
        type: 'single',
        url: `https://little-microphones.b-cdn.net/audio/jingles/intro-jingle.mp3?t=${introJingleTimestamp}`
    });
    
    // 2. Add world-specific intro (role-based)
    const worldIntroTimestamp = Date.now() + 1;
    audioSegments.push({
        type: 'single',
        url: `https://little-microphones.b-cdn.net/audio/${world}/other/${world}-intro-${userRole}.mp3?t=${worldIntroTimestamp}`
    });
    
    // 3. Add questions and answers in order
    sortedQuestionIds.forEach(questionId => {
        const questionRecordings = recordingsByQuestion[questionId];
        
        // Add question prompt from world-specific questions folder
        const cacheBustTimestamp = Date.now() + Math.random();
        audioSegments.push({
            type: 'single',
            url: `https://little-microphones.b-cdn.net/audio/${world}/questions/${world}-QID${questionId}.mp3?t=${cacheBustTimestamp}`
        });
        
        // Sort answers by filename timestamp (first recorded = first played)
        const sortedAnswers = questionRecordings.sort((a, b) => {
            const timestampA = extractTimestampFromFilename(a.filename);
            const timestampB = extractTimestampFromFilename(b.filename);
            return timestampA - timestampB;
        });
        
        // Combine answers with world-specific background music
        const backgroundTimestamp = Date.now() + Math.random();
        audioSegments.push({
            type: 'combine_with_background',
            answerUrls: sortedAnswers.map(recording => recording.url),
            backgroundUrl: `https://little-microphones.b-cdn.net/audio/${world}/other/${world}-background.mp3?t=${backgroundTimestamp}`,
            questionId: questionId
        });
    });
    
    // 4. Add outro jingle
    const outroJingleTimestamp = Date.now() + 2;
    audioSegments.push({
        type: 'single',
        url: `https://little-microphones.b-cdn.net/audio/jingles/outro-jingle.mp3?t=${outroJingleTimestamp}`
    });
    
    // 5. Add world-specific outro (role-based) - LAST
    const worldOutroTimestamp = Date.now() + 3;
    audioSegments.push({
        type: 'single',
        url: `https://little-microphones.b-cdn.net/audio/${world}/other/${world}-outro-${userRole}.mp3?t=${worldOutroTimestamp}`
    });
    
    console.log(`🎼 Generated ${audioSegments.length} audio segments for ${world} (${userRole}) with ${sortedQuestionIds.length} questions`);
    return audioSegments;
}

/**
 * Detect user role based on recordings structure
 * @param {Array} recordings - Array of recordings
 * @returns {string} User role ('parents' or 'educators')
 */
export function detectUserRole(recordings) {
    if (!recordings || recordings.length === 0) {
        return 'parents'; // Default fallback
    }
    
    // Check first recording filename to determine role
    const firstRecording = recordings[0];
    if (firstRecording && firstRecording.filename) {
        // Educators (kids) have "kids-" prefix
        if (firstRecording.filename.startsWith('kids-')) {
            return 'educators';
        }
        // Parents have "parent_mem_sb_" prefix
        if (firstRecording.filename.startsWith('parent_mem_sb_')) {
            return 'parents';
        }
    }
    
    // Default to parents if detection fails
    return 'parents';
}

/**
 * Extract timestamp from recording filename
 * @param {string} filename - Recording filename
 * @returns {number} Timestamp
 */
export function extractTimestampFromFilename(filename) {
    const match = filename.match(/tm_(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

/**
 * Constants for audio processing
 */
export const STATIC_FILES = {
            intro: 'https://little-microphones.b-cdn.net/audio/other/intro.webm',
        outro: 'https://little-microphones.b-cdn.net/audio/other/outro.webm',
        monkeys: 'https://little-microphones.b-cdn.net/audio/other/monkeys.webm'
};

export const AUDIO_FORMATS = {
            webm: { extension: '.webm', mimeType: 'audio/webm' },
    mp3: { extension: '.mp3', mimeType: 'audio/mpeg' },
    wav: { extension: '.wav', mimeType: 'audio/wav' },
    m4a: { extension: '.m4a', mimeType: 'audio/mp4' }
};

export const PROCESSING_DEFAULTS = {
    sampleRate: 44100,
    bitRate: '128k',
    channels: 2,
    backgroundVolume: 0.25,
    maxDuration: 600, // 10 minutes max
    fadeDuration: 0.5 // 0.5 seconds fade
};

/**
 * Extract files used from audio segments for manifest tracking
 * @param {Array} audioSegments - Array of audio segments
 * @returns {Array} Array of filenames used in the program
 */
export function extractFilesUsed(audioSegments) {
    const filesUsed = [];
    
    audioSegments.forEach(segment => {
        if (segment.type === 'single') {
            // Extract filename from URL
            const filename = segment.url.split('/').pop();
            filesUsed.push(filename);
        } else if (segment.type === 'combine_with_background') {
            // Extract filenames from answer URLs
            segment.answerUrls.forEach(url => {
                const filename = url.split('/').pop();
                filesUsed.push(filename);
            });
            
            // Extract background filename
            const backgroundFilename = segment.backgroundUrl.split('/').pop();
            filesUsed.push(backgroundFilename);
        }
    });
    
    return filesUsed;
}

/**
 * Validate audio URL format and accessibility
 * @param {string} url - Audio URL to validate
 * @returns {Object} Validation result with { valid: boolean, error?: string }
 */
export function validateAudioUrl(url) {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URL is required and must be a string' };
    }
    
    // Check if URL is properly formatted
    try {
        new URL(url);
    } catch (error) {
        return { valid: false, error: 'Invalid URL format' };
    }
    
    // Check if URL points to an audio file
    const audioExtensions = Object.values(AUDIO_FORMATS).map(format => format.extension);
    const urlWithoutQuery = url.split('?')[0];
    const hasAudioExtension = audioExtensions.some(ext => urlWithoutQuery.endsWith(ext));
    
    if (!hasAudioExtension) {
        return { valid: false, error: 'URL does not point to a supported audio file' };
    }
    
    return { valid: true };
}

/**
 * Generate audio manifest for tracking and comparison
 * @param {Array} audioSegments - Array of audio segments
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Audio manifest object
 */
export function generateAudioManifest(audioSegments, metadata = {}) {
    const filesUsed = extractFilesUsed(audioSegments);
    const userAnswerFiles = filesUsed.filter(filename => 
        filename.includes('kids-world_') && filename.includes('-question_')
    );
    
    return {
        generatedAt: new Date().toISOString(),
        version: '2.0.0',
        totalSegments: audioSegments.length,
        filesUsed: filesUsed,
        recordingCount: userAnswerFiles.length,
        estimatedDuration: estimateAudioDuration(audioSegments),
        checksum: generateChecksum(filesUsed),
        ...metadata
    };
}

/**
 * Optimize audio segments for processing
 * @param {Array} audioSegments - Array of audio segments
 * @returns {Array} Optimized audio segments
 */
export function optimizeAudioSegments(audioSegments) {
    return audioSegments.map((segment, index) => {
        const optimized = { ...segment };
        
        // Add processing hints
        optimized.index = index;
        optimized.id = `segment_${index}`;
        
        // Add cache-busting for better reliability
        if (optimized.url && !optimized.url.includes('?t=')) {
            optimized.url = `${optimized.url}?t=${Date.now() + index}`;
        }
        
        if (optimized.answerUrls) {
            optimized.answerUrls = optimized.answerUrls.map((url, urlIndex) => 
                url.includes('?') ? url : `${url}?t=${Date.now() + index + urlIndex}`
            );
        }
        
        if (optimized.backgroundUrl && !optimized.backgroundUrl.includes('?t=')) {
            optimized.backgroundUrl = `${optimized.backgroundUrl}?t=${Date.now() + index + 1000}`;
        }
        
        return optimized;
    });
}

/**
 * Create metadata for audio files
 * @param {string} filename - Audio filename
 * @param {Object} options - Additional options
 * @returns {Object} Audio metadata
 */
export function createAudioMetadata(filename, options = {}) {
    const timestamp = extractTimestampFromFilename(filename);
    const questionMatch = filename.match(/-question_(\d+)-/);
    const questionId = questionMatch ? parseInt(questionMatch[1]) : null;
    
    return {
        filename,
        timestamp,
        questionId,
        recordedAt: timestamp ? new Date(timestamp).toISOString() : null,
        estimatedSize: getAudioFileSize(filename),
        format: getAudioFormat(filename),
        ...options
    };
}

/**
 * Format audio duration for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "2:34")
 */
export function formatAudioDuration(seconds) {
    if (!seconds || seconds < 0) {
        return '0:00';
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Estimate audio file size based on format and duration
 * @param {string} filename - Audio filename
 * @param {number} durationSeconds - Duration in seconds (optional)
 * @returns {number} Estimated size in bytes
 */
export function getAudioFileSize(filename, durationSeconds = 30) {
    const format = getAudioFormat(filename);
    
    // Rough estimates based on common bitrates
    const bytesPerSecond = {
        mp3: 16000,  // 128kbps
        wav: 176400, // 44.1kHz 16-bit stereo
        m4a: 12000   // ~96kbps AAC
    };
    
            return (bytesPerSecond[format] || bytesPerSecond.webm) * durationSeconds;
}

/**
 * Sort recordings by timestamp (chronological order)
 * @param {Array} recordings - Array of recording objects
 * @returns {Array} Sorted recordings
 */
export function sortRecordingsByTimestamp(recordings) {
    return [...recordings].sort((a, b) => {
        const timestampA = extractTimestampFromFilename(a.filename || a.url || '');
        const timestampB = extractTimestampFromFilename(b.filename || b.url || '');
        return timestampA - timestampB;
    });
}

/**
 * Group recordings by question ID
 * @param {Array} recordings - Array of recording objects
 * @returns {Object} Recordings grouped by questionId
 */
export function groupRecordingsByQuestion(recordings) {
    const grouped = {};
    
    recordings.forEach(recording => {
        const questionId = recording.questionId || 
                          extractQuestionIdFromFilename(recording.filename || recording.url || '');
        
        if (questionId) {
            if (!grouped[questionId]) {
                grouped[questionId] = [];
            }
            grouped[questionId].push(recording);
        }
    });
    
    // Sort recordings within each question by timestamp
    Object.keys(grouped).forEach(questionId => {
        grouped[questionId] = sortRecordingsByTimestamp(grouped[questionId]);
    });
    
    return grouped;
}

/**
 * Helper function: Extract question ID from filename
 * @param {string} filename - Filename to extract from
 * @returns {string|null} Question ID or null
 */
function extractQuestionIdFromFilename(filename) {
    const match = filename.match(/-question_(\d+)-/);
    return match ? match[1] : null;
}

/**
 * Helper function: Get audio format from filename
 * @param {string} filename - Filename to check
 * @returns {string} Audio format (mp3, wav, m4a)
 */
function getAudioFormat(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    return Object.keys(AUDIO_FORMATS).find(format => 
        AUDIO_FORMATS[format].extension === `.${extension}`
    ) || 'mp3';
}

/**
 * Helper function: Estimate total audio duration
 * @param {Array} audioSegments - Array of audio segments
 * @returns {number} Estimated duration in seconds
 */
function estimateAudioDuration(audioSegments) {
    let totalDuration = 0;
    
    audioSegments.forEach(segment => {
        if (segment.type === 'single') {
            // Estimate based on file type
            if (segment.url.includes('intro.webm')) totalDuration += 3;
            else if (segment.url.includes('outro.webm')) totalDuration += 3;
            else if (segment.url.includes('-QID')) totalDuration += 5; // Question prompts
        } else if (segment.type === 'combine_with_background') {
            // Estimate based on number of answers (30 seconds per answer)
            const answerCount = segment.answerUrls ? segment.answerUrls.length : 0;
            totalDuration += answerCount * 30;
        }
    });
    
    return totalDuration;
}

/**
 * Helper function: Generate simple checksum for file list
 * @param {Array} files - Array of filenames
 * @returns {string} Simple checksum string
 */
function generateChecksum(files) {
    const sortedFiles = [...files].sort();
    const combined = sortedFiles.join(',');
    
    // Simple hash function (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
} 