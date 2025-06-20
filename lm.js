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

      if (Array.isArray(lmidArray) && lmidArray.length > 0) {
        console.log("SUCCESS! LMIDs are accessible.", lmidArray);

        const slotContainer = document.getElementById("lm-slot");
        if (!slotContainer) {
          console.error("Error: The container with ID 'lm-slot' was not found.");
          return;
        }

        // Find the template inside the container. It should be hidden.
        const template = document.getElementById("lmid-template");
        if (!template) {
          console.error("Error: The template with ID 'lmid-template' was not found inside the slot.");
          return;
        }

        // For each LMID, clone the template, populate it, and append it.
        lmidArray.forEach(lmid => {
          const clone = template.cloneNode(true);

          // Remove the ID from the cloned template to avoid duplicates.
          clone.removeAttribute("id");

          // Make the cloned element visible.
          clone.style.display = ""; // Or "block", "flex", etc., depending on your layout.

          const numberElement = clone.querySelector("#lmid-number");
          if (numberElement) {
            numberElement.textContent = lmid;
          } else {
            console.warn("Element for LMID number not found in the template clone.");
          }
          
          slotContainer.appendChild(clone);
        });

      } else {
        console.log("Member is logged in, but no valid LMID data was found.", memberJson);
      }
    })
    .catch(error => {
      // Catches network errors or other issues with the API call.
      console.error("An error occurred while fetching Member JSON:", error);
    });
});