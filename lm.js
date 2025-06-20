// lm.js - Secure version using Memberstack Metadata
document.addEventListener("DOMContentLoaded", () => {
  const memberstack = window.$memberstackDom;

  // Verify Memberstack is available
  if (!memberstack) {
    console.error("Memberstack DOM package not found.");
    return;
  }

  // Use getMemberData() to securely access member info, including metaData
  memberstack.getCurrentMember()
    .then(({ data: memberData }) => {
      if (!memberData) {
        console.log("Member is not logged in.");
        return;
      }

      // Securely access the LMID from metaData.
      // Our backend assigns a single LMID string to metaData.lmid.
      // We'll wrap it in an array to make our display logic reusable.
      const lmidFromMeta = memberData.metaData.LMID;
      let lmidArray = [];

      // Check if lmidFromMeta is a non-empty string, then split it into an array.
      // This handles "444, 555" as well as a single "444".
      if (typeof lmidFromMeta === 'string' && lmidFromMeta.length > 0) {
        lmidArray = lmidFromMeta.split(',').map(item => item.trim());
      }

      if (lmidArray.length > 0) {
        console.log("SUCCESS! LMID is accessible from metaData.", lmidArray);

        const template = document.getElementById("lm-slot");
        if (!template) {
          console.error("Error: The template element with ID 'lm-slot' was not found.");
          return;
        }
        
        const container = template.parentNode;
        if (!container) {
          console.error("Error: Could not find a parent container for the 'lm-slot' template.");
          return;
        }

        // Hide the original template.
        template.style.display = "none";

        // For each LMID, clone the template, populate it, and append it.
        lmidArray.forEach(lmid => {
          const clone = template.cloneNode(true);

          clone.style.display = ""; // Make the clone visible
          clone.removeAttribute("id"); // Avoid duplicate IDs
          clone.setAttribute("data-lmid", lmid); // Store LMID in a data attribute for easy access

          const numberElement = clone.querySelector("#lmid-number");
          if (numberElement) {
            numberElement.textContent = lmid;
            numberElement.removeAttribute("id"); // Avoid duplicate IDs in child elements
          } else {
            console.warn("Could not find '#lmid-number' in the template clone.");
          }
          
          container.appendChild(clone);
        });

        // Reinitialize Webflow interactions after adding new elements
        if (window.Webflow) {
          window.Webflow.destroy();
          window.Webflow.ready();
          window.Webflow.require("ix2").init();
        }

      } else {
        console.log("Member is logged in, but no LMID was found in metaData.", memberData);
      }
    })
    .catch(error => {
      console.error("An error occurred while fetching Member Data:", error);
    });

  // --- Secure Deletion Flow ---
  // Add a single, delegated event listener to the body to handle clicks on buttons
  // that are added dynamically to the page.
  document.body.addEventListener("click", async (event) => {
    // Check if the clicked element is the delete button
    if (event.target && event.target.id === "lm-delete") {
      
      const deleteButton = event.target;
      // Find the closest parent item that has the lmid stored in a data-attribute.
      const itemToDelete = deleteButton.closest("[data-lmid]");
      
      if (!itemToDelete) {
        console.error("Could not find the parent element with a 'data-lmid' attribute.");
        return;
      }

      const lmidToDelete = itemToDelete.getAttribute("data-lmid");
      if (!lmidToDelete) {
        console.error("Could not find LMID to delete from the 'data-lmid' attribute.");
        return;
      }
      
      // Ask for confirmation before proceeding.
      if (!confirm(`Are you sure you want to delete LMID: ${lmidToDelete}? This action cannot be undone.`)) {
        return;
      }

      // Disable the button to prevent multiple clicks during the process.
      deleteButton.disabled = true;
      deleteButton.textContent = "Deleting...";

      try {
        // IMPORTANT: This is a placeholder URL. We will create this webhook in Make.com in the next step.
        const webhookUrl = "https://hook.us1.make.com/CHANGE_THIS_TO_YOUR_NEW_WEBHOOK_URL";
        
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // We only need to send the LMID we want to delete.
          // The backend (Make.com) will get the member's identity securely from the webhook's session.
          body: JSON.stringify({ lmid: lmidToDelete }),
        });

        const result = await response.json();

        if (!response.ok || result.status !== "success") {
          // If the server-side operation fails, throw an error to be caught below.
          throw new Error(result.message || "The server returned an error during the deletion process.");
        }

        // On successful response from the backend, remove the element from the DOM.
        itemToDelete.remove();
        console.log(`Successfully deleted LMID: ${lmidToDelete}`);

      } catch (error) {
        console.error("Failed to delete LMID:", error);
        alert(`An error occurred while trying to delete the LMID: ${error.message}`);
        // Re-enable the button on failure to allow the user to try again.
        deleteButton.disabled = false;
        deleteButton.textContent = "Delete";
      }
    }
  });
});