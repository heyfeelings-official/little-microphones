/**
 * recording-ui.js - UI/DOM Management Module for Recording System
 * 
 * PURPOSE: Centralized UI components and DOM manipulation for the recording system
 * DEPENDENCIES: None (pure DOM operations)
 * 
 * EXPORTED FUNCTIONS:
 * - injectGlobalStyles(): Inject CSS animations into document head
 * - createRecordingElement(): Create audio recording UI element
 * - createRecordingPlaceholder(): Create placeholder for new recordings
 * - updateUploadStatusUI(): Update upload status indicators
 * - showRadioProgramModal(): Display radio program generation modal
 * - updateRadioProgramProgress(): Update progress in modal
 * - hideRadioProgramModal(): Hide radio program modal
 * - showRadioProgramSuccess(): Show success modal with audio player
 * - startFunStatusMessages(): Start animated status messages
 * - stopFunStatusMessages(): Stop animated status messages
 * - formatTime(): Format seconds to MM:SS format
 * - setButtonText(): Safely set button text content
 * 
 * UI COMPONENTS:
 * - Audio player with play/pause controls
 * - Progress bars and time displays
 * - Upload status indicators with animations
 * - Delete buttons with confirmation
 * - Modal dialogs for radio program generation
 * - Animated placeholders and feedback
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0 (Extracted from recording.js)
 * STATUS: Production Ready ✅
 */

