/**
 * Survey Completion Handler - Minimal Script
 * 
 * PURPOSE: Handle survey completion with confetti and UI updates
 * USAGE: <script src="https://little-microphones.vercel.app/survey-completion.js"></script>
 * 
 * FEATURES:
 * - Detect ?survey=filled parameter
 * - Show confetti celebration
 * - Aggressive fresh Memberstack data fetching with retries
 * - Update UI elements (unlock content, remove grayscale)
 * - No toast notifications
 * 
 * VERSION: 1.0.2
 * LAST UPDATED: January 2025
 */

(function() {
    'use strict';
    
    console.log('[Survey Completion] Script v1.0.2 loaded');
    
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
     * Aggressive fresh Memberstack data fetch with retries
     */
    async function getFreshMemberDataWithRetries(maxRetries = 5) {
        let retries = 0;
        
        while (retries < maxRetries) {
            try {
                console.log(`📡 Attempt ${retries + 1}/${maxRetries}: Fetching fresh member data...`);
                
                // Wait for Memberstack to be available
                await waitForMemberstack();
                
                const memberstack = window.$memberstackDom || window.memberstack;
                if (!memberstack) {
                    throw new Error('Memberstack not available');
                }
                
                // Clear all possible cache on first attempt
                if (retries === 0) {
                    await clearAllMemberstackCache();
                }
                
                // Wait longer on each retry for backend sync
                const waitTime = 1000 + (retries * 1000); // 1s, 2s, 3s, 4s, 5s
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                // Try to get fresh member data
                const member = await memberstack.getCurrentMember();
                
                if (member && member.data) {
                    console.log(`✅ Fresh member data loaded on attempt ${retries + 1}:`, member.data);
                    
                    // Check if educator plan is present
                    const hasEducatorPlan = member.data.planConnections && 
                        member.data.planConnections.some(plan => 
                            plan.planId === 'pln_educators-free-promo-ebfw0xzj'
                        );
                    
                    if (hasEducatorPlan) {
                        console.log('✅ Educator plan detected in fresh data!');
                        return member.data;
                    } else {
                        console.log(`⚠️ No educator plan found in attempt ${retries + 1}, retrying...`);
                    }
                } else {
                    throw new Error('No member data received');
                }
                
            } catch (error) {
                console.warn(`⚠️ Attempt ${retries + 1} failed:`, error);
            }
            
            retries++;
        }
        
        // If all retries failed, assume plan was added and update UI anyway
        console.log('⚠️ All retries failed, but assuming plan was added due to survey=filled URL');
        return { assumeEducatorPlan: true };
    }
    
    /**
     * Clear all possible Memberstack cache
     */
    async function clearAllMemberstackCache() {
        try {
            // Clear localStorage
            const localKeysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('memberstack') || key.includes('member') || key.includes('ms-'))) {
                    localKeysToRemove.push(key);
                }
            }
            localKeysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Clear sessionStorage
            const sessionKeysToRemove = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && (key.includes('memberstack') || key.includes('member') || key.includes('ms-'))) {
                    sessionKeysToRemove.push(key);
                }
            }
            sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
            
            console.log('🧹 Cleared all Memberstack cache');
        } catch (e) {
            console.warn('⚠️ Could not clear some cached data:', e);
        }
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
     */
    function updateUIElements() {
        try {
            console.log('🎨 Updating UI elements for educator access...');
            
            // Remove grayscale filters and unlock content
            const allElements = document.querySelectorAll('*');
            allElements.forEach(element => {
                const style = window.getComputedStyle(element);
                
                // Remove grayscale filter
                if (style.filter && style.filter.includes('grayscale')) {
                    element.style.filter = 'none';
                }
                
                // Remove opacity restrictions
                if (style.opacity && parseFloat(style.opacity) < 1) {
                    element.style.opacity = '1';
                }
                
                // Enable pointer events
                if (style.pointerEvents === 'none') {
                    element.style.pointerEvents = 'auto';
                }
            });
            
            // Enable all disabled buttons and inputs
            const disabledElements = document.querySelectorAll('button[disabled], input[disabled], select[disabled]');
            disabledElements.forEach(element => {
                element.disabled = false;
                element.style.opacity = '1';
                element.style.filter = 'none';
                element.style.pointerEvents = 'auto';
            });
            
            // Hide trial/upgrade messages
            const trialElements = document.querySelectorAll('[class*="trial"], [class*="upgrade"], [class*="locked"]');
            trialElements.forEach(element => {
                element.style.display = 'none';
            });
            
            // Find and hide green success blocks
            const successElements = document.querySelectorAll('div[style*="background-color: green"], div[style*="background: green"], .success-block');
            successElements.forEach(element => {
                element.style.display = 'none';
            });
            
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
        
        // Try to get fresh member data with retries
        const memberData = await getFreshMemberDataWithRetries();
        
        // Always update UI - either we have confirmed data or we assume plan was added
        updateUIElements();
        
        console.log('✅ Survey completion handling completed!');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSurveyCompletion);
    } else {
        initializeSurveyCompletion();
    }
    
})();
