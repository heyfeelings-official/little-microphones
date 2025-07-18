/**
 * Survey Completion Handler - Minimal Script
 * 
 * PURPOSE: Handle survey completion with confetti and immediate UI updates
 * USAGE: <script src="https://little-microphones.vercel.app/survey-completion.js"></script>
 * 
 * FEATURES:
 * - Detect ?survey=filled parameter
 * - Show confetti celebration
 * - Update UI elements immediately
 * - No page reload needed
 * - No toast notifications
 * - Keep DIV with ID "survey-filled" visible
 * 
 * VERSION: 1.0.7
 * LAST UPDATED: January 2025
 */

(function() {
    'use strict';
    
    console.log('[Survey Completion] Script v1.0.7 loaded');
    
    /**
     * Check if we're coming from survey completion
     */
    function checkSurveyCompletion() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('survey') === 'filled';
    }
    
    /**
     * Show confetti celebration
     */
    function showConfetti() {
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
        }, 6000);
        
        console.log('🎉 Confetti celebration started!');
    }
    
    /**
     * Wait for Memberstack to be available
     */
    function waitForMemberstack(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const memberstack = window.$memberstackDom || window.memberstack;
            if (memberstack) {
                resolve();
                return;
            }
            
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                const memberstack = window.$memberstackDom || window.memberstack;
                if (memberstack) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    reject(new Error('Memberstack loading timeout'));
                }
            }, 100);
        });
    }
    
    /**
     * Update UI elements - unlock content and remove grayscale
     * Keep DIV with ID "survey-filled" visible - DO NOT HIDE IT
     */
    async function updateUIElements() {
        try {
            console.log('🎨 Updating UI elements for educator access...');
            
            // Wait for Memberstack and check plan
            await waitForMemberstack();
            const memberstack = window.$memberstackDom || window.memberstack;
            
            if (memberstack) {
                const member = await memberstack.getCurrentMember();
                if (member && member.data) {
                    console.log('📊 Member data:', member.data);
                    
                    const hasEducatorPlan = member.data.planConnections && 
                        member.data.planConnections.some(plan => 
                            plan.planId === 'pln_educators-free-promo-ebfw0xzj'
                        );
                    
                    if (hasEducatorPlan) {
                        console.log('✅ Educator plan confirmed!');
                    }
                }
            }
            
            // Remove grayscale filters
            const grayscaleElements = document.querySelectorAll('[style*="filter"]');
            grayscaleElements.forEach(element => {
                const currentFilter = element.style.filter;
                if (currentFilter && currentFilter.includes('grayscale')) {
                    element.style.filter = currentFilter.replace(/grayscale\([^)]*\)/g, '').trim();
                    if (element.style.filter === '') {
                        element.style.removeProperty('filter');
                    }
                }
            });
            
            // Remove opacity restrictions
            const allElements = document.querySelectorAll('*');
            allElements.forEach(element => {
                const computedStyle = window.getComputedStyle(element);
                if (computedStyle.opacity !== '1' && element.style.opacity) {
                    element.style.opacity = '1';
                }
                if (computedStyle.pointerEvents === 'none' && element.style.pointerEvents) {
                    element.style.pointerEvents = 'auto';
                }
            });
            
            // Enable disabled elements
            const disabledElements = document.querySelectorAll('button[disabled], input[disabled], select[disabled], a[disabled]');
            disabledElements.forEach(element => {
                element.disabled = false;
                element.style.opacity = '1';
                element.style.pointerEvents = 'auto';
                element.style.cursor = 'pointer';
            });
            
            // Hide trial messages
            const trialElements = document.querySelectorAll('[class*="trial"], [class*="upgrade"], .trial-message, .upgrade-message');
            trialElements.forEach(element => {
                if (element.textContent.toLowerCase().includes('trial') || 
                    element.textContent.toLowerCase().includes('upgrade') ||
                    element.textContent.toLowerCase().includes('free year')) {
                    element.style.display = 'none';
                }
            });
            
            // DO NOT HIDE DIV WITH ID "survey-filled" - IT MUST STAY VISIBLE
            console.log('🎯 DIV with ID "survey-filled" will remain visible (not hidden)');
            
            console.log('✅ UI elements updated - content unlocked');
            
        } catch (error) {
            console.error('❌ Error updating UI elements:', error);
        }
    }
    
    /**
     * Main initialization function
     */
    async function initializeSurveyCompletion() {
        console.log('🎯 Initializing survey completion handler...');
        
        // Check if we're coming from survey
        if (!checkSurveyCompletion()) {
            console.log('📝 No survey completion detected, exiting...');
            return;
        }
        
        console.log('🎉 Survey completion detected!');
        
        // Clean up URL (remove ?survey=filled)
        const url = new URL(window.location);
        url.searchParams.delete('survey');
        history.replaceState({}, '', url);
        
        // Show confetti immediately
        showConfetti();
        
        // Update UI immediately (no reload needed)
        await updateUIElements();
        
        console.log('✅ Survey completion handling completed!');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSurveyCompletion);
    } else {
        // Small delay to ensure everything is ready
        setTimeout(initializeSurveyCompletion, 100);
    }
    
})();
