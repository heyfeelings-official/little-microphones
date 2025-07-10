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
    
    console.log('[Universal Verify] Script v1.0.0 loaded');
    
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
                console.log('[Universal Verify] Saved data is too old, clearing');
                localStorage.removeItem('lm_parent_redirect');
                return null;
            }
            
            return data;
            
        } catch (error) {
            console.error('[Universal Verify] Error parsing saved redirect data:', error);
            localStorage.removeItem('lm_parent_redirect');
            return null;
        }
    }
    
    /**
     * Show verification message based on user type
     */
    function showVerificationMessage(isParent = false, shareId = null) {
        // Remove any existing message
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 48px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
            max-width: 500px;
            line-height: 1.6;
        `;
        
        if (isParent) {
            messageEl.innerHTML = `
                <div style="font-size: 64px; margin-bottom: 20px;">👨‍👩‍👧‍👦</div>
                <div style="font-size: 24px; font-weight: 600; margin-bottom: 16px;">
                    Sprawdź swoją skrzynkę pocztową!
                </div>
                <div style="font-size: 16px; opacity: 0.9; margin-bottom: 24px;">
                    Wysłaliśmy Ci email z linkiem weryfikacyjnym.<br>
                    Kliknij w link, aby uzyskać dostęp do programu.
                </div>
                <div style="font-size: 14px; opacity: 0.8; padding: 16px; background: rgba(255,255,255,0.1); border-radius: 12px;">
                    💡 Po weryfikacji zostaniesz automatycznie przekierowany z powrotem do programu
                </div>
            `;
        } else {
            messageEl.innerHTML = `
                <div style="font-size: 64px; margin-bottom: 20px;">📧</div>
                <div style="font-size: 24px; font-weight: 600; margin-bottom: 16px;">
                    Sprawdź swoją skrzynkę pocztową!
                </div>
                <div style="font-size: 16px; opacity: 0.9; margin-bottom: 24px;">
                    Wysłaliśmy Ci email z linkiem weryfikacyjnym.<br>
                    Kliknij w link, aby dokończyć rejestrację.
                </div>
            `;
        }
        
        document.body.appendChild(messageEl);
    }
    
    /**
     * Initialize verification page
     */
    function initVerificationPage() {
        console.log('[Universal Verify] Initializing verification page');
        
        // Check if this is a parent registration
        const savedData = getSavedRedirectData();
        const isParent = savedData && savedData.shareId;
        
        console.log('[Universal Verify] Is parent registration:', isParent);
        if (isParent) {
            console.log('[Universal Verify] ShareID found:', savedData.shareId);
        }
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                showVerificationMessage(isParent, savedData?.shareId);
            });
        } else {
            showVerificationMessage(isParent, savedData?.shareId);
        }
    }
    
    // Initialize when script loads
    initVerificationPage();
    
})(); 