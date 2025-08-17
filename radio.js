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

                } else {
                    console.warn(`No recognizable plan found in: [${activePlanIds.join(', ')}], defaulting to teacher role`);
                    currentUserRole = 'teacher';
                }
            }
            

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
        
        // Determine user role based on recording type
        const userRole = type === 'kids' ? 'educators' : 'parents';
        
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
        
        // 1. Add intro jingle
        audioSegments.push({
            type: 'single',
            url: window.LM_CONFIG.getLocalizedAudioUrl(`audio/jingles/intro-jingle.mp3?t=${Date.now()}`, lang)
        });
        
        // 2. Add world-specific intro (role-based)
        const worldIntroTimestamp = Date.now() + 1;
        audioSegments.push({
            type: 'single',
            url: window.LM_CONFIG.getLocalizedAudioUrl(`audio/${world}/other/${world}-intro-${userRole}.mp3?t=${worldIntroTimestamp}`, lang)
        });
        
        // 3. Add 1 second silence before questions
        audioSegments.push({
            type: 'silence',
            duration: 1
        });
        
        // 4. Add questions and answers in order
        sortedQuestionIds.forEach(questionId => {
            const questionRecordings = recordingsByQuestion[questionId];
            
            // Add middle jingle before each question
            const middleJingleTimestamp = Date.now() + Math.random();
            audioSegments.push({
                type: 'single',
                url: window.LM_CONFIG.getLocalizedAudioUrl(`audio/jingles/middle-jingle.mp3?t=${middleJingleTimestamp}`, lang)
            });
            
            // Add question prompt from world-specific questions folder
            const cacheBustTimestamp = Date.now() + Math.random();
            audioSegments.push({
                type: 'single',
                url: window.LM_CONFIG.getLocalizedAudioUrl(`audio/${world}/questions/${world}-QID${questionId}.mp3?t=${cacheBustTimestamp}`, lang)
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
            
            // Combine answers with world-specific background music
            const backgroundTimestamp = Date.now() + Math.random();
            audioSegments.push({
                type: 'combine_with_background',
                answerUrls: sortedAnswers.map(recording => recording.url || recording.cloudUrl),
                backgroundUrl: window.LM_CONFIG.getLocalizedAudioUrl(`audio/${world}/other/${world}-background.mp3?t=${backgroundTimestamp}`, lang),
                questionId: questionId,
                recordingType: type // Add type identifier
            });
        });
        
        // 5. Add middle-jingle before outro
        const finalMiddleJingleTimestamp = Date.now() + 3;
        audioSegments.push({
            type: 'single',
            url: window.LM_CONFIG.getLocalizedAudioUrl(`audio/jingles/middle-jingle.mp3?t=${finalMiddleJingleTimestamp}`, lang)
        });
        
        // 6. Add outro jingle
        const outroJingleTimestamp = Date.now() + 4;
        audioSegments.push({
            type: 'single',
            url: window.LM_CONFIG.getLocalizedAudioUrl(`audio/jingles/outro-jingle.mp3?t=${outroJingleTimestamp}`, lang)
        });
        
        // 7. Add world-specific outro (role-based) - LAST
        const worldOutroTimestamp = Date.now() + 5;
        audioSegments.push({
            type: 'single',
            url: window.LM_CONFIG.getLocalizedAudioUrl(`audio/${world}/other/${world}-outro-${userRole}.mp3?t=${worldOutroTimestamp}`, lang)
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
     * Add Intro Story player to loading state (independent of Kids/Parents loading)
     */
    async function addIntroStoryToLoadingState() {
        // Find the dedicated intro story container by ID
        const storyContainer = document.getElementById('intro-story-player');
        if (!storyContainer) {
            console.error('Intro story container (#intro-story-player) not found in Webflow');
            return;
        }

        // Check if intro story player already exists
        if (storyContainer.querySelector('.intro-story')) {
            return; // Already added
        }

        // Get world info from URL
        const worldInfo = await getWorldInfo(currentShareId);
        if (!worldInfo) {
            console.error('Could not get world info for intro story');
            return;
        }

        const radioData = {
            world: worldInfo.world,
            recordingCount: 0
        };

        // Create intro story player in dedicated container
        createIntroStoryPlayer(storyContainer, radioData);
    }

    /**
     * Show loading state
     */
    function showLoadingState() {
        hideAllStates();
        showState('loading-state');
        
        // Add Intro Story player to loading state
        addIntroStoryToLoadingState();
        
        updateLoadingMessage('Loading your radio program...');
        currentState = 'loading';
    }

    /**
     * Show player state
     */
    function showPlayerState(audioUrl, radioData) {
        hideAllStates();
        showState('player-state');
        
        // Explicitly hide loading and generating states once players are loaded
        hideLoadingAndGeneratingStates();
        
        // Setup audio player
        setupAudioPlayer(audioUrl, radioData, null, false);
        
        currentState = 'player';
    }

    /**
     * Add Intro Story player to generating state (independent of Kids/Parents generation)
     */
    async function addIntroStoryToGeneratingState() {
        // Find the dedicated intro story container by ID
        const storyContainer = document.getElementById('intro-story-player');
        if (!storyContainer) {
            console.error('Intro story container (#intro-story-player) not found in Webflow');
            return;
        }

        // Check if intro story player already exists
        if (storyContainer.querySelector('.intro-story')) {
            return; // Already added
        }

        // Get world info from URL
        const worldInfo = await getWorldInfo(currentShareId);
        if (!worldInfo) {
            console.error('Could not get world info for intro story');
            return;
        }

        const radioData = {
            world: worldInfo.world,
            recordingCount: 0
        };

        // Create intro story player in dedicated container
        createIntroStoryPlayer(storyContainer, radioData);
    }

    /**
     * Show generating state
     */
    function showGeneratingState() {
        hideAllStates();
        showState('generating-state');
        
        // Add Intro Story player to generating state
        addIntroStoryToGeneratingState();
        
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
     * Explicitly hide loading and generating states when players are loaded
     */
    function hideLoadingAndGeneratingStates() {
        const loadingState = document.getElementById('loading-state');
        const generatingState = document.getElementById('generating-state');
        const introStoryPlayer = document.getElementById('intro-story-player');
        
        if (loadingState) {
            loadingState.style.display = 'none';
            console.log('🚫 Hidden loading-state');
        }
        
        if (generatingState) {
            generatingState.style.display = 'none';
            console.log('🚫 Hidden generating-state');
        }
        
        // Also remove any spacing from intro-story-player container if it's empty or causing spacing
        if (introStoryPlayer) {
            // If intro story player is empty or only has spacing, hide it
            if (!introStoryPlayer.querySelector('.intro-story') || introStoryPlayer.children.length === 0) {
                introStoryPlayer.style.display = 'none';
                console.log('🚫 Hidden empty intro-story-player container');
            } else {
                // Remove any margins/padding that could cause spacing
                introStoryPlayer.style.margin = '0';
                introStoryPlayer.style.padding = '0';
                console.log('🔧 Removed spacing from intro-story-player container');
            }
        }
        
        // Also check for any other containers that might cause spacing
        const allLoadingStates = document.querySelectorAll('.loading-states');
        allLoadingStates.forEach(element => {
            if (element.id !== 'player-state' && getComputedStyle(element).display !== 'none') {
                element.style.display = 'none';
                console.log('🚫 Hidden extra loading state:', element.id || element.className);
            }
        });
        
        // Remove any spacing from the main program container
        const programContainer = document.querySelector('.program-container');
        if (programContainer) {
            // Ensure no extra bottom spacing
            const playerState = document.getElementById('player-state');
            if (playerState) {
                playerState.style.marginBottom = '0';
                playerState.style.paddingBottom = '0';
            }
        }
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
        const translatedWorld = window.LM_CONFIG?.UTILS?.translateWorldName?.(worldName) ||
                              window.LM_CONFIG?.UTILS?.formatWorldName(worldName) ||
                              (worldName ? worldName.charAt(0).toUpperCase() + worldName.slice(1).replace(/-/g, ' ') : 'Loading...');
        
        const worldElement = document.getElementById('world-name');
        if (worldElement) {
            worldElement.textContent = translatedWorld;
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
    function setupAudioPlayer(audioUrl, radioData, customContainer = null, isParentProgram = false) {
        // Get the player container
        const playerContainer = customContainer || document.getElementById('player-state');
        if (!playerContainer) {
            console.error('Player container not found');
            return;
        }

        // RecordingUI is required - no fallbacks for consistent player experience
        if (!window.RecordingUI || !window.RecordingUI.createRecordingElement) {
            console.error('RecordingUI module not loaded. Cannot create audio player.');
            return;
        }

        // Preserve existing content (like Webflow text labels) and only clear audio players

        const existingAudioPlayers = playerContainer.querySelectorAll('li[data-recording-id], audio, div[style*="background: #ffffff"]');

        existingAudioPlayers.forEach(player => player.remove());


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

        // Parent program status passed as parameter
        
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

                
                // Debug progress bar existence - try multiple selectors
                const progressBar = playerElement.querySelector('div[style*="flex: 1"][style*="cursor: pointer"]');
                const progressBarInner = playerElement.querySelector('div[style*="background: #007AF7"]') || 
                                       playerElement.querySelector('div[style*="background:#007AF7"]') ||
                                       playerElement.querySelector('div[style*="background-color: #007AF7"]');
                const audioElement = playerElement.querySelector('audio');
                
                // Progress bar debugging simplified

                
                // NOTE: Don't apply yellow background here - it's handled later via setTimeout
                // to avoid overriding progress bar colors
                
                // Ensure progress bar inner has correct blue color and container has proper background
                if (progressBar && progressBar.children.length > 0) {
                    const progressInner = progressBar.children[0];
                    const progressContainer = progressBar;
                    
                    // Ensure progress bar inner is blue
                    progressInner.style.background = '#007AF7';
                    progressInner.style.borderRadius = '4px';
                    
                    // Ensure progress container has proper gray background
                    progressContainer.style.background = 'rgba(0, 0, 0, 0.15)';
                    progressContainer.style.borderRadius = '4px';
                    

                }
                
                // Add text label as first element inside the player
                const mainPlayerDiv = playerElement.querySelector('div[style*="width: 100%"][style*="height: 48px"]');
                if (mainPlayerDiv) {
                    const textLabel = document.createElement('div');
                    textLabel.textContent = isParentProgram ? 'Parents Program' : 'Kids Program';
                    
                    // Unified styling for all text labels - 114px width, 24px padding-left, left aligned
                    textLabel.style.cssText = `font-size: 14px; font-weight: bold; color: #007AF7; width: 132px; padding-left: 24px; text-align: left; flex-shrink: 0;`;
                    
                    // Insert as first child
                    mainPlayerDiv.insertBefore(textLabel, mainPlayerDiv.firstChild);

                }
                
                playerContainer.appendChild(playerElement);

                
                // Store reference to audio element
                audioPlayer = playerElement.querySelector('audio');
                
                // Add play tracking for new recording counter reset
                if (audioPlayer) {
                    setupRadioPlayTracking(audioPlayer);
                }
                

            } else {
                console.error('Failed to create player element');
            }
        }).catch(error => {
            console.error('Error creating RecordingUI player:', error);
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
                } else if (data.lastManifest?.error) {
                    // Check if error manifest allows retry
                    const canRetry = !data.lastManifest.retryAfter || Date.now() > data.lastManifest.retryAfter;
                    
                    if (canRetry && (hasKidsRecordings || hasParentRecordings)) {
                        console.log('🔄 Error manifest expired - retrying generation');
                        generateNewProgram(data, { needsKids: hasKidsRecordings, needsParent: hasParentRecordings, hasKidsRecordings, hasParentRecordings });
                    } else {
                        console.log('❌ Recent generation error - showing error state');
                        showErrorState(data.lastManifest.errorMessage, data.lastManifest.retryAfter);
                    }
                } else if (data.lastManifest?.kidsProgram || data.lastManifest?.parentProgram || data.lastManifest?.programUrl) {
                    console.log('✅ Using existing programs - no changes detected');
                    showExistingProgram(data);
                } else {
                    console.log('⚙️ No existing programs found - checking if we have recordings to generate from');
                    if (hasKidsRecordings || hasParentRecordings) {
                        console.log('📻 Found recordings - generating first programs');
                        generateNewProgram(data, { needsKids: hasKidsRecordings, needsParent: hasParentRecordings, hasKidsRecordings, hasParentRecordings });
                    } else {
                        console.log('📻 No recordings available - showing empty state');
                        showExistingProgram(data); // This will show "No radio programs available yet."
                    }
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
                const lang = window.LM_CONFIG.getCurrentLanguage();
                const response = await fetch(`${API_BASE_URL}/api/get-radio-data?shareId=${currentShareId}&lang=${lang}`);
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
        } else if (data.lastManifest?.kidsProgram) {
            programs.kids = { url: data.lastManifest.kidsProgram };
        } else if (data.lastManifest?.programUrl && data.hasKidsRecordings) {
            // Legacy fallback for kids program
            programs.kids = { url: data.lastManifest.programUrl };
        }
        
        // Check for parent program - try multiple sources
        if (data.parentManifest?.programUrl) {
            programs.parent = { url: data.parentManifest.programUrl };
        } else if (data.lastManifest?.parentProgram) {
            programs.parent = { url: data.lastManifest.parentProgram };
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
                console.log('📻 Recordings available but no programs - using API generation needs');
                generateNewProgram(data, { 
                    needsKids: data.needsKidsProgram || false, 
                    needsParent: data.needsParentProgram || false,
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
        
        // Explicitly hide loading and generating states once players are loaded
        hideLoadingAndGeneratingStates();
        
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
        
        // Note: Intro Story player is already added in loading/generating states
        
        
        if (userRole === 'parent') {
            // Parents see only kids program
            if (programs.kids && programs.kids.url) {
                console.log('👨‍👩‍👧‍👦 Parent user - showing kids program:', programs.kids.url);
                createSinglePlayer(playerContainer, programs.kids.url, radioData, null);
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
                    type: 'kids', // For identification, not displayed
                    description: 'Student recordings'
                });
            } else {
            }
            
            if (programs.parent) {
                availablePrograms.push({
                    url: programs.parent.url,
                    type: 'parent', // For identification, not displayed
                    description: 'Parent recordings'
                });
            } else {
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
        
        setupAudioPlayer(audioUrl, radioData, container, false);
    }
    
    /**
     * Create Intro Story player with blue background
     * @param {HTMLElement} container - Container element
     * @param {Object} radioData - Radio data
     */
    function createIntroStoryPlayer(container, radioData) {
        // Create intro container
        const introContainer = document.createElement('div');
        introContainer.className = 'intro-story';
        introContainer.style.cssText = 'margin-bottom: 1rem; display: block; min-height: 48px; pointer-events: auto; user-select: auto;';
        
        // Generate intro story URL from world name
        const worldName = radioData.world?.toLowerCase() || 'spookyland';
        const introAudioUrl = `https://little-microphones.b-cdn.net/en/audio/${worldName}/other/${worldName}-story.mp3`;
        
        console.log('🎵 Creating Intro Story player for world:', worldName, 'URL:', introAudioUrl);
        
        // Insert at the beginning of container
        container.insertBefore(introContainer, container.firstChild);
        
        // Setup intro story audio player with blue theme
        setupIntroStoryPlayer(introAudioUrl, radioData, introContainer);
    }

    /**
     * Setup intro story audio player with custom blue styling
     * Uses the same setupAudioPlayer function as Kids/Parents but with custom styling
     * @param {string} audioUrl - Audio URL
     * @param {Object} radioData - Radio data  
     * @param {HTMLElement} container - Container element
     */
    function setupIntroStoryPlayer(audioUrl, radioData, container) {
        // Use the exact same setupAudioPlayer function as Kids/Parents players
        // Pass container and isParentProgram=false (we'll override styles after)
        setupAudioPlayer(audioUrl, radioData, container, false);
        
        // After player is created, apply blue theme styling
        setTimeout(() => {
            const playerElement = container.querySelector('li[data-recording-id]');
            if (playerElement) {
                const mainPlayerDiv = playerElement.querySelector('div[style*="width: 100%"][style*="height: 48px"]');
                if (mainPlayerDiv) {
                    // Change background to blue
                    mainPlayerDiv.style.background = '#007AF7';
                    mainPlayerDiv.style.borderRadius = '24px';
                    
                    // Change the text label to "Intro Story" and make it white
                    const textLabel = mainPlayerDiv.querySelector('div');
                    if (textLabel && textLabel.textContent.includes('Program')) {
                        textLabel.textContent = 'Intro Story';
                        // Use the same unified styling as Kids/Parents but with white color
                        textLabel.style.cssText = 'font-size: 14px; font-weight: bold; color: white; width: 132px; padding-left: 24px; text-align: left; flex-shrink: 0;';
                    }
                    
                    // Change play/pause button to white
                    const playButton = mainPlayerDiv.querySelector('div[style*="cursor: pointer"]');
                    if (playButton) {
                        const svgs = playButton.querySelectorAll('svg');
                        svgs.forEach(svg => {
                            svg.style.fill = 'white';
                            svg.style.color = 'white';
                            const paths = svg.querySelectorAll('path');
                            paths.forEach(path => {
                                path.setAttribute('fill', 'white');
                                path.style.fill = 'white';
                            });
                        });
                    }
                    
                    // Change time display to white with 80% opacity
                    const timeDisplay = mainPlayerDiv.querySelector('div[style*="opacity"]');
                    if (timeDisplay) {
                        timeDisplay.style.color = 'white';
                        timeDisplay.style.opacity = '0.8';
                    }
                    
                    // Change progress bar to white theme
                    const progressBarOuter = mainPlayerDiv.querySelector('div[style*="flex: 1"][style*="cursor: pointer"]');
                    if (progressBarOuter) {
                        progressBarOuter.style.background = 'rgba(255, 255, 255, 0.3)';
                        
                        const progressBarInner = progressBarOuter.querySelector('div[style*="background"]');
                        if (progressBarInner) {
                            progressBarInner.style.background = 'white';
                        }
                    }
                }
                
                // Ensure the container is interactive
                container.style.pointerEvents = 'auto';
                container.style.userSelect = 'auto';
                container.style.cursor = 'default';
                
                console.log('✅ Intro Story player styled successfully');
            }
        }, 100); // Small delay to ensure player is fully rendered
    }

    /**
     * Create dual audio players for teachers/therapists
     * @param {HTMLElement} container - Container element
     * @param {Array} programs - Array of program objects
     * @param {Object} radioData - Radio data
     */
    function createDualPlayer(container, programs, radioData) {
        
        // Find kids and parent programs by type
        const kidsProgram = programs.find(p => p.type === 'kids');
        const parentProgram = programs.find(p => p.type === 'parent');
        
        
        // Clean implementation - debug code removed since dual player works correctly
        
        // Find existing Webflow containers - they might be text elements, not .kids/.parents classes
        let existingKidsContainer = container.querySelector('.kids');
        let existingParentsContainer = container.querySelector('.parents');
        
        // If not found, try finding by text content
        if (!existingKidsContainer) {
            const allElements = container.querySelectorAll('*');
            existingKidsContainer = Array.from(allElements).find(el => 
                el.textContent && el.textContent.trim().toLowerCase().includes('kids')
            );
        }
        
        if (!existingParentsContainer) {
            const allElements = container.querySelectorAll('*');
            existingParentsContainer = Array.from(allElements).find(el => 
                el.textContent && el.textContent.trim().toLowerCase().includes('parent')
            );
        }
        
        
        // Use kids container (existing Webflow or create new)
        if (kidsProgram) {
            let kidsContainer;
            if (existingKidsContainer) {
                kidsContainer = existingKidsContainer;
                // If it's a text element, use its parent or create wrapper
                if (existingKidsContainer.tagName === 'TEXT' || existingKidsContainer.tagName === 'SPAN') {
                    kidsContainer = existingKidsContainer.parentElement || existingKidsContainer;
                }
            } else {
                kidsContainer = document.createElement('div');
                kidsContainer.className = 'kids';
                container.appendChild(kidsContainer);
            }
            
            // Ensure container has proper height and styling
            if (kidsContainer.style) {
                kidsContainer.style.minHeight = '48px';
                kidsContainer.style.marginBottom = '1rem';
                kidsContainer.style.display = 'block';
            }
            
            // Text will be integrated into the audio player itself, not as separate label
            
            // Setup audio player for kids (no special background)
            setupAudioPlayer(kidsProgram.url, radioData, kidsContainer, false);
        } else {
        }
        
        // Use parents container (existing Webflow or create new)
        if (parentProgram) {
            let parentsContainer;
            if (existingParentsContainer) {
                parentsContainer = existingParentsContainer;
                // If it's a text element, use its parent or create wrapper
                if (existingParentsContainer.tagName === 'TEXT' || existingParentsContainer.tagName === 'SPAN') {
                    parentsContainer = existingParentsContainer.parentElement || existingParentsContainer;
                }
            } else {
                parentsContainer = document.createElement('div');
                parentsContainer.className = 'parents';
                container.appendChild(parentsContainer);
            }
            
            // Ensure container has proper height and styling
            if (parentsContainer.style) {
                parentsContainer.style.minHeight = '48px';
                parentsContainer.style.marginTop = '1rem';
                parentsContainer.style.display = 'block';
            }
            
            // Text will be integrated into the audio player itself, not as separate label
            
            // Setup audio player for parents DIRECTLY in parentsContainer (same as kids)
            setupAudioPlayer(parentProgram.url, radioData, parentsContainer, true);
            
            // Apply yellow background ONLY to the main player container - no fallbacks
            setTimeout(() => {
                // Find the main player container by specific attributes - avoid progress bars  
                const mainPlayerContainer = parentsContainer.querySelector('div[style*="width: 100%"][style*="height: 48px"][style*="border-radius: 122px"]');
                
                if (mainPlayerContainer) {
                    mainPlayerContainer.style.background = '#FFD700';
                } else {
                    // NO FALLBACK - better to keep white than accidentally color progress bars
                }
            }, 100);
        } else {
        }
        
        
        // Debug DOM structure
        const kidsDiv = container.querySelector('.kids');
        const parentsDiv = container.querySelector('.parents');
        
        if (kidsDiv) {
            console.log('✅ .kids container exists:', kidsDiv);
            console.log('📏 .kids computed styles:', {
                display: getComputedStyle(kidsDiv).display,
                visibility: getComputedStyle(kidsDiv).visibility,
                opacity: getComputedStyle(kidsDiv).opacity,
                height: getComputedStyle(kidsDiv).height,
                width: getComputedStyle(kidsDiv).width
            });
        } else {
            console.log('❌ .kids container NOT FOUND');
        }
        
        if (parentsDiv) {
            console.log('✅ .parents container exists:', parentsDiv);
            console.log('📏 .parents computed styles:', {
                display: getComputedStyle(parentsDiv).display,
                visibility: getComputedStyle(parentsDiv).visibility,
                opacity: getComputedStyle(parentsDiv).opacity,
                height: getComputedStyle(parentsDiv).height,
                width: getComputedStyle(parentsDiv).width
            });
        } else {
            console.log('❌ .parents container NOT FOUND');
        }
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
            
            // Determine what we ACTUALLY need to generate based on user type
            let generateKids = false;
            let generateParent = false;
            
            // OPTIMIZATION: Generate based on user role to save resources
            if (userRole === 'parent') {
                // Parents only see Kids program - only generate Kids
                if (needsKids && hasKidsRecordings) {
                    generateKids = true;
                    console.log('👨‍👩‍👧‍👦 Parent user: Only generating Kids program');
                }
                // Skip Parent program generation for Parents (they can't see it anyway)
            } else if (userRole === 'teacher' || userRole === 'therapist') {
                // Teachers/Therapists can see both programs - generate both if needed
                if (needsKids && hasKidsRecordings) {
                    generateKids = true;
                }
                if (needsParent && hasParentRecordings) {
                    generateParent = true;
                }
                console.log('👩‍🏫 Educator/Therapist user: Generating both programs if needed');
            } else {
                // Unknown role - fallback to old behavior (generate both)
                if (needsKids && hasKidsRecordings) {
                    generateKids = true;
                }
                if (needsParent && hasParentRecordings) {
                    generateParent = true;
                }
                console.log('❓ Unknown user role: Generating both programs (fallback)');
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
                updateGeneratingMessage('Creating kids program job...');
                
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
                    const kidsJobResult = await kidsResponse.json();
                    
                    if (kidsJobResult.success && kidsJobResult.jobId) {
                        console.log(`✅ Kids job created: ${kidsJobResult.jobId}`);
                        updateGeneratingMessage('Kids program job created, waiting for processing...');
                        
                        // Poll for completion
                        const kidsResult = await pollForRadioJobCompletion(kidsJobResult.jobId, 'kids');
                        
                        if (kidsResult.success) {
                            generatedPrograms.kids = {
                                url: kidsResult.programUrl,
                                manifest: kidsResult.manifest
                            };
                            console.log('✅ Kids program generated successfully');
                            
                            // Stop messages immediately when first program is ready
                            stopGeneratingMessages();
                            updateGeneratingMessage('Kids program ready!');
                        } else {
                            console.error('❌ Kids program generation failed:', kidsResult.error);
                        }
                    } else {
                        console.error('❌ Failed to create kids job:', kidsJobResult.error);
                    }
                } else {
                    console.error('❌ Kids job creation request failed:', kidsResponse.status);
                }
            }
            
            // Generate parent program if available
            if (audioSegmentsResult.parent) {
                updateGeneratingMessage('Creating parent program job...');
                
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
                    const parentJobResult = await parentResponse.json();
                    
                    if (parentJobResult.success && parentJobResult.jobId) {
                        console.log(`✅ Parent job created: ${parentJobResult.jobId}`);
                        updateGeneratingMessage('Parent program job created, waiting for processing...');
                        
                        // Poll for completion
                        const parentResult = await pollForRadioJobCompletion(parentJobResult.jobId, 'parent');
                        
                        if (parentResult.success) {
                            generatedPrograms.parent = {
                                url: parentResult.programUrl,
                                manifest: parentResult.manifest
                            };
                            console.log('✅ Parent program generated successfully');
                            
                            // Stop messages immediately when parent program is ready (if still running)
                            if (generatingInterval) {
                                stopGeneratingMessages();
                                updateGeneratingMessage('Parent program ready!');
                            }
                        } else {
                            console.error('❌ Parent program generation failed:', parentResult.error);
                        }
                    } else {
                        console.error('❌ Failed to create parent job:', parentJobResult.error);
                    }
                } else {
                    console.log('🔒 Parent generation already in progress, will wait for completion');
                    // This is handled by the polling system
                }
            }
            
            // Stop generating messages (if still running)
            if (generatingInterval) {
            stopGeneratingMessages();
            updateGeneratingMessage('Programs generated successfully!');
            }
            
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
     * Poll for job completion using the queue system (radio.js version)
     * @param {string} jobId - Job ID to poll for
     * @param {string} programType - Program type for logging ('kids' or 'parent')
     * @returns {Promise<Object>} Final result when job is completed
     */
    async function pollForRadioJobCompletion(jobId, programType) {
        console.log(`📡 Starting SSE monitoring for ${programType} job: ${jobId}`);
        
        return new Promise((resolve, reject) => {
            const eventSource = new EventSource(`${API_BASE_URL}/api/job-stream?jobId=${jobId}`);
            let resolved = false;
            
            // Timeout after 5 minutes
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    eventSource.close();
                    console.error(`⏰ SSE timeout reached for ${programType} job:`, jobId);
                    resolve({
                        success: false,
                        error: 'Timeout: Job took too long to complete'
                    });
                }
            }, 5 * 60 * 1000);
            
            let sseEventCount = 0;
            
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    sseEventCount++;
                    
                    // Native console grouping - same string repeats = automatic counter
                    console.log(`📊 SSE event for ${programType} job ${jobId}: status ${data.status || 'connecting'}`);
                    
                    switch (data.type) {
                        case 'connected':
                            console.log(`✅ SSE connection established for ${programType} job`);
                            updateGeneratingMessage(`Connected to server for ${programType} program...`);
                            break;
                            
                        case 'status':
                            handleRadioJobStatusUpdate(data, programType);
                            
                            // Check if job is complete
                            if (data.status === 'completed') {
                                resolved = true;
                                clearTimeout(timeout);
                                eventSource.close();
                                
                                console.log(`✅ ${programType} job completed successfully`);
                                resolve({
                                    success: true,
                                    programUrl: data.programUrl,
                                    manifest: data.manifestData
                                });
                                
                            } else if (data.status === 'failed') {
                                resolved = true;
                                clearTimeout(timeout);
                                eventSource.close();
                                
                                console.error(`❌ ${programType} job failed:`, data.error);
                                resolve({
                                    success: false,
                                    error: data.error || 'Job processing failed'
                                });
                            }
                            break;
                            
                        case 'error':
                            resolved = true;
                            clearTimeout(timeout);
                            eventSource.close();
                            
                            console.error(`❌ SSE error for ${programType} job:`, data.message);
                            resolve({
                                success: false,
                                error: data.message || 'Server error occurred'
                            });
                            break;
                            
                        case 'timeout':
                            resolved = true;
                            clearTimeout(timeout);
                            eventSource.close();
                            
                            console.error(`⏰ Server timeout for ${programType} job:`, data.message);
                            resolve({
                                success: false,
                                error: data.message || 'Server monitoring timeout'
                            });
                            break;
                    }
                    
                } catch (parseError) {
                    console.error(`❌ Failed to parse SSE data for ${programType} job:`, parseError);
                }
            };
            
            eventSource.onerror = (error) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    eventSource.close();
                    
                    console.error(`❌ SSE connection error for ${programType} job:`, error);
                    resolve({
                        success: false,
                        error: 'Connection error during monitoring'
                    });
                }
            };
        });
    }

    /**
     * Handle job status updates from SSE for radio programs
     * @param {Object} data - Status data from SSE
     * @param {string} programType - Program type ('kids' or 'parent')
     */
    // Message throttling to prevent too frequent updates
    let lastMessageUpdate = 0;
    const MESSAGE_THROTTLE_MS = 5000; // 5 seconds minimum between message changes

    function handleRadioJobStatusUpdate(data, programType) {
        const { status, fileCount } = data;
        const now = Date.now();
        
        // Throttle message updates to minimum 5 seconds
        if (now - lastMessageUpdate < MESSAGE_THROTTLE_MS) {
            return;
        }
        
        switch (status) {
            case 'pending':
                const pendingMessages = [
                    'Gathering rainbow sound waves...',
                    'Tuning magical frequencies...',
                    'Preparing audio enchantments...',
                    'Warming up the sound laboratory...',
                    'Collecting musical stardust...',
                    'Calibrating the audio crystals...',
                    'Summoning the recording spirits...',
                    'Charging the melody generators...',
                    'Awakening the sound wizards...',
                    'Brewing audio potions...'
                ];
                const randomPendingMessage = pendingMessages[Math.floor(Math.random() * pendingMessages.length)];
                updateGeneratingMessage(randomPendingMessage);
                lastMessageUpdate = now;
                break;
                
            case 'processing':
                const processingMessages = [
                    `Processing ${programType} program with ${fileCount || 'audio'} files...`,
                    `Mixing ${programType} recordings...`,
                    `Adding music to ${programType} program...`,
                    `Finalizing ${programType} audio...`,
                    'Weaving sound tapestries...',
                    'Painting with audio colors...',
                    'Sculpting sonic masterpieces...',
                    'Dancing with sound waves...'
                ];
                const randomProcessingMessage = processingMessages[Math.floor(Math.random() * processingMessages.length)];
                updateGeneratingMessage(randomProcessingMessage);
                lastMessageUpdate = now;
                break;
                
            default:
                console.log(`📋 ${programType} job status: ${status}`);
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
                // Fallback: store a global reset marker so dashboards can adopt it later
                const now = new Date().toISOString();
                try {
                    const globalKey = `lm_global_radio_reset_${lmid}`;
                    const globalData = { lastRecordingCheck: now, updatedAt: now };
                    localStorage.setItem(globalKey, JSON.stringify(globalData));
                    console.log(`📝 Fallback global reset stored for LMID ${lmid}`);
                } catch (e) {
                    console.warn('⚠️ Failed to write global reset marker:', e);
                }
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
            
            console.log(`📝 Radio play tracked for LMID ${lmid} - new recording counter reset`);

            // Also write a global reset marker to cover cross-context cases
            try {
                const globalKey = `lm_global_radio_reset_${lmid}`;
                const globalData = { lastRecordingCheck: now, updatedAt: now };
                localStorage.setItem(globalKey, JSON.stringify(globalData));

            } catch (e) {
                console.warn('⚠️ Failed to write global reset marker:', e);
            }
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

    /**
     * Show error state when generation has failed
     */
    function showErrorState(errorMessage, retryAfter) {
        const container = document.querySelector('.radio-program-container');
        if (!container) return;
        
        const retryTime = retryAfter ? new Date(retryAfter).toLocaleTimeString() : 'soon';
        
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Audio Generation Failed</h3>
                <p>There was a problem generating your radio program:</p>
                <div class="error-details">${errorMessage}</div>
                <p class="retry-info">You can try again after ${retryTime}</p>
                <button onclick="location.reload()" class="retry-button">Refresh Page</button>
            </div>
        `;
        
        console.log(`❌ Showing error state: ${errorMessage}`);
    }

    // Make functions available globally for testing
    window.RadioProgram = {
        showLoadingState,
        showPlayerState,
        showGeneratingState,
        showErrorState,
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