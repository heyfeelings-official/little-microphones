// Wait for the HTML document to be ready.
document.addEventListener("DOMContentLoaded", () => {
  const memberstack = window.$memberstackDom;

  // Verify Memberstack is available
  if (!memberstack) {
    console.error("Memberstack DOM package not found.");
    return;
  }

  // Directly get the Member's JSON data.
  // This returns null if the member is not logged in.
  memberstack.getMemberJSON()
    .then(({ data: memberJson }) => {
      if (!memberJson) {
        console.log("Member is not logged in.");
        return;
      }

      // Safely access the LMID array.
      const lmidArray = memberJson.LMID;

      if (Array.isArray(lmidArray)) {
        console.log("SUCCESS! LMIDs are accessible.", lmidArray);
        // You can now work with the lmidArray.
        // For example: lmidArray.forEach(id => console.log(id));
      } else {
        console.log("Member is logged in, but LMID data is not a valid array.", memberJson);
      }
    })
    .catch(error => {
      // Catches network errors or other issues with the API call.
      console.error("An error occurred while fetching Member JSON:", error);
    });
});