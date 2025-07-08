/**
 * radio.js - Universal Radio Program Page (Refactored)
 * 
 * PURPOSE: Main controller for ShareID-based radio program access and playback
 * DEPENDENCIES: Modular components for Player and API operations
 * DOCUMENTATION: See /documentation/radio.js.md for complete system overview
 * 
 * MODULAR ARCHITECTURE:
 * - radio-player.js: Professional audio player with controls and features
 * - radio-api.js: API communication and program generation
 * - Main radio.js: Page controller, UI updates, and user management
 * 
 * MAIN FUNCTIONS:
 * - ShareID extraction from URL parameters (?ID=shareId)
 * - Radio data fetching via modular API components
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
 * LAST UPDATED: January 2025
 * VERSION: 5.0.0 (Modular Refactor)
 * STATUS: Production Ready ✅
 */

(function() {
    'use strict';
    
    // Wait for dependencies to load
    function waitForDependencies(callback) {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        const checkDependencies = () => {
            if (window.RadioPlayer && window.RadioAPI) {
                callback();
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkDependencies, 100);
            } else {
                console.error('❌ Radio dependencies failed to load');
            }
        };
        
        checkDependencies();
    }
    
    // Main initialization after dependencies load
    waitForDependencies(() => {
        // Use global modules
        const {
            showAudioPlayer,
            setupAudioPlayerEvents,
            setupActionButtons,
            addPlayerStyles,
            setupKeyboardShortcuts,
            setupResponsiveHandlers,
            getAudioPlayer,
            isPlayerReady,
            resetPlayer
        } = window.RadioPlayer;

        const {
            fetchWorldInfo,
            fetchRadioData,
            generateNewProgram,
            convertRecordingsToAudioSegments,
            extractTimestampFromFilename,
            showExistingProgram,
            showGeneratedProgram,
            checkProgramStatus,
            validateRadioData,
            cancelGeneration,
            getGenerationStatus,
            retryOperation
        } = window.RadioAPI;

        // API Configuration
        if (typeof API_BASE_URL === 'undefined') {
            var API_BASE_URL = window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app';
        }

        // Global state management
        let currentRadioData = null;
        let currentShareId = null;
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
                
                // Stage 1: Fast initial load for UI
                showLoadingState('Loading world...');
                const worldInfo = await fetchWorldInfo(currentShareId);
                
                if (worldInfo) {
                    console.log('🌍 World info loaded:', worldInfo);
                    setWorldBackground(worldInfo.world);
                    updateWorldName(worldInfo.world);
                } else {
                    console.warn('Could not fetch world info early. Proceeding with main data fetch.');
                }

                // Stage 2: Full data load for radio program
                showLoadingState('Loading radio program...');
                
                currentRadioData = await fetchRadioData(currentShareId, worldInfo?.world);
                
                if (!currentRadioData) {
                    showError('Program Not Found', 'This radio program could not be found. The link may be expired or invalid.');
                    return;
                }
                
                // If fast load failed, update content now
                if (!worldInfo) {
                updatePageContent(currentRadioData);
                }
                
                // Check program status using intelligent detection
                const needsNewProgram = checkProgramStatus(currentRadioData);
                console.log(`🔍 Program status check: needsNewProgram=${needsNewProgram}`);
                
                if (needsNewProgram) {
                    console.log('🔄 New recordings detected or no existing program - generating...');
                    await handleProgramGeneration();
                } else if (currentRadioData.lastManifest && currentRadioData.lastManifest.programUrl) {
                    console.log('✅ Program is up to date - displaying existing program');
                    showExistingProgram(
                        currentRadioData.lastManifest, 
                        currentRadioData, 
                        (url, data, genFn) => showAudioPlayer(url, data, () => handleProgramGeneration()),
                        updatePageContent
                    );
                } else {
                    console.log('📝 No existing program found - generating initial program...');
                    await handleProgramGeneration();
                }
                
                // Setup additional UI elements and user flows
                setupRegistrationFlow();
                setupUIElements();
                setupKeyboardShortcuts();
                
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
         * Handle program generation with progress tracking
         */
        async function handleProgramGeneration() {
            if (isGenerating) {
                console.log('⏳ Generation already in progress...');
                return;
            }
            
            isGenerating = true;
            
            try {
                showLoadingState('Generating new radio program...');
                
                const result = await generateNewProgram(
                    currentRadioData,
                    updateProgress,
                    (url, data, genFn) => showAudioPlayer(url, data, () => handleProgramGeneration())
                );
                
                if (result.success) {
                    hideLoadingState();
                    showSuccessMessage('New radio program generated with latest recordings!');
                } else {
                    throw new Error(result.error || 'Generation failed');
                }
                
            } catch (error) {
                console.error('❌ Program generation failed:', error);
                hideLoadingState();
                showError('Generation Failed', `Failed to generate radio program: ${error.message}`);
            } finally {
                isGenerating = false;
            }
        }

        /**
         * Update world name in the UI
         * @param {string} world - World name
         */
        function updateWorldName(world) {
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
            console.log('🔧 Updating page content with radioData:', radioData);
            
            updateWorldName(radioData.world);
            setWorldBackground(radioData.world);
            
            const programInfoElement = document.getElementById('program-info');
            if (programInfoElement) {
                programInfoElement.innerHTML = `
                    <h2>${radioData.world} Radio Program</h2>
                    <p>Program ID: ${radioData.lmid}</p>
                    <p>Recordings: ${radioData.recordingCount}</p>
                `;
            }
            
            console.log(`📊 Program info updated: ${radioData.world}, LMID ${radioData.lmid}, ${radioData.recordingCount} recordings`);
        }

        /**
         * Setup registration flow for parents
         */
        function setupRegistrationFlow() {
            const memberstack = window.$memberstackDom;
            
            if (!memberstack) {
                console.log('📝 Memberstack not available - showing registration option');
                showRegistrationOption();
                return;
            }
            
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
                    console.error('Failed to check member status:', error);
                    showRegistrationOption(); // Show registration as fallback
                });
        }

        /**
         * Show registration option for non-logged users
         */
        function showRegistrationOption() {
            const registrationContainer = document.getElementById('registration-container');
            if (!registrationContainer) return;
            
            registrationContainer.innerHTML = `
                <div class="registration-banner">
                    <h3>👨‍👩‍👧‍👦 Are you a parent?</h3>
                    <p>Register to create your own Little Microphones program for your family!</p>
                    <button id="register-btn" class="register-button">Get Started - It's Free!</button>
                </div>
            `;
            
            const registerBtn = document.getElementById('register-btn');
            if (registerBtn) {
                registerBtn.addEventListener('click', handleRegistration);
            }
            
            registrationContainer.style.display = 'block';
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
         * Handle registration process
         */
        function handleRegistration() {
            const memberstack = window.$memberstackDom;
            
            if (!memberstack) {
                console.error('Memberstack not available for registration');
                showError('Registration Unavailable', 'Registration system is not available. Please try again later.');
                return;
            }
            
            // Pass ShareID as metadata during registration
            const registrationData = {
                shareId: currentShareId,
                referralWorld: currentRadioData?.world,
                referralLmid: currentRadioData?.lmid,
                registrationSource: 'radio_program'
            };
            
            console.log('📝 Starting registration with metadata:', registrationData);
            
                memberstack.openModal('signup', {
                data: registrationData
            });
        }

        /**
         * Setup additional UI elements
         */
        function setupUIElements() {
            addPlayerStyles();
            setupResponsiveHandlers();
            
            // Add custom styles for radio page
            addRadioPageStyles();
        }

        /**
         * Set world-specific background image
         * @param {string} world - World name
         */
        function setWorldBackground(world) {
            if (!world) return;
            
            console.log(`🎨 Setting background for world: ${world}`);
            
            const worldBackgrounds = {
                'spookyland': 'url("https://uploads-ssl.webflow.com/65d28fb2be0da08cfb03cb22/65f8a02fcb6b5a44a4f10754_spookyland-bg.jpg")',
                'christmas': 'url("https://uploads-ssl.webflow.com/65d28fb2be0da08cfb03cb22/65f8a02fcb6b5a44a4f10753_christmas-bg.jpg")',
                'default': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            };

            const backgroundImage = worldBackgrounds[world.toLowerCase()] || worldBackgrounds['default'];
            
            document.body.style.backgroundImage = backgroundImage;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
        }

        /**
         * Show loading state
         * @param {string} message - Loading message
         */
        function showLoadingState(message) {
            const loadingContainer = document.getElementById('loading-container') || createLoadingContainer();
            
            loadingContainer.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <h3>${message}</h3>
                    <div class="loading-progress">
                    <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <div class="progress-text" id="progress-text">0%</div>
                    </div>
                </div>
            `;
            
            loadingContainer.style.display = 'flex';
        }

        /**
         * Update progress during loading/generation
         * @param {string} message - Progress message
         * @param {number} percentage - Progress percentage (0-100)
         */
        function updateProgress(message, percentage) {
            const loadingContainer = document.getElementById('loading-container');
            if (!loadingContainer) return;
            
            const messageElement = loadingContainer.querySelector('h3');
            const progressFill = document.getElementById('progress-fill');
            const progressText = document.getElementById('progress-text');
            
            if (messageElement) messageElement.textContent = message;
            if (progressFill) progressFill.style.width = `${percentage}%`;
            if (progressText) progressText.textContent = `${percentage}%`;
        }

        /**
         * Hide loading state
         */
        function hideLoadingState() {
            const loadingContainer = document.getElementById('loading-container');
            if (loadingContainer) {
                loadingContainer.style.display = 'none';
            }
        }

        /**
         * Show error message
         * @param {string} title - Error title
         * @param {string} message - Error message
         */
        function showError(title, message) {
            hideLoadingState();
            
            const errorContainer = document.getElementById('error-container') || createErrorContainer();
            
            errorContainer.innerHTML = `
                <div class="error-content">
                    <div class="error-icon">⚠️</div>
                    <h2>${title}</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="retry-button">Try Again</button>
                </div>
            `;
            
            errorContainer.style.display = 'flex';
        }

        /**
         * Show success message
         * @param {string} message - Success message
         */
        function showSuccessMessage(message) {
            const notification = document.createElement('div');
            notification.className = 'success-notification';
            notification.textContent = message;
            
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
                animation: slideIn 0.3s ease-out;
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        /**
         * Create loading container
         */
        function createLoadingContainer() {
            const container = document.createElement('div');
            container.id = 'loading-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                font-family: Arial, sans-serif;
            `;
            document.body.appendChild(container);
            return container;
        }

        /**
         * Create error container
         */
        function createErrorContainer() {
            const container = document.createElement('div');
            container.id = 'error-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                font-family: Arial, sans-serif;
            `;
            document.body.appendChild(container);
            return container;
        }

        /**
         * Add custom styles for radio page
         */
        function addRadioPageStyles() {
            if (document.getElementById('radio-page-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'radio-page-styles';
            style.textContent = `
                .loading-content, .error-content {
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    text-align: center;
                    max-width: 400px;
                    margin: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                
                .loading-spinner {
                    width: 60px;
                    height: 60px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #007AF7;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }
                
                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background: #f0f0f0;
                    border-radius: 4px;
                    overflow: hidden;
                    margin: 20px 0 10px;
                }
                
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #007AF7, #00C6FB);
                    transition: width 0.3s ease;
                    width: 0%;
                }
                
                .error-icon {
                    font-size: 60px;
                    margin-bottom: 20px;
                }
                
                .retry-button, .register-button {
                    background: #007AF7;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background 0.3s ease;
                }
                
                .retry-button:hover, .register-button:hover {
                    background: #0056b3;
                }
                
                .registration-banner {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 15px;
                    text-align: center;
                    margin: 20px 0;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                
                .registration-banner h3 {
                    margin: 0 0 15px 0;
                    font-size: 24px;
                }
                
                .registration-banner p {
                    margin: 0 0 20px 0;
                    opacity: 0.9;
                    font-size: 16px;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                
                /* Responsive design */
                @media (max-width: 768px) {
                    .loading-content, .error-content, .registration-banner {
                        margin: 10px;
                        padding: 20px;
                    }
                    
                    .registration-banner h3 {
                        font-size: 20px;
                    }
                }
            `;
            
            document.head.appendChild(style);
        }

        // Global API for external access
        window.RadioSystem = {
            getCurrentRadioData: () => currentRadioData,
            getCurrentShareId: () => currentShareId,
            regenerateProgram: handleProgramGeneration,
            getGenerationStatus,
            cancelGeneration,
            
            // Module access
            player: {
                getAudioPlayer,
                isPlayerReady,
                resetPlayer
            },
            
            api: {
                fetchWorldInfo,
                fetchRadioData,
                checkProgramStatus
            }
        };

        console.log('✅ Radio system loaded and available globally'); 
    });
})(); 