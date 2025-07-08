# Webflow Radio Program Page Setup Guide

## Overview
This guide explains how to set up the radio program page in Webflow with the new file structure and URL system.

## Important Notes

### Remove Old Code
**CRITICAL**: Remove any inline JavaScript code that references `window.ProgramContainer.initialize` from your Webflow page. This old code will cause console errors. Look for and remove code like:
```javascript
// Remove this from your Webflow page (usually around line 333):
window.ProgramContainer.initialize();
```

**ALSO REMOVE**: Remove the script tag that loads the deleted `radio-player.js` file:
```html
<!-- Remove this script tag from your Webflow page: -->
<script src="https://little-microphones.vercel.app/radio-player.js"></script>
```

This will fix both console errors:
- `TypeError: Cannot read properties of undefined (reading 'initialize')`
- `GET https://little-microphones.vercel.app/radio-player.js net::ERR_ABORTED 404 (Not Found)`

## New URL Structure

### Radio Program Page
- **New URL**: `/little-microphones?ID=shareId` (public access)
- **Old URL**: `/members/radio?ID=shareId` (deprecated)

### Required Script Tags
```html
<!-- Global Config (required on all pages) -->
<script src="https://little-microphones.vercel.app/config.js"></script>

<!-- Radio Program Page -->
<script src="https://little-microphones.vercel.app/radio.js"></script>
```

## Required Elements

### 1. Container Structure
```html
<div class="program-container">
  <!-- All content goes here -->
</div>
```

### 2. Static Header Elements
These elements are always visible:

```html
<!-- World name display -->
<div id="world-name">Loading...</div>

<!-- Teacher info (can be anywhere on page, not just in container) -->
<span id="teacher-full-name">Teacher Name</span>
<span id="school-name">School Name</span>
```

**Note**: The teacher and school elements can exist anywhere on the page. The system will find ALL elements with these IDs and update them. The text "& The Kids from" should be added in Webflow between these elements if needed.

### 3. Dynamic State Elements
These elements show/hide based on program status:

```html
<!-- Loading State -->
<div id="loading-state">
  <div id="loading-text">Loading your radio program...</div>
</div>

<!-- Generating State -->
<div id="generating-state">
  <div id="generating-text">Generating your program...</div>
</div>

<!-- Player State -->
<div id="player-state">
  <!-- Audio player will be injected here -->
</div>
```

## Teacher Data Format

The system now returns clean teacher data:
- `teacherName`: "Sebastian Kacperski" (without "& The Kids")
- `schoolName`: "SP369" (without "from")

Your Webflow HTML should structure it like:
```html
<span id="teacher-full-name"></span> & The Kids from <span id="school-name"></span>
```

Result: "Sebastian Kacperski & The Kids from SP369"

## Audio Player

The radio.js file now includes a complete audio player with:
- Play/pause controls
- Progress bar with seeking
- Time display
- Volume control
- All styles inline (no external CSS needed)

## Migration from Old System

1. **Update URL**: Change `/members/radio` to `/little-microphones`
2. **Remove old scripts**: Delete references to `radio-player.js`
3. **Remove inline code**: Delete `window.ProgramContainer.initialize()`
4. **Update script tags**: Use new file paths
5. **Test functionality**: Verify all features work

## Testing

Test with ShareID: `p4l909my`
URL: `https://your-domain.com/little-microphones?ID=p4l909my`

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify all required elements exist with correct IDs
3. Ensure script tags are loading correctly
4. Test with a known ShareID

**Last Updated:** January 2025  
**Version:** 4.4.6+  
**Status:** Production Ready ✅
