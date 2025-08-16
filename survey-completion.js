/**
 * Survey Completion Handler
 * 
 * PURPOSE: Handle post-survey completion UI and element visibility
 * USAGE: <script src="https://little-microphones.vercel.app/survey-completion.js"></script>
 * 
 * FEATURES:
 * - Ensure survey-filled div remains visible after survey completion
 * - Prevent hiding of survey completion elements by other UI logic
 * - Handle grid-extra-card-wrapper visibility
 * - Manage survey completion state and user interaction
 * - Trigger confetti celebration animation on survey completion
 * - Immediate page reload on survey=filled parameter to refresh Memberstack data
 * - Allow user to hide survey via hide-survey button
 * 
 * DEPENDENCIES: localStorage, DOM manipulation, canvas-confetti (loaded dynamically)
 * VERSION: 1.0.0
 * LAST UPDATED: January 2025
 */

(function() {
    'use strict';
    
    console.log('[Survey Completion] Script v1.0.0 loaded');
    
    // Configuration
    const SURVEY_FILLED_ID = 'survey-filled';
    const GRID_EXTRA_CARD_WRAPPER_CLASS = 'grid-extra-card-wrapper';
    const SURVEY_COMPLETION_FLAG = 'educators_survey_completed';
    
    /**
     * Check if we're coming from survey completion and handle immediate reload
     */
    function isComingFromSurveyCompletion() {
        const urlParams = new URLSearchParams(window.location.search);
        const surveyParam = urlParams.get('survey');
        
        // Check URL parameter - if survey=filled, reload immediately to refresh Memberstack data
        if (surveyParam === 'filled') {
            console.log('[Survey Completion] ✅ Detected survey=filled parameter');
            
            // Check reload stages
            const firstReloadFlag = 'survey_filled_first_reload_done';
            const secondReloadFlag = 'survey_filled_second_reload_done';
            const entryFlag = 'survey_filled_entry_started';
            
            // If this is a completely fresh entry (no reload process flags at all)
            if (!sessionStorage.getItem(firstReloadFlag) && !sessionStorage.getItem(secondReloadFlag) && !sessionStorage.getItem(entryFlag)) {
                // Mark that we started the entry process to prevent clearing flags on subsequent reloads
                sessionStorage.setItem(entryFlag, 'true');
                
                // Clear all previous survey-related flags for fresh start
                sessionStorage.removeItem('survey_confetti_shown');
                localStorage.removeItem(SURVEY_COMPLETION_FLAG);
                localStorage.removeItem(SURVEY_HIDDEN_FLAG);
                console.log('[Survey Completion] 🧹 Fresh entry detected - cleared all previous survey flags');
            }
            
            if (!sessionStorage.getItem(firstReloadFlag)) {
                console.log('[Survey Completion] 🔄 First reload in 1s - refreshing Memberstack data');
                sessionStorage.setItem(firstReloadFlag, 'true');
                
                // Set localStorage flag to remember survey completion after reload
                localStorage.setItem(SURVEY_COMPLETION_FLAG, JSON.stringify({
                    timestamp: Date.now(),
                    source: 'survey_filled_parameter',
                    reloaded: true
                }));
                
                // First reload after 1 second (keep URL parameter for second reload)
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                return false; // Won't reach this due to reload
            } else if (!sessionStorage.getItem(secondReloadFlag)) {
                console.log('[Survey Completion] 🔄 Second reload in 1s - ensuring data is fully loaded');
                sessionStorage.setItem(secondReloadFlag, 'true');
                
                // Remove survey=filled parameter from URL after second reload
                const newUrl = new URL(window.location);
                newUrl.searchParams.delete('survey');
                
                // Second reload after 1 second with clean URL
                setTimeout(() => {
                    window.location.replace(newUrl.toString());
                }, 1000);
                return false; // Won't reach this due to reload
            } else {
                console.log('[Survey Completion] ✅ Both reloads completed, proceeding with survey completion');
                return true;
            }
        }
        
        // Check localStorage flag
        try {
            const surveyFlag = localStorage.getItem(SURVEY_COMPLETION_FLAG);
            if (surveyFlag) {
                const flagData = JSON.parse(surveyFlag);
                // Check if flag is recent (within last 10 minutes)
                if (Date.now() - flagData.timestamp < 10 * 60 * 1000) {
                    console.log('[Survey Completion] ✅ Detected recent survey completion flag');
                    return true;
                }
            }
        } catch (e) {
            console.warn('[Survey Completion] ⚠️ Could not parse survey flag:', e);
        }
        
        return false;
    }
    
    /**
     * Track if hide-survey button was clicked by user
     */
    let userRequestedHide = false;
    const SURVEY_HIDDEN_FLAG = 'survey_filled_hidden_by_user';
    
    /**
     * Set up hide-survey button functionality
     */
    function setupHideSurveyButton() {
        const hideSurveyButton = document.getElementById('hide-survey');
        
        if (!hideSurveyButton) {
            console.log('[Survey Completion] ❌ Hide survey button not found');
            return;
        }
        
        console.log('[Survey Completion] 🔘 Setting up hide-survey button');
        
        hideSurveyButton.addEventListener('click', function() {
            console.log('[Survey Completion] 🖱️ User clicked hide-survey button');
            
            const surveyFilledElement = document.getElementById(SURVEY_FILLED_ID);
            if (surveyFilledElement) {
                // Set flag that user requested hiding
                userRequestedHide = true;
                
                // Hide the element
                surveyFilledElement.style.display = 'none';
                surveyFilledElement.style.visibility = 'hidden';
                surveyFilledElement.style.opacity = '0';
                
                // Save permanent flag that user hid the survey
                try {
                    localStorage.setItem(SURVEY_HIDDEN_FLAG, JSON.stringify({
                        timestamp: Date.now(),
                        hidden: true
                    }));
                    console.log('[Survey Completion] 💾 Saved permanent hide flag');
                } catch (e) {
                    console.warn('[Survey Completion] ⚠️ Could not save hide flag:', e);
                }
                
                // Clean up localStorage flag since user dismissed the survey
                try {
                    localStorage.removeItem(SURVEY_COMPLETION_FLAG);
                    console.log('[Survey Completion] 🧹 Cleaned up survey completion flag after hide');
                } catch (e) {
                    console.warn('[Survey Completion] ⚠️ Could not clean up flag:', e);
                }
                
                console.log('[Survey Completion] 👁️ Survey-filled element hidden by user request');
            }
        });
    }
    
    /**
     * Ensure survey-filled element remains visible
     * This element must NEVER be hidden by green block hiding logic (but can be hidden by user)
     */
    function ensureSurveyFilledVisible() {
        const surveyFilledElement = document.getElementById(SURVEY_FILLED_ID);
        
        if (!surveyFilledElement) {
            console.log('[Survey Completion] ❌ Element with ID "survey-filled" not found');
            return;
        }
        
        console.log('[Survey Completion] 👁️ Ensuring survey-filled element remains visible');
        
        // Force visibility styles (only if user hasn't requested hiding)
        if (!userRequestedHide) {
            surveyFilledElement.style.display = 'block';
            surveyFilledElement.style.visibility = 'visible';
            surveyFilledElement.style.opacity = '1';
        }
        
        // Add important class to prevent other scripts from hiding it
        surveyFilledElement.classList.add('survey-completion-protected');
        
        // Set up mutation observer to prevent other scripts from hiding this element
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.id === SURVEY_FILLED_ID) {
                        // Only protect if user hasn't requested hiding
                        if (!userRequestedHide) {
                            // Check if something tried to hide the element
                            if (target.style.display === 'none' || 
                                target.style.visibility === 'hidden' ||
                                target.style.opacity === '0') {
                                
                                console.log('[Survey Completion] 🛡️ Protecting survey-filled from being hidden by other scripts');
                                target.style.display = 'block';
                                target.style.visibility = 'visible';
                                target.style.opacity = '1';
                            }
                        }
                    }
                }
            });
        });
        
        // Start observing
        observer.observe(surveyFilledElement, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        
        console.log('[Survey Completion] 🛡️ Protection observer set up for survey-filled element');
    }
    
    /**
     * Handle grid-extra-card-wrapper visibility
     */
    function handleGridExtraCardWrapper() {
        const wrapperElements = document.querySelectorAll(`.${GRID_EXTRA_CARD_WRAPPER_CLASS}`);
        
        if (wrapperElements.length === 0) {
            console.log('[Survey Completion] ❌ No elements with class "grid-extra-card-wrapper" found');
            return;
        }
        
        console.log(`[Survey Completion] 📋 Found ${wrapperElements.length} grid-extra-card-wrapper element(s)`);
        
        wrapperElements.forEach((element, index) => {
            console.log(`[Survey Completion] 📋 Processing grid-extra-card-wrapper #${index + 1}`);
            
            // Ensure visibility for survey completion
            element.style.display = 'block';
            element.style.visibility = 'visible';
            element.classList.add('survey-completion-active');
        });
    }
    
    /**
     * Load canvas-confetti library if not already loaded
     */
    function loadConfettiLibrary() {
        return new Promise((resolve, reject) => {
            // Check if confetti is already loaded
            if (typeof window.confetti !== 'undefined') {
                resolve();
                return;
            }
            
            // Load canvas-confetti from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
            script.onload = () => {
                console.log('[Survey Completion] 📚 Canvas-confetti library loaded');
                resolve();
            };
            script.onerror = () => {
                console.warn('[Survey Completion] ⚠️ Failed to load canvas-confetti library');
                reject(new Error('Failed to load confetti library'));
            };
            document.head.appendChild(script);
        });
    }
    
    /**
     * Create and trigger confetti celebration using canvas-confetti library
     */
    async function triggerConfettiCelebration() {
        console.log('[Survey Completion] 🎊 Triggering confetti celebration');
        
        try {
            // Load confetti library if needed
            await loadConfettiLibrary();
            
            // Check if confetti is available
            if (typeof window.confetti === 'undefined') {
                console.warn('[Survey Completion] ⚠️ Confetti library not available, using fallback');
                triggerFallbackConfetti();
                return;
            }
            
            // Create multiple confetti bursts with different configurations
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];
            
            // First burst - from center
            window.confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: colors
            });
            
            // Second burst - from left
            setTimeout(() => {
                window.confetti({
                    particleCount: 50,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: 0.8 },
                    colors: colors
                });
            }, 200);
            
            // Third burst - from right
            setTimeout(() => {
                window.confetti({
                    particleCount: 50,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: 0.8 },
                    colors: colors
                });
            }, 400);
            
        } catch (error) {
            console.warn('[Survey Completion] ⚠️ Error with confetti library:', error);
            triggerFallbackConfetti();
        }
    }
    
    /**
     * Fallback confetti implementation (CSS-based)
     */
    function triggerFallbackConfetti() {
        console.log('[Survey Completion] 🎊 Using fallback confetti animation');
        
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];
        const confettiCount = 100;
        const confettiElements = [];
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background-color: ${colors[Math.floor(Math.random() * colors.length)]};
                top: -10px;
                left: ${Math.random() * 100}vw;
                z-index: 9999;
                pointer-events: none;
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                animation: confetti-fall ${3 + Math.random() * 2}s linear forwards;
            `;
            
            document.body.appendChild(confetti);
            confettiElements.push(confetti);
        }
        
        // Inject CSS animation if not already present
        if (!document.getElementById('confetti-styles')) {
            const style = document.createElement('style');
            style.id = 'confetti-styles';
            style.textContent = `
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(-10px) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Clean up confetti after animation
        setTimeout(() => {
            confettiElements.forEach(confetti => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            });
        }, 5000);
    }
    

    
    /**
     * Set up survey completion UI state
     */
    function setupSurveyCompletionUI() {
        console.log('[Survey Completion] 🎉 Setting up survey completion UI');
        
        // Set up hide-survey button first (before protection)
        setupHideSurveyButton();
        
        // Trigger confetti celebration only if not shown in this session
        const confettiShownThisSession = sessionStorage.getItem('survey_confetti_shown');
        
        if (!confettiShownThisSession) {
            console.log('[Survey Completion] 🎊 Triggering confetti (first time this session)');
            sessionStorage.setItem('survey_confetti_shown', 'true');
            setTimeout(triggerConfettiCelebration, 500);
        } else {
            console.log('[Survey Completion] 🎊 Skipping confetti (already shown this session)');
        }
        
        // Ensure survey-filled element is visible and protected
        ensureSurveyFilledVisible();
        
        // Handle grid wrapper elements
        handleGridExtraCardWrapper();
        
        // Add completion class to body for CSS targeting
        document.body.classList.add('survey-completed');
        
        // Set up interaction tracking
        setupInteractionTracking();
        
        // Note: Page reload now happens immediately on detection of survey=filled parameter
        // No need for delayed reload here since it's handled in isComingFromSurveyCompletion()
    }
    
    /**
     * Set up interaction tracking for survey completion elements
     */
    function setupInteractionTracking() {
        const surveyFilledElement = document.getElementById(SURVEY_FILLED_ID);
        
        if (surveyFilledElement) {
            // Find buttons within the survey-filled element
            const buttons = surveyFilledElement.querySelectorAll('button, [role="button"], .button, a');
            
            buttons.forEach(button => {
                button.addEventListener('click', function() {
                    console.log('[Survey Completion] 🖱️ User clicked survey completion button');
                    
                    // User has interacted with the survey completion element
                    // This might trigger navigation or other actions
                    
                    // Optional: Clean up flags after user interaction
                    try {
                        localStorage.removeItem(SURVEY_COMPLETION_FLAG);
                        sessionStorage.removeItem('survey_confetti_shown');
                        console.log('[Survey Completion] 🧹 Cleaned up survey completion and confetti flags');
                    } catch (e) {
                        console.warn('[Survey Completion] ⚠️ Could not clean up flags:', e);
                    }
                });
            });
            
            console.log(`[Survey Completion] 🖱️ Set up interaction tracking for ${buttons.length} button(s)`);
        }
    }
    
    /**
     * Check if user previously hid the survey and hide it immediately
     */
    function checkIfSurveyHiddenByUser() {
        try {
            const hiddenFlag = localStorage.getItem(SURVEY_HIDDEN_FLAG);
            if (hiddenFlag) {
                const flagData = JSON.parse(hiddenFlag);
                if (flagData.hidden === true) {
                    console.log('[Survey Completion] 🚫 User previously hid survey, keeping it hidden');
                    userRequestedHide = true;
                    
                    // Immediately hide the element if it exists
                    const surveyFilledElement = document.getElementById(SURVEY_FILLED_ID);
                    if (surveyFilledElement) {
                        surveyFilledElement.style.display = 'none';
                        surveyFilledElement.style.visibility = 'hidden';
                        surveyFilledElement.style.opacity = '0';
                        console.log('[Survey Completion] 👁️ Hidden survey-filled element based on user preference');
                    }
                    
                    return true;
                }
            }
        } catch (e) {
            console.warn('[Survey Completion] ⚠️ Could not parse hide flag:', e);
        }
        return false;
    }
    
    /**
     * Initialize survey completion handler
     */
    function initSurveyCompletion() {
        console.log('[Survey Completion] 🚀 Initializing survey completion handler');
        
        // Check if user previously hid the survey
        const wasPreviouslyHidden = checkIfSurveyHiddenByUser();
        
        // Always set up hide-survey button (regardless of completion state)
        setupHideSurveyButton();
        
        // Only show survey completion if user hasn't hidden it
        if (!wasPreviouslyHidden && isComingFromSurveyCompletion()) {
            console.log('[Survey Completion] ✅ Survey completion detected, setting up UI');
            setupSurveyCompletionUI();
        } else if (wasPreviouslyHidden) {
            console.log('[Survey Completion] 🚫 Survey was hidden by user, not showing');
        } else {
            console.log('[Survey Completion] ℹ️ No survey completion detected, handler ready');
        }
    }
    
    /**
     * Wait for DOM to be ready and initialize
     */
    function waitForDOMAndInitialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // Check immediately if survey was hidden by user (before any other initialization)
                checkIfSurveyHiddenByUser();
                setTimeout(initSurveyCompletion, 100);
            });
        } else {
            // Check immediately if survey was hidden by user (before any other initialization)
            checkIfSurveyHiddenByUser();
            setTimeout(initSurveyCompletion, 100);
        }
    }
    
    // Initialize when script loads
    waitForDOMAndInitialize();
    
    // Expose functions globally for debugging
    window.SurveyCompletion = {
        init: initSurveyCompletion,
        ensureVisible: ensureSurveyFilledVisible,
        handleWrapper: handleGridExtraCardWrapper,
        isCompleted: isComingFromSurveyCompletion,
        triggerConfetti: triggerConfettiCelebration,
        setupHideButton: setupHideSurveyButton,
        hideSurvey: () => {
            userRequestedHide = true;
            const element = document.getElementById(SURVEY_FILLED_ID);
            if (element) {
                element.style.display = 'none';
                element.style.visibility = 'hidden';
                element.style.opacity = '0';
            }
        },
        clearHideFlag: () => {
            localStorage.removeItem(SURVEY_HIDDEN_FLAG);
            userRequestedHide = false;
            console.log('[Survey Completion] 🧹 Cleared hide flag - survey can show again');
        },
        clearAllFlags: () => {
            // Clear all sessionStorage flags
            sessionStorage.removeItem('survey_filled_first_reload_done');
            sessionStorage.removeItem('survey_filled_second_reload_done');
            sessionStorage.removeItem('survey_filled_entry_started');
            sessionStorage.removeItem('survey_confetti_shown');
            
            // Clear all localStorage flags
            localStorage.removeItem(SURVEY_COMPLETION_FLAG);
            localStorage.removeItem(SURVEY_HIDDEN_FLAG);
            
            // Reset user hide state
            userRequestedHide = false;
            
            console.log('[Survey Completion] 🧹 Cleared ALL survey flags - ready for fresh start');
        },
        checkHidden: checkIfSurveyHiddenByUser
    };
    
})();