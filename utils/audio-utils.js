/**
 * audio-utils.js - Shared Audio Processing Utilities
 * 
 * PURPOSE: Centralized audio processing utilities to avoid code duplication
 * USAGE: Import functions in radio.js, combine-audio.js, and other audio-related scripts
 */

/**
 * Convert raw recordings to audioSegments format expected by combine-audio API
 * @param {Array} recordings - Raw recordings from get-radio-data
 * @param {string} world - World name
 * @returns {Array} Formatted audioSegments
 */
export function convertRecordingsToAudioSegments(recordings, world) {
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
    
    // 1. Add intro
    const introTimestamp = Date.now();
    audioSegments.push({
        type: 'single',
        url: `https://little-microphones.b-cdn.net/audio/other/intro.mp3?t=${introTimestamp}`
    });
    
    // 2. Add questions and answers in order
    sortedQuestionIds.forEach(questionId => {
        const questionRecordings = recordingsByQuestion[questionId];
        
        // Add question prompt
        const cacheBustTimestamp = Date.now() + Math.random();
        audioSegments.push({
            type: 'single',
            url: `https://little-microphones.b-cdn.net/audio/${world}/${world}-QID${questionId}.mp3?t=${cacheBustTimestamp}`
        });
        
        // Sort answers by filename timestamp (first recorded = first played)
        const sortedAnswers = questionRecordings.sort((a, b) => {
            const timestampA = extractTimestampFromFilename(a.filename);
            const timestampB = extractTimestampFromFilename(b.filename);
            return timestampA - timestampB;
        });
        
        // Combine answers with background music
        const backgroundTimestamp = Date.now() + Math.random();
        audioSegments.push({
            type: 'combine_with_background',
            answerUrls: sortedAnswers.map(recording => recording.url),
            backgroundUrl: `https://little-microphones.b-cdn.net/audio/other/monkeys.mp3?t=${backgroundTimestamp}`,
            questionId: questionId
        });
    });
    
    // 3. Add outro
    const outroTimestamp = Date.now() + 1;
    audioSegments.push({
        type: 'single',
        url: `https://little-microphones.b-cdn.net/audio/other/outro.mp3?t=${outroTimestamp}`
    });
    
    console.log(`🎼 Generated ${audioSegments.length} audio segments for ${sortedQuestionIds.length} questions`);
    return audioSegments;
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
 * Static file URLs for audio processing
 */
export const STATIC_FILES = {
    intro: 'https://little-microphones.b-cdn.net/audio/other/intro.mp3',
    outro: 'https://little-microphones.b-cdn.net/audio/other/outro.mp3',
    monkeys: 'https://little-microphones.b-cdn.net/audio/other/monkeys.mp3'
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