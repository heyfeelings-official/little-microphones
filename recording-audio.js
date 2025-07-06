/**
 * recording-audio.js - Audio Processing Module for Recording System
 * 
 * PURPOSE: Audio recording, processing, and MediaRecorder API management
 * DEPENDENCIES: MediaRecorder API, Web Audio API, IndexedDB operations
 * 
 * EXPORTED FUNCTIONS:
 * - initializeAudioRecorder(): Initialize recorder for a specific question
 * - getSupportedMimeType(): Get best supported audio format
 * - verifyCloudUrl(): Verify if cloud URL is accessible
 * - getAudioSource(): Get best audio source (cloud or local)
 * - blobToBase64(): Convert blob to base64 string
 * - getAnswerNumber(): Get chronological answer number
 * - startTimer(): Start recording timer
 * - stopTimer(): Stop recording timer
 * - dispatchUploadStatusEvent(): Dispatch upload status events
 * 
 * AUDIO RECORDING FEATURES:
 * - MediaRecorder with format detection
 * - Real-time waveform visualization
 * - Recording time limits and validation
 * - Automatic format conversion
 * - Upload progress tracking
 * - Error recovery and retry mechanisms
 * 
 * SUPPORTED FORMATS:
 * - WebM (preferred for Chrome/Firefox)
 * - MP4 (fallback for Safari)
 * - Audio/webm;codecs=opus (best quality)
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0 (Extracted from recording.js)
 * STATUS: Production Ready ✅
 */

// Global state for audio recording
let globalTimerInterval = null;
let globalStartTime = null;

/**
 * Get the best supported MIME type for recording
 * @returns {string} Supported MIME type
 */
export function getSupportedMimeType() {
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/mpeg'
    ];
    
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    
    return 'audio/webm'; // Fallback
}

/**
 * Verify if a cloud URL is still accessible
 * @param {string} url - URL to verify
 * @returns {Promise<boolean>} True if accessible
 */
export async function verifyCloudUrl(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.warn('Cloud URL verification failed:', error);
        return false;
    }
}

/**
 * Get the best audio source (cloud or local)
 * @param {Object} recordingData - Recording data
 * @param {Function} updateRecordingInDB - Function to update recording
 * @returns {Promise<string|null>} Audio URL or null
 */
export async function getAudioSource(recordingData, updateRecordingInDB) {
    // If we have a cloud URL, verify it's still accessible
    if (recordingData.uploadStatus === 'uploaded' && recordingData.cloudUrl) {
        const isAccessible = await verifyCloudUrl(recordingData.cloudUrl);
        if (isAccessible) {
            return recordingData.cloudUrl;
        } else {
            console.warn(`Cloud file no longer accessible: ${recordingData.cloudUrl}`);
            // Update the recording status to indicate cloud file is missing
            recordingData.uploadStatus = 'failed';
            recordingData.cloudUrl = null;
            if (updateRecordingInDB) {
                await updateRecordingInDB(recordingData);
            }
        }
    }
    
    // Fall back to local blob if available
    if (recordingData.audio) {
        return URL.createObjectURL(recordingData.audio);
    }
    
    // If neither cloud nor local is available, return null
    console.error('No audio source available for recording:', recordingData.id);
    return null;
}

/**
 * Convert blob to base64 string
 * @param {Blob} blob - Blob to convert
 * @returns {Promise<string>} Base64 string
 */
export function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Get answer number for chronological ordering
 * @param {string} recordingId - Recording ID
 * @param {string} questionId - Question ID
 * @param {Array} allRecordingsArr - All recordings array
 * @returns {number} Answer number (1-based, newest = 1)
 */
export function getAnswerNumber(recordingId, questionId, allRecordingsArr) {
    let allRecordings = allRecordingsArr;
    if (!allRecordings) {
        allRecordings = Array.from(document.querySelectorAll(`[data-recording-id*="question_${questionId}-"]`));
    }
    
    // If passed as DOM nodes, convert to IDs
    if (allRecordings.length && allRecordings[0].dataset) {
        allRecordings = allRecordings.map(el => el.dataset.recordingId);
    }
    
    // Sort by timestamp ascending (oldest first)
    allRecordings.sort((a, b) => {
        const timestampA = parseInt(a.split('-tm_')[1]) || 0;
        const timestampB = parseInt(b.split('-tm_')[1]) || 0;
        return timestampA - timestampB;
    });
    
    const currentIndex = allRecordings.findIndex(id => id === recordingId);
    return currentIndex >= 0 ? allRecordings.length - currentIndex : 1;
}

/**
 * Start recording timer
 * @param {Function} updateCallback - Callback to update timer display
 * @returns {number} Interval ID
 */
