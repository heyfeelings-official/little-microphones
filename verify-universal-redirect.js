/**
 * Parent-Only Verify Page Script
 * 
 * PURPOSE: Handle email verification redirects ONLY for parents with ShareID
 * USAGE: <script src="https://little-microphones.vercel.app/verify-universal-redirect.js"></script>
 * 
 * FEATURES:
 * - Detect if user is registering as parent (has ShareID in localStorage)
 * - Handle post-verification redirects ONLY for parents
 * - Leave native Memberstack redirects for teachers, therapists, and clean registrations
 * 
 * DEPENDENCIES: localStorage, Memberstack
 * VERSION: 2.0.0
 * LAST UPDATED: January 2025
 */

(function() {
    'use strict';
    
    console.log('[Parent Verify] Script loaded');
    
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
                localStorage.removeItem('lm_parent_redirect');
                return null;
            }
            
            return data;
            
        } catch (error) {
            localStorage.removeItem('lm_parent_redirect');
            return null;
        }
    }
    
    /**
     * Handle parent redirect to ShareID
     */
    function handleParentRedirect(shareId) {
        console.log('[Parent Verify] Redirecting parent to ShareID:', shareId);
        
        // Clean up localStorage
        localStorage.removeItem('lm_parent_redirect');
        
        // Redirect to ShareID
        const redirectUrl = `/little-microphones?ID=${shareId}`;
        console.log('[Parent Verify] Redirecting to:', redirectUrl);
        
        // Small delay to ensure verification is complete
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 2000);
    }
    
    /**
     * Initialize verification page
     */
    function initVerificationPage() {
        // Check if this is a parent registration with ShareID
        const savedData = getSavedRedirectData();
        const isParentWithShareId = savedData && savedData.shareId;
        
        if (isParentWithShareId) {
            console.log('[Parent Verify] Parent registration detected, ShareID:', savedData.shareId);
            
            const setupVerificationHandler = () => {
                window.MemberStack.onReady.then(member => {
                    // Check if member is already verified upon page load
                    if (member && member.verified) {
                        console.log('[Parent Verify] Member is already verified. Redirecting...');
                        handleParentRedirect(savedData.shareId);
                        return;
                    }

                    // If not verified, listen for the verification event
                    window.MemberStack.on('member:verified', () => {
                        console.log('[Parent Verify] Member successfully verified. Redirecting...');
                        handleParentRedirect(savedData.shareId);
                    });
                }).catch(error => {
                    console.error('[Parent Verify] MemberStack onReady error:', error);
                });
            };

            // Wait for MemberStack to be initialized
            if (window.MemberStack) {
                setupVerificationHandler();
            } else {
                // Poll for Memberstack to become available if it's not ready yet
                let attempts = 0;
                const maxAttempts = 50; // Try for 5 seconds
                const interval = setInterval(() => {
                    attempts++;
                    if (window.MemberStack) {
                        clearInterval(interval);
                        setupVerificationHandler();
                    } else if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        console.error('[Parent Verify] MemberStack did not load in time.');
                    }
                }, 100);
            }
        } else {
            console.log('[Parent Verify] No parent ShareID found - using native Memberstack redirects');
            // Do nothing - let Memberstack handle native redirects for teachers/therapists
        }
    }
    
    // Initialize when script loads
    initVerificationPage();
    
})(); 