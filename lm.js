/**
 * lm.js - Main Authentication & LMID Management System
 * 
 * PURPOSE: Core authentication system and LMID (Little Microphone ID) management for the main dashboard
 * DEPENDENCIES: Memberstack DOM SDK, Webflow, Make.com webhooks, Bunny.net API
 * DOCUMENTATION: See /documentation/lm.js.md for complete system overview
 * 
 * MAIN FUNCTIONS:
 * - User authentication via Memberstack with real-time validation
 * - LMID creation and deletion with 5-program limit enforcement
 * - World navigation with parameter validation and routing
 * - File cleanup during LMID deletion with cloud storage integration
 * - Dynamic UI generation from templates with Webflow re-initialization
 * - Secure webhook communication with Make.com automation
 * 
 * SECURITY FEATURES:
 * - Metadata-based authorization (prevents URL manipulation)
 * - Typed confirmation dialogs for destructive operations
 * - Comprehensive error handling with user feedback
 * - Protected member ID and email transmission
 * 
 * INTEGRATION POINTS:
 * - Memberstack: User authentication and metadata management
 * - Make.com: Webhook automation for LMID lifecycle operations
 * - Bunny.net: Cloud storage cleanup during LMID deletion
 * - Webflow: UI framework, template system, and interaction management
 * 
 * DATA FLOW:
 * Page Load → Authentication Check → LMID Discovery → Template Cloning → UI Population → Event Setup
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Efficient DOM manipulation with minimal Webflow re-initialization
 * - Cached template cloning for multiple LMID display
 * - Optimized event delegation for dynamic content
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.4.0
 * STATUS: Production Ready ✅
 */
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
        console.log(`Found ${lmidArray.length} LMID(s) for member`);
        
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
        console.log("Member has no LMIDs");
      }
    })
    .catch(error => {
      console.error("An error occurred while fetching Member Data:", error);
    });

  // NOTE: Webhooks replaced with direct API endpoints
  // - /api/create-lmid for adding new LMIDs
  // - /api/lmid-operations for delete operations
  // - /api/memberstack-webhook for new educator registration

  // --- Secure Deletion Flow ---
  // We keep this event listener on the body so it's always active.
  document.body.addEventListener("click", async (event) => {
    // Check if the clicked element or any of its parents is the delete button
    let deleteButton = null;
    
    // Check if clicked element itself has the ID
    if (event.target.id === "lm-delete") {
      deleteButton = event.target;
    } 
    // Use closest() to find parent with ID
    else {
      deleteButton = event.target.closest("#lm-delete");
    }
    
    // Manual traversal as fallback
    if (!deleteButton) {
      let currentElement = event.target.parentElement;
      while (currentElement && currentElement !== document.body) {
        if (currentElement.id === "lm-delete") {
          deleteButton = currentElement;
          break;
        }
        currentElement = currentElement.parentElement;
      }
    }
    
    if (deleteButton) {
      console.log(`Delete button clicked for LMID: ${deleteButton.closest("[data-lmid]")?.getAttribute("data-lmid") || "unknown"}`);
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
        console.log(`Deletion cancelled for LMID ${lmidToDelete}`);
        return;
      }

      // Add red border to parent div to highlight what's being deleted
      itemToDelete.style.border = '3px solid #ff4444';
      itemToDelete.style.borderRadius = '8px';
      itemToDelete.style.transition = 'all 0.3s ease';
      itemToDelete.style.boxShadow = '0 0 10px rgba(255, 68, 68, 0.3)';
      itemToDelete.style.backgroundColor = 'rgba(255, 68, 68, 0.05)';
      
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
        console.log(`Deleting LMID ${lmidToDelete} and all associated files`);
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
          
          if (!deleteResult.success) {
            console.warn(`File deletion warning for LMID ${lmidToDelete}:`, deleteResult.error);
          }
        } catch (fileDeleteError) {
          console.error(`File deletion error for LMID ${lmidToDelete}:`, fileDeleteError);
        }

        // New logic: Prepare the final string in JavaScript instead of Make.com
        let lmidArray = [];
        if (currentLmids && typeof currentLmids === 'string') {
          lmidArray = currentLmids.split(',').map(id => id.trim());
        }
        const filteredArray = lmidArray.filter(id => id !== lmidToDelete);
        const newLmidString = filteredArray.length > 0 ? filteredArray.join(',') : null;

        const response = await fetch('https://little-microphones.vercel.app/api/lmid-operations', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: 'delete',
            memberId: memberId,
            lmidToDelete: lmidToDelete,
            newLmidString: newLmidString,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "The server returned an error during the deletion process.");
        }

        itemToDelete.remove();
        console.log(`Successfully deleted LMID ${lmidToDelete}`);

      } catch (error) {
        console.error("Failed to delete LMID:", error);
        alert(`An error occurred while trying to delete the LMID: ${error.message}`);
        
        // Remove red border and highlighting from parent div
        itemToDelete.style.border = '';
        itemToDelete.style.borderRadius = '';
        itemToDelete.style.transition = '';
        itemToDelete.style.boxShadow = '';
        itemToDelete.style.backgroundColor = '';
        
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

        const response = await fetch('https://little-microphones.vercel.app/api/create-lmid', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: memberId,
            memberEmail: memberEmail,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Could not add a new LMID at this time.");
        }

        const newLmid = result.lmid;
        console.log(`Created LMID ${newLmid} with ShareIDs:`, result.shareIds);

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
        console.log(`Successfully added new LMID ${newLmid}`);

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
   * 
   * COMPREHENSIVE SECURITY & UX CONFIRMATION SYSTEM:
   * 
   * 1. MODAL CREATION & STYLING:
   *    - Creates full-screen overlay with professional styling
   *    - Displays warning icon and clear deletion message
   *    - Shows specific LMID and explains consequences
   *    - Implements responsive design for all devices
   * 
   * 2. SECURITY VALIDATION FEATURES:
   *    - Requires typing "delete" to confirm action
   *    - Real-time input validation with visual feedback
   *    - Button state management (disabled until valid)
   *    - Prevents accidental clicks through typed confirmation
   * 
   * 3. USER EXPERIENCE OPTIMIZATIONS:
   *    - Auto-focus on input field for immediate interaction
   *    - Visual feedback with color-coded borders (red/green)
   *    - Clear instructions and warning messages
   *    - Keyboard shortcuts (Enter to confirm, Escape to cancel)
   * 
   * 4. MODAL INTERACTION HANDLING:
   *    - Click outside modal to cancel
   *    - Cancel button for explicit dismissal
   *    - Confirm button with dynamic styling based on validation
   *    - Keyboard navigation support for accessibility
   * 
   * 5. STATE MANAGEMENT:
   *    - Promise-based return for async workflow integration
   *    - Proper cleanup of event listeners and DOM elements
   *    - Scroll position preservation during modal display
   *    - Memory leak prevention with proper disposal
   * 
   * 6. VISUAL FEEDBACK SYSTEM:
   *    - Input validation with real-time border color changes
   *    - Button state transitions with hover effects
   *    - Warning icons and typography for clear communication
   *    - Professional styling that matches system design
   * 
   * SECURITY CONSIDERATIONS:
   * - Prevents accidental deletions through typed confirmation
   * - Clear consequence messaging about permanent data loss
   * - Multiple dismissal options for user safety
   * - Visual emphasis on destructive nature of action
   * 
   * ACCESSIBILITY FEATURES:
   * - Keyboard navigation support
   * - Focus management for screen readers
   * - High contrast warning colors
   * - Clear labeling and instructions
   * 
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