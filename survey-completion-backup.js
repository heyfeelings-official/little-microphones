/**
 * Survey Completion Handler - Minimal Script
 * 
 * PURPOSE: Handle survey completion with confetti and fresh data loading
 * USAGE: <script src="https://little-microphones.vercel.app/survey-completion.js"></script>
 * 
 * FEATURES:
 * - Detect ?survey=filled parameter
 * - Show confetti celebration
 * - Force fresh Memberstack data fetch
 * - Update UI elements (unlock content, hide blocks)
 * - No dependencies on other scripts
 * 
 * VERSION: 1.0.0
 * LAST UPDATED: January 2025
 */

(function() {
    'use strict';
    
    console.log('[Survey Completion] Script v1.0.0 loaded');
    
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
     * Force fresh Memberstack data fetch
     */
    async function getFreshMemberData() {
        try {
            console.log('📡 Fetching fresh member data...');
            
            // Wait for Memberstack to be available
            await waitForMemberstack();
            
            const memberstack = window.$memberstackDom || window.memberstack;
            if (!memberstack) {
                throw new Error('Memberstack not available');
            }
            
            // Clear any cached data
            try {
                // Clear localStorage keys that might contain member data
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.includes('memberstack') || key.includes('member'))) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
                
                // Clear sessionStorage keys
                const sessionKeysToRemove = [];
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key && (key.includes('memberstack') || key.includes('member'))) {
                        sessionKeysToRemove.push(key);
                    }
                }
                sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
                
                console.log('🧹 Cleared cached member data');
            } catch (e) {
                console.warn('⚠️ Could not clear some cached data:', e);
            }
            
            // Wait a bit for backend sync
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Get fresh member data
            const member = await memberstack.getCurrentMember();
            if (member && member.data) {
                console.log('✅ Fresh member data loaded:', member.data);
                return member.data;
            } else {
                throw new Error('No member data received');
            }
            
        } catch (error) {
            console.error('❌ Error fetching fresh member data:', error);
            return null;
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
     * Update UI elements based on fresh member data
     */
    function updateUIElements(memberData) {
        try {
            console.log('🎨 Updating UI elements...');
            
            // Check if user has educator plan
            const hasEducatorPlan = memberData.planConnections && 
                memberData.planConnections.some(plan => 
                    plan.planId === 'pln_educators-free-promo-ebfw0xzj'
                );
            
            if (hasEducatorPlan) {
                console.log('✅ Educator plan detected, unlocking content...');
                
                // Remove any elements with class that might indicate locked content
                const lockedElements = document.querySelectorAll('[class*="locked"], [class*="disabled"], [class*="blocked"]');
                lockedElements.forEach(element => {
                    element.style.filter = 'none';
                    element.style.opacity = '1';
                    element.style.pointerEvents = 'auto';
                });
                
                // Find and remove green div (common patterns)
                const greenDivs = document.querySelectorAll('div[style*="background-color: green"], div[style*="background: green"], .green-block, .success-block');
                greenDivs.forEach(div => {
                    div.style.display = 'none';
                });
                
                // Enable any disabled buttons
                const disabledButtons = document.querySelectorAll('button[disabled], input[disabled]');
                disabledButtons.forEach(button => {
                    button.disabled = false;
                    button.style.opacity = '1';
                    button.style.filter = 'none';
                });
                
                // Add color to grayscale elements
                const grayscaleElements = document.querySelectorAll('[style*="grayscale"], [style*="filter: none"]');
                grayscaleElements.forEach(element => {
                    element.style.filter = 'none';
                });
                
                console.log('✅ UI elements updated successfully');
            } else {
                console.log('⚠️ No educator plan found, UI remains locked');
            }
            
        } catch (error) {
            console.error('❌ Error updating UI elements:', error);
        }
    }
    
    /**
     * Show success message
     */
    function showSuccessMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;
        message.innerHTML = '✅ Survey completed! Welcome to your educator dashboard.';
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(message);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 5000);
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
        
        // Show success message
        showSuccessMessage();
        
        // Get fresh member data and update UI
        const memberData = await getFreshMemberData();
        if (memberData) {
            updateUIElements(memberData);
        }
        
        console.log('✅ Survey completion handling completed!');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSurveyCompletion);
    } else {
        initializeSurveyCompletion();
    }
    
})(); 