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
    let generatingInterval = null;

    // API Configuration
    const API_BASE_URL = window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app';

    // TEMPORARY: Development mode - show all containers
    const DEVELOPMENT_MODE = true;

    // Fun generating messages that loop
    const GENERATING_MESSAGES = [
        'Mixing magical audio potions...',
        'Teaching robots to speak kid language...',
        'Sprinkling digital fairy dust...',
        'Convincing microphones to cooperate...',
        'Assembling audio LEGO blocks...',
        'Training AI to understand giggles...',
        'Weaving sound waves together...',
        'Asking the audio elves for help...',
        'Translating excitement into radio waves...',
        'Collecting scattered sound particles...',
        'Brewing the perfect audio recipe...',
        'Negotiating with stubborn sound files...',
        'Building bridges between recordings...',
        'Summoning the radio program spirits...',
        'Organizing a symphony of voices...'
    ];

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
        
        updateWorldInfo('Loading...', '', '');
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
            radioData.teacherName || 'Teacher & The Kids',
            radioData.schoolName || 'from School'
        );
        
        // Setup audio player
        setupAudioPlayer(audioUrl, radioData);
        
        // Set world background
        setWorldBackground(radioData.world);
        
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
            '', // Don't show teacher during generating
            ''  // Don't show school during generating
        );
        
        // Start looped generating messages
        startGeneratingMessages();
        
        // Set world background
        setWorldBackground(currentRadioData?.world);
        
        currentState = 'generating';
        console.log('✅ Generating state shown');
    }

    /**
     * Start looped generating messages
     */
    function startGeneratingMessages() {
        let messageIndex = 0;
        
        // Clear any existing interval
        if (generatingInterval) {
            clearInterval(generatingInterval);
        }
        
        // Show first message immediately
        updateGeneratingStatus(GENERATING_MESSAGES[messageIndex], 0);
        
        // Loop through messages every 2 seconds
        generatingInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % GENERATING_MESSAGES.length;
            updateGeneratingStatus(GENERATING_MESSAGES[messageIndex], Math.random() * 90 + 5); // Random progress 5-95%
        }, 2000);
    }

    /**
     * Stop generating messages
     */
    function stopGeneratingMessages() {
        if (generatingInterval) {
            clearInterval(generatingInterval);
            generatingInterval = null;
        }
    }

    /**
     * Set world background image
     */
    function setWorldBackground(world) {
        if (!world) return;
        
        const worldBg = document.getElementById('world-bg');
        const programContainer = document.querySelector('.program-container');
        
        // Get background URL from config
        const backgroundUrl = window.LM_CONFIG?.WORLD_IMAGES?.[world];
        
        if (backgroundUrl) {
            // Set on world-bg element if it exists
            if (worldBg) {
                worldBg.style.backgroundImage = `url('${backgroundUrl}')`;
                worldBg.style.backgroundSize = 'cover';
                worldBg.style.backgroundPosition = 'center';
                console.log(`🎨 Set world background for ${world}`);
            }
            
            // Also set on program-container if it has the class
            if (programContainer) {
                programContainer.style.backgroundImage = `url('${backgroundUrl}')`;
                programContainer.style.backgroundSize = 'cover';
                programContainer.style.backgroundPosition = 'center';
            }
        }
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
        // Format world name properly
        const formattedWorld = window.LM_CONFIG?.UTILS?.formatWorldName(worldName) || 
                              (worldName ? worldName.charAt(0).toUpperCase() + worldName.slice(1).replace(/-/g, ' ') : 'Loading...');
        
        // Update world names
        const worldElements = document.querySelectorAll('.world-name, #program-world-name');
        worldElements.forEach(el => {
            if (el) el.textContent = formattedWorld;
        });
        
        // Update teacher names (only if provided)
        if (teacherName) {
            const teacherElements = document.querySelectorAll('.program-teacher, #program-teacher');
            teacherElements.forEach(el => {
                if (el) el.textContent = teacherName;
            });
        }
        
        // Update school names (only if provided)
        if (schoolName) {
            const schoolElements = document.querySelectorAll('.program-school, #program-school');
            schoolElements.forEach(el => {
                if (el) el.textContent = schoolName;
            });
        }
        
        // Remove duplicate teacher/school elements that are outside containers
        removeDuplicateElements();
    }

    /**
     * Remove duplicate teacher/school elements outside containers
     */
    function removeDuplicateElements() {
        // Hide the duplicate elements with IDs
        const teacherFullName = document.getElementById('teacher-full-name');
        const schoolName = document.getElementById('school-name');
        
        if (teacherFullName) {
            teacherFullName.style.display = 'none';
        }
        
        if (schoolName) {
            schoolName.style.display = 'none';
        }
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
        
        // Update progress text - remove "% complete" since messages are fun
        const progressTextElements = document.querySelectorAll('.progress-text');
        progressTextElements.forEach(el => {
            if (el) el.textContent = `${Math.round(progress)}%`;
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
        
        // Get teacher data from memberstack if available
        getTeacherData(data.lmid).then(teacherData => {
            const radioData = {
                world: data.world,
                teacherName: teacherData.teacherName || 'Teacher & The Kids',
                schoolName: teacherData.schoolName || 'from School',
                recordingCount: data.currentRecordings?.length || 0
            };
            
            showPlayer(audioUrl, radioData);
        });
    }

    /**
     * Generate new program
     */
    async function generateNewProgram(data) {
        console.log('⚙️ Generating new program');
        
        showGenerating();
        
        try {
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
            
            // Stop generating messages
            stopGeneratingMessages();
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
            stopGeneratingMessages();
            showError(`Failed to generate program: ${error.message}`);
        }
    }

    /**
     * Get teacher data from Memberstack
     */
    async function getTeacherData(lmid) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/get-teacher-data?lmid=${lmid}`);
            
            if (!response.ok) {
                console.warn('Failed to fetch teacher data:', response.status);
                return {
                    teacherName: 'Teacher & The Kids',
                    schoolName: 'from School'
                };
            }
            
            const data = await response.json();
            
            if (data.success) {
                return {
                    teacherName: data.teacherName,
                    schoolName: data.schoolName
                };
            } else {
                console.warn('Teacher data API returned error:', data.error);
                return {
                    teacherName: 'Teacher & The Kids',
                    schoolName: 'from School'
                };
            }
        } catch (error) {
            console.warn('Could not fetch teacher data:', error);
            return {
                teacherName: 'Teacher & The Kids',
                schoolName: 'from School'
            };
        }
    }

    /**
     * Show error state
     */
    function showError(message) {
        updateLoadingMessage(`Error: ${message}`);
        console.error('💥 Radio error:', message);
        
        // Stop generating messages if running
        stopGeneratingMessages();
    }

    // Make functions available globally for testing
    window.RadioProgram = {
        showLoading,
        showPlayer,
        showGenerating,
        updateLoadingMessage,
        updateGeneratingStatus,
        loadRadioData,
        stopGeneratingMessages
    };

})();

console.log('✅ Radio program loaded and ready for Webflow'); 