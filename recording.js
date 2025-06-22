// recording.js - Manages multiple, independent audio recorder instances on a page.

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

        @keyframes fadeOutAndShrink {
            from {
                opacity: 1;
                transform: scaleY(1);
                max-height: 100px;
            }
            to {
                opacity: 0;
                transform: scaleY(0);
                max-height: 0;
                margin: 0;
                padding: 0;
                border: 0;
            }
        }

        .element-fade-out {
            animation: fadeOutAndShrink 0.4s ease-out forwards;
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
function createRecordingElement(recordingData, questionId) {
    const li = document.createElement('li');
    li.dataset.recordingId = recordingData.id;

    const audioURL = URL.createObjectURL(recordingData.audio);
    const audio = new Audio(audioURL);
    audio.controls = true;
    audio.style.width = '100%';

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
    infoContainer.appendChild(deleteButton);

    li.appendChild(audio);
    li.appendChild(infoContainer);

    return li;
}

/**
 * Deletes a recording from the database and removes its element from the UI.
 * @param {string} recordingId - The ID of the recording to delete.
 * @param {string} questionId - The ID of the associated question.
 * @param {HTMLLIElement} elementToRemove - The element to remove from the DOM.
 */
async function deleteRecording(recordingId, questionId, elementToRemove) {
    console.log(`Deleting recording ${recordingId} for question ${questionId}`);
    
    elementToRemove.style.overflow = 'hidden';
    elementToRemove.classList.add('element-fade-out');

    elementToRemove.addEventListener('animationend', () => {
        elementToRemove.remove();
    }, { once: true });

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
}

/**
 * Initializes a single audio recorder instance.
 * @param {HTMLElement} recorderWrapper - The main container element for this recorder.
 */
function initializeAudioRecorder(recorderWrapper) {
    const questionId = recorderWrapper.dataset.questionId;
    if (!questionId) return;

    // --- Step 1: Find ONLY the button initially ---
    const recordButton = recorderWrapper.querySelector('.record-button');
    if (!recordButton) {
        console.error(`[Q-ID ${questionId}] Critical element .record-button not found. Skipping.`);
        return;
    }
    
    console.log(`[Q-ID ${questionId}] Recorder ready for user interaction.`);

    // --- Instance variables (will be populated on-demand) ---
    let placeholderEl, statusDisplay, timerDisplay, recordingsListUI, liveWaveformCanvas, canvasCtx;
    let mediaRecorder, audioChunks = [], timerInterval, seconds = 0, stream;
    let audioContext, analyser, sourceNode, dataArray, animationFrameId;
    let canvasSized = false;

    // --- Initial DB load to show previous recordings ---
    recordingsListUI = recorderWrapper.querySelector('.recording-list.w-list-unstyled');
    if (recordingsListUI) {
        loadRecordingsFromDB(questionId).then(recordings => {
            recordingsListUI.innerHTML = ''; // Clear previous
            recordings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            recordings.forEach(rec => {
                const recElement = createRecordingElement(rec, questionId);
                recordingsListUI.appendChild(recElement);
            });
        });
    }
    
    recordButton.addEventListener('click', handleRecordButtonClick);

    function handleRecordButtonClick(event) {
        event.preventDefault();
        
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        } else {
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
                cleanupAfterRecording(stream);
            };

            mediaRecorder.onstop = async () => {
                if(statusDisplay) statusDisplay.textContent = "Przetwarzanie...";
                
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks = [];

                // --- New Naming Convention with Timestamp for uniqueness ---
                const world = window.currentRecordingParams?.world || 'unknown-world';
                const lmid = window.currentRecordingParams?.lmid || 'unknown-lmid';
                const timestampId = Date.now();
                const newId = `kids-world_${world}-lmid_${lmid}-question_${questionId}-audio_${timestampId}`;

                const recordingData = {
                    id: newId,
                    questionId: questionId, // Keep for filtering
                    audio: audioBlob,
                    timestamp: new Date().toISOString()
                };

                await saveRecordingToDB(recordingData);

                // Create the final UI element
                const newRecordingElement = createRecordingElement(recordingData, questionId);
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
                
                // --- Reset button state ---
                cleanupAfterRecording(stream);
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

    function deleteRecording(recordingId, questionId, elementToRemove) {
        console.log(`Deleting recording ${recordingId} for question ${questionId}`);
        withDB(db => {
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

    function deleteRecordingFromDB(recordingId) {
        withStore('readwrite', store => {
            store.delete(recordingId);
        });
    }

    function loadRecordingsFromDB(questionId) {
        return new Promise((resolve) => {
            withDB(db => {
                const transaction = db.transaction("audioRecordings", "readonly");
                const store = transaction.objectStore("audioRecordings");
                const index = store.index("questionId_idx");
                const request = index.getAll(questionId);

                request.onsuccess = () => {
                    const recordings = request.result;
                    console.log(`[Q-ID ${questionId}] Loaded ${recordings.length} recordings from DB.`);
                    resolve(recordings);
                };
                request.onerror = () => {
                    console.error(`[Q-ID ${questionId}] Error loading recordings.`);
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

// --- Initialization Logic ---

window.Webflow = window.Webflow || [];
window.Webflow.push(function() {
    console.log("Webflow ready. Setting up recorders...");
    injectGlobalStyles();
    document.querySelectorAll('.faq1_accordion.lm').forEach(initializeAudioRecorder);
}); 