(function() {
    'use strict';
    
    // Global variables for UI state management
    let funStatusInterval = null;

    /**
     * Format time from seconds to MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    function formatTime(seconds) {
        if (seconds === null || seconds === undefined || !isFinite(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    /**
     * Inject global CSS styles for recording animations
     * Called once to set up necessary animations and styles
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
                background-color: #FF4444;  /* Changed to red */
                border: none;
                border-radius: 40px; /* Makes it look like an audio player */
                color: white;  /* Changed to white for better contrast */
                animation: pulse-bg-red 2s infinite;  /* Changed animation name */
                list-style: none;
                font-size: 14px;
            }

            .recording-placeholder .placeholder-status {
                font-weight: 400;
            }

            .recording-placeholder .placeholder-timer {
                font-family: monospace;
                font-size: 14px;
                color: #fff;  /* Changed to white */
            }

            @keyframes pulse-bg-red {
                0% { background-color: #FF4444; }
                50% { background-color: #CC0000; }
                100% { background-color: #FF4444; }
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
     * Create HTML element for a single audio recording
     * @param {Object} recordingData - Recording data from database
     * @param {string} questionId - Question ID this recording belongs to
     * @param {Function} getAudioSource - Function to get audio source URL
     * @param {Function} deleteRecording - Function to delete recording
     * @param {Function} dispatchUploadStatusEvent - Function to dispatch status events
     * @param {Object} options - Optional configuration {showDeleteButton: true, showUploadIcon: true}
     * @returns {Promise<HTMLLIElement>} Created list item element
     */
    async function createRecordingElement(recordingData, questionId, getAudioSource, deleteRecording, dispatchUploadStatusEvent, options = {}) {
        // Default options
        const config = {
            showDeleteButton: true,
            showUploadIcon: true,
            ...options
        };
        
        const li = document.createElement('li');
        li.dataset.recordingId = recordingData.id;
        li.style.cssText = 'list-style: none; margin-bottom: 0; width: 100%;';

        const audioURL = await getAudioSource(recordingData);
        if (!audioURL) {
            console.warn(`Could not get audio source for ${recordingData.id}, skipping UI creation.`);
            return li; 
        }
        
        // Main player container
        const playerContainer = document.createElement('div');
        playerContainer.style.cssText = `width: 100%; height: 48px; position: relative; background: #ffffff; border-radius: 122px; display: flex; align-items: center; padding: 0 16px; box-sizing: border-box;`;
        
        // Hidden audio element with cache busting
        const audio = document.createElement('audio');
        const cacheBustedURL = audioURL.includes('?') ? 
            `${audioURL}&_cb=${Date.now()}&_r=${Math.random()}` : 
            `${audioURL}?_cb=${Date.now()}&_r=${Math.random()}`;
        audio.src = cacheBustedURL;
        audio.preload = 'metadata';
        audio.style.display = 'none';
        li.appendChild(audio);

        // --- Create all UI parts ---
        const playButtonContainer = createPlayButton();
        const timeDisplay = createTimeDisplay();
        const progressContainer = createProgressBar();
        const uploadIcon = config.showUploadIcon ? createUploadIcon() : null;
        const deleteButton = config.showDeleteButton ? createDeleteButton() : null;

        // --- Assemble Player ---
        playerContainer.appendChild(playButtonContainer);
        playerContainer.appendChild(timeDisplay);
        playerContainer.appendChild(progressContainer);
        if (uploadIcon) playerContainer.appendChild(uploadIcon);
        if (deleteButton) playerContainer.appendChild(deleteButton);
        li.appendChild(playerContainer);

        // --- Add Event Listeners ---
        setupAudioPlayerEvents(audio, playButtonContainer, progressContainer, timeDisplay);
        
        // Delete button event
        if (deleteButton) {
            deleteButton.addEventListener('click', () => { 
                if (confirm("Are you sure you want to delete this recording?")) {
                    deleteRecording(recordingData.id, questionId, li);
                }
            });
        }
        
        // --- Load Metadata ---
        audio.addEventListener('loadedmetadata', () => {
            if (audio.duration && isFinite(audio.duration)) {
                timeDisplay.textContent = `0:00 / ${formatTime(audio.duration)}`;
            }
        });
        audio.load();

        // --- Setup Upload Status Handling ---
        if (uploadIcon && deleteButton) {
            setupUploadStatusHandling(li, recordingData, uploadIcon, deleteButton, dispatchUploadStatusEvent);
        }

        return li;
    }

    /**
     * Create play/pause button component
     * @returns {HTMLDivElement} Play button container
     */
    function createPlayButton() {
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
        
        return playButtonContainer;
    }

    /**
     * Create time display component
     * @returns {HTMLDivElement} Time display element
     */
    function createTimeDisplay() {
        const timeDisplay = document.createElement('div');
        timeDisplay.style.cssText = `opacity: 0.4; text-align: center; color: black; font-size: 11px; font-family: Arial, sans-serif; font-weight: 400; line-height: 16px; flex-shrink: 0; margin-right: 12px; min-width: 60px;`;
        timeDisplay.textContent = '0:00 / 0:00';
        return timeDisplay;
    }

    /**
     * Create progress bar component
     * @returns {HTMLDivElement} Progress container
     */
    function createProgressBar() {
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `flex: 1; height: 8px; background: rgba(0, 0, 0, 0.15); border-radius: 4px; position: relative; cursor: pointer; margin-right: 1rem;`;
        
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `width: 0%; height: 100%; background: #007AF7; border-radius: 4px; transition: width 0.1s ease;`;
        progressContainer.appendChild(progressBar);
        
        return progressContainer;
    }

    /**
     * Create upload status icon
     * @returns {HTMLDivElement} Upload icon element
     */
    function createUploadIcon() {
        const uploadIcon = document.createElement('div');
        uploadIcon.className = 'upload-status';
        uploadIcon.style.cssText = `width: 16px; height: 16px; margin-right: 8px; flex-shrink: 0; display: none; align-items: center; justify-content: center; color: #666;`;
        uploadIcon.innerHTML = `<svg width="23" height="18" viewBox="0 0 23 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.3603 4.12978C9.95632 2.81456 9.32134 1.71611 7.29446 1.71606C5.26758 1.71602 2.50257 3.6029 2.0119 5.78503C1.52123 7.96715 1.64731 9.52137 2.33889 10.5311C3.03048 11.5409 3.8667 11.4586 3.8667 11.4586C3.24843 11.0722 2.14031 10.1959 2.0119 8.10803C1.8835 6.02011 3.6876 2.71348 6.99176 2.1403C7.72561 2.013 9.8515 2.04725 10.3603 4.12978ZM10.3603 4.12978C11.4039 3.08984 12.877 2.74676 13.6571 3.21481C14.6322 3.79988 14.9775 5.19823 14.7589 6.21232C15.6096 5.65986 18.118 5.78503 19.087 6.21232M19.087 6.21232C20.056 6.63961 20.8327 7.14886 20.6145 9.60375C20.3963 12.0586 18.256 12.7801 17.5595 12.5496C20.9795 12.8104 21.085 9.82754 20.9839 8.41147C20.8827 6.9954 19.6968 6.40592 19.087 6.21232Z" stroke="currentColor" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.32078 11.691C6.25957 11.5144 6.1836 11.0235 6.49943 10.6511C7.34534 9.65366 9.3446 8.30582 10.4205 7.76125C10.9193 7.50877 11.1085 7.45005 11.5252 7.85738C11.8269 8.15223 12.5363 8.56445 13.1214 9.09835C13.7206 9.64506 15.104 10.4108 15.2078 10.9869C15.3117 11.563 15.1942 12.3164 14.6398 12.3174C13.8646 12.3189 12.6507 12.3174 12.6507 12.3174L9.39941 12.2017C8.4158 12.2457 6.47611 12.1391 6.32078 11.691Z" fill="currentColor"/><path d="M10.7537 10.7094C10.8037 11.9505 10.9624 15.3393 11.1919 16.1365C11.5198 15.7539 11.3383 12.119 11.2072 10.7031L10.7537 10.7094Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        return uploadIcon;
    }

    /**
     * Create delete button component
     * @returns {HTMLDivElement} Delete button element
     */
    function createDeleteButton() {
        const deleteButton = document.createElement('div');
        deleteButton.style.cssText = `width: 16px; height: 16px; cursor: pointer; color: #F25444; flex-shrink: 0; display: flex; align-items: center; justify-content: center;`;
        deleteButton.innerHTML = `<svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.22363 9.09265C4.3737 10.4226 4.74708 15.7266 5.19781 16.6576M5.19781 16.6576C5.64853 17.5886 10.0571 17.8989 10.9588 16.9236C11.8606 15.9483 12.4617 9.83049 12.5118 9.29851H12.899C12.5484 11.6777 11.5249 16.6567 11.2845 17.0468C10.9839 17.5345 7.65271 18.6525 5.19781 16.6576Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.01309 5.78625C5.84908 5.6567 3.63876 5.47262 2.79102 5.20837C3.87956 5.46873 13.8741 5.64946 14.1423 5.67009C14.3569 5.6866 14.1509 5.90362 14.0211 6.01007C13.4657 6.03019 10.1771 5.9158 8.01309 5.78625Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.04834 4.92596L6.87336 1.86548L10.6295 2.09035L10.7637 5.20825" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        return deleteButton;
    }

    /**
     * Setup audio player event listeners
     * @param {HTMLAudioElement} audio - Audio element
     * @param {HTMLDivElement} playButtonContainer - Play button container
     * @param {HTMLDivElement} progressContainer - Progress container
     * @param {HTMLDivElement} timeDisplay - Time display element
     */
    function setupAudioPlayerEvents(audio, playButtonContainer, progressContainer, timeDisplay) {
        const playIcon = playButtonContainer.children[0];
        const pauseIcon = playButtonContainer.children[1];
        const progressBar = progressContainer.children[0];
        let isPlaying = false;

        // Play/pause button
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

        // Progress bar seeking
        progressContainer.addEventListener('click', (e) => {
            if (audio.duration && isFinite(audio.duration)) {
                const rect = progressContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / rect.width;
                audio.currentTime = percentage * audio.duration;
            }
        });
        
        // Add hover effects for better visibility
        progressContainer.addEventListener('mouseenter', () => {
            progressContainer.style.background = 'rgba(0, 0, 0, 0.2)';
            progressContainer.style.height = '10px';
        });
        
        progressContainer.addEventListener('mouseleave', () => {
            progressContainer.style.background = 'rgba(0, 0, 0, 0.15)';
            progressContainer.style.height = '8px';
        });

        // Time updates
        audio.addEventListener('timeupdate', () => {
            if (audio.duration && isFinite(audio.duration)) {
                const percentage = (audio.currentTime / audio.duration) * 100;
                progressBar.style.width = percentage + '%';
                
                const currentTimeFormatted = formatTime(audio.currentTime);
                const durationFormatted = formatTime(audio.duration);
                timeDisplay.textContent = `${currentTimeFormatted} / ${durationFormatted}`;
            }
        });

        // Audio ended
        audio.addEventListener('ended', () => {
            playIcon.style.display = 'flex';
            pauseIcon.style.display = 'none';
            progressBar.style.width = '0%';
            isPlaying = false;
        });
    }

    /**
     * Setup upload status event handling for recording element
     * @param {HTMLElement} li - List item element
     * @param {Object} recordingData - Recording data
     * @param {HTMLElement} uploadIcon - Upload icon element
     * @param {HTMLElement} deleteButton - Delete button element
     * @param {Function} dispatchUploadStatusEvent - Event dispatcher function
     */
    function setupUploadStatusHandling(li, recordingData, uploadIcon, deleteButton, dispatchUploadStatusEvent) {
        let uploadBlinkInterval = null;

        const handleStatusUpdate = (event) => {
            if (event.detail.recordingId !== recordingData.id) {
                return;
            }

            const status = event.detail.status;

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
            } else {
                uploadIcon.style.display = 'none';
                deleteButton.style.display = 'flex';
                uploadIcon.style.opacity = '1';
            }
        };

        // Attach event listener
        document.addEventListener('recording-status-update', handleStatusUpdate);

        // Set initial state
        handleStatusUpdate({ 
            detail: { 
                recordingId: recordingData.id, 
                status: recordingData.uploadStatus || 'uploaded' 
            } 
        });

        // Cleanup when element is removed
        const observer = new MutationObserver((mutationsList, obs) => {
            for (const mutation of mutationsList) {
                if (mutation.removedNodes) {
                    for (const removedNode of mutation.removedNodes) {
                        if (removedNode.contains(li)) {
                            document.removeEventListener('recording-status-update', handleStatusUpdate);
                            if (uploadBlinkInterval) {
                                clearInterval(uploadBlinkInterval);
                            }
                            obs.disconnect();
                            return;
                        }
                    }
                }
            }
        });

        // Start observing for removal
        setTimeout(() => {
            if (li.parentNode) {
                observer.observe(li.parentNode, { childList: true });
            }
        }, 0);
    }

    /**
     * Create placeholder element for new recordings
     * @param {string} questionId - Question ID
     * @returns {HTMLElement} Placeholder element
     */
    function createRecordingPlaceholder(questionId) {
        const placeholder = document.createElement('div');
        placeholder.className = 'recording-placeholder';
        placeholder.dataset.questionId = questionId;
        
        const statusSpan = document.createElement('span');
        statusSpan.className = 'placeholder-status';
        statusSpan.textContent = 'Recording...';
        
        const timerSpan = document.createElement('span');
        timerSpan.className = 'placeholder-timer';
        timerSpan.textContent = '0:00';
        
        placeholder.appendChild(statusSpan);
        placeholder.appendChild(document.createTextNode(' '));
        placeholder.appendChild(timerSpan);
        
        return placeholder;
    }

    /**
     * Update upload status UI element
     * @param {HTMLElement} uploadElement - Upload icon element
     * @param {HTMLElement} deleteElement - Delete button element
     * @param {Object} recordingData - Recording data
     * @param {number} currentInterval - Current animation interval
     * @returns {number} New interval ID or null
     */
    function updateUploadStatusUI(uploadElement, deleteElement, recordingData, currentInterval) {
        // Clear any existing interval
        if (currentInterval) {
            clearInterval(currentInterval);
            currentInterval = null;
        }

        const uploadStatus = recordingData.uploadStatus || 'uploaded';
        
        if (uploadStatus === 'pending' || uploadStatus === 'uploading') {
            uploadElement.style.display = 'flex';
            deleteElement.style.display = 'none';
            
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
            uploadElement.style.display = 'none';
            deleteElement.style.display = 'flex';
            uploadElement.style.opacity = '1';
        }
        
        return currentInterval;
    }

    /**
     * Show radio program generation modal
     * @param {string} message - Status message
     * @param {number} progress - Progress percentage (0-100)
     */
    function showRadioProgramModal(message, progress) {
        // Remove existing modal if present
        const existingModal = document.getElementById('radio-program-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'radio-program-modal';
        modal.style.cssText = `
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

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        `;

        content.innerHTML = `
            <div style="margin-bottom: 30px;">
                <div class="spinner" style="
                    width: 60px;
                    height: 60px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #007AF7;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px auto;
                "></div>
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">Creating Your Radio Program</h3>
                <p id="status-message" style="margin: 0 0 20px 0; color: #666; font-size: 16px;">${message}</p>
                <div style="background: #f0f0f0; border-radius: 10px; height: 8px; overflow: hidden; margin-bottom: 10px;">
                    <div id="progress-bar" style="
                        height: 100%;
                        background: linear-gradient(90deg, #007AF7, #0056b3);
                        width: ${progress}%;
                        transition: width 0.3s ease;
                        border-radius: 10px;
                    "></div>
                </div>
                <p style="margin: 0; color: #999; font-size: 14px;">${progress}% complete</p>
            </div>
        `;

        // Add CSS animation for spinner
        if (!document.getElementById('spinner-styles')) {
            const spinnerStyle = document.createElement('style');
            spinnerStyle.id = 'spinner-styles';
            spinnerStyle.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(spinnerStyle);
        }

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    /**
     * Update progress in radio program modal
     * @param {string} message - Status message
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} details - Additional details
     */
    function updateRadioProgramProgress(message, progress, details = '') {
        const modal = document.getElementById('radio-program-modal');
        if (!modal) return;

        const statusMessage = modal.querySelector('#status-message');
        const progressBar = modal.querySelector('#progress-bar');
        const progressText = modal.querySelector('p:last-child');

        if (statusMessage) {
            statusMessage.textContent = message;
        }

        if (progressBar) {
            progressBar.style.width = progress + '%';
        }

        if (progressText) {
            progressText.textContent = `${progress}% complete`;
        }

        // Update spinner animation based on progress
        const spinner = modal.querySelector('.spinner');
        if (spinner && progress >= 90) {
            const updateSpinner = () => {
                spinner.style.borderTopColor = '#4CAF50';
                spinner.style.animation = 'spin 0.5s linear infinite';
            };
            updateSpinner();
        }
    }

    /**
     * Hide radio program modal
     */
    function hideRadioProgramModal() {
        const modal = document.getElementById('radio-program-modal');
        if (modal) {
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    /**
     * Show radio program success modal with audio player
     * @param {string} audioUrl - URL of generated audio
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @param {number} questionCount - Number of questions
     * @param {number} totalRecordings - Total recordings used
     */
    function showRadioProgramSuccess(audioUrl, world, lmid, questionCount, totalRecordings) {
        hideRadioProgramModal();

        const modal = document.createElement('div');
        modal.id = 'radio-success-modal';
        modal.style.cssText = `
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

        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            max-width: 500px;
            width: 90%;
            color: white;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        `;

        content.innerHTML = `
            <div style="margin-bottom: 30px;">
                <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
                <h2 style="margin: 0 0 15px 0; font-size: 24px;">Radio Program Ready!</h2>
                <p style="margin: 0 0 20px 0; opacity: 0.9; font-size: 16px;">
                    Your ${world} radio program has been created with ${totalRecordings} recordings from ${questionCount} question${questionCount !== 1 ? 's' : ''}.
                </p>
            </div>
            
            <div style="background: rgba(255,255,255,0.1); border-radius: 15px; padding: 20px; margin-bottom: 30px;">
                <audio controls style="width: 100%; margin-bottom: 15px;" preload="metadata">
                    <source src="${audioUrl}?_cb=${Date.now()}&_r=${Math.random()}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
                
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="downloadRadioProgram('${audioUrl}', '${world}', '${lmid}')" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 25px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        📥 Download
                    </button>
                    
                    <button onclick="shareRadioProgram('${world}', '${lmid}')" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 25px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        🔗 Share
                    </button>
                </div>
            </div>
            
            <button onclick="closeRadioSuccessModal()" style="
                background: rgba(255,255,255,0.1);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                padding: 12px 30px;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                Close
            </button>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Add global functions for button actions
        window.downloadRadioProgram = (url, world, lmid) => {
            const link = document.createElement('a');
            link.href = url;
            link.download = `${world}-radio-program-${lmid}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        window.shareRadioProgram = (world, lmid) => {
            const shareUrl = `${window.location.origin}${window.location.pathname}?world=${world}&lmid=${lmid}`;
            if (navigator.share) {
                navigator.share({
                    title: `${world} Radio Program`,
                    text: 'Listen to our radio program!',
                    url: shareUrl
                });
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    alert('Share link copied to clipboard!');
                });
            } else {
                prompt('Copy this link to share:', shareUrl);
            }
        };

        window.closeRadioSuccessModal = () => {
            modal.remove();
        };
    }

    /**
     * Start fun status messages animation
     */
    function startFunStatusMessages() {
        const messages = [
            "Mixing audio tracks...",
            "Adding background music...",
            "Balancing sound levels...",
            "Creating smooth transitions...",
            "Polishing the final mix...",
            "Adding professional touches...",
            "Almost there..."
        ];

        let currentIndex = 0;
        
        funStatusInterval = setInterval(() => {
            const statusMessage = document.getElementById('status-message');
            if (statusMessage && currentIndex < messages.length) {
                statusMessage.textContent = messages[currentIndex];
                currentIndex = (currentIndex + 1) % messages.length;
            }
        }, 3000);
    }

    /**
     * Stop fun status messages animation
     */
    function stopFunStatusMessages() {
        if (funStatusInterval) {
            clearInterval(funStatusInterval);
            funStatusInterval = null;
        }
    }

    /**
     * Safely set button text content
     * @param {HTMLElement} button - Button element
     * @param {string} text - Text to set
     */
    function setButtonText(button, text) {
        if (button && typeof button.textContent !== 'undefined') {
            button.textContent = text;
        } else if (button && typeof button.innerText !== 'undefined') {
            button.innerText = text;
        }
    }

    // Create global namespace
    window.RecordingUI = {
        formatTime,
        injectGlobalStyles,
        createRecordingElement,
        createRecordingPlaceholder,
        updateUploadStatusUI,
        showRadioProgramModal,
        updateRadioProgramProgress,
        hideRadioProgramModal,
        showRadioProgramSuccess,
        startFunStatusMessages,
        stopFunStatusMessages,
        setButtonText
    };

    console.log('✅ RecordingUI module loaded and available globally');

})(); 