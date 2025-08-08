/**
 * Emotion Worlds Unlock & Lock Management
 * 
 * PURPOSE: Fix locked world items that are still clickable despite visual lock state
 * USAGE: <script src="https://little-microphones.vercel.app/emotion-worlds-unlock.js"></script>
 * 
 * FEATURES:
 * - Prevent clicks on locked world items
 * - Show unlock message for locked worlds
 * - Handle paid plan unlocking logic
 * 
 * DEPENDENCIES: Memberstack
 * VERSION: 1.0.0
 * LAST UPDATED: January 2025
 */

(function() {
    'use strict';
    
    console.log('[Emotion Worlds Unlock] Script v1.0.0 loaded');
    
    /**
     * Initialize world lock management
     */
    function initWorldLockManagement() {
        // Wait for DOM and Memberstack to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupWorldLocks);
        } else {
            setupWorldLocks();
        }
    }
    
    /**
     * Setup click prevention for locked worlds
     */
    function setupWorldLocks() {
        console.log('[Emotion Worlds] Setting up world lock management');
        
        // Find all world items that have locked wrappers
        const worldItems = document.querySelectorAll('.world-item');
        
        worldItems.forEach(worldItem => {
            const lockedWrapper = worldItem.querySelector('.world-item-locked-wrapper');
            
            if (lockedWrapper) {
                // Check if the locked wrapper is currently visible (not hidden by Memberstack)
                const isLocked = isElementVisible(lockedWrapper);
                
                if (isLocked) {
                    console.log('[Emotion Worlds] Found locked world item:', worldItem);
                    
                    // Prevent click events on the entire world item
                    worldItem.addEventListener('click', handleLockedWorldClick, true);
                    
                    // Add visual indication that it's not clickable
                    worldItem.style.cursor = 'not-allowed';
                    
                    // Ensure the locked wrapper is on top
                    lockedWrapper.style.pointerEvents = 'auto';
                    lockedWrapper.style.position = 'absolute';
                    lockedWrapper.style.top = '0';
                    lockedWrapper.style.left = '0';
                    lockedWrapper.style.width = '100%';
                    lockedWrapper.style.height = '100%';
                    lockedWrapper.style.zIndex = '10';
                    lockedWrapper.style.display = 'flex';
                    lockedWrapper.style.alignItems = 'center';
                    lockedWrapper.style.justifyContent = 'center';
                    
                    // Make the parent container relative for absolute positioning
                    worldItem.style.position = 'relative';
                }
            }
        });
        
        // Monitor for Memberstack changes (when plans change)
        observeMemberstackChanges();
    }
    
    /**
     * Handle clicks on locked world items
     */
    function handleLockedWorldClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('[Emotion Worlds] Blocked click on locked world');
        
        // Show unlock message
        showUnlockMessage();
        
        return false;
    }
    
    /**
     * Check if an element is visible (not hidden by CSS or Memberstack)
     */
    function isElementVisible(element) {
        if (!element) return false;
        
        const style = getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0';
    }
    
    /**
     * Show unlock message to user
     */
    function showUnlockMessage() {
        // Remove any existing message
        const existingMessage = document.getElementById('unlock-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.id = 'unlock-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f59e0b;
            color: white;
            padding: 24px 32px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 16px;
            text-align: center;
            max-width: 400px;
            line-height: 1.5;
            animation: fadeIn 0.3s ease-out;
        `;
        
        messageEl.innerHTML = `
            <div style="margin-bottom: 8px; font-size: 18px;">🔒 World Locked</div>
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 16px;">
                This emotion world is available for paid plans only.
            </div>
            <button onclick="this.parentElement.remove()" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            ">Close</button>
        `;
        
        // Add fade-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -60%); }
                to { opacity: 1; transform: translate(-50%, -50%); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(messageEl);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentElement) {
                messageEl.remove();
            }
        }, 5000);
    }
    
    /**
     * Observe Memberstack changes to update lock states
     */
    function observeMemberstackChanges() {
        // Create a MutationObserver to watch for Memberstack changes
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                // Check if any data-ms-content elements changed
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'style') {
                    const element = mutation.target;
                    if (element.hasAttribute('data-ms-content')) {
                        shouldUpdate = true;
                    }
                }
            });
            
            if (shouldUpdate) {
                console.log('[Emotion Worlds] Memberstack content changed, updating locks');
                setTimeout(setupWorldLocks, 100); // Small delay to let Memberstack finish
            }
        });
        
        // Start observing
        observer.observe(document.body, {
            attributes: true,
            subtree: true,
            attributeFilter: ['style']
        });
    }
    
    // Initialize when script loads
    initWorldLockManagement();
    
})();
