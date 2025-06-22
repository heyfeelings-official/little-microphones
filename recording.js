// recording.js - Manages multiple, independent audio recorder instances on a page.

const savingLocks = new Set();

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
        console.log(`[Q-ID ${questionId}] No cloud URL, skipping cloud deletion`);
        return true;
    }

    try {
        const filename = `${recordingData.id}.webm`;
        console.log(`[Q-ID ${questionId}] Deleting from Bunny.net: ${filename}`);

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
            console.log(`[Q-ID ${questionId}] Successfully deleted from cloud: ${filename}`);
            return true;
        } else {
            throw new Error(result.error || 'Delete failed');
        }

    } catch (error) {
        console.error(`[Q-ID ${questionId}] Cloud deletion failed:`, error);
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
    const questionId = recorderWrapper.dataset.questionId;
    if (!questionId) {
        console.warn('No questionId found for recorder wrapper, skipping initialization');
        return;
    }
    
    // Prevent double initialization
    if (recorderWrapper.dataset.recordingInitialized === 'true') {
        console.log(`[Q-ID ${questionId}] Already initialized, skipping.`);
        return;
    }
    
    // Mark as initialized
    recorderWrapper.dataset.recordingInitialized = 'true';
    console.log(`[Q-ID ${questionId}] Initializing audio recorder...`);

    // --- Step 1: Find ONLY the button initially ---
    const recordButton = recorderWrapper.querySelector('.record-button');
    if (!recordButton) {
        console.error(`[Q-ID ${questionId}] Critical element .record-button not found. Skipping.`);
        return;
    }
    
    // --- Instance variables (shared across functions in this scope) ---
    let placeholderEl, statusDisplay, timerDisplay, recordingsListUI, liveWaveformCanvas, canvasCtx;
    let mediaRecorder, audioChunks = [], timerInterval, seconds = 0, stream;
    let audioContext, analyser, sourceNode, dataArray, animationFrameId;
    let canvasSized = false;

    // --- Initial DB load to show previous recordings ---
    recordingsListUI = recorderWrapper.querySelector('.recording-list.w-list-unstyled');
    if (recordingsListUI) {
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
                console.warn(`Recording for Q-ID ${questionId} is already being processed, please wait.`);
                return;
            }
            
            // --- Step 2: Find all other elements ON-DEMAND when user clicks ---
            liveWaveformCanvas = recorderWrapper.querySelector('.live-waveform-canvas');
            
            // No longer finding status/timer here, they are created dynamically.
            startActualRecording();
        }
    }

    async function startActualRecording() {
        try {
            // --- Create a placeholder in the UI ---
            if (recordingsListUI) {
                placeholderEl = document.createElement('li');
                placeholderEl.className = 'recording-placeholder new-recording-fade-in';

                statusDisplay = document.createElement('span');
                statusDisplay.className = 'placeholder-status';
                statusDisplay.textContent = 'Nagrywanie...';

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
                    if(statusDisplay) statusDisplay.textContent = "Przetwarzanie...";
                    
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    audioChunks = [];

                    // Get world and lmid from URL params or global params
                    const urlParams = new URLSearchParams(window.location.search);
                    const world = window.currentRecordingParams?.world || urlParams.get('world') || 'unknown-world';
                    const lmid = window.currentRecordingParams?.lmid || urlParams.get('lmid') || 'unknown-lmid';

                    // --- Use timestamp for unique ID ---
                    const timestamp = Date.now();
                    const newId = `kids-world_${world}-lmid_${lmid}-question_${questionId}-tm_${timestamp}`;
                    console.log(`[Q-ID ${questionId}] Generated unique ID with timestamp: ${newId}`);

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
            console.log(`[Q-ID ${questionId}] Starting upload to Bunny.net: ${recordingData.id}`);
            
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
                    filename: `${recordingData.id}.webm`,
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
                    console.log(`[Q-ID ${questionId}] Successfully uploaded: ${result.url}`);
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            } else {
                // Handle non-JSON error responses (like HTML error pages)
                const errorText = await response.text();
                console.error(`[Q-ID ${questionId}] Upload API error: ${response.status} - ${errorText}`);
                throw new Error(`Upload API error: ${response.status}`);
            }

        } catch (error) {
            recordingData.uploadStatus = 'failed';
            recordingData.uploadProgress = 0;
            console.error(`[Q-ID ${questionId}] Upload failed:`, error);
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

    function deleteRecordingFromDB(recordingId) {
        withStore('readwrite', store => {
            store.delete(recordingId);
        });
    }



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
                    console.log(`[Q-ID ${questionId}] [${world}/${lmid}] Loaded ${filteredRecordings.length} recordings from DB.`);
                    resolve(filteredRecordings);
                };
                request.onerror = () => {
                    console.error(`[Q-ID ${questionId}] [${world}/${lmid}] Error loading recordings.`);
                    resolve([]); // Return empty array on error
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
            console.warn(`[Q-ID "${questionId}"] Canvas is not visible. Sizing deferred.`);
            return;
        }

        liveWaveformCanvas.width = rect.width * dpr;
        liveWaveformCanvas.height = rect.height * dpr;
        
        canvasCtx.scale(dpr, dpr);
        canvasSized = true;
        console.log(`[Q-ID "${questionId}"] Canvas sized to:`, rect.width, 'x', rect.height);
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
    
    console.log(`Initializing recorders for world: ${world}`);
    injectGlobalStyles();
    
    // Target only the collection for the current world
    const targetCollectionId = `collection-${world}`;
    const targetCollection = document.getElementById(targetCollectionId);
    
    if (!targetCollection) {
        console.warn(`Collection not found: ${targetCollectionId}`);
        return;
    }
    
    // Find recorders only within the target collection
    const recorderWrappers = targetCollection.querySelectorAll('.faq1_accordion.lm');
    console.log(`Found ${recorderWrappers.length} recorder wrappers in ${targetCollectionId}`);
    
    // Initialize each recorder
    recorderWrappers.forEach((wrapper, index) => {
        const questionId = wrapper.dataset.questionId;
        console.log(`Initializing wrapper ${index + 1}: questionId="${questionId}"`);
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