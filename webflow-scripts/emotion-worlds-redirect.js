/**
 * Webflow Custom Code Script for /members/emotion-worlds page
 * 
 * PURPOSE: Handle post-verification redirects for parent registration
 * USAGE: Add this script to /members/emotion-worlds page Custom Code in Webflow
 * 
 * FEATURES:
 * - Check for saved redirect data from parent registration
 * - Redirect back to original ShareID page after successful verification
 * - Clean up localStorage after successful redirect
 * 
 * DEPENDENCIES: localStorage, Memberstack
 */

(function() {
    'use strict';
    
    console.log('[Emotion Worlds Redirect] Script loaded');
    
    /**
     * Handle redirect after email verification
     */
    async function handlePostVerificationRedirect() {
        try {
            console.log('[Emotion Worlds] Checking for post-verification redirect');
            
            const savedData = getSavedRedirectData();
            if (!savedData) {
                console.log('[Emotion Worlds] No saved redirect data found');
                return;
            }
            
            console.log('[Emotion Worlds] Found saved data:', savedData);
            
            // Check if user is now logged in
            const isLoggedIn = await checkMemberstackLogin();
            
            if (isLoggedIn) {
                console.log('[Emotion Worlds] User is now logged in, redirecting to ShareID');
                
                // Clear saved data
                clearSavedRedirectData();
                
                // Show redirect message
                showRedirectMessage();
                
                // Redirect to original ShareID page after short delay
                setTimeout(() => {
                    const redirectUrl = `/little-microphones?ID=${savedData.shareId}`;
                    console.log('[Emotion Worlds] Redirecting to:', redirectUrl);
                    window.location.href = redirectUrl;
                }, 2000);
            } else {
                console.log('[Emotion Worlds] User still not logged in, keeping saved data');
            }
            
        } catch (error) {
            console.error('[Emotion Worlds] Error in handlePostVerificationRedirect:', error);
        }
    }
    
    /**
     * Check if user is logged in to Memberstack
     */
    async function checkMemberstackLogin() {
        try {
            if (typeof window.MemberStack === 'undefined') {
                console.log('[Emotion Worlds] MemberStack not loaded yet');
                return false;
            }
            
            const member = await window.MemberStack.onReady.then(() => {
                return window.MemberStack.getCurrentMember();
            });
            
            return member && member.id;
            
        } catch (error) {
            console.error('[Emotion Worlds] Error checking login status:', error);
            return false;
        }
    }
    
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
                console.log('[Emotion Worlds] Saved data is too old, clearing');
                clearSavedRedirectData();
                return null;
            }
            
            return data;
            
        } catch (error) {
            console.error('[Emotion Worlds] Error parsing saved redirect data:', error);
            clearSavedRedirectData();
            return null;
        }
    }
    
    /**
     * Clear saved redirect data
     */
    function clearSavedRedirectData() {
        localStorage.removeItem('lm_parent_redirect');
        console.log('[Emotion Worlds] Cleared saved redirect data');
    }
    
    /**
     * Show redirect message to user
     */
    function showRedirectMessage() {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.id = 'lm-redirect-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #3b82f6;
            color: white;
            padding: 24px 32px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 16px;
            text-align: center;
            max-width: 400px;
        `;
        messageEl.innerHTML = `
            <div style="margin-bottom: 8px;">✅ Email zweryfikowany!</div>
            <div style="font-size: 14px; opacity: 0.9;">Przekierowujemy Cię z powrotem do programu...</div>
        `;
        
        document.body.appendChild(messageEl);
    }
    
    /**
     * Initialize redirect system
     */
    function initRedirectSystem() {
        console.log('[Emotion Worlds] Initializing redirect system');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                handlePostVerificationRedirect();
            });
        } else {
            handlePostVerificationRedirect();
        }
    }
    
    // Initialize when script loads
    initRedirectSystem();
    
})(); 