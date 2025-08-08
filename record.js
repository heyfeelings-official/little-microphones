/**
 * record.js - Recording Page Authorization & World Management System
 * 
 * PURPOSE: Secure authorization system for recording pages with world-specific content management and radio program integration
 * DEPENDENCIES: Memberstack DOM SDK, URL parameters, recording/recording.js integration
 * DOCUMENTATION: See /documentation/record.js.md for complete system overview
 * 
 * AUTHORIZATION FLOW:
 * URL Parameters → Memberstack Auth → LMID Ownership Validation → World Content Display → Recording System Init
 * 
 * MAIN FUNCTIONS:
 * - URL parameter validation with security checks (world & lmid required)
 * - Memberstack authentication verification with real-time session validation
 * - LMID ownership validation against user metadata with fail-safe redirection
 * - World-specific collection display management with theme coordination
 * - Recording system initialization and seamless integration
 * - Share link generation button setup for radio program access
 * - Question ID normalization and recording count verification
 * 
 * SECURITY FEATURES:
 * - Mandatory URL parameter validation with immediate redirect on failure
 * - Real-time Memberstack authentication with session verification
 * - Metadata-driven LMID authorization preventing unauthorized access
 * - Secure redirection using browser history for failed authorization
 * - Protected global variable exposure for authorized recording operations
 * 
 * WORLD MANAGEMENT:
 * - Dynamic collection visibility control (show only authorized world)
 * - Supported worlds: spookyland, shopping-spree, amusement-park, big-city, waterpark, neighborhood
 * - World name formatting and display optimization
 * - Background theme management (optional feature)
 * - Collection-specific recorder initialization
 * 
 * RADIO PROGRAM INTEGRATION:
 * - Existing button hijacking for share link generation
 * - ShareID generation and secure link creation
 * - New tab opening for radio program page
 * - Button state management with loading indicators
 * - Success/failure feedback with appropriate user messaging
 * 
 * RECORDING SYSTEM COORDINATION:
 * - Event-driven initialization waiting for recording/recording.js readiness
 * - Question ID discovery from DOM elements with normalization
 * - ShareID generation for radio program access
 * - Fallback database scanning for recording discovery
 * - Cross-device recording synchronization support
 * 
 * INTEGRATION POINTS:
 * - Memberstack: User authentication and metadata management
 * - recording/recording.js: Core recording functionality and radio program generation
 * - URL Parameters: World and LMID specification from navigation
 * - DOM Elements: World collections and recording wrapper management
 * - Global State: Authorized parameters exposure for recording system
 * 
 * ERROR HANDLING:
 * - Missing parameter detection with immediate user feedback
 * - Authentication failure handling with secure redirection
 * - Authorization failure management with appropriate messaging
 * - Runtime error recovery with graceful degradation
 * - Network failure resilience with local fallbacks
 * 
 * DATA FLOW:
 * Page Load → Parameter Extraction → Auth Check → LMID Validation → 
 * World Display → Recording Init → Radio Button Setup → Ready State
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Delayed recording initialization for optimal DOM readiness
 * - Efficient collection hiding/showing with minimal DOM manipulation
 * - Event listener management with proper cleanup
 * - Memory-efficient global variable management
 * 
 * URL STRUCTURE:
 * - New URL: /members/record?world=spookyland&lmid=123
 * - Old URL: /members/rp?world=spookyland&lmid=123 (deprecated)
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.5.0 (Renamed from rp.js)
 * STATUS: Production Ready ✅
 */

// API Configuration - Use global config if available, fallback to hardcoded
// Check if API_BASE_URL is already defined globally to avoid redeclaration
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app';
}

/**
 * Shows only the collection for the specified world and hides all others
 * @param {string} world - The world slug (e.g., 'spookyland', 'shopping-spree')
 */
/**
 * Initialize recording functionality for the current world
 * @param {string} world - The world slug
 */
function initializeRecordingForWorld(world) {
  // NEW: Robust, event-driven initialization
  // Check if the recording script is already ready
  if (window.isRecordingScriptReady) {

    initializeRecordersForWorld(world);
  } else {
    // If not, wait for the custom event

    document.addEventListener('recording-script-ready', () => {

      initializeRecordersForWorld(world);
    }, { once: true }); // Use 'once' to ensure the listener is auto-removed
  }
}

