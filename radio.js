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

    // TEMPORARY: Development mode - show all containers
    const DEVELOPMENT_MODE = true;

    /**
     * Initialize the radio page
     */
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🎵 Radio page initializing...');
        
        // Extract ShareID from URL
        const urlParams = new URLSearchParams(window.location.search);
        currentShareId = urlParams.get('ID');
        
        if (!currentShareId) {
            console.error('❌ No ShareID found in URL');
            showError('Missing ShareID in URL');
            return;
        }
        
        console.log('📻 ShareID extracted:', currentShareId);
        
        // Initialize containers
        initializeContainers();
        
        // Start loading
        showLoading();
        
        // Load radio data
        loadRadioData();
    });

    /**
     * Initialize all containers
     */
    function initializeContainers() {
        const containers = [
            'loading-container',
            'player-container', 
            'generating-container'
        ];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                if (DEVELOPMENT_MODE) {
                    // DEVELOPMENT: Show all containers
                    container.style.display = 'block';
                    container.style.marginBottom = '20px';
                    container.style.border = '2px solid #ccc';
                    container.style.padding = '20px';
                    console.log(`✅ ${containerId} found and visible for development`);
                } else {
                    // PRODUCTION: Hide all initially
                    container.style.display = 'none';
                    console.log(`✅ ${containerId} found and hidden`);
                }
            } else {
                console.warn(`❌ Container not found: ${containerId}`);
            }
        });
        
        console.log('✅ Program container initialized');
    }

    /**
     * Show loading state
     */
    function showLoading() {
        console.log('📡 Showing loading state');
        
        if (!DEVELOPMENT_MODE) {
            hideAllContainers();
            showContainer('loading-container');
        }
        
        updateWorldInfo('Loading...', 'Loading...', 'Loading...');
        updateLoadingMessage('Loading your radio program...');
        
        currentState = 'loading';
        console.log('📡 Loading state shown');
    }

    /**
     * Show player state
     */
    function showPlayer(audioUrl, radioData) {
        console.log('🎵 Showing player state');
        
        if (!DEVELOPMENT_MODE) {
            hideAllContainers();
            showContainer('player-container');
        }
        
        // Update world info
        updateWorldInfo(
            radioData.world || 'Unknown World',
            radioData.teacherName || 'Teacher',
            radioData.schoolName || 'School'
        );
        
        // Setup audio player
        setupAudioPlayer(audioUrl, radioData);
        
        currentState = 'player';
        console.log('✅ Player state shown');
    }

    /**
     * Show generating state
     */
    function showGenerating() {
        console.log('⚙️ Showing generating state');
        
        if (!DEVELOPMENT_MODE) {
            hideAllContainers();
            showContainer('generating-container');
        }
        
        updateWorldInfo(
            currentRadioData?.world || 'Unknown World',
            currentRadioData?.teacherName || 'Teacher',
            currentRadioData?.schoolName || 'School'
        );
        
        updateGeneratingStatus('Generating your radio program...', 0);
        
        currentState = 'generating';
        console.log('✅ Generating state shown');
    }

    /**
     * Hide all containers
     */
    function hideAllContainers() {
        const containers = ['loading-container', 'player-container', 'generating-container'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.style.display = 'none';
            }
        });
    }

    /**
     * Show specific container
     */
    function showContainer(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'block';
        }
    }

    /**
     * Update world info across all containers
     */
    function updateWorldInfo(worldName, teacherName, schoolName) {
        // Update world names
        const worldElements = document.querySelectorAll('.world-name, #program-world-name');
        worldElements.forEach(el => {
            if (el) el.textContent = worldName;
        });
        
        // Update teacher names
        const teacherElements = document.querySelectorAll('.program-teacher, #program-teacher');
        teacherElements.forEach(el => {
            if (el) el.textContent = teacherName;
        });
        
        // Update school names
        const schoolElements = document.querySelectorAll('.program-school, #program-school');
        schoolElements.forEach(el => {
            if (el) el.textContent = schoolName;
        });
    }

    /**
     * Update loading message
     */
    function updateLoadingMessage(message) {
        const elements = document.querySelectorAll('.loading-message, #program-status-text');
        elements.forEach(el => {
            if (el) el.textContent = message;
        });
    }

    /**
     * Update generating status
     */
    function updateGeneratingStatus(message, progress) {
        // Update status message
        const statusElements = document.querySelectorAll('.generating-status, .generating-message');
        statusElements.forEach(el => {
            if (el) el.textContent = message;
        });
        
        // Update progress bar
        const progressElements = document.querySelectorAll('.progress-bar, .progress-fill');
        progressElements.forEach(el => {
            if (el) el.style.width = `${progress}%`;
        });
        
        // Update progress text
        const progressTextElements = document.querySelectorAll('.progress-text');
        progressTextElements.forEach(el => {
            if (el) el.textContent = `${progress}% complete`;
        });
    }

    /**
     * Setup audio player
     */
    function setupAudioPlayer(audioUrl, radioData) {
        const audioElements = document.querySelectorAll('audio, .program-audio');
        
        audioElements.forEach(audio => {
            if (audio) {
                audio.src = audioUrl;
                audio.load();
                
                // Update time display on time update
                audio.addEventListener('timeupdate', function() {
                    updateTimeDisplay(audio.currentTime, audio.duration);
                });
                
                // Update recording count
                updateRecordingCount(radioData.recordingCount || 0);
            }
        });
    }

    /**
     * Update time display
     */
    function updateTimeDisplay(currentTime, duration) {
        const timeElements = document.querySelectorAll('.time-display');
        
        if (isNaN(currentTime) || isNaN(duration)) return;
        
        const current = formatTime(currentTime);
        const total = formatTime(duration);
        
        timeElements.forEach(el => {
            if (el) el.textContent = `${current} / ${total}`;
        });
    }

    /**
     * Update recording count
     */
    function updateRecordingCount(count) {
        const countElements = document.querySelectorAll('.recording-count');
        countElements.forEach(el => {
            if (el) el.textContent = `${count} recordings`;
        });
    }

    /**
     * Format time in MM:SS
     */
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Load radio data from API
     */
    async function loadRadioData() {
        try {
            updateLoadingMessage('Fetching radio data...');
            
            const response = await fetch(`${API_BASE_URL}/api/get-radio-data?shareId=${currentShareId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📻 Radio data fetched:', data);
            
            currentRadioData = data;
            
            if (data.success) {
                if (data.lastManifest?.programUrl) {
                    // Program exists, show player
                    showExistingProgram(data);
                } else {
                    // Need to generate program
                    generateNewProgram(data);
                }
            } else {
                throw new Error(data.error || 'Failed to fetch radio data');
            }
            
        } catch (error) {
            console.error('❌ Error loading radio data:', error);
            showError(`Failed to load radio data: ${error.message}`);
        }
    }

    /**
     * Show existing program
     */
    function showExistingProgram(data) {
        console.log('✅ Showing existing program');
        
        const audioUrl = data.lastManifest.programUrl;
        const radioData = {
            world: data.world,
            teacherName: 'Teacher & The Kids',
            schoolName: 'from School',
            recordingCount: data.currentRecordings?.length || 0
        };
        
        showPlayer(audioUrl, radioData);
    }

    /**
     * Generate new program
     */
    async function generateNewProgram(data) {
        console.log('⚙️ Generating new program');
        
        showGenerating();
        
        try {
            // Simulate generation progress
            const steps = [
                { message: 'Preparing audio segments...', progress: 20 },
                { message: 'Mixing with background music...', progress: 50 },
                { message: 'Adding intro and outro...', progress: 80 },
                { message: 'Finalizing radio program...', progress: 95 }
            ];
            
            for (const step of steps) {
                updateGeneratingStatus(step.message, step.progress);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Call combine API
            const combineResponse = await fetch(`${API_BASE_URL}/api/combine-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lmid: data.lmid,
                    world: data.world
                })
            });
            
            if (!combineResponse.ok) {
                throw new Error('Failed to generate radio program');
            }
            
            const combineResult = await combineResponse.json();
            updateGeneratingStatus('Program generated successfully!', 100);
            
            // Wait a moment then show player
            setTimeout(() => {
                showExistingProgram({
                    ...data,
                    lastManifest: { programUrl: combineResult.programUrl }
                });
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error generating program:', error);
            showError(`Failed to generate program: ${error.message}`);
        }
    }

    /**
     * Show error state
     */
    function showError(message) {
        updateLoadingMessage(`Error: ${message}`);
        console.error('💥 Radio error:', message);
    }

    // Make functions available globally for testing
    window.RadioProgram = {
        showLoading,
        showPlayer,
        showGenerating,
        updateLoadingMessage,
        updateGeneratingStatus,
        loadRadioData
    };

})();

console.log('✅ Radio program loaded and ready for Webflow'); 