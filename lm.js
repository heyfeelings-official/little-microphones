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

        // The template IS the element with ID "lm-slot".
        const template = document.getElementById("lm-slot");
        if (!template) {
          console.error("Error: The template element with ID 'lm-slot' was not found.");
          return;
        }
        
        // We will append the clones to the template's parent container.
        const container = template.parentNode;
        if (!container) {
          console.error("Error: Could not find a parent container for the 'lm-slot' template.");
          return;
        }

        // Hide the original template so it's not displayed.
        template.style.display = "none";

        // For each LMID, clone the template, populate it, and append it.
        lmidArray.forEach(lmid => {
          const clone = template.cloneNode(true);

          // Make the cloned element visible again.
          clone.style.display = ""; // Or "block", "flex", etc.
          // Remove the ID from the clone to avoid duplicates.
          clone.removeAttribute("id");

          const numberElement = clone.querySelector("#lmid-number");
          if (numberElement) {
            numberElement.textContent = lmid;
            // Also remove the ID from the inner element to avoid duplicates.
            numberElement.removeAttribute("id");
          } else {
            console.warn("Could not find '#lmid-number' in the template clone.");
          }
          
          container.appendChild(clone);
        });

        // Add a single, delegated event listener for all delete buttons.
        document.body.addEventListener("click", async (event) => {
          if (event.target && event.target.id === "lm-delete") {
            const lmidToDelete = event.target.closest(".lmid-item")?.querySelector(".lmid-number-display")?.textContent;
            
            if (!lmidToDelete) {
              console.error("Could not determine which LMID to delete.");
              return;
            }

            // Disable the button to prevent multiple clicks
            event.target.disabled = true;
            event.target.textContent = "Deleting...";

            try {
              // Step 1: Update Memberstack JSON
              const { data: memberJson } = await memberstack.getMemberJSON();
              const currentLmidArray = memberJson.LMID || [];
              const updatedLmidArray = currentLmidArray.filter(id => id !== lmidToDelete);

              await memberstack.updateMemberJSON({ json: { LMID: updatedLmidArray } });

              // Step 2: Call the Make.com webhook
              await fetch("https://hook.us1.make.com/dmfo4kfvl3umi6ta6sfizjqnofrbxf8o", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lmid: lmidToDelete }),
              });

              // Step 3: Remove the element from the DOM
              event.target.closest(".lmid-item").remove();
              
              console.log(`Successfully deleted LMID: ${lmidToDelete}`);

            } catch (error) {
              console.error("Failed to delete LMID:", error);
              // Re-enable the button on failure
              event.target.disabled = false;
              event.target.textContent = "Delete";
            }
          }
        });
        
        // Reinitialize Webflow interactions
        if (window.Webflow) {
          window.Webflow.destroy();
          window.Webflow.ready();
          window.Webflow.require("ix2").init();
        }

      } else {
        console.log("Member is logged in, but no valid LMID data was found.", memberJson);
      }
    })
    .catch(error => {
      // Catches network errors or other issues with the API call.
      console.error("An error occurred while fetching Member JSON:", error);
    });
});