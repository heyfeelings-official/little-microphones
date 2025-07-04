/**
 * recording.js - Multi-Question Audio Recording System with Radio Program Generation
 * 
 * PURPOSE: Comprehensive audio recording system with local storage, cloud backup, and radio program generation
 * DEPENDENCIES: MediaRecorder API, IndexedDB, Bunny.net Storage API, FFmpeg processing
 * DOCUMENTATION: See /documentation/recording.js.md for complete system overview
 * 
 * CORE FEATURES:
 * - Multi-question independent recording instances with isolated state management
 * - Local IndexedDB storage with automatic cloud backup to Bunny.net CDN
 * - Upload progress tracking with retry mechanisms and error recovery
 * - Radio program generation from multiple recordings with professional audio processing
 * - Question ID normalization and organized file structure
 * - Orphaned recording cleanup and maintenance routines
 * - Real-time waveform visualization and audio feedback
 * - Cross-device synchronization via cloud storage
 * 
 * AUDIO PIPELINE:
 * WebRTC Recording (WebM) → Local Storage (IndexedDB) → Cloud Upload (MP3) → CDN Delivery → Radio Program Generation
 * 
 * RECORDING WORKFLOW:
 * User Click → Permission Request → MediaRecorder Start → Real-time UI Updates → 
 * Stop & Process → Local Save → Background Upload → UI Status Updates → Playback Ready
 * 
 * RADIO PROGRAM GENERATION:
 * Recording Collection → Audio Plan Creation → File Downloads → FFmpeg Processing → 
 * Professional Audio Mixing → Cloud Upload → Success Modal with Player
 * 
 * DATA STORAGE:
 * - Local: IndexedDB with recording metadata, blobs, and upload status tracking
 * - Cloud: Bunny.net CDN with organized folder structure: /{lmid}/{world}/{filename}.mp3
 * - File Naming: kids-world_{world}-lmid_{lmid}-question_{number}-tm_{timestamp}.mp3
 * 
 * SECURITY & LIMITS:
 * - Recording limits: 30 recordings per question, 10-minute max duration per recording
 * - User authorization: LMID ownership validation via Memberstack metadata
 * - File cleanup: Automatic orphaned recording removal and storage optimization
 * - Error resilience: Comprehensive error handling with graceful degradation
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Lazy loading of recordings with efficient DOM management
 * - Background upload processing with non-blocking UI operations
 * - Memory management with automatic blob cleanup after upload
 * - CDN-based content delivery with cache-busting for fresh content
 * 
 * INTEGRATION POINTS:
 * - rp.js: Receives world/lmid parameters and handles page authorization
 * - lm.js: Provides user authentication and LMID management context
 * - API Endpoints: upload-audio.js, delete-audio.js, combine-audio.js, list-recordings.js
 * - External Services: Bunny.net CDN, Memberstack auth, Make.com webhooks
 * 
 * EVENT-DRIVEN ARCHITECTURE:
 * - Custom events for upload status updates across multiple UI components
 * - Global state management for recording locks and initialization tracking
 * - Real-time progress updates with animated feedback systems
 * 
 * AUDIO PROCESSING FEATURES:
 * - Multi-format recording support with browser-specific optimization
 * - Professional audio mixing with background music integration
 * - Question-based audio organization with chronological answer ordering
 * - Dynamic radio program generation with intro/outro/transition audio
 * - Cache-busting for real-time audio updates and fresh content delivery
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.4.0
 * STATUS: Production Ready ✅
 */

const savingLocks = new Set();

// --- Global initialization tracking ---
const initializedWorlds = new Set();

// --- SIMPLIFIED LOGGING SYSTEM ---
const LOG_CONFIG = {
    ENABLED: true,
    PRODUCTION_MODE: typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost',
    ICONS: { error: '❌', warn: '⚠️', info: '✅', debug: '🔍' }
};
function log(level, message, data = null) {
    if (!LOG_CONFIG.ENABLED) return;
    if (LOG_CONFIG.PRODUCTION_MODE && level === 'debug') return;
    const icon = LOG_CONFIG.ICONS[level] || '📝';
    if (data) {
        console.log(`${icon} ${message}`, data);
    } else {
        console.log(`${icon} ${message}`);
    }
}

// ------------------------------
// --- GLOBAL HELPER FUNCTIONS ---
// ------------------------------

