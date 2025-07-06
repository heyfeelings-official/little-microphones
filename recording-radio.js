/**
 * recording-radio.js - Radio Program Generation Module
 * 
 * PURPOSE: Generate professional radio programs from multiple recordings
 * DEPENDENCIES: FFmpeg processing API, audio collection utilities
 * 
 * EXPORTED FUNCTIONS:
 * - generateRadioProgram(): Main radio program generation function
 * - collectRecordingsForRadioProgram(): Collect and organize recordings
 * - sortQuestionIdsByDOMOrder(): Sort questions by DOM appearance order
 * - validateRadioProgramRequirements(): Validate requirements for generation
 * - createAudioPlan(): Create audio processing plan
 * - processRadioAudioPlan(): Process audio plan via API
 * 
 * RADIO GENERATION FEATURES:
 * - Multi-question recording collection
 * - Professional audio mixing with background music
 * - Question-based organization with chronological ordering
 * - FFmpeg-powered audio processing
 * - Progress tracking with animated feedback
 * - Error handling and retry mechanisms
 * 
 * AUDIO PROCESSING PIPELINE:
 * 1. Collection: Gather recordings from all questions
 * 2. Organization: Sort by question order and chronology
 * 3. Planning: Create audio mixing plan with timing
 * 4. Processing: FFmpeg mixing with intro/outro/transitions
 * 5. Upload: Final radio program uploaded to CDN
 * 6. Delivery: Success modal with download options
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0 (Extracted from recording.js)
 * STATUS: Production Ready ✅
 */

