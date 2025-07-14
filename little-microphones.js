/**
 * little-microphones.js - Main Dashboard Controller
 * 
 * PURPOSE: Dashboard controller orchestrating authentication and LMID management UI
 * DEPENDENCIES: LM Auth System (loaded globally), Webflow, API endpoints
 * DOCUMENTATION: See /documentation/little-microphones.js.md for complete system overview
 * 
 * BROWSER COMPATIBILITY:
 * - Uses traditional JavaScript (no ES6 modules) for Webflow compatibility
 * - Relies on utils/lm-auth.js being loaded first to access window.LMAuth
 * - All functions available as global objects for immediate execution
 * 
 * MAIN FUNCTIONS:
 * - Dashboard initialization with auth system integration
 * - LMID UI population from templates
 * - Delete operations with file cleanup
 * - Add new LMID with limit enforcement
 * - World navigation routing to /members/record
 * 
 * PERFORMANCE IMPROVEMENTS:
 * - Centralized authentication reduces redundant API calls
 * - Efficient DOM manipulation with minimal Webflow re-initialization
 * - Event delegation for dynamic content
 * 
 * URL STRUCTURE:
 * - Dashboard URL: /members/little-microphones (new)
 * - Dashboard URL: /members/lm (deprecated)
 * - Recording URLs: /members/record?world=X&lmid=Y
 * - Radio URLs: /little-microphones?ID=shareId (public access)
 * 
 * LAST UPDATED: January 2025
 * VERSION: 3.2.0 (Renamed from lm.js)
 * STATUS: Production Ready ✅
 */

