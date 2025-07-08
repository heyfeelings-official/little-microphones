/**
 * radio-player.js - Audio Player Module for Radio System
 * 
 * PURPOSE: Professional HTML5 audio player with custom controls and features
 * DEPENDENCIES: HTML5 Audio API, CSS styling, event management
 * 
 * EXPORTED FUNCTIONS:
 * - showAudioPlayer(): Create and display professional audio player
 * - setupAudioPlayerEvents(): Setup audio event listeners
 * - setupActionButtons(): Setup download, share, regenerate buttons
 * - addPlayerStyles(): Inject CSS styles for player
 * - setupKeyboardShortcuts(): Setup keyboard controls
 * - setupResponsiveHandlers(): Setup responsive design handlers
 * - getAudioPlayer(): Get current audio player instance
 * - isPlayerReady(): Check if player is ready
 * 
 * PLAYER FEATURES:
 * - Professional HTML5 audio controls
 * - Progress tracking and seeking capabilities
 * - Volume control and playback speed options
 * - Download functionality for offline listening
 * - Social sharing integration
 * - Keyboard shortcuts for accessibility
 * - Responsive design for all devices
 * - Error handling and recovery
 * 
 * KEYBOARD SHORTCUTS:
 * - Space: Play/Pause
 * - Left Arrow: Seek backward 10s
 * - Right Arrow: Seek forward 10s
 * - Up Arrow: Volume up
 * - Down Arrow: Volume down
 * - M: Mute/Unmute
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0 (Extracted from radio.js)
 * STATUS: Production Ready ✅
 */

