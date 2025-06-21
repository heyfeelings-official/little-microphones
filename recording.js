// recording.js - Manages audio recording, visualization, and local storage.

function initializeAudioRecorder() {
    // Inject CSS for the recording animation
    const style = document.createElement('style');
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
        
        #recordButton {
            position: relative;
            /* Ensure the button's content (icon, text) is above the pseudo-element */
            z-index: 1; 
        }

        #recordButton.recording::before {
          content: '';
          position: absolute;
          /* Center the pseudo-element on the button */
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%; /* Assuming the button is a circle */
          background-color: red;
          /* Place it behind the button's content */
          z-index: -1;
          /* Start the animation */
          animation: pulse-red 1.2s infinite ease-out;
        }
    `;
    document.head.appendChild(style);

    const recordButton = document.getElementById('recordButton');
    const statusDisplay = document.getElementById('status');
    const timerDisplay = document.getElementById('timer');
    const recordingsListUI = document.getElementById('recordingsList');
    const liveWaveformCanvas = document.getElementById('liveWaveformCanvas');
    const canvasCtx = liveWaveformCanvas.getContext('2d');

    let mediaRecorder;
    let audioChunks = [];
    let recordings = [];
    let timerInterval;
    let seconds = 0;
    
    // For live canvas visualization
    let audioContext;
    let analyser;
    let sourceNode; // To connect microphone stream to analyser
    let dataArray;    // To store waveform data
    let animationFrameId; // To control the drawing loop

    // Check for MediaRecorder support (essential)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        statusDisplay.textContent = "MediaRecorder API not supported. This browser cannot record audio.";
        if(recordButton) recordButton.disabled = true;
        return;
    }

    loadRecordings(); // Load existing recordings from IndexedDB
    if (recordButton) {
        recordButton.addEventListener('click', handleRecordButtonClick);
    } else {
        console.error("Record button not found!");
    }

    function setButtonText(button, text) {
        if (!button) return;
        // Iterate backwards through child nodes to find the last non-empty text node.
        // This is more robust and likely to be the label text.
        for (let i = button.childNodes.length - 1; i >= 0; i--) {
            const node = button.childNodes[i];
            // Node.TEXT_NODE === 3
            if (node.nodeType === 3 && node.textContent.trim().length > 0) {
                node.textContent = ` ${text} `; // Add spacing for layout
                return;
            }
        }
        // Fallback for structure like <button><i>...</i><div>TEXT</div></button>
        if (button.lastElementChild) {
            button.lastElementChild.textContent = text;
        } else {
            console.warn("Could not find a suitable text node or element to update in the button.");
        }
    }

    function handleRecordButtonClick() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            stopActualRecording();
        } else {
            startActualRecording();
        }
    }

    async function startActualRecording() {
        console.log(`Starting new recording.`);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Microphone stream obtained.");

            // --- Setup for Live Canvas Visualization ---
            if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048; // Determines data points for visualization
            const bufferLength = analyser.frequencyBinCount; // Usually half of fftSize
            dataArray = new Uint8Array(bufferLength);
            
            sourceNode = audioContext.createMediaStreamSource(stream); // Create source from mic stream
            sourceNode.connect(analyser); // Connect to analyser
            drawLiveWaveform(); // Start the animation loop

            // --- Setup MediaRecorder ---
            setButtonText(recordButton, 'Stop');
            recordButton.classList.add('recording');
            statusDisplay.textContent = "Status: Recording...";
            audioChunks = []; // Reset for new recording
            const options = getSupportedMimeType(); // Get preferred MIME type
            
            mediaRecorder = new MediaRecorder(stream, options);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error("MediaRecorder error:", event.error);
                statusDisplay.textContent = `Recording error: ${event.error.name || 'Unknown error'}`;
                cleanupAfterRecording(stream); // Pass stream to ensure its tracks are stopped
            };

            mediaRecorder.onstop = () => {
                console.log("MediaRecorder stopped. Chunks collected:", audioChunks.length);

                if (audioChunks.length === 0) {
                    console.warn("No audio data collected.");
                    statusDisplay.textContent = "No audio data recorded. Try again.";
                    cleanupAfterRecording(stream);
                    return;
                }
                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                console.log("Audio blob created, size:", audioBlob.size, "type:", audioBlob.type);
                
                if (audioBlob.size === 0) {
                    console.warn("Created audio blob is empty.");
                    statusDisplay.textContent = "Failed to create valid audio. Try again.";
                    cleanupAfterRecording(stream);
                    return;
                }

                const audioUrl = URL.createObjectURL(audioBlob);
                const timestamp = Date.now();

                const recordingId = `rec-${timestamp}`;
                recordings.push({ id: recordingId, blob: audioBlob, url: audioUrl, timestamp: timestamp });
                
                saveRecordings();
                renderRecordingsList();
                cleanupAfterRecording(stream); // Call cleanup after processing
            };

            mediaRecorder.start();
            console.log("MediaRecorder.start() called.");
            startTimer();

        } catch (err) {
            console.error("Error starting recording:", err);
            statusDisplay.textContent = `Start Error: ${err.message}`;
            cleanupAfterRecording(null); // No stream if error happened before getting it
        }
    }

    function stopActualRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            console.log("Stopping MediaRecorder manually.");
            mediaRecorder.stop(); // This will trigger the onstop event
            stopTimer();
        } else {
            console.warn("stopActualRecording called but MediaRecorder not recording.");
            cleanupAfterRecording(null); // Reset UI if MR wasn't active
        }
    }
    
    function cleanupAfterRecording(streamToStop) {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId); // Stop the drawing loop
            animationFrameId = null;
        }
        if (canvasCtx) { // Clear the canvas
            canvasCtx.clearRect(0, 0, liveWaveformCanvas.width, liveWaveformCanvas.height);
        }

        if (sourceNode) {
            sourceNode.disconnect(); // Disconnect analyser from stream source
            sourceNode = null;
        }
        // Analyser and audioContext can be reused, or closed if no more audio activity is planned soon
        // For simplicity here, we'll leave audioContext open for potential reuse.
        // analyser = null; 
        // dataArray = null;

        if (streamToStop && typeof streamToStop.getTracks === 'function') { // Stop microphone tracks
            streamToStop.getTracks().forEach(track => track.stop());
            console.log("Microphone stream tracks stopped.");
        }
        
        if (mediaRecorder && mediaRecorder.stream && mediaRecorder.stream !== streamToStop) {
            // If MediaRecorder had its own stream reference different from the one passed
            // (shouldn't happen in this setup but good for robustness)
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        mediaRecorder = null; // Clear MediaRecorder instance
        resetRecordingState(); // Reset UI elements (button text, status)
    }

    function resetRecordingState() {
        if (recordButton) {
            setButtonText(recordButton, 'Start');
            recordButton.classList.remove('recording');
        }
        if (statusDisplay && !statusDisplay.textContent.toLowerCase().includes("error")) {
             statusDisplay.textContent = "Status: Idle";
        }
    }

    function drawLiveWaveform() {
        animationFrameId = requestAnimationFrame(drawLiveWaveform); // Loop
        if (!analyser || !dataArray || !canvasCtx) return; // Exit if not ready

        analyser.getByteTimeDomainData(dataArray); // Fill dataArray with waveform data

        canvasCtx.fillStyle = '#FFFFFF'; // Background color of canvas
        canvasCtx.fillRect(0, 0, liveWaveformCanvas.width, liveWaveformCanvas.height);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#2c3e50'; // Color of the wave
        canvasCtx.beginPath();

        const sliceWidth = liveWaveformCanvas.width * 1.0 / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0; // Normalize byte data to 0-2 range
            const y = v * liveWaveformCanvas.height / 2; // Scale to canvas height

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        canvasCtx.lineTo(liveWaveformCanvas.width, liveWaveformCanvas.height / 2); // Draw line to end
        canvasCtx.stroke(); // Render the path
    }


    function getSupportedMimeType() {
        const mimeTypes = [
            'audio/webm;codecs=opus', 
            'audio/ogg;codecs=opus',
            'audio/webm', 
            'audio/ogg'
            // 'audio/mp4', // Can be problematic for audio-only recording
            // 'audio/wav' // Uncompressed, large, but widely supported
        ];
        for (const mimeType of mimeTypes) {
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) {
                console.log("Using supported MIME type:", mimeType);
                return { mimeType: mimeType };
            }
        }
        console.warn("No preferred MIME types supported by MediaRecorder. Will try browser default.");
        return undefined; // Let browser choose default if options is undefined for MediaRecorder
    }

    function renderRecordingsList() {
        recordingsListUI.innerHTML = '';
        recordings.sort((a, b) => b.timestamp - a.timestamp); // Newest first
        recordings.forEach(rec => {
            const li = document.createElement('li');
            li.dataset.id = rec.id;
            li.style.cssText = 'display: flex; flex-direction: column; align-items: center; margin-bottom: 24px;';

            const audioPlayer = document.createElement('audio');
            audioPlayer.controls = true;
            // audioPlayer.preload = 'metadata'; // Optional: hint to browser
            
            audioPlayer.onloadedmetadata = function() { // Add event listener
                console.log(`Metadata loaded for ${rec.id}: Duration ${this.duration.toFixed(1)}s`);
                // The browser's default controls will update the duration display automatically.
            };
            
            audioPlayer.src = rec.url; // Set src AFTER listeners if needed
            audioPlayer.onerror = (e) => { console.error("Audio playback error for", rec.id, rec.url, e.target.error); };
            
            const infoControlsDiv = document.createElement('div');
            infoControlsDiv.className = 'info-controls';

            const timestampDisplay = document.createElement('span');
            const date = new Date(rec.timestamp);
            const day = String(date.getDate()).padStart(2, '0');
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const formattedDate = `${day} ${month} ${year}, ${hours}:${minutes}`;
            timestampDisplay.textContent = `Recorded: ${formattedDate}`;
            timestampDisplay.style.cssText = 'font-size:0.9em; color:#777;';

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions';

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.style.cssText = 'background: none; border: none; color: #f25444; cursor: pointer; padding: 5px; font-size: 0.9em;';
            deleteButton.onclick = function() {
                if (confirm(`Are you sure you want to delete this recording?`)) {
                    deleteRecording(rec.id);
                }
            };

            actionsDiv.appendChild(deleteButton);

            infoControlsDiv.appendChild(timestampDisplay);
            infoControlsDiv.appendChild(actionsDiv);

            li.appendChild(audioPlayer);
            li.appendChild(infoControlsDiv);
            recordingsListUI.appendChild(li);
        });
    }

    function deleteRecording(recordingId) {
        const recordingIndex = recordings.findIndex(r => r.id === recordingId);
        if (recordingIndex > -1) {
            console.log("Deleting recording from array:", recordingId);
            URL.revokeObjectURL(recordings[recordingIndex].url); // Important memory management
            recordings.splice(recordingIndex, 1);
            saveRecordings(); // Update IndexedDB
            renderRecordingsList(); // Update UI
        } else {
            console.warn("Attempted to delete recording ID not found in array:", recordingId);
        }
    }

    function saveRecordings() {
        console.log("Attempting to save recordings to IndexedDB. Count:", recordings.length);
        const dbRequest = indexedDB.open("kidsAudioDB", 1); 

        dbRequest.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("audioRecordings")) {
                db.createObjectStore("audioRecordings", { keyPath: "id" });
                console.log("IndexedDB: audioRecordings store created.");
            }
        };

        dbRequest.onsuccess = function(event) {
            const db = event.target.result;
            console.log("IndexedDB: connection successful for saving.");
            const transaction = db.transaction(["audioRecordings"], "readwrite");
            const store = transaction.objectStore("audioRecordings");
            
            const clearRequest = store.clear(); 
            clearRequest.onsuccess = () => {
                console.log("IndexedDB: store cleared successfully.");
                if (recordings.length === 0) {
                    console.log("IndexedDB: No recordings to save after clear.");
                    return; 
                }
                let itemsAdded = 0;
                recordings.forEach(rec => {
                    const storableRec = { id: rec.id, blob: rec.blob, timestamp: rec.timestamp };
                    const putRequest = store.put(storableRec);
                    putRequest.onsuccess = () => {
                        itemsAdded++;
                        if (itemsAdded === recordings.length) {
                            console.log(`IndexedDB: All ${itemsAdded} recordings processed for saving.`);
                        }
                    };
                    putRequest.onerror = (e) => {
                        console.error("IndexedDB: Error putting item", rec.id, e.target.error);
                    };
                });
            };
            clearRequest.onerror = (e) => {
                console.error("IndexedDB: Error clearing store.", e.target.error);
            };

            transaction.oncomplete = function() {
                console.log("IndexedDB: Save transaction completed.");
            };
            transaction.onerror = function(event) {
                console.error("IndexedDB: Save Transaction Error:", event.target.error?.message || event.target.error);
            };
        };
        dbRequest.onerror = function(event) {
            console.error("IndexedDB: Open DB Error (for saving):", event.target.error?.message || event.target.error);
        };
    }

    function loadRecordings() {
        console.log("Attempting to load recordings from IndexedDB.");
        const dbRequest = indexedDB.open("kidsAudioDB", 1);

        dbRequest.onupgradeneeded = function(event) { 
            const db = event.target.result;
            if (!db.objectStoreNames.contains("audioRecordings")) {
                db.createObjectStore("audioRecordings", { keyPath: "id" });
                console.log("IndexedDB: audioRecordings store created during load.");
            }
        };

        dbRequest.onsuccess = function(event) {
            const db = event.target.result;
            console.log("IndexedDB: connection successful for loading.");
            if (!db.objectStoreNames.contains("audioRecordings")) {
                console.warn("IndexedDB: audioRecordings store not found on load.");
                recordings = []; renderRecordingsList(); return;
            }

            const transaction = db.transaction(["audioRecordings"], "readonly");
            const store = transaction.objectStore("audioRecordings");
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = function() {
                const loadedRecs = getAllRequest.result;
                console.log(`IndexedDB: Loaded ${loadedRecs.length} recordings.`);
                if (loadedRecs && loadedRecs.length > 0) {
                    recordings = loadedRecs.map(rec => {
                        if (!rec.blob) { 
                            console.warn("IndexedDB: Loaded rec missing blob:", rec.id); return null; 
                        }
                        return { ...rec, url: URL.createObjectURL(rec.blob) };
                    }).filter(rec => rec !== null);
                } else { recordings = []; }
                renderRecordingsList();
            };
            getAllRequest.onerror = function(event) {
                console.error("IndexedDB: LoadAll Request Error:", event.target.error?.message || event.target.error);
                recordings = []; renderRecordingsList(); 
            };
            transaction.oncomplete = function() { console.log("IndexedDB: Load transaction completed."); };
            transaction.onerror = function(event) { console.error("IndexedDB: Load Transaction Error:", event.target.error?.message || event.target.error); };
        };
        dbRequest.onerror = function(event) {
            console.error("IndexedDB: Open DB Error (for loading):", event.target.error?.message || event.target.error);
            recordings = []; renderRecordingsList();
        };
    }

    function startTimer() {
        seconds = 0;
        timerDisplay.textContent = formatTime(seconds);
        timerInterval = setInterval(() => {
            seconds++;
            timerDisplay.textContent = formatTime(seconds);
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const remainingSeconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    // Initial canvas sizing (important for crisp drawing)
    const dpr = window.devicePixelRatio || 1;
    const rect = liveWaveformCanvas.getBoundingClientRect();
    liveWaveformCanvas.width = rect.width * dpr;
    liveWaveformCanvas.height = rect.height * dpr;
    canvasCtx.scale(dpr, dpr); // Scale context for HiDPI displays

    resetRecordingState(); // Initialize button states and UI
}

// --- Script Loading and Initialization Trigger ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Initializing manual recorder with canvas visualization.");
    initializeAudioRecorder();
}); 