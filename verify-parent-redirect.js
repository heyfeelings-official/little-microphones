/**
 * Verify Parent Page Script
 * 
 * PURPOSE: Show verification message and instructions for parents
 * USAGE: <script src="https://little-microphones.vercel.app/verify-parent-redirect.js"></script>
 * 
 * FEATURES:
 * - Show friendly message about email verification
 * - Provide clear instructions to user
 * - No complex redirect logic (handled by main script)
 * 
 * DEPENDENCIES: None
 * VERSION: 2.0.0
 * LAST UPDATED: 10 stycznia 2025
 */

(function() {
    'use strict';
    
    console.log('[Verify Parent] Script v2.0.0 loaded');
    
    /**
     * Show verification message
     */
    function showVerificationMessage() {
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
        messageEl.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px;">📧</div>
            <div style="font-size: 24px; font-weight: 600; margin-bottom: 16px;">
                Sprawdź swoją skrzynkę pocztową!
            </div>
            <div style="font-size: 16px; opacity: 0.9; margin-bottom: 24px;">
                Wysłaliśmy Ci email z linkiem weryfikacyjnym.<br>
                Kliknij w link, aby dokończyć rejestrację.
            </div>
            <div style="font-size: 14px; opacity: 0.8; padding: 16px; background: rgba(255,255,255,0.1); border-radius: 12px;">
                💡 Po weryfikacji zostaniesz automatycznie przekierowany z powrotem do programu
            </div>
        `;
        
        document.body.appendChild(messageEl);
    }
    
    /**
     * Initialize verification page
     */
    function initVerificationPage() {
        console.log('[Verify Parent] Initializing verification page');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                showVerificationMessage();
            });
        } else {
            showVerificationMessage();
        }
    }
    
    // Initialize when script loads
    initVerificationPage();
    
})(); 