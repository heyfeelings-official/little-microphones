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

        // Process each button and check if it needs dynamic QR
        const buttonPromises = Array.from(pdfButtons).map(async (button, index) => {
            try {
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
                    const checkUrl = `${API_BASE_URL}/api/pdf-with-qr?item=${encodeURIComponent(itemSlug)}&world=${encodeURIComponent(world)}&check=true`;
                    
                    console.log(`🔍 Checking Dynamic QR status for: ${itemSlug}`);
                    
                    const response = await fetch(checkUrl);
                    const result = await response.json();
                    
                    if (result.success && result.needsDynamicQR) {
                        // URL encode world parameter (handles spaces like "Shopping Spree")
                        const encodedWorld = encodeURIComponent(world);
                        
                        // Build dynamic URL (add memberId for testing until session works)
                        const dynamicUrl = `${API_BASE_URL}/api/pdf-with-qr?item=${encodeURIComponent(itemSlug)}&world=${encodedWorld}&memberId=mem_sb_cme1g02ox010r0wnk4fa652lr`;
                        
                        // Set href attribute
                        button.href = dynamicUrl;
                        
                        // Add visual indicator (optional)
                        button.classList.add('pdf-qr-ready');
                        
                        console.log(`✅ Button ${index + 1} configured for dynamic QR:`, {
                            slug: itemSlug,
                            world: world,
                            url: dynamicUrl
                        });

                        // Add click tracking (optional)
                        button.addEventListener('click', function(e) {
                            console.log(`🖱️ PDF QR download initiated:`, {
                                slug: itemSlug,
                                world: world,
                                timestamp: new Date().toISOString()
                            });
                            
                            // Add loading state class without changing text
                            button.classList.add('pdf-qr-loading');
                            
                            // Reset loading state after delay
                            setTimeout(() => {
                                button.classList.remove('pdf-qr-loading');
                            }, 3000);
                        });
                        
                    } else {
                        console.log(`ℹ️ Button ${index + 1} keeps original Webflow URL (Dynamic QR = false):`, itemSlug);
                        // Leave button.href unchanged - it will use the Webflow CMS link
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
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .pdf-qr-ready {
                position: relative;
            }
            
            .pdf-qr-loading {
                opacity: 0.7;
                pointer-events: none;
            }
            
            .pdf-qr-ready::after {
                content: "📋";
                position: absolute;
                top: -5px;
                right: -5px;
                font-size: 12px;
                opacity: 0.6;
            }
        `;
        document.head.appendChild(style);
    }

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

    // Also initialize on window load as fallback
    window.addEventListener('load', function() {
        setTimeout(initializePdfQrLinks, 500); // Re-check after page fully loads
    });

})();
