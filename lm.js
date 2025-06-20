// Wait for the HTML document to be ready.
document.addEventListener("DOMContentLoaded", function () {
  
  // --- TEST LOG ---
  // This message should always appear in the console if the script is loaded.
  console.log("✅ Vercel Test: Skrypt załadowany poprawnie.");

  // A shorter, clean reference to the Memberstack DOM object.
  const memberstack = window.$memberstackDom;

    // First, check if Memberstack is available.
    if (!memberstack) {
        console.error("FATAL: Memberstack is not available on this page.");
    return;
  }

    // Use getCurrentMember to check if the user is logged in.
    memberstack.getCurrentMember().then(async ({data: member }) => {
    
    // Check if a member object was returned (i.e., user is logged in).
    if (member) {

        console.log("Member is logged in. Fetching JSON data...");

    try {
        // We make a separate call to get the JSON data.
        const memberJson = await memberstack.getMemberJSON();

    // --- CORRECTED LINE ---
    // Based on your console log, the data is inside memberJson.data.LMID
    const lmidArray = memberJson?.data?.LMID;

    // Check if we successfully found a valid array.
    if (Array.isArray(lmidArray)) {
        // If successful, log the data. This is the confirmation you need.
        console.log("SUCCESS! LMIDs are accessible. Data:", lmidArray);
        } else {
        // If this fails, the 'LMID' key is missing or not an array.
        console.error("FAILURE: Successfully fetched JSON, but could not find the 'LMID' array inside the 'data' object.");
    console.log("Full JSON object for debugging:", memberJson);
        }

      } catch (error) {
        // This will catch any errors if the getMemberJSON() call fails.
        console.error("An error occurred while fetching the Member JSON:", error);
      }

    } else {
        console.log("No member is currently logged in.");
    }
  });
});