# Webflow Integration Guide - Updated File Structure

## New File Structure (v4.4.6+)

### Main Files
- **`record.js`** - Recording page authorization (formerly `rp.js`)
- **`little-microphones.js`** - Dashboard controller (formerly `lm.js`)
- **`radio.js`** - Radio program player page
- **`config.js`** - Global configuration

### Recording System
- **`recording/recording.js`** - Main recording functionality
- **`recording/recording-audio.js`** - Audio processing
- **`recording/recording-ui.js`** - UI components
- **`recording/recording-storage.js`** - Storage management
- **`recording/recording-radio.js`** - Radio generation

### Utilities
- **`utils/`** - Helper functions and utilities
- **`api/`** - Backend API endpoints

## New URL Structure

### Dashboard
- **New URL**: `/members/little-microphones`
- **Old URL**: `/members/lm` (deprecated)

### Recording Pages
- **New URL**: `/members/record?world=spookyland&lmid=123`
- **Old URL**: `/members/rp?world=spookyland&lmid=123` (deprecated)

### Radio Program (Public Access)
- **New URL**: `/little-microphones?ID=shareId`
- **Old URL**: `/members/radio?ID=shareId` (deprecated)

## Migration Notes

1. **File References**: Update any Webflow script tags to use new filenames
2. **URL Links**: Update navigation links to use new URL structure
3. **Documentation**: Update any references in comments or docs

## Webflow Script Tags

```html
<!-- Dashboard Page -->
<script src="https://little-microphones.vercel.app/little-microphones.js"></script>

<!-- Recording Pages -->
<script src="https://little-microphones.vercel.app/record.js"></script>
<script src="https://little-microphones.vercel.app/recording/recording.js"></script>

<!-- Radio Program Page -->
<script src="https://little-microphones.vercel.app/radio.js"></script>

<!-- Global Config (all pages) -->
<script src="https://little-microphones.vercel.app/config.js"></script>
```

## Benefits of New Structure

1. **Clearer naming** - File names match their purpose
2. **Better organization** - Recording files grouped together
3. **Public radio access** - Radio programs accessible without login
4. **Simplified URLs** - More intuitive URL structure 