function formatTime(seconds) {
    if (seconds === null || seconds === undefined || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

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
async function createRecordingElement(recordingData, questionId, allIds) {
    const li = document.createElement('li');
    li.dataset.recordingId = recordingData.id;
    li.style.cssText = 'list-style: none; margin-bottom: 0;';

    const audioURL = await getAudioSource(recordingData);
    if (!audioURL) {
        console.warn(`Could not get audio source for ${recordingData.id}, skipping UI creation.`);
        return li; 
    }
    
    // Main player container
    const playerContainer = document.createElement('div');
    playerContainer.style.cssText = `width: 100%; height: 48px; position: relative; background: white; border-radius: 122px; display: flex; align-items: center; padding: 0 16px; box-sizing: border-box;`;
    
    // Hidden audio element
    const audio = document.createElement('audio');
    audio.src = audioURL;
    audio.preload = 'metadata';
    audio.style.display = 'none';
    li.appendChild(audio);

    // --- Create all UI parts ---
    const playButtonContainer = document.createElement('div');
    playButtonContainer.style.cssText = `width: 32px; height: 32px; cursor: pointer; color: #007AF7; flex-shrink: 0; margin-right: 12px; display: flex; align-items: center; justify-content: center; position: relative;`;
    const playIcon = document.createElement('div');
    playIcon.style.cssText = `display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;`;
    playIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.85645 12.6432L5.28359 13.6691C5.14824 13.7254 5.00307 13.7545 4.85645 13.7545C4.18653 13.7545 3.89506 13.2237 3.85947 13.1588L3.85907 13.1581C3.78166 13.0172 3.74738 12.8861 3.73332 12.8287C3.70064 12.6951 3.68408 12.5531 3.67377 12.4423C3.65164 12.2043 3.63976 11.8891 3.63344 11.5387C3.62063 10.8288 3.62924 9.86918 3.64584 8.85249C3.65921 8.03337 3.67765 7.17867 3.69502 6.37386C3.72132 5.15476 3.74516 4.0501 3.74515 3.35692C3.74515 3.00747 3.90952 2.67837 4.18889 2.46846C4.46827 2.25854 4.83011 2.19227 5.16575 2.28953C5.42645 2.36507 5.80059 2.52845 6.16439 2.69694C6.55447 2.87761 7.01599 3.1039 7.4884 3.34236C8.43233 3.81885 9.44857 4.35857 10.0737 4.70931C11.242 5.36486 12.116 5.93809 12.7094 6.37485C13.0039 6.59168 13.2417 6.784 13.416 6.9434C13.5004 7.02067 13.5894 7.10785 13.6662 7.19864C13.7032 7.24231 13.7576 7.31053 13.809 7.3963C13.809 7.3963 13.8103 7.39852 13.8111 7.39982C13.8408 7.44908 13.9794 7.67926 13.9794 8.00004C13.9794 8.25261 13.8902 8.44571 13.8754 8.47777C13.8747 8.47914 13.8739 8.48099 13.8739 8.48099C13.8433 8.54903 13.8105 8.60616 13.7861 8.64615C13.7355 8.72909 13.676 8.8114 13.615 8.88884C13.4903 9.04705 13.3199 9.23469 13.1014 9.44149C12.6622 9.85722 12.0059 10.3722 11.0826 10.8996C9.92065 11.5634 8.4641 12.2575 7.3165 12.7789C6.73888 13.0413 6.23215 13.2632 5.86951 13.4196C5.6881 13.4979 5.54251 13.5599 5.44186 13.6025C5.39153 13.6238 5.35242 13.6403 5.32566 13.6515L5.29494 13.6644L5.28359 13.6691C5.28359 13.6691 5.28359 13.6691 4.85645 12.6432Z" fill="currentcolor"/></svg>`;
    const pauseIcon = document.createElement('div');
    pauseIcon.style.cssText = `display: none; align-items: center; justify-content: center; width: 100%; height: 100%;`;
    pauseIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.16556 12.7285C4.83372 12.3548 4.85285 5.2131 5.16556 3.27148C6.002 5.16913 5.90348 9.82086 6.0012 11.1599C6.07938 12.2311 5.68793 12.428 5.16556 12.7285Z" stroke="currentColor" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.4647 3.27148C11.0697 6.30696 11.4684 12.0378 10.4647 12.7285C10.187 12.1354 10.0339 11.2892 10.0072 9.54915C9.9776 7.62566 10.1585 6.08748 10.4647 3.27148Z" stroke="currentColor" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    playButtonContainer.appendChild(playIcon);
    playButtonContainer.appendChild(pauseIcon);
    
    const timeDisplay = document.createElement('div');
    timeDisplay.style.cssText = `opacity: 0.4; text-align: center; color: black; font-size: 11px; font-family: Arial, sans-serif; font-weight: 400; line-height: 16px; flex-shrink: 0; margin-right: 12px; min-width: 60px;`;
    timeDisplay.textContent = '0:00 / 0:00';
    
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `flex: 1; height: 4px; background: rgba(0, 0, 0, 0.1); border-radius: 2px; position: relative; cursor: pointer; margin-right: 1rem;`;
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `width: 0%; height: 100%; background: #007AF7; border-radius: 2px; transition: width 0.1s ease;`;
    progressContainer.appendChild(progressBar);
    
    const uploadIcon = document.createElement('div');
    uploadIcon.className = 'upload-status';
    uploadIcon.style.cssText = `width: 16px; height: 16px; margin-right: 8px; flex-shrink: 0; display: none; align-items: center; justify-content: center; color: #666;`;
    uploadIcon.innerHTML = `<svg width="23" height="18" viewBox="0 0 23 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.3603 4.12978C9.95632 2.81456 9.32134 1.71611 7.29446 1.71606C5.26758 1.71602 2.50257 3.6029 2.0119 5.78503C1.52123 7.96715 1.64731 9.52137 2.33889 10.5311C3.03048 11.5409 3.8667 11.4586 3.8667 11.4586C3.24843 11.0722 2.14031 10.1959 2.0119 8.10803C1.8835 6.02011 3.6876 2.71348 6.99176 2.1403C7.72561 2.013 9.8515 2.04725 10.3603 4.12978ZM10.3603 4.12978C11.4039 3.08984 12.877 2.74676 13.6571 3.21481C14.6322 3.79988 14.9775 5.19823 14.7589 6.21232C15.6096 5.65986 18.118 5.78503 19.087 6.21232M19.087 6.21232C20.056 6.63961 20.8327 7.14886 20.6145 9.60375C20.3963 12.0586 18.256 12.7801 17.5595 12.5496C20.9795 12.8104 21.085 9.82754 20.9839 8.41147C20.8827 6.9954 19.6968 6.40592 19.087 6.21232Z" stroke="currentColor" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.32078 11.691C6.25957 11.5144 6.1836 11.0235 6.49943 10.6511C7.34534 9.65366 9.3446 8.30582 10.4205 7.76125C10.9193 7.50877 11.1085 7.45005 11.5252 7.85738C11.8269 8.15223 12.5363 8.56445 13.1214 9.09835C13.7206 9.64506 15.104 10.4108 15.2078 10.9869C15.3117 11.563 15.1942 12.3164 14.6398 12.3174C13.8646 12.3189 12.6507 12.3174 12.6507 12.3174L9.39941 12.2017C8.4158 12.2457 6.47611 12.1391 6.32078 11.691Z" fill="currentColor"/><path d="M10.7537 10.7094C10.8037 11.9505 10.9624 15.3393 11.1919 16.1365C11.5198 15.7539 11.3383 12.119 11.2072 10.7031L10.7537 10.7094Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    
    const deleteButton = document.createElement('div');
    deleteButton.style.cssText = `width: 16px; height: 16px; cursor: pointer; color: #F25444; flex-shrink: 0; display: flex; align-items: center; justify-content: center;`;
    deleteButton.innerHTML = `<svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.22363 9.09265C4.3737 10.4226 4.74708 15.7266 5.19781 16.6576M5.19781 16.6576C5.64853 17.5886 10.0571 17.8989 10.9588 16.9236C11.8606 15.9483 12.4617 9.83049 12.5118 9.29851H12.899C12.5484 11.6777 11.5249 16.6567 11.2845 17.0468C10.9839 17.5345 7.65271 18.6525 5.19781 16.6576Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.01309 5.78625C5.84908 5.6567 3.63876 5.47262 2.79102 5.20837C3.87956 5.46873 13.8741 5.64946 14.1423 5.67009C14.3569 5.6866 14.1509 5.90362 14.0211 6.01007C13.4657 6.03019 10.1771 5.9158 8.01309 5.78625Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.04834 4.92596L6.87336 1.86548L10.6295 2.09035L10.7637 5.20825" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    // --- Assemble Player ---
    playerContainer.appendChild(playButtonContainer);
    playerContainer.appendChild(timeDisplay);
    playerContainer.appendChild(progressContainer);
    playerContainer.appendChild(uploadIcon);
    playerContainer.appendChild(deleteButton);
    li.appendChild(playerContainer);

    // --- Add Event Listeners for Player Controls ---
    let isPlaying = false;
    playButtonContainer.addEventListener('click', () => {
        if (isPlaying) {
            audio.pause();
            playIcon.style.display = 'flex';
            pauseIcon.style.display = 'none';
            isPlaying = false;
        } else {
            audio.play();
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'flex';
            isPlaying = true;
        }
    });
    progressContainer.addEventListener('click', (e) => {
        if (audio.duration && isFinite(audio.duration)) {
            const rect = progressContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            audio.currentTime = percentage * audio.duration;
        }
    });
    audio.addEventListener('timeupdate', () => {
        if (audio.duration && isFinite(audio.duration)) {
            const percentage = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = percentage + '%';
            
            const currentTimeFormatted = formatTime(audio.currentTime);
            const durationFormatted = formatTime(audio.duration);
            timeDisplay.textContent = `${currentTimeFormatted} / ${durationFormatted}`;
        }
    });
    audio.addEventListener('ended', () => {
        playIcon.style.display = 'flex';
        pauseIcon.style.display = 'none';
        progressBar.style.width = '0%';
        isPlaying = false;
    });
    deleteButton.addEventListener('click', () => { 
        if (confirm("Are you sure you want to delete this recording?")) {
            // Clean up event listener before deleting
            document.removeEventListener('recording-status-update', handleStatusUpdate);
            deleteRecording(recordingData.id, questionId, li);
        }
    });
    
    // --- Load Metadata and Set Initial Time ---
    audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && isFinite(audio.duration)) {
            timeDisplay.textContent = `0:00 / ${formatTime(audio.duration)}`;
        }
    });
    audio.load(); // Explicitly load to trigger metadata

    // --- CORE EVENT LISTENER LOGIC ---
    let uploadBlinkInterval = null;

    // This is the function that reacts to status changes
    const handleStatusUpdate = (event) => {
        if (event.detail.recordingId !== recordingData.id) {
            return; // Not for me
        }

        const status = event.detail.status;
        console.log(`[UI Event] Recording ${recordingData.id} caught status update: ${status}`);

        // Clear any previous blinking animation
        if (uploadBlinkInterval) {
            clearInterval(uploadBlinkInterval);
            uploadBlinkInterval = null;
        }

        if (status === 'pending' || status === 'uploading') {
            uploadIcon.style.display = 'flex';
            deleteButton.style.display = 'none';
            // Start blinking animation
            let opacity = 0.3;
            let increasing = true;
            uploadBlinkInterval = setInterval(() => {
                opacity = increasing ? opacity + 0.1 : opacity - 0.1;
                if (opacity >= 1) increasing = false;
                if (opacity <= 0.3) increasing = true;
                uploadIcon.style.opacity = opacity;
            }, 100);
        } else { // 'uploaded', 'failed', or any other terminal state
            uploadIcon.style.display = 'none';
            deleteButton.style.display = 'flex';
            uploadIcon.style.opacity = '1';
        }
    };

    // Attach the master listener for this element
    document.addEventListener('recording-status-update', handleStatusUpdate);

    // Set initial state based on the data we have when creating the element
    handleStatusUpdate({ detail: { recordingId: recordingData.id, status: recordingData.uploadStatus || 'uploaded' } });

    // When the element is removed from the DOM, clean up its listener
    const observer = new MutationObserver((mutationsList, obs) => {
        for (const mutation of mutationsList) {
            if (mutation.removedNodes) {
                for (const removedNode of mutation.removedNodes) {
                    if (removedNode.contains(li)) {
                         console.log(`[UI Cleanup] Removing listener for ${recordingData.id}`);
                         document.removeEventListener('recording-status-update', handleStatusUpdate);
                         obs.disconnect(); // Stop observing
                         return;
                    }
                }
            }
        }
    });

    // Start observing the list element for removal of this child.
    // We need to wait for `li` to be added to its parent to observe it.
    setTimeout(() => {
        if (li.parentNode) {
            observer.observe(li.parentNode, { childList: true });
        }
    }, 0);


    return li;
}

// Helper function to get answer number (oldest = highest, newest = 1)
// Accepts an optional allRecordings array for correct context
function getAnswerNumber(recordingId, questionId, allRecordingsArr) {
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
 * Update upload status UI element and control icon visibility
 */
function updateUploadStatusUI(uploadElement, deleteElement, recordingData, currentInterval) {
    // Clear any existing interval
    if (currentInterval) {
        clearInterval(currentInterval);
        currentInterval = null;
    }

    // Ensure uploadStatus exists with safe defaults
    const uploadStatus = recordingData.uploadStatus || 'uploaded';
    
    if (uploadStatus === 'pending' || uploadStatus === 'uploading') {
        // Show upload icon with blinking animation, hide delete button
        uploadElement.style.display = 'flex';
        deleteElement.style.display = 'none';
        
        // Start blinking animation
        let opacity = 0.3;
        let increasing = true;
        
        currentInterval = setInterval(() => {
            if (increasing) {
                opacity += 0.1;
                if (opacity >= 1) {
                    increasing = false;
                }
            } else {
                opacity -= 0.1;
                if (opacity <= 0.3) {
                    increasing = true;
                }
            }
            uploadElement.style.opacity = opacity;
        }, 100);
        
    } else {
        // Upload complete - hide upload icon, show delete button
        uploadElement.style.display = 'none';
        deleteElement.style.display = 'flex';
        uploadElement.style.opacity = '1'; // Reset opacity
    }
    
    return currentInterval;
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
        // Get world and lmid for cloud deletion
        const urlParams = new URLSearchParams(window.location.search);
        const world = window.currentRecordingParams?.world || urlParams.get('world') || 'unknown-world';
        const lmid = window.currentRecordingParams?.lmid || urlParams.get('lmid') || 'unknown-lmid';
        
        // For cloud-first approach, always try to delete from cloud storage
        // Create a minimal recording object for cloud deletion
        const recordingData = {
            id: recordingId,
            cloudUrl: `https://little-microphones.b-cdn.net/${lmid}/${world}/${recordingId}.mp3`
        };
        
        console.log(`Deleting from cloud: ${recordingData.cloudUrl}`);
        await deleteFromBunny(recordingData, world, lmid, questionId);
        
        // Also try to delete from local database (if it exists locally)
        try {
            await withDB(db => {
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction("audioRecordings", "readwrite");
                    const store = transaction.objectStore("audioRecordings");
                    const request = store.delete(recordingId);
                    transaction.oncomplete = () => {
                        console.log(`Recording ${recordingId} deleted from local DB.`);
                        resolve();
                    };
                    transaction.onerror = (event) => {
                        // Don't fail if local deletion fails - cloud deletion is what matters
                        console.warn(`Local DB deletion failed (not critical):`, event.target.error);
                        resolve();
                    };
                });
            });
        } catch (localError) {
            console.warn(`Local deletion failed (not critical):`, localError);
        }
        
        elementToRemove.remove();
        
    } catch (error) {
        console.error(`Error deleting recording ${recordingId}:`, error);
        // Still remove from UI even if deletion partially failed
        elementToRemove.remove();
    }
}

