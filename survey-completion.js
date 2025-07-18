/**
 * Survey Completion Handler - Canvas Confetti + Memberstack Integration
 * 
 * PURPOSE: 1:1 recreation of Webflow script + Memberstack fresh data fetching
 * USAGE: 
 * 1. Add to Webflow: <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
 * 2. Add to Webflow: <script src="https://little-microphones.vercel.app/survey-completion.js"></script>
 * 
 * FEATURES:
 * - Detect ?survey=filled parameter
 * - Immediately refresh page for fresh Memberstack data
 * - Show/hide DIV with ID "survey-filled" 
 * - Show canvas-confetti fireworks
 * - Hide button functionality
 * - Memberstack fresh data fetching
 * - UI unlocking for educators
 * 
 * VERSION: 2.0.1
 * LAST UPDATED: January 2025
 */

document.addEventListener('DOMContentLoaded', function() {

    // --- Configuration ---
    const SURVEY_PARAM = 'survey';
    const SURVEY_VALUE = 'filled';
    const SUCCESS_DIV_ID = 'survey-filled'; // <<< Ensure this ID EXACTLY matches your Webflow element ID
    const HIDE_BUTTON_ID = 'hide-survey';
    const FIREWORKS_DURATION_MS = 10 * 1000;
    const EDUCATOR_PLAN_ID = 'pln_educators-free-promo-ebfw0xzj'; // Added for Memberstack

    // --- State Variables ---
    let fireworksIntervalId = null;

    // --- Check URL Parameter ---
    const urlParams = new URLSearchParams(window.location.search);
    const shouldShowDiv = urlParams.has(SURVEY_PARAM) && urlParams.get(SURVEY_PARAM) === SURVEY_VALUE;
    
    // --- Check if we already refreshed ---
    const hasRefreshed = sessionStorage.getItem('survey_refreshed') === 'true';

    console.log("Script 2 Loaded. Should show success DIV:", shouldShowDiv);

    // --- IMMEDIATE REFRESH LOGIC ---
    if (shouldShowDiv && !hasRefreshed) {
        console.log("First load with survey parameter - refreshing page for fresh data...");
        
        // Mark as refreshed
        sessionStorage.setItem('survey_refreshed', 'true');
        
        // Remove survey parameter and refresh
        const url = new URL(window.location);
        url.searchParams.delete(SURVEY_PARAM);
        window.location.href = url.toString();
        
        // Exit here - page will reload
        return;
    }

    // --- Clear refresh flag if no survey parameter ---
    if (!shouldShowDiv) {
        sessionStorage.removeItem('survey_refreshed');
    }

    // --- Get Elements ---
    const successDiv = document.getElementById(SUCCESS_DIV_ID);
    const hideButton = document.getElementById(HIDE_BUTTON_ID);

    // --- Show DIV and Trigger Actions after refresh ---
    if (hasRefreshed) {
        console.log("Second load after refresh - showing DIV and running actions.");

        // Clear the refresh flag
        sessionStorage.removeItem('survey_refreshed');

        // --- Make the DIV visible ---
        if (successDiv) {
            console.log(`Attempting to show DIV: #${SUCCESS_DIV_ID}`);

            // Set the display style. 'block' is common, but use 'flex' or 'grid'
            // if that's how the element is designed to lay out its children.
            const desiredDisplay = 'block'; // <-- CHANGE TO 'flex' or 'grid' if needed
            successDiv.style.display = desiredDisplay;

            // Check if it actually became visible (helps diagnose CSS overrides)
            setTimeout(() => {
                if (successDiv) { // Re-check element exists
                    const currentDisplay = window.getComputedStyle(successDiv).display;
                    console.log(`Computed display style for #${SUCCESS_DIV_ID} is now: ${currentDisplay}`);
                    if (currentDisplay === 'none') {
                        console.error(`*** CSS OVERRIDE DETECTED *** Element #${SUCCESS_DIV_ID} is still display:none. Check Webflow styles/custom CSS for '!important' or more specific selectors overriding the 'display: ${desiredDisplay}' style.`);
                    }
                }
            }, 100); // Check shortly after setting

            // --- Trigger Confetti ---
            if (typeof confetti === 'function') {
                triggerFireworksConfetti();
            } else {
                console.warn('Confetti library not loaded.');
            }

        } else {
            // Log error if the DIV element itself wasn't found
            console.error(`*** ELEMENT NOT FOUND *** Failed to find element with ID "${SUCCESS_DIV_ID}". Check the ID in your Webflow project.`);
        }
        // --- End of showing DIV ---

        // --- ADDED: Memberstack Integration ---
        setTimeout(() => {
            unlockUIElements();
        }, 1000); // Wait 1 second for confetti to start, then unlock UI

    } else {
        console.log("URL parameter not found. DIV remains hidden.");
        // Ensure it's hidden if param isn't there (redundant if CSS default is none)
        if (successDiv) {
            successDiv.style.display = 'none';
        }
    }

    // --- Setup Hide Button Listener ---
    if (successDiv && hideButton) {
        hideButton.addEventListener('click', function() {
            console.log(`Hide button clicked. Hiding #${SUCCESS_DIV_ID}`);
            successDiv.style.display = 'none';
            // Stop confetti if running
            if (fireworksIntervalId) {
                clearInterval(fireworksIntervalId);
                fireworksIntervalId = null;
                console.log('Fireworks stopped by hide button.');
            }
        });
    } else {
        if (!successDiv) console.warn("Could not set up hide button: Success DIV not found.");
        if (!hideButton) console.warn("Could not set up hide button: Hide button not found.");
    }

    // --- Helper Function (Confetti - Unchanged) ---
    function triggerFireworksConfetti() {
        if (fireworksIntervalId) return;
        console.log('Triggering Fireworks confetti.');
        fireworksIntervalId = true;
        const animationEnd = Date.now() + FIREWORKS_DURATION_MS;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0, disableForReducedMotion: true };
        function randomInRange(min, max) { return Math.random() * (max - min) + min; }
        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) { clearInterval(interval); fireworksIntervalId = null; console.log('Fireworks finished.'); return; }
            const particleCount = 50 * (timeLeft / FIREWORKS_DURATION_MS);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
        fireworksIntervalId = interval;
    }

    // --- ADDED: Memberstack Functions ---
    
    /**
     * Wait for Memberstack to be available
     */
    function waitForMemberstack(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const memberstack = window.$memberstackDom || window.memberstack;
            if (memberstack) {
                resolve();
                return;
            }
            
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                const memberstack = window.$memberstackDom || window.memberstack;
                if (memberstack) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    reject(new Error('Memberstack loading timeout'));
                }
            }, 100);
        });
    }

    /**
     * Get fresh member data from Memberstack
     */
    async function getFreshMemberData() {
        try {
            await waitForMemberstack();
            
            const memberstack = window.$memberstackDom || window.memberstack;
            if (!memberstack) {
                throw new Error('Memberstack not available');
            }
            
            // Wait a bit for backend sync
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Get fresh member data
            const member = await memberstack.getCurrentMember();
            if (member && member.data) {
                return member.data;
            } else {
                throw new Error('No member data received');
            }
            
        } catch (error) {
            console.error('❌ Error fetching fresh member data:', error);
            return null;
        }
    }

    /**
     * Update UI elements - unlock content for educators
     */
    async function unlockUIElements() {
        try {
            // Get fresh member data first
            const memberData = await getFreshMemberData();
            
            if (!memberData) {
                console.warn('⚠️ Could not get member data for UI unlock');
                return;
            }
            
            // Check if user has educator plan
            const hasEducatorPlan = memberData.planConnections && 
                memberData.planConnections.some(plan => 
                    plan.planId === EDUCATOR_PLAN_ID
                );
            
            if (!hasEducatorPlan) {
                console.warn('⚠️ No educator plan found, UI remains locked');
                return;
            }
            
            // Remove grayscale filters
            const grayscaleElements = document.querySelectorAll('[style*="filter"]');
            grayscaleElements.forEach(element => {
                const currentFilter = element.style.filter;
                if (currentFilter && currentFilter.includes('grayscale')) {
                    element.style.filter = currentFilter.replace(/grayscale\([^)]*\)/g, '').trim();
                    if (element.style.filter === '') {
                        element.style.removeProperty('filter');
                    }
                }
            });
            
            // Remove opacity restrictions
            const restrictedElements = document.querySelectorAll('*');
            restrictedElements.forEach(element => {
                const computedStyle = window.getComputedStyle(element);
                if (computedStyle.opacity !== '1' && element.style.opacity && element.style.opacity !== '1') {
                    element.style.opacity = '1';
                }
                if (computedStyle.pointerEvents === 'none' && element.style.pointerEvents) {
                    element.style.pointerEvents = 'auto';
                }
            });
            
            // Enable disabled elements
            const disabledElements = document.querySelectorAll('button[disabled], input[disabled], select[disabled], a[disabled]');
            disabledElements.forEach(element => {
                element.disabled = false;
                element.style.opacity = '1';
                element.style.pointerEvents = 'auto';
                element.style.cursor = 'pointer';
            });
            
            // Hide trial messages
            const trialElements = document.querySelectorAll('[class*="trial"], [class*="upgrade"], .trial-message, .upgrade-message');
            trialElements.forEach(element => {
                if (element.textContent.toLowerCase().includes('trial') || 
                    element.textContent.toLowerCase().includes('upgrade') ||
                    element.textContent.toLowerCase().includes('free year')) {
                    element.style.display = 'none';
                }
            });
            
            console.log('✅ UI unlocked for educator plan');
            
        } catch (error) {
            console.error('❌ Error unlocking UI elements:', error);
        }
    }

});
