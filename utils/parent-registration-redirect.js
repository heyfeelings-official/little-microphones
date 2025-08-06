/**
 * Parent Registration Redirect System
 * Handles ShareID preservation during parent registration and redirects
 * 
 * Flow:
 * 1. Parent visits /little-microphones?ID=xyz
 * 2. If logged in → assign LMID immediately
 * 3. If not logged in → save ShareID, redirect after verification
 */

import { config } from '../config.js';

/**
 * Main function to handle parent ShareID visits
 * Call this on /little-microphones page load
 */
export async function handleParentShareIDVisit() {
    try {
        console.log('[Parent Redirect] Starting ShareID visit handler');
        
        // Extract ShareID from URL
        const shareId = getShareIdFromUrl();
        if (!shareId) {
            console.log('[Parent Redirect] No ShareID found in URL');
            return;
        }
        
        console.log('[Parent Redirect] ShareID found:', shareId);
        
        // Check if user is logged in
        const isLoggedIn = await checkMemberstackLogin();
        
        if (isLoggedIn) {
            console.log('[Parent Redirect] User is logged in, processing LMID assignment');
            await handleLoggedInParent(shareId);
        } else {
            console.log('[Parent Redirect] User not logged in, saving ShareID for later');
            saveShareIdForRedirect(shareId);
        }
        
    } catch (error) {
        console.error('[Parent Redirect] Error in handleParentShareIDVisit:', error);
        showErrorMessage('Wystąpił błąd podczas przetwarzania linku.');
    }
}

/**
 * Handle redirect after email verification
 * Call this on page load to check for pending redirects
 */
export async function handlePostVerificationRedirect() {
    try {
        console.log('[Parent Redirect] Checking for post-verification redirect');
        
        const savedData = getSavedRedirectData();
        if (!savedData) {
            console.log('[Parent Redirect] No saved redirect data found');
            return;
        }
        
        console.log('[Parent Redirect] Found saved data:', savedData);
        
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
            return;
        }
        
        // Add LMID to parent's metadata using API call
        const newLmids = currentLmids ? `${currentLmids},${worldInfo.original_lmid}` : worldInfo.original_lmid.toString();
        
        const updateResult = await updateParentMetadata(currentUser.id, newLmids, currentUser.auth?.email || currentUser.email);
        
        if (updateResult.success) {
            console.log('[Parent Redirect] LMID added to parent metadata');
            showSuccessMessage(`Dodano dostęp do programu "${worldInfo.world_name}"! Możesz teraz go zobaczyć w swoim panelu.`);
        } else {
            console.error('[Parent Redirect] Failed to update parent metadata:', updateResult.error);
            

            
            showErrorMessage('Nie udało się dodać dostępu do programu. Spróbuj ponownie.');
            return;
        }
        
        // Optional: redirect to dashboard after short delay
        setTimeout(() => {
            // Detect current language and redirect to localized dashboard
            const currentLang = window.LM_CONFIG?.getCurrentLanguage() || 'en';
            const dashboardPath = currentLang === 'en' 
                ? '/members/little-microphones' 
                : `/${currentLang}/members/little-microphones`;
            
            console.log(`[Parent Redirect] Redirecting to localized dashboard: ${dashboardPath}`);
            window.location.href = dashboardPath;
        }, 3000);
        
    } catch (error) {
        console.error('[Parent Redirect] Error handling logged in parent:', error);
        

        
        showErrorMessage('Wystąpił błąd podczas dodawania dostępu do programu.');
    }
}

/**
 * Get world info for ShareID from API
 */
async function getWorldInfoForShareId(shareId) {
    try {
        const response = await fetch(`${config.API_BASE_URL}/get-world-info?shareId=${shareId}`);
        
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
async function updateParentMetadata(memberId, newLmidString, parentEmail = null) {
    try {
        const response = await fetch(`${config.API_BASE_URL}/lmid-operations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'update_parent_metadata',
                memberId: memberId,
                newLmidString: newLmidString,
                parentEmail: parentEmail
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if API returned success: false
        if (!data.success) {
            throw new Error(data.error || 'Failed to update parent metadata');
        }
        
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
        if (typeof window.MemberStack === 'undefined') {
            console.log('[Parent Redirect] MemberStack not loaded yet');
            return false;
        }
        
        const member = await window.MemberStack.onReady.then(() => {
            return window.MemberStack.getCurrentMember();
        });
        
        return member && member.id;
        
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
        return await window.MemberStack.getCurrentMember();
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
    // Create or update message element
    let messageEl = document.getElementById('lm-parent-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'lm-parent-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            max-width: 400px;
        `;
        document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.style.background = '#10b981';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (messageEl && messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, 5000);
}

/**
 * Show error message to user
 */
function showErrorMessage(message) {
    // Create or update message element
    let messageEl = document.getElementById('lm-parent-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'lm-parent-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            max-width: 400px;
        `;
        document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.style.background = '#ef4444';
    
    // Auto-hide after 7 seconds (longer for errors)
    setTimeout(() => {
        if (messageEl && messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, 7000);
}

/**
 * Initialize parent redirect system
 * Call this when the page loads
 */
export function initParentRedirectSystem() {
    console.log('[Parent Redirect] Initializing parent redirect system');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            handlePostVerificationRedirect();
            handleParentShareIDVisit();
        });
    } else {
        handlePostVerificationRedirect();
        handleParentShareIDVisit();
    }
} 