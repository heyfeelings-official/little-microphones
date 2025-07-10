/**
 * Universal Verify Page Script
 * 
 * PURPOSE: Handle email verification for all user types (parents, teachers, etc.)
 * USAGE: <script src="https://little-microphones.vercel.app/verify-universal-redirect.js"></script>
 * 
 * FEATURES:
 * - Detect if user is registering as parent (has ShareID in localStorage)
 * - Show appropriate message based on user type
 * - Handle post-verification redirects
 * 
 * DEPENDENCIES: localStorage, Memberstack
 * VERSION: 1.0.0
 * LAST UPDATED: 10 stycznia 2025
 */

(function() {
    'use strict';
    
    console.log('[Universal Verify] Script loaded');
    
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
     * Log verification info to console only
     */
    function logVerificationInfo(isParent = false, shareId = null) {
        if (isParent) {
            console.log('[Universal Verify] Parent verification page - ShareID:', shareId);
        } else {
            console.log('[Universal Verify] Standard verification page');
        }
    }
    
    /**
     * Initialize verification page
     */
    function initVerificationPage() {
        // Check if this is a parent registration
        const savedData = getSavedRedirectData();
        const isParent = savedData && savedData.shareId;
        
        if (isParent) {
            console.log('[Universal Verify] Parent registration detected, ShareID:', savedData.shareId);
        }
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                logVerificationInfo(isParent, savedData?.shareId);
            });
        } else {
            logVerificationInfo(isParent, savedData?.shareId);
        }
    }
    
    // Initialize when script loads
    initVerificationPage();
    
})(); 