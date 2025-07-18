/**
 * Parent-Only Verify Page Script
 * 
 * PURPOSE: Show appropriate verification messages for different user types
 * USAGE: <script src="https://little-microphones.vercel.app/verify-universal-redirect.js"></script>
 * 
 * FEATURES:
 * - Detect if user is registering as parent (has ShareID in localStorage)
 * - Show appropriate message for parents vs other users
 * - DO NOT handle redirects - let the main little-microphones-redirect.js handle that
 * 
 * DEPENDENCIES: localStorage
 * VERSION: 2.1.0
 * LAST UPDATED: January 2025
 */

(function() {
    'use strict';
    
    console.log('[Parent Verify] Script v2.1.0 loaded');
    
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
     * Show appropriate verification message based on user type
     */
    function showVerificationMessage() {
        const savedData = getSavedRedirectData();
        const isParentWithShareId = savedData && savedData.shareId;
        
        if (isParentWithShareId) {
            console.log('[Parent Verify] Parent registration detected, ShareID:', savedData.shareId);
            showParentMessage();
        } else {
            console.log('[Parent Verify] No parent ShareID found - showing standard message');
            showStandardMessage();
        }
    }
    
    /**
     * Show message for parents
     */
    function showParentMessage() {
        // Try to find message container and update it
        const messageContainer = document.querySelector('.ms-verification-message') || 
                                document.querySelector('.verification-message') ||
                                document.querySelector('.message-container');
        
        if (messageContainer) {
            messageContainer.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h3 style="color: #1B6DE8; margin-bottom: 15px;">
                        👨‍👩‍👧‍👦 Sprawdź swoją skrzynkę pocztową!
                    </h3>
                    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 15px;">
                        Wysłaliśmy Ci email z linkiem weryfikacyjnym.
                    </p>
                    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 15px;">
                        Kliknij w link, aby uzyskać dostęp do programu.
                    </p>
                    <p style="font-size: 14px; color: #666; font-style: italic;">
                        💡 Po weryfikacji zostaniesz automatycznie przekierowany z powrotem do programu
                    </p>
                </div>
            `;
        }
    }
    
    /**
     * Show standard message for teachers/therapists
     */
    function showStandardMessage() {
        const messageContainer = document.querySelector('.ms-verification-message') || 
                                document.querySelector('.verification-message') ||
                                document.querySelector('.message-container');
        
        if (messageContainer) {
            messageContainer.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h3 style="color: #1B6DE8; margin-bottom: 15px;">
                        📧 Sprawdź swoją skrzynkę pocztową!
                    </h3>
                    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 15px;">
                        Wysłaliśmy Ci email z linkiem weryfikacyjnym.
                    </p>
                    <p style="font-size: 16px; line-height: 1.5;">
                        Kliknij w link, aby dokończyć rejestrację.
                    </p>
                </div>
            `;
        }
    }
    
    /**
     * Initialize verification page
     */
    function initVerificationPage() {
        // Wait for DOM to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(showVerificationMessage, 500);
            });
        } else {
            setTimeout(showVerificationMessage, 500);
        }
    }
    
    // Initialize when script loads
    initVerificationPage();
    
})(); 