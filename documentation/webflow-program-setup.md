# Webflow Radio Program Page Setup Guide

## Overview
This guide explains how to set up the radio program page in Webflow with the new single-container system.

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

## Required Elements

### 1. Container Structure
```