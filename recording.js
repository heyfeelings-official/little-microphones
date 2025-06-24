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

const savingLocks = new Set();

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
    if (recordingData.uploadStatus === 'uploaded' && recordingData.cloudUrl) {
        const isAccessible = await verifyCloudUrl(recordingData.cloudUrl);
        if (isAccessible) {
            return recordingData.cloudUrl;
        } else {
            console.warn(`Cloud file no longer accessible: ${recordingData.cloudUrl}`);
            // Update the recording status to indicate cloud file is missing
            recordingData.uploadStatus = 'failed';
            recordingData.cloudUrl = null;
            await updateRecordingInDB(recordingData);
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
 * Update upload status UI element
 */
function updateUploadStatusUI(statusElement, recordingData) {
    switch(recordingData.uploadStatus) {
        case 'pending':
            statusElement.innerHTML = '⏳ Queued for backup';
            statusElement.style.color = '#888';
            break;
        case 'uploading':
            statusElement.innerHTML = `⬆️ Backing up... ${recordingData.uploadProgress}%`;
            statusElement.style.color = '#007bff';
            break;
        case 'uploaded':
            statusElement.innerHTML = '☁️ Backed up';
            statusElement.style.color = '#28a745';
            break;
        case 'failed':
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
            if (savingLocks.has(questionId)) {
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
     * Check if user can record more (max 30 per question)
     */
    async function checkRecordingLimit() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const world = window.currentRecordingParams?.world || urlParams.get('world') || 'unknown-world';
            const lmid = window.currentRecordingParams?.lmid || urlParams.get('lmid') || 'unknown-lmid';
            
            const recordings = await loadRecordingsFromDB(questionId, world, lmid);
            const currentCount = recordings.length;
            
            console.log(`[${questionId}] Recordings: ${currentCount}/30`);
            return currentCount < 30;
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
        alert('Maximum 30 recordings per question. Delete an old recording to record a new one.');
        console.log(`[${questionId}] Recording limit reached (30/30)`);
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
                savingLocks.delete(questionId); // Release global lock on error
                cleanupAfterRecording(stream);
            };

            mediaRecorder.onstop = async () => {
                // Set lock for saving process
                savingLocks.add(questionId);

                try {
                    if(statusDisplay) statusDisplay.textContent = "Processing...";
                    
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    audioChunks = [];

                    // Get world and lmid from URL params or global params
                    const urlParams = new URLSearchParams(window.location.search);
                    const world = window.currentRecordingParams?.world || urlParams.get('world') || 'unknown-world';
                    const lmid = window.currentRecordingParams?.lmid || urlParams.get('lmid') || 'unknown-lmid';

                    // --- Use timestamp for unique ID ---
                    const timestamp = Date.now();
                    const newId = `kids-world_${world}-lmid_${lmid}-question_${questionId}-tm_${timestamp}`;
                    console.log(`[${questionId}] Generated ID: ${newId}`);

                    const recordingData = {
                        id: newId,
                        questionId: questionId, // Keep for filtering
                        audio: audioBlob,
                        cloudUrl: null,          // Will be set after upload
                        uploadStatus: 'pending', // pending, uploading, uploaded, failed
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
                    savingLocks.delete(questionId); // Release global lock
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
            }, 600000); // 10 minutes limit

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
        animationFrameId = requestAnimationFrame(drawLiveWaveform);
        if (!analyser || !canvasCtx) return;

        analyser.getByteFrequencyData(dataArray);

        const canvasWidth = liveWaveformCanvas.width;
        const canvasHeight = liveWaveformCanvas.height;
    
        if (canvasWidth === 0 || canvasHeight === 0) return;

        canvasCtx.fillStyle = '#FFFFFF';
        canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);

        const bufferLength = analyser.frequencyBinCount;
        const barWidth = 3;
        const barSpacing = 2;
        const totalBarAreaWidth = bufferLength * (barWidth + barSpacing);
        let x = (canvasWidth - totalBarAreaWidth) / 2;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvasHeight;
            canvasCtx.fillStyle = '#D9D9D9';
            canvasCtx.fillRect(x, (canvasHeight - barHeight) / 2, barWidth, barHeight);
            x += barWidth + barSpacing;
        }
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
            recordingData.uploadStatus = 'uploading';
            recordingData.uploadProgress = 10;
            await updateRecordingInDB(recordingData);
            updateRecordingUI(recordingData);

            // Convert blob to base64
            const base64Audio = await blobToBase64(recordingData.audio);
            recordingData.uploadProgress = 30;
            await updateRecordingInDB(recordingData);
            updateRecordingUI(recordingData);

            // Upload via API route
            const response = await fetch('https://little-microphones.vercel.app/api/upload-audio', {
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
                    recordingData.uploadStatus = 'uploaded';
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
            recordingData.uploadStatus = 'failed';
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

    function getSupportedMimeType() {
        const type = ['audio/webm;codecs=opus', 'audio/webm'].find(MediaRecorder.isTypeSupported);
        return type ? { mimeType: type } : undefined;
    }
    
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

    function formatTime(s) {
        const m = Math.floor(s / 60);
        const rs = s % 60;
        return `${String(m).padStart(2, '0')}:${String(rs).padStart(2, '0')}`;
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
        const request = indexedDB.open("kidsAudioDB", 2); // Bumped version to 2 to trigger upgrade

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;

            let store;
            if (oldVersion < 1) {
                // Database is new, create object store
                store = db.createObjectStore("audioRecordings", { keyPath: "id" });
            } else {
                // Database exists, get store from transaction
                store = event.target.transaction.objectStore("audioRecordings");
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
    const transaction = db.transaction("audioRecordings", type);
    callback(transaction.objectStore("audioRecordings"));
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
            const transaction = db.transaction("audioRecordings", "readonly");
            const store = transaction.objectStore("audioRecordings");
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
            const transaction = db.transaction("audioRecordings", "readonly");
            const store = transaction.objectStore("audioRecordings");
            const request = store.getAll();

            request.onsuccess = () => {
                const allRecordings = request.result;
                // Filter recordings by questionId, world, and lmid
                const filteredRecordings = allRecordings.filter(rec => {
                    return rec.questionId === questionId && 
                           rec.id.includes(`kids-world_${world}-lmid_${lmid}-`);
                });
                console.log(`[${questionId}] Loaded ${filteredRecordings.length} recordings from DB`);
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
    if (initializedWorlds.has(world)) {
        console.log(`Recorders for world "${world}" already initialized, skipping.`);
        return;
    }
    
    initializedWorlds.add(world);
    console.log(`Initializing recorders for world: ${world}`);
    injectGlobalStyles();
    
    // Target only the collection for the current world
    const targetCollectionId = `collection-${world}`;
    const targetCollection = document.getElementById(targetCollectionId);
    
    if (!targetCollection) {
        console.warn(`Collection not found: ${targetCollectionId}`);
        initializedWorlds.delete(world); // Remove from set if collection not found
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
            rec.uploadStatus === 'failed' && !rec.audio && !rec.cloudUrl
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
            (!rec.cloudUrl || rec.uploadStatus === 'failed') && !rec.audio
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
 * Generate radio program from collected recordings
 * @param {string} world - The world slug
 * @param {string} lmid - The LMID
 */
async function generateRadioProgram(world, lmid) {
    try {
        console.log(`🎙️ Starting radio program generation for ${world}/${lmid}`);
        
        // Step 1: Show initial modal
        showRadioProgramModal('Initializing radio program generation...', 0);
        
        // Add fake progress messages
        const fakeProgressSteps = [
            { message: 'Gathering the questions...', progress: 5, detail: 'Scanning question database' },
            { message: 'Looking for answers...', progress: 10, detail: 'Searching for recorded responses' },
            { message: 'Analyzing recordings...', progress: 15, detail: 'Checking audio quality' },
            { message: 'Organizing content...', progress: 20, detail: 'Sorting by question order' }
        ];
        
        // Show fake progress
        for (const step of fakeProgressSteps) {
            updateRadioProgramProgress(step.message, step.progress, step.detail);
            await new Promise(resolve => setTimeout(resolve, 800));
        }
        
        // Step 2: Collect recordings (keep this real)
        const recordings = await collectRecordingsForRadioProgram(world, lmid);
        
        if (Object.keys(recordings).length === 0) {
            hideRadioProgramModal();
            alert('No recordings found for radio program generation. Please record some answers first.');
            return;
        }
        
        const questionIds = Object.keys(recordings);
        const totalRecordings = Object.values(recordings).reduce((sum, recs) => sum + recs.length, 0);
        
        // Update progress with real data
        updateRadioProgramProgress(`Found ${totalRecordings} answers`, 25, `Discovered recordings for ${questionIds.length} questions`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`Found ${totalRecordings} recordings across ${questionIds.length} questions`);
        console.log('🎵 BUILDING FRESH AUDIO PLAN WITH LATEST RECORDINGS:');
        
        // More fake progress messages
        const moreFakeSteps = [
            { message: 'Combining answers for questions...', progress: 30, detail: 'Processing audio segments' },
            { message: 'Adding background sound...', progress: 35, detail: 'Mixing background music' },
            { message: 'Putting things together...', progress: 40, detail: 'Assembling audio timeline' },
            { message: 'Sprinkling some fun...', progress: 45, detail: 'Adding creative elements' },
            { message: 'Fun added!', progress: 50, detail: 'Creative processing complete' },
            { message: 'Hmm let\'s add even more fun...', progress: 55, detail: 'Extra fun processing' },
            { message: 'Adding magical touches...', progress: 60, detail: 'Enhancing audio experience' },
            { message: 'Almost there...', progress: 65, detail: 'Final preparations' }
        ];
        
        // Show more fake progress
        for (const step of moreFakeSteps) {
            updateRadioProgramProgress(step.message, step.progress, step.detail);
            await new Promise(resolve => setTimeout(resolve, 600));
        }
        
        // Sort question IDs by DOM order instead of alphabetical
        const sortedQuestionIds = sortQuestionIdsByDOMOrder(questionIds, world);
        console.log('📋 Question order (numeric):', sortedQuestionIds);
        
        // Verify that we have the correct DOM sequence
        console.log('🎯 Building audio segments in numeric order:');
        console.log(`   Total questions to process: ${sortedQuestionIds.length}`);
        console.log(`   Question sequence:`, sortedQuestionIds.map((qid, i) => `${i + 1}. Question ${qid}`));
        
        // Build audio segments in correct order
        const audioSegments = [];
        
        // 1. Add intro with cache-busting
        const introTimestamp = Date.now();
        const introUrl = `https://little-microphones.b-cdn.net/audio/other/intro.mp3?t=${introTimestamp}`;
        audioSegments.push({
            type: 'single',
            url: introUrl
        });
        console.log('📁 Added intro (segment 1)');
        
        // 2. Add questions and answers in DOM order
        for (let i = 0; i < sortedQuestionIds.length; i++) {
            const questionId = sortedQuestionIds[i];
            const questionRecordings = recordings[questionId];
            const questionNumber = i + 1;
            const segmentNumber = (i * 2) + 2; // Each question creates 2 segments (prompt + answers)
            
            console.log(`🎵 Processing question ${questionNumber}/${sortedQuestionIds.length}: Question ${questionId}`);
            
            // Add question prompt with cache-busting
            const cacheBustTimestamp = Date.now();
            const questionUrl = `https://little-microphones.b-cdn.net/audio/${world}/${world}-${questionId}.mp3?t=${cacheBustTimestamp}`;
            audioSegments.push({
                type: 'single',
                url: questionUrl
            });
            console.log(`📁 Added question prompt (segment ${segmentNumber}): Question ${questionId}`);
            
            // Sort answers by timestamp (first recorded = first played)
            const sortedAnswers = questionRecordings.sort((a, b) => a.timestamp - b.timestamp);
            const answerUrls = sortedAnswers.map(recording => recording.cloudUrl);
            
            console.log(`🎤 Adding ${answerUrls.length} answers for Question ${questionId} (segment ${segmentNumber + 1}):`);
            answerUrls.forEach((url, index) => {
                console.log(`   Answer ${index + 1}: ${url.substring(url.lastIndexOf('/') + 1)}`);
            });
            
            // Combine answers with background music (cache-busted)
            const backgroundTimestamp = Date.now() + Math.random(); // Unique timestamp per question
            const backgroundUrl = `https://little-microphones.b-cdn.net/audio/other/monkeys.mp3?t=${backgroundTimestamp}`;
            audioSegments.push({
                type: 'combine_with_background',
                answerUrls: answerUrls,
                backgroundUrl: backgroundUrl,
                questionId: questionId
            });
            console.log(`🐒 Added answers with background (segment ${segmentNumber + 1}): Question ${questionId}`);
        }
        
        // 3. Add outro with cache-busting
        const outroTimestamp = Date.now() + 1; // Slightly different timestamp
        const outroUrl = `https://little-microphones.b-cdn.net/audio/other/outro.mp3?t=${outroTimestamp}`;
        audioSegments.push({
            type: 'single',
            url: outroUrl
        });
        console.log(`📁 Added outro (segment ${audioSegments.length})`);
        
        // Final verification of audio sequence
        console.log(`🎼 FINAL AUDIO PLAN: ${audioSegments.length} segments total`);
        console.log('📋 Complete radio program sequence (numeric order):');
        audioSegments.forEach((segment, index) => {
            if (segment.type === 'single') {
                const fileName = segment.url.split('/').pop().split('?')[0];
                console.log(`   ${index + 1}. [SINGLE] ${fileName}`);
            } else if (segment.type === 'combine_with_background') {
                console.log(`   ${index + 1}. [COMBINED] Question ${segment.questionId} (${segment.answerUrls.length} answers + background)`);
            }
        });
        
        console.log('📋 Full audio plan details:', audioSegments);
        
        updateRadioProgramProgress('Sending to audio processor...', 70, `Processing ${questionIds.length} questions with combined answers`);
        
        // Start fake status messages for entertainment (independent of real progress)
        startFakeStatusMessages();
        
        // Step 3: Send the structured audio plan to API
        const response = await fetch('https://little-microphones.vercel.app/api/combine-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                world: world,
                lmid: lmid,
                audioSegments: audioSegments  // Send structured segments instead of flat URLs
            })
        });
        
        // Stop fake messages when real processing is done
        stopFakeStatusMessages();
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
    console.log(`🔍 Sorting questions using numeric order`);
    console.log(`📋 Input question IDs:`, questionIds);
    
    // Simple numeric sort - convert to numbers, sort, then back to strings
    const sortedIds = questionIds
        .map(id => normalizeQuestionId(id))
        .sort((a, b) => parseInt(a) - parseInt(b));
    
    console.log('📋 Final numeric order:', sortedIds);
    console.log(`🔄 Order mapping:`, sortedIds.map((qid, index) => `${index + 1}. Question ${qid}`));
    
    return sortedIds;
}

/**
 * Show radio program generation modal
 * @param {string} message - Status message
 * @param {number} progress - Progress percentage (0-100)
 */
function showRadioProgramModal(message, progress = 0) {
    // Remove existing modal if present
    const existingModal = document.getElementById('radio-program-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'radio-program-modal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;
    
    modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">🎙️</div>
        <h2 style="margin: 0 0 20px 0; color: #333;">Creating Radio Program</h2>
        <p id="radio-status" style="margin: 0 0 20px 0; font-size: 16px; color: #666;">${message}</p>
        <div style="width: 100%; height: 8px; background: #f0f0f0; border-radius: 4px; margin-bottom: 20px;">
            <div id="radio-progress" style="width: ${progress}%; height: 100%; background: #007bff; border-radius: 4px; transition: width 0.3s ease;"></div>
        </div>
        <p id="radio-details" style="margin: 0 0 10px 0; font-size: 12px; color: #888; min-height: 16px; font-family: monospace;"></p>
        <p style="margin: 0; font-size: 14px; color: #888;">This may take a few minutes...</p>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
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
 * Start fake status messages for user engagement (independent of real progress)
 */
function startFakeStatusMessages() {
    const fakeMessages = [
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
        'Rendering final audio',
        'Applying final touches'
    ];
    
    let messageIndex = 0;
    
    // Update fake status every 1.2 seconds
    window.fakeStatusInterval = setInterval(() => {
        const detailsEl = document.getElementById('radio-details');
        if (detailsEl && window.fakeStatusInterval) {
            const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            const spinnerChar = spinner[Math.floor(Date.now() / 100) % spinner.length];
            const message = fakeMessages[messageIndex % fakeMessages.length];
            detailsEl.textContent = `${spinnerChar} ${message}`;
            messageIndex++;
        }
    }, 1200);
}

/**
 * Stop fake status messages
 */
function stopFakeStatusMessages() {
    if (window.fakeStatusInterval) {
        clearInterval(window.fakeStatusInterval);
        window.fakeStatusInterval = null;
    }
}

/**
 * Hide radio program modal
 */
function hideRadioProgramModal() {
    const modal = document.getElementById('radio-program-modal');
    if (modal) {
        modal.remove();
    }
    
    // Clean up any spinner intervals
    if (window.radioProgressIntervals) {
        window.radioProgressIntervals.forEach(interval => clearInterval(interval));
        window.radioProgressIntervals = [];
    }
    
    // Clean up fake status messages
    stopFakeStatusMessages();
}

/**
 * Show radio program success modal with player
 * @param {string} audioUrl - URL of the generated radio program
 * @param {string} world - World name
 * @param {string} lmid - LMID
 * @param {number} questionCount - Number of questions processed
 * @param {number} totalRecordings - Total number of recordings processed
 */
function showRadioProgramSuccess(audioUrl, world, lmid, questionCount, totalRecordings) {
    hideRadioProgramModal();
    
    // Create success modal
    const overlay = document.createElement('div');
    overlay.id = 'radio-success-modal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 12px;
        max-width: 600px;
        width: 90%;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;
    
    const worldName = world.charAt(0).toUpperCase() + world.slice(1).replace(/-/g, ' ');
    
    modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
        <h2 style="margin: 0 0 20px 0; color: #28a745;">Radio Program Ready!</h2>
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #666;">
            Your <strong>${worldName}</strong> radio program is ready with ${questionCount} questions and ${totalRecordings} recordings.
        </p>
        
        <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <audio controls style="width: 100%; margin-bottom: 15px;" preload="metadata" crossorigin="anonymous">
                <source src="${audioUrl}" type="audio/mpeg">
                <source src="${audioUrl}" type="audio/mp3">
                Your browser does not support the audio element.
            </audio>
        </div>
        
        <button id="close-radio-modal" 
                style="background: #28a745; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            ✓ Close
        </button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Add close button event listener
    const closeButton = modal.querySelector('#close-radio-modal');
    closeButton.addEventListener('click', () => {
        overlay.remove();
    });
    
    // Auto-close modal when clicking outside
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
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
        console.log(`📋 Found ${recorderWrappers.length} question elements in DOM`);
        
        for (const wrapper of recorderWrappers) {
            const rawQuestionId = wrapper.dataset.questionId;
            if (!rawQuestionId) continue;
            
            // Normalize to numeric format
            const questionId = normalizeQuestionId(rawQuestionId);
            
            // Skip if already processed
            if (processedQuestionIds.has(questionId)) {
                console.log(`⚠️ Skipping duplicate question ID: ${questionId}`);
                continue;
            }
            
            processedQuestionIds.add(questionId);
            
            try {
                const questionRecordings = await loadRecordingsFromDB(questionId, world, lmid);
                
                if (questionRecordings.length > 0) {
                    console.log(`[${questionId}] Found ${questionRecordings.length} recordings in DB`);
                    
                    // Filter only recordings that have been successfully uploaded to cloud
                    const validRecordings = questionRecordings
                        .filter(rec => rec.uploadStatus === 'uploaded' && rec.cloudUrl);
                    
                    if (validRecordings.length > 0) {
                        recordings[questionId] = validRecordings;
                        console.log(`✅ Added ${validRecordings.length} valid recordings for question ${questionId}`);
                    } else {
                        console.log(`[${questionId}] No valid uploaded recordings (${questionRecordings.length} total, but none uploaded to cloud)`);
                    }
                } else {
                    console.log(`[${questionId}] No recordings found in DB`);
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
        console.log('📋 No recordings found from DOM elements, trying database discovery...');
        
        try {
            const discoveredQuestionIds = await discoverQuestionIdsFromDB(world, lmid);
            console.log(`🔍 Discovered question IDs from database:`, discoveredQuestionIds);
            
            for (const questionId of discoveredQuestionIds) {
                // Skip if already processed
                if (processedQuestionIds.has(questionId)) {
                    console.log(`⚠️ Skipping already processed question ID: ${questionId}`);
                    continue;
                }
                
                processedQuestionIds.add(questionId);
                
                try {
                    const questionRecordings = await loadRecordingsFromDB(questionId, world, lmid);
                    
                    if (questionRecordings.length > 0) {
                        const validRecordings = questionRecordings
                            .filter(rec => rec.uploadStatus === 'uploaded' && rec.cloudUrl);
                        
                        if (validRecordings.length > 0) {
                            recordings[questionId] = validRecordings;
                            console.log(`✅ Added ${validRecordings.length} valid recordings for question ${questionId} (discovered)`);
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
    
    console.log(`📊 Final collection summary:`);
    console.log(`   Questions with recordings: ${Object.keys(recordings).length}`);
    console.log(`   Total processed questions: ${processedQuestionIds.size}`);
    Object.entries(recordings).forEach(([qid, recs]) => {
        console.log(`   Question ${qid}: ${recs.length} recordings`);
    });
    
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
                    
                    console.log(`[Discovery] Found ${allRecordings.length} total recordings in DB`);
                    
                    // Filter recordings for this world/lmid and extract unique question IDs
                    // ID format: kids-world_spookyland-lmid_33-question_9-tm_1750614299968
                    const targetPattern = `kids-world_${world}-lmid_${lmid}-`;
                    
                    allRecordings.forEach(recording => {
                        console.log(`[Discovery] Checking recording:`, {
                            id: recording.id,
                            questionId: recording.questionId,
                            matchesPattern: recording.id.includes(targetPattern)
                        });
                        
                        if (recording.id && recording.id.includes(targetPattern)) {
                            questionIds.add(recording.questionId);
                            console.log(`[Discovery] Added questionId: ${recording.questionId}`);
                        }
                    });
                    
                    console.log(`[Discovery] Final discovered question IDs:`, Array.from(questionIds));
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

// --- Script ready event - MUST be at the very end ---
window.isRecordingScriptReady = true;
document.dispatchEvent(new CustomEvent('recording-script-ready'));
console.log('✅ recording.js script fully loaded and ready.'); 