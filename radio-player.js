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
export function showAudioPlayer(audioUrl, radioData, generateNewProgram) {
    const playerContainer = document.getElementById('audio-player-container');
    if (!playerContainer) {
        console.error('Audio player container not found');
        return null;
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
export function setupAudioPlayerEvents() {
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
export function setupActionButtons(audioUrl, radioData, generateNewProgram) {
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
export function setupKeyboardShortcuts() {
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
export function setupResponsiveHandlers() {
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
export function addPlayerStyles() {
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
            background: #4CAF50;
            color: white;
        }
        
        .action-btn.primary:hover {
            background: #45a049;
            transform: translateY(-2px);
        }
        
        .action-btn.secondary {
            background: #2196F3;
            color: white;
        }
        
        .action-btn.secondary:hover {
            background: #1976D2;
            transform: translateY(-2px);
        }
        
        .action-btn.tertiary {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
        }
        
        .action-btn.tertiary:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
        
        .action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }
        
        .player-shortcuts {
            text-align: center;
            margin-top: 20px;
            opacity: 0.7;
        }
        
        .player-status {
            text-align: center;
            margin: 10px 0;
            font-size: 14px;
            opacity: 0.8;
            min-height: 20px;
        }
        
        /* Mobile responsive */
        @media (max-width: 768px) {
            .radio-player.mobile-layout {
                padding: 20px;
                margin: 10px;
            }
            
            .player-actions.mobile-stack {
                flex-direction: column;
                align-items: stretch;
            }
            
            .action-btn {
                width: 100%;
                margin-bottom: 10px;
            }
            
            .program-meta {
                flex-direction: column;
                text-align: center;
            }
            
            .player-shortcuts {
                display: none;
            }
        }
        
        /* Loading animation */
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .player-loading {
            animation: pulse 2s infinite;
        }
        
        /* Error state */
        .player-error {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
            text-align: center;
            padding: 20px;
            border-radius: 10px;
            margin: 10px 0;
        }
        
        .player-error h4 {
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        
        .player-error p {
            margin: 0;
            opacity: 0.9;
        }
    `;
    
    document.head.appendChild(style);
}

// Player control functions
function togglePlayPause() {
    if (!audioPlayer) return;
    
    if (audioPlayer.paused) {
        audioPlayer.play().catch(e => console.error('Play failed:', e));
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
    if (audioPlayer.duration && isFinite(audioPlayer.duration)) {
        audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + seconds);
    }
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
    if (!audioPlayer || !audioPlayer.duration || !isFinite(audioPlayer.duration)) return;
    audioPlayer.currentTime = (percentage / 100) * audioPlayer.duration;
}

// Action button handlers
function downloadAudio(audioUrl, radioData) {
    try {
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `radio-program-${radioData.world}-${radioData.lmid}.mp3`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('📥 Download initiated');
        showSuccessMessage('Download started!');
    } catch (error) {
        console.error('Download failed:', error);
        showErrorMessage('Download failed. Please try again.');
    }
}

function shareProgram(radioData) {
    const shareUrl = window.location.href;
    const shareTitle = `${radioData.world} Radio Program - Little Microphones`;
    const shareText = `Listen to this personalized radio program from ${radioData.world}!`;
    
    if (navigator.share) {
        navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
        }).then(() => {
            console.log('🔗 Share successful');
        }).catch((error) => {
            console.error('Share failed:', error);
            fallbackShare(shareUrl);
        });
    } else {
        fallbackShare(shareUrl);
    }
}

function fallbackShare(shareUrl) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showSuccessMessage('Link copied to clipboard!');
        }).catch(() => {
            showShareModal(shareUrl);
        });
    } else {
        showShareModal(shareUrl);
    }
}

function showShareModal(shareUrl) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 400px; text-align: center;">
            <h3 style="margin: 0 0 20px 0; color: #333;">Share This Program</h3>
            <input type="text" value="${shareUrl}" readonly style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <button onclick="this.previousElementSibling.select(); document.execCommand('copy'); this.textContent='Copied!'" style="background: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin-right: 10px; cursor: pointer;">Copy Link</button>
            <button onclick="this.closest('div').parentNode.remove()" style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Close</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function handleRegenerate(generateNewProgram) {
    if (confirm('Generate a new version with the latest recordings?')) {
        if (typeof generateNewProgram === 'function') {
            generateNewProgram();
        } else {
            console.error('Generate function not available');
            showErrorMessage('Regeneration feature not available');
        }
    }
}

// UI update functions
function updatePlayerStatus(message) {
    let statusElement = document.querySelector('.player-status');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.className = 'player-status';
        const playerHeader = document.querySelector('.player-header');
        if (playerHeader) {
            playerHeader.appendChild(statusElement);
        }
    }
    statusElement.textContent = message;
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
    // This could be expanded to show custom progress display
}

function updateVolumeDisplay() {
    // This could be expanded to show volume level indicator
}

function showPlaybackCompleteMessage() {
    showSuccessMessage('Thanks for listening! Share this program with others.');
}

function showAudioError(message) {
    const playerContainer = document.querySelector('.radio-player');
    if (playerContainer) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'player-error';
        errorDiv.innerHTML = `
            <h4>⚠️ Playback Error</h4>
            <p>${message}</p>
            <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: white; color: #ff6b6b; border: none; border-radius: 5px; cursor: pointer;">Refresh Page</button>
        `;
        playerContainer.appendChild(errorDiv);
    }
}

function showSuccessMessage(message) {
    // Simple success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 10000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showErrorMessage(message) {
    // Simple error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 10000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get current audio player instance
 * @returns {HTMLAudioElement|null} Audio player or null
 */
export function getAudioPlayer() {
    return audioPlayer;
}

/**
 * Check if player is ready and initialized
 * @returns {boolean} True if player is ready
 */
export function isPlayerReady() {
    return isPlayerInitialized && audioPlayer && !audioPlayer.error;
}

/**
 * Reset player state
 */
export function resetPlayer() {
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
    }
    audioPlayer = null;
    isPlayerInitialized = false;
} 