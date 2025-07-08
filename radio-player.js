/**
 * radio-player.js - Simplified Program Container for Webflow Integration
 * 
 * PURPOSE: Single container with three states for /program page
 * STATES:
 * 1. Loading: "Loading... status text fun"
 * 2. Playing: Audio player with controls
 * 3. Generating: "Generating..." with progress
 * 
 * WEBFLOW INTEGRATION: Uses existing container with ID "program-container"
 */

(function() {
    'use strict';
    
    // Global player state
    let audioPlayer = null;
    let currentState = 'loading'; // 'loading', 'playing', 'generating'

    /**
     * Initialize program container - call this from your main script
     * @param {string} containerId - ID of Webflow container (default: 'program-container')
     */
    function initializeProgramContainer(containerId = 'program-container') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Program container with ID "${containerId}" not found`);
            return;
        }
        
        // Set initial state
        showLoadingState(container, 'Loading your radio program...');
        
        console.log('✅ Program container initialized');
        return container;
    }

    /**
     * STATE 1: Show loading state
     * @param {HTMLElement} container - Container element
     * @param {string} message - Loading message
     */
    function showLoadingState(container, message = 'Loading...') {
        currentState = 'loading';
        
        container.innerHTML = `
            <div class="program-state program-loading">
                <div class="program-world-header">
                    <h2 class="program-world-title">Little Microphones</h2>
                    <h1 class="program-world-name" id="program-world-name">Spookyland</h1>
                </div>
                <div class="program-status-container">
                    <div class="program-status-text" id="program-status-text">${message}</div>
                </div>
                <div class="program-meta">
                    <div class="program-teacher" id="program-teacher">John Teacher & The Kids</div>
                    <div class="program-school" id="program-school">from Elementary X</div>
                </div>
            </div>
        `;
        
        console.log('📡 Loading state shown');
    }

    /**
     * STATE 2: Show audio player
     * @param {HTMLElement} container - Container element
     * @param {string} audioUrl - URL of audio file
     * @param {Object} radioData - Radio program data
     */
    function showPlayerState(container, audioUrl, radioData = {}) {
        currentState = 'playing';
        
        const worldName = radioData.world ? 
            radioData.world.charAt(0).toUpperCase() + radioData.world.slice(1).replace(/-/g, ' ') : 
            'Spookyland';
            
        container.innerHTML = `
            <div class="program-state program-playing">
                <div class="program-world-header">
                    <h2 class="program-world-title">Little Microphones</h2>
                    <h1 class="program-world-name">${worldName}</h1>
                </div>
                <div class="program-player-container">
                    <audio id="program-audio" controls preload="metadata" class="program-audio-player">
                        <source src="${audioUrl}" type="audio/mpeg">
                        <source src="${audioUrl}" type="audio/mp3">
                        Your browser does not support the audio element.
                    </audio>
                    <div class="program-time-display">
                        <span id="program-current-time">0:01</span>
                        <span class="program-time-separator">/</span>
                        <span id="program-total-time">0:02</span>
                    </div>
                </div>
                <div class="program-meta">
                    <div class="program-teacher" id="program-teacher">${radioData.teacher || 'John Teacher & The Kids'}</div>
                    <div class="program-school" id="program-school">${radioData.school || 'from Elementary X'}</div>
                </div>
            </div>
        `;
        
        // Setup audio player
        audioPlayer = document.getElementById('program-audio');
        setupAudioEvents();
        
        console.log('🎵 Player state shown');
    }

    /**
     * STATE 3: Show generating state
     * @param {HTMLElement} container - Container element
     * @param {string} message - Generation message
     * @param {number} progress - Progress percentage (0-100)
     */
    function showGeneratingState(container, message = 'Generating...', progress = 0) {
        currentState = 'generating';
        
        container.innerHTML = `
            <div class="program-state program-generating">
                <div class="program-world-header">
                    <h2 class="program-world-title">Little Microphones</h2>
                    <h1 class="program-world-name" id="program-world-name">Generating...</h1>
                </div>
                <div class="program-status-container">
                    <div class="program-progress-bar">
                        <div class="program-progress-fill" id="program-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="program-status-text" id="program-status-text">${message}</div>
                </div>
                <div class="program-meta">
                    <div class="program-teacher" id="program-teacher">John Teacher & The Kids</div>
                    <div class="program-school" id="program-school">from Elementary X</div>
                </div>
            </div>
        `;
        
        console.log('⚙️ Generating state shown');
    }

    /**
     * Update loading message
     * @param {string} message - New message
     */
    function updateLoadingMessage(message) {
        const statusText = document.getElementById('program-status-text');
        if (statusText && currentState === 'loading') {
            statusText.textContent = message;
        }
    }

    /**
     * Update generating progress
     * @param {string} message - Progress message
     * @param {number} progress - Progress percentage (0-100)
     */
    function updateGeneratingProgress(message, progress) {
        if (currentState !== 'generating') return;
        
        const statusText = document.getElementById('program-status-text');
        const progressFill = document.getElementById('program-progress-fill');
        
        if (statusText) statusText.textContent = message;
        if (progressFill) progressFill.style.width = `${progress}%`;
    }

    /**
     * Update world name across all states
     * @param {string} worldName - World name
     */
    function updateWorldName(worldName) {
        const worldElement = document.getElementById('program-world-name');
        if (worldElement && currentState !== 'generating') {
            const formatted = worldName.charAt(0).toUpperCase() + worldName.slice(1).replace(/-/g, ' ');
            worldElement.textContent = formatted;
        }
    }

    /**
     * Update teacher and school info
     * @param {string} teacher - Teacher name
     * @param {string} school - School name
     */
    function updateMetaInfo(teacher, school) {
        const teacherElement = document.getElementById('program-teacher');
        const schoolElement = document.getElementById('program-school');
        
        if (teacherElement) teacherElement.textContent = teacher;
        if (schoolElement) schoolElement.textContent = school;
    }

    /**
     * Setup audio player events
     */
    function setupAudioEvents() {
        if (!audioPlayer) return;
        
        audioPlayer.addEventListener('loadedmetadata', () => {
            updateTimeDisplay();
        });
        
        audioPlayer.addEventListener('timeupdate', () => {
            updateTimeDisplay();
        });
        
        audioPlayer.addEventListener('error', (e) => {
            console.error('Audio playback error:', e);
            const statusContainer = document.querySelector('.program-status-container');
            if (statusContainer) {
                statusContainer.innerHTML = '<div class="program-error">Audio playback error</div>';
            }
        });
    }

    /**
     * Update time display
     */
    function updateTimeDisplay() {
        if (!audioPlayer) return;
        
        const currentTimeEl = document.getElementById('program-current-time');
        const totalTimeEl = document.getElementById('program-total-time');
        
        if (currentTimeEl && audioPlayer.currentTime) {
            currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        }
        
        if (totalTimeEl && audioPlayer.duration && isFinite(audioPlayer.duration)) {
            totalTimeEl.textContent = formatTime(audioPlayer.duration);
        }
    }

    /**
     * Format time to MM:SS
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time
     */
    function formatTime(seconds) {
        if (!isFinite(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Get current state
     * @returns {string} Current state
     */
    function getCurrentState() {
        return currentState;
    }

    /**
     * Get audio player instance
     * @returns {HTMLAudioElement|null} Audio player
     */
    function getAudioPlayer() {
        return audioPlayer;
    }

    // Create global namespace for Webflow integration
    window.ProgramContainer = {
        // Main functions
        initialize: initializeProgramContainer,
        showLoading: showLoadingState,
        showPlayer: showPlayerState,
        showGenerating: showGeneratingState,
        
        // Update functions
        updateLoadingMessage,
        updateGeneratingProgress,
        updateWorldName,
        updateMetaInfo,
        
        // Utility functions
        getCurrentState,
        getAudioPlayer,
        formatTime
    };

    console.log('✅ ProgramContainer module loaded and ready for Webflow integration');

})(); 