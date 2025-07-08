/**
 * radio.js - Single Container Radio Program Page for Webflow Integration
 * 
 * PURPOSE: Controls ONE container with dynamic state elements
 * STRUCTURE:
 * 1. Static header: "Little Microphones" + world name
 * 2. Static teacher info: "John Teacher & The Kids from Elementary X" 
 * 3. Dynamic state element: Loading/Generating/Player
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

    // Fun generating messages
    const GENERATING_MESSAGES = [
        "Mixing magical audio potions...",
        "Teaching robots to speak kid language...",
        "Sprinkling digital fairy dust...",
        "Warming up the radio transmitters...",
        "Collecting voice sparkles...",
        "Tuning the imagination frequencies...",
        "Assembling story molecules...",
        "Charging up the fun-o-meter...",
        "Downloading giggles from the cloud...",
        "Activating the awesome sauce...",
        "Brewing a batch of audio magic...",
        "Gathering rainbow sound waves...",
        "Polishing the voice crystals...",
        "Spinning the wheel of wonder...",
        "Unleashing the creativity dragons..."
    ];
    
    // Current message index
    let currentMessageIndex = 0;
    
    /**
     * Convert recordings to audioSegments format for combine-audio API
     * This is a simplified version of convertRecordingsToAudioSegments from audio-utils.js
     */
    function convertRecordingsToAudioSegments(recordings, world) {
        const audioSegments = [];
        
        // Group recordings by questionId
        const recordingsByQuestion = {};
        recordings.forEach(recording => {
            // Extract questionId from filename
            let questionId = '1'; // default
            if (recording.filename) {
                const match = recording.filename.match(/question_(\d+)/);
                if (match) {
                    questionId = match[1];
                }
            }
            
            if (!recordingsByQuestion[questionId]) {
                recordingsByQuestion[questionId] = [];
            }
            recordingsByQuestion[questionId].push(recording);
        });
        
        // Sort question IDs numerically
        const sortedQuestionIds = Object.keys(recordingsByQuestion).sort((a, b) => parseInt(a) - parseInt(b));
        
        // 1. Add intro
        const introTimestamp = Date.now();
        audioSegments.push({
            type: 'single',
            url: `https://little-microphones.b-cdn.net/audio/other/intro.mp3?t=${introTimestamp}`
        });
        
        // 2. Add questions and answers in order
        sortedQuestionIds.forEach(questionId => {
            const questionRecordings = recordingsByQuestion[questionId];
            
            // Add question prompt
            const cacheBustTimestamp = Date.now() + Math.random();
            audioSegments.push({
                type: 'single',
                url: `https://little-microphones.b-cdn.net/audio/${world}/${world}-QID${questionId}.mp3?t=${cacheBustTimestamp}`
            });
            
            // Sort answers by timestamp (first recorded = first played)
            const sortedAnswers = questionRecordings.sort((a, b) => {
                // Extract timestamp from filename
                const getTimestamp = (filename) => {
                    const match = filename?.match(/tm_(\d+)/);
                    return match ? parseInt(match[1]) : 0;
                };
                return getTimestamp(a.filename) - getTimestamp(b.filename);
            });
            
            // Combine answers with background music
            const backgroundTimestamp = Date.now() + Math.random();
            audioSegments.push({
                type: 'combine_with_background',
                answerUrls: sortedAnswers.map(recording => recording.url || recording.cloudUrl),
                backgroundUrl: `https://little-microphones.b-cdn.net/audio/other/monkeys.mp3?t=${backgroundTimestamp}`,
                questionId: questionId
            });
        });
        
        // 3. Add outro
        const outroTimestamp = Date.now() + 1;
        audioSegments.push({
            type: 'single',
            url: `https://little-microphones.b-cdn.net/audio/other/outro.mp3?t=${outroTimestamp}`
        });
        
        return audioSegments;
    }

    /**
     * Initialize the radio page
     */
    document.addEventListener('DOMContentLoaded', function() {
        // Extract ShareID from URL
        const urlParams = new URLSearchParams(window.location.search);
        currentShareId = urlParams.get('ID');
        
        if (!currentShareId) {
            showError('Missing ShareID in URL');
            return;
        }
        
        // Check if required elements exist
        if (!checkRequiredElements()) {
            showError('Page setup incomplete - missing required elements');
            return;
        }
        
        // Start loading - immediately load world info and teacher data
        showLoadingState();
        loadInitialData();
    });

    /**
     * Load initial data (world info and teacher data) as fast as possible
     */
    async function loadInitialData() {
        try {
            updateLoadingMessage('Getting world information...');
            
            // Step 1: Get world info quickly (fastest API)
            const worldInfo = await getWorldInfo(currentShareId);
            
            // Immediately update world name and background
            updateWorldName(worldInfo.world);
            setWorldBackground(worldInfo.world, worldInfo.backgroundUrl);
            
            // Step 2: Get teacher data in parallel (while world is loading visually)
            updateLoadingMessage('Getting teacher information...');
            try {
                const teacherData = await getTeacherData(worldInfo.lmid);
                updateTeacherInfo(teacherData.teacherName, teacherData.schoolName);
            } catch (teacherError) {
                console.warn('Could not fetch teacher data:', teacherError);
                // Use fallback values
                updateTeacherInfo('Teacher', 'School');
            }
            
            // Step 3: Now load full radio data (audio, recordings, etc.)
            updateLoadingMessage('Loading your radio program...');
            await loadRadioData();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            showError(`Failed to load initial data: ${error.message}`);
        }
    }

    /**
     * Get world info quickly from ShareID
     */
    async function getWorldInfo(shareId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/get-world-info?shareId=${shareId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                return {
                    world: data.world,
                    lmid: data.lmid,
                    backgroundUrl: data.backgroundUrl
                };
        } else {
                throw new Error(data.error || 'Failed to fetch world info');
            }
        } catch (error) {
            console.error('Error fetching world info:', error);
            throw error;
        }
    }

    /**
     * Check if all required elements exist on the page
     */
    function checkRequiredElements() {
        const requiredElements = [
            'loading-state',
            'generating-state', 
            'player-state',
            'world-name'
        ];
        
        let allFound = true;
        requiredElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (!element) {
                console.error(`Required element not found: ${elementId}`);
                allFound = false;
            }
        });
        
        return allFound;
    }

    /**
     * Show loading state
     */
    function showLoadingState() {
        hideAllStates();
        showState('loading-state');
        
        updateLoadingMessage('Loading your radio program...');
        currentState = 'loading';
    }

    /**
     * Show player state
     */
    function showPlayerState(audioUrl, radioData) {
        hideAllStates();
        showState('player-state');
        
        // Setup audio player
        setupAudioPlayer(audioUrl, radioData);
        
        currentState = 'player';
    }

    /**
     * Show generating state
     */
    function showGeneratingState() {
        hideAllStates();
        showState('generating-state');
        
        // Start looped generating messages
        startGeneratingMessages();
        
        currentState = 'generating';
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
        updateGeneratingMessage(GENERATING_MESSAGES[messageIndex]);
        
        // Loop through messages every 2 seconds
        generatingInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % GENERATING_MESSAGES.length;
            updateGeneratingMessage(GENERATING_MESSAGES[messageIndex]);
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
     * Hide all state elements
     */
    function hideAllStates() {
        const states = ['loading-state', 'generating-state', 'player-state'];
        states.forEach(stateId => {
            const element = document.getElementById(stateId);
            if (element) {
                element.style.display = 'none';
            }
        });
}

/**
     * Show specific state element
     */
    function showState(stateId) {
        const element = document.getElementById(stateId);
        if (element) {
            element.style.display = 'block';
        }
    }

    /**
     * Update world name in header
     */
    function updateWorldName(worldName) {
        const formattedWorld = window.LM_CONFIG?.UTILS?.formatWorldName(worldName) || 
                              (worldName ? worldName.charAt(0).toUpperCase() + worldName.slice(1).replace(/-/g, ' ') : 'Loading...');
        
        const worldElement = document.getElementById('world-name');
        if (worldElement) {
            worldElement.textContent = formattedWorld;
    }
}

/**
     * Update teacher and school info
     * Now searches for ALL elements with these IDs, not just inside container
     */
    function updateTeacherInfo(teacherName, schoolName) {
        // Find ALL elements with teacher-full-name ID (może być wiele)
        const teacherElements = document.querySelectorAll('#teacher-full-name');
        teacherElements.forEach(element => {
            if (element && teacherName) {
                element.textContent = teacherName;
            }
        });
        
        // Find ALL elements with school-name ID (może być wiele)
        const schoolElements = document.querySelectorAll('#school-name');
        schoolElements.forEach(element => {
            if (element && schoolName) {
                element.textContent = schoolName;
            }
    });
}

/**
     * Set world background image - enhanced to use backgroundUrl from API
     */
    function setWorldBackground(world, backgroundUrl) {
    if (!world) return;
    
        const worldBg = document.getElementById('world-bg');
        const programContainer = document.querySelector('.program-container');
        
        // Use backgroundUrl from API first, then fallback to config
        let imageUrl = backgroundUrl;
        if (!imageUrl) {
            imageUrl = window.LM_CONFIG?.WORLD_IMAGES?.[world];
        }
        
        if (imageUrl) {
            // Set on world-bg element if it exists
            if (worldBg) {
                worldBg.style.backgroundImage = `url('${imageUrl}')`;
                worldBg.style.backgroundSize = 'cover';
                worldBg.style.backgroundPosition = 'center';
            }
            
            // Also set on program-container if it has the class
            if (programContainer) {
                programContainer.style.backgroundImage = `url('${imageUrl}')`;
                programContainer.style.backgroundSize = 'cover';
                programContainer.style.backgroundPosition = 'center';
            }
        }
    }

    /**
     * Update loading message
     */
    function updateLoadingMessage(message) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = message;
    }
}

