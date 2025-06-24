/**
 * recording.js - Multi-Question Audio Recording System
 * 
 * PURPOSE: Comprehensive audio recording system with local storage, cloud backup, and radio program generation
 * DEPENDENCIES: MediaRecorder API, IndexedDB, Bunny.net Storage API
 * DOCUMENTATION: See /documentation/recording.js.md for complete system overview
 * 
 * CORE FEATURES:
 * - Multi-question independent recording instances
 * - Local IndexedDB storage with cloud backup to Bunny.net
 * - Upload progress tracking and retry mechanisms
 * - Radio program generation from multiple recordings
 * - Question ID normalization and file organization
 * - Orphaned recording cleanup and maintenance
 * 
 * AUDIO PIPELINE:
 * WebRTC Recording (WebM) → Local Storage (IndexedDB) → Cloud Upload (MP3) → CDN Delivery
 */

// =============================================================================
// CONSTANTS - Centralized configuration
// =============================================================================
const RECORDING_CONFIG = {
    MAX_RECORDINGS_PER_QUESTION: 30,
    AUTO_STOP_TIMEOUT_MS: 600000, // 10 minutes
    DATABASE_NAME: "kidsAudioDB",
    DATABASE_VERSION: 2,
    STORE_NAME: "audioRecordings",
    API_BASE_URL: "https://little-microphones.vercel.app/api",
    CDN_BASE_URL: "https://little-microphones.b-cdn.net"
};

const UPLOAD_STATUS = {
    PENDING: 'pending',
    UPLOADING: 'uploading', 
    UPLOADED: 'uploaded',
    FAILED: 'failed'
};

const AUDIO_CONFIG = {
    SUPPORTED_MIME_TYPES: ['audio/webm;codecs=opus', 'audio/webm'],
    CANVAS_REFRESH_RATE: 60 // FPS for waveform animation
};

// =============================================================================
// UTILITY FUNCTIONS - Reusable helpers
// =============================================================================

/**
 * Extract URL parameters once and cache them
 */
const URLParams = (() => {
    let cached = null;
    return {
        get() {
            if (!cached) {
                const urlParams = new URLSearchParams(window.location.search);
                cached = {
                    world: window.currentRecordingParams?.world || urlParams.get('world') || 'unknown-world',
                    lmid: window.currentRecordingParams?.lmid || urlParams.get('lmid') || 'unknown-lmid'
                };
            }
            return cached;
        },
        invalidate() {
            cached = null;
        }
    };
})();

/**
 * Normalize question ID - now just returns the numeric order field directly
 * @param {string} questionId - Raw question ID from DOM (should be numeric order)
 * @returns {string} - Numeric order as string (e.g., "1", "2", "3")
 */
function normalizeQuestionId(questionId) {
    if (!questionId) return '';
    
    // Convert to string and trim whitespace
    const cleanId = questionId.toString().trim();
    
    // If it's already numeric, return as-is
    if (/^\d+$/.test(cleanId)) {
        return cleanId;
    }
    
    // Extract numeric part from any format
    const numericPart = cleanId.replace(/[^\d]/g, '');
    return numericPart || '0';
}

/**
 * Format time from seconds to MM:SS
 */
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Generate unique recording ID
 */
function generateRecordingId(world, lmid, questionId, timestamp = Date.now()) {
    return `kids-world_${world}-lmid_${lmid}-question_${questionId}-tm_${timestamp}`;
}

/**
 * Get supported MediaRecorder MIME type
 */
function getSupportedMimeType() {
    const type = AUDIO_CONFIG.SUPPORTED_MIME_TYPES.find(MediaRecorder.isTypeSupported);
    return type ? { mimeType: type } : undefined;
}

// =============================================================================
// GLOBAL STATE MANAGEMENT
// =============================================================================
const RecordingState = {
    savingLocks: new Set(),
    initializedWorlds: new Set(),
    activeRecorders: new Map(),
    
    // Memory management for URL objects
    objectUrls: new Set(),
    
    addObjectUrl(url) {
        this.objectUrls.add(url);
    },
    
    cleanupObjectUrls() {
        this.objectUrls.forEach(url => URL.revokeObjectURL(url));
        this.objectUrls.clear();
    },
    
    // Recording instance management
    addRecorder(questionId, recorder) {
        this.activeRecorders.set(questionId, recorder);
    },
    
    getRecorder(questionId) {
        return this.activeRecorders.get(questionId);
    },
    
    removeRecorder(questionId) {
        this.activeRecorders.delete(questionId);
    }
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    RecordingState.cleanupObjectUrls();
});

// =============================================================================
// ORIGINAL CODE CONTINUES
// =============================================================================

// --- Global initialization tracking ---
const initializedWorlds = new Set();

/**
 * Injects the necessary CSS for animations into the document's head.
 * This function is called only once.
 */
