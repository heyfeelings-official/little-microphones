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
 * 
 * DEPENDENCIES: localStorage, DOM manipulation
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
     * Check if we're coming from survey completion
     */
    function isComingFromSurveyCompletion() {
        const urlParams = new URLSearchParams(window.location.search);
        const surveyParam = urlParams.get('survey');
        
        // Check URL parameter
        if (surveyParam === 'filled') {
            console.log('[Survey Completion] ✅ Detected survey=filled parameter');
            return true;
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
     * Ensure survey-filled element remains visible
     * This element must NEVER be hidden by green block hiding logic
     */
    function ensureSurveyFilledVisible() {
        const surveyFilledElement = document.getElementById(SURVEY_FILLED_ID);
        
        if (!surveyFilledElement) {
            console.log('[Survey Completion] ❌ Element with ID "survey-filled" not found');
            return;
        }
        
        console.log('[Survey Completion] 👁️ Ensuring survey-filled element remains visible');
        
        // Force visibility styles
        surveyFilledElement.style.display = 'block';
        surveyFilledElement.style.visibility = 'visible';
        surveyFilledElement.style.opacity = '1';
        
        // Add important class to prevent other scripts from hiding it
        surveyFilledElement.classList.add('survey-completion-protected');
        
        // Set up mutation observer to prevent other scripts from hiding this element
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.id === SURVEY_FILLED_ID) {
                        // Check if something tried to hide the element
                        if (target.style.display === 'none' || 
                            target.style.visibility === 'hidden' ||
                            target.style.opacity === '0') {
                            
                            console.log('[Survey Completion] 🛡️ Protecting survey-filled from being hidden');
                            target.style.display = 'block';
                            target.style.visibility = 'visible';
                            target.style.opacity = '1';
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
     * Set up survey completion UI state
     */
    function setupSurveyCompletionUI() {
        console.log('[Survey Completion] 🎉 Setting up survey completion UI');
        
        // Ensure survey-filled element is visible and protected
        ensureSurveyFilledVisible();
        
        // Handle grid wrapper elements
        handleGridExtraCardWrapper();
        
        // Add completion class to body for CSS targeting
        document.body.classList.add('survey-completed');
        
        // Set up interaction tracking
        setupInteractionTracking();
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
                    
                    // Optional: Clean up localStorage flag after user interaction
                    try {
                        localStorage.removeItem(SURVEY_COMPLETION_FLAG);
                        console.log('[Survey Completion] 🧹 Cleaned up survey completion flag');
                    } catch (e) {
                        console.warn('[Survey Completion] ⚠️ Could not clean up flag:', e);
                    }
                });
            });
            
            console.log(`[Survey Completion] 🖱️ Set up interaction tracking for ${buttons.length} button(s)`);
        }
    }
    
    /**
     * Initialize survey completion handler
     */
    function initSurveyCompletion() {
        console.log('[Survey Completion] 🚀 Initializing survey completion handler');
        
        // Check if we're coming from survey completion
        if (isComingFromSurveyCompletion()) {
            console.log('[Survey Completion] ✅ Survey completion detected, setting up UI');
            setupSurveyCompletionUI();
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
                setTimeout(initSurveyCompletion, 100);
            });
        } else {
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
        isCompleted: isComingFromSurveyCompletion
    };
    
})();