/**
     * Update generating message
     */
    function updateGeneratingMessage(message) {
        const generatingText = document.getElementById('generating-text');
        if (generatingText) {
            generatingText.textContent = message;
        }
    }

    /**
     * Setup audio player exactly like the /rp page
     */
    function setupAudioPlayer(audioUrl, radioData) {
        // Get the player container
        const playerContainer = document.getElementById('player-state');
        if (!playerContainer) {
            console.error('Player container not found');
            return;
        }

        // Create custom audio player HTML exactly like /rp page with inline styles
        playerContainer.innerHTML = `
            <style>
                .audio-player-container {
                    background: rgba(255,255,255,0.9);
                    border-radius: 12px;
                    padding: 16px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                
                .custom-audio-controls {
        display: flex;
        align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                
                .play-btn {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    border: none;
                    background: #007ace;
                    color: white;
                    cursor: pointer;
        display: flex;
                    align-items: center;
        justify-content: center;
                    font-size: 16px;
                    transition: background 0.2s;
                }
                
                .play-btn:hover {
                    background: #005a9e;
                }
                
                .progress-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
        }
        
        .progress-bar {
            width: 100%;
                    height: 6px;
                    background: #e0e0e0;
                    border-radius: 3px;
                    cursor: pointer;
                    position: relative;
        }
        
        .progress-fill {
            height: 100%;
                    background: #007ace;
                    border-radius: 3px;
            width: 0%;
                    transition: width 0.1s;
                }
                
                .time-display {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    color: #666;
                }
                
                .volume-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .volume-btn {
                    background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
                    padding: 4px;
                }
                
                .volume-slider {
                    width: 60px;
                    height: 4px;
                    background: #e0e0e0;
                    outline: none;
                    border-radius: 2px;
                    cursor: pointer;
                }
                
                .volume-slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 12px;
                    height: 12px;
                    background: #007ace;
                    border-radius: 50%;
                    cursor: pointer;
                }
            </style>
            <div class="audio-player-container">
                <audio id="radio-audio" preload="metadata" style="display: none;">
                    <source src="${audioUrl}" type="audio/mpeg">
                    <source src="${audioUrl}" type="audio/mp3">
                </audio>
                <div class="custom-audio-controls">
                    <button id="play-pause-btn" class="play-btn">
                        <span class="play-icon">▶</span>
                        <span class="pause-icon" style="display: none;">⏸</span>
                    </button>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <div class="time-display">
                            <span id="current-time">0:00</span>
                            <span class="separator">/</span>
                            <span id="total-time">0:00</span>
                        </div>
                    </div>
                    <div class="volume-container">
                        <button id="volume-btn" class="volume-btn">🔊</button>
                        <input type="range" id="volume-slider" class="volume-slider" min="0" max="1" step="0.1" value="1">
                    </div>
                </div>
            </div>
        `;

        // Setup audio player functionality
        setupCustomAudioPlayer(audioUrl);
    }

    /**
     * Setup custom audio player functionality exactly like /rp page
     */
    function setupCustomAudioPlayer(audioUrl) {
        audioPlayer = document.getElementById('radio-audio');
        const playPauseBtn = document.getElementById('play-pause-btn');
        const playIcon = document.querySelector('.play-icon');
        const pauseIcon = document.querySelector('.pause-icon');
        const progressFill = document.getElementById('progress-fill');
        const currentTimeEl = document.getElementById('current-time');
        const totalTimeEl = document.getElementById('total-time');
        const volumeBtn = document.getElementById('volume-btn');
        const volumeSlider = document.getElementById('volume-slider');
        const progressContainer = document.querySelector('.progress-bar');

        if (!audioPlayer) return;

        // Play/Pause functionality
        playPauseBtn.addEventListener('click', function() {
            if (audioPlayer.paused) {
                audioPlayer.play();
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'inline';
            } else {
                audioPlayer.pause();
                playIcon.style.display = 'inline';
                pauseIcon.style.display = 'none';
            }
        });

        // Time update
        audioPlayer.addEventListener('timeupdate', function() {
            const currentTime = audioPlayer.currentTime;
            const duration = audioPlayer.duration;

            if (!isNaN(duration)) {
                const progress = (currentTime / duration) * 100;
                progressFill.style.width = `${progress}%`;
                
                currentTimeEl.textContent = formatTime(currentTime);
                totalTimeEl.textContent = formatTime(duration);
            }
        });

        // Progress bar click to seek
        if (progressContainer) {
            progressContainer.addEventListener('click', function(e) {
                const rect = progressContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                const clickPercent = clickX / width;
                
                if (!isNaN(audioPlayer.duration)) {
                    audioPlayer.currentTime = clickPercent * audioPlayer.duration;
                }
            });
        }

        // Volume control
        volumeSlider.addEventListener('input', function() {
            audioPlayer.volume = volumeSlider.value;
            updateVolumeIcon(volumeSlider.value);
        });

        volumeBtn.addEventListener('click', function() {
            if (audioPlayer.volume > 0) {
                audioPlayer.volume = 0;
                volumeSlider.value = 0;
            } else {
                audioPlayer.volume = 1;
                volumeSlider.value = 1;
            }
            updateVolumeIcon(audioPlayer.volume);
        });

        // Update volume icon based on volume level
        function updateVolumeIcon(volume) {
            if (volume === 0) {
                volumeBtn.textContent = '🔇';
            } else if (volume < 0.5) {
                volumeBtn.textContent = '🔉';
            } else {
                volumeBtn.textContent = '🔊';
            }
        }

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
     * Load radio data from API - now simplified since we already have world/lmid
     */
    async function loadRadioData() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/get-radio-data?shareId=${currentShareId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            currentRadioData = data;
            
            if (data.success) {
                // Check if new program generation is needed (API tells us)
                if (data.needsNewProgram === true) {
                    console.log('🔄 New program generation needed - files have changed');
                    generateNewProgram(data);
                } else if (data.lastManifest?.programUrl) {
                    console.log('✅ Using existing program - no changes detected');
                    showExistingProgram(data);
                } else {
                    console.log('⚙️ No existing program found - generating first program');
                    generateNewProgram(data);
                }
            } else {
                throw new Error(data.error || 'Failed to fetch radio data');
            }
            
        } catch (error) {
            console.error('Error loading radio data:', error);
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
            recordingCount: data.currentRecordings?.length || 0
        };
        
        showPlayerState(audioUrl, radioData);
    }

    /**
     * Generate new program
     */
    async function generateNewProgram(data) {
        console.log('⚙️ Generating new program');
        
        showGeneratingState();
        
        try {
            // Convert recordings to audioSegments format
            const audioSegments = convertRecordingsToAudioSegments(data.currentRecordings, data.world);

            // Call combine API
            const combineResponse = await fetch(`${API_BASE_URL}/api/combine-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lmid: data.lmid,
                    world: data.world,
                    audioSegments: audioSegments
                })
            });
            
            if (!combineResponse.ok) {
                throw new Error('Failed to generate radio program');
            }
            
            const combineResult = await combineResponse.json();
            
            // Stop generating messages
            stopGeneratingMessages();
            updateGeneratingMessage('Program generated successfully!');
            
            // Wait a moment then show player
            setTimeout(() => {
                showExistingProgram({
                    ...data,
                    lastManifest: { programUrl: combineResult.url || combineResult.programUrl }
                });
            }, 1000);
            
        } catch (error) {
            console.error('Error generating program:', error);
            stopGeneratingMessages();
            showError(`Failed to generate program: ${error.message}`);
        }
    }

    /**
     * Get teacher data from API - NAPRAWIONE
     */
    async function getTeacherData(lmid) {
        try {
            console.log(`👨‍🏫 Fetching teacher data for LMID: ${lmid}`);
            const response = await fetch(`${API_BASE_URL}/api/get-teacher-data?lmid=${lmid}`);
            
            if (!response.ok) {
                console.warn(`Failed to fetch teacher data: ${response.status} ${response.statusText}`);
                return {
                    teacherName: 'Teacher & The Kids',
                    schoolName: 'from School'
                };
            }
            
            const data = await response.json();
            console.log('👨‍🏫 Teacher data response:', data);
            
            if (data.success) {
                // handleApiRequest puts data directly in response object via Object.assign
                return {
                    teacherName: data.teacherName || 'Teacher & The Kids',
                    schoolName: data.schoolName || 'from School'
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
        showLoadingState,
        showPlayerState,
        showGeneratingState,
        updateLoadingMessage,
        updateGeneratingMessage,
        loadRadioData,
        stopGeneratingMessages
    };

})();

console.log('✅ Radio program loaded and ready for Webflow'); 