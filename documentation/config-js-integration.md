# config.js - Global Configuration Integration

## Overview

`config.js` provides centralized configuration management for all Little Microphones JavaScript files. It eliminates URL duplication and makes environment management easier.

## Features

### 🔧 Centralized Configuration
- **API_BASE_URL**: Base URL for all API endpoints
- **CDN_BASE_URL**: Base URL for CDN resources  
- **AUDIO_CDN_URL**: Base URL for audio files
- **Environment Detection**: Automatic dev/prod detection
- **Debug Configuration**: Conditional logging

### 🌐 Global Namespace
All configuration is available via `window.LM_CONFIG`:

```javascript
window.LM_CONFIG = {
    API_BASE_URL: 'https://little-microphones.vercel.app',
    CDN_BASE_URL: 'https://little-microphones.b-cdn.net',
    AUDIO_CDN_URL: 'https://little-microphones.b-cdn.net/audio',
    IS_DEVELOPMENT: false,
    DEBUG_ENABLED: false
}
```

## Integration

### 1. HTML Integration
Include `config.js` **before** other scripts:

```html
<!-- FIRST: Load configuration -->
<script src="config.js"></script>

<!-- THEN: Load other scripts -->
<script src="lm.js"></script>
<script src="radio.js"></script>
<script src="recording.js"></script>
```

### 2. JavaScript Usage
All JS files now use the global config with fallbacks:

```javascript
// API Configuration - Use global config if available, fallback to hardcoded
const API_BASE_URL = window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app';

// CDN Configuration
const AUDIO_CDN_URL = window.LM_CONFIG?.AUDIO_CDN_URL || 'https://little-microphones.b-cdn.net/audio';
```

## Benefits

### ✅ Before vs After

**Before (Duplicated URLs):**
```javascript
// lm.js
const API_BASE_URL = 'https://little-microphones.vercel.app';

// radio.js  
const API_BASE_URL = 'https://little-microphones.vercel.app';

// recording.js
const API_BASE_URL = 'https://little-microphones.vercel.app';
const introUrl = `https://little-microphones.b-cdn.net/audio/other/intro.mp3`;
```

**After (Centralized Config):**
```javascript
// config.js (single source of truth)
window.LM_CONFIG = {
    API_BASE_URL: 'https://little-microphones.vercel.app',
    AUDIO_CDN_URL: 'https://little-microphones.b-cdn.net/audio'
};

// All JS files
const API_BASE_URL = window.LM_CONFIG?.API_BASE_URL || 'fallback';
const introUrl = `${window.LM_CONFIG?.AUDIO_CDN_URL}/other/intro.mp3`;
```

### 🚀 Advantages

1. **Single Source of Truth**: Change URLs in one place
2. **Environment Flexibility**: Easy dev/staging/prod switching
3. **Fallback Safety**: Hardcoded fallbacks prevent failures
4. **Debug Control**: Conditional logging based on environment
5. **Maintainability**: Easier to update and manage

## Environment Detection

`config.js` automatically detects the environment:

```javascript
// Development Detection
window.LM_CONFIG.IS_DEVELOPMENT = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('webflow.io');

// Debug Logging
if (window.LM_CONFIG.DEBUG_ENABLED) {
    console.log('🔧 LM_CONFIG loaded:', window.LM_CONFIG);
}
```

## File Structure

```
Little Microphones/
├── config.js                 # ← Global configuration
├── lm.js                     # Uses window.LM_CONFIG
├── radio.js                  # Uses window.LM_CONFIG  
├── recording.js              # Uses window.LM_CONFIG
├── rp.js                     # Uses window.LM_CONFIG
└── radio-generator.js        # Uses window.LM_CONFIG
```

## Updated Files

All JavaScript files have been updated to use the global configuration:

- ✅ `lm.js` - API endpoints
- ✅ `radio.js` - API endpoints  
- ✅ `recording.js` - API + CDN endpoints
- ✅ `rp.js` - API endpoints
- ✅ `radio-generator.js` - API endpoints

## Migration Notes

### Safe Migration
- **Fallback URLs**: All files include hardcoded fallbacks
- **Backward Compatible**: Works with or without `config.js`
- **No Breaking Changes**: Existing functionality preserved

### Webflow Integration
To use in Webflow, add this to your site's custom code:

```html
<script src="https://little-microphones.vercel.app/config.js"></script>
```

Or host `config.js` on your CDN and reference it.

## Future Enhancements

### Planned Features
- **Environment-specific configs**: Different URLs per environment
- **Feature flags**: Toggle functionality based on config
- **Performance monitoring**: Track API response times
- **Error tracking**: Centralized error reporting config

### Example Advanced Config
```javascript
window.LM_CONFIG = {
    // Environment-specific URLs
    API_BASE_URL: IS_DEVELOPMENT ? 'http://localhost:3000' : 'https://little-microphones.vercel.app',
    
    // Feature flags
    FEATURES: {
        ENABLE_ANALYTICS: true,
        ENABLE_DEBUG_MODE: IS_DEVELOPMENT,
        ENABLE_OFFLINE_MODE: false
    },
    
    // Performance settings
    TIMEOUTS: {
        API_TIMEOUT: 30000,
        UPLOAD_TIMEOUT: 60000
    }
};
```

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: January 2025  
**Dependencies**: None (vanilla JavaScript) 