/**
 * cache-busting.js - Aggressive Cache Busting Utilities
 * 
 * PURPOSE: Provide utilities to prevent any caching across the application
 * USAGE: Include this script to add cache-busting headers and parameters
 * 
 * FEATURES:
 * - Add cache-busting meta tags to HTML head
 * - Generate cache-busting parameters for URLs
 * - Configure fetch requests with no-cache headers
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Production Ready ✅
 */

(function() {
    'use strict';
    
    /**
     * Add aggressive cache-busting meta tags to HTML head
     */
    function addCacheBustingMetaTags() {
        // Check if already added
        if (document.getElementById('cache-busting-meta')) {
            return;
        }

        const metaTags = [
            { 'http-equiv': 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
            { 'http-equiv': 'Pragma', content: 'no-cache' },
            { 'http-equiv': 'Expires', content: '0' },
            { name: 'cache-control', content: 'no-cache' },
            { name: 'expires', content: '0' },
            { name: 'pragma', content: 'no-cache' }
        ];

        const head = document.head || document.getElementsByTagName('head')[0];
        
        metaTags.forEach((tagAttrs, index) => {
            const meta = document.createElement('meta');
            
            Object.keys(tagAttrs).forEach(attr => {
                meta.setAttribute(attr, tagAttrs[attr]);
            });
            
            if (index === 0) {
                meta.id = 'cache-busting-meta';
            }
            
            head.appendChild(meta);
        });

        console.log('🚫 Cache busting meta tags added');
    }

    /**
     * Generate cache-busting parameters
     * @returns {string} Cache busting query parameters
     */
    function generateCacheBustParams() {
        return `_t=${Date.now()}&_r=${Math.random().toString(36).substr(2, 9)}&_cb=${Date.now() + Math.random()}`;
    }

    /**
     * Add cache-busting parameters to URL
     * @param {string} url - Original URL
     * @returns {string} URL with cache-busting parameters
     */
    function addCacheBustingToUrl(url) {
        if (!url) return url;
        
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}${generateCacheBustParams()}`;
    }

    /**
     * Get aggressive no-cache headers
     * @returns {Object} Headers object with no-cache directives
     */
    function getNoCacheHeaders() {
        return {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Last-Modified': new Date(0).toUTCString(),
            'If-Modified-Since': new Date(0).toUTCString(),
            'If-None-Match': 'no-match-' + Date.now()
        };
    }

    /**
     * Create fetch request with aggressive cache busting
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise} Fetch promise with cache busting
     */
    function fetchWithCacheBusting(url, options = {}) {
        const cacheBustedUrl = addCacheBustingToUrl(url);
        
        const noCacheHeaders = getNoCacheHeaders();
        
        const fetchOptions = {
            ...options,
            headers: {
                ...noCacheHeaders,
                ...options.headers
            }
        };

        console.log(`🚫 Cache-busted fetch: ${cacheBustedUrl}`);
        return fetch(cacheBustedUrl, fetchOptions);
    }

    /**
     * Force reload of all cached resources
     */
    function forceReloadCachedResources() {
        // Force reload CSS
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        links.forEach(link => {
            const href = link.href.split('?')[0];
            link.href = addCacheBustingToUrl(href);
        });

        // Force reload scripts (for next page load)
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            const src = script.src.split('?')[0];
            script.dataset.originalSrc = src;
            script.dataset.cacheBusted = 'true';
        });

        console.log('🔄 Forced reload of cached resources');
    }

    /**
     * Disable browser cache for current session
     */
    function disableBrowserCache() {
        // Add service worker to intercept requests
        if ('serviceWorker' in navigator) {
            const swCode = `
                self.addEventListener('fetch', function(event) {
                    if (event.request.method === 'GET') {
                        event.respondWith(
                            fetch(event.request.url + '${generateCacheBustParams()}', {
                                headers: {
                                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                                    'Pragma': 'no-cache',
                                    'Expires': '0'
                                }
                            })
                        );
                    }
                });
            `;
            
            const blob = new Blob([swCode], { type: 'application/javascript' });
            const swUrl = URL.createObjectURL(blob);
            
            navigator.serviceWorker.register(swUrl).then(() => {
                console.log('🚫 Cache-busting service worker registered');
            }).catch(err => {
                console.log('Service worker registration failed:', err);
            });
        }

        // Override fetch globally
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            return fetchWithCacheBusting(url, options);
        };

        console.log('🚫 Browser cache disabled for session');
    }

    /**
     * Initialize aggressive cache busting
     */
    function initCacheBusting() {
        addCacheBustingMetaTags();
        forceReloadCachedResources();
        
        // Add cache busting to all future dynamic content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Handle audio elements
                        if (node.tagName === 'AUDIO' && node.src) {
                            node.src = addCacheBustingToUrl(node.src);
                        }
                        
                        // Handle img elements
                        if (node.tagName === 'IMG' && node.src) {
                            node.src = addCacheBustingToUrl(node.src);
                        }
                        
                        // Handle nested audio/img elements
                        const audioElements = node.querySelectorAll && node.querySelectorAll('audio[src]');
                        if (audioElements) {
                            audioElements.forEach(audio => {
                                audio.src = addCacheBustingToUrl(audio.src);
                            });
                        }
                        
                        const imgElements = node.querySelectorAll && node.querySelectorAll('img[src]');
                        if (imgElements) {
                            imgElements.forEach(img => {
                                img.src = addCacheBustingToUrl(img.src);
                            });
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('🚫 Aggressive cache busting initialized');
    }

    // Create global namespace
    window.CacheBusting = {
        addCacheBustingMetaTags,
        generateCacheBustParams,
        addCacheBustingToUrl,
        getNoCacheHeaders,
        fetchWithCacheBusting,
        forceReloadCachedResources,
        disableBrowserCache,
        initCacheBusting
    };

    // Auto-initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCacheBusting);
    } else {
        initCacheBusting();
    }

    console.log('🚫 CacheBusting utilities loaded and initialized');

})(); 