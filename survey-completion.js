/**
 * Survey Completion Handler - Minimal Script
 * 
 * PURPOSE: Handle survey completion with confetti and page reload
 * USAGE: <script src="https://little-microphones.vercel.app/survey-completion.js"></script>
 * 
 * FEATURES:
 * - Detect ?survey=filled parameter
 * - Show confetti celebration
 * - Wait 2 seconds then reload page with survey parameter removed
 * - Show confetti for 5s after reload
 * - No toast notifications
 * 
 * VERSION: 1.1.1
 * LAST UPDATED: January 2025
 */

(function() {
    'use strict';
    
    /**
     * Check if we're coming from survey completion
     */
    function checkSurveyCompletion() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('survey') === 'filled';
    }
    
    /**
     * Check if we're coming from a reload (second load)
     */
    function checkFromReload() {
        return sessionStorage.getItem('survey_reload') === 'true';
    }
    
    /**
     * Mark as coming from reload
     */
    function markAsReload() {
        sessionStorage.setItem('survey_reload', 'true');
    }
    
    /**
     * Clear reload flag
     */
    function clearReloadFlag() {
        sessionStorage.removeItem('survey_reload');
    }
    
    /**
     * Show confetti celebration
     */
    function showConfetti(duration = 6000) {
        // Create confetti container
        const confettiContainer = document.createElement('div');
        confettiContainer.id = 'survey-confetti';
        confettiContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            overflow: hidden;
        `;
        
        // Create confetti pieces
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                background-color: ${colors[Math.floor(Math.random() * colors.length)]};
                top: -10px;
                left: ${Math.random() * 100}%;
                animation: fall ${Math.random() * 3 + 2}s linear infinite;
                animation-delay: ${Math.random() * 2}s;
                opacity: 0.8;
            `;
            confettiContainer.appendChild(confetti);
        }
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fall {
                0% {
                    transform: translateY(-100vh) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(100vh) rotate(360deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Add to page
        document.body.appendChild(confettiContainer);
        
        // Remove after animation
        setTimeout(() => {
            if (confettiContainer.parentNode) {
                confettiContainer.parentNode.removeChild(confettiContainer);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, duration);
    }
    
    // UI manipulation completely removed for testing
    
    /**
     * Main initialization function
     */
    async function initializeSurveyCompletion() {
        // Check if we're coming from survey completion
        if (checkSurveyCompletion()) {
            // First load with survey parameter
            showConfetti();
            markAsReload();
            
            // Wait 2 seconds then reload page with survey parameter removed
            setTimeout(() => {
                const url = new URL(window.location);
                url.searchParams.delete('survey');
                window.location.href = url.toString();
            }, 2000);
            
        } else if (checkFromReload()) {
            // Second load after reload - show confetti for 5s
            showConfetti(5000);
            clearReloadFlag();
        }
        // If neither condition is met, do nothing (no logs)
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSurveyCompletion);
    } else {
        // Small delay to ensure everything is ready
        setTimeout(initializeSurveyCompletion, 100);
    }
    
})();
