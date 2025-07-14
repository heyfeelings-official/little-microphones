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
    let currentUserRole = null;

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
    
    // --- User Role Detection Functions ---
    
    /**
     * Detect user role from Memberstack plan
     * @returns {Promise<string>} User role ('parent', 'teacher', or 'therapist')
     */
    async function detectUserRole() {
        if (currentUserRole) {
            return currentUserRole;
        }
        
        try {
            const memberstack = window.$memberstackDom;
            if (!memberstack) {
                console.warn('Memberstack not available, defaulting to teacher role');
                currentUserRole = 'teacher';
                return currentUserRole;
            }
            
            const { data: memberData } = await memberstack.getCurrentMember();
            if (!memberData) {
                console.warn('No member data available, defaulting to teacher role');
                currentUserRole = 'teacher';
                return currentUserRole;
            }
            
            // Detect role based on Memberstack plan using configuration
            const planConnections = memberData.planConnections || [];
            const activePlans = planConnections.filter(conn => conn.active && conn.status === 'ACTIVE');
            const activePlanIds = activePlans.map(plan => plan.planId);
            
            // Check user role based on plan type (specific order matters)
            const hasParentPlan = activePlanIds.some(planId => 
                window.LM_CONFIG?.PLAN_HELPERS?.isParentPlan(planId)
            );
            
            const hasTherapistPlan = activePlanIds.some(planId => 
                window.LM_CONFIG?.PLAN_HELPERS?.isTherapistPlan(planId)
            );
            
            const hasEducatorPlan = activePlanIds.some(planId => 
                window.LM_CONFIG?.PLAN_HELPERS?.isEducatorPlan(planId)
            );
            
            if (hasParentPlan) {
                currentUserRole = 'parent';
            } else if (hasTherapistPlan) {
                currentUserRole = 'therapist';
            } else if (hasEducatorPlan) {
                currentUserRole = 'teacher';
            } else {
                // Fallback: check metadata for explicit role override
                const metaRole = memberData.metaData?.role;
                if (metaRole === 'parent' || metaRole === 'teacher' || metaRole === 'therapist') {
                    currentUserRole = metaRole;
                    console.log(`User role detected from metadata override: ${currentUserRole}`);
                } else {
                    console.warn(`No recognizable plan found in: [${activePlanIds.join(', ')}], defaulting to teacher role`);
                    currentUserRole = 'teacher';
                }
            }
            
            console.log(`User role detected: ${currentUserRole} (active plans: [${activePlanIds.join(', ')}])`);
            return currentUserRole;
        } catch (error) {
            console.error('Error detecting user role:', error);
            currentUserRole = 'teacher';
            return currentUserRole;
        }
    }

    /**
     * Get current user's Member ID for parent recordings
     * @returns {Promise<string|null>} Member ID or null
     */
    async function getCurrentMemberId() {
        try {
            const memberstack = window.$memberstackDom;
            if (!memberstack) {
                return null;
            }
            
            const { data: memberData } = await memberstack.getCurrentMember();
            return memberData?.id || null;
        } catch (error) {
            console.error('Error getting member ID:', error);
            return null;
        }
    }
    
    /**
     * Convert recordings to audioSegments format for combine-audio API
     * Now supports separate generation for kids and parent recordings
     * @param {Array} recordings - Array of recording objects
     * @param {string} world - World name
     * @param {string} programType - 'kids' or 'parent' or 'both'
     * @returns {Object} Audio segments object with kids and/or parent programs
     */
    function convertRecordingsToAudioSegments(recordings, world, programType = 'both') {
        // Separate recordings by type
        const kidsRecordings = recordings.filter(rec => 
            rec.filename && rec.filename.startsWith('kids-world_')
        );
        const parentRecordings = recordings.filter(rec => 
            rec.filename && rec.filename.includes('parent_')
        );
        
        const result = {};
        
        // Generate kids program if requested and recordings exist
        if ((programType === 'kids' || programType === 'both') && kidsRecordings.length > 0) {
            result.kids = generateAudioSegmentsForType(kidsRecordings, world, 'kids');
        }
        
        // Generate parent program if requested and recordings exist
        if ((programType === 'parent' || programType === 'both') && parentRecordings.length > 0) {
            result.parent = generateAudioSegmentsForType(parentRecordings, world, 'parent');
        }
        
        return result;
    }
    
    /**
     * Generate audio segments for a specific recording type
     * @param {Array} recordings - Recordings of specific type
     * @param {string} world - World name
     * @param {string} type - 'kids' or 'parent'
     * @returns {Array} Audio segments array
     */
    function generateAudioSegmentsForType(recordings, world, type) {
        const audioSegments = [];
        const lang = window.LM_CONFIG.getCurrentLanguage();
        
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
        audioSegments.push({
            type: 'single',
            url: window.LM_CONFIG.getLocalizedAudioUrl(`audio/other/intro.mp3?t=${Date.now()}`, lang)
        });
        
        // 2. Add questions and answers in order
        sortedQuestionIds.forEach(questionId => {
            const questionRecordings = recordingsByQuestion[questionId];
            
            // Add question prompt
            const cacheBustTimestamp = Date.now() + Math.random();
            audioSegments.push({
                type: 'single',
                url: window.LM_CONFIG.getLocalizedAudioUrl(`audio/${world}/${world}-QID${questionId}.mp3?t=${cacheBustTimestamp}`, lang)
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
                backgroundUrl: window.LM_CONFIG.getLocalizedAudioUrl(`audio/other/monkeys.mp3?t=${backgroundTimestamp}`, lang),
                questionId: questionId,
                recordingType: type // Add type identifier
            });
        });
        
        // 3. Add outro
        const outroTimestamp = Date.now() + 1;
        audioSegments.push({
            type: 'single',
            url: window.LM_CONFIG.getLocalizedAudioUrl(`audio/other/outro.mp3?t=${outroTimestamp}`, lang)
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
        
        // Fix for Webflow's locale switcher stripping URL params
        setupLocaleSwitcherFix();
    });

    /**
     * Preserves URL parameters when user switches language via Webflow's locale switcher.
     */
    function setupLocaleSwitcherFix() {
        if (!window.location.search) return;
        document.body.addEventListener('click', function(event) {
            const link = event.target.closest('a.w-loc.w-dropdown-link');
            if (link) {
                event.preventDefault();
                event.stopPropagation();
                const newUrl = `${link.getAttribute('href')}${window.location.search}`;
                window.location.href = newUrl;
            }
        }, true);
    }
    
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
     * Set world background image - simplified to use only static images
     */
    function setWorldBackground(world, backgroundUrl) {
        if (!world) return;
        
        const worldBg = document.getElementById('world-bg');
        const programContainer = document.querySelector('.program-container');
        
        // Use backgroundUrl from API first, then fallback to config
        let imageUrl = backgroundUrl;
        if (!imageUrl || imageUrl.endsWith('.mp4')) {
            // If backgroundUrl is a video or missing, use static image from config
            imageUrl = window.LM_CONFIG?.WORLD_IMAGES?.[world];
        }
        
        if (imageUrl) {
            // Remove any existing video elements
            if (worldBg) {
                const existingVideo = worldBg.querySelector('.world-bg-video');
                if (existingVideo) existingVideo.remove();
                
                worldBg.style.backgroundImage = `url('${imageUrl}')`;
                worldBg.style.backgroundSize = 'cover';
                worldBg.style.backgroundPosition = 'center';
                worldBg.style.backgroundRepeat = 'no-repeat';
            }
            
            if (programContainer) {
                const existingVideo = programContainer.querySelector('.world-bg-video');
                if (existingVideo) existingVideo.remove();
                
                programContainer.style.backgroundImage = `url('${imageUrl}')`;
                programContainer.style.backgroundSize = 'cover';
                programContainer.style.backgroundPosition = 'center';
                programContainer.style.backgroundRepeat = 'no-repeat';
            }
        } else {
            // Fallback to default background
            if (worldBg) {
                worldBg.style.backgroundColor = '#f0f0f0';
            }
            if (programContainer) {
                programContainer.style.backgroundColor = '#f0f0f0';
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
     * Setup audio player using RecordingUI module from recording-ui.js
     */
    function setupAudioPlayer(audioUrl, radioData, customContainer = null) {
        // Get the player container
        const playerContainer = customContainer || document.getElementById('player-state');
        if (!playerContainer) {
            console.error('Player container not found');
            return;
        }

        // Check if RecordingUI is available
        if (!window.RecordingUI || !window.RecordingUI.createRecordingElement) {
            console.error('RecordingUI module not loaded. Make sure recording-ui.js is included.');
            // Fallback to simple audio element
            const bgColor = playerContainer.style.background.includes('#FFD700') ? 'rgba(255,215,0,0.9)' : 'rgba(255,255,255,0.9)';
            playerContainer.innerHTML = `
                <div style="background: ${bgColor}; border-radius: 12px; padding: 16px; text-align: center;">
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

        // Check if container has yellow background for parent programs
        const isParentProgram = playerContainer.style.background.includes('#FFD700');
        
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
                const playerDiv = playerElement.querySelector('div[style*="background: white"], div[style*="background: #ffffff"]');
                if (playerDiv) {
                    // Use yellow background for parent programs, white for kids programs
                    playerDiv.style.background = isParentProgram ? '#FFD700' : '#ffffff';
                    playerDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    playerDiv.style.width = '100%';
                }
                
                playerContainer.appendChild(playerElement);
                
                // Store reference to audio element
                audioPlayer = playerElement.querySelector('audio');
                
                // Add play tracking for new recording counter reset
                if (audioPlayer) {
                    setupRadioPlayTracking(audioPlayer);
                }
                
                console.log('✅ Radio player created using RecordingUI');
            } else {
                console.error('Failed to create player element');
            }
        }).catch(error => {
            console.error('Error creating RecordingUI player:', error);
            // Fallback to simple audio element
            const bgColor = isParentProgram ? 'rgba(255,215,0,0.9)' : 'rgba(255,255,255,0.9)';
            playerContainer.innerHTML = `
                <div style="background: ${bgColor}; border-radius: 12px; padding: 16px; text-align: center;">
                    <audio controls style="width: 100%;" preload="metadata">
                        <source src="${audioUrl}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            `;
            
            // Add play tracking to fallback player too
            const fallbackAudio = playerContainer.querySelector('audio');
            if (fallbackAudio) {
                setupRadioPlayTracking(fallbackAudio);
            }
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
            const lang = window.LM_CONFIG.getCurrentLanguage();
            const response = await fetch(`${API_BASE_URL}/api/get-radio-data?shareId=${currentShareId}&lang=${lang}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            currentRadioData = data;
            
            if (data.success) {
                // Check what programs need generation based on detailed API response
                const needsKids = data.needsKidsProgram || false;
                const needsParent = data.needsParentProgram || false;
                const hasKidsRecordings = data.hasKidsRecordings || false;
                const hasParentRecordings = data.hasParentRecordings || false;
                
                // NEW: Check generation status from lock system
                const kidsGenerating = data.generationStatus?.kids?.isGenerating || false;
                const parentGenerating = data.generationStatus?.parent?.isGenerating || false;
                
                console.log(`📊 Generation status: Kids(${needsKids ? 'GENERATE' : 'EXISTS'}), Parent(${needsParent ? 'GENERATE' : 'EXISTS'})`);
                console.log(`📊 Recordings available: Kids(${hasKidsRecordings}), Parent(${hasParentRecordings})`);
                console.log(`📊 Lock status: Kids(${kidsGenerating ? 'GENERATING' : 'FREE'}), Parent(${parentGenerating ? 'GENERATING' : 'FREE'})`);
                
                // NEW: Handle generation in progress
                if (kidsGenerating || parentGenerating) {
                    const generatingTypes = [];
                    if (kidsGenerating) generatingTypes.push('Kids');
                    if (parentGenerating) generatingTypes.push('Parent');
                    
                    console.log(`⏳ Generation in progress for: ${generatingTypes.join(', ')}`);
                    showWaitingForGeneration(data, generatingTypes);
                } else if (needsKids || needsParent) {
                    console.log('🔄 Program generation needed');
                    generateNewProgram(data, { needsKids, needsParent, hasKidsRecordings, hasParentRecordings });
                } else if (data.lastManifest?.kidsProgram || data.lastManifest?.parentProgram || data.lastManifest?.programUrl) {
                    console.log('✅ Using existing programs - no changes detected');
                    showExistingProgram(data);
                } else {
                    console.log('⚙️ No existing programs found - generating first programs');
                    generateNewProgram(data, { needsKids: hasKidsRecordings, needsParent: hasParentRecordings, hasKidsRecordings, hasParentRecordings });
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
     * Show waiting state when generation is in progress
     * @param {Object} data - Radio data
     * @param {Array} generatingTypes - Array of types being generated ('Kids', 'Parent')
     */
    function showWaitingForGeneration(data, generatingTypes) {
        console.log(`⏳ Showing waiting state for: ${generatingTypes.join(', ')}`);
        
        showGeneratingState();
        
        // Update message to reflect what's being generated
        const typeText = generatingTypes.length === 1 
            ? `${generatingTypes[0]} program` 
            : `${generatingTypes.join(' and ')} programs`;
        
        updateGeneratingMessage(`${typeText} is being generated by another user...`);
        
        // Start polling for completion
        startGenerationPolling(data);
    }

    /**
     * Start polling for generation completion
     * @param {Object} data - Initial radio data
     */
    function startGenerationPolling(data) {
        let pollCount = 0;
        const maxPolls = 150; // 5 minutes at 2-second intervals
        
        const pollInterval = setInterval(async () => {
            pollCount++;
            
            try {
                console.log(`🔄 Polling for generation completion (${pollCount}/${maxPolls})`);
                
                // Reload radio data to check generation status
                const response = await fetch(`${API_BASE_URL}/api/get-radio-data?shareId=${currentShareId}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const freshData = await response.json();
                if (!freshData.success) {
                    throw new Error(freshData.error || 'Failed to fetch radio data');
                }
                
                // Check if generation is still in progress
                const kidsGenerating = freshData.generationStatus?.kids?.isGenerating || false;
                const parentGenerating = freshData.generationStatus?.parent?.isGenerating || false;
                
                if (!kidsGenerating && !parentGenerating) {
                    // Generation completed!
                    console.log('✅ Generation completed, showing programs');
                    clearInterval(pollInterval);
                    stopGeneratingMessages();
                    
                    // Show the updated programs
                    showExistingProgram(freshData);
                } else if (pollCount >= maxPolls) {
                    // Timeout - stop polling and try to show what we have
                    console.log('⏰ Polling timeout, showing current state');
                    clearInterval(pollInterval);
                    stopGeneratingMessages();
                    
                    // Try to show existing programs or fall back to generation
                    if (freshData.lastManifest?.kidsProgram || freshData.lastManifest?.parentProgram) {
                        showExistingProgram(freshData);
                    } else {
                        // Force generation attempt
                        generateNewProgram(freshData, { 
                            needsKids: freshData.hasKidsRecordings, 
                            needsParent: freshData.hasParentRecordings,
                            hasKidsRecordings: freshData.hasKidsRecordings,
                            hasParentRecordings: freshData.hasParentRecordings 
                        });
                    }
                } else {
                    // Update waiting message with estimated time
                    const remainingPolls = maxPolls - pollCount;
                    const estimatedSeconds = remainingPolls * 2;
                    updateGeneratingMessage(`Generation in progress... (${Math.round(estimatedSeconds / 60)} minutes remaining)`);
                }
                
            } catch (error) {
                console.error('Error during generation polling:', error);
                
                // On error, stop polling and try to show existing programs
                clearInterval(pollInterval);
                stopGeneratingMessages();
                
                if (data.lastManifest?.kidsProgram || data.lastManifest?.parentProgram) {
                    showExistingProgram(data);
                } else {
                    showError('Failed to check generation status. Please refresh the page.');
                }
            }
        }, 2000); // Poll every 2 seconds
        
        // Store interval for cleanup
        if (window.generationPollInterval) {
            clearInterval(window.generationPollInterval);
        }
        window.generationPollInterval = pollInterval;
    }

    /**
     * Show existing program - now checks for dual programs
     */
    async function showExistingProgram(data) {
        console.log('✅ Showing existing program');
        console.log('📊 Manifest data:', data.lastManifest);
        console.log('📊 Kids manifest:', data.kidsManifest);
        console.log('📊 Parent manifest:', data.parentManifest);
        
        const userRole = await detectUserRole();
        
        // Build programs object from available manifests
        const programs = {};
        
        // Check for kids program - try multiple sources
        if (data.kidsManifest?.programUrl) {
            programs.kids = { url: data.kidsManifest.programUrl };
            console.log('📻 Found kids program in kids manifest:', data.kidsManifest.programUrl);
        } else if (data.lastManifest?.kidsProgram) {
            programs.kids = { url: data.lastManifest.kidsProgram };
            console.log('📻 Found kids program in combined manifest:', data.lastManifest.kidsProgram);
        } else if (data.lastManifest?.programUrl && data.hasKidsRecordings) {
            // Legacy fallback for kids program
            programs.kids = { url: data.lastManifest.programUrl };
            console.log('📻 Using legacy kids program:', data.lastManifest.programUrl);
        }
        
        // Check for parent program - try multiple sources
        if (data.parentManifest?.programUrl) {
            programs.parent = { url: data.parentManifest.programUrl };
            console.log('📻 Found parent program in parent manifest:', data.parentManifest.programUrl);
        } else if (data.lastManifest?.parentProgram) {
            programs.parent = { url: data.lastManifest.parentProgram };
            console.log('📻 Found parent program in combined manifest:', data.lastManifest.parentProgram);
        }
        
        // Check if we have any programs to show
        if (Object.keys(programs).length > 0) {
            console.log('📻 Showing programs:', programs);
            showDualPlayerState(programs, data, userRole);
        } else {
            console.log('📻 No programs found, checking for available recordings...');
            console.log('📊 Has kids recordings:', data.hasKidsRecordings);
            console.log('📊 Has parent recordings:', data.hasParentRecordings);
            
            if (data.hasKidsRecordings || data.hasParentRecordings) {
                console.log('📻 Recordings available but no programs - triggering generation');
                generateNewProgram(data, { 
                    needsKids: data.hasKidsRecordings, 
                    needsParent: data.hasParentRecordings,
                    hasKidsRecordings: data.hasKidsRecordings,
                    hasParentRecordings: data.hasParentRecordings 
                });
            } else {
                hideAllStates();
                showState('player-state');
                const playerContainer = document.getElementById('player-state');
                if (playerContainer) {
                    playerContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No radio programs available yet.</div>';
                }
                currentState = 'player';
            }
        }
    }
    
    /**
     * Show dual player state based on user role and available programs
     * @param {Object} programs - Object with kids and/or parent program URLs
     * @param {Object} data - Radio data
     * @param {string} userRole - Current user role
     */
    function showDualPlayerState(programs, data, userRole) {
        hideAllStates();
        showState('player-state');
        
        // Get the player container
        const playerContainer = document.getElementById('player-state');
        if (!playerContainer) {
            console.error('Player container not found');
            return;
        }
        
        // Clear the container
        playerContainer.innerHTML = '';
        
        const radioData = {
            world: data.world,
            recordingCount: data.currentRecordings?.length || 0
        };
        
        if (userRole === 'parent') {
            // Parents see only kids program
            if (programs.kids && programs.kids.url) {
                console.log('👨‍👩‍👧‍👦 Parent user - showing kids program:', programs.kids.url);
                createSinglePlayer(playerContainer, programs.kids.url, radioData, 'Kids Program');
            } else {
                console.log('👨‍👩‍👧‍👦 Parent user - no kids program available:', programs);
                playerContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No kids recordings available yet.</div>';
            }
        } else {
            // Teachers and therapists see both programs if available
            const availablePrograms = [];
            
            if (programs.kids) {
                availablePrograms.push({
                    url: programs.kids.url,
                    title: 'Kids Program',
                    description: 'Student recordings'
                });
            }
            
            if (programs.parent) {
                availablePrograms.push({
                    url: programs.parent.url,
                    title: 'Parent Program', 
                    description: 'Parent recordings'
                });
            }
            
            if (availablePrograms.length === 0) {
                playerContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No recordings available yet.</div>';
            } else if (availablePrograms.length === 1) {
                // Single program available
                createSinglePlayer(playerContainer, availablePrograms[0].url, radioData, availablePrograms[0].title);
            } else {
                // Multiple programs available - create dual player
                createDualPlayer(playerContainer, availablePrograms, radioData);
            }
        }
        
        currentState = 'player';
    }
    
    /**
     * Create a single audio player
     * @param {HTMLElement} container - Container element
     * @param {string} audioUrl - Audio URL
     * @param {Object} radioData - Radio data
     * @param {string} title - Player title
     */
    function createSinglePlayer(container, audioUrl, radioData, title) {
        // Create title if provided
        if (title) {
            const titleDiv = document.createElement('div');
            titleDiv.style.cssText = 'margin-bottom: 16px; font-weight: bold; text-align: center; color: #333;';
            titleDiv.textContent = title;
            container.appendChild(titleDiv);
        }
        
        setupAudioPlayer(audioUrl, radioData, container);
    }
    
    /**
     * Create dual audio players for teachers/therapists
     * @param {HTMLElement} container - Container element
     * @param {Array} programs - Array of program objects
     * @param {Object} radioData - Radio data
     */
    function createDualPlayer(container, programs, radioData) {
        programs.forEach((program, index) => {
            // Create program section
            const programSection = document.createElement('div');
            programSection.style.cssText = `margin-bottom: ${index === programs.length - 1 ? '0' : '24px'};`;
            
            // Create title
            const titleDiv = document.createElement('div');
            titleDiv.style.cssText = 'margin-bottom: 12px; font-weight: bold; text-align: center; color: #333; font-size: 16px;';
            titleDiv.textContent = program.title;
            
            // Create description
            const descDiv = document.createElement('div');
            descDiv.style.cssText = 'margin-bottom: 16px; text-align: center; color: #666; font-size: 14px;';
            descDiv.textContent = program.description;
            
            // Create player container with conditional styling for parent programs
            const playerDiv = document.createElement('div');
            
            // Add yellow background for parent programs
            if (program.title && program.title.includes('Parent')) {
                playerDiv.style.cssText = 'background: #FFD700; border-radius: 12px; padding: 8px;';
            }
            
            programSection.appendChild(titleDiv);
            programSection.appendChild(descDiv);
            programSection.appendChild(playerDiv);
            container.appendChild(programSection);
            
            // Setup audio player
            setupAudioPlayer(program.url, radioData, playerDiv);
        });
    }

    /**
     * Generate new program - now supports dual programs for different user roles
     */
    async function generateNewProgram(data, generationNeeds = {}) {
        console.log('⚙️ Generating new program');
        
        showGeneratingState();
        
        try {
            // Detect user role to determine what to generate
            const userRole = await detectUserRole();
            const currentMemberId = await getCurrentMemberId();
            
            // Get generation needs from API
            const needsKids = generationNeeds.needsKids || false;
            const needsParent = generationNeeds.needsParent || false;
            const hasKidsRecordings = generationNeeds.hasKidsRecordings || false;
            const hasParentRecordings = generationNeeds.hasParentRecordings || false;
            
            console.log(`🎯 API says - Needs generation: Kids(${needsKids}), Parent(${needsParent})`);
            console.log(`🎯 API says - Has recordings: Kids(${hasKidsRecordings}), Parent(${hasParentRecordings})`);
            
            // Determine what we ACTUALLY need to generate
            let generateKids = false;
            let generateParent = false;
            
            // ONLY generate if API says we need to (new recordings detected)
            if (needsKids && hasKidsRecordings) {
                generateKids = true;
            }
            
            if (needsParent && hasParentRecordings) {
                generateParent = true;
            }
            
            console.log(`🎯 Final generation plan: Kids(${generateKids ? 'YES' : 'NO'}), Parent(${generateParent ? 'YES' : 'NO'})`);
            
            // If nothing needs generation, show existing programs
            if (!generateKids && !generateParent) {
                console.log('📻 No generation needed, showing existing programs');
                stopGeneratingMessages();
                showExistingProgram(data);
                return;
            }
            
            // Convert recordings to audioSegments format based on what we need to generate
            const audioSegmentsResult = {};
            
            if (generateKids) {
                const kidsSegments = convertRecordingsToAudioSegments(data.currentRecordings, data.world, 'kids');
                if (kidsSegments.kids) {
                    audioSegmentsResult.kids = kidsSegments.kids;
                }
            }
            
            if (generateParent) {
                const parentSegments = convertRecordingsToAudioSegments(data.currentRecordings, data.world, 'parent');
                if (parentSegments.parent) {
                    audioSegmentsResult.parent = parentSegments.parent;
                }
            }
            
            // Check if we have any programs to generate
            if (!audioSegmentsResult.kids && !audioSegmentsResult.parent) {
                console.log('📻 No audio segments to generate, showing existing programs');
                stopGeneratingMessages();
                showExistingProgram(data);
                return;
            }
            
            const generatedPrograms = {};
            
            // Generate kids program if available
            if (audioSegmentsResult.kids) {
                updateGeneratingMessage('Generating kids program...');
                
                const kidsResponse = await fetch(`${API_BASE_URL}/api/combine-audio`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lmid: data.lmid,
                        world: data.world,
                        audioSegments: audioSegmentsResult.kids,
                        programType: 'kids',
                        lang: window.LM_CONFIG.getCurrentLanguage()
                    })
                });
                
                if (kidsResponse.ok) {
                    const kidsResult = await kidsResponse.json();
                    generatedPrograms.kids = {
                        url: kidsResult.url || kidsResult.programUrl,
                        manifest: kidsResult.manifest
                    };
                    console.log('✅ Kids program generated successfully');
                } else if (kidsResponse.status === 409) {
                    console.log('🔒 Kids generation already in progress, will wait for completion');
                    // This is handled by the polling system
                }
            }
            
            // Generate parent program if available
            if (audioSegmentsResult.parent) {
                updateGeneratingMessage('Generating parent program...');
                
                const parentResponse = await fetch(`${API_BASE_URL}/api/combine-audio`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lmid: data.lmid,
                        world: data.world,
                        audioSegments: audioSegmentsResult.parent,
                        programType: 'parent',
                        lang: window.LM_CONFIG.getCurrentLanguage()
                    })
                });
                
                if (parentResponse.ok) {
                    const parentResult = await parentResponse.json();
                    generatedPrograms.parent = {
                        url: parentResult.url || parentResult.programUrl,
                        manifest: parentResult.manifest
                    };
                    console.log('✅ Parent program generated successfully');
                } else if (parentResponse.status === 409) {
                    console.log('🔒 Parent generation already in progress, will wait for completion');
                    // This is handled by the polling system
                }
            }
            
            // Stop generating messages
            stopGeneratingMessages();
            updateGeneratingMessage('Programs generated successfully!');
            
            // Wait a moment for manifests to update, then reload data to get fresh manifest
            setTimeout(async () => {
                try {
                    // Reload radio data to get updated manifest
                    const lang = window.LM_CONFIG.getCurrentLanguage();
                    const response = await fetch(`${API_BASE_URL}/api/get-radio-data?shareId=${currentShareId}&lang=${lang}`);
                    if (response.ok) {
                        const freshData = await response.json();
                        if (freshData.success) {
                            console.log('📻 Reloaded data with fresh manifest');
                            showExistingProgram(freshData);
                            return;
                        }
                    }
                } catch (error) {
                    console.warn('Failed to reload data, using generated programs directly');
                }
                
                // Fallback: show generated programs directly
                showDualPlayerState(generatedPrograms, data, userRole);
            }, 2000);
            
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

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (window.generationPollInterval) {
            clearInterval(window.generationPollInterval);
        }
        if (generatingInterval) {
            clearInterval(generatingInterval);
        }
    });

    /**
     * Mark LMID radio as played (reset new recording counter)
     * Standalone implementation for radio page
     * @param {string} lmid - LMID number
     */
    async function markLmidRadioPlayed(lmid) {
        try {
            const currentMemberId = await getCurrentMemberId();
            if (!currentMemberId) {
                console.warn('⚠️ No member ID available for radio play tracking');
                return;
            }
            
            // Update localStorage to reset new recording counter
            const storageKey = `lm_user_visits_${currentMemberId}`;
            const userData = JSON.parse(localStorage.getItem(storageKey) || '{}');
            
            const lmidKey = `lmid_${lmid}`;
            if (!userData[lmidKey]) {
                userData[lmidKey] = {};
            }
            
            const now = new Date().toISOString();
            userData[lmidKey].lastRadioPlay = now;
            userData[lmidKey].lastRecordingCheck = now; // Reset counter
            
            localStorage.setItem(storageKey, JSON.stringify(userData));
            
            console.log(`📝 Updated radio play data for LMID ${lmid} (counter reset)`);
        } catch (error) {
            console.error('❌ Error marking LMID radio as played:', error);
        }
    }

    /**
     * Setup play tracking for radio programs to reset new recording counter
     * @param {HTMLAudioElement} audioElement - The audio element to track
     */
    function setupRadioPlayTracking(audioElement) {
        let hasTrackedPlay = false; // Only track first play per page load
        
        const handlePlay = () => {
            if (!hasTrackedPlay && currentRadioData?.lmid) {
                hasTrackedPlay = true;
                
                // Reset new recording counter when user starts playing radio
                markLmidRadioPlayed(currentRadioData.lmid.toString());
                console.log(`🎵 Radio play tracked for LMID ${currentRadioData.lmid} - new recording counter reset`);
            }
        };
        
        // Track when user clicks play
        audioElement.addEventListener('play', handlePlay);
        
        // Cleanup listener if needed
        audioElement.addEventListener('pause', () => {
            // Optional: Could track pause events for analytics
        });
    }

    // Make functions available globally for testing
    window.RadioProgram = {
        showLoadingState,
        showPlayerState,
        showGeneratingState,
        updateLoadingMessage,
        updateGeneratingMessage,
        loadRadioData,
        stopGeneratingMessages,
        showWaitingForGeneration,
        startGenerationPolling,
        setupRadioPlayTracking
    };

})();

console.log('✅ Radio program loaded and ready for Webflow'); 