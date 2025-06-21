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
    `;
    document.head.appendChild(style);
}

/**
 * Initializes a single audio recorder instance.
 * @param {HTMLElement} recorderWrapper - The main container element for this recorder.
 */
function initializeAudioRecorder(recorderWrapper) {
    const questionId = recorderWrapper.dataset.questionId;
    if (!questionId) {
        console.error("Recorder component is missing 'data-question-id'. Skipping.", recorderWrapper);
        return;
    }

    // Select elements using classes within the scope of the current recorder
    const recordButton = recorderWrapper.querySelector('.record-button');
    const statusDisplay = recorderWrapper.querySelector('.status-display');
    const timerDisplay = recorderWrapper.querySelector('.timer-display');
    const recordingsListUI = recorderWrapper.querySelector('.recordings-list');
    const liveWaveformCanvas = recorderWrapper.querySelector('.live-waveform-canvas');

    if (!recordButton || !statusDisplay || !timerDisplay || !recordingsListUI || !liveWaveformCanvas) {
        console.error(`Recorder for Q-ID "${questionId}" is missing required elements (.record-button, .status-display, etc.). Skipping.`);
        return;
    }
    
    console.log(`Initializing recorder for question ID: ${questionId}`);
    const canvasCtx = liveWaveformCanvas.getContext('2d');

    let mediaRecorder;
    let audioChunks = [];
    let recordings = []; // Holds recordings for this instance ONLY
    let timerInterval;
    let seconds = 0;
    
    let audioContext;
    let analyser;
    let sourceNode;
    let dataArray;
    let animationFrameId;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        statusDisplay.textContent = "MediaRecorder API not supported.";
        recordButton.disabled = true;
        return;
    }

    // Setup DB and Load recordings for this specific instance
    setupDatabase().then(() => loadRecordingsForInstance());
    
    recordButton.addEventListener('click', handleRecordButtonClick);

    function handleRecordButtonClick() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            stopActualRecording();
        } else {
            startActualRecording();
        }
    }

    async function startActualRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            sourceNode = audioContext.createMediaStreamSource(stream);
            sourceNode.connect(analyser);
            drawLiveWaveform();

            setButtonText(recordButton, 'Stop');
            recordButton.classList.add('recording');
            statusDisplay.textContent = "Status: Recording...";
            audioChunks = [];
            
            mediaRecorder = new MediaRecorder(stream, getSupportedMimeType());

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onerror = (event) => {
                console.error("MediaRecorder error:", event.error);
                cleanupAfterRecording(stream);
            };

            mediaRecorder.onstop = () => {
                if (audioChunks.length === 0) {
                    cleanupAfterRecording(stream);
                    return;
                }
                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const timestamp = Date.now();
                const recordingId = `${questionId}-rec-${timestamp}`;
                
                const newRecording = { id: recordingId, blob: audioBlob, timestamp: timestamp };
                
                // Add to local array and save to DB
                recordings.push({ ...newRecording, url: audioUrl });
                saveRecordingToDB(newRecording);
                
                renderRecordingsList();
                cleanupAfterRecording(stream);
            };

            mediaRecorder.start();
            startTimer();

        } catch (err) {
            console.error("Error starting recording:", err);
            statusDisplay.textContent = `Start Error: ${err.message}`;
        }
    }

    function stopActualRecording() {
        if (mediaRecorder) mediaRecorder.stop();
        stopTimer();
    }
    
    function cleanupAfterRecording(streamToStop) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (sourceNode) sourceNode.disconnect();
        if (streamToStop) streamToStop.getTracks().forEach(track => track.stop());
        
        mediaRecorder = null;
        animationFrameId = null;
        resetRecordingState();
    }

    function resetRecordingState() {
        setButtonText(recordButton, 'Start');
        recordButton.classList.remove('recording');
        statusDisplay.textContent = "Status: Idle";
    }
    
    function drawLiveWaveform() {
        animationFrameId = requestAnimationFrame(drawLiveWaveform);
        if (!analyser) return;

        analyser.getByteFrequencyData(dataArray);

        const canvasWidth = liveWaveformCanvas.width;
        const canvasHeight = liveWaveformCanvas.height;

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
            // Correctly calculate 'y' to draw from the center
            canvasCtx.fillRect(x, (canvasHeight - barHeight) / 2, barWidth, barHeight);
            x += barWidth + barSpacing;
        }
    }

    function renderRecordingsList() {
        recordingsListUI.innerHTML = '';
        recordings.sort((a, b) => b.timestamp - a.timestamp); // Newest first
        
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
            deleteButton.style.cssText = 'background: none; border: none; color: #f25444; cursor: pointer; padding: 5px; font-size: 0.9em;';
            deleteButton.onclick = () => {
                if (confirm(`Are you sure you want to delete this recording?`)) {
                    deleteRecording(rec.id);
                }
            };
            
            infoControlsDiv.appendChild(timestampDisplay);
            infoControlsDiv.appendChild(deleteButton);

            li.appendChild(audioPlayer);
            li.appendChild(infoControlsDiv);
            recordingsListUI.appendChild(li);
        });
    }

    function deleteRecording(recordingId) {
        // Remove from local array
        const index = recordings.findIndex(r => r.id === recordingId);
        if (index > -1) {
            URL.revokeObjectURL(recordings[index].url);
            recordings.splice(index, 1);
        }
        // Remove from DB
        deleteRecordingFromDB(recordingId);
        // Update UI
        renderRecordingsList();
    }
    
    // --- DB Functions ---

    function saveRecordingToDB(recording) {
        withStore('readwrite', store => {
            store.put(recording);
        });
    }

    function deleteRecordingFromDB(recordingId) {
        withStore('readwrite', store => {
            store.delete(recordingId);
        });
    }

    function loadRecordingsForInstance() {
        withStore('readonly', store => {
            const request = store.getAll();
            request.onsuccess = () => {
                const allRecs = request.result;
                recordings = allRecs
                    .filter(rec => rec.id.startsWith(`${questionId}-`))
                    .map(rec => ({ ...rec, url: URL.createObjectURL(rec.blob) }));
                renderRecordingsList();
            };
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
        timerDisplay.textContent = formatTime(seconds);
        timerInterval = setInterval(() => {
            seconds++;
            timerDisplay.textContent = formatTime(seconds);
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function formatTime(s) {
        const m = Math.floor(s / 60);
        const rs = s % 60;
        return `${String(m).padStart(2, '0')}:${String(rs).padStart(2, '0')}`;
    }
    
    // Set initial canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = liveWaveformCanvas.getBoundingClientRect();
    liveWaveformCanvas.width = rect.width * dpr;
    liveWaveformCanvas.height = rect.height * dpr;
    canvasCtx.scale(dpr, dpr);

    resetRecordingState();
}

// --- Global DB Setup & Initialization ---

let db;
function setupDatabase() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);
        const request = indexedDB.open("kidsAudioDB", 1);
        request.onupgradeneeded = e => e.target.result.createObjectStore("audioRecordings", { keyPath: "id" });
        request.onsuccess = e => { db = e.target.result; resolve(db); };
        request.onerror = e => reject(e.target.error);
    });
}

function withStore(type, callback) {
    if (!db) { console.error("Database is not initialized."); return; }
    const transaction = db.transaction("audioRecordings", type);
    callback(transaction.objectStore("audioRecordings"));
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded. Initializing recorders.");
    injectGlobalStyles();
    document.querySelectorAll('.faq1_accordion').forEach(initializeAudioRecorder);
}); 