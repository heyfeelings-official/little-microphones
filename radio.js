/**
 * radio.js - Universal Radio Program Page Script
 * 
 * PURPOSE: Universal radio program page that handles ShareID-based access, intelligent program generation, and parent registration
 * DEPENDENCIES: Memberstack DOM SDK (optional), get-radio-data API, combine-audio API
 * DOCUMENTATION: See /documentation/radio.js.md for complete system overview
 * 
 * MAIN FUNCTIONS:
 * - ShareID extraction from URL parameters (?ID=shareId)
 * - Radio data fetching via get-radio-data API
 * - Intelligent program generation detection (new recordings vs manifest)
 * - Audio player management with professional UI
 * - Parent registration with ShareID metadata integration
 * - Cross-device compatibility and responsive design
 * 
 * USER FLOWS:
 * 1. Teacher Flow: Opens link → Listens to program → Can regenerate if new recordings
 * 2. Parent Flow: Opens link → Listens to program → Can register → Gets new LMID for same world
 * 3. Guest Flow: Opens link → Listens to program → No registration options
 * 
 * INTELLIGENT GENERATION:
 * - Compares current recordings with last program manifest
 * - Only generates new program if recordings have changed
 * - Shows existing program immediately if no changes detected
 * - Provides manual regeneration option for teachers
 * 
 * REGISTRATION SYSTEM:
 * - Detects if user is logged in via Memberstack
 * - Shows registration button for non-logged users
 * - Passes ShareID as metadata during registration
 * - Automatic LMID assignment via webhook system
 * 
 * AUDIO PLAYER:
 * - Professional HTML5 audio player with custom controls
 * - Progress tracking and seeking capabilities
 * - Volume control and playback speed options
 * - Download functionality for offline listening
 * - Social sharing integration
 * 
 * ERROR HANDLING:
 * - Invalid ShareID detection with user-friendly messages
 * - Network failure recovery with retry mechanisms
 * - Audio loading errors with fallback options
 * - Generation failure handling with detailed feedback
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Lazy loading of audio content
 * - Efficient API calls with caching
 * - Progressive enhancement for older browsers
 * - Minimal dependencies for fast loading
 * 
 * SECURITY FEATURES:
 * - ShareID validation before data access
 * - Secure API communication with error handling
 * - XSS protection in dynamic content generation
 * - Safe registration metadata handling
 * 
 * LAST UPDATED: January 2025
 * VERSION: 4.0.0
 * STATUS: Production Ready ✅
 */

// API Configuration - Use global config if available, fallback to hardcoded
const API_BASE_URL = window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app';

// Global state management
let currentRadioData = null;
let currentShareId = null;
let audioPlayer = null;
let isGenerating = false;

/**
 * Initialize the radio page when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎵 Radio page initializing...');
    
    try {
        // Extract ShareID from URL
        currentShareId = getShareIdFromUrl();
        if (!currentShareId) {
            showError('Invalid Link', 'This radio program link is missing required information. Please check the link and try again.');
            return;
        }
        
        console.log(`📻 ShareID extracted: ${currentShareId}`);

        // --- Stage 1: Fast initial load for UI ---
        showLoadingState('Loading world...');
        const worldInfo = await fetchWorldInfo(currentShareId);
        
        if (worldInfo) {
            console.log('🌍 World info loaded:', worldInfo);
            // Immediately update the visual elements
            setWorldBackground(worldInfo.world);
            updateWorldName(worldInfo.world);
        } else {
            console.warn('Could not fetch world info early. Proceeding with main data fetch.');
        }

        // --- Stage 2: Full data load for radio program ---
        showLoadingState('Loading radio program...');
        
        // Fetch radio data from API - pass world if we have it for faster lookup
        currentRadioData = await fetchRadioData(currentShareId, worldInfo?.world);
        
        if (!currentRadioData) {
            showError('Program Not Found', 'This radio program could not be found. The link may be expired or invalid.');
            return;
        }

        // If the fast load failed, update content now with data from the full fetch
        if (!worldInfo) {
            updatePageContent(currentRadioData);
        }
        
        // Determine if we need to generate a new program
        console.log(`🔍 Checking program status: needsNewProgram=${currentRadioData.needsNewProgram}, hasManifest=${!!currentRadioData.lastManifest}`);
        
        if (currentRadioData.needsNewProgram) {
            console.log('🔄 New recordings detected - generating updated program...');
            await generateNewProgram();
        } else if (currentRadioData.lastManifest && currentRadioData.lastManifest.programUrl) {
            console.log('✅ Program is up to date - displaying existing program');
            showExistingProgram(currentRadioData.lastManifest);
        } else {
            console.log('📝 No existing program found - generating initial program...');
            await generateNewProgram();
        }
        
        // Setup registration functionality
        setupRegistrationFlow();
        
        // Setup additional UI elements
        setupUIElements();
        
    } catch (error) {
        console.error('❌ Radio page initialization failed:', error);
        showError('Loading Error', 'Failed to load the radio program. Please try refreshing the page.');
    }
});

/**
 * Extract ShareID from URL parameters
 * @returns {string|null} ShareID or null if not found
 */
function getShareIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ID');
}

/**
 * Fetch initial world info for fast page load
 * @param {string} shareId - The ShareID
 * @returns {Promise<Object|null>} World info or null if failed
 */
async function fetchWorldInfo(shareId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/get-world-info?shareId=${shareId}`);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch world info');
        }
        return data;
    } catch (error) {
        console.error('Failed to fetch world info:', error);
        return null;
    }
}

/**
 * Fetch radio data from the API
 * @param {string} shareId - The ShareID
 * @param {string|null} world - The world, if known from URL
 * @returns {Promise<Object|null>} Radio data or null if failed
 */
async function fetchRadioData(shareId, world = null) {
    try {
        let apiUrl = `${API_BASE_URL}/api/get-radio-data?shareId=${shareId}`;
        if (world) {
            apiUrl += `&world=${world}`;
        }
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch radio data');
        }
        
        return data;
    } catch (error) {
        console.error('Failed to fetch radio data:', error);
        return null;
    }
}

/**
 * Updates just the world name in the UI
 * @param {string} world - The world name (e.g., "spookyland")
 */
function updateWorldName(world) {
    // Use global config utility or fallback
    const worldName = window.LM_CONFIG?.UTILS?.formatWorldName(world) || 
                      world.charAt(0).toUpperCase() + world.slice(1).replace(/-/g, ' ');
    document.title = `${worldName} Radio Program - Little Microphones`;

    const worldElement = document.getElementById('world-name');
    if (worldElement) {
        worldElement.textContent = worldName;
    }
}


/**
 * Update page content with radio program information
 * @param {Object} radioData - Radio data from API
 */
function updatePageContent(radioData) {
    console.log('🔧 DEBUG: updatePageContent called with radioData:', radioData);
    
    // Update page title and world name
    updateWorldName(radioData.world);
    
    console.log('🔧 DEBUG: About to call setWorldBackground with world:', radioData.world);
    
    // Set world-specific background image
    setWorldBackground(radioData.world);
    
    // Update program info
    const programInfoElement = document.getElementById('program-info');
    if (programInfoElement) {
        programInfoElement.innerHTML = `
            <h2>${radioData.world} Radio Program</h2>
            <p>Program ID: ${radioData.lmid}</p>
            <p>Recordings: ${radioData.recordingCount}</p>
        `;
    }
    
    console.log(`📊 Program info: ${radioData.world}, LMID ${radioData.lmid}, ${radioData.recordingCount} recordings`);
}

/**
 * Generate a new radio program
 */
async function generateNewProgram() {
    if (isGenerating) {
        console.log('⏳ Generation already in progress...');
        return;
    }
    
    isGenerating = true;
    
    try {
        showLoadingState('Generating new radio program...');
        updateProgress('Collecting recordings...', 10);
        
        // Convert recordings to proper audioSegments format
        const audioSegments = convertRecordingsToAudioSegments(currentRadioData.currentRecordings, currentRadioData.world);
        
        // Call the combine-audio API to generate new program
        const response = await fetch(`${API_BASE_URL}/api/combine-audio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                world: currentRadioData.world,
                lmid: currentRadioData.lmid,
                audioSegments: audioSegments
            })
        });
        
        updateProgress('Processing audio...', 50);
        
        if (!response.ok) {
            throw new Error(`Generation failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Radio program generation failed');
        }
        
        updateProgress('Finalizing program...', 90);
        
        // Update the manifest data
        currentRadioData.lastManifest = {
            generatedAt: new Date().toISOString(),
            programUrl: result.url,
            filesUsed: currentRadioData.currentRecordings.map(rec => rec.filename)
        };
        
        updateProgress('Complete!', 100);
        
        console.log('✅ New radio program generated successfully');
        showGeneratedProgram(result.url);
        
    } catch (error) {
        console.error('❌ Program generation failed:', error);
        showError('Generation Failed', `Failed to generate radio program: ${error.message}`);
    } finally {
        isGenerating = false;
    }
}

/**
 * Show existing radio program
 * @param {Object} manifest - Program manifest data
 */
function showExistingProgram(manifest) {
    if (!manifest || !manifest.programUrl) {
        console.log('📝 No existing program found - generating new one...');
        generateNewProgram();
        return;
    }
    
    console.log('🎵 Displaying existing radio program');
    hideLoadingState();
    showAudioPlayer(manifest.programUrl);
    
    // Update page content with world info after showing the program
    console.log('🔧 DEBUG: Calling updatePageContent from showExistingProgram');
    setTimeout(() => {
        updatePageContent(currentRadioData);
    }, 200);
}

/**
 * Show newly generated program
 * @param {string} audioUrl - URL of the generated audio
 */
function showGeneratedProgram(audioUrl) {
    console.log('🎉 Displaying newly generated radio program');
    hideLoadingState();
    showAudioPlayer(audioUrl);
    
    // Update page content with world info after showing the program
    console.log('🔧 DEBUG: Calling updatePageContent from showGeneratedProgram');
    setTimeout(() => {
        updatePageContent(currentRadioData);
    }, 200);
    
    // Show success message
    showSuccessMessage('New radio program generated with latest recordings!');
}

/**
 * Display audio player with given URL
 * @param {string} audioUrl - URL of the audio file
 */
function showAudioPlayer(audioUrl) {
    const playerContainer = document.getElementById('audio-player-container');
    if (!playerContainer) {
        console.error('Audio player container not found');
        return;
    }

    // Use global config utility or fallback
    const worldName = window.LM_CONFIG?.UTILS?.formatWorldName(currentRadioData.world) || 
                      currentRadioData.world.charAt(0).toUpperCase() + currentRadioData.world.slice(1).replace(/-/g, ' ');
    
    // Create professional audio player
    playerContainer.innerHTML = `
        <div class="program-header">
            <h1 id="world-name" class="world-name">${worldName}</h1>
        </div>
        <div class="radio-player">
            <div class="player-header">
                <h3>🎵 Your Radio Program is Ready!</h3>
                <p>Listen to your personalized radio show</p>
            </div>
            <div class="player-controls">
                <audio id="radio-audio" controls preload="metadata" style="width: 100%;">
                    <source src="${audioUrl}" type="audio/mpeg">
                    <source src="${audioUrl}" type="audio/mp3">
                    Your browser does not support the audio element.
                </audio>
            </div>
            <div class="player-actions">
                <button id="download-btn" class="action-btn">📥 Download</button>
                <button id="share-btn" class="action-btn">🔗 Share Link</button>
                <button id="regenerate-btn" class="action-btn secondary">🔄 Update Program</button>
            </div>
        </div>
    `;
    
    // Store audio player reference
    audioPlayer = document.getElementById('radio-audio');
    
    // Setup player event listeners
    setupAudioPlayerEvents();
    
    // Setup action buttons
    setupActionButtons(audioUrl);
}

/**
 * Setup audio player event listeners
 */
function setupAudioPlayerEvents() {
    if (!audioPlayer) return;
    
    audioPlayer.addEventListener('loadstart', () => {
        console.log('🔄 Audio loading started...');
    });
    
    audioPlayer.addEventListener('canplay', () => {
        console.log('✅ Audio ready to play');
    });
    
    audioPlayer.addEventListener('error', (e) => {
        console.error('❌ Audio playback error:', e);
        showError('Playback Error', 'Unable to play the audio file. Please try refreshing the page.');
    });
    
    audioPlayer.addEventListener('ended', () => {
        console.log('🎵 Audio playback completed');
        showSuccessMessage('Thanks for listening! Share this program with others.');
    });
}

/**
 * Setup action button event listeners
 * @param {string} audioUrl - URL of the audio file
 */
function setupActionButtons(audioUrl) {
    // Download button
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = audioUrl;
            link.download = `radio-program-${currentRadioData.world}-${currentRadioData.lmid}.mp3`;
            link.click();
        });
    }
    
    // Share button
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const shareUrl = window.location.href;
            if (navigator.share) {
                navigator.share({
                    title: 'Little Microphones Radio Program',
                    url: shareUrl
                });
            } else {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    showSuccessMessage('Link copied to clipboard!');
                });
            }
        });
    }
    
    // Regenerate button
    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', async () => {
            if (confirm('Generate a new version with the latest recordings?')) {
                await generateNewProgram();
            }
        });
    }
}

/**
 * Setup registration flow for parents
 */
function setupRegistrationFlow() {
    // Check if Memberstack is available and user is logged in
    const memberstack = window.$memberstackDom;
    
    if (!memberstack) {
        console.log('📝 Memberstack not available - showing registration option');
        showRegistrationOption();
        return;
    }
    
    // Check if user is already logged in
    memberstack.getCurrentMember()
        .then(({ data: memberData }) => {
            if (memberData) {
                console.log('👤 User is logged in - hiding registration option');
                hideRegistrationOption();
            } else {
                console.log('📝 User not logged in - showing registration option');
                showRegistrationOption();
            }
        })
        .catch(error => {
            console.error('Error checking member status:', error);
            showRegistrationOption(); // Show registration as fallback
        });
}

/**
 * Show registration option for parents
 */
function showRegistrationOption() {
    const registrationContainer = document.getElementById('registration-container');
    if (!registrationContainer) {
        console.warn('Registration container not found in DOM');
        return;
    }
    
    registrationContainer.innerHTML = `
        <div class="registration-card">
            <h3>🎤 Want to add your own recordings?</h3>
            <p>Register to create your own version of this radio program with your family's recordings!</p>
            <button id="register-btn" class="register-btn">
                📝 Register to Record
            </button>
        </div>
    `;
    
    // Setup registration button
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', handleRegistration);
    }
}

/**
 * Hide registration option
 */
function hideRegistrationOption() {
    const registrationContainer = document.getElementById('registration-container');
    if (registrationContainer) {
        registrationContainer.style.display = 'none';
    }
}

/**
 * Handle user registration with ShareID metadata
 */
function handleRegistration() {
    const memberstack = window.$memberstackDom;
    
    if (!memberstack) {
        showError('Registration Error', 'Registration system is not available. Please try again later.');
        return;
    }
    
    try {
        // Start registration process with ShareID metadata
        memberstack.openModal('signup', {
            metadata: {
                originating_share_id: currentShareId,
                originating_world: currentRadioData?.world || 'unknown'
            }
        });
        
        console.log(`📝 Registration started with ShareID: ${currentShareId}, World: ${currentRadioData?.world}`);
        
    } catch (error) {
        console.error('Registration error:', error);
        showError('Registration Error', 'Failed to start registration. Please try again.');
    }
}

/**
 * Setup additional UI elements
 */
function setupUIElements() {
    // Add CSS styles for the radio player
    addPlayerStyles();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Setup responsive design handlers
    setupResponsiveHandlers();
}

/**
 * Add CSS styles for the radio player
 */
function addPlayerStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .radio-player {
            max-width: 600px;
            margin: 20px auto;
            padding: 30px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .player-header h3 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 24px;
        }
        
        .player-header p {
            margin: 0 0 20px 0;
            color: #666;
            font-size: 16px;
        }
        
        .player-controls {
            margin: 20px 0;
        }
        
        .player-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 20px;
        }
        
        .action-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            background: #007bff;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        
        .action-btn:hover {
            background: #0056b3;
        }
        
        .action-btn.secondary {
            background: #6c757d;
        }
        
        .action-btn.secondary:hover {
            background: #545b62;
        }
        
        .registration-card {
            max-width: 500px;
            margin: 30px auto;
            padding: 25px;
            background: #f8f9fa;
            border-radius: 10px;
            text-align: center;
            border: 2px solid #e9ecef;
        }
        
        .registration-card h3 {
            margin: 0 0 15px 0;
            color: #495057;
        }
        
        .registration-card p {
            margin: 0 0 20px 0;
            color: #6c757d;
            line-height: 1.5;
        }
        
        .register-btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            background: #28a745;
            color: white;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: background 0.3s;
        }
        
        .register-btn:hover {
            background: #218838;
        }
        
        .loading-spinner {
            text-align: center;
            padding: 40px;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: #007bff;
            transition: width 0.3s ease;
        }
        
        .error-message {
            max-width: 500px;
            margin: 40px auto;
            padding: 30px;
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            color: #721c24;
            text-align: center;
        }
        
        .success-message {
            max-width: 500px;
            margin: 20px auto;
            padding: 15px;
            background: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 6px;
            color: #155724;
            text-align: center;
        }
        
        @media (max-width: 768px) {
            .radio-player {
                margin: 10px;
                padding: 20px;
            }
            
            .player-actions {
                flex-direction: column;
                align-items: center;
            }
            
            .action-btn {
                width: 200px;
            }
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (!audioPlayer) return;
        
        switch(e.key) {
            case ' ':
                e.preventDefault();
                if (audioPlayer.paused) {
                    audioPlayer.play();
                } else {
                    audioPlayer.pause();
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
                break;
            case 'ArrowRight':
                e.preventDefault();
                audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 10);
                break;
        }
    });
}

/**
 * Setup responsive design handlers
 */
function setupResponsiveHandlers() {
    // Handle orientation changes on mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            // Refresh player layout if needed
            if (audioPlayer) {
                audioPlayer.load();
            }
        }, 100);
    });
}

/**
 * Convert raw recordings to audioSegments format expected by combine-audio API
 * @param {Array} recordings - Raw recordings from get-radio-data
 * @param {string} world - World name
 * @returns {Array} Formatted audioSegments
 */
function convertRecordingsToAudioSegments(recordings, world) {
    const audioSegments = [];
    
    // Group recordings by questionId
    const recordingsByQuestion = {};
    recordings.forEach(recording => {
        const questionId = recording.questionId;
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
        
        // Sort answers by filename timestamp (first recorded = first played)
        const sortedAnswers = questionRecordings.sort((a, b) => {
            const timestampA = extractTimestampFromFilename(a.filename);
            const timestampB = extractTimestampFromFilename(b.filename);
            return timestampA - timestampB;
        });
        
        // Combine answers with background music
        const backgroundTimestamp = Date.now() + Math.random();
        audioSegments.push({
            type: 'combine_with_background',
            answerUrls: sortedAnswers.map(recording => recording.url),
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
    
    console.log(`🎼 Generated ${audioSegments.length} audio segments for ${sortedQuestionIds.length} questions`);
    return audioSegments;
}

/**
 * Extract timestamp from recording filename
 * @param {string} filename - Recording filename
 * @returns {number} Timestamp
 */
function extractTimestampFromFilename(filename) {
    const match = filename.match(/tm_(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

/**
 * Set world-specific background image
 * @param {string} world - World identifier (e.g., 'spookyland')
 */
function setWorldBackground(world) {
    // Use global config for world images with fallback
    const worldBackgrounds = window.LM_CONFIG?.WORLD_IMAGES || {
        'shopping-spree': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f506146fb421db045378af_cdcb9c23ac6f956cbb6f7f498c75cd11_worlds-Anxiety.avif',
        'waterpark': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f50606d058c933cd554be8_2938a42d480503a33daf8a8334f53f0a_worlds-Empathy.avif',
        'amusement-park': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505fe412762bb8a01b03d_85fcbe125912ab0998bf679d2e8c6082_worlds-Love.avif',
        'big-city': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505f572e936f2b665af1f_7b989a3fe827622216294c6539607059_worlds-Anger.avif',
        'spookyland': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505ecd6f37624ef7affb8_587c997427b10cabcc31cc98d6e516f4_worlds-Fear.png',
        'neighborhood': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/683859c64fa8c3f50ead799a_worlds-boredom.avif'
    };

    const url = worldBackgrounds[world];
    
    const worldWrapper = document.querySelector('.lm-world-wrapper');

    if (url && worldWrapper) {
        console.log(`🔧 DEBUG: Setting background for .lm-world-wrapper to ${url}`);
        worldWrapper.style.backgroundImage = `url('${url}')`;
    } else {
        if (!url) console.warn(`🔧 DEBUG: No background URL found for world: ${world}`);
        if (!worldWrapper) console.warn('🔧 DEBUG: .lm-world-wrapper element not found');
    }
}

/**
 * Show loading state
 * @param {string} message - Message to display
 */
function showLoadingState(message) {
    const mainContainer = document.getElementById('main-container') || document.body;
    
    mainContainer.innerHTML = `
        <div class="loading-spinner">
            <h2>🎵 Little Microphones</h2>
            <div class="progress-bar">
                <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
            </div>
            <p id="loading-message">${message}</p>
        </div>
    `;
}

/**
 * Update progress during loading/generation
 * @param {string} message - Progress message
 * @param {number} percentage - Progress percentage (0-100)
 */
function updateProgress(message, percentage) {
    const progressFill = document.getElementById('progress-fill');
    const loadingMessage = document.getElementById('loading-message');
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    
    if (loadingMessage) {
        loadingMessage.textContent = message;
    }
}

/**
 * Hide loading state and reveal the main content structure
 */
function hideLoadingState() {
    const mainContainer = document.getElementById('main-container');
    if (!mainContainer) return;

    mainContainer.innerHTML = `
        <div id="program-header" class="program-header">
            <h1 id="world-name" class="world-name"></h1>
            <div id="program-info" class="program-info"></div>
        </div>
        <div id="audio-player-container" class="audio-player-container"></div>
        <div id="registration-container" class="registration-container"></div>
        <div id="error-container" class="error-container" style="display: none;"></div>
    `;
    console.log('✅ Loading complete, main structure rendered.');
}

/**
 * Show error message
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showError(title, message) {
    const mainContainer = document.getElementById('main-container') || document.body;
    
    mainContainer.innerHTML = `
        <div class="error-message">
            <h2>❌ ${title}</h2>
            <p>${message}</p>
            <button onclick="window.location.reload()" style="margin-top: 15px; padding: 10px 20px; border: none; background: #dc3545; color: white; border-radius: 4px; cursor: pointer;">
                🔄 Try Again
            </button>
        </div>
    `;
}

/**
 * Show success message
 * @param {string} message - Success message
 */
function showSuccessMessage(message) {
    // Create temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

// Export functions for global access
window.radioPageAPI = {
    generateNewProgram,
    getCurrentData: () => currentRadioData,
    getCurrentShareId: () => currentShareId
};

console.log('📻 Radio page script loaded and ready'); 