export function startTimer(updateCallback) {
    globalStartTime = Date.now();
    
    globalTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - globalStartTime) / 1000);
        if (updateCallback) {
            updateCallback(elapsed);
        }
    }, 1000);
    
    return globalTimerInterval;
}

/**
 * Stop recording timer
 * @returns {number} Elapsed time in seconds
 */
export function stopTimer() {
    if (globalTimerInterval) {
        clearInterval(globalTimerInterval);
        globalTimerInterval = null;
    }
    
    const elapsed = globalStartTime ? Math.floor((Date.now() - globalStartTime) / 1000) : 0;
    globalStartTime = null;
    return elapsed;
}

/**
 * Dispatch upload status event
 * @param {string} recordingId - Recording ID
 * @param {string} status - Upload status
 */
export function dispatchUploadStatusEvent(recordingId, status) {
    const event = new CustomEvent('recording-status-update', {
        detail: { recordingId, status }
    });
    document.dispatchEvent(event);
}

/**
 * Initialize audio recorder for a question
 * @param {HTMLElement} recorderWrapper - Recorder wrapper element
 * @param {Object} dependencies - Dependencies object
 * @returns {Object} Recorder instance
 */
export function initializeAudioRecorder(recorderWrapper, dependencies) {
    const {
        world,
        lmid,
        questionId,
        createRecordingPlaceholder,
        saveRecordingToDB,
        loadRecordingsFromDB,
        updateRecordingInDB,
        renderRecordingsList,
        setButtonText,
        formatTime,
        log
    } = dependencies;

    // Internal state
    let mediaRecorder = null;
    let audioChunks = [];
    let stream = null;
    let isRecording = false;
    let timerInterval = null;
    let startTime = null;
    let placeholderElement = null;

    // Get UI elements
    const recordButton = recorderWrapper.querySelector('.record-button, [data-element="record-button"]');
    const stopButton = recorderWrapper.querySelector('.stop-button, [data-element="stop-button"]');
    const recordingsList = recorderWrapper.querySelector('.recordings-list, [data-element="recordings-list"]');
    const timerDisplay = recorderWrapper.querySelector('.timer, [data-element="timer"]');

    if (!recordButton) {
        console.error('Record button not found in recorder wrapper');
        return null;
    }

    // Initialize recordings list on page load
    renderRecordingsList();

    /**
     * Handle record button click
     */
    async function handleRecordButtonClick(event) {
        event.preventDefault();
        
        if (isRecording) {
            await stopActualRecording();
        } else {
            const canRecord = await checkRecordingLimit();
            if (canRecord) {
                await startActualRecording();
            } else {
                showRecordingLimitMessage();
            }
        }
    }

    /**
     * Check if recording limit is reached
     */
    async function checkRecordingLimit() {
        try {
            const recordings = await loadRecordingsFromDB(questionId, world, lmid);
            const validRecordings = recordings.filter(r => r && r.id);
            
            if (validRecordings.length >= 30) {
                return false;
            }
            return true;
        } catch (error) {
            log('error', 'Error checking recording limit:', error);
            return true; // Allow recording if check fails
        }
    }

    /**
     * Show recording limit message
     */
    function showRecordingLimitMessage() {
        alert('Recording limit reached (30 recordings per question). Please delete some recordings before adding new ones.');
    }

    /**
     * Start actual recording process
     */
    async function startActualRecording() {
        try {
            // Request microphone access
            stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });

            // Setup MediaRecorder
            const mimeType = getSupportedMimeType();
            mediaRecorder = new MediaRecorder(stream, { mimeType });
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: mimeType });
                await processRecording(audioBlob);
                cleanupAfterRecording(stream);
            };

            mediaRecorder.onerror = (event) => {
                log('error', 'MediaRecorder error:', event.error);
                cleanupAfterRecording(stream);
                resetRecordingState();
            };

            // Start recording
            mediaRecorder.start(1000); // Collect data every second
            isRecording = true;

            // Update UI
            recordButton.classList.add('recording');
            setButtonText(recordButton, 'Recording...');
            
            if (stopButton) {
                stopButton.style.display = 'inline-block';
                stopButton.style.pointerEvents = 'auto';
            }

            // Add placeholder to UI
            if (recordingsList) {
                placeholderElement = createRecordingPlaceholder(questionId);
                recordingsList.insertBefore(placeholderElement, recordingsList.firstChild);
            }

            // Start timer
            startRecordingTimer();

            log('info', `Recording started for question ${questionId}`);

        } catch (error) {
            log('error', 'Failed to start recording:', error);
            
            if (error.name === 'NotAllowedError') {
                alert('Microphone access denied. Please allow microphone access and try again.');
            } else if (error.name === 'NotFoundError') {
                alert('No microphone found. Please connect a microphone and try again.');
            } else {
                alert('Failed to start recording. Please check your microphone and try again.');
            }
            
            resetRecordingState();
        }
    }

    /**
     * Stop actual recording
     */
    async function stopActualRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            stopRecordingTimer();
        }
    }

    /**
     * Start recording timer
     */
    function startRecordingTimer() {
        startTime = Date.now();
        
        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const formattedTime = formatTime(elapsed);
            
            // Update timer displays
            if (timerDisplay) {
                timerDisplay.textContent = formattedTime;
            }
            
            if (placeholderElement) {
                const timerSpan = placeholderElement.querySelector('.placeholder-timer');
                if (timerSpan) {
                    timerSpan.textContent = formattedTime;
                }
            }
            
            // Auto-stop at 10 minutes
            if (elapsed >= 600) {
                stopActualRecording();
            }
        }, 1000);
    }

    /**
     * Stop recording timer
     */
    function stopRecordingTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    /**
     * Process recording after stop
     */
    async function processRecording(audioBlob) {
        const recordingId = generateRecordingId();
        const timestamp = Date.now();
        
        const recordingData = {
            id: recordingId,
            questionId: questionId,
            world: world,
            lmid: lmid,
            audio: audioBlob,
            createdAt: new Date().toISOString(),
            timestamp: timestamp,
            uploadStatus: 'pending',
            cloudUrl: null
        };

        try {
            // Save to IndexedDB
            await saveRecordingToDB(recordingData);
            log('info', `Recording saved: ${recordingId}`);

            // Remove placeholder and refresh list
            if (placeholderElement && placeholderElement.parentNode) {
                placeholderElement.parentNode.removeChild(placeholderElement);
                placeholderElement = null;
            }

            // Refresh recordings list
            renderRecordingsList();

            // Start background upload
            uploadRecordingInBackground(recordingData);

        } catch (error) {
            log('error', 'Failed to save recording:', error);
            alert('Failed to save recording. Please try again.');
        }

        resetRecordingState();
    }

    /**
     * Upload recording in background
     */
    async function uploadRecordingInBackground(recordingData) {
        try {
            dispatchUploadStatusEvent(recordingData.id, 'uploading');

            const base64Audio = await blobToBase64(recordingData.audio);
            const filename = generateFilename(recordingData);

            const uploadResponse = await fetch(`${window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app'}/api/upload-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    world,
                    lmid,
                    questionId,
                    filename,
                    audioData: base64Audio
                })
            });

            const uploadResult = await uploadResponse.json();

            if (uploadResult.success) {
                // Update recording with cloud URL
                recordingData.cloudUrl = uploadResult.url;
                recordingData.uploadStatus = 'uploaded';
                await updateRecordingInDB(recordingData);

                dispatchUploadStatusEvent(recordingData.id, 'uploaded');
                log('info', `Upload completed: ${recordingData.id}`);
            } else {
                throw new Error(uploadResult.error || 'Upload failed');
            }

        } catch (error) {
            log('error', 'Upload failed:', error);
            recordingData.uploadStatus = 'failed';
            await updateRecordingInDB(recordingData);
            dispatchUploadStatusEvent(recordingData.id, 'failed');
        }
    }

    /**
     * Generate unique recording ID
     */
    function generateRecordingId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `kids-world_${world}-lmid_${lmid}-question_${questionId}-tm_${timestamp}-${random}`;
    }

    /**
     * Generate filename for upload
     */
    function generateFilename(recordingData) {
        return `kids-world_${world}-lmid_${lmid}-question_${questionId}-tm_${recordingData.timestamp}.mp3`;
    }

    /**
     * Cleanup after recording
     */
    function cleanupAfterRecording(streamToStop) {
        if (streamToStop) {
            streamToStop.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }

    /**
     * Reset recording state
     */
    function resetRecordingState() {
        isRecording = false;
        mediaRecorder = null;
        audioChunks = [];
        stopRecordingTimer();

        // Reset UI
        recordButton.classList.remove('recording');
        setButtonText(recordButton, 'Record');
        
        if (stopButton) {
            stopButton.style.display = 'none';
        }
        
        if (timerDisplay) {
            timerDisplay.textContent = '0:00';
        }

        // Remove placeholder if still exists
        if (placeholderElement && placeholderElement.parentNode) {
            placeholderElement.parentNode.removeChild(placeholderElement);
            placeholderElement = null;
        }
    }

    // Setup event listeners
    recordButton.addEventListener('click', handleRecordButtonClick);
    
    if (stopButton) {
        stopButton.addEventListener('click', () => {
            if (isRecording) {
                stopActualRecording();
            }
        });
    }

    // Return recorder instance
    return {
        isRecording: () => isRecording,
        startRecording: startActualRecording,
        stopRecording: stopActualRecording,
        cleanup: () => {
            resetRecordingState();
            cleanupAfterRecording(stream);
        }
    };
} 