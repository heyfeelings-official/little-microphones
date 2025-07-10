/**
 * Little Microphones Parent Redirect Script
 * 
 * PURPOSE: Handle parent ShareID visits and registration redirects
 * USAGE: <script src="https://little-microphones.vercel.app/little-microphones-redirect.js"></script>
 * 
 * FEATURES:
 * - Extract ShareID from URL parameter ?ID=xyz
 * - Check if user is logged in to Memberstack
 * - If logged in: Add LMID to parent metadata immediately
 * - If not logged in: Save ShareID for post-verification redirect
 * - Show success/error messages to user
 * 
 * DEPENDENCIES: Memberstack, fetch API
 * VERSION: 1.0.0
 * LAST UPDATED: 6 stycznia 2025
 */

(function() {
    'use strict';
    
    console.log('[Little Microphones Redirect] Script v1.0.0 loaded');
    
    // Configuration
    const API_BASE_URL = 'https://little-microphones.vercel.app/api';
    
    /**
     * Main function to handle parent ShareID visits
     */
    async function handleParentShareIDVisit() {
        try {
            console.log('[Parent Redirect] Starting ShareID visit handler');
            
            // Extract ShareID from URL
            const shareId = getShareIdFromUrl();
            if (!shareId) {
                console.log('[Parent Redirect] No ShareID found in URL');
                return;
            }
            
            console.log('[Parent Redirect] ShareID found:', shareId);
            
            // Wait for Memberstack to load
            await waitForMemberstack();
            
            // Check if user is logged in
            const isLoggedIn = await checkMemberstackLogin();
            
            if (isLoggedIn) {
                console.log('[Parent Redirect] User is logged in, processing LMID assignment');
                await handleLoggedInParent(shareId);
            } else {
                console.log('[Parent Redirect] User not logged in, saving ShareID for later');
                saveShareIdForRedirect(shareId);
                showInfoMessage('Aby uzyskać dostęp do programu, zarejestruj się lub zaloguj.');
            }
            
        } catch (error) {
            console.error('[Parent Redirect] Error in handleParentShareIDVisit:', error);
            showErrorMessage('Wystąpił błąd podczas przetwarzania linku.');
        }
    }
    
    /**
     * Handle redirect after email verification
     */
    async function handlePostVerificationRedirect() {
        try {
            console.log('[Parent Redirect] Checking for post-verification redirect');
            
            const savedData = getSavedRedirectData();
            if (!savedData) {
                console.log('[Parent Redirect] No saved redirect data found');
                return;
            }
            
            console.log('[Parent Redirect] Found saved data:', savedData);
            
            // Wait for Memberstack to load
            await waitForMemberstack();
            
            // Check if user is now logged in
            const isLoggedIn = await checkMemberstackLogin();
            
            if (isLoggedIn) {
                console.log('[Parent Redirect] User is now logged in, redirecting to ShareID');
                
                // Clear saved data
                clearSavedRedirectData();
                
                // Redirect to original ShareID page
                const redirectUrl = `/little-microphones?ID=${savedData.shareId}`;
                console.log('[Parent Redirect] Redirecting to:', redirectUrl);
                window.location.href = redirectUrl;
            } else {
                console.log('[Parent Redirect] User still not logged in, keeping saved data');
            }
            
        } catch (error) {
            console.error('[Parent Redirect] Error in handlePostVerificationRedirect:', error);
        }
    }
    
    /**
     * Handle logged in parent visiting ShareID link
     */
    async function handleLoggedInParent(shareId) {
        try {
            // Get world info and original LMID
            const worldInfo = await getWorldInfoForShareId(shareId);
            if (!worldInfo || !worldInfo.original_lmid) {
                throw new Error('Nie można znaleźć informacji o programie dla tego ShareID');
            }
            
            console.log('[Parent Redirect] World info retrieved:', worldInfo);
            
            // Check if parent already has this LMID
            const currentUser = await getCurrentMemberstackUser();
            const currentLmids = currentUser.customFields?.lmids || '';
            
            if (currentLmids.includes(worldInfo.original_lmid.toString())) {
                console.log('[Parent Redirect] Parent already has this LMID');
                showSuccessMessage('Masz już dostęp do tego programu!');
                
                // Redirect to dashboard after delay
                setTimeout(() => {
                    window.location.href = '/members/little-microphones';
                }, 2000);
                return;
            }
            
            // Add LMID to parent's metadata using API call
            const newLmids = currentLmids ? `${currentLmids},${worldInfo.original_lmid}` : worldInfo.original_lmid.toString();
            
            const updateResult = await updateParentMetadata(currentUser.id, newLmids);
            
            if (updateResult.success) {
                console.log('[Parent Redirect] LMID added to parent metadata');
                showSuccessMessage(`Dodano dostęp do programu! Możesz teraz go zobaczyć w swoim panelu.`);
                
                // Redirect to dashboard after delay
                setTimeout(() => {
                    window.location.href = '/members/little-microphones';
                }, 3000);
            } else {
                console.error('[Parent Redirect] Failed to update parent metadata');
                showErrorMessage('Nie udało się dodać dostępu do programu. Spróbuj ponownie.');
                return;
            }
            
        } catch (error) {
            console.error('[Parent Redirect] Error handling logged in parent:', error);
            showErrorMessage('Wystąpił błąd podczas dodawania dostępu do programu.');
        }
    }
    
    /**
     * Wait for Memberstack to load
     */
    function waitForMemberstack(timeout = 10000) {
        return new Promise((resolve, reject) => {
            console.log('[DEBUG] Checking for Memberstack...');
            console.log('[DEBUG] window.$memberstackDom exists:', typeof window.$memberstackDom !== 'undefined');
            console.log('[DEBUG] window.MemberStack exists:', typeof window.MemberStack !== 'undefined');
            
            if (typeof window.$memberstackDom !== 'undefined') {
                console.log('[DEBUG] $memberstackDom found immediately');
                resolve();
                return;
            }
            
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                console.log('[DEBUG] Waiting for Memberstack... elapsed:', elapsed + 'ms');
                
                if (typeof window.$memberstackDom !== 'undefined') {
                    console.log('[DEBUG] $memberstackDom found after', elapsed + 'ms');
                    clearInterval(checkInterval);
                    resolve();
                } else if (elapsed > timeout) {
                    console.log('[DEBUG] Memberstack timeout after', elapsed + 'ms');
                    console.log('[DEBUG] Final check - window.$memberstackDom:', typeof window.$memberstackDom);
                    clearInterval(checkInterval);
                    reject(new Error('Memberstack loading timeout'));
                }
            }, 100);
        });
    }
    
    /**
     * Get world info for ShareID from API
     */
    async function getWorldInfoForShareId(shareId) {
        try {
            const response = await fetch(`${API_BASE_URL}/get-world-info?shareId=${shareId}`);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('[Parent Redirect] Error fetching world info:', error);
            throw error;
        }
    }
    
    /**
     * Update parent metadata using lmid-operations API
     */
    async function updateParentMetadata(memberId, newLmidString) {
        try {
            const response = await fetch(`${API_BASE_URL}/lmid-operations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'update_parent_metadata',
                    memberId: memberId,
                    newLmidString: newLmidString
                })
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('[Parent Redirect] Error updating parent metadata:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Check if user is logged in to Memberstack
     */
    async function checkMemberstackLogin() {
        try {
            const member = await window.$memberstackDom.getCurrentMember();
            console.log('[DEBUG] getCurrentMember() result:', member);
            console.log('[DEBUG] Member data:', member?.data);
            console.log('[DEBUG] Member ID:', member?.data?.id);
            console.log('[DEBUG] Member logged in:', member?.data?.loggedIn);
            
            return member && member.data && (member.data.id || member.data.loggedIn);
            
        } catch (error) {
            console.error('[Parent Redirect] Error checking login status:', error);
            return false;
        }
    }
    
    /**
     * Get current Memberstack user
     */
    async function getCurrentMemberstackUser() {
        try {
            const member = await window.$memberstackDom.getCurrentMember();
            return member?.data || member;
        } catch (error) {
            console.error('[Parent Redirect] Error getting current user:', error);
            throw error;
        }
    }
    
    /**
     * Extract ShareID from current URL
     */
    function getShareIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('ID');
    }
    
    /**
     * Save ShareID and page info for post-verification redirect
     */
    function saveShareIdForRedirect(shareId) {
        const redirectData = {
            shareId: shareId,
            originalPage: '/little-microphones',
            timestamp: Date.now()
        };
        
        localStorage.setItem('lm_parent_redirect', JSON.stringify(redirectData));
        console.log('[Parent Redirect] Saved redirect data:', redirectData);
    }
    
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
                console.log('[Parent Redirect] Saved data is too old, clearing');
                clearSavedRedirectData();
                return null;
            }
            
            return data;
            
        } catch (error) {
            console.error('[Parent Redirect] Error parsing saved redirect data:', error);
            clearSavedRedirectData();
            return null;
        }
    }
    
    /**
     * Clear saved redirect data
     */
    function clearSavedRedirectData() {
        localStorage.removeItem('lm_parent_redirect');
        console.log('[Parent Redirect] Cleared saved redirect data');
    }
    
    /**
     * Show success message to user
     */
    function showSuccessMessage(message) {
        showMessage(message, '#10b981', '✅');
    }
    
    /**
     * Show error message to user
     */
    function showErrorMessage(message) {
        showMessage(message, '#ef4444', '❌');
    }
    
    /**
     * Show info message to user
     */
    function showInfoMessage(message) {
        showMessage(message, '#3b82f6', 'ℹ️');
    }
    
    /**
     * Show message to user
     */
    function showMessage(message, backgroundColor, icon) {
        // Remove existing message
        const existingMessage = document.getElementById('lm-parent-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.id = 'lm-parent-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${backgroundColor};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            max-width: 400px;
            line-height: 1.4;
        `;
        messageEl.innerHTML = `${icon} ${message}`;
        
        document.body.appendChild(messageEl);
        
        // Auto-hide after delay
        const hideDelay = backgroundColor === '#ef4444' ? 7000 : 5000;
        setTimeout(() => {
            if (messageEl && messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, hideDelay);
    }
    
    /**
     * Initialize parent redirect system
     */
    function initParentRedirectSystem() {
        console.log('[Parent Redirect] Initializing parent redirect system');
        
        // Debug what's available in window
        console.log('[DEBUG] All window properties with "member":', Object.keys(window).filter(key => key.toLowerCase().includes('member')));
        console.log('[DEBUG] All window properties with "Member":', Object.keys(window).filter(key => key.includes('Member')));
        console.log('[DEBUG] All window properties with "stack":', Object.keys(window).filter(key => key.toLowerCase().includes('stack')));
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    handlePostVerificationRedirect();
                    handleParentShareIDVisit();
                }, 500); // Small delay to ensure Memberstack loads
            });
        } else {
            setTimeout(() => {
                handlePostVerificationRedirect();
                handleParentShareIDVisit();
            }, 500);
        }
    }
    
    // Initialize when script loads
    initParentRedirectSystem();
    
})(); 