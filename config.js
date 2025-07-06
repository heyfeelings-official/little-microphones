/**
 * config.js - Global Configuration for Little Microphones
 * 
 * PURPOSE: Centralized configuration for all API endpoints and CDN URLs
 * USAGE: Include this script before other scripts in Webflow pages
 * 
 * PROVIDES:
 * - window.LM_CONFIG.API_BASE_URL - Base URL for all API endpoints
 * - window.LM_CONFIG.CDN_BASE_URL - Base URL for CDN resources
 * - window.LM_CONFIG.AUDIO_CDN_URL - Base URL for audio files
 * 
 * EXAMPLE USAGE:
 * 
 * // Include in HTML (first script):
 * <script src="config.js"></script>
 * 
 * // Use in other scripts:
 * const response = await fetch(`${window.LM_CONFIG.API_BASE_URL}/api/create-lmid`);
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Production Ready ✅
 */

(function() {
    'use strict';
    
    // Create global LM_CONFIG namespace
    window.LM_CONFIG = window.LM_CONFIG || {};
    
    // API Configuration
    window.LM_CONFIG.API_BASE_URL = 'https://little-microphones.vercel.app';
    
    // CDN Configuration
    window.LM_CONFIG.CDN_BASE_URL = 'https://little-microphones.b-cdn.net';
    window.LM_CONFIG.AUDIO_CDN_URL = 'https://little-microphones.b-cdn.net/audio';
    
    // Environment Detection
    window.LM_CONFIG.IS_DEVELOPMENT = window.location.hostname === 'localhost' || 
                                      window.location.hostname === '127.0.0.1' ||
                                      window.location.hostname.includes('webflow.io');
    
    // Debug Configuration
    window.LM_CONFIG.DEBUG_ENABLED = window.LM_CONFIG.IS_DEVELOPMENT;
    
    // Log configuration load
    if (window.LM_CONFIG.DEBUG_ENABLED) {
        console.log('🔧 LM_CONFIG loaded:', window.LM_CONFIG);
    }
    
})(); 