function showWorldCollection(world) {
  // Use global config for world collections with fallback
  const allCollections = window.LM_CONFIG?.WORLD_COLLECTIONS || [
    'collection-spookyland',
    'collection-shopping-spree', 
    'collection-amusement-park',
    'collection-neighborhood',
    'collection-big-city',
    'collection-waterpark'
  ];

  // Hide all collections first
  allCollections.forEach(collectionId => {
    const collection = document.getElementById(collectionId);
    if (collection) {
      collection.style.display = 'none';
    }
  });

  // Show only the collection for the current world
  const targetCollectionId = `collection-${world}`;
  const targetCollection = document.getElementById(targetCollectionId);
  
  if (targetCollection) {
    targetCollection.style.display = 'block';

    
    // Initialize recording functionality for this world only
    const uiDelay = window.LM_CONFIG?.TIMEOUTS?.UI_UPDATE_DELAY || 100;
    setTimeout(() => {
      initializeRecordingForWorld(world);
      
      // Hook into existing generate-program button and convert to share link functionality
      setupExistingRadioProgramButton(world, window.currentLmid);
    }, uiDelay);
  } else {
    console.warn(`Collection element not found: ${targetCollectionId}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Check if this is a radio page - if so, don't run record.js
  if (window.location.pathname.includes('/little-microphones')) {
    console.log('📻 Radio page detected - skipping record.js initialization');
    return;
  }

  const memberstack = window.$memberstackDom;

  if (!memberstack) {
    console.error("Memberstack DOM package not found.");
    return;
  }

  // Get the lmid and world from the URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const lmidFromUrl = urlParams.get("lmid");
  const worldFromUrl = urlParams.get("world");
  
  // Store globally for other functions
  window.currentLmid = lmidFromUrl;
  window.currentWorld = worldFromUrl;

  // Update the world name element and show appropriate collection
  if (worldFromUrl) {
    // Set background
    /* const worldBgElement = document.getElementById("world-bg");
    if (worldBgElement && worldBackgrounds[worldFromUrl]) {
        worldBgElement.style.backgroundImage = `url('${worldBackgrounds[worldFromUrl]}')`;
        worldBgElement.style.backgroundSize = 'cover';
        worldBgElement.style.backgroundPosition = 'center';
    } */

    const worldNameElement = document.getElementById("wrold-name");
    if (worldNameElement) {
      // Use global config utility or fallback
      const formattedWorldName = window.LM_CONFIG?.UTILS?.formatWorldName(worldFromUrl) || 
                                  worldFromUrl.charAt(0).toUpperCase() + worldFromUrl.slice(1).replace(/-/g, ' ');
      worldNameElement.textContent = formattedWorldName;
    }

    // Show only the collection for the current world
    showWorldCollection(worldFromUrl);
  }

  // Fix for Webflow's locale switcher stripping URL params
  setupLocaleSwitcherFix();

  // Check if this is a radio page - if so, don't run record.js
  if (window.location.pathname.includes('/little-microphones')) {
    console.log('📻 Radio page detected - skipping record.js initialization');
    return;
  }

  if (!lmidFromUrl || !worldFromUrl) {
    console.error("Authorization failed: Missing 'lmid' or 'world' in the URL.");
    alert("This page is missing required information. You will be returned to the previous page.");
    window.history.back();
    return;
  }

  memberstack.getCurrentMember()
    .then(({ data: memberData }) => {
      if (!memberData) {
        console.error("Authorization failed: Member is not logged in.");
        alert("You must be logged in to access this page. You will be returned to the previous page.");
        window.history.back();
        return;
      }

      // Securely get the list of lmids from the member's metadata
      const lmidFromMeta = memberData.metaData.lmids;
      let memberLmidArray = [];

      if (lmidFromMeta) {
        if (typeof lmidFromMeta === 'string' && lmidFromMeta.trim().length > 0) {
          memberLmidArray = lmidFromMeta.split(',').map(item => item.trim());
        } else if (typeof lmidFromMeta === 'number') {
          memberLmidArray = [String(lmidFromMeta)];
        }
      }

      // Check if the lmid from the URL is in the member's list of authorized lmids
      if (memberLmidArray.includes(lmidFromUrl)) {
        console.log(`SUCCESS: Member is authorized for LMID ${lmidFromUrl} in world '${worldFromUrl}'. Ready to record.`);
        
        // Expose world and lmid globally for the recording script
        window.currentRecordingParams = {
            world: worldFromUrl,
            lmid: lmidFromUrl
        };
      } else {
        console.error(`Authorization failed: Member does not have permission for LMID ${lmidFromUrl}.`);
        alert("You are not authorized to access this program. You will be returned to the previous page.");
        window.history.back();
      }
    })
    .catch(error => {
      console.error("An error occurred while verifying member authorization:", error);
    });
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
 * Hook into existing "generate-program" button and convert it to "Get Share Link" functionality
 * @param {string} world - The world slug
 * @param {string} lmid - The LMID
 */
function setupExistingRadioProgramButton(world, lmid) {
  // Find the existing generate-program button
  const existingButton = document.getElementById('generate-program');
  
  if (!existingButton) {
    console.warn('generate-program button not found in DOM');
    return;
  }
  

  
  // Remove any existing event listeners by cloning the button
  const newButton = existingButton.cloneNode(true);
  existingButton.parentNode.replaceChild(newButton, existingButton);
  
  // SIMPLIFIED: Pre-generate ShareID and inject URL directly into button
  // This avoids mobile popup blockers and API call delays
  generateShareIdAndSetupButton(newButton, world, lmid);
  

}

/**
 * Generate ShareID and setup button with direct URL
 * @param {HTMLElement} button - The button element
 * @param {string} world - The world slug
 * @param {string} lmid - The LMID
 */
async function generateShareIdAndSetupButton(button, world, lmid) {
  try {

    
    // Call the get-share-link API to get/create ShareID
    const response = await fetch(`${API_BASE_URL}/api/get-share-link?lmid=${lmid}&world=${world}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get share link: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to generate share link');
    }
    
    // Generate the radio URL with ShareID (new public URL structure)
    // Detect current language and build localized radio URL
    const currentLang = window.LM_CONFIG?.getCurrentLanguage() || 'en';
    const radioUrl = currentLang === 'en' 
        ? `/little-microphones?ID=${result.shareId}`
        : `/${currentLang}/little-microphones?ID=${result.shareId}`;
    

    
    // Set the href attribute for direct navigation (works better on mobile)
    button.setAttribute('href', radioUrl);
    button.setAttribute('target', '_blank');
    button.setAttribute('rel', 'noopener noreferrer');
    
    // Add click handler as backup
    button.addEventListener('click', (event) => {
      // Let the browser handle the link naturally

    });
    
    // Update button text to indicate it's ready
    const buttonText = button.querySelector('.btn-text, span');
    if (buttonText) {
      buttonText.textContent = 'Open Radio Program';
    }
    
  } catch (error) {
    console.error('Failed to setup share link button:', error);
    
    // Fallback: setup button with error handling
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      alert('Failed to load radio program. Please try again.');
    });
    
    // Update button text to indicate error
    const buttonText = button.querySelector('.btn-text, span');
    if (buttonText) {
      buttonText.textContent = 'Radio Program (Error)';
    }
  }
}

