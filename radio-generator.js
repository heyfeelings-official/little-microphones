/**
 * radio-generator.js - Unified Radio Program Generation Script
 * 
 * PURPOSE: Frontend script for radio program generation that can be included in any page
 * USAGE: Include this script in Webflow pages, recording interfaces, or radio pages
 * 
 * PROVIDES:
 * - window.RadioGenerator.generateProgram(world, lmid, recordings)
 * - window.RadioGenerator.generateFromShareId(shareId)
 * - window.RadioGenerator.checkStatus(shareId)
 * 
 * EXAMPLE USAGE:
 * 
 * // Include in HTML:
 * <script src="radio-generator.js"></script>
 * 
 * // Use in your code:
 * const result = await window.RadioGenerator.generateProgram('spookyland', '38', recordings);
 * if (result.success) {
 *   console.log('Program URL:', result.url);
 * }
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Production Ready ✅
 */

(function() {
    'use strict';
    
    // Create global RadioGenerator namespace
    window.RadioGenerator = window.RadioGenerator || {};
    
    /**
     * Convert raw recordings to audioSegments format expected by combine-audio API
     * @param {Array} recordings - Raw recordings array
     * @param {string} world - World name
     * @returns {Array} Formatted audioSegments
     */
    function convertRecordingsToAudioSegments(recordings, world) {
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
                answerUrls: sortedAnswers.map(recording => recording.url || recording.cloudUrl),
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
    function extractTimestampFromFilename(filename) {
        const match = filename.match(/tm_(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }
    
    /**
     * Generate radio program from recordings
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @param {Array} recordings - Array of recording objects
     * @param {Object} options - Optional configuration
     * @returns {Promise<Object>} Result object with success, url, etc.
     */
    async function generateRadioProgram(world, lmid, recordings, options = {}) {
        try {
                         console.log(`🎵 RadioGenerator: Starting radio program generation for ${world}/${lmid}`);
            
            if (!recordings || recordings.length === 0) {
                throw new Error('No recordings provided for radio program generation');
            }
            
            // Convert recordings to proper audioSegments format
            const audioSegments = convertRecordingsToAudioSegments(recordings, world);
            
            // Optional progress callback
            if (options.onProgress) {
                options.onProgress('Converting recordings...', 10);
            }
            
            // Call the combine-audio API
            const response = await fetch('https://little-microphones.vercel.app/api/combine-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    world: world,
                    lmid: lmid,
                    audioSegments: audioSegments
                })
            });
            
            if (options.onProgress) {
                options.onProgress('Processing audio...', 50);
            }
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Radio program generation failed');
            }
            
            if (options.onProgress) {
                options.onProgress('Complete!', 100);
            }
            
                         console.log('✅ RadioGenerator: Radio program generated successfully');
            
            return {
                success: true,
                url: result.url,
                manifest: result.manifest,
                totalSegments: result.totalSegments,
                message: result.message
            };
            
                 } catch (error) {
             console.error('❌ RadioGenerator: Radio program generation failed:', error);
            
            return {
                success: false,
                error: error.message,
                details: error
            };
        }
    }
    
    /**
     * Check if a new radio program is needed (fetch radio data)
     * @param {string} shareId - ShareID for the program
     * @returns {Promise<Object>} Radio data with needsNewProgram flag
     */
    async function checkProgramStatus(shareId) {
        try {
            const response = await fetch(`https://little-microphones.vercel.app/api/get-radio-data?shareId=${shareId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch radio data: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch radio data');
            }
            
            return data;
            
                 } catch (error) {
             console.error('❌ RadioGenerator: Failed to check program status:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Generate radio program using ShareID (for radio pages)
     * @param {string} shareId - ShareID
     * @param {Object} options - Optional configuration
     * @returns {Promise<Object>} Result object
     */
    async function generateRadioProgramFromShareId(shareId, options = {}) {
        try {
            // First get the radio data
            const radioData = await checkProgramStatus(shareId);
            
            if (!radioData.success) {
                throw new Error(radioData.error || 'Failed to fetch radio data');
            }
            
            // Check if we need a new program
        console.log(`🔍 RadioGenerator: Checking program status - needsNewProgram: ${radioData.needsNewProgram}, hasManifest: ${!!radioData.lastManifest}, hasURL: ${!!(radioData.lastManifest?.programUrl)}`);
        
                         if (!radioData.needsNewProgram && radioData.lastManifest && radioData.lastManifest.programUrl) {
                 console.log('✅ RadioGenerator: Program is up to date - returning existing program');
                console.log(`🎵 Using cached program: ${radioData.lastManifest.programUrl}`);
                return {
                    success: true,
                    url: radioData.lastManifest.programUrl,
                    manifest: radioData.lastManifest,
                    fromCache: true
                };
            }
            
            console.log('🔄 RadioGenerator: Generating new program - files have changed or no existing program found');
            
            // Generate new program
            return await generateRadioProgram(
                radioData.world, 
                radioData.lmid, 
                radioData.currentRecordings, 
                options
            );
            
                 } catch (error) {
             console.error('❌ RadioGenerator: ShareID generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Export public API with cleaner names
    window.RadioGenerator = {
        // Main functions (simplified names)
        generateProgram: generateRadioProgram,
        generateFromShareId: generateRadioProgramFromShareId,
        checkStatus: checkProgramStatus,
        
        // Utility functions (for advanced usage)
        convertRecordingsToAudioSegments: convertRecordingsToAudioSegments,
        extractTimestampFromFilename: extractTimestampFromFilename,
        
        // Version info
        version: '1.0.0',
        
        // Legacy aliases (for backward compatibility)
        generateRadioProgram: generateRadioProgram,
        generateRadioProgramFromShareId: generateRadioProgramFromShareId,
        checkProgramStatus: checkProgramStatus
    };
    
    console.log('🎵 RadioGenerator v1.0.0 loaded and ready');
    
})(); 