(function() {
    'use strict';
    
    /**
     * Generate radio program from recordings
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @param {Object} dependencies - Dependencies object
     * @returns {Promise<Object>} Generation result
     */
    async function generateRadioProgram(world, lmid, dependencies) {
        const {
            getAllRecordingsForWorldLmid,
            discoverQuestionIdsFromDB,
            showRadioProgramModal,
            updateRadioProgramProgress,
            showRadioProgramSuccess,
            hideRadioProgramModal,
            startFunStatusMessages,
            stopFunStatusMessages,
            log
        } = dependencies;

        try {
            // Show initial modal
            showRadioProgramModal('Preparing radio program generation...', 0);
            
            // Step 1: Collect recordings
            updateRadioProgramProgress('Collecting your recordings...', 10);
            const result = await collectRecordingsForRadioProgram(world, lmid, {
                getAllRecordingsForWorldLmid,
                discoverQuestionIdsFromDB,
                log
            });
            
            if (!result.success) {
                hideRadioProgramModal();
                alert(result.error);
                return { success: false, error: result.error };
            }
            
            const { recordings, questionCount, totalRecordings } = result;
            
            // Step 2: Validate requirements
            updateRadioProgramProgress('Validating recordings...', 20);
            const validation = validateRadioProgramRequirements(recordings);
            if (!validation.success) {
                hideRadioProgramModal();
                alert(validation.error);
                return { success: false, error: validation.error };
            }
            
            // Step 3: Create audio plan
            updateRadioProgramProgress('Creating audio plan...', 30);
            const audioPlan = createAudioPlan(recordings, world, lmid);
            
            // Step 4: Start fun status messages
            startFunStatusMessages();
            
            // Step 5: Process audio
            updateRadioProgramProgress('Mixing your audio masterpiece...', 40);
            const processResult = await processRadioAudioPlan(audioPlan, world, lmid, updateRadioProgramProgress);
            
            stopFunStatusMessages();
            
            if (!processResult.success) {
                hideRadioProgramModal();
                alert(`Radio program generation failed: ${processResult.error}`);
                return { success: false, error: processResult.error };
            }
            
            // Step 6: Success!
            updateRadioProgramProgress('Radio program ready!', 100);
            
            setTimeout(() => {
                showRadioProgramSuccess(
                    processResult.audioUrl,
                    world,
                    lmid,
                    questionCount,
                    totalRecordings
                );
            }, 1000);
            
            log('info', `Radio program generated successfully: ${processResult.audioUrl}`);
            
            return {
                success: true,
                audioUrl: processResult.audioUrl,
                questionCount,
                totalRecordings
            };
            
        } catch (error) {
            stopFunStatusMessages();
            hideRadioProgramModal();
            log('error', 'Radio program generation failed:', error);
            alert(`Unexpected error during radio program generation: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Collect recordings for radio program generation
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @param {Object} dependencies - Dependencies object
     * @returns {Promise<Object>} Collection result
     */
    async function collectRecordingsForRadioProgram(world, lmid, dependencies) {
        const { getAllRecordingsForWorldLmid, discoverQuestionIdsFromDB, log } = dependencies;
        
        try {
            // Get all recordings for this world/lmid
            const allRecordings = await getAllRecordingsForWorldLmid(world, lmid);
            
            if (!allRecordings || allRecordings.length === 0) {
                return {
                    success: false,
                    error: 'No recordings found for this world. Please record some answers first!'
                };
            }
            
            // Filter to only uploaded recordings with cloud URLs
            const uploadedRecordings = allRecordings.filter(recording => 
                recording.uploadStatus === 'uploaded' && recording.cloudUrl
            );
            
            if (uploadedRecordings.length === 0) {
                return {
                    success: false,
                    error: 'No uploaded recordings found. Please wait for uploads to complete or try recording again.'
                };
            }
            
            // Group recordings by question
            const recordingsByQuestion = {};
            uploadedRecordings.forEach(recording => {
                if (!recordingsByQuestion[recording.questionId]) {
                    recordingsByQuestion[recording.questionId] = [];
                }
                recordingsByQuestion[recording.questionId].push(recording);
            });
            
            // Get question IDs and sort them by DOM order
            const questionIds = Object.keys(recordingsByQuestion);
            const sortedQuestionIds = sortQuestionIdsByDOMOrder(questionIds, world);
            
            // Build organized recordings array
            const organizedRecordings = [];
            
            sortedQuestionIds.forEach(questionId => {
                const questionRecordings = recordingsByQuestion[questionId];
                
                // Sort recordings within question by timestamp (oldest first for chronological order)
                questionRecordings.sort((a, b) => {
                    const timestampA = parseInt(a.id.split('-tm_')[1]) || 0;
                    const timestampB = parseInt(b.id.split('-tm_')[1]) || 0;
                    return timestampA - timestampB;
                });
                
                // Add all recordings for this question
                questionRecordings.forEach((recording, index) => {
                    organizedRecordings.push({
                        ...recording,
                        questionOrder: sortedQuestionIds.indexOf(questionId) + 1,
                        answerNumber: index + 1,
                        totalAnswersForQuestion: questionRecordings.length
                    });
                });
            });
            
            log('info', `Collected ${organizedRecordings.length} recordings from ${sortedQuestionIds.length} questions`);
            
            return {
                success: true,
                recordings: organizedRecordings,
                questionCount: sortedQuestionIds.length,
                totalRecordings: organizedRecordings.length,
                questionIds: sortedQuestionIds
            };
            
        } catch (error) {
            log('error', 'Failed to collect recordings for radio program:', error);
            return {
                success: false,
                error: `Failed to collect recordings: ${error.message}`
            };
        }
    }

    /**
     * Sort question IDs by their DOM appearance order
     * @param {Array} questionIds - Array of question IDs
     * @param {string} world - World name for context
     * @returns {Array} Sorted question IDs
     */
    function sortQuestionIdsByDOMOrder(questionIds, world) {
        // Try to find questions in DOM to determine order
        const questionsInDOM = [];
        
        questionIds.forEach(questionId => {
            // Look for elements with data-question-id or elements containing the question ID
            const questionElement = document.querySelector(`[data-question-id="${questionId}"]`) ||
                                  document.querySelector(`[data-question="${questionId}"]`) ||
                                  document.querySelector(`#question-${questionId}`) ||
                                  document.querySelector(`#${questionId}`);
            
            if (questionElement) {
                const rect = questionElement.getBoundingClientRect();
                const position = rect.top + window.scrollY;
                
                questionsInDOM.push({
                    questionId,
                    position,
                    element: questionElement
                });
            } else {
                // If not found in DOM, add with high position to put at end
                questionsInDOM.push({
                    questionId,
                    position: 999999,
                    element: null
                });
            }
        });
        
        // Sort by DOM position (top to bottom)
        questionsInDOM.sort((a, b) => a.position - b.position);
        
        return questionsInDOM.map(item => item.questionId);
    }

    /**
     * Validate requirements for radio program generation
     * @param {Array} recordings - Array of recordings
     * @returns {Object} Validation result
     */
    function validateRadioProgramRequirements(recordings) {
        if (!recordings || recordings.length === 0) {
            return {
                success: false,
                error: 'No recordings available for radio program generation.'
            };
        }
        
        // Check for minimum recordings
        if (recordings.length < 1) {
            return {
                success: false,
                error: 'At least 1 recording is required to generate a radio program.'
            };
        }
        
        // Check that all recordings have cloud URLs
        const recordingsWithoutUrl = recordings.filter(r => !r.cloudUrl);
        if (recordingsWithoutUrl.length > 0) {
            return {
                success: false,
                error: `${recordingsWithoutUrl.length} recordings are missing cloud URLs. Please wait for uploads to complete.`
            };
        }
        
        // Check for at least one question
        const uniqueQuestions = [...new Set(recordings.map(r => r.questionId))];
        if (uniqueQuestions.length === 0) {
            return {
                success: false,
                error: 'No valid questions found in recordings.'
            };
        }
        
        return {
            success: true,
            totalRecordings: recordings.length,
            questionCount: uniqueQuestions.length
        };
    }

    /**
     * Create audio processing plan
     * @param {Array} recordings - Organized recordings array
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @returns {Object} Audio processing plan
     */
    function createAudioPlan(recordings, world, lmid) {
        const plan = {
            metadata: {
                world,
                lmid,
                totalRecordings: recordings.length,
                questionCount: [...new Set(recordings.map(r => r.questionId))].length,
                generatedAt: new Date().toISOString()
            },
            audioSegments: [],
            processingOptions: {
                includeIntro: true,
                includeOutro: true,
                includeTransitions: true,
                includeBackgroundMusic: true,
                normalizeAudio: true,
                fadeInOut: true
            }
        };
        
        // Add intro segment
        plan.audioSegments.push({
            type: 'intro',
            duration: 5, // seconds
            content: `Welcome to ${world} radio program!`
        });
        
        // Group recordings by question and add segments
        const recordingsByQuestion = {};
        recordings.forEach(recording => {
            if (!recordingsByQuestion[recording.questionId]) {
                recordingsByQuestion[recording.questionId] = [];
            }
            recordingsByQuestion[recording.questionId].push(recording);
        });
        
        // Add question segments in order
        const questionIds = sortQuestionIdsByDOMOrder(Object.keys(recordingsByQuestion), world);
        
        questionIds.forEach((questionId, questionIndex) => {
            const questionRecordings = recordingsByQuestion[questionId];
            
            // Add question intro if multiple questions
            if (questionIds.length > 1) {
                plan.audioSegments.push({
                    type: 'question_intro',
                    questionId,
                    questionNumber: questionIndex + 1,
                    duration: 2,
                    content: `Question ${questionIndex + 1}`
                });
            }
            
            // Add recordings for this question
            questionRecordings.forEach((recording, recordingIndex) => {
                plan.audioSegments.push({
                    type: 'recording',
                    recordingId: recording.id,
                    cloudUrl: recording.cloudUrl,
                    questionId: recording.questionId,
                    questionNumber: questionIndex + 1,
                    answerNumber: recordingIndex + 1,
                    totalAnswersForQuestion: questionRecordings.length
                });
                
                // Add transition between recordings within same question
                if (recordingIndex < questionRecordings.length - 1) {
                    plan.audioSegments.push({
                        type: 'transition',
                        duration: 1,
                        content: 'brief_pause'
                    });
                }
            });
            
            // Add transition between questions
            if (questionIndex < questionIds.length - 1) {
                plan.audioSegments.push({
                    type: 'question_transition',
                    duration: 2,
                    content: 'musical_bridge'
                });
            }
        });
        
        // Add outro segment
        plan.audioSegments.push({
            type: 'outro',
            duration: 3,
            content: `Thank you for listening to ${world} radio program!`
        });
        
        return plan;
    }

    /**
     * Process audio plan via API
     * @param {Object} audioPlan - Audio processing plan
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @param {Function} progressCallback - Progress update callback
     * @returns {Promise<Object>} Processing result
     */
    async function processRadioAudioPlan(audioPlan, world, lmid, progressCallback) {
        try {
            // Call the combine-audio API endpoint
            const response = await fetch(`${window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app'}/api/combine-audio`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    world,
                    lmid,
                    audioPlan
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update progress to completion
                if (progressCallback) {
                    progressCallback('Finalizing radio program...', 90);
                }
                
                return {
                    success: true,
                    audioUrl: result.audioUrl,
                    duration: result.duration,
                    segmentCount: audioPlan.audioSegments.length
                };
            } else {
                return {
                    success: false,
                    error: result.error || 'Audio processing failed'
                };
            }
            
        } catch (error) {
            console.error('Audio processing API error:', error);
            return {
                success: false,
                error: `API communication failed: ${error.message}`
            };
        }
    }

    /**
     * Get radio program generation status
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @param {Object} dependencies - Dependencies object
     * @returns {Promise<Object>} Generation status
     */
    async function getRadioGenerationStatus(world, lmid, dependencies) {
        const { getAllRecordingsForWorldLmid, discoverQuestionIdsFromDB } = dependencies;
        
        try {
            const recordings = await getAllRecordingsForWorldLmid(world, lmid);
            const uploadedRecordings = recordings.filter(r => 
                r.uploadStatus === 'uploaded' && r.cloudUrl
            );
            const questionIds = await discoverQuestionIdsFromDB(world, lmid);
            
            return {
                success: true,
                status: {
                    totalRecordings: recordings.length,
                    uploadedRecordings: uploadedRecordings.length,
                    pendingUploads: recordings.filter(r => r.uploadStatus === 'pending').length,
                    failedUploads: recordings.filter(r => r.uploadStatus === 'failed').length,
                    questionCount: questionIds.length,
                    canGenerate: uploadedRecordings.length > 0,
                    readyForGeneration: uploadedRecordings.length === recordings.length
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create global namespace
    window.RecordingRadio = {
        generateRadioProgram,
        collectRecordingsForRadioProgram,
        sortQuestionIdsByDOMOrder,
        validateRadioProgramRequirements,
        createAudioPlan,
        processRadioAudioPlan,
        getRadioGenerationStatus
    };

    console.log('✅ RecordingRadio module loaded and available globally');

})(); 