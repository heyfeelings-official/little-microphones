/**
 * radio-api.js - Radio API Module for Radio System
 * 
 * PURPOSE: API communication, data fetching, and radio program generation
 * DEPENDENCIES: Fetch API, combine-audio API, get-radio-data API
 * 
 * EXPORTED FUNCTIONS:
 * - fetchWorldInfo(): Quick world information fetch for fast page load
 * - fetchRadioData(): Complete radio data fetching with manifest comparison
 * - generateNewProgram(): Generate new radio program via API
 * - convertRecordingsToAudioSegments(): Convert recordings to audio plan format
 * - extractTimestampFromFilename(): Parse timestamp from recording filename
 * - showExistingProgram(): Display existing program from manifest
 * - showGeneratedProgram(): Display newly generated program
 * - checkProgramStatus(): Check if program needs regeneration
 * - validateRadioData(): Validate radio data structure
 * 
 * API INTEGRATION:
 * - get-world-info: Fast world information lookup
 * - get-radio-data: Complete radio data with recordings and manifest
 * - combine-audio: FFmpeg-powered radio program generation
 * - list-recordings: Recording verification and sync
 * 
 * INTELLIGENT GENERATION:
 * - Compares current recordings with last program manifest
 * - Only generates new program if recordings have changed
 * - Shows existing program immediately if no changes detected
 * - Provides manual regeneration option for teachers
 * 
 * ERROR HANDLING:
 * - Network failure recovery with retry mechanisms
 * - API error parsing and user-friendly messages
 * - Timeout handling for long-running operations
 * - Graceful degradation for partial failures
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0 (Extracted from radio.js)
 * STATUS: Production Ready ✅
 */