function injectGlobalStyles() {
    // Check if styles already injected
    if (document.getElementById('recorder-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'recorder-styles';
    style.textContent = `
        @keyframes pulse-red {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.15);
            opacity: 0;
          }
        }

        .record-button {
            position: relative;
            z-index: 1; 
        }

        .record-button.recording::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: red;
          z-index: -1;
          animation: pulse-red 1.2s infinite ease-out;
        }

        /* --- Animation for new recording placeholder and item --- */
        .recording-placeholder {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 14px 20px;
            margin-bottom: 8px;
            background-color: #f0f0f0;
            border: none;
            border-radius: 40px; /* Makes it look like an audio player */
            color: #333;
            animation: pulse-bg 2s infinite;
            list-style: none;
            font-size: 14px;
        }

        .recording-placeholder .placeholder-status {
            font-weight: 400;
        }

        .recording-placeholder .placeholder-timer {
            font-family: monospace;
            font-size: 14px;
            color: #555;
        }

        @keyframes pulse-bg {
            0% { background-color: #f5f5f5; }
            50% { background-color: #e9e9e9; }
            100% { background-color: #f5f5f5; }
        }

        .new-recording-fade-in {
            animation: fadeIn 0.5s ease-in-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeOut {
            to { opacity: 0; }
        }

        .fade-out {
            animation: fadeOut 0.3s ease-out forwards;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Creates the HTML element for a single audio recording.
 * @param {object} recordingData - The recording data object from the database.
 * @param {string} questionId - The ID of the question this recording belongs to.
 * @returns {HTMLLIElement} The created list item element.
 */
async function createRecordingElement(recordingData, questionId) {
    const li = document.createElement('li');
    li.dataset.recordingId = recordingData.id;

    // Get audio source (now async to verify cloud URLs)
    const audioURL = await getAudioSource(recordingData);
    
    if (audioURL) {
        const audio = new Audio(audioURL);
        audio.controls = true;
        audio.style.width = '100%';
        li.appendChild(audio);
    } else {
        // Show a message if no audio is available
        const noAudioMsg = document.createElement('div');
        noAudioMsg.textContent = 'Audio no longer available';
        noAudioMsg.style.cssText = 'padding: 10px; background: #f5f5f5; border-radius: 8px; color: #666; text-align: center;';
        li.appendChild(noAudioMsg);
    }

    const timestamp = new Date(recordingData.timestamp);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = timestamp.getDate();
    const month = monthNames[timestamp.getMonth()];
    const year = String(timestamp.getFullYear()).slice(-2);
    const hours = String(timestamp.getHours()).padStart(2, '0');
    const minutes = String(timestamp.getMinutes()).padStart(2, '0');
    const formattedDate = `${day} ${month} ${year} / ${hours}:${minutes}`;
    
    const infoContainer = document.createElement('div');
    infoContainer.style.display = 'flex';
    infoContainer.style.justifyContent = 'center';
    infoContainer.style.alignItems = 'center';
    infoContainer.style.marginTop = '4px';
    infoContainer.style.gap = '16px';

    const timestampEl = document.createElement('div');
    timestampEl.textContent = formattedDate;
    timestampEl.style.fontSize = '12px';
    timestampEl.style.color = '#888';
    timestampEl.style.whiteSpace = 'nowrap';

    // Add upload status indicator
    const uploadStatus = document.createElement('div');
    uploadStatus.className = 'upload-status';
    uploadStatus.style.fontSize = '12px';
    uploadStatus.style.whiteSpace = 'nowrap';
    updateUploadStatusUI(uploadStatus, recordingData);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.style.background = 'none';
    deleteButton.style.border = 'none';
    deleteButton.style.color = '#ff4d4d';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.padding = '0';
    deleteButton.style.fontSize = '12px';
    deleteButton.style.whiteSpace = 'nowrap';

    deleteButton.onclick = () => {
        if (confirm("Are you sure you want to delete this recording?")) {
            deleteRecording(recordingData.id, questionId, li);
        }
    };

    infoContainer.appendChild(timestampEl);
    infoContainer.appendChild(uploadStatus);
    infoContainer.appendChild(deleteButton);

    li.appendChild(infoContainer);

    return li;
}

/**
 * Check if a cloud URL is still accessible
 */
async function verifyCloudUrl(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.warn('Cloud URL verification failed:', error);
        return false;
    }
}

/**
 * Get the best audio source (cloud URL if available and accessible, otherwise local blob)
 */
async function getAudioSource(recordingData) {
    // If we have a cloud URL, verify it's still accessible
    if (recordingData.uploadStatus === UPLOAD_STATUS.UPLOADED && recordingData.cloudUrl) {
        const isAccessible = await verifyCloudUrl(recordingData.cloudUrl);
        if (isAccessible) {
            return recordingData.cloudUrl;
        } else {
            console.warn(`Cloud file no longer accessible: ${recordingData.cloudUrl}`);
            // Update the recording status to indicate cloud file is missing
            recordingData.uploadStatus = UPLOAD_STATUS.FAILED;
            recordingData.cloudUrl = null;
            await updateRecordingInDB(recordingData);
        }
    }
    
    // Fall back to local blob if available
    if (recordingData.audio) {
        const objectUrl = URL.createObjectURL(recordingData.audio);
        // Track URL for cleanup
        RecordingState.addObjectUrl(objectUrl);
        return objectUrl;
    }
    
    // If neither cloud nor local is available, return null
    console.error('No audio source available for recording:', recordingData.id);
    return null;
}

/**
 * Update upload status UI element
 */
function updateUploadStatusUI(statusElement, recordingData) {
    switch(recordingData.uploadStatus) {
        case UPLOAD_STATUS.PENDING:
            statusElement.innerHTML = '⏳ Queued for backup';
            statusElement.style.color = '#888';
            break;
        case UPLOAD_STATUS.UPLOADING:
            statusElement.innerHTML = `⬆️ Backing up... ${recordingData.uploadProgress}%`;
            statusElement.style.color = '#007bff';
            break;
        case UPLOAD_STATUS.UPLOADED:
            statusElement.innerHTML = '☁️ Backed up';
            statusElement.style.color = '#28a745';
            break;
        case UPLOAD_STATUS.FAILED:
            statusElement.innerHTML = '⚠️ Backup failed';
            statusElement.style.color = '#dc3545';
            break;
    }
}

/**
 * Delete recording from Bunny.net cloud storage
 */
async function deleteFromBunny(recordingData, world, lmid, questionId) {
    if (!recordingData.cloudUrl) {
        console.log(`[${questionId}] No cloud URL, skipping deletion`);
        return true;
    }

    try {
        const filename = `${recordingData.id}.mp3`;
        console.log(`[${questionId}] Deleting: ${filename}`);

        const response = await fetch('https://little-microphones.vercel.app/api/delete-audio', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: filename,
                world: world,
                lmid: lmid,
                questionId: questionId
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log(`[${questionId}] Deleted from cloud: ${filename}`);
            return true;
        } else {
            throw new Error(result.error || 'Delete failed');
        }

    } catch (error) {
        console.error(`[${questionId}] Cloud deletion failed:`, error);
        return false; // Don't block local deletion if cloud deletion fails
    }
}

/**
 * Deletes a recording from the database and removes its element from the UI.
 * @param {string} recordingId - The ID of the recording to delete.
 * @param {string} questionId - The ID of the associated question.
 * @param {HTMLLIElement} elementToRemove - The element to remove from the DOM.
 */
async function deleteRecording(recordingId, questionId, elementToRemove) {
    console.log(`Deleting recording ${recordingId} for question ${questionId}`);
    
    try {
        // First, get the recording data to check if it has a cloud URL
        const recordingData = await getRecordingFromDB(recordingId);
        
        if (recordingData) {
            // Get world and lmid for cloud deletion
            const urlParams = new URLSearchParams(window.location.search);
            const world = window.currentRecordingParams?.world || urlParams.get('world') || 'unknown-world';
            const lmid = window.currentRecordingParams?.lmid || urlParams.get('lmid') || 'unknown-lmid';
            
            // Delete from cloud storage if it exists
            if (recordingData.cloudUrl) {
                console.log(`Deleting from cloud: ${recordingData.cloudUrl}`);
                await deleteFromBunny(recordingData, world, lmid, questionId);
            }
        }
        
        // Delete from local database
        await withDB(db => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction("audioRecordings", "readwrite");
                const store = transaction.objectStore("audioRecordings");
                const request = store.delete(recordingId);
                transaction.oncomplete = () => {
                    console.log(`Recording ${recordingId} deleted from DB.`);
                    resolve();
                };
                transaction.onerror = (event) => {
                    console.error(`Error deleting recording ${recordingId} from DB:`, event.target.error);
                    reject(event.target.error);
                };
            });
        });
        
        elementToRemove.remove();
        
    } catch (error) {
        console.error(`Error deleting recording ${recordingId}:`, error);
        // Still remove from UI even if deletion partially failed
        elementToRemove.remove();
    }
}

/**
 * Initializes a single audio recorder instance.
 * @param {HTMLElement} recorderWrapper - The main container element for this recorder.
 */
function initializeAudioRecorder(recorderWrapper) {
    let questionId = recorderWrapper.dataset.questionId;
    if (!questionId) {
        console.warn('No questionId found for recorder wrapper, skipping initialization');
        return;
    }
    
    // Normalize questionId to numeric format immediately
    questionId = normalizeQuestionId(questionId);
    
    // Prevent double initialization
    if (recorderWrapper.dataset.recordingInitialized === 'true') {
        console.log(`[${questionId}] Already initialized`);
        return;
    }
    
    // Mark as initialized
    recorderWrapper.dataset.recordingInitialized = 'true';
    console.log(`[${questionId}] Initializing audio recorder`);

    // --- Step 1: Find ONLY the button initially ---
    const recordButton = recorderWrapper.querySelector('.record-button');
    if (!recordButton) {
        console.error(`[${questionId}] No record button found, skipping`);
        return;
    }
    
    // --- Instance variables (shared across functions in this scope) ---
    let placeholderEl, statusDisplay, timerDisplay, recordingsListUI, liveWaveformCanvas, canvasCtx;
    let mediaRecorder, audioChunks = [], timerInterval, seconds = 0, stream;
    let audioContext, analyser, sourceNode, dataArray, animationFrameId;
    let canvasSized = false;
    let recordingsLoaded = false; // Flag to prevent duplicate loading

    // --- Initial DB load to show previous recordings ---
    recordingsListUI = recorderWrapper.querySelector('.recording-list.w-list-unstyled');
    if (recordingsListUI && !recordingsLoaded) {
        recordingsLoaded = true; // Set flag immediately
        
        // Get world and lmid from URL params or global params
        const urlParams = new URLSearchParams(window.location.search);
        const world = window.currentRecordingParams?.world || urlParams.get('world') || 'unknown-world';
        const lmid = window.currentRecordingParams?.lmid || urlParams.get('lmid') || 'unknown-lmid';
        
        loadRecordingsFromDB(questionId, world, lmid).then(async recordings => {
            recordingsListUI.innerHTML = ''; // Clear previous
            recordings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Process recordings sequentially to handle async createRecordingElement
            for (const rec of recordings) {
                const recElement = await createRecordingElement(rec, questionId);
                recordingsListUI.appendChild(recElement);
            }
            
            // Clean up any orphaned recordings after processing (only if we found recordings)
            if (recordings.length > 0) {
                const cleanedCount = await cleanupOrphanedRecordings(questionId, world, lmid);
                if (cleanedCount > 0) {
                    console.log(`[${questionId}] Cleaned ${cleanedCount} orphaned recordings, reloading`);
                    // Reload the recordings list after cleanup
                    const updatedRecordings = await loadRecordingsFromDB(questionId, world, lmid);
                    recordingsListUI.innerHTML = '';
                    updatedRecordings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    for (const rec of updatedRecordings) {
                        const recElement = await createRecordingElement(rec, questionId);
                        recordingsListUI.appendChild(recElement);
                    }
                }
            }
        }).catch(error => {
            console.error(`[${questionId}] Error loading recordings:`, error);
            recordingsLoaded = false; // Reset flag on error
        });
    }
    
    recordButton.addEventListener('click', handleRecordButtonClick);

    function handleRecordButtonClick(event) {
        event.preventDefault();
        
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        } else {
            // Check if saving is already in progress for this question
            if (RecordingState.savingLocks.has(questionId)) {
                console.warn(`[${questionId}] Recording already in progress, please wait`);
                return;
            }
            
            // SECURITY: Check recording limit before starting
            checkRecordingLimit().then(canRecord => {
                if (canRecord) {
                    // --- Step 2: Find all other elements ON-DEMAND when user clicks ---
                    liveWaveformCanvas = recorderWrapper.querySelector('.live-waveform-canvas');
                    
                    // No longer finding status/timer here, they are created dynamically.
                    startActualRecording();
                } else {
                    // Show limit message
                    showRecordingLimitMessage();
                }
            });
        }
    }

    /**
     * Check if user can record more (max limit per question)
     */
    async function checkRecordingLimit() {
        try {
            const { world, lmid } = URLParams.get();
            
            const recordings = await loadRecordingsFromDB(questionId, world, lmid);
            const currentCount = recordings.length;
            
            console.log(`[${questionId}] Recordings: ${currentCount}/${RECORDING_CONFIG.MAX_RECORDINGS_PER_QUESTION}`);
            return currentCount < RECORDING_CONFIG.MAX_RECORDINGS_PER_QUESTION;
        } catch (error) {
            console.error(`[${questionId}] Error checking limit:`, error);
            return true; // Allow recording if check fails
        }
    }

    /**
     * Show recording limit message
     */
    function showRecordingLimitMessage() {
        // Use native browser alert for better accessibility and simplicity
        alert(`Maximum ${RECORDING_CONFIG.MAX_RECORDINGS_PER_QUESTION} recordings per question. Delete an old recording to record a new one.`);
        console.log(`[${questionId}] Recording limit reached (${RECORDING_CONFIG.MAX_RECORDINGS_PER_QUESTION}/${RECORDING_CONFIG.MAX_RECORDINGS_PER_QUESTION})`);
    }

    async function startActualRecording() {
        try {
            // --- Create a placeholder in the UI ---
            if (recordingsListUI) {
                placeholderEl = document.createElement('li');
                placeholderEl.className = 'recording-placeholder new-recording-fade-in';

                statusDisplay = document.createElement('span');
                statusDisplay.className = 'placeholder-status';
                statusDisplay.textContent = 'Recording...';

                timerDisplay = document.createElement('span');
                timerDisplay.className = 'placeholder-timer';
                timerDisplay.textContent = '0:00';

                placeholderEl.appendChild(statusDisplay);
                placeholderEl.appendChild(timerDisplay);
                recordingsListUI.prepend(placeholderEl);
            }

            // --- Waveform visualization is now optional and properly checked ---
            if (liveWaveformCanvas && typeof liveWaveformCanvas.getContext === 'function') {
                if (!canvasCtx) {
                    canvasCtx = liveWaveformCanvas.getContext('2d');
                }
                sizeCanvas(); 
            }
            
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Only set up the analyser and visualiser if the canvas context was successfully created
            if (canvasCtx) {
                if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                const bufferLength = analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);
                
                sourceNode = audioContext.createMediaStreamSource(stream);
                sourceNode.connect(analyser);
                drawLiveWaveform();
            }

            if(statusDisplay) statusDisplay.textContent = "Status: Recording...";
            setButtonText(recordButton, 'Stop');
            recordButton.classList.add('recording');
            audioChunks = [];
            
            mediaRecorder = new MediaRecorder(stream, getSupportedMimeType());

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onerror = (event) => {
                console.error("MediaRecorder error:", event.error);
                RecordingState.savingLocks.delete(questionId); // Release global lock on error
                cleanupAfterRecording(stream);
            };

            mediaRecorder.onstop = async () => {
                // Set lock for saving process
                RecordingState.savingLocks.add(questionId);

                try {
                    if(statusDisplay) statusDisplay.textContent = "Processing...";
                    
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    audioChunks = [];

                    // Get world and lmid from cached URL params
                    const { world, lmid } = URLParams.get();

                    // --- Use timestamp for unique ID ---
                    const timestamp = Date.now();
                    const newId = generateRecordingId(world, lmid, questionId, timestamp);
                    console.log(`[${questionId}] Generated ID: ${newId}`);

                    const recordingData = {
                        id: newId,
                        questionId: questionId, // Keep for filtering
                        audio: audioBlob,
                        cloudUrl: null,          // Will be set after upload
                        uploadStatus: UPLOAD_STATUS.PENDING,
                        uploadProgress: 0,       // 0-100 percentage
                        timestamp: new Date().toISOString(),
                        fileSize: audioBlob.size
                    };

                    await saveRecordingToDB(recordingData);
                    
                    // Start background upload to Bunny.net
                    uploadToBunny(recordingData, world, lmid);

                    // Create the final UI element
                    const newRecordingElement = await createRecordingElement(recordingData, questionId);
                    newRecordingElement.classList.add('new-recording-fade-in');

                    // Find and replace the placeholder
                    if (recordingsListUI && placeholderEl) {
                        const placeholderToReplace = placeholderEl;
                        placeholderToReplace.classList.add('fade-out');
                        placeholderToReplace.addEventListener('animationend', () => {
                            placeholderToReplace.replaceWith(newRecordingElement);
                        }, { once: true });
                        placeholderEl = null; // Clear instance-level reference immediately
                    }
                } catch (err) {
                    console.error("Error processing recording:", err);
                    if (placeholderEl) {
                        placeholderEl.textContent = "Error saving recording.";
                    }
                } finally {
                    RecordingState.savingLocks.delete(questionId); // Release global lock
                    // --- Reset button state ---
                    cleanupAfterRecording(stream);
                }
            };

            mediaRecorder.start();
            startTimer();

            // SECURITY: Auto-stop recording after 10 minutes
            setTimeout(() => {
                if (mediaRecorder && mediaRecorder.state === "recording") {
                    console.log(`[${questionId}] Auto-stopping after 10 minutes`);
                    if (statusDisplay) statusDisplay.textContent = "Maximum recording time reached...";
                    mediaRecorder.stop();
                }
            }, RECORDING_CONFIG.AUTO_STOP_TIMEOUT_MS); // 10 minutes limit

        } catch (err) {
            console.error("Error starting recording:", err);
            if(statusDisplay) statusDisplay.textContent = `Start Error: ${err.message}`;
        }
    }

    function stopActualRecording() {
        if (mediaRecorder) mediaRecorder.stop();
        stopTimer();
    }
    
    function cleanupAfterRecording(streamToStop) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (sourceNode) sourceNode.disconnect(); // sourceNode only exists if canvas does
        if (streamToStop) streamToStop.getTracks().forEach(track => track.stop());
        
        mediaRecorder = null;
        animationFrameId = null;
        // placeholderEl is now handled safely in mediaRecorder.onstop
        resetRecordingState();
    }

    function resetRecordingState() {
        setButtonText(recordButton, 'Start');
        recordButton.classList.remove('recording');
        if (statusDisplay) statusDisplay.textContent = "Status: Idle";
    }
    
    function drawLiveWaveform() {
        // Throttle animation to target FPS for better performance
        const targetFPS = AUDIO_CONFIG.CANVAS_REFRESH_RATE;
        const interval = 1000 / targetFPS;
        
        const now = performance.now();
        if (!window.lastWaveformDraw) window.lastWaveformDraw = now;
        
        if (now - window.lastWaveformDraw >= interval) {
            window.lastWaveformDraw = now;
            
            if (!analyser || !canvasCtx) return;

            analyser.getByteFrequencyData(dataArray);

            const canvasWidth = liveWaveformCanvas.width;
            const canvasHeight = liveWaveformCanvas.height;
        
            if (canvasWidth === 0 || canvasHeight === 0) return;

            // Clear canvas more efficiently
            canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

            const bufferLength = analyser.frequencyBinCount;
            const barWidth = 3;
            const barSpacing = 2;
            const totalBarAreaWidth = bufferLength * (barWidth + barSpacing);
            let x = (canvasWidth - totalBarAreaWidth) / 2;

            // Batch drawing operations for better performance
            canvasCtx.fillStyle = '#D9D9D9';
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvasHeight;
                canvasCtx.fillRect(x, (canvasHeight - barHeight) / 2, barWidth, barHeight);
                x += barWidth + barSpacing;
            }
        }
        
        animationFrameId = requestAnimationFrame(drawLiveWaveform);
    }

    function renderRecordingsList() {
        if (!recordingsListUI) return;
        recordingsListUI.innerHTML = '';
        recordings.sort((a, b) => b.timestamp - a.timestamp); 
        
        recordings.forEach(rec => {
            const li = document.createElement('li');
            li.style.cssText = 'display: flex; flex-direction: column; align-items: center; margin-bottom: 24px;';
            
            const audioPlayer = document.createElement('audio');
            audioPlayer.controls = true;
            audioPlayer.src = rec.url;
            
            const infoControlsDiv = document.createElement('div');
            infoControlsDiv.style.textAlign = 'center';

            const timestampDisplay = document.createElement('span');
            const date = new Date(rec.timestamp);
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            timestampDisplay.textContent = `Recorded: ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            timestampDisplay.style.cssText = 'font-size:0.9em; color:#777;';

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.style.cssText = 'background: none; border: none; color: #f25444; cursor: pointer; padding: 0px; font-size: 0.9em;';
            deleteButton.onclick = () => {
                if (confirm(`Are you sure you want to delete this recording?`)) {
                    deleteRecording(rec.id, questionId, li);
                }
            };
            
            infoControlsDiv.appendChild(timestampDisplay);
            infoControlsDiv.appendChild(deleteButton);

            li.appendChild(audioPlayer);
            li.appendChild(infoControlsDiv);
            recordingsListUI.appendChild(li);
        });
    }

    // --- Bunny.net Cloud Storage Functions ---

    /**
     * Convert blob to base64 for API upload
     */
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Upload recording to Bunny.net cloud storage
     */
    async function uploadToBunny(recordingData, world, lmid) {
        try {
            console.log(`[${questionId}] Uploading: ${recordingData.id}`);
            
            // Update status to uploading
            recordingData.uploadStatus = UPLOAD_STATUS.UPLOADING;
            recordingData.uploadProgress = 10;
            await updateRecordingInDB(recordingData);
            updateRecordingUI(recordingData);

            // Convert blob to base64
            const base64Audio = await blobToBase64(recordingData.audio);
            recordingData.uploadProgress = 30;
            await updateRecordingInDB(recordingData);
            updateRecordingUI(recordingData);

            // Upload via API route
            const response = await fetch(`${RECORDING_CONFIG.API_BASE_URL}/upload-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audioData: base64Audio,
                    filename: `${recordingData.id}.mp3`,
                    world: world,
                    lmid: lmid,
                    questionId: questionId
                })
            });

            recordingData.uploadProgress = 80;
            await updateRecordingInDB(recordingData);
            updateRecordingUI(recordingData);

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    recordingData.cloudUrl = result.url;
                    recordingData.uploadStatus = UPLOAD_STATUS.UPLOADED;
                    recordingData.uploadProgress = 100;
                    
                    // Remove the blob to save local storage space since we now have cloud backup
                    recordingData.audio = null;
                    
                    console.log(`[${questionId}] Upload complete: ${result.url}`);
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            } else {
                // Handle non-JSON error responses (like HTML error pages)
                const errorText = await response.text();
                console.error(`[${questionId}] Upload failed: ${response.status} - ${errorText}`);
                throw new Error(`Upload API error: ${response.status}`);
            }

        } catch (error) {
            recordingData.uploadStatus = UPLOAD_STATUS.FAILED;
            recordingData.uploadProgress = 0;
            console.error(`[${questionId}] Upload error:`, error);
        }

        await updateRecordingInDB(recordingData);
        updateRecordingUI(recordingData);
    }

    /**
     * Update recording UI elements with current status
     */
    function updateRecordingUI(recordingData) {
        const recordingElement = document.querySelector(`[data-recording-id="${recordingData.id}"]`);
        if (recordingElement) {
            const uploadStatus = recordingElement.querySelector('.upload-status');
            if (uploadStatus) {
                updateUploadStatusUI(uploadStatus, recordingData);
            }
        }
    }

    // --- DB Functions ---

    function saveRecordingToDB(recordingData) {
        return new Promise((resolve, reject) => {
            // Use withDB to ensure database is initialized before proceeding.
            withDB(db => {
                const transaction = db.transaction("audioRecordings", "readwrite");
                const store = transaction.objectStore("audioRecordings");
                const request = store.add(recordingData);
                transaction.oncomplete = () => {
                    console.log(`Recording ${recordingData.id} saved to DB.`);
                    resolve();
                };
                transaction.onerror = (event) => {
                    console.error(`Error saving recording ${recordingData.id} to DB:`, event.target.error);
                    reject(event.target.error);
                };
            });
        });
    }

    // --- Utility Functions ---

    function setButtonText(button, text) {
        for (let i = button.childNodes.length - 1; i >= 0; i--) {
            const node = button.childNodes[i];
            if (node.nodeType === 3 && node.textContent.trim().length > 0) {
                node.textContent = ` ${text} `; return;
            }
        }
        if (button.lastElementChild) button.lastElementChild.textContent = text;
    }

    function startTimer() {
        seconds = 0;
        if (timerDisplay) timerDisplay.textContent = formatTime(seconds);
        timerInterval = setInterval(() => {
            seconds++;
            if (timerDisplay) timerDisplay.textContent = formatTime(seconds);
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        seconds = 0;
        // The timer display will be removed with the placeholder, so no need to clear it.
    }

    function sizeCanvas() {
        if (canvasSized || !liveWaveformCanvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = liveWaveformCanvas.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
            console.warn(`[${questionId}] Canvas not visible, sizing deferred`);
            return;
        }

        liveWaveformCanvas.width = rect.width * dpr;
        liveWaveformCanvas.height = rect.height * dpr;
        
        canvasCtx.scale(dpr, dpr);
        canvasSized = true;
        console.log(`[${questionId}] Canvas sized: ${rect.width}x${rect.height}`);
    }
    
    resetRecordingState();
}

// --- Global DB Setup & Initialization ---

let db;
function setupDatabase() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);
        const request = indexedDB.open(RECORDING_CONFIG.DATABASE_NAME, RECORDING_CONFIG.DATABASE_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;

            let store;
            if (oldVersion < 1) {
                // Database is new, create object store
                store = db.createObjectStore(RECORDING_CONFIG.STORE_NAME, { keyPath: "id" });
            } else {
                // Database exists, get store from transaction
                store = event.target.transaction.objectStore(RECORDING_CONFIG.STORE_NAME);
            }

            // Create index if it doesn't exist
            if (!store.indexNames.contains("questionId_idx")) {
                store.createIndex("questionId_idx", "questionId", { unique: false });
            }
        };

        request.onsuccess = e => {
            db = e.target.result;
            resolve(db);
        };
        request.onerror = e => {
            console.error("Database error:", e.target.error);
            reject(e.target.error);
        };
    });
}

function withStore(type, callback) {
    if (!db) { console.error("Database is not initialized."); return; }
    const transaction = db.transaction(RECORDING_CONFIG.STORE_NAME, type);
    callback(transaction.objectStore(RECORDING_CONFIG.STORE_NAME));
}

/**
 * Helper function to ensure DB is open before running a transaction.
 * @param {function(IDBDatabase): void} callback 
 */
function withDB(callback) {
    if (db) {
        callback(db);
    } else {
        // If DB isn't ready, wait for it
        setupDatabase().then(db => {
            callback(db);
        });
    }
}

/**
 * Get a single recording from the database by ID
 * @param {string} recordingId - The ID of the recording to retrieve
 */
function getRecordingFromDB(recordingId) {
    return new Promise((resolve, reject) => {
        withDB(db => {
            const transaction = db.transaction(RECORDING_CONFIG.STORE_NAME, "readonly");
            const store = transaction.objectStore(RECORDING_CONFIG.STORE_NAME);
            const request = store.get(recordingId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = (event) => {
                console.error(`Error getting recording ${recordingId} from DB:`, event.target.error);
                reject(event.target.error);
            };
        });
    });
}

/**
 * Update a recording in the database
 * @param {object} recordingData - The recording data to update
 */
function updateRecordingInDB(recordingData) {
    return new Promise((resolve, reject) => {
        withDB(db => {
            const transaction = db.transaction("audioRecordings", "readwrite");
            const store = transaction.objectStore("audioRecordings");
            const request = store.put(recordingData); // Use put for updates
            transaction.oncomplete = () => {
                resolve();
            };
            transaction.onerror = (event) => {
                console.error(`Error updating recording ${recordingData.id} in DB:`, event.target.error);
                reject(event.target.error);
            };
        });
    });
}

/**
 * Load recordings from database filtered by questionId, world, and lmid
 * @param {string} questionId - The question ID to filter by
 * @param {string} world - The world to filter by
 * @param {string} lmid - The lmid to filter by
 */
function loadRecordingsFromDB(questionId, world, lmid) {
    return new Promise((resolve) => {
        withDB(db => {
            const transaction = db.transaction(RECORDING_CONFIG.STORE_NAME, "readonly");
            const store = transaction.objectStore(RECORDING_CONFIG.STORE_NAME);
            
            // Use index for efficient querying instead of getAll() + filter
            const index = store.index("questionId_idx");
            const request = index.getAll(questionId);

            request.onsuccess = () => {
                const questionRecordings = request.result;
                // Secondary filter for world/lmid (more efficient than filtering all records)
                const filteredRecordings = questionRecordings.filter(rec => {
                    return rec.id.includes(`kids-world_${world}-lmid_${lmid}-`);
                });
                resolve(filteredRecordings);
            };
            request.onerror = () => {
                console.error(`[${questionId}] Error loading recordings from DB`);
                resolve([]); // Return empty array on error
            };
        });
    });
}

// --- Initialization Logic ---

/**
 * Initialize recorders for a specific world only
 * @param {string} world - The world slug (e.g., 'spookyland')
 */
function initializeRecordersForWorld(world) {
    if (!world) {
        console.warn('No world specified, skipping recorder initialization');
        return;
    }
    
    // Prevent multiple initializations for the same world
    if (RecordingState.initializedWorlds.has(world)) {
        console.log(`Recorders for world "${world}" already initialized, skipping.`);
        return;
    }
    
    RecordingState.initializedWorlds.add(world);
    console.log(`Initializing recorders for world: ${world}`);
    injectGlobalStyles();
    
    // Target only the collection for the current world
    const targetCollectionId = `collection-${world}`;
    const targetCollection = document.getElementById(targetCollectionId);
    
    if (!targetCollection) {
        console.warn(`Collection not found: ${targetCollectionId}`);
        RecordingState.initializedWorlds.delete(world); // Remove from set if collection not found
        return;
    }
    
    // Find recorders only within the target collection
    const recorderWrappers = targetCollection.querySelectorAll('.faq1_accordion.lm');
    console.log(`Found ${recorderWrappers.length} recorder wrappers in ${targetCollectionId}`);
    
    // Initialize each recorder
    recorderWrappers.forEach((wrapper, index) => {
        let questionId = wrapper.dataset.questionId;
        questionId = normalizeQuestionId(questionId);
        console.log(`Initializing wrapper ${index + 1}: ${questionId}`);
        initializeAudioRecorder(wrapper);
    });
    
    console.log(`Recorder initialization complete for world: ${world}`);
}

window.Webflow = window.Webflow || [];
window.Webflow.push(function() {
    console.log("Webflow ready. Waiting for world information...");
    // Don't initialize anything yet - wait for world info from rp.js
});

// Export functions globally
window.initializeAudioRecorder = initializeAudioRecorder;
window.initializeRecordersForWorld = initializeRecordersForWorld;

/**
 * Clean up orphaned recordings (no cloud URL and no local blob)
 */
async function cleanupOrphanedRecordings(questionId, world, lmid) {
    try {
        const recordings = await loadRecordingsFromDB(questionId, world, lmid);
        
        // Only consider recordings truly orphaned if they have failed upload AND no local blob
        const orphanedRecordings = recordings.filter(rec => 
            rec.uploadStatus === UPLOAD_STATUS.FAILED && !rec.audio && !rec.cloudUrl
        );
        
        if (orphanedRecordings.length > 0) {
            console.log(`[${questionId}] Found ${orphanedRecordings.length} orphaned recordings, cleaning up`);
            
            for (const orphaned of orphanedRecordings) {
                await withDB(db => {
                    return new Promise((resolve, reject) => {
                        const transaction = db.transaction("audioRecordings", "readwrite");
                        const store = transaction.objectStore("audioRecordings");
                        const request = store.delete(orphaned.id);
                        transaction.oncomplete = () => {
                            console.log(`[${questionId}] Cleaned up orphaned: ${orphaned.id}`);
                            resolve();
                        };
                        transaction.onerror = (event) => {
                            console.error(`Error cleaning up recording ${orphaned.id}:`, event.target.error);
                            reject(event.target.error);
                        };
                    });
                });
            }
            
            return orphanedRecordings.length;
        }
        
        return 0;
    } catch (error) {
        console.error(`[${questionId}] Cleanup error:`, error);
        return 0;
    }
}

/**
 * Manually clean up all orphaned recordings - can be called from browser console
 * Usage: cleanupAllOrphanedRecordings()
 */
async function cleanupAllOrphanedRecordings() {
    console.log('Starting manual cleanup of all orphaned recordings...');
    
    try {
        const allRecordings = await new Promise((resolve) => {
            withDB(db => {
                const transaction = db.transaction("audioRecordings", "readonly");
                const store = transaction.objectStore("audioRecordings");
                const request = store.getAll();
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve([]);
            });
        });
        
        console.log(`Found ${allRecordings.length} total recordings`);
        
        // Find recordings that have failed cloud verification and no local blob
        const orphanedRecordings = allRecordings.filter(rec => 
            (!rec.cloudUrl || rec.uploadStatus === UPLOAD_STATUS.FAILED) && !rec.audio
        );
        
        console.log(`Found ${orphanedRecordings.length} orphaned recordings to clean up`);
        
        if (orphanedRecordings.length === 0) {
            console.log('No orphaned recordings found. Database is clean!');
            return 0;
        }
        
        // Delete orphaned recordings
        for (const orphaned of orphanedRecordings) {
            await new Promise((resolve, reject) => {
                withDB(db => {
                    const transaction = db.transaction("audioRecordings", "readwrite");
                    const store = transaction.objectStore("audioRecordings");
                    const request = store.delete(orphaned.id);
                    transaction.oncomplete = () => {
                        console.log(`✅ Cleaned up: ${orphaned.id}`);
                        resolve();
                    };
                    transaction.onerror = (event) => {
                        console.error(`❌ Error cleaning up ${orphaned.id}:`, event.target.error);
                        reject(event.target.error);
                    };
                });
            });
        }
        
        console.log(`🎉 Successfully cleaned up ${orphanedRecordings.length} orphaned recordings!`);
        console.log('Please refresh the page to see the updated recordings list.');
        
        return orphanedRecordings.length;
        
    } catch (error) {
        console.error('Error during manual cleanup:', error);
        return 0;
    }
}

/**
 * Generate radio program from collected recordings
 * @param {string} world - The world slug
 * @param {string} lmid - The LMID
 */
async function generateRadioProgram(world, lmid) {
    try {
        console.log(`🎙️ Starting radio program generation for ${world}/${lmid}`);
        
        // Step 1: Show initial modal and start immediately
        showRadioProgramModal('Collecting recordings...', 5);
        
        // Step 2: Collect recordings immediately
        const recordings = await collectRecordingsForRadioProgram(world, lmid);
        
        if (Object.keys(recordings).length === 0) {
            hideRadioProgramModal();
            alert('No recordings found for radio program generation. Please record some answers first.');
            return;
        }
        
        const questionIds = Object.keys(recordings);
        const totalRecordings = Object.values(recordings).reduce((sum, recs) => sum + recs.length, 0);
        
        console.log(`Found ${totalRecordings} recordings across ${questionIds.length} questions`);
        
        // Sort question IDs by numeric order  
        const sortedQuestionIds = sortQuestionIdsByDOMOrder(questionIds, world);
        console.log('📋 Question order:', sortedQuestionIds.join(', '));
        
        // Build audio segments in correct order
        const audioSegments = [];
        
        // 1. Add intro
        const introTimestamp = Date.now();
        const introUrl = `${RECORDING_CONFIG.CDN_BASE_URL}/audio/other/intro.mp3?t=${introTimestamp}`;
        audioSegments.push({
            type: 'single',
            url: introUrl
        });
        
        // 2. Add questions and answers in numeric order
        for (let i = 0; i < sortedQuestionIds.length; i++) {
            const questionId = sortedQuestionIds[i];
            const questionRecordings = recordings[questionId];
            
            // Add question prompt with cache-busting
            const cacheBustTimestamp = Date.now();
            const questionUrl = `${RECORDING_CONFIG.CDN_BASE_URL}/audio/${world}/${world}-QID${questionId}.mp3?t=${cacheBustTimestamp}`;
            audioSegments.push({
                type: 'single',
                url: questionUrl
            });
            console.log(`📁 Question ${questionId} prompt added`);
            
            // Sort answers by timestamp (first recorded = first played)
            const sortedAnswers = questionRecordings.sort((a, b) => a.timestamp - b.timestamp);
            const answerUrls = sortedAnswers.map(recording => recording.cloudUrl);
            
            console.log(`🎤 Question ${questionId}: ${answerUrls.length} answers`);
            
            // Combine answers with background music (cache-busted)
            const backgroundTimestamp = Date.now() + Math.random(); // Unique timestamp per question
            const backgroundUrl = `${RECORDING_CONFIG.CDN_BASE_URL}/audio/other/monkeys.mp3?t=${backgroundTimestamp}`;
            audioSegments.push({
                type: 'combine_with_background',
                answerUrls: answerUrls,
                backgroundUrl: backgroundUrl,
                questionId: questionId
            });
        }
        
        // 3. Add outro
        const outroTimestamp = Date.now() + 1;
        const outroUrl = `${RECORDING_CONFIG.CDN_BASE_URL}/audio/other/outro.mp3?t=${outroTimestamp}`;
        audioSegments.push({
            type: 'single',
            url: outroUrl
        });
        
        console.log(`🎼 Audio plan complete: ${audioSegments.length} segments`);
        
        // Step 3: Start actual audio processing immediately
        updateRadioProgramProgress('Starting audio processing...', 15, 'Initializing FFmpeg audio processor');
        
        // Start fun status messages during actual processing
        startFunStatusMessages();
        
        // Send to API for actual processing
        const response = await fetch(`${RECORDING_CONFIG.API_BASE_URL}/combine-audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                world: world,
                lmid: lmid,
                audioSegments: audioSegments
            })
        });
        
        // Stop fun messages when processing is done
        stopFunStatusMessages();
        updateRadioProgramProgress('Processing complete!', 95, 'Audio processing finished successfully');
        
        const result = await response.json();
        
        updateRadioProgramProgress('Finalizing...', 98, 'Uploading final radio program to CDN');
        
        if (result.success) {
            updateRadioProgramProgress('Complete!', 100);
            
            // Show success with player
            setTimeout(() => {
                showRadioProgramSuccess(result.url, world, lmid, Object.keys(recordings).length, totalRecordings);
            }, 1000);
            
            console.log(`Radio program generated successfully: ${result.url}`);
            
        } else {
            // Handle audio processing errors
            hideRadioProgramModal();
            
            const errorMessage = result.error || 'Radio program generation failed';
            
            if (result.missingFiles && result.missingFiles.length > 0) {
                console.error('API reported missing files:', result.missingFiles);
                const fileList = result.missingFiles.join('\n - ');
                alert('Audio processing failed because some required files are missing:' + '\n\n' + '- ' + fileList + '\n\n' + 'Please ensure all question prompts and user recordings are available, then try again.');
            } else if (errorMessage.includes('404')) {
                const missingFileMatch = errorMessage.match(/https:\/\/[^:\s]+/);
                const missingFile = missingFileMatch ? missingFileMatch[0] : 'a required audio file';
                console.error(`Audio processing failed because a file was not found: ${missingFile}`);
                alert(`Could not create the radio program because a required audio file is missing.\n\nMissing file: ${missingFile}\n\nPlease make sure all question prompts and user recordings have been fully uploaded and processed before trying again.`);
            } else {
                console.error(`Generic audio processing error: ${errorMessage}`);
                alert(`Failed to generate radio program: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
            }
        }
        
    } catch (error) {
        console.error('Radio program generation error:', error);
        hideRadioProgramModal();
        alert(`Failed to generate radio program: ${error.message}`);
    }
}

/**
 * Sort question IDs by their numeric order (from CMS "Little Microphones Order" field)
 * @param {string[]} questionIds - Array of question IDs (numeric strings)
 * @param {string} world - The world slug (not used anymore but kept for compatibility)
 * @returns {string[]} Sorted question IDs in numeric order
 */
function sortQuestionIdsByDOMOrder(questionIds, world) {
    // Simple numeric sort - convert to numbers, sort, then back to strings
    const sortedIds = questionIds
        .map(id => normalizeQuestionId(id))
        .sort((a, b) => parseInt(a) - parseInt(b));
    
    return sortedIds;
}

/**
 * Show radio program generation modal using Webflow-designed elements
 * @param {string} message - Status message
 * @param {number} progress - Progress percentage (0-100)
 */
function showRadioProgramModal(message, progress = 0) {
    // Find the Webflow-designed modal
    const modal = document.getElementById('radio-progress-modal');
    if (!modal) {
        console.error('Radio progress modal not found. Please add an element with ID "radio-progress-modal" in Webflow.');
        return;
    }
    
    // Update content elements
    const statusEl = document.getElementById('radio-status');
    const progressEl = document.getElementById('radio-progress');
    
    if (statusEl) statusEl.textContent = message;
    if (progressEl) progressEl.style.width = `${progress}%`;
    
    // Show the modal (remove any existing hiding classes and add display)
    modal.style.display = 'flex';
    modal.classList.remove('w--hidden', 'hide');
    modal.classList.add('show');
    
    console.log(`📱 Progress modal shown: ${message} (${progress}%)`);
}

/**
 * Update radio program generation progress
 * @param {string} message - Status message
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} details - Detailed status message (optional)
 */
function updateRadioProgramProgress(message, progress, details = '') {
    const statusEl = document.getElementById('radio-status');
    const progressEl = document.getElementById('radio-progress');
    const detailsEl = document.getElementById('radio-details');
    
    if (statusEl) statusEl.textContent = message;
    if (progressEl) progressEl.style.width = `${progress}%`;
    if (detailsEl && details) {
        // Add rotating animation for processing steps
        const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let spinnerIndex = 0;
        
        const updateSpinner = () => {
            if (detailsEl.textContent.includes(details.replace(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/g, ''))) {
                detailsEl.textContent = `${spinner[spinnerIndex]} ${details.replace(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/g, '')}`;
                spinnerIndex = (spinnerIndex + 1) % spinner.length;
            }
        };
        
        detailsEl.textContent = `${spinner[0]} ${details}`;
        const spinnerInterval = setInterval(updateSpinner, 100);
        
        // Store interval for cleanup
        if (!window.radioProgressIntervals) window.radioProgressIntervals = [];
        window.radioProgressIntervals.push(spinnerInterval);
    }
}

/**
 * Hide radio program modal using Webflow classes
 */
function hideRadioProgramModal() {
    const modal = document.getElementById('radio-progress-modal');
    if (modal) {
        // Hide the modal using Webflow's standard classes
        modal.style.display = 'none';
        modal.classList.add('w--hidden', 'hide');
        modal.classList.remove('show');
    }
    
    // Clean up any spinner intervals
    if (window.radioProgressIntervals) {
        window.radioProgressIntervals.forEach(interval => clearInterval(interval));
        window.radioProgressIntervals = [];
    }
    
    // Clean up fun status messages
    stopFunStatusMessages();
    
    console.log('📱 Progress modal hidden');
}

/**
 * Show radio program success modal using Webflow-designed elements
 * @param {string} audioUrl - URL of the generated radio program
 * @param {string} world - World name
 * @param {string} lmid - LMID
 * @param {number} questionCount - Number of questions processed
 * @param {number} totalRecordings - Total number of recordings processed
 */
function showRadioProgramSuccess(audioUrl, world, lmid, questionCount, totalRecordings) {
    hideRadioProgramModal();
    
    // Find the Webflow-designed success modal
    const modal = document.getElementById('radio-success-modal');
    if (!modal) {
        console.error('Radio success modal not found. Please add an element with ID "radio-success-modal" in Webflow.');
        return;
    }
    
    // Update content elements
    const descriptionEl = document.getElementById('radio-success-description');
    const audioPlayerEl = document.getElementById('radio-audio-player');
    const closeButtonEl = document.getElementById('close-radio-modal');
    
    // Format world name for display
    const worldName = world.charAt(0).toUpperCase() + world.slice(1).replace(/-/g, ' ');
    
    // Update description text
    if (descriptionEl) {
        descriptionEl.innerHTML = `Your <strong>${worldName}</strong> radio program is ready with ${questionCount} questions and ${totalRecordings} recordings.`;
    }
    
    // Update audio player
    if (audioPlayerEl) {
        audioPlayerEl.src = audioUrl;
        audioPlayerEl.load(); // Reload the audio element with new source
    }
    
    // Show the success modal
    modal.style.display = 'flex';
    modal.classList.remove('w--hidden', 'hide');
    modal.classList.add('show');
    
    // Set up close button event listener (if not already set up in Webflow)
    if (closeButtonEl && !closeButtonEl.hasAttribute('data-listener-added')) {
        closeButtonEl.addEventListener('click', () => {
            hideRadioProgramSuccessModal();
        });
        closeButtonEl.setAttribute('data-listener-added', 'true');
    }
    
    // Auto-close modal when clicking outside (if overlay click area exists)
    const handleOverlayClick = (e) => {
        if (e.target === modal) {
            hideRadioProgramSuccessModal();
        }
    };
    
    // Remove existing listener first, then add new one
    modal.removeEventListener('click', handleOverlayClick);
    modal.addEventListener('click', handleOverlayClick);
    
    console.log(`🎉 Success modal shown for ${worldName} program`);
}

/**
 * Hide radio program success modal
 */
function hideRadioProgramSuccessModal() {
    const modal = document.getElementById('radio-success-modal');
    if (modal) {
        // Hide the modal using Webflow's standard classes
        modal.style.display = 'none';
        modal.classList.add('w--hidden', 'hide');
        modal.classList.remove('show');
        
        // Stop audio playback
        const audioPlayerEl = document.getElementById('radio-audio-player');
        if (audioPlayerEl) {
            audioPlayerEl.pause();
            audioPlayerEl.currentTime = 0;
        }
    }
    
    console.log('🎉 Success modal hidden');
}

/**
 * Collect all recordings for radio program, grouped by question
 * @param {string} world - The world slug
 * @param {string} lmid - The LMID
 */
async function collectRecordingsForRadioProgram(world, lmid) {
    const recordings = {};
    const processedQuestionIds = new Set(); // Track processed IDs to prevent duplicates
    
    console.log(`🔍 Collecting recordings for ${world}/${lmid}`);
    
    // Method 1: Try to find recordings from DOM elements first
    const targetCollectionId = `collection-${world}`;
    const targetCollection = document.getElementById(targetCollectionId);
    
    if (targetCollection) {
        const recorderWrappers = targetCollection.querySelectorAll('.faq1_accordion.lm');
        
        for (const wrapper of recorderWrappers) {
            const rawQuestionId = wrapper.dataset.questionId;
            if (!rawQuestionId) continue;
            
            // Normalize to numeric format
            const questionId = normalizeQuestionId(rawQuestionId);
            
            // Skip if already processed
            if (processedQuestionIds.has(questionId)) {
                continue;
            }
            
            processedQuestionIds.add(questionId);
            
            try {
                const questionRecordings = await loadRecordingsFromDB(questionId, world, lmid);
                
                if (questionRecordings.length > 0) {
                    // Filter only recordings that have been successfully uploaded to cloud
                    const validRecordings = questionRecordings
                        .filter(rec => rec.uploadStatus === UPLOAD_STATUS.UPLOADED && rec.cloudUrl);
                    
                    if (validRecordings.length > 0) {
                        recordings[questionId] = validRecordings;
                        console.log(`✅ Question ${questionId}: ${validRecordings.length} recordings`);
                    }
                }
            } catch (error) {
                console.warn(`Error loading recordings for question ${questionId}:`, error);
            }
        }
    } else {
        console.warn(`Collection element not found: ${targetCollectionId}`);
    }
    
    // Method 2: Database discovery as fallback (only if no DOM elements found)
    if (Object.keys(recordings).length === 0) {
        console.log('📋 No recordings found from DOM, trying database discovery...');
        
        try {
            const discoveredQuestionIds = await discoverQuestionIdsFromDB(world, lmid);
            
            for (const questionId of discoveredQuestionIds) {
                // Skip if already processed
                if (processedQuestionIds.has(questionId)) {
                    continue;
                }
                
                processedQuestionIds.add(questionId);
                
                try {
                    const questionRecordings = await loadRecordingsFromDB(questionId, world, lmid);
                    
                                            if (questionRecordings.length > 0) {
                            const validRecordings = questionRecordings
                                .filter(rec => rec.uploadStatus === UPLOAD_STATUS.UPLOADED && rec.cloudUrl);
                        
                        if (validRecordings.length > 0) {
                            recordings[questionId] = validRecordings;
                            console.log(`✅ Question ${questionId}: ${validRecordings.length} recordings (discovered)`);
                        }
                    }
                } catch (error) {
                    console.warn(`Could not load recordings for question ${questionId}:`, error);
                }
            }
        } catch (error) {
            console.warn('Database discovery failed:', error);
        }
    }
    
    const totalQuestions = Object.keys(recordings).length;
    const totalRecordings = Object.values(recordings).reduce((sum, recs) => sum + recs.length, 0);
    console.log(`📊 Summary: ${totalQuestions} questions, ${totalRecordings} recordings`);
    
    return recordings;
}

/**
 * Discover what question IDs actually exist in the database for a given world/lmid
 * @param {string} world - The world slug
 * @param {string} lmid - The LMID
 * @returns {Promise<string[]>} Array of question IDs that have recordings
 */
async function discoverQuestionIdsFromDB(world, lmid) {
    return new Promise((resolve, reject) => {
        withDB(async (db) => {
            try {
                const transaction = db.transaction(['audioRecordings'], 'readonly');
                const store = transaction.objectStore('audioRecordings');
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const allRecordings = request.result;
                    const questionIds = new Set();
                    
                    // Filter recordings for this world/lmid and extract unique question IDs
                    const targetPattern = `kids-world_${world}-lmid_${lmid}-`;
                    
                    allRecordings.forEach(recording => {
                        if (recording.id && recording.id.includes(targetPattern)) {
                            questionIds.add(recording.questionId);
                        }
                    });
                    
                    resolve(Array.from(questionIds));
                };
                
                request.onerror = () => {
                    reject(new Error('Failed to query recordings from database'));
                };
            } catch (error) {
                reject(error);
            }
        });
    });
}

/**
 * Get all recordings for a specific world/lmid combination (used as fallback)
 * @param {string} world - The world slug  
 * @param {string} lmid - The LMID
 * @returns {Promise<Array>} Array of all recordings for this world/lmid
 */
async function getAllRecordingsForWorldLmid(world, lmid) {
    return new Promise((resolve, reject) => {
        withDB(async (db) => {
            try {
                const transaction = db.transaction(['audioRecordings'], 'readonly');
                const store = transaction.objectStore('audioRecordings');
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const allRecordings = request.result;
                    // Filter by ID pattern instead of separate world/lmid properties
                    const targetPattern = `kids-world_${world}-lmid_${lmid}-`;
                    const filteredRecordings = allRecordings.filter(recording => 
                        recording.id && recording.id.includes(targetPattern)
                    );
                    console.log(`[getAllRecordings] Found ${filteredRecordings.length} recordings for ${world}/${lmid}`);
                    resolve(filteredRecordings);
                };
                
                request.onerror = () => {
                    reject(new Error('Failed to query recordings from database'));
                };
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Make the functions available globally
window.generateRadioProgram = generateRadioProgram;
window.getAllRecordingsForWorldLmid = getAllRecordingsForWorldLmid;
window.loadRecordingsFromDB = loadRecordingsFromDB;

// Export other essential functions
window.initializeAudioRecorder = initializeAudioRecorder;
window.initializeRecordersForWorld = initializeRecordersForWorld;
window.cleanupAllOrphanedRecordings = cleanupAllOrphanedRecordings;

// Export modal functions for external use
window.showRadioProgramModal = showRadioProgramModal;
window.hideRadioProgramModal = hideRadioProgramModal;
window.showRadioProgramSuccess = showRadioProgramSuccess;
window.hideRadioProgramSuccessModal = hideRadioProgramSuccessModal;

// --- Script ready event - MUST be at the very end ---
window.isRecordingScriptReady = true;
document.dispatchEvent(new CustomEvent('recording-script-ready'));
console.log('✅ recording.js script fully loaded and ready.');

/**
 * Start fun status messages during actual audio processing
 */
function startFunStatusMessages() {
    const funMessages = [
        'Downloading audio files from CDN',
        'Applying noise reduction to recordings',
        'Normalizing volume levels',
        'Combining audio segments',
        'Adding background music',
        'Mixing audio tracks',
        'Applying audio filters',
        'Balancing sound levels',
        'Processing audio effects',
        'Optimizing audio quality',
        'Adding magical touches',
        'Polishing the final mix',
        'Rendering final audio',
        'Adding sparkles and unicorns',
        'Teaching monkeys to sing',
        'Consulting with audio wizards',
        'Sprinkling audio fairy dust',
        'Fine-tuning the awesome',
        'Making it sound amazing'
    ];
    
    let messageIndex = 0;
    
    // Update status every 1.5 seconds during actual processing
    window.funStatusInterval = setInterval(() => {
        const detailsEl = document.getElementById('radio-details');
        if (detailsEl && window.funStatusInterval) {
            const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            const spinnerChar = spinner[Math.floor(Date.now() / 100) % spinner.length];
            const message = funMessages[messageIndex % funMessages.length];
            detailsEl.textContent = `${spinnerChar} ${message}`;
            messageIndex++;
        }
    }, 1500);
}

/**
 * Stop fun status messages
 */
function stopFunStatusMessages() {
    if (window.funStatusInterval) {
        clearInterval(window.funStatusInterval);
        window.funStatusInterval = null;
    }
} 