// rp.js - Handles authorization on the recording page

/**
 * Shows only the collection for the specified world and hides all others
 * @param {string} world - The world slug (e.g., 'spookyland', 'shopping-spree')
 */
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