// rp.js - Handles authorization on the recording page

/**
 * Shows only the collection for the specified world and hides all others
 * @param {string} world - The world slug (e.g., 'spookyland', 'shopping-spree')
 */
/**
 * Initialize recording functionality for the current world
 * @param {string} world - The world slug
 */
function initializeRecordingForWorld(world) {
  // Check if recording.js functions are available
  if (typeof initializeRecordersForWorld === 'function') {
    console.log(`Initializing recording functionality for world: ${world}`);
    initializeRecordersForWorld(world);
  } else {
    console.warn('initializeRecordersForWorld function not available yet');
    // Retry after a short delay
    setTimeout(() => initializeRecordingForWorld(world), 100);
  }
}

function showWorldCollection(world) {
  // Define all possible world collections
  const allCollections = [
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
    console.log(`Showing collection for world: ${world}`);
    
    // Initialize recording functionality for this world only
    setTimeout(() => {
      initializeRecordingForWorld(world);
      
      // Add Radio Program button to this world collection
      addRadioProgramButton(world, window.currentLmid);
    }, 100);
  } else {
    console.warn(`Collection element not found: ${targetCollectionId}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
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

  // Define the mapping of world slugs to background images
  /* const worldBackgrounds = {
    'shopping-spree': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f506146fb421db045378af_cdcb9c23ac6f956cbb6f7f498c75cd11_worlds-Anxiety.avif',
    'waterpark': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f50606d058c933cd554be8_2938a42d480503a33daf8a8334f53f0a_worlds-Empathy.avif',
    'amusement-park': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505fe412762bb8a01b03d_85fcbe125912ab0998bf679d2e8c6082_worlds-Love.avif',
    'big-city': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505f572e936f2b665af1f_7b989a3fe827622216294c6539607059_worlds-Anger.avif',
    'spookyland': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505ecd6f37624ef7affb8_587c997427b10cabcc31cc98d6e516f4_worlds-Fear.png',
    'nieghborhood': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/683859c64fa8c3f50ead799a_worlds-boredom.avif'
  }; */

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
      // Format the world name for display (e.g., "spookyland" -> "Spookyland", "big-city" -> "Big city")
      const formattedWorldName = worldFromUrl.charAt(0).toUpperCase() + worldFromUrl.slice(1).replace(/-/g, ' ');
      worldNameElement.textContent = formattedWorldName;
    }

    // Show only the collection for the current world
    showWorldCollection(worldFromUrl);
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
 * Add "Create Radio Program" button to the world collection
 * @param {string} world - The world slug
 * @param {string} lmid - The LMID
 */
function addRadioProgramButton(world, lmid) {
  const targetCollectionId = `collection-${world}`;
  const targetCollection = document.getElementById(targetCollectionId);
  
  if (!targetCollection) {
    console.warn(`Collection not found for radio button: ${targetCollectionId}`);
    return;
  }
  
  // Check if button already exists
  if (targetCollection.querySelector('.radio-program-button')) {
    return;
  }
  
  // Create the radio program button
  const radioButton = document.createElement('div');
  radioButton.className = 'radio-program-button';
  radioButton.style.cssText = `
    margin: 20px 0;
    text-align: center;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  `;
  
  radioButton.innerHTML = `
    <div style="color: white; font-size: 18px; font-weight: bold; margin-bottom: 8px;">
      🎙️ Create Radio Program
    </div>
    <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px;">
      Combine all your recordings into a complete radio show
    </div>
  `;
  
  // Add hover effect
  radioButton.addEventListener('mouseenter', () => {
    radioButton.style.transform = 'translateY(-2px)';
    radioButton.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
  });
  
  radioButton.addEventListener('mouseleave', () => {
    radioButton.style.transform = 'translateY(0)';
    radioButton.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
  });
  
  // Add click handler
  radioButton.addEventListener('click', async () => {
    // Check if user has any recordings first
    const hasRecordings = await checkIfUserHasRecordings(world, lmid);
    
    if (!hasRecordings) {
      alert('You need to record some answers first before creating a radio program!');
      return;
    }
    
    // Disable button during processing
    radioButton.style.pointerEvents = 'none';
    radioButton.style.opacity = '0.7';
    radioButton.innerHTML = `
      <div style="color: white; font-size: 18px; font-weight: bold; margin-bottom: 8px;">
        ⏳ Creating Radio Program...
      </div>
      <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px;">
        Please wait, this may take a few minutes
      </div>
    `;
    
    try {
      // Call the radio program generation function
      await window.generateRadioProgram(world, lmid);
    } catch (error) {
      console.error('Radio program generation failed:', error);
    } finally {
      // Re-enable button
      radioButton.style.pointerEvents = '';
      radioButton.style.opacity = '';
      radioButton.innerHTML = `
        <div style="color: white; font-size: 18px; font-weight: bold; margin-bottom: 8px;">
          🎙️ Create Radio Program
        </div>
        <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px;">
          Combine all your recordings into a complete radio show
        </div>
      `;
    }
  });
  
  // Insert the button after the collection title
  const firstChild = targetCollection.firstElementChild;
  if (firstChild) {
    targetCollection.insertBefore(radioButton, firstChild);
  } else {
    targetCollection.appendChild(radioButton);
  }
  
  console.log(`Added radio program button for ${world}`);
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
    
    // Check a few common question IDs to see if there are any recordings
    const questionIds = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'];
    
    for (const questionId of questionIds) {
      const recordings = await loadRecordingsFromDB(questionId, world, lmid);
      if (recordings && recordings.length > 0) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for recordings:', error);
    return true; // Assume they have recordings if check fails
  }
}