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
    
    // Worlds Configuration
    window.LM_CONFIG.WORLDS = [
        'spookyland',
        'waterpark', 
        'shopping-spree',
        'amusement-park',
        'big-city',
        'neighborhood'
    ];
    
    // World Videos (from HeyFeelings CDN) - replaces static images with dynamic videos
    window.LM_CONFIG.WORLD_VIDEOS = {
        'big-city': 'https://heyfeelings.b-cdn.net/Worlds/city-opt.mp4',
        'amusement-park': 'https://heyfeelings.b-cdn.net/Worlds/funfair-opt.mp4',
        'spookyland': 'https://heyfeelings.b-cdn.net/Worlds/halloween-opt.mp4',
        'neighborhood': 'https://heyfeelings.b-cdn.net/Worlds/home-opt.mp4',
        'shopping-spree': 'https://heyfeelings.b-cdn.net/Worlds/mall-opt.mp4',
        'waterpark': 'https://heyfeelings.b-cdn.net/Worlds/waterpark-opt.mp4'
    };
    
    // Legacy World Images (kept for fallback compatibility)
    window.LM_CONFIG.WORLD_IMAGES = {
        'shopping-spree': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f506146fb421db045378af_cdcb9c23ac6f956cbb6f7f498c75cd11_worlds-Anxiety.avif',
        'waterpark': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f50606d058c933cd554be8_2938a42d480503a33daf8a8334f53f0a_worlds-Empathy.avif',
        'amusement-park': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505fe412762bb8a01b03d_85fcbe125912ab0998bf679d2e8c6082_worlds-Love.avif',
        'big-city': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505f572e936f2b665af1f_7b989a3fe827622216294c6539607059_worlds-Anger.avif',
        'spookyland': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505ecd6f37624ef7affb8_587c997427b10cabcc31cc98d6e516f4_worlds-Fear.png',
        'neighborhood': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/683859c64fa8c3f50ead799a_worlds-boredom.avif'
    };
    
    // Collection Selectors for Worlds
    window.LM_CONFIG.WORLD_COLLECTIONS = [
        'collection-spookyland',
        'collection-shopping-spree', 
        'collection-amusement-park',
        'collection-neighborhood',
        'collection-big-city',
        'collection-waterpark'
    ];
    
    // Timeouts and Retry Configuration
    window.LM_CONFIG.TIMEOUTS = {
        API_TIMEOUT: 30000,           // 30 seconds
        UPLOAD_TIMEOUT: 60000,        // 60 seconds
        MAX_RETRIES: 15,              // Maximum retry attempts
        RETRY_DELAY: 200,             // Delay between retries (ms)
        FOCUS_DELAY: 100,             // Input focus delay (ms)
        UI_UPDATE_DELAY: 100          // UI update delay (ms)
    };
    
    // CSS Selectors (commonly used)
    window.LM_CONFIG.SELECTORS = {
        RECORDER_WRAPPER: '.faq1_accordion.lm',
        DELETE_BUTTON: 'div[style*="color: #F25444"]',
        COLLECTION_PREFIX: 'collection-'
    };
    
    // Database Configuration
    window.LM_CONFIG.DATABASE = {
        NAME: 'kidsAudioDB',
        VERSION: 2
    };
    
    // Audio Configuration
    window.LM_CONFIG.AUDIO = {
        INTRO_FILE: 'other/intro.mp3',
        OUTRO_FILE: 'other/outro.mp3', 
        BACKGROUND_FILE: 'other/monkeys.mp3',
        QUESTION_FILE_PATTERN: '{world}/{world}-QID{questionId}.mp3'
    };
    
    // Utility Functions
    window.LM_CONFIG.UTILS = {
        // Format world name for display (e.g., "spookyland" -> "Spookyland", "big-city" -> "Big City")
        formatWorldName: function(world) {
            return world.charAt(0).toUpperCase() + world.slice(1).replace(/-/g, ' ');
        },
        
        // Get world video URL (preferred)
        getWorldVideo: function(world) {
            return window.LM_CONFIG.WORLD_VIDEOS[world] || '';
        },
        
        // Get world image URL (fallback)
        getWorldImage: function(world) {
            return window.LM_CONFIG.WORLD_IMAGES[world] || '';
        },
        
        // Generate cache-busted URL
        cacheBustUrl: function(url, timestamp = null) {
            const t = timestamp || Date.now();
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}t=${t}`;
        },
        
        // Get audio file URL
        getAudioUrl: function(filename, cacheBust = true) {
            const url = `${window.LM_CONFIG.AUDIO_CDN_URL}/${filename}`;
            return cacheBust ? window.LM_CONFIG.UTILS.cacheBustUrl(url) : url;
        }
    };
    

    
})(); 