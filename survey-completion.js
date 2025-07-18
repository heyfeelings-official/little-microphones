/**
 * Survey Completion Handler - Minimal Script
 * 
 * PURPOSE: Handle survey completion with confetti and UI updates
 * USAGE: <script src="https://little-microphones.vercel.app/survey-completion.js"></script>
 * 
 * FEATURES:
 * - Detect ?survey=filled parameter
 * - Show confetti celebration
 * - Force fresh Memberstack data fetch WITHOUT clearing session
 * - Update UI elements (unlock content, remove grayscale)
 * - No toast notifications
 * 
 * VERSION: 1.0.3
 * LAST UPDATED: January 2025
 */

(function() {
    'use strict';
    
    console.log('[Survey Completion] Script v1.0.3 loaded');
    
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
     * Wait for fresh member data with patience
     */
    async function waitForFreshMemberData() {
        try {
            console.log('📡 Waiting for fresh member data...');
            
            // Wait for Memberstack to be available
            await waitForMemberstack();
            
            const memberstack = window.$memberstackDom || window.memberstack;
            if (!memberstack) {
                throw new Error('Memberstack not available');
            }
            
            // IMPORTANT: Don't clear cache - it logs out the user!
            // Instead, wait for backend sync
            console.log('⏳ Waiting 3 seconds for backend sync...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Now get member data
            const member = await memberstack.getCurrentMember();
            
            if (member && member.data) {
                console.log('✅ Member data received:', member.data);
                
                // Check if educator plan is present
                const hasEducatorPlan = member.data.planConnections && 
                    member.data.planConnections.some(plan => 
                        plan.planId === 'pln_educators-free-promo-ebfw0xzj'
                    );
                
                if (hasEducatorPlan) {
                    console.log('✅ Educator plan confirmed!');
                } else {
                    console.log('⚠️ Educator plan not found in data, but proceeding anyway');
                }
                
                return member.data;
            } else {
                throw new Error('No member data received');
            }
            
        } catch (error) {
            console.error('❌ Error getting member data:', error);
            // Return dummy data to still update UI
            return { assumeEducatorPlan: true };
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
            
            // Remove opacity restrictions on specific elements
            const opaqueElements = document.querySelectorAll('.locked, .disabled, .blocked, [class*="trial"], [class*="upgrade"]');
            opaqueElements.forEach(element => {
                element.style.opacity = '1';
                element.style.pointerEvents = 'auto';
            });
            
            // Enable all disabled buttons and inputs
            const disabledElements = document.querySelectorAll('button[disabled], input[disabled], select[disabled], a[disabled]');
            disabledElements.forEach(element => {
                element.disabled = false;
                element.style.opacity = '1';
                element.style.pointerEvents = 'auto';
                element.style.cursor = 'pointer';
            });
            
            // Hide trial/upgrade messages
            const trialMessages = document.querySelectorAll('[class*="trial"], [class*="upgrade"], [class*="locked"], .trial-message, .upgrade-message');
            trialMessages.forEach(element => {
                // Only hide if it's actually a message/banner
                if (element.textContent.toLowerCase().includes('trial') || 
                    element.textContent.toLowerCase().includes('upgrade') ||
                    element.textContent.toLowerCase().includes('unlock')) {
                    element.style.display = 'none';
                }
            });
            
            // Find and hide green success blocks by content
            const allDivs = document.querySelectorAll('div');
            allDivs.forEach(div => {
                const bgColor = window.getComputedStyle(div).backgroundColor;
                const isGreen = bgColor.includes('rgb(0, 128, 0)') || 
                               bgColor.includes('rgb(0, 255, 0)') || 
                               bgColor.includes('green');
                
                if (isGreen && div.textContent.includes('FREE Access Unlocked')) {
                    div.style.display = 'none';
                }
            });
            
            // Make world containers interactive
            const worldContainers = document.querySelectorAll('[class*="world"], [class*="emotion"]');
            worldContainers.forEach(container => {
                container.style.pointerEvents = 'auto';
                container.style.cursor = 'pointer';
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
        
        // Wait for member data (with 3s delay for backend sync)
        await waitForFreshMemberData();
        
        // Always update UI
        updateUIElements();
        
        console.log('✅ Survey completion handling completed!');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSurveyCompletion);
    } else {
        // Small delay to ensure Memberstack is ready
        setTimeout(initializeSurveyCompletion, 100);
    }
    
})();
