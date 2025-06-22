// lm.js - Secure version using Memberstack Metadata
document.addEventListener("DOMContentLoaded", () => {
  const memberstack = window.$memberstackDom;

  // Verify Memberstack is available
  if (!memberstack) {
    console.error("Memberstack DOM package not found.");
    return;
  }

  // Use getCurrentMember() to securely access member info, including metaData
  memberstack.getCurrentMember()
    .then(({ data: memberData }) => {
      if (!memberData) {
        console.log("Member is not logged in.");
        return;
      }

      // Store the member's ID for later use in the delete webhook call.
      const memberId = memberData.id;

      // Securely access the LMID from metaData, now using the "lmids" key for consistency.
      const lmidFromMeta = memberData.metaData.lmids;
      let lmidArray = [];

      // NEW: Robustly handle LMID whether it's a number, a string, or a comma-separated string.
      if (lmidFromMeta) {
        if (typeof lmidFromMeta === 'string' && lmidFromMeta.trim().length > 0) {
          // Handles "3, 4, 5" or "3"
          lmidArray = lmidFromMeta.split(',').map(item => item.trim());
        } else if (typeof lmidFromMeta === 'number') {
          // Handles 2
          lmidArray = [String(lmidFromMeta)];
        }
      }

      const template = document.getElementById("lm-slot");
      if (!template) {
        console.error("Error: The template element with ID 'lm-slot' was not found.");
        return;
      }

      // Always hide the original template if a member is logged in.
      template.style.display = "none";

      if (lmidArray.length > 0) {
        console.log("SUCCESS! LMID is accessible from metaData.", lmidArray);
        
        const container = template.parentNode;
        if (!container) {
          console.error("Error: Could not find a parent container for the 'lm-slot' template.");
          return;
        }

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

  // NEW: A single webhook URL for all actions (add, delete, etc.)
  // Please create a NEW webhook in Make.com for this combined scenario and paste its URL here.
  const unifiedWebhookUrl = "https://hook.us1.make.com/aqxns3r1ysrpfqtdk4vi2t4yx04uhycv"; // <-- PASTE NEW WEBHOOK URL HERE

  // --- Secure Deletion Flow ---
  // We keep this event listener on the body so it's always active.
  document.body.addEventListener("click", async (event) => {
    // Check if the clicked element is the delete button by its ID
    if (event.target && event.target.id === "lm-delete") {
      
      const deleteButton = event.target;
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
      
      if (!confirm(`Are you sure you want to delete LMID: ${lmidToDelete}? This action cannot be undone.`)) {
        return;
      }

      deleteButton.disabled = true;
      deleteButton.textContent = "Deleting...";

      try {
        // Get the most current member data right before sending the request
        const { data: memberData } = await memberstack.getCurrentMember();
        if (!memberData) {
          throw new Error("You are no longer logged in.");
        }
        const memberId = memberData.id;
        const currentLmids = memberData.metaData.lmids;

        // New logic: Prepare the final string in JavaScript instead of Make.com
        let lmidArray = [];
        if (currentLmids && typeof currentLmids === 'string') {
          lmidArray = currentLmids.split(',').map(id => id.trim());
        }
        const filteredArray = lmidArray.filter(id => id !== lmidToDelete);
        const newLmidString = filteredArray.length > 0 ? filteredArray.join(',') : null;

        const response = await fetch(unifiedWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Send the 'delete' action along with all necessary data.
          body: JSON.stringify({
            action: 'delete',
            memberId: memberId,
            lmidToDelete: lmidToDelete,
            newLmidString: newLmidString,
          }),
        });

        const result = await response.json();

        // New: Log the entire result for debugging
        console.log("Response from Make.com:", result);

        if (!response.ok || result.status !== "success") {
          throw new Error(result.message || "The server returned an error during the deletion process.");
        }

        itemToDelete.remove();
        console.log(`Successfully deleted LMID: ${lmidToDelete}`);

      } catch (error) {
        console.error("Failed to delete LMID:", error);
        alert(`An error occurred while trying to delete the LMID: ${error.message}`);
        deleteButton.disabled = false;
        deleteButton.textContent = "Delete";
      }
    }
  });

  // --- World Link Redirection Flow ---
  document.body.addEventListener("click", (event) => {
    const worldButton = event.target.closest("[data-world]");

    if (worldButton) {
      event.preventDefault(); // Stop the link from navigating immediately

      const world = worldButton.getAttribute("data-world");
      const programWrapper = worldButton.closest("[data-lmid]");

      if (!programWrapper) {
        console.error("Could not find the parent program for this world link.");
        // You might want to show an error to the user here.
        return;
      }

      const lmid = programWrapper.getAttribute("data-lmid");
      
      // Get the base URL from the link itself (set in Webflow)
      const baseUrl = worldButton.getAttribute("href") || "/rp";

      // Construct the new URL and redirect the user
      const newUrl = `${baseUrl}?world=${world}&lmid=${lmid}`;
      window.location.href = newUrl;
    }
  });

  // --- Add New LMID Flow ---
  const addButton = document.getElementById("add-lmid");
  if (addButton) {
    addButton.addEventListener("click", async () => {
      // SECURITY: Check LMID limit before proceeding
      try {
        const { data: memberData } = await memberstack.getCurrentMember();
        if (!memberData) {
          alert("You are not logged in.");
          return;
        }

        // Check current LMID count
        const lmidFromMeta = memberData.metaData.lmids;
        let currentLmidCount = 0;

        if (lmidFromMeta) {
          if (typeof lmidFromMeta === 'string' && lmidFromMeta.trim().length > 0) {
            currentLmidCount = lmidFromMeta.split(',').map(item => item.trim()).length;
          } else if (typeof lmidFromMeta === 'number') {
            currentLmidCount = 1;
          }
        }

        console.log(`Current LMID count: ${currentLmidCount}/5`);

        // SECURITY: Enforce 5 LMID limit
        if (currentLmidCount >= 5) {
          alert("Maksimum 5 programów na użytkownika. Usuń istniejący program, aby utworzyć nowy.");
          console.log("LMID limit reached (5/5)");
          return;
        }

        const memberId = memberData.id;
        const memberEmail = memberData.auth.email;

        addButton.disabled = true;
        addButton.textContent = "Adding...";

        const response = await fetch(unifiedWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: 'add',
            memberId: memberId,
            memberEmail: memberEmail,
          }),
        });

        const result = await response.json();

        if (!response.ok || result.status !== "success") {
          throw new Error(result.message || "Could not add a new LMID at this time.");
        }

        const newLmid = result.lmid;

        // Dynamically create and add the new element to the page.
        const template = document.getElementById("lm-slot");
        const container = template.parentNode;
        if (!template || !container) {
          console.error("Could not find the template or container for new LMIDs.");
          return;
        }

        const clone = template.cloneNode(true);
        clone.style.display = "";
        clone.removeAttribute("id");
        clone.setAttribute("data-lmid", newLmid);

        const numberElement = clone.querySelector("#lmid-number");
        if (numberElement) {
          numberElement.textContent = newLmid;
          numberElement.removeAttribute("id");
        }

        container.appendChild(clone);

        if (window.Webflow) {
          window.Webflow.destroy();
          window.Webflow.ready();
          window.Webflow.require("ix2").init();
        }

        addButton.disabled = false;
        addButton.textContent = "Create a new Program"; // Reset button text
        console.log(`Successfully added new LMID: ${newLmid} (${currentLmidCount + 1}/5)`);

      } catch (error) {
        console.error("Failed to add new LMID:", error);
        alert(`An error occurred while trying to add a new LMID: ${error.message}`);
        addButton.disabled = false;
        addButton.textContent = "Create a new Program"; // Reset button text on error
      }
    });
  } else {
    console.error("Error: Could not find the 'Add LMID' button. Make sure the button on your page has the ID 'add-lmid'.");
  }
});