document.addEventListener('DOMContentLoaded', function() {

    // --- Configuration ---
    const SURVEY_PARAM = 'survey';
    const SURVEY_VALUE = 'filled';
    const SUCCESS_DIV_ID = 'survey-filled'; // <<< Ensure this ID EXACTLY matches your Webflow element ID
    const HIDE_BUTTON_ID = 'hide-survey';
    const FIREWORKS_DURATION_MS = 10 * 1000;

    // --- State Variables ---
    let fireworksIntervalId = null;

    // --- Get Elements ---
    const successDiv = document.getElementById(SUCCESS_DIV_ID);
    const hideButton = document.getElementById(HIDE_BUTTON_ID);

    // --- Check URL Parameter ---
    const urlParams = new URLSearchParams(window.location.search);
    const shouldShowDiv = urlParams.has(SURVEY_PARAM) && urlParams.get(SURVEY_PARAM) === SURVEY_VALUE;

    console.log("Script 2 Loaded. Should show success DIV:", shouldShowDiv);

    // --- Show DIV and Trigger Actions if URL Parameter is Correct ---
    if (shouldShowDiv) {
        console.log("URL parameter found. Attempting to show DIV and run actions.");

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

});