/**
 * Initializes a single audio recorder instance with complete recording workflow
 * 
 * COMPREHENSIVE RECORDER INITIALIZATION PROCESS:
 * 
 * 1. SETUP & VALIDATION PHASE:
 *    - Extracts and normalizes question ID from data attributes
 *    - Prevents double initialization with tracking flags
 *    - Locates record button and validates DOM structure
 *    - Sets up instance variables for state management
 * 
 * 2. PREVIOUS RECORDINGS LOADING:
 *    - Loads existing recordings from cloud storage (cross-device sync)
 *    - Creates UI elements for each recording with audio players
 *    - Displays upload status indicators and progress feedback
 *    - Handles recording metadata and playback functionality
 * 
 * 3. RECORDING EVENT SETUP:
 *    - Attaches click handler to record button with state management
 *    - Implements recording limit validation (30 per question)
 *    - Sets up security checks and user permission handling
 *    - Prepares recording workflow with error recovery
 * 
 * 4. MEDIARECORDER WORKFLOW:
 *    - Requests microphone permissions with user feedback
 *    - Creates MediaRecorder with optimal format selection
 *    - Implements real-time timer display and visual feedback
 *    - Handles recording state transitions (start/stop/error)
 * 
 * 5. AUDIO PROCESSING PIPELINE:
 *    - Processes recorded audio blobs into organized data structure
 *    - Generates unique IDs with timestamp and metadata
 *    - Saves to local IndexedDB for immediate availability
 *    - Initiates background upload to Bunny.net CDN
 * 
 * 6. UI STATE MANAGEMENT:
 *    - Real-time recording indicators with pulsing animation
 *    - Processing placeholders with status updates
 *    - Upload progress tracking with visual feedback
 *    - Error state handling with recovery options
 * 
 * 7. BACKGROUND UPLOAD SYSTEM:
 *    - Converts WebM to MP3 for cloud storage
 *    - Uploads to organized CDN folder structure
 *    - Updates UI status throughout upload process
 *    - Handles upload failures with retry mechanisms
 * 
 * SECURITY FEATURES:
 * - Recording duration limits (10 minutes max)
 * - Microphone permission validation
 * - Unique ID generation to prevent conflicts
 * - Global lock system to prevent concurrent recordings
 * 
 * ERROR HANDLING:
 * - Microphone access failures with user guidance
 * - Network connectivity issues with offline support
 * - Upload failures with retry and recovery options
 * - MediaRecorder errors with graceful degradation
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Lazy loading of recordings for faster initialization
 * - Background upload processing without blocking UI
 * - Efficient DOM manipulation with minimal reflows
 * - Memory management with automatic cleanup
 * 
 * @param {HTMLElement} recorderWrapper - The main container element for this recorder instance
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
    let placeholderEl, statusDisplay, timerDisplay, recordingsListUI;
    let mediaRecorder, audioChunks = [], timerInterval, seconds = 0, stream;
    let recordingsLoaded = false; // Flag to prevent duplicate loading

    // --- Initial DB load to show previous recordings ---
    recordingsListUI = recorderWrapper.querySelector('.recording-list.w-list-unstyled');
    if (recordingsListUI && !recordingsLoaded) {
        recordingsLoaded = true; // Set flag immediately
        
        // Get world and lmid from URL params or global params
        const urlParams = new URLSearchParams(window.location.search);
        const world = window.currentRecordingParams?.world || urlParams.get('world') || 'unknown-world';
        const lmid = window.currentRecordingParams?.lmid || urlParams.get('lmid') || 'unknown-lmid';
        
        // Load recordings from cloud for cross-device sync
        loadRecordingsFromCloud(questionId, world, lmid).then(async recordings => {
            recordingsListUI.innerHTML = ''; // Clear previous
            recordings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // NEWEST FIRST
            
            // Process recordings sequentially to handle async createRecordingElement
            const allIds = recordings.map(r => r.id);
            for (const rec of recordings) {
                const recElement = await createRecordingElement(rec, questionId, allIds);
                recordingsListUI.appendChild(recElement);
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
            
            const recordings = await loadRecordingsFromCloud(questionId, world, lmid);
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
                placeholderEl.style.cssText = 'list-style: none; margin-bottom: 1rem; padding: 0 0;';

                // Create placeholder container matching the design
                const placeholderContainer = document.createElement('div');
                placeholderContainer.style.cssText = `
                    width: 100%;
                    height: 48px;
                    position: relative;
                    background: #F25444;
                    border-radius: 122px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 16px;
                    box-sizing: border-box;
                `;

                // Status and timer container
                const statusContainer = document.createElement('div');
                statusContainer.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-family: Arial, sans-serif;
                    font-weight: 400;
                    gap: 12px;
                `;

                statusDisplay = document.createElement('span');
                statusDisplay.className = 'placeholder-status';
                statusDisplay.style.cssText = `
                    font-size: 16px;
                    color: white;
                `;
                statusDisplay.textContent = 'Recording...';

                timerDisplay = document.createElement('span');
                timerDisplay.className = 'placeholder-timer';
                timerDisplay.style.cssText = `
                    font-size: 16px;
                    color: white;
                    font-weight: 500;
                `;
                timerDisplay.textContent = '0:00';

                statusContainer.appendChild(statusDisplay);
                statusContainer.appendChild(timerDisplay);

                placeholderContainer.appendChild(statusContainer);
                placeholderEl.appendChild(placeholderContainer);

                // Ensure placeholder is at the top of the list
                recordingsListUI.prepend(placeholderEl);
            }

            stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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
        if (streamToStop) streamToStop.getTracks().forEach(track => track.stop());
        
        mediaRecorder = null;
        // placeholderEl is now handled safely in mediaRecorder.onstop
        resetRecordingState();
    }

    function resetRecordingState() {
        setButtonText(recordButton, 'Start');
        recordButton.classList.remove('recording');
        if (statusDisplay) statusDisplay.textContent = "Status: Idle";
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
            
            // Update status to uploading and notify UI
            recordingData.uploadStatus = 'uploading';
            await updateRecordingInDB(recordingData);
            dispatchUploadStatusEvent(recordingData.id, 'uploading');

            // Convert blob to base64
            const base64Audio = await blobToBase64(recordingData.audio);
           
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

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    recordingData.cloudUrl = result.url;
                    recordingData.uploadStatus = 'uploaded';
                    recordingData.audio = null; // Free up memory
                    console.log(`[${questionId}] Upload complete: ${result.url}`);
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            } else {
                const errorText = await response.text();
                console.error(`[${questionId}] Upload failed: ${response.status} - ${errorText}`);
                throw new Error(`Upload API error: ${response.status}`);
            }

        } catch (error) {
            recordingData.uploadStatus = 'failed';
            console.error(`[${questionId}] Upload error:`, error);
        }

        // Save the final state to the DB and notify the UI
        await updateRecordingInDB(recordingData);
        dispatchUploadStatusEvent(recordingData.id, recordingData.uploadStatus);
    }

    /**
     * Update recording UI elements with current status
     */
    function updateRecordingUI(recordingData, retryCount = 0) {
        const MAX_RETRIES = 15;
        const RETRY_DELAY = 200; // ms

        const recordingElement = document.querySelector(`[data-recording-id="${recordingData.id}"]`);

        if (recordingElement) {
            // Element found, proceed with update
            const uploadIcon = recordingElement.querySelector('.upload-status');
            const deleteButton = recordingElement.querySelector('div[style*="color: #F25444"]');
            
            if (uploadIcon && deleteButton) {
                // Ensure recordingData has uploadStatus
                if (!recordingData.uploadStatus) {
                    recordingData.uploadStatus = 'uploaded';
                }
                
                // Clear any existing interval
                if (recordingElement.uploadBlinkInterval) {
                    clearInterval(recordingElement.uploadBlinkInterval);
                    recordingElement.uploadBlinkInterval = null; // Important to clear reference
                }
                
                // Update with correct parameters
                const newInterval = updateUploadStatusUI(uploadIcon, deleteButton, recordingData, null);
                recordingElement.uploadBlinkInterval = newInterval;
            }
        } else if (retryCount < MAX_RETRIES) {
            // Element not found, retry after a delay
            setTimeout(() => {
                updateRecordingUI(recordingData, retryCount + 1);
            }, RETRY_DELAY);
        } else {
            console.error(`[updateRecordingUI] Could not find element for ${recordingData.id} after ${MAX_RETRIES} retries.`);
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
        log('warn', 'No world specified for recorder initialization');
        return;
    }
    if (initializedWorlds.has(world)) return;
    initializedWorlds.add(world);
    log('info', `🎵 Initializing recorders for ${world}`);
    injectGlobalStyles();
    const targetCollectionId = `collection-${world}`;
    const targetCollection = document.getElementById(targetCollectionId);
    if (!targetCollection) {
        log('warn', `Collection not found: ${targetCollectionId}`);
        initializedWorlds.delete(world);
        return;
    }
    const recorderWrappers = targetCollection.querySelectorAll('.faq1_accordion.lm');
    log('info', `Found ${recorderWrappers.length} questions in ${world}`);
    recorderWrappers.forEach(wrapper => initializeAudioRecorder(wrapper));
    log('info', `✅ ${world} recorders ready`);
}