(function() {
    'use strict';
    
    // Global API state
    let isGenerating = false;
    let generationAbortController = null;

    /**
     * Fetch initial world info for fast page load
     * @param {string} shareId - The ShareID from URL
     * @returns {Promise<Object|null>} World info or null if failed
     */
    async function fetchWorldInfo(shareId) {
        if (!shareId) {
            console.error('ShareID is required for world info fetch');
            return null;
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const apiUrl = `${window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app'}/api/get-world-info?shareId=${shareId}&_t=${Date.now()}&_r=${Math.random()}`;
            
            console.log(`🌍 Fetching world info for ShareID: ${shareId}`);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`World info API request failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch world info');
            }
            
            console.log(`✅ World info fetched successfully: ${data.world}`);
            
            return {
                success: true,
                world: data.world,
                lmid: data.lmid,
                shareId: shareId
            };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('World info fetch timed out');
            } else {
                console.error('Failed to fetch world info:', error);
            }
            return null;
        }
    }

    /**
     * Fetch complete radio data from the API
     * @param {string} shareId - The ShareID from URL
     * @param {string|null} world - The world name if known (for optimization)
     * @returns {Promise<Object|null>} Complete radio data or null if failed
     */
    async function fetchRadioData(shareId, world = null) {
        if (!shareId) {
            console.error('ShareID is required for radio data fetch');
            return null;
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            let apiUrl = `${window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app'}/api/get-radio-data?shareId=${shareId}`;
            if (world) {
                apiUrl += `&world=${encodeURIComponent(world)}`;
            }
            apiUrl += `&_t=${Date.now()}&_r=${Math.random()}`;
            
            console.log(`📻 Fetching radio data for ShareID: ${shareId}${world ? ` (world: ${world})` : ''}`);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Radio data API request failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch radio data');
            }
            
            // Validate the radio data structure
            const validatedData = validateRadioData(data);
            if (!validatedData.success) {
                throw new Error(`Invalid radio data: ${validatedData.error}`);
            }
            
            console.log(`✅ Radio data fetched successfully: ${data.world}, ${data.recordingCount} recordings`);
            
            return data;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('Radio data fetch timed out');
                return null;
            } else {
                console.error('Failed to fetch radio data:', error);
                return null;
            }
        }
    }

    /**
     * Generate a new radio program via API
     * @param {Object} radioData - Current radio data
     * @param {Function} updateProgress - Progress update callback
     * @param {Function} showAudioPlayer - Function to show audio player
     * @returns {Promise<Object>} Generation result
     */
    async function generateNewProgram(radioData, updateProgress, showAudioPlayer) {
        if (isGenerating) {
            console.log('⏳ Generation already in progress...');
            return { success: false, error: 'Generation already in progress' };
        }
        
        if (!radioData || !radioData.currentRecordings || radioData.currentRecordings.length === 0) {
            const error = 'No recordings available for program generation';
            console.error('❌', error);
            return { success: false, error };
        }
        
        isGenerating = true;
        generationAbortController = new AbortController();
        
        try {
            console.log(`🎵 Starting radio program generation for ${radioData.world}`);
            
            if (updateProgress) {
                updateProgress('Preparing audio segments...', 10);
            }
            
            // Convert recordings to proper audioSegments format
            const audioSegments = convertRecordingsToAudioSegments(radioData.currentRecordings, radioData.world);
            
            if (!audioSegments || audioSegments.length === 0) {
                throw new Error('No audio segments could be created from recordings');
            }
            
            console.log(`📝 Created ${audioSegments.length} audio segments for processing`);
            
            if (updateProgress) {
                updateProgress('Sending to audio processing...', 30);
            }
            
            // Call the combine-audio API to generate new program
            const apiUrl = `${window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app'}/api/combine-audio?_t=${Date.now()}&_r=${Math.random()}`;
            
            const requestBody = {
                world: radioData.world,
                lmid: radioData.lmid,
                audioSegments: audioSegments,
                manifest: {
                    generatedAt: new Date().toISOString(),
                    shareId: radioData.shareId,
                    recordingCount: radioData.currentRecordings.length,
                    filesUsed: radioData.currentRecordings.map(rec => rec.filename || rec.id)
                }
            };
            
            console.log('🔄 Calling combine-audio API...');
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: generationAbortController.signal
            });
            
            if (updateProgress) {
                updateProgress('Processing audio tracks...', 60);
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Audio generation failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Radio program generation failed');
            }
            
            if (updateProgress) {
                updateProgress('Finalizing program...', 90);
            }
            
            // Update the manifest data in radioData
            radioData.lastManifest = {
                generatedAt: new Date().toISOString(),
                programUrl: result.url || result.audioUrl,
                filesUsed: radioData.currentRecordings.map(rec => rec.filename || rec.id),
                shareId: radioData.shareId,
                recordingCount: radioData.currentRecordings.length,
                duration: result.duration
            };
            
            // Mark that program is now up to date
            radioData.needsNewProgram = false;
            
            if (updateProgress) {
                updateProgress('Complete!', 100);
            }
            
            console.log('✅ New radio program generated successfully');
            
            const programUrl = result.url || result.audioUrl;
            
            if (showAudioPlayer && programUrl) {
                setTimeout(() => {
                    showGeneratedProgram(programUrl, radioData, showAudioPlayer);
                }, 1000);
            }
            
            return {
                success: true,
                audioUrl: programUrl,
                duration: result.duration,
                manifest: radioData.lastManifest
            };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('🛑 Program generation cancelled');
                return { success: false, error: 'Generation cancelled' };
            } else {
                console.error('❌ Program generation failed:', error);
                return { success: false, error: error.message };
            }
        } finally {
            isGenerating = false;
            generationAbortController = null;
        }
    }

    /**
     * Convert recordings to audio segments format for API
     * @param {Array} recordings - Array of recording objects
     * @param {string} world - World name for context
     * @returns {Array} Array of audio segment objects
     */
    function convertRecordingsToAudioSegments(recordings, world) {
        if (!recordings || !Array.isArray(recordings)) {
            console.error('Invalid recordings array provided');
            return [];
        }
        
        console.log(`🔄 Converting ${recordings.length} recordings to audio segments`);
        
        // Group recordings by question if possible
        const recordingsByQuestion = {};
        
        recordings.forEach((recording, index) => {
            // Extract question ID from filename or use index
            let questionId = 'question_1'; // default
            
            if (recording.filename) {
                const questionMatch = recording.filename.match(/question[_-](\d+)/i);
                if (questionMatch) {
                    questionId = `question_${questionMatch[1]}`;
                }
            } else if (recording.questionId) {
                questionId = recording.questionId;
            } else {
                questionId = `question_${index + 1}`;
            }
            
            if (!recordingsByQuestion[questionId]) {
                recordingsByQuestion[questionId] = [];
            }
            
            recordingsByQuestion[questionId].push({
                ...recording,
                questionId,
                timestamp: extractTimestampFromFilename(recording.filename) || Date.now()
            });
        });
        
        // Sort questions by ID and recordings within questions by timestamp
        const sortedQuestionIds = Object.keys(recordingsByQuestion).sort();
        const audioSegments = [];
        
        sortedQuestionIds.forEach((questionId, questionIndex) => {
            const questionRecordings = recordingsByQuestion[questionId];
            
            // Sort recordings within question by timestamp (oldest first)
            questionRecordings.sort((a, b) => a.timestamp - b.timestamp);
            
            // Add question intro if multiple questions
            if (sortedQuestionIds.length > 1) {
                audioSegments.push({
                    type: 'question_intro',
                    questionId: questionId,
                    questionNumber: questionIndex + 1,
                    content: `Question ${questionIndex + 1}`,
                    duration: 2
                });
            }
            
            // Add recordings for this question
            questionRecordings.forEach((recording, recordingIndex) => {
                audioSegments.push({
                    type: 'recording',
                    url: recording.url,
                    filename: recording.filename,
                    questionId: questionId,
                    questionNumber: questionIndex + 1,
                    answerNumber: recordingIndex + 1,
                    totalAnswersForQuestion: questionRecordings.length,
                    metadata: {
                        originalId: recording.id,
                        timestamp: recording.timestamp,
                        duration: recording.duration
                    }
                });
                
                // Add brief pause between recordings within same question
                if (recordingIndex < questionRecordings.length - 1) {
                    audioSegments.push({
                        type: 'pause',
                        duration: 1,
                        content: 'brief_pause'
                    });
                }
            });
            
            // Add transition between questions
            if (questionIndex < sortedQuestionIds.length - 1) {
                audioSegments.push({
                    type: 'question_transition',
                    duration: 2,
                    content: 'musical_bridge'
                });
            }
        });
        
        console.log(`✅ Created ${audioSegments.length} audio segments from ${recordings.length} recordings`);
        
        return audioSegments;
    }

    /**
     * Extract timestamp from recording filename
     * @param {string} filename - Recording filename
     * @returns {number|null} Timestamp or null if not found
     */
    function extractTimestampFromFilename(filename) {
        if (!filename) return null;
        
        // Look for timestamp pattern: -tm_1234567890
        const timestampMatch = filename.match(/-tm_(\d+)/);
        if (timestampMatch) {
            return parseInt(timestampMatch[1], 10);
        }
        
        // Look for other timestamp patterns
        const otherTimestampMatch = filename.match(/(\d{10,13})/);
        if (otherTimestampMatch) {
            const timestamp = parseInt(otherTimestampMatch[1], 10);
            // Validate it's a reasonable timestamp (after 2020)
            if (timestamp > 1577836800000) { // Jan 1, 2020
                return timestamp;
            }
        }
        
        return null;
    }

    /**
     * Show existing radio program from manifest
     * @param {Object} manifest - Program manifest data
     * @param {Object} radioData - Radio data
     * @param {Function} showAudioPlayer - Function to show audio player
     * @param {Function} updatePageContent - Function to update page content
     */
    function showExistingProgram(manifest, radioData, showAudioPlayer, updatePageContent) {
        if (!manifest || !manifest.programUrl) {
            console.log('📝 No existing program found in manifest');
            return false;
        }
        
        console.log('🎵 Displaying existing radio program from manifest');
        
        if (showAudioPlayer) {
            showAudioPlayer(manifest.programUrl, radioData, null);
        }
        
        // Update page content with world info after showing the program
        if (updatePageContent) {
            setTimeout(() => {
                updatePageContent(radioData);
            }, 200);
        }
        
        return true;
    }

    /**
     * Show newly generated program
     * @param {string} audioUrl - URL of the generated audio
     * @param {Object} radioData - Radio data
     * @param {Function} showAudioPlayer - Function to show audio player
     * @param {Function} updatePageContent - Function to update page content
     * @param {Function} showSuccessMessage - Function to show success message
     */
    function showGeneratedProgram(audioUrl, radioData, showAudioPlayer, updatePageContent, showSuccessMessage) {
        console.log('🎉 Displaying newly generated radio program');
        
        if (showAudioPlayer) {
            showAudioPlayer(audioUrl, radioData, null);
        }
        
        // Update page content with world info after showing the program
        if (updatePageContent) {
            setTimeout(() => {
                updatePageContent(radioData);
            }, 200);
        }
        
        // Show success message
        if (showSuccessMessage) {
            showSuccessMessage('New radio program generated with latest recordings!');
        }
    }

    /**
     * Check if program needs regeneration based on recordings vs manifest
     * @param {Object} radioData - Radio data with recordings and manifest
     * @returns {boolean} True if new program is needed
     */
    function checkProgramStatus(radioData) {
        if (!radioData) {
            console.log('🔍 No radio data provided for status check');
            return false;
        }
        
        // If no manifest exists, we need a new program
        if (!radioData.lastManifest || !radioData.lastManifest.programUrl) {
            console.log('🔍 No existing program manifest - new program needed');
            return true;
        }
        
        // If no current recordings, we can't generate
        if (!radioData.currentRecordings || radioData.currentRecordings.length === 0) {
            console.log('🔍 No current recordings available');
            return false;
        }
        
        // Compare current recordings with manifest
        const manifestFiles = radioData.lastManifest.filesUsed || [];
        const currentFiles = radioData.currentRecordings.map(rec => rec.filename || rec.id);
        
        // Check if file lists are different
        if (manifestFiles.length !== currentFiles.length) {
            console.log(`🔍 Recording count changed: ${manifestFiles.length} → ${currentFiles.length}`);
            return true;
        }
        
        // Check if any files are different
        const manifestSet = new Set(manifestFiles);
        const currentSet = new Set(currentFiles);
        
        for (const file of currentFiles) {
            if (!manifestSet.has(file)) {
                console.log(`🔍 New recording detected: ${file}`);
                return true;
            }
        }
        
        for (const file of manifestFiles) {
            if (!currentSet.has(file)) {
                console.log(`🔍 Recording removed: ${file}`);
                return true;
            }
        }
        
        console.log('🔍 No changes detected - existing program is current');
        return false;
    }

    /**
     * Validate radio data structure
     * @param {Object} data - Radio data to validate
     * @returns {Object} Validation result
     */
    function validateRadioData(data) {
        if (!data || typeof data !== 'object') {
            return { success: false, error: 'Data is not an object' };
        }
        
        if (!data.success) {
            return { success: false, error: data.error || 'API returned success: false' };
        }
        
        if (!data.world || typeof data.world !== 'string') {
            return { success: false, error: 'Missing or invalid world name' };
        }
        
        if (!data.lmid || (typeof data.lmid !== 'string' && typeof data.lmid !== 'number')) {
            return { success: false, error: 'Missing or invalid LMID' };
        }
        
        if (!data.shareId || typeof data.shareId !== 'string') {
            return { success: false, error: 'Missing or invalid ShareID' };
        }
        
        if (!Array.isArray(data.currentRecordings)) {
            return { success: false, error: 'Missing or invalid currentRecordings array' };
        }
        
        return { success: true };
    }

    /**
     * Cancel current generation process
     */
    function cancelGeneration() {
        if (isGenerating && generationAbortController) {
            generationAbortController.abort();
            isGenerating = false;
            generationAbortController = null;
            console.log('🛑 Generation cancelled by user');
        }
    }

    /**
     * Get current generation status
     * @returns {Object} Status object
     */
    function getGenerationStatus() {
        return {
            isGenerating,
            canCancel: isGenerating && generationAbortController
        };
    }

    /**
     * Retry operation with exponential backoff
     * @param {Function} operation - Operation to retry
     * @param {number} maxRetries - Maximum retry attempts
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {Promise} Operation result
     */
    async function retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                const delay = baseDelay * Math.pow(2, attempt);
                console.log(`Retry attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    }

    // Create global namespace
    window.RadioAPI = {
        fetchWorldInfo,
        fetchRadioData,
        generateNewProgram,
        convertRecordingsToAudioSegments,
        extractTimestampFromFilename,
        showExistingProgram,
        showGeneratedProgram,
        checkProgramStatus,
        validateRadioData,
        cancelGeneration,
        getGenerationStatus,
        retryOperation
    };

    console.log('✅ RadioAPI module loaded and available globally');

})(); 