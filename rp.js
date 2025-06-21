// rp.js - Handles authorization on the recording page
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

  if (!lmidFromUrl || !worldFromUrl) {
    console.error("Authorization failed: Missing 'lmid' or 'world' in the URL.");
    // Optional: You could hide the recording interface here
    return;
  }

  memberstack.getCurrentMember()
    .then(({ data: memberData }) => {
      if (!memberData) {
        console.error("Authorization failed: Member is not logged in.");
        // Optional: Redirect to login page
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
        // You can now enable your recording functionality
      } else {
        console.error(`Authorization failed: Member does not have permission for LMID ${lmidFromUrl}.`);
        // Optional: Hide recording interface or show an error message
      }
    })
    .catch(error => {
      console.error("An error occurred while verifying member authorization:", error);
    });
}); 