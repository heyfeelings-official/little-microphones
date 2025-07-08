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