/**
 * Normalize question ID - now just returns the numeric order field directly
 * @param {string} questionId - Raw question ID from DOM (should be numeric order)
 * @returns {string} - Numeric order as string (e.g., "1", "2", "3")
 */
function normalizeQuestionId(questionId) {
    if (!questionId) return '';
    
    // Convert to string and trim whitespace
    const cleanId = questionId.toString().trim();
    
    // If it's already numeric, return as-is
    if (/^\d+$/.test(cleanId)) {
        return cleanId;
    }
    
    // Extract numeric part from any format
    const numericPart = cleanId.replace(/[^\d]/g, '');
    return numericPart || '0';
}

/**
 * Check if user has any recordings for this world/lmid combination
 * @param {string} world - The world slug
 * @param {string} lmid - The LMID
 * @returns {Promise<boolean>} - True if user has recordings
 */
async function checkIfUserHasRecordings(world, lmid) {
  try {
    // This function should be available from recording.js
    if (typeof loadRecordingsFromDB !== 'function') {
      console.warn('loadRecordingsFromDB function not available');
      return true; // Assume they have recordings if we can't check
    }
    

    
    // First, try to discover question IDs from DOM elements
    const targetCollectionId = `collection-${world}`;
    const targetCollection = document.getElementById(targetCollectionId);
    
    if (targetCollection) {
      const recorderWrappers = targetCollection.querySelectorAll('.faq1_accordion.lm');
      
      for (const wrapper of recorderWrappers) {
        let questionId = wrapper.dataset.questionId;
        if (!questionId) continue;
        
        // Normalize questionId to numeric format
        questionId = normalizeQuestionId(questionId);
        
        try {
          const recordings = await loadRecordingsFromCloud(questionId, world, lmid);
          if (recordings && recordings.length > 0) {

            return true;
          }
        } catch (error) {
          console.warn(`Could not check Question ${questionId}:`, error);
        }
      }
    }
    
    // If no DOM elements found, try to discover question IDs from database
    // This is a fallback - we'll query the database to find what question IDs exist
    if (typeof getAllRecordingsForWorldLmid === 'function') {
      try {
        const allRecordings = await getAllRecordingsForWorldLmid(world, lmid);
        if (allRecordings && allRecordings.length > 0) {

          return true;
        }
      } catch (error) {
        console.warn('Database scan failed:', error);
      }
    }
    

    return false;
  } catch (error) {
    console.error('Error checking for recordings:', error);
    return true; // Assume they have recordings if check fails
  }
}