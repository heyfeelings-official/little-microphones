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
      console.log("Delete button clicked:", event.target.tagName, event.target);
      
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
      
      // Enhanced confirmation with custom modal and validation
      const confirmed = await showDeleteConfirmationModal(lmidToDelete);
      
      if (!confirmed) {
        console.log(`Deletion cancelled for LMID: ${lmidToDelete}`);
        return;
      }

      // Handle both button and div elements
      if (deleteButton.tagName.toLowerCase() === 'button') {
        deleteButton.disabled = true;
        deleteButton.textContent = "Deleting...";
      } else {
        // For div elements, add visual feedback
        deleteButton.style.pointerEvents = 'none';
        deleteButton.style.opacity = '0.6';
        const originalText = deleteButton.textContent;
        deleteButton.textContent = "Deleting...";
        deleteButton.setAttribute('data-original-text', originalText);
      }

      try {
        // Get the most current member data right before sending the request
        const { data: memberData } = await memberstack.getCurrentMember();
        if (!memberData) {
          throw new Error("You are no longer logged in.");
        }
        const memberId = memberData.id;
        const currentLmids = memberData.metaData.lmids;

        // Delete all associated files from Bunny.net storage before removing LMID
        console.log(`Deleting all Bunny.net files for LMID: ${lmidToDelete}`);
        try {
          const deleteFilesResponse = await fetch('https://little-microphones.vercel.app/api/delete-audio', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deleteLmidFolder: true,
              lmid: lmidToDelete
            })
          });

          const deleteResult = await deleteFilesResponse.json();
          
          if (deleteResult.success) {
            console.log(`Successfully deleted all files for LMID ${lmidToDelete} from Bunny.net`);
          } else {
            console.warn(`Failed to delete some files for LMID ${lmidToDelete}:`, deleteResult.error);
            // Continue with LMID deletion even if file deletion partially fails
          }
        } catch (fileDeleteError) {
          console.error(`Error deleting files for LMID ${lmidToDelete}:`, fileDeleteError);
          // Continue with LMID deletion even if file deletion fails
        }

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
        
        // Reset button state for both button and div elements
        if (deleteButton.tagName.toLowerCase() === 'button') {
          deleteButton.disabled = false;
          deleteButton.textContent = "Delete";
        } else {
          // For div elements, restore original state
          deleteButton.style.pointerEvents = '';
          deleteButton.style.opacity = '';
          const originalText = deleteButton.getAttribute('data-original-text') || 'Delete';
          deleteButton.textContent = originalText;
          deleteButton.removeAttribute('data-original-text');
        }
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
          alert("Maximum 5 programs per user. Delete an existing program to create a new one.");
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

  /**
   * Show custom delete confirmation modal with validation
   * @param {string} lmidToDelete - The LMID to delete
   * @returns {Promise<boolean>} - True if confirmed, false if cancelled
   */
  function showDeleteConfirmationModal(lmidToDelete) {
    return new Promise((resolve) => {
      // Save current scroll position
      const currentScrollY = window.scrollY;
      
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `;
      
      // Create modal content
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        text-align: center;
      `;
      
      modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
        <h2 style="color: #d32f2f; margin: 0 0 20px 0; font-size: 24px;">WARNING</h2>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
          This will permanently delete the <strong>Radio Program ${lmidToDelete}</strong> and <strong>ALL associated recordings</strong>!
        </p>
        <p style="margin: 0 0 30px 0; font-size: 16px; color: #666;">
          This action cannot be undone.
        </p>
        <p style="margin: 0 0 15px 0; font-size: 16px; color: #666;">
          To confirm, please type "delete" below:
        </p>
        <input type="text" id="deleteConfirmInput" placeholder="Type 'delete' to confirm" 
               style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px; margin-bottom: 20px; box-sizing: border-box;">
        <div style="display: flex; gap: 15px; justify-content: center;">
          <button id="cancelBtn" style="padding: 12px 24px; border: 2px solid #666; background: white; color: #666; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Cancel
          </button>
          <button id="confirmBtn" style="padding: 12px 24px; border: none; background: #ccc; color: white; border-radius: 6px; cursor: not-allowed; font-size: 16px;" disabled>
            Delete Forever
          </button>
        </div>
      `;
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      // Get elements
      const input = modal.querySelector('#deleteConfirmInput');
      const confirmBtn = modal.querySelector('#confirmBtn');
      const cancelBtn = modal.querySelector('#cancelBtn');
      
      // Focus on input
      setTimeout(() => input.focus(), 100);
      
      // Validate input in real-time
      input.addEventListener('input', () => {
        const value = input.value.toLowerCase();
        if (value === 'delete') {
          confirmBtn.disabled = false;
          confirmBtn.style.cssText = 'padding: 12px 24px; border: none; background: #d32f2f; color: white; border-radius: 6px; cursor: pointer; font-size: 16px;';
          input.style.borderColor = '#4caf50';
        } else {
          confirmBtn.disabled = true;
          confirmBtn.style.cssText = 'padding: 12px 24px; border: none; background: #ccc; color: white; border-radius: 6px; cursor: not-allowed; font-size: 16px;';
          input.style.borderColor = value.length > 0 ? '#f44336' : '#ddd';
        }
      });
      
      // Handle Enter key
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !confirmBtn.disabled) {
          cleanup();
          resolve(true);
        } else if (e.key === 'Escape') {
          cleanup();
          resolve(false);
        }
      });
      
      // Handle buttons
      confirmBtn.addEventListener('click', () => {
        if (!confirmBtn.disabled) {
          cleanup();
          resolve(true);
        }
      });
      
      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
      
      // Handle overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });
      
      // Cleanup function
      function cleanup() {
        document.body.removeChild(overlay);
        // Restore scroll position
        window.scrollTo(0, currentScrollY);
      }
    });
  }
});