(function() {
    'use strict';
    
    // Global player state
    let audioPlayer = null;
    let isPlayerInitialized = false;

    /**
     * Display audio player with given URL and radio data
     * @param {string} audioUrl - URL of the audio file
     * @param {Object} radioData - Radio program data
     * @param {Function} generateNewProgram - Function to regenerate program
     * @returns {HTMLAudioElement} Audio player element
     */
    function showAudioPlayer(audioUrl, radioData, generateNewProgram) {
        let playerContainer = document.getElementById('audio-player-container');
        if (!playerContainer) {
            // Try fallback to main-container
            playerContainer = document.getElementById('main-container');
            if (!playerContainer) {
                console.error('Audio player container not found');
                return null;
            }
            console.log('Using main-container as audio player container');
        }

        // Use global config utility or fallback for world name formatting
        const worldName = window.LM_CONFIG?.UTILS?.formatWorldName(radioData.world) || 
                          radioData.world.charAt(0).toUpperCase() + radioData.world.slice(1).replace(/-/g, ' ');
        
        // Create professional audio player HTML
        playerContainer.innerHTML = `
            <div class="program-header">
                <h1 id="world-name" class="world-name">${worldName}</h1>
            </div>
            <div class="radio-player">
                <div class="player-header">
                    <h3>🎵 Your Radio Program is Ready!</h3>
                    <p>Listen to your personalized radio show</p>
                    ${radioData.recordingCount ? `<span class="recording-count">${radioData.recordingCount} recordings</span>` : ''}
                </div>
                <div class="player-controls">
                    <audio id="radio-audio" controls preload="metadata" style="width: 100%;">
                        <source src="${audioUrl}" type="audio/mpeg">
                        <source src="${audioUrl}" type="audio/mp3">
                        <source src="${audioUrl}" type="audio/wav">
                        Your browser does not support the audio element.
                    </audio>
                </div>
                <div class="player-info">
                    <div class="program-meta">
                        <span class="program-id">Program ID: ${radioData.lmid}</span>
                        ${radioData.lastManifest?.generatedAt ? `<span class="generated-at">Generated: ${new Date(radioData.lastManifest.generatedAt).toLocaleDateString()}</span>` : ''}
                    </div>
                </div>
                <div class="player-actions">
                    <button id="download-btn" class="action-btn primary">
                        <span class="btn-icon">📥</span>
                        <span class="btn-text">Download</span>
                    </button>
                    <button id="share-btn" class="action-btn secondary">
                        <span class="btn-icon">🔗</span>
                        <span class="btn-text">Share Link</span>
                    </button>
                    <button id="regenerate-btn" class="action-btn tertiary">
                        <span class="btn-icon">🔄</span>
                        <span class="btn-text">Update Program</span>
                    </button>
                </div>
                <div class="player-shortcuts">
                    <small>Keyboard shortcuts: Space (play/pause), ← → (seek), ↑ ↓ (volume), M (mute)</small>
                </div>
            </div>
        `;
        
        // Get audio player reference
        audioPlayer = document.getElementById('radio-audio');
        
        if (!audioPlayer) {
            console.error('Failed to create audio player element');
            return null;
        }
        
        // Setup player components
        setupAudioPlayerEvents();
        setupActionButtons(audioUrl, radioData, generateNewProgram);
        setupKeyboardShortcuts();
        setupResponsiveHandlers();
        
        // Add player styles if not already added
        addPlayerStyles();
        
        isPlayerInitialized = true;
        console.log('✅ Audio player initialized successfully');
        
        return audioPlayer;
    }

    /**
     * Setup audio player event listeners
     */
    function setupAudioPlayerEvents() {
        if (!audioPlayer) {
            console.warn('Audio player not available for event setup');
            return;
        }
        
        // Loading events
        audioPlayer.addEventListener('loadstart', () => {
            console.log('🔄 Audio loading started...');
            updatePlayerStatus('Loading audio...');
        });
        
        audioPlayer.addEventListener('loadedmetadata', () => {
            console.log('📊 Audio metadata loaded');
            if (audioPlayer.duration && isFinite(audioPlayer.duration)) {
                updatePlayerStatus(`Duration: ${formatDuration(audioPlayer.duration)}`);
            }
        });
        
        audioPlayer.addEventListener('canplay', () => {
            console.log('✅ Audio ready to play');
            updatePlayerStatus('Ready to play');
        });
        
        audioPlayer.addEventListener('canplaythrough', () => {
            console.log('✅ Audio fully loaded');
            updatePlayerStatus('');
        });
        
        // Playback events
        audioPlayer.addEventListener('play', () => {
            console.log('▶️ Audio playback started');
            updatePlayingState(true);
        });
        
        audioPlayer.addEventListener('pause', () => {
            console.log('⏸️ Audio playback paused');
            updatePlayingState(false);
        });
        
        audioPlayer.addEventListener('ended', () => {
            console.log('🎵 Audio playback completed');
            updatePlayingState(false);
            showPlaybackCompleteMessage();
        });
        
        // Progress events
        audioPlayer.addEventListener('timeupdate', () => {
            updateProgressDisplay();
        });
        
        // Volume events
        audioPlayer.addEventListener('volumechange', () => {
            updateVolumeDisplay();
        });
        
        // Error handling
        audioPlayer.addEventListener('error', (e) => {
            console.error('❌ Audio playback error:', e);
            const error = audioPlayer.error;
            let errorMessage = 'Unknown audio error';
            
            if (error) {
                switch (error.code) {
                    case error.MEDIA_ERR_ABORTED:
                        errorMessage = 'Audio loading was aborted';
                        break;
                    case error.MEDIA_ERR_NETWORK:
                        errorMessage = 'Network error while loading audio';
                        break;
                    case error.MEDIA_ERR_DECODE:
                        errorMessage = 'Audio file is corrupted or unsupported';
                        break;
                    case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        errorMessage = 'Audio format not supported';
                        break;
                }
            }
            
            updatePlayerStatus(`Error: ${errorMessage}`);
            showAudioError(errorMessage);
        });
        
        // Network state events
        audioPlayer.addEventListener('waiting', () => {
            updatePlayerStatus('Buffering...');
        });
        
        audioPlayer.addEventListener('stalled', () => {
            updatePlayerStatus('Loading stalled...');
        });
    }

    /**
     * Setup action button event listeners
     * @param {string} audioUrl - URL of the audio file
     * @param {Object} radioData - Radio program data
     * @param {Function} generateNewProgram - Function to regenerate program
     */
    function setupActionButtons(audioUrl, radioData, generateNewProgram) {
        // Download button
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                downloadAudio(audioUrl, radioData);
            });
        }
        
        // Share button
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.preventDefault();
                shareProgram(radioData);
            });
        }
        
        // Regenerate button
        const regenerateBtn = document.getElementById('regenerate-btn');
        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleRegenerate(generateNewProgram);
            });
        }
    }

    /**
     * Setup keyboard shortcuts for player control
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!audioPlayer || !isPlayerInitialized) return;
            
            // Don't interfere with form inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlayPause();
                    break;
                    
                case 'ArrowLeft':
                    e.preventDefault();
                    seekBackward(10);
                    break;
                    
                case 'ArrowRight':
                    e.preventDefault();
                    seekForward(10);
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    adjustVolume(0.1);
                    break;
                    
                case 'ArrowDown':
                    e.preventDefault();
                    adjustVolume(-0.1);
                    break;
                    
                case 'KeyM':
                    e.preventDefault();
                    toggleMute();
                    break;
                    
                case 'Digit0':
                case 'Numpad0':
                    e.preventDefault();
                    seekToPercentage(0);
                    break;
                    
                case 'Digit1':
                case 'Numpad1':
                    e.preventDefault();
                    seekToPercentage(10);
                    break;
                    
                case 'Digit2':
                case 'Numpad2':
                    e.preventDefault();
                    seekToPercentage(20);
                    break;
                    
                case 'Digit3':
                case 'Numpad3':
                    e.preventDefault();
                    seekToPercentage(30);
                    break;
                    
                case 'Digit4':
                case 'Numpad4':
                    e.preventDefault();
                    seekToPercentage(40);
                    break;
                    
                case 'Digit5':
                case 'Numpad5':
                    e.preventDefault();
                    seekToPercentage(50);
                    break;
                    
                case 'Digit6':
                case 'Numpad6':
                    e.preventDefault();
                    seekToPercentage(60);
                    break;
                    
                case 'Digit7':
                case 'Numpad7':
                    e.preventDefault();
                    seekToPercentage(70);
                    break;
                    
                case 'Digit8':
                case 'Numpad8':
                    e.preventDefault();
                    seekToPercentage(80);
                    break;
                    
                case 'Digit9':
                case 'Numpad9':
                    e.preventDefault();
                    seekToPercentage(90);
                    break;
            }
        });
    }

    /**
     * Setup responsive design handlers
     */
    function setupResponsiveHandlers() {
        const handleResize = () => {
            if (!audioPlayer) return;
            
            const playerContainer = audioPlayer.closest('.radio-player');
            if (!playerContainer) return;
            
            // Adjust player layout based on screen size
            const isMobile = window.innerWidth < 768;
            
            if (isMobile) {
                playerContainer.classList.add('mobile-layout');
                // Stack action buttons vertically on mobile
                const actionsContainer = playerContainer.querySelector('.player-actions');
                if (actionsContainer) {
                    actionsContainer.classList.add('mobile-stack');
                }
            } else {
                playerContainer.classList.remove('mobile-layout');
                const actionsContainer = playerContainer.querySelector('.player-actions');
                if (actionsContainer) {
                    actionsContainer.classList.remove('mobile-stack');
                }
            }
        };
        
        // Initial setup
        handleResize();
        
        // Listen for resize events
        window.addEventListener('resize', handleResize);
        
        // Listen for orientation change on mobile devices
        window.addEventListener('orientationchange', () => {
            setTimeout(handleResize, 100);
        });
    }

    /**
     * Add CSS styles for the player
     */
    function addPlayerStyles() {
        // Check if styles already added
        if (document.getElementById('radio-player-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'radio-player-styles';
        style.textContent = `
            .radio-player {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 20px;
                padding: 30px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                color: white;
                max-width: 600px;
                margin: 0 auto;
                font-family: 'Arial', sans-serif;
            }
            
            .player-header {
                text-align: center;
                margin-bottom: 25px;
            }
            
            .player-header h3 {
                margin: 0 0 10px 0;
                font-size: 24px;
                font-weight: 600;
            }
            
            .player-header p {
                margin: 0 0 10px 0;
                opacity: 0.9;
                font-size: 16px;
            }
            
            .recording-count {
                background: rgba(255,255,255,0.2);
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 500;
            }
            
            .player-controls {
                margin: 20px 0;
            }
            
            .player-controls audio {
                width: 100%;
                height: 50px;
                border-radius: 10px;
                outline: none;
            }
            
            .player-info {
                margin: 20px 0;
                text-align: center;
            }
            
            .program-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
                opacity: 0.8;
                font-size: 14px;
            }
            
            .player-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin: 25px 0;
                flex-wrap: wrap;
            }
            
            .action-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 20px;
                border: none;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 120px;
                justify-content: center;
            }
            
            .action-btn.primary {
                background: rgba(255,255,255,0.2);
                color: white;
            }
            
            .action-btn.secondary {
                background: rgba(255,255,255,0.1);
                color: white;
            }
            
            .action-btn.tertiary {
                background: rgba(255,255,255,0.05);
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
            }
            
            .action-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
            }
            
            .player-shortcuts {
                text-align: center;
                margin-top: 20px;
                opacity: 0.7;
            }
            
            .player-shortcuts small {
                font-size: 12px;
            }
            
            @media (max-width: 768px) {
                .radio-player {
                    padding: 20px;
                    margin: 10px;
                }
                
                .player-actions.mobile-stack {
                    flex-direction: column;
                    align-items: center;
                }
                
                .action-btn {
                    min-width: 200px;
                }
                
                .program-meta {
                    flex-direction: column;
                    gap: 5px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Helper functions
    function togglePlayPause() {
        if (!audioPlayer) return;
        
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    }

    function seekBackward(seconds) {
        if (!audioPlayer) return;
        audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - seconds);
    }

    function seekForward(seconds) {
        if (!audioPlayer) return;
        audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + seconds);
    }

    function adjustVolume(delta) {
        if (!audioPlayer) return;
        audioPlayer.volume = Math.max(0, Math.min(1, audioPlayer.volume + delta));
    }

    function toggleMute() {
        if (!audioPlayer) return;
        audioPlayer.muted = !audioPlayer.muted;
    }

    function seekToPercentage(percentage) {
        if (!audioPlayer || !audioPlayer.duration) return;
        audioPlayer.currentTime = (audioPlayer.duration * percentage) / 100;
    }

    function downloadAudio(audioUrl, radioData) {
        try {
            const link = document.createElement('a');
            link.href = audioUrl;
            link.download = `${radioData.world}-radio-program-${radioData.lmid}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showSuccessMessage('Download started!');
        } catch (error) {
            console.error('Download failed:', error);
            showErrorMessage('Download failed. Please try again.');
        }
    }

    function shareProgram(radioData) {
        try {
            const shareUrl = `${window.location.origin}${window.location.pathname}?world=${radioData.world}&lmid=${radioData.lmid}`;
            
            if (navigator.share) {
                navigator.share({
                    title: `${radioData.world} Radio Program`,
                    text: 'Listen to our radio program!',
                    url: shareUrl
                }).catch(error => {
                    console.log('Native sharing cancelled or failed:', error);
                    fallbackShare(shareUrl);
                });
            } else {
                fallbackShare(shareUrl);
            }
        } catch (error) {
            console.error('Share failed:', error);
            showErrorMessage('Share failed. Please try again.');
        }
    }

    function fallbackShare(shareUrl) {
        try {
            navigator.clipboard.writeText(shareUrl).then(() => {
                showSuccessMessage('Share link copied to clipboard!');
            }).catch(() => {
                showShareModal(shareUrl);
            });
        } catch (error) {
            showShareModal(shareUrl);
        }
    }

    function showShareModal(shareUrl) {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 20px; border-radius: 10px; max-width: 500px; margin: 20px;">
                    <h3>Share this program</h3>
                    <input type="text" value="${shareUrl}" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 5px;" readonly>
                    <div style="text-align: right; margin-top: 15px;">
                        <button onclick="this.closest('div').parentNode.parentNode.remove()" style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Select the URL text
        const input = modal.querySelector('input');
        input.select();
        input.setSelectionRange(0, 99999);
    }

    function handleRegenerate(generateNewProgram) {
        if (generateNewProgram && typeof generateNewProgram === 'function') {
            generateNewProgram();
        } else {
            console.warn('Regenerate function not available');
            showErrorMessage('Regenerate function not available');
        }
    }

    function updatePlayerStatus(message) {
        const statusElements = document.querySelectorAll('.player-status, .audio-status');
        statusElements.forEach(element => {
            if (element) {
                element.textContent = message;
                element.style.display = message ? 'block' : 'none';
            }
        });
    }

    function updatePlayingState(isPlaying) {
        const playerContainer = document.querySelector('.radio-player');
        if (playerContainer) {
            if (isPlaying) {
                playerContainer.classList.add('playing');
            } else {
                playerContainer.classList.remove('playing');
            }
        }
    }

    function updateProgressDisplay() {
        // This can be extended for custom progress indicators
    }

    function updateVolumeDisplay() {
        // This can be extended for custom volume indicators
    }

    function showPlaybackCompleteMessage() {
        showSuccessMessage('Radio program finished playing!');
    }

    function showAudioError(message) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'audio-error-message';
        errorContainer.style.cssText = `
            background: #ff4444;
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            text-align: center;
        `;
        errorContainer.textContent = `Audio Error: ${message}`;
        
        const playerContainer = document.querySelector('.radio-player');
        if (playerContainer) {
            playerContainer.appendChild(errorContainer);
            setTimeout(() => {
                if (errorContainer.parentNode) {
                    errorContainer.parentNode.removeChild(errorContainer);
                }
            }, 5000);
        }
    }

    function showSuccessMessage(message) {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'success-message';
        messageContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        messageContainer.textContent = message;
        
        document.body.appendChild(messageContainer);
        setTimeout(() => {
            if (messageContainer.parentNode) {
                messageContainer.parentNode.removeChild(messageContainer);
            }
        }, 3000);
    }

    function showErrorMessage(message) {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'error-message';
        messageContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        messageContainer.textContent = message;
        
        document.body.appendChild(messageContainer);
        setTimeout(() => {
            if (messageContainer.parentNode) {
                messageContainer.parentNode.removeChild(messageContainer);
            }
        }, 5000);
    }

    function formatDuration(seconds) {
        if (!isFinite(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function getAudioPlayer() {
        return audioPlayer;
    }

    function isPlayerReady() {
        return isPlayerInitialized && audioPlayer && !audioPlayer.error;
    }

    function resetPlayer() {
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
        isPlayerInitialized = false;
        audioPlayer = null;
    }

    // Create global namespace
    window.RadioPlayer = {
        showAudioPlayer,
        setupAudioPlayerEvents,
        setupActionButtons,
        addPlayerStyles,
        setupKeyboardShortcuts,
        setupResponsiveHandlers,
        getAudioPlayer,
        isPlayerReady,
        resetPlayer
    };

    console.log('✅ RadioPlayer module loaded and available globally');

})(); 