/**
 * pdf-qr-webflow.js - Webflow PDF QR Code Dynamic Links
 * 
 * PURPOSE: Dynamically sets PDF download links with QR codes for Webflow CMS items
 * USAGE: Include as external script in Webflow custom code
 * 
 * HOW TO USE IN WEBFLOW:
 * 1. Add Custom Attributes to PDF download buttons:
 *    - data-item-slug = CMS field: Slug
 *    - data-world = CMS field: World (e.g., "Shopping Spree")
 * 2. Add CSS class 'pdf-qr-link' to the buttons
 * 3. Include this script in Webflow custom code:
 *    <script src="https://little-microphones.vercel.app/pdf-qr-webflow.js"></script>
 * 
 * VERSION: 1.0.0
 * LAST UPDATED: January 2025
 */

(function() {
    'use strict';

    // Configuration
    const API_BASE_URL = window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app';
    const VERSION = '1.0.0';

    console.log(`📋 PDF QR Webflow Script v${VERSION} loaded`);

    /**
     * Get member ID from Memberstack session
     * @returns {Promise<Object|null>} Member data or null
     */
    async function getMemberIdFromMemberstack() {
        try {
            const memberstack = window.$memberstackDom;
            if (!memberstack) {
                console.log('⚠️ Memberstack not available');
                return null;
            }
            
            const { data: memberData } = await memberstack.getCurrentMember();
            return memberData || null;
        } catch (error) {
            console.error('Error getting member from Memberstack:', error);
            return null;
        }
    }

    /**
     * Initialize PDF QR links when DOM is ready
     */
    async function initializePdfQrLinks() {
        console.log('🔍 Searching for PDF QR links...');
        
        // Find all elements with data-item-slug (PDF buttons)
        const pdfButtons = document.querySelectorAll('[data-item-slug]');
        
        if (pdfButtons.length === 0) {
            console.log('ℹ️ No PDF QR buttons found on this page');
            return;
        }

        console.log(`📋 Found ${pdfButtons.length} PDF QR buttons`);
        console.log(`📋 Button details:`, Array.from(pdfButtons).map((btn, i) => ({
            index: i + 1,
            slug: btn.getAttribute('data-item-slug'),
            world: btn.getAttribute('data-world'),
            href: btn.href,
            hasHref: !!btn.href
        })));

        // Process each button and check if it needs dynamic QR
        const buttonPromises = Array.from(pdfButtons).map(async (button, index) => {
            try {
                // Ensure we operate on the actual clickable anchor
                const targetEl = button.matches('a') ? button : (button.querySelector('a') || button);
                
                // De-duplication: skip if already initialized
                if (targetEl.dataset.pdfQrInit === '1') {
                    return;
                }

                const itemSlug = button.getAttribute('data-item-slug');
                const world = button.getAttribute('data-world');

                // Validate required attributes
                if (!itemSlug) {
                    console.warn(`⚠️ Button ${index + 1}: Missing data-item-slug attribute`);
                    return;
                }

                if (!world) {
                    console.warn(`⚠️ Button ${index + 1}: Missing data-world attribute`);
                    return;
                }

                try {
                    // Check if this item needs dynamic QR by calling our API
                    // Backend will auto-detect language from referer header
                    const checkUrl = `${API_BASE_URL}/api/pdf-with-qr?item=${encodeURIComponent(itemSlug)}&world=${encodeURIComponent(world)}&check=true`;
                    
                    console.log(`🔍 Checking Dynamic QR status for: ${itemSlug}`);
                    
                    const response = await fetch(checkUrl);
                    
                    if (!response.ok) {
                        // Silently handle 404s - these are items not in CMS
                        if (response.status === 404) {
                            // Item not in CMS, keep original link without logging error
                            return;
                        }
                        console.warn(`⚠️ Failed to check Dynamic QR for ${itemSlug}: ${response.status}`);
                        return;
                    }
                    
                    const result = await response.json();
                    
                    if (result.success && result.needsDynamicQR) {
                        // ONLY modify URL when Dynamic QR = true
                        console.log(`✅ Dynamic QR enabled for ${itemSlug} - replacing with custom PDF generation`);
                        
                        // URL encode world parameter (handles spaces like "Shopping Spree")
                        const encodedWorld = encodeURIComponent(world);
                        
                        // Get member ID from Memberstack session
                        const memberData = await getMemberIdFromMemberstack();
                        
                        if (!memberData?.id) {
                            console.error('❌ No member ID found - user must be logged in');
                            targetEl.href = '#'; // Disable button
                            targetEl.style.opacity = '0.5';
                            targetEl.title = 'Please log in to download PDF';
                            return;
                        }
                        
                        console.log(`🔑 Member authenticated: ${memberData.id}`);
                        
                        // Create a custom click handler that sends member ID in request header
                        // Backend will auto-detect language from referer header
                        const originalHref = `${API_BASE_URL}/api/pdf-with-qr?item=${encodeURIComponent(itemSlug)}&world=${encodedWorld}`;
                        
                        // Remove any existing click handlers and href
                        targetEl.onclick = null;
                        targetEl.removeAttribute('href'); // Remove Webflow's original href
                        targetEl.removeAttribute('target'); // Remove target="_blank" to prevent double tabs
                        targetEl.style.cursor = 'pointer'; // Keep pointer cursor
                        // Mark as initialized to avoid duplicate listeners
                        targetEl.dataset.pdfQrInit = '1';
                        
                        console.log(`🔧 Button ${index + 1} converted to dynamic PDF generation`);
                        
                        // Add custom click handler with member ID in header
                        targetEl.addEventListener('click', async function(e) {
                            e.preventDefault();
                            e.stopPropagation(); // Stop event bubbling to prevent double tabs
                            
                            console.log(`🖱️ PDF download initiated with member ID: ${memberData.id}`);
                            console.log(`🔗 Original URL: ${originalHref}`);
                            
                            try {
                                // Add cache-busting parameter to ensure fresh PDF generation
                                const cacheBustingUrl = originalHref + '&t=' + Date.now();
                                console.log(`🔗 Cache-busting URL: ${cacheBustingUrl}`);
                                
                                // Make request with member ID in header
                                const response = await fetch(cacheBustingUrl, {
                                    method: 'GET',
                                    headers: {
                                        'X-Member-ID': memberData.id,
                                        'X-Requested-With': 'XMLHttpRequest',
                                        'Cache-Control': 'no-cache'
                                    }
                                });
                                
                                if (response.ok) {
                                    // Open PDF in new tab instead of downloading
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const newTab = window.open(url, '_blank');
                                    
                                    // Clean up the blob URL after a delay
                                    setTimeout(() => {
                                        window.URL.revokeObjectURL(url);
                                    }, 1000);
                                    
                                    if (!newTab) {
                                        alert('Please allow popups to view the PDF');
                                    }
                                } else {
                                    const errorData = await response.json();
                                    console.error('PDF download failed:', errorData);
                                    alert('Failed to generate PDF. Please try again.');
                                }
                            } catch (error) {
                                console.error('PDF download error:', error);
                                alert('Network error. Please check your connection and try again.');
                            }
                        });
                        
                        console.log(`✅ Button ${index + 1} configured for dynamic QR:`, {
                            slug: itemSlug,
                            world: world,
                            customHandler: true
                        });
                        
                    } else {
                        // Dynamic QR = false - keep original Webflow link unchanged
                        console.log(`ℹ️ Button ${index + 1} keeps original Webflow Static PDF link (Dynamic QR = false):`, itemSlug);
                        // Mark as initialized but don't change anything - Webflow link remains
                        targetEl.dataset.pdfQrInit = '1';
                    }
                    
                } catch (error) {
                    console.error(`❌ Error checking Dynamic QR for ${itemSlug}:`, error);
                    // On error, leave the original Webflow link
                }

            } catch (error) {
                console.error(`❌ Error processing button ${index + 1}:`, error);
            }
        });

        // Wait for all button checks to complete
        await Promise.all(buttonPromises);

        console.log(`🎉 PDF QR initialization complete - ${pdfButtons.length} buttons ready`);
    }

    /**
     * Handle dynamic content loading (for Webflow CMS lists)
     */
    function observeContentChanges() {
        // Watch for dynamically added content
        const observer = new MutationObserver((mutations) => {
            let hasNewButtons = false;
            
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if new node has PDF buttons or contains them
                        if (node.hasAttribute && node.hasAttribute('data-item-slug')) {
                            hasNewButtons = true;
                        } else if (node.querySelectorAll) {
                            const newButtons = node.querySelectorAll('[data-item-slug]');
                            if (newButtons.length > 0) {
                                hasNewButtons = true;
                            }
                        }
                    }
                });
            });

            if (hasNewButtons) {
                console.log('🔄 New PDF buttons detected, re-initializing...');
                setTimeout(initializePdfQrLinks, 100); // Small delay to ensure DOM is ready
            }
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('👀 Content change observer started');
    }

    /**
     * Add CSS for visual feedback (optional)
     */
    function addStyles() {}

    /**
     * Initialize everything when DOM is ready
     */
    function init() {
        console.log('🚀 PDF QR Webflow Script initializing...');
        
        // Add optional styles
        addStyles();
        
        // Initialize existing buttons
        initializePdfQrLinks();
        
        // Watch for new content
        observeContentChanges();
        
        console.log('✅ PDF QR Webflow Script ready');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded
        init();
    }

    // Removed extra window load re-initialization to avoid duplicate listeners

})();
