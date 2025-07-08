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
     * Set world background video - enhanced to use video backgrounds from API with image fallback
     */
    function setWorldBackground(world, backgroundUrl) {
        if (!world) return;
        
        console.log(`🎬 Setting background for world: ${world}, URL: ${backgroundUrl}`);
        
        const worldBg = document.getElementById('world-bg');
        const programContainer = document.querySelector('.program-container');
        
        // Use backgroundUrl from API first, then fallback to config
        let videoUrl = backgroundUrl;
        if (!videoUrl) {
            videoUrl = window.LM_CONFIG?.WORLD_VIDEOS?.[world];
            console.log(`📹 Using config video URL: ${videoUrl}`);
        }
        
        // Try video first
        if (videoUrl && videoUrl.endsWith('.mp4')) {
            console.log(`🎥 Setting up video background: ${videoUrl}`);
            
            // Create or update video element for world-bg
            if (worldBg) {
                setupVideoBackground(worldBg, videoUrl, world);
            }
            
            // Create or update video element for program-container
            if (programContainer) {
                setupVideoBackground(programContainer, videoUrl, world);
            }
        } else {
            // Fallback to image
            console.log(`🖼️ Falling back to image background for ${world}`);
            const imageUrl = backgroundUrl || window.LM_CONFIG?.WORLD_IMAGES?.[world];
            
            if (imageUrl) {
                if (worldBg) {
                    worldBg.style.backgroundImage = `url('${imageUrl}')`;
                    worldBg.style.backgroundSize = 'cover';
                    worldBg.style.backgroundPosition = 'center';
                }
                
                if (programContainer) {
                    programContainer.style.backgroundImage = `url('${imageUrl}')`;
                    programContainer.style.backgroundSize = 'cover';
                    programContainer.style.backgroundPosition = 'center';
                }
            }
        }
    }

    /**
     * Setup video background for an element with image fallback
     */
    function setupVideoBackground(container, videoUrl, world) {
        console.log(`🎬 Setting up video for container:`, container.id || container.className, `URL: ${videoUrl}`);
        
        // Remove existing video if any
        const existingVideo = container.querySelector('.world-bg-video');
        if (existingVideo) {
            existingVideo.remove();
        }
        
        // Clear background image
        container.style.backgroundImage = 'none';
        
        // Create video element
        const video = document.createElement('video');
        video.className = 'world-bg-video';
        video.src = videoUrl;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        
        // Style the video to cover the container
        video.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: 1;
            pointer-events: none;
        `;
        
        // Ensure container has relative positioning
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        
        // Ensure container content is above video
        container.style.zIndex = '1';
        
        // Add video to container
        container.appendChild(video);
        
        // Ensure all child elements are above the video
        const children = container.children;
        for (let i = 0; i < children.length; i++) {
            if (children[i] !== video && !children[i].classList.contains('program-container-shadow')) {
                children[i].style.position = 'relative';
                children[i].style.zIndex = '33';
            }
        }
        
        // Handle video load errors - fallback to image
        video.addEventListener('error', () => {
            console.warn(`❌ Failed to load video background: ${videoUrl}, falling back to image`);
            video.remove();
            
            // Fallback to image
            const imageUrl = window.LM_CONFIG?.WORLD_IMAGES?.[world];
            if (imageUrl) {
                console.log(`🖼️ Using image fallback: ${imageUrl}`);
                container.style.backgroundImage = `url('${imageUrl}')`;
                container.style.backgroundSize = 'cover';
                container.style.backgroundPosition = 'center';
            } else {
                container.style.backgroundColor = '#f0f0f0';
            }
        });
        
        // Ensure video starts playing
        video.addEventListener('loadeddata', () => {
            console.log(`✅ Video loaded successfully: ${videoUrl}`);
            video.play().catch(error => {
                console.warn('⚠️ Video autoplay failed:', error);
                // Video will still be visible as first frame
            });
        });
        
        // Force play attempt after a short delay
        setTimeout(() => {
            if (video.paused) {
                video.play().catch(error => {
                    console.warn('⚠️ Delayed video play failed:', error);
                });
            }
        }, 500);
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
     * Setup audio player using RecordingUI module from recording-ui.js
     */
    function setupAudioPlayer(audioUrl, radioData) {
        // Get the player container
        const playerContainer = document.getElementById('player-state');
        if (!playerContainer) {
            console.error('Player container not found');
            return;
        }

        // Check if RecordingUI is available
        if (!window.RecordingUI || !window.RecordingUI.createRecordingElement) {
            console.error('RecordingUI module not loaded. Make sure recording-ui.js is included.');
            // Fallback to simple audio element
            playerContainer.innerHTML = `
                <div style="background: rgba(255,255,255,0.9); border-radius: 12px; padding: 16px; text-align: center;">
                    <audio controls style="width: 100%;" preload="metadata">
                        <source src="${audioUrl}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            `;
            return;
        }

        // Clear the container
        playerContainer.innerHTML = '';

        // Create fake recording data for the radio program
        const recordingData = { 
            id: 'radio-program', 
            url: audioUrl,
            uploadStatus: 'uploaded'
        };

        // Functions required by createRecordingElement
        const getAudioSource = async () => audioUrl;
        const deleteRecording = () => {}; // No delete on radio page
        const dispatchUploadStatusEvent = () => {}; // No upload status on radio page

        // Create the recording element using RecordingUI
        window.RecordingUI.createRecordingElement(
            recordingData,
            'radio-program',
            getAudioSource,
            deleteRecording,
            dispatchUploadStatusEvent,
            {
                showDeleteButton: false,
                showUploadIcon: false
            }
        ).then(playerElement => {
            if (playerElement) {
                // Add some styling to make it fit better in the radio context
                const playerDiv = playerElement.querySelector('div[style*="background: white"]');
                if (playerDiv) {
                    playerDiv.style.background = '#ffffff';
                    playerDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    playerDiv.style.width = '100%';
                }
                
                playerContainer.appendChild(playerElement);
                
                // Store reference to audio element
                audioPlayer = playerElement.querySelector('audio');
                
                console.log('✅ Radio player created using RecordingUI');
            } else {
                console.error('Failed to create player element');
            }
        }).catch(error => {
            console.error('Error creating RecordingUI player:', error);
            // Fallback to simple audio element
            playerContainer.innerHTML = `
                <div style="background: rgba(255,255,255,0.9); border-radius: 12px; padding: 16px; text-align: center;">
                    <audio controls style="width: 100%;" preload="metadata">
                        <source src="${audioUrl}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            `;
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