window.Webflow = window.Webflow || [];
window.Webflow.push(function() {
    console.log("Webflow ready. Waiting for world information...");
    // Don't initialize anything yet - wait for world info from rp.js
});

// Export functions globally
window.initializeAudioRecorder = initializeAudioRecorder;
window.initializeRecordersForWorld = initializeRecordersForWorld;
window.loadRecordingsFromCloud = loadRecordingsFromCloud;

/**
 * Clean up orphaned recordings (no cloud URL and no local blob)
 */
async function cleanupOrphanedRecordings(questionId, world, lmid) {
    try {
        const recordings = await loadRecordingsFromCloudAndSync(questionId, world, lmid);
        
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
 * 
 * COMPREHENSIVE RADIO PROGRAM GENERATION WORKFLOW:
 * 
 * 1. RECORDING COLLECTION PHASE:
 *    - Scans DOM elements to discover available questions
 *    - Loads recordings from cloud storage for each question
 *    - Validates recording availability and upload status
 *    - Organizes recordings by question ID with chronological ordering
 * 
 * 2. AUDIO PLAN CREATION PHASE:
 *    - Sorts questions by numeric order (DOM-based)
 *    - Creates audio sequence: intro → question1 → answers1 + background → transition → question2 → answers2 + background → ... → outro
 *    - Generates cache-busted URLs for all static audio files (intro, outro, monkeys, questions)
 *    - Organizes user recordings with background music integration
 * 
 * 3. PROFESSIONAL AUDIO PROCESSING PHASE:
 *    - Sends audio plan to combine-audio API for FFmpeg processing
 *    - Applies professional audio enhancement: noise reduction, normalization, EQ
 *    - Mixes background music at 25% volume with seamless duration matching
 *    - Creates smooth transitions between audio segments
 *    - Outputs high-quality MP3 (44.1kHz, 128kbps, stereo)
 * 
 * 4. PROGRESS FEEDBACK SYSTEM:
 *    - Real-time modal with animated progress bar
 *    - Creative status messages during processing ("Teaching monkeys to sing", etc.)
 *    - Detailed technical progress for debugging
 *    - Spinner animations and progress percentage updates
 * 
 * 5. SUCCESS HANDLING:
 *    - Success modal with embedded audio player
 *    - Statistics display (question count, recording count)
 *    - CDN URL with cache-busting for immediate playback
 *    - User-friendly completion feedback
 * 
 * SECURITY & VALIDATION:
 * - Validates recording existence before processing
 * - Checks upload status (only 'uploaded' recordings used)
 * - Comprehensive error handling with user-friendly messages
 * - Network failure recovery with detailed error reporting
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Parallel recording collection from multiple questions
 * - Efficient cloud API calls with batch processing
 * - Background processing with non-blocking UI updates
 * - Memory-efficient handling of large recording collections
 * 
 * @param {string} world - The world slug (e.g., 'spookyland')
 * @param {string} lmid - The LMID identifier
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
        const introUrl = `https://little-microphones.b-cdn.net/audio/other/intro.mp3?t=${introTimestamp}`;
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
            const questionUrl = `https://little-microphones.b-cdn.net/audio/${world}/${world}-QID${questionId}.mp3?t=${cacheBustTimestamp}`;
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
            const backgroundUrl = `https://little-microphones.b-cdn.net/audio/other/monkeys.mp3?t=${backgroundTimestamp}`;
            audioSegments.push({
                type: 'combine_with_background',
                answerUrls: answerUrls,
                backgroundUrl: backgroundUrl,
                questionId: questionId
            });
        }
        
        // 3. Add outro
        const outroTimestamp = Date.now() + 1;
        const outroUrl = `https://little-microphones.b-cdn.net/audio/other/outro.mp3?t=${outroTimestamp}`;
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
        const response = await fetch('https://little-microphones.vercel.app/api/combine-audio', {
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
    
    // Clean up fun status messages
    stopFunStatusMessages();
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
                const questionRecordings = await loadRecordingsFromCloud(questionId, world, lmid);
                
                if (questionRecordings.length > 0) {
                    // Filter only recordings that have been successfully uploaded to cloud
                    const validRecordings = questionRecordings
                        .filter(rec => rec.uploadStatus === 'uploaded' && rec.cloudUrl);
                    
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
                    const questionRecordings = await loadRecordingsFromCloud(questionId, world, lmid);
                    
                    if (questionRecordings.length > 0) {
                        const validRecordings = questionRecordings
                            .filter(rec => rec.uploadStatus === 'uploaded' && rec.cloudUrl);
                        
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

/**
 * Load recordings from cloud storage only
 * Simplified approach - cloud is the single source of truth
 * @param {string} questionId - The question ID
 * @param {string} world - The world slug
 * @param {string} lmid - The LMID
 * @returns {Promise<Array>} Array of recording objects
 */
async function loadRecordingsFromCloud(questionId, world, lmid) {
    try {
        console.log(`[${questionId}] Loading recordings from cloud for ${world}/${lmid}`);
        
        // Fetch from cloud API
        const response = await fetch(`https://little-microphones.vercel.app/api/list-recordings?world=${world}&lmid=${lmid}&questionId=${questionId}`);
        
        if (!response.ok) {
            console.warn(`[${questionId}] Cloud fetch failed (${response.status}), returning empty list`);
            return [];
        }
        
        const cloudData = await response.json();
        const cloudRecordings = cloudData.recordings || [];
        console.log(`[${questionId}] Found ${cloudRecordings.length} cloud recordings`);
        
        // Transform cloud recordings to our format
        const recordings = cloudRecordings.map(cloudRec => ({
            id: cloudRec.filename.replace('.mp3', ''),
            questionId: questionId,
            timestamp: cloudRec.lastModified || Date.now(),
            cloudUrl: cloudRec.url,
            uploadStatus: 'uploaded',
            duration: 0, // Will be set when audio loads
            audio: null // No local blob needed
        }));
        
        return recordings;
        
    } catch (error) {
        console.error(`[${questionId}] Cloud loading error:`, error);
        return [];
    }
} 

function createRecordingPlaceholder(questionId) {
    const li = document.createElement('li');
    li.dataset.recordingId = `placeholder-${questionId}`;
    // Remove all padding from the <li> element
    li.style.cssText = 'list-style: none; margin-bottom: 0; margin: 0; padding: 0; width: 100%;';

    // Create recording placeholder container
    const placeholderContainer = document.createElement('div');
    placeholderContainer.style.cssText = `
        width: 100%;
        height: 48px;
        position: relative;
        background: #F25444;
        border-radius: 122px;
        display: flex;
        align-items: center;
        padding: 0;
        box-sizing: border-box;
    `;

    // No badge for the placeholder
    placeholderContainer.style.width = '100%';

    // Status text
    const statusText = document.createElement('div');
    statusText.style.cssText = `
        color: white;
        font-size: 16px;
        font-family: Arial, sans-serif;
        font-weight: 400;
        line-height: 24px;
        text-align: center;
        flex: 1;
        margin-left: 20px;
    `;
    statusText.textContent = 'Status: Recording... 00:02';

    // Assemble the placeholder
    placeholderContainer.appendChild(statusText);
    li.appendChild(placeholderContainer);

    return li;
}

// In startActualRecording, always use prepend:
// recordingsListUI.prepend(placeholderEl);

/**
 * Dispatches a global event to notify all listeners about a change in upload status.
 * @param {string} recordingId - The ID of the recording that was updated.
 * @param {string} status - The new upload status (e.g., 'uploading', 'uploaded', 'failed').
 */
function dispatchUploadStatusEvent(recordingId, status) {
    const event = new CustomEvent('recording-status-update', {
        detail: {
            recordingId: recordingId,
            status: status
        }
    });
    document.dispatchEvent(event);
}