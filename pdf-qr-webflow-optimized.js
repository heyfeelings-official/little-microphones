/**
 * pdf-qr-webflow-optimized.js - OPTIMIZED Webflow PDF QR Code Dynamic Links
 * 
 * PURPOSE: High-performance PDF QR generation with cache and batch loading
 * FEATURES: 
 * - Batch loading (1 API call vs N calls)
 * - Cache integration (webhook invalidation)
 * - Rate limit prevention
 * - Fallback for cache failures
 * 
 * HOW TO USE IN WEBFLOW:
 * 1. Add Custom Attributes to PDF download buttons:
 *    - data-item-slug = CMS field: Slug
 *    - data-world = CMS field: World (e.g., "Shopping Spree")
 * 2. Include this script in Webflow custom code:
 *    <script src="https://little-microphones.vercel.app/pdf-qr-webflow-optimized.js"></script>
 * 
 * VERSION: 2.0.0 - CACHE OPTIMIZED
 * LAST UPDATED: January 2025
 */

(function() {
    'use strict';

    // Configuration
    const API_BASE_URL = window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app';
    const VERSION = '2.0.0-CACHE';

    console.log(`📋 PDF QR Webflow Script v${VERSION} loaded - BATCH + CACHE mode`);

    /**
     * Get member ID from Memberstack session
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
     * OPTIMIZED: Initialize PDF QR links with batch loading
     */
    async function initializePdfQrLinks() {
        console.log('🔍 Searching for PDF QR links...');
        
        const pdfButtons = document.querySelectorAll('[data-item-slug]');
        
        if (pdfButtons.length === 0) {
            console.log('ℹ️ No PDF QR buttons found on this page');
            return;
        }

        console.log(`📋 Found ${pdfButtons.length} PDF QR buttons - using OPTIMIZED BATCH loading`);

        // Detect language from URL
        const detectedLang = window.location.pathname.startsWith('/pl/') ? 'pl' : 'en';
        console.log(`🌐 Detected language: ${detectedLang}`);

        try {
            // 🚀 BATCH FETCH: Get all workbook items in one API call from cache
            console.log('📡 Fetching all workbook items from cache API...');
            console.time('Cache API Response');
            
            const cacheResponse = await fetch(`${API_BASE_URL}/api/cms-cache?collection=workbooks&lang=${detectedLang}`);
            
            console.timeEnd('Cache API Response');
            
            if (!cacheResponse.ok) {
                throw new Error(`Cache API error: ${cacheResponse.status}`);
            }
            
            const cacheResult = await cacheResponse.json();
            const allItems = cacheResult.data || [];
            
            console.log(`✅ Loaded ${allItems.length} workbook items from cache (${detectedLang})`);
            console.log(`📊 Cache status: ${cacheResult.cached ? '🎯 HIT' : '📡 MISS'}`);
            console.log(`⏱️ Response time: ${cacheResult.timestamp}`);

            // 🎯 Process each button using cached data (synchronous - no API calls)
            let processedCount = 0;
            let dynamicCount = 0;

            Array.from(pdfButtons).forEach((button, index) => {
                try {
                    // Get the actual clickable element
                    const targetEl = button.matches('a') ? button : (button.querySelector('a') || button);
                    
                    // Skip if already initialized
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

                    // Find item in cached data (O(n) lookup - could be optimized with Map)
                    const itemData = allItems.find(item => item.slug === itemSlug);
                    
                    if (!itemData) {
                        // Item not found in CMS - keep original Webflow link
                        console.log(`ℹ️ Item "${itemSlug}" not found in CMS - keeping original link`);
                        processedCount++;
                        return;
                    }

                    // Check if item needs dynamic QR
                    if (!itemData.dynamicQR) {
                        // Dynamic QR disabled - keep original Webflow link  
                        console.log(`ℹ️ Item "${itemSlug}" has Dynamic QR disabled - keeping original link`);
                        processedCount++;
                        return;
                    }

                    console.log(`🎯 Item "${itemSlug}" needs dynamic QR - setting up custom handler`);

                    // 🔥 DYNAMIC QR ENABLED: Setup custom click handler
                    setupDynamicQrHandler(targetEl, itemSlug, world, detectedLang);
                    
                    processedCount++;
                    dynamicCount++;
                    
                } catch (error) {
                    console.error(`❌ Button ${index + 1}: Error processing:`, error);
                }
            });
            
            console.log(`✅ PDF QR links initialization complete (OPTIMIZED mode)`);
            console.log(`📊 Stats: ${processedCount}/${pdfButtons.length} processed, ${dynamicCount} dynamic QR enabled`);
            
        } catch (error) {
            console.error('❌ Failed to fetch workbook items from cache:', error);
            console.log('⚠️ Falling back to legacy individual checks...');
            
            // Fallback to original method if cache fails
            await initializePdfQrLinksLegacy(pdfButtons, detectedLang);
        }
    }

    /**
     * Setup dynamic QR handler for a button
     */
    function setupDynamicQrHandler(targetEl, itemSlug, world, detectedLang) {
        // Mark as initialized to prevent duplicate processing
        targetEl.dataset.pdfQrInit = '1';
        
        // Store original text for loading state
        const originalText = targetEl.textContent || targetEl.innerText;
        
        // Remove original href to prevent default Webflow behavior
        targetEl.removeAttribute('href');
        targetEl.removeAttribute('target');
        targetEl.style.cursor = 'pointer';
        
        // Add custom click handler
        targetEl.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Show loading state
            const loadingText = detectedLang === 'pl' ? 'Generuję' : 'Generating';
            
            targetEl.textContent = loadingText;
            targetEl.style.opacity = '0.7';
            targetEl.style.cursor = 'wait';
            
            try {
                // Get member ID for authentication
                const memberData = await getMemberIdFromMemberstack();
                if (!memberData?.id) {
                    throw new Error('Authentication required - please log in');
                }
                
                // Generate PDF with QR code
                const pdfUrl = `${API_BASE_URL}/api/pdf-with-qr?item=${encodeURIComponent(itemSlug)}&world=${encodeURIComponent(world)}&lang=${detectedLang}`;
                
                console.log(`🎯 Opening PDF: ${itemSlug} (${detectedLang})`);
                
                // Open PDF in new tab
                window.open(pdfUrl, '_blank');
                
            } catch (error) {
                console.error('PDF generation error:', error);
                
                const errorMsg = detectedLang === 'pl' 
                    ? 'Błąd generowania PDF. Spróbuj ponownie.' 
                    : 'Failed to generate PDF. Please try again.';
                    
                alert(errorMsg);
                
            } finally {
                // Reset loading state
                targetEl.textContent = originalText;
                targetEl.style.opacity = '';
                targetEl.style.cursor = 'pointer';
            }
        });
    }

    /**
     * Legacy initialization method (fallback when cache fails)
     */
    async function initializePdfQrLinksLegacy(pdfButtons, detectedLang) {
        console.log('🔄 Using legacy initialization method...');
        
        // Process each button individually (original method)
        const buttonPromises = Array.from(pdfButtons).map(async (button, index) => {
            try {
                const targetEl = button.matches('a') ? button : (button.querySelector('a') || button);
                
                if (targetEl.dataset.pdfQrInit === '1') {
                    return;
                }

                const itemSlug = button.getAttribute('data-item-slug');
                const world = button.getAttribute('data-world');

                if (!itemSlug || !world) {
                    return;
                }

                // Individual check API call (old way)
                const checkUrl = `${API_BASE_URL}/api/pdf-with-qr?item=${encodeURIComponent(itemSlug)}&world=${encodeURIComponent(world)}&check=true&lang=${detectedLang}`;
                const response = await fetch(checkUrl);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        return; // Item not in CMS
                    }
                    console.warn(`⚠️ Button ${index + 1}: API error:`, response.status);
                    return;
                }

                const result = await response.json();
                
                if (result.needsDynamicQR) {
                    setupDynamicQrHandler(targetEl, itemSlug, world, detectedLang);
                }
                
            } catch (error) {
                console.error(`❌ Button ${index + 1}: Error:`, error);
            }
        });

        await Promise.all(buttonPromises);
        console.log('✅ PDF QR links initialization complete (LEGACY mode)');
    }

    /**
     * Initialize when DOM is ready
     */
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializePdfQrLinks);
        } else {
            // DOM already loaded
            initializePdfQrLinks();
        }
        
        // Also initialize on Webflow page transitions (if using Webflow interactions)
        if (window.Webflow) {
            window.Webflow.push(function() {
                initializePdfQrLinks();
            });
        }
    }

    // Start initialization
    init();

})();
