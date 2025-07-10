/**
 * Verify Parent Redirect Script
 * 
 * PURPOSE: Handle parent email verification and redirect to original ShareID
 * USAGE: <script src="https://little-microphones.vercel.app/verify-parent-redirect.js"></script>
 * 
 * FEATURES:
 * - Detect email verification completion
 * - Check for saved ShareID data
 * - Redirect to original ShareID page after verification
 * - Show progress messages to user
 * 
 * DEPENDENCIES: localStorage, Memberstack
 * VERSION: 1.0.0
 * LAST UPDATED: 10 stycznia 2025
 */

(function() {
    'use strict';
    
    console.log('[Verify Parent] Script v1.0.0 loaded');
    
    /**
     * Get saved redirect data from localStorage
     */
    function getSavedRedirectData() {
        try {
            const saved = localStorage.getItem('lm_parent_redirect');
            if (!saved) return null;
            
            const data = JSON.parse(saved);
            
            // Check if data is not too old (24 hours max)
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            if (Date.now() - data.timestamp > maxAge) {
                console.log('[Verify Parent] Saved data is too old, clearing');
                clearSavedRedirectData();
                return null;
            }
            
            return data;
            
        } catch (error) {
            console.error('[Verify Parent] Error parsing saved redirect data:', error);
            clearSavedRedirectData();
            return null;
        }
    }
    
    /**
     * Clear saved redirect data
     */
    function clearSavedRedirectData() {
        localStorage.removeItem('lm_parent_redirect');
        console.log('[Verify Parent] Cleared saved redirect data');
    }
    
    /**
     * Show message to user
     */
    function showMessage(message, backgroundColor, icon) {
        // Remove existing message
        const existingMessage = document.getElementById('lm-verify-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.id = 'lm-verify-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${backgroundColor};
            color: white;
            padding: 32px 48px;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 18px;
            text-align: center;
            max-width: 500px;
            line-height: 1.6;
        `;
        messageEl.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
            <div style="font-weight: 600; margin-bottom: 8px;">${message}</div>
            <div style="font-size: 14px; opacity: 0.9;">Za chwilę zostaniesz przekierowany...</div>
        `;
        
        document.body.appendChild(messageEl);
    }
    
    /**
     * Handle verification page logic
     */
    async function handleVerificationPage() {
        try {
            console.log('[Verify Parent] Checking for saved redirect data');
            
            // Check for saved ShareID data
            const savedData = getSavedRedirectData();
            
            if (savedData && savedData.shareId) {
                console.log('[Verify Parent] Found saved ShareID:', savedData.shareId);
                
                // Show success message
                showMessage(
                    'Email zweryfikowany pomyślnie!',
                    '#10b981',
                    '✅'
                );
                
                // Wait a moment for user to see the message
                setTimeout(() => {
                    // Clear saved data
                    clearSavedRedirectData();
                    
                    // Redirect to original ShareID page
                    const redirectUrl = `/little-microphones?ID=${savedData.shareId}`;
                    console.log('[Verify Parent] Redirecting to:', redirectUrl);
                    window.location.href = redirectUrl;
                }, 2000);
                
            } else {
                console.log('[Verify Parent] No saved ShareID data found');
                
                // Show info message
                showMessage(
                    'Email zweryfikowany!',
                    '#3b82f6',
                    '✉️'
                );
                
                // Redirect to dashboard after delay
                setTimeout(() => {
                    window.location.href = '/members/little-microphones';
                }, 3000);
            }
            
        } catch (error) {
            console.error('[Verify Parent] Error:', error);
            showMessage(
                'Wystąpił błąd podczas weryfikacji',
                '#ef4444',
                '❌'
            );
        }
    }
    
    /**
     * Initialize verification handler
     */
    function initVerificationHandler() {
        console.log('[Verify Parent] Initializing verification handler');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                handleVerificationPage();
            });
        } else {
            handleVerificationPage();
        }
    }
    
    // Initialize when script loads
    initVerificationHandler();
    
})(); 