/**
 * radio.js - Simplified Radio Program Page for Webflow Integration
 * 
 * PURPOSE: Controls 3 Webflow containers for different states
 * CONTAINERS:
 * 1. #loading-container - Loading state
 * 2. #player-container - Audio player state  
 * 3. #generating-container - Generation progress state
 * 
 * NO INLINE STYLES - All styling done in Webflow
 * NO HTML GENERATION - Uses existing Webflow elements
 */

(function() {
    'use strict';
    
    // Global state
    let currentState = 'loading';
    let audioPlayer = null;
    let currentShareId = null;
    let currentRadioData = null;

    // API Configuration
    const API_BASE_URL = window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app';

    /**
     * Initialize the radio page
     */
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🎵 Radio page initializing...');
        
        try {
            // Extract ShareID from URL
            currentShareId = getShareIdFromUrl();
            if (!currentShareId) {
                showError('Invalid Link', 'This radio program link is missing required information.');
                return;
            }
            
            console.log(`📻 ShareID extracted: ${currentShareId}`);
            
            // Start with loading state
            showLoadingState('Loading world...');
            
            // Fetch radio data
            currentRadioData = await fetchRadioData(currentShareId);
            
            if (!currentRadioData || !currentRadioData.success) {
                showError('Program Not Found', 'This radio program could not be found.');
                return;
            }
            
            // Update world info
            updateWorldInfo(currentRadioData);
            
            // Check if we need to generate or can show existing
            if (currentRadioData.needsNewProgram) {
                console.log('🔄 Generating new program...');
                await handleProgramGeneration();
            } else if (currentRadioData.lastManifest?.programUrl) {
                console.log('✅ Showing existing program');
                showPlayerState(currentRadioData.lastManifest.programUrl, currentRadioData);
            } else {
                console.log('📝 No existing program - generating...');
                await handleProgramGeneration();
            }
            
        } catch (error) {
            console.error('❌ Radio page initialization failed:', error);
            showError('Loading Error', 'Failed to load the radio program.');
        }
    });

    /**
     * STATE MANAGEMENT - Show/Hide Webflow containers
     */
    
    function showLoadingState(message = 'Loading...') {
        currentState = 'loading';
        console.log('📡 Showing loading state');
        
        // Hide other containers
        hideContainer('player-container');
        hideContainer('generating-container');
        
        // Show loading container
        showContainer('loading-container');
        
        // Update loading message
        updateText('.loading-message, #loading-message', message);
        updateText('.loading-status, #loading-status', message);
    }
    
    function showPlayerState(audioUrl, radioData = {}) {
        currentState = 'playing';
        console.log('🎵 Showing player state');
        
        // Hide other containers
        hideContainer('loading-container');
        hideContainer('generating-container');
        
        // Show player container
        showContainer('player-container');
        
        // Setup audio player
        setupAudioPlayer(audioUrl);
        
        console.log('✅ Player state shown');
    }
    
    function showGeneratingState(message = 'Generating...', progress = 0) {
        currentState = 'generating';
        console.log('⚙️ Showing generating state');
        
        // Hide other containers
        hideContainer('loading-container');
        hideContainer('player-container');
        
        // Show generating container
        showContainer('generating-container');
        
        // Update generating info
        updateGeneratingProgress(message, progress);
    }

    /**
     * UTILITY FUNCTIONS for Webflow elements
     */
    
    function showContainer(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'block';
        } else {
            console.warn(`Container not found: ${containerId}`);
        }
    }
    
    function hideContainer(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
        }
    }
    
    function updateText(selector, text) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (el) el.textContent = text;
        });
    }
    
    function updateAttribute(selector, attribute, value) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (el) el.setAttribute(attribute, value);
        });
    }

    /**
     * UPDATE FUNCTIONS for specific elements
     */
    
    function updateWorldInfo(radioData) {
        if (!radioData) return;
        
        const worldName = radioData.world ? 
            radioData.world.charAt(0).toUpperCase() + radioData.world.slice(1).replace(/-/g, ' ') : 
            'Spookyland';
            
        // Update world name in all containers
        updateText('.world-name, #world-name', worldName);
        updateText('.program-world, #program-world', worldName);
        
        // Update meta info
        const teacher = radioData.teacher || 'John Teacher & The Kids';
        const school = radioData.school || 'from Elementary X';
        
        updateText('.teacher-name, #teacher-name', teacher);
        updateText('.school-name, #school-name', school);
        updateText('.program-teacher, #program-teacher', teacher);
        updateText('.program-school, #program-school', school);
    }
    
    function updateLoadingMessage(message) {
        if (currentState !== 'loading') return;
        updateText('.loading-message, #loading-message', message);
        updateText('.loading-status, #loading-status', message);
    }
    
    function updateGeneratingProgress(message, progress) {
        if (currentState !== 'generating') return;
        
        // Update message
        updateText('.generating-message, #generating-message', message);
        updateText('.generating-status, #generating-status', message);
        
        // Update progress bar
        const progressBars = document.querySelectorAll('.progress-fill, #progress-fill, .generating-progress');
        progressBars.forEach(bar => {
            if (bar) bar.style.width = `${progress}%`;
        });
        
        // Update progress text
        updateText('.progress-text, #progress-text', `${progress}%`);
    }

    /**
     * AUDIO PLAYER SETUP
     */
    
    function setupAudioPlayer(audioUrl) {
        // Find audio element in player container
        const audioElements = document.querySelectorAll('#player-container audio, .program-audio, #program-audio');
        
        audioElements.forEach(audio => {
            if (audio) {
                audio.src = audioUrl;
                audio.load();
                
                // Setup time display
                audio.addEventListener('loadedmetadata', () => {
                    updateTimeDisplay(audio);
                });
                
                audio.addEventListener('timeupdate', () => {
                    updateTimeDisplay(audio);
                });
                
                audio.addEventListener('error', (e) => {
                    console.error('Audio playback error:', e);
                    updateText('.audio-error, #audio-error', 'Audio playback error');
                });
                
                audioPlayer = audio;
            }
        });
    }
    
    function updateTimeDisplay(audio) {
        if (!audio) return;
        
        const currentTime = formatTime(audio.currentTime || 0);
        const duration = formatTime(audio.duration || 0);
        
        updateText('.current-time, #current-time', currentTime);
        updateText('.total-time, #total-time', duration);
        updateText('.time-display, #time-display', `${currentTime} / ${duration}`);
    }
    
    function formatTime(seconds) {
        if (!isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * API FUNCTIONS
     */
    
    async function fetchRadioData(shareId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/get-radio-data?shareId=${shareId}&_t=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📻 Radio data fetched:', data);
            
            return data;
            
        } catch (error) {
            console.error('Failed to fetch radio data:', error);
            return null;
        }
    }
    
    async function handleProgramGeneration() {
        try {
            showGeneratingState('Preparing audio segments...', 0);
            
            // Simulate generation steps with real API call
            const steps = [
                { message: 'Collecting recordings...', progress: 10 },
                { message: 'Processing audio tracks...', progress: 30 },
                { message: 'Mixing everything together...', progress: 60 },
                { message: 'Adding final touches...', progress: 90 },
                { message: 'Complete!', progress: 100 }
            ];
            
            for (const step of steps) {
                updateGeneratingProgress(step.message, step.progress);
                await sleep(1000);
            }
            
            // Call actual generation API
            const result = await generateNewProgram(currentRadioData);
            
            if (result.success) {
                showPlayerState(result.audioUrl, currentRadioData);
            } else {
                throw new Error(result.error || 'Generation failed');
            }
            
        } catch (error) {
            console.error('❌ Program generation failed:', error);
            showError('Generation Failed', `Failed to generate radio program: ${error.message}`);
        }
    }
    
    async function generateNewProgram(radioData) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/combine-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    world: radioData.world,
                    lmid: radioData.lmid,
                    audioSegments: convertRecordingsToAudioSegments(radioData.currentRecordings, radioData.world)
                })
            });
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('Generation API error:', error);
            return { success: false, error: error.message };
        }
    }
    
    function convertRecordingsToAudioSegments(recordings, world) {
        // Convert recordings to audio segments format
        // This is simplified - you may need to adapt based on your data structure
        return recordings.map(recording => ({
            type: 'single',
            url: recording.cloudUrl || recording.url,
            questionId: recording.questionId
        }));
    }

    /**
     * UTILITY FUNCTIONS
     */
    
    function getShareIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('ID');
    }
    
    function showError(title, message) {
        console.error(`${title}: ${message}`);
        
        // Try to show error in loading container
        updateText('.loading-message, #loading-message', `${title}: ${message}`);
        updateText('.error-title, #error-title', title);
        updateText('.error-message, #error-message', message);
        
        // Show error state
        showContainer('loading-container');
        hideContainer('player-container');
        hideContainer('generating-container');
    }
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Global API for external access
    window.RadioProgram = {
        // State control
        showLoading: showLoadingState,
        showPlayer: showPlayerState,
        showGenerating: showGeneratingState,
        
        // Updates
        updateLoadingMessage,
        updateGeneratingProgress,
        updateWorldInfo,
        
        // Utilities
        getCurrentState: () => currentState,
        getAudioPlayer: () => audioPlayer,
        formatTime
    };

    console.log('✅ Radio program loaded and ready for Webflow');

})(); 