(function() {
    'use strict';

    // Wait for DOM and required dependencies
    document.addEventListener("DOMContentLoaded", async () => {
        console.log("🚀 Initializing Little Microphones Dashboard");
        
        // Wait for auth system to be available
        if (!window.LMAuth) {
            console.error("❌ LMAuth not found - ensure utils/lm-auth.js is loaded first");
            showErrorMessage("Authentication system not loaded. Please refresh the page.");
            return;
        }
        
        try {
            // Initialize authentication system
            const authSystem = window.LMAuth.getAuthSystem();
            const authResult = await authSystem.initialize();
            
            if (!authResult.success) {
                console.error("❌ Authentication system initialization failed:", authResult.error);
                return;
            }

            if (!authResult.authenticated) {
                console.log("👤 User not authenticated - showing login state");
                return;
            }

            console.log(`✅ User authenticated - ${authResult.lmidCount} LMID(s) found`);
            
            // Initialize UI with LMID data
            await initializeDashboardUI(authResult.lmids);
            
            // Setup event listeners with auth system
            setupEventListeners(authSystem);
            
            // Fix for Webflow's locale switcher stripping URL params
            setupLocaleSwitcherFix();
            
            console.log("🎉 Dashboard initialization complete");
            
        } catch (error) {
            console.error("💥 Dashboard initialization error:", error);
            showErrorMessage("Failed to initialize dashboard. Please refresh the page.");
        }
    });

    /**
     * Initialize dashboard UI with LMID data
     * 
     * TEMPLATE CLONING SYSTEM:
     * 1. Find and hide original template
     * 2. Clone template for each LMID
     * 3. Populate clone with LMID data
     * 4. Append to container
     * 5. Reinitialize Webflow interactions
     * 
     * @param {Array<string>} lmids - Array of LMID strings
     */
    async function initializeDashboardUI(lmids) {
        const template = document.getElementById("lm-slot");
        if (!template) {
            console.error("❌ Template element with ID 'lm-slot' not found");
            return;
        }

        // Always hide the original template
        template.style.display = "none";

        if (lmids.length === 0) {
            console.log("📝 No LMIDs to display");
            return;
        }

        const container = template.parentNode;
        if (!container) {
            console.error("❌ Could not find parent container for template");
            return;
        }

        console.log(`🔄 Creating UI elements for ${lmids.length} LMID(s)`);

        // Create UI elements for each LMID
        lmids.forEach(lmid => {
            const clone = createLMIDElement(template, lmid);
            container.appendChild(clone);
        });

        // Reinitialize Webflow interactions
        reinitializeWebflow();
    }

    /**
     * Create LMID UI element from template
     * 
     * @param {HTMLElement} template - Template element
     * @param {string} lmid - LMID to populate
     * @returns {HTMLElement} Populated clone
     */
    function createLMIDElement(template, lmid) {
        const clone = template.cloneNode(true);
        
        // Configure clone
        clone.style.display = "";
        clone.removeAttribute("id");
        clone.setAttribute("data-lmid", lmid);

        // Populate LMID number
        const numberElement = clone.querySelector("#lmid-number");
        if (numberElement) {
            numberElement.textContent = lmid;
            numberElement.removeAttribute("id");
        } else {
            console.warn(`⚠️ Could not find '#lmid-number' in template clone for LMID ${lmid}`);
        }
        
        return clone;
    }

    /**
     * Setup event listeners for dashboard interactions
     * @param {Object} authSystem - Global auth system instance
     */
    function setupEventListeners(authSystem) {
        // Store auth system globally for event handlers
        window.LM_AUTH_SYSTEM = authSystem;
        
        // Secure deletion flow
        document.body.addEventListener("click", handleDeleteClick);
        
        // World link redirection
        document.body.addEventListener("click", handleWorldNavigation);
        
        // Add new LMID
        const addButton = document.getElementById("add-lmid");
        if (addButton) {
            addButton.addEventListener("click", handleAddLMID);
        } else {
            console.error("❌ 'Add LMID' button not found - ensure button has ID 'add-lmid'");
        }
    }

    /**
     * Handle delete button clicks with comprehensive security
     * 
     * SECURE DELETION WORKFLOW:
     * 1. Identify delete target and LMID
     * 2. Show enhanced confirmation modal
     * 3. Delete files from cloud storage
     * 4. Update member metadata via API
     * 5. Remove UI element
     * 6. Handle errors with proper cleanup
     */
    async function handleDeleteClick(event) {
        const deleteButton = findDeleteButton(event.target);
        
        if (!deleteButton) return;

        const itemToDelete = deleteButton.closest("[data-lmid]");
        if (!itemToDelete) {
            console.error("❌ Could not find parent element with 'data-lmid' attribute");
            return;
        }

        const lmidToDelete = itemToDelete.getAttribute("data-lmid");
        if (!lmidToDelete) {
            console.error("❌ Could not find LMID to delete");
            return;
        }
        
        console.log(`🗑️ Delete request for LMID: ${lmidToDelete}`);
        
        // Enhanced confirmation with validation
        const confirmed = await showDeleteConfirmationModal(lmidToDelete);
        if (!confirmed) {
            console.log(`❌ Deletion cancelled for LMID ${lmidToDelete}`);
            return;
        }

        // Visual feedback for deletion in progress
        setDeletionInProgress(itemToDelete, deleteButton);
        
        try {
            // Get auth system and member data for deletion operation
            const authSystem = window.LM_AUTH_SYSTEM;
            const memberData = await authSystem.memberData.getMemberForLMIDOperation();
            
            // Delete associated files from cloud storage
            await deleteCloudFiles(lmidToDelete);
            
            // Prepare new LMID string
            const newLmidString = authSystem.lmidManager.removeLMIDFromMetadata(
                lmidToDelete, 
                memberData.currentLmids
            );

            // Call backend deletion API
            const response = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/lmid-operations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: 'delete',
                    memberId: memberData.memberId,
                    lmidToDelete: lmidToDelete,
                    newLmidString: newLmidString,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Server error during deletion");
            }

            // Success - remove UI element
            itemToDelete.remove();
            console.log(`✅ Successfully deleted LMID ${lmidToDelete}`);
            
            // Log parent cleanup results
            if (result.parentCleanup) {
                if (result.parentCleanup.success && result.parentCleanup.cleanedParents > 0) {
                    console.log(`👨‍👩‍👧‍👦 Parent cleanup: ${result.parentCleanup.cleanedParents} parent accounts updated`);
                    showSuccessMessage(`Program deleted successfully. ${result.parentCleanup.cleanedParents} parent account(s) were also updated.`);
                } else if (result.parentCleanup.cleanedParents === 0) {
                    console.log(`👨‍👩‍👧‍👦 Parent cleanup: No parent accounts needed updating`);
                    showSuccessMessage(`Program deleted successfully.`);
                } else {
                    console.warn(`⚠️ Parent cleanup failed: ${result.parentCleanup.message}`);
                    showSuccessMessage(`Program deleted successfully, but parent cleanup may have failed.`);
                }
            } else {
                showSuccessMessage(`Program deleted successfully.`);
            }

        } catch (error) {
            console.error(`💥 Failed to delete LMID ${lmidToDelete}:`, error);
            showErrorMessage(`Failed to delete LMID: ${error.message}`);
            
            // Reset UI state on error
            resetDeletionState(itemToDelete, deleteButton);
        }
    }

    /**
     * Handle world navigation clicks
     */
    function handleWorldNavigation(event) {
        const worldButton = event.target.closest("[data-world]");
        
        if (!worldButton) return;
        
        event.preventDefault();

        const world = worldButton.getAttribute("data-world");
        const programWrapper = worldButton.closest("[data-lmid]");

        if (!programWrapper) {
            console.error("❌ Could not find parent program for world link");
            showErrorMessage("Navigation error - please try again");
            return;
        }

        const lmid = programWrapper.getAttribute("data-lmid");
        const baseUrl = worldButton.getAttribute("href") || "/members/record";
        const newUrl = `${baseUrl}?world=${world}&lmid=${lmid}`;
        
        console.log(`🌍 Navigating to: ${newUrl}`);
        window.location.href = newUrl;
    }

    /**
     * Handle add new LMID button clicks
     */
    async function handleAddLMID() {
        const addButton = document.getElementById("add-lmid");
        
        try {
            console.log("➕ Add LMID request");
            
            // Get auth system and validate operation permissions
            const authSystem = window.LM_AUTH_SYSTEM;
            const validation = await authSystem.validateForOperation();
            
            if (!validation.success) {
                throw new Error(validation.error);
            }

            // Check LMID limit
            if (!validation.canCreateLMID) {
                const { currentCount, maxLmids } = validation.lmidStatus;
                throw new Error(`Maximum ${maxLmids} programs per user (currently ${currentCount}). Delete an existing program first.`);
            }

            // Set button state
            setButtonLoading(addButton, "Adding...");

            const memberData = validation.member;

            // Call backend creation API
            const response = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/lmid-operations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: 'add',
                    memberId: memberData.memberId,
                    memberEmail: memberData.memberEmail,
                    currentLmids: memberData.currentLmids,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Could not create new LMID");
            }

            const newLmid = result.lmid;
            console.log(`✅ Created LMID ${newLmid} with ShareIDs:`, result.shareIds);

            // Add new UI element
            addNewLMIDToUI(newLmid);
            
            console.log(`🎉 Successfully added LMID ${newLmid}`);

        } catch (error) {
            console.error("💥 Failed to add new LMID:", error);
            showErrorMessage(`Failed to create new program: ${error.message}`);
        } finally {
            // Reset button state
            resetButtonState(addButton, "Create a new Program");
        }
    }

    /**
     * Preserves URL parameters when user switches language via Webflow's locale switcher.
     * This version uses event delegation to intercept clicks, making it more robust
     * against script loading order issues with Webflow.
     */
    function setupLocaleSwitcherFix() {
        // Only run if there are parameters to preserve
        if (!window.location.search) {
            return;
        }

        console.log("🔗 Setting up robust locale switcher fix...");

        document.body.addEventListener('click', function(event) {
            // Find the link that was clicked by traversing up the DOM tree
            const link = event.target.closest('a.w-loc.w-dropdown-link');

            // If a locale link was clicked
            if (link) {
                // Prevent the default link behavior
                event.preventDefault();
                event.stopPropagation();

                const currentParams = window.location.search; // e.g., "?ID=ywaiy057"
                const destinationHref = link.getAttribute('href');

                if (destinationHref) {
                    // Construct the new URL
                    // Avoids duplicating params if they are somehow already there
                    const newUrl = destinationHref.includes('?') 
                        ? destinationHref 
                        : destinationHref + currentParams;
                    
                    console.log(`🚀 Locale link clicked. Redirecting to: ${newUrl}`);
                    
                    // Redirect to the new URL
                    window.location.href = newUrl;
                }
            }
        }, true); // Use capture phase to catch the event early
    }

    /**
     * UTILITY FUNCTIONS
     */

    /**
     * Find delete button in event path
     */
    function findDeleteButton(target) {
        // Check direct target
        if (target.id === "lm-delete") {
            return target;
        }
        
        // Use closest() method
        const closest = target.closest("#lm-delete");
        if (closest) {
            return closest;
        }
        
        // Manual traversal fallback
        let currentElement = target.parentElement;
        while (currentElement && currentElement !== document.body) {
            if (currentElement.id === "lm-delete") {
                return currentElement;
            }
            currentElement = currentElement.parentElement;
        }
        
        return null;
    }

    /**
     * Delete files from cloud storage
     */
    async function deleteCloudFiles(lmid) {
        try {
            console.log(`🗑️ Deleting cloud files for LMID ${lmid}`);
            
            const deleteFilesResponse = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/delete-audio`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deleteLmidFolder: true,
                    lmid: lmid
                })
            });

            const deleteResult = await deleteFilesResponse.json();
            
            if (!deleteResult.success) {
                console.warn(`⚠️ File deletion warning for LMID ${lmid}:`, deleteResult.error);
            } else {
                console.log(`✅ Cloud files deleted for LMID ${lmid}`);
            }
            
        } catch (error) {
            console.error(`💥 File deletion error for LMID ${lmid}:`, error);
            // Don't throw - file deletion is not critical for LMID removal
        }
    }

    /**
     * Set visual feedback for deletion in progress
     */
    function setDeletionInProgress(itemElement, buttonElement) {
        // Highlight item being deleted
        itemElement.style.border = '3px solid #ff4444';
        itemElement.style.borderRadius = '8px';
        itemElement.style.transition = 'all 0.3s ease';
        itemElement.style.boxShadow = '0 0 10px rgba(255, 68, 68, 0.3)';
        itemElement.style.backgroundColor = 'rgba(255, 68, 68, 0.05)';
        
        // Set button state
        if (buttonElement.tagName.toLowerCase() === 'button') {
            buttonElement.disabled = true;
            buttonElement.textContent = "Deleting...";
        } else {
            buttonElement.style.pointerEvents = 'none';
            buttonElement.style.opacity = '0.6';
            buttonElement.setAttribute('data-original-text', buttonElement.textContent);
            buttonElement.textContent = "Deleting...";
        }
    }

    /**
     * Reset deletion state on error
     */
    function resetDeletionState(itemElement, buttonElement) {
        // Remove highlighting
        itemElement.style.border = '';
        itemElement.style.borderRadius = '';
        itemElement.style.transition = '';
        itemElement.style.boxShadow = '';
        itemElement.style.backgroundColor = '';
        
        // Reset button state
        if (buttonElement.tagName.toLowerCase() === 'button') {
            buttonElement.disabled = false;
            buttonElement.textContent = "Delete";
        } else {
            buttonElement.style.pointerEvents = '';
            buttonElement.style.opacity = '';
            const originalText = buttonElement.getAttribute('data-original-text') || 'Delete';
            buttonElement.textContent = originalText;
            buttonElement.removeAttribute('data-original-text');
        }
    }

    /**
     * Set button loading state
     */
    function setButtonLoading(button, text) {
        button.disabled = true;
        button.textContent = text;
    }

    /**
     * Reset button state
     */
    function resetButtonState(button, text) {
        button.disabled = false;
        button.textContent = text;
    }

    /**
     * Add new LMID element to UI
     */
    function addNewLMIDToUI(newLmid) {
        const template = document.getElementById("lm-slot");
        const container = template.parentNode;
        
        if (!template || !container) {
            console.error("❌ Could not find template or container for new LMID");
            return;
        }

        const clone = createLMIDElement(template, newLmid);
        container.appendChild(clone);
        
        reinitializeWebflow();
    }

    /**
     * Reinitialize Webflow interactions
     */
    function reinitializeWebflow() {
        if (window.Webflow) {
            try {
                window.Webflow.destroy();
                window.Webflow.ready();
                window.Webflow.require("ix2").init();
                console.log("🔄 Webflow interactions reinitialized");
            } catch (error) {
                console.warn("⚠️ Webflow reinitialization warning:", error);
            }
        }
    }

    /**
     * Show error message to user
     */
    function showErrorMessage(message) {
        alert(message); // Simple implementation - could be enhanced with custom modal
    }

    /**
     * Show success message to user
     */
    function showSuccessMessage(message) {
        // Create a more pleasant success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 16px;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">✅</span>
                <span>${message}</span>
            </div>
        `;
        
        // Add animation keyframes if not already added
        if (!document.querySelector('#successNotificationStyles')) {
            const style = document.createElement('style');
            style.id = 'successNotificationStyles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    /**
     * Enhanced delete confirmation modal with validation
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
            const focusDelay = window.LM_CONFIG?.TIMEOUTS?.FOCUS_DELAY || 100;
            setTimeout(() => input.focus(), focusDelay);
            
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
                window.scrollTo(0, currentScrollY);
            }
        });
    }

    // Test function for Memberstack API debugging
    window.testMemberstackAPI = async function() {
        try {
            if (!window.LM_AUTH_SYSTEM) {
                console.error("Auth system not initialized");
                return;
            }
            
            const authResult = await window.LM_AUTH_SYSTEM.initialize();
            
            if (!authResult.authenticated) {
                console.error("Not logged in");
                return;
            }
            
            const memberData = await window.LM_AUTH_SYSTEM.memberData.getMemberForLMIDOperation();
            console.log(`Testing Memberstack API for member: ${memberData.memberId}`);
            
            const response = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/test-memberstack`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId: memberData.memberId })
            });
            
            const result = await response.json();
            console.log('Test result:', result);
            
        } catch (error) {
            console.error('Test failed:', error);
        }
    };
})();