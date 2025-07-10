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
    
    console.log('[LM Redirect] Script loaded');
    
    // Configuration
    const API_BASE_URL = 'https://little-microphones.vercel.app/api';
    
    /**
     * Main function to handle parent ShareID visits
     */
    async function handleParentShareIDVisit() {
        try {
            // Extract ShareID from URL
            const shareId = getShareIdFromUrl();
            if (!shareId) {
                return;
            }
            
            console.log('[LM Redirect] Processing ShareID:', shareId);
            
            // Wait for Memberstack to load
            await waitForMemberstack();
            
            // Check if user is logged in
            const isLoggedIn = await checkMemberstackLogin();
            
            if (isLoggedIn) {
                // Check if user is a parent
                const isParent = await checkIfUserIsParent();
                
                if (isParent) {
                    console.log('[LM Redirect] Parent user detected, processing LMID assignment');
                    await handleLoggedInParent(shareId);
                } else {
                    // For teachers/other users, just show the program without LMID assignment
                }
            } else {
                console.log('[LM Redirect] User not logged in, saving ShareID for later');
                saveShareIdForRedirect(shareId);
                showInfoMessage('Aby uzyskać dostęp do programu, zarejestruj się lub zaloguj.');
            }
            
        } catch (error) {
            console.error('[LM Redirect] Error in handleParentShareIDVisit:', error);
            showErrorMessage('Wystąpił błąd podczas przetwarzania linku.');
        }
    }
    
    /**
     * Handle redirect after email verification
     */
    async function handlePostVerificationRedirect() {
        try {
            // Check if we're coming from email verification
            const isFromEmailVerification = checkIfFromEmailVerification();
            
            const savedData = getSavedRedirectData();
            if (!savedData) {
                return;
            }
            
            if (isFromEmailVerification) {
                console.log('[LM Redirect] Post-verification redirect detected, ShareID:', savedData.shareId);
            }
            
            // Wait for Memberstack to load
            await waitForMemberstack();
            
            // Check if user is now logged in
            const isLoggedIn = await checkMemberstackLogin();
            
            if (isLoggedIn) {
                // Check if user is a parent
                const isParent = await checkIfUserIsParent();
                
                if (isParent) {
                    
                    // If coming from email verification, show welcome message
                    if (isFromEmailVerification) {
                        console.log('[LM Redirect] Email verification detected, processing LMID assignment');
                        showSuccessMessage('Email zweryfikowany pomyślnie! Dodajemy dostęp do programu...');
                        
                        // Clear saved data and stay on current ShareID page
                        clearSavedRedirectData();
                        
                        // Wait a moment then process LMID assignment on current page
                        setTimeout(() => {
                            // Re-run the ShareID handler to process LMID assignment
                            handleParentShareIDVisit();
                        }, 2000);
                    } else {
                        // Normal redirect without delay
                        clearSavedRedirectData();
                        const redirectUrl = `/little-microphones?ID=${savedData.shareId}`;
                        console.log('[LM Redirect] Redirecting to ShareID page:', redirectUrl);
                        window.location.href = redirectUrl;
                    }
                } else {
                    clearSavedRedirectData();
                }
            }
            
        } catch (error) {
            console.error('[LM Redirect] Error in handlePostVerificationRedirect:', error);
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
            const currentLmids = currentUser.metaData?.lmids || '';
            
            if (currentLmids.includes(worldInfo.original_lmid.toString())) {
                console.log('[LM Redirect] Parent already has this LMID');
                showSuccessMessage('Masz już dostęp do tego programu!');
                
                // Stay on the ShareID page - user can see the program
                return;
            }
            
            // Add LMID to parent's metadata using API call
            const newLmids = currentLmids ? `${currentLmids},${worldInfo.original_lmid}` : worldInfo.original_lmid.toString();
            
            const updateResult = await updateParentMetadata(currentUser.id, newLmids);
            
            if (updateResult.success) {
                console.log('[LM Redirect] LMID added successfully');
                showSuccessMessage(`Dostęp do programu został dodany! Możesz teraz korzystać z programu.`);
                
                // Stay on the ShareID page - don't redirect to dashboard
                // The user can now see the program content
            } else {
                console.error('[LM Redirect] Failed to update parent metadata');
                showErrorMessage('Nie udało się dodać dostępu do programu. Spróbuj ponownie.');
                return;
            }
            
        } catch (error) {
            console.error('[LM Redirect] Error handling logged in parent:', error);
            showErrorMessage('Wystąpił błąd podczas dodawania dostępu do programu.');
        }
    }
    
    /**
     * Wait for Memberstack to load
     */
    function waitForMemberstack(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (typeof window.$memberstackDom !== 'undefined') {
                resolve();
                return;
            }
            
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                
                if (typeof window.$memberstackDom !== 'undefined') {
                    clearInterval(checkInterval);
                    resolve();
                } else if (elapsed > timeout) {
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
            console.error('[LM Redirect] Error fetching world info:', error);
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
            console.error('[LM Redirect] Error updating parent metadata:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Check if user is logged in to Memberstack
     */
    async function checkMemberstackLogin() {
        try {
            const member = await window.$memberstackDom.getCurrentMember();
            return member && member.data && (member.data.id || member.data.loggedIn);
            
        } catch (error) {
            console.error('[LM Redirect] Error checking login status:', error);
            return false;
        }
    }
    
    /**
     * Check if user is a parent (has parent plan)
     */
    async function checkIfUserIsParent() {
        try {
            const member = await window.$memberstackDom.getCurrentMember();
            if (!member || !member.data) return false;
            
            // Check if user has parent plan
            const PARENT_PLAN_ID = 'pln_parents-y1ea03qk';
            const hasParentPlan = member.data.planConnections?.some(
                connection => connection.planId === PARENT_PLAN_ID && connection.active
            );
            
            return hasParentPlan;
            
        } catch (error) {
            console.error('[LM Redirect] Error checking parent status:', error);
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
            console.error('[LM Redirect] Error getting current user:', error);
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
     * Check if we're coming from email verification
     */
    function checkIfFromEmailVerification() {
        const urlParams = new URLSearchParams(window.location.search);
        const memberParam = urlParams.get('member');
        const forceRefetch = urlParams.get('forceRefetch');
        
        // Check for verification parameters
        if (memberParam && forceRefetch === 'true') {
            try {
                const memberData = JSON.parse(decodeURIComponent(memberParam));
                return memberData.verified === true;
            } catch (e) {
                // Failed to parse member param
            }
        }
        
        return false;
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
        console.log('[LM Redirect] Saved redirect data for ShareID:', shareId);
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
                clearSavedRedirectData();
                return null;
            }
            
            return data;
            
        } catch (error) {
            clearSavedRedirectData();
            return null;
        }
    }
    
    /**
     * Clear saved redirect data
     */
    function clearSavedRedirectData() {
        localStorage.removeItem('lm_parent_redirect');
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