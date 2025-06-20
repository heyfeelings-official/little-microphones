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
        
        // --- DOM Manipulation ---
        const slotContainer = document.getElementById("lm-slot");

        if (!slotContainer) {
          console.error("The 'lm-slot' container was not found on the page.");
          return;
        }

        const templateElement = slotContainer.firstElementChild;

        if (!templateElement) {
          console.error("No template element found inside 'lm-slot' to use as a template.");
          return;
        }

        // Detach the template from the DOM to use it for cloning
        templateElement.remove();

        // Clear any other content in the slot (like whitespace nodes)
        slotContainer.innerHTML = "";

        // For each LMID, clone the template, populate it, and append it
        lmidArray.forEach(lmid => {
          const newElement = templateElement.cloneNode(true);
          const numberElement = newElement.querySelector("#lmid-number");

          if (numberElement) {
            numberElement.textContent = lmid;
            // Important: Remove the ID to prevent duplicates in the DOM
            numberElement.removeAttribute("id");
          } else {
            console.warn("Element with ID 'lmid-number' not found in the template. Displaying LMID in the main cloned element as a fallback.");
            newElement.textContent = lmid;
          }

          slotContainer.appendChild(newElement);
        });

      } else {
        console.log("Member is logged in, but LMID data is not a valid array.", memberJson);
      }
    })
    .catch(error => {
      // Catches network errors or other issues with the API call.
      console.error("An error occurred while fetching Member JSON:", error);
    });
});