# Webflow Radio Program Setup Guide

## Overview
This guide helps you set up the radio program page in Webflow using the simplified single-container approach with JavaScript-controlled state management.

## Required Structure

### HTML Structure (Single Container)
```html
<div class="program-container">
    <!-- STATIC ELEMENTS (always visible) -->
    <div class="program-header">
        <h2>Little Microphones</h2>
        <h1 id="world-name">Loading...</h1>
    </div>
    
    <div class="teacher-info">
        <div id="teacher-full-name">Loading...</div>
        <div id="school-name">Loading...</div>
    </div>
    
    <!-- DYNAMIC STATE ELEMENTS (JavaScript controls visibility) -->
    <div id="loading-state">
        <div id="loading-text">Loading your radio program...</div>
    </div>
    
    <div id="generating-state" style="display: none;">
        <div id="generating-text">Generating your radio program...</div>
    </div>
    
    <div id="player-state" style="display: none;">
        <!-- Audio player will be injected here by JavaScript -->
    </div>
</div>
```

## Required Element IDs

### Container Elements
- `.program-container` - Main container (class, not ID)
- `#world-bg` (optional) - Element for world background image

### Static Content Elements
- `#world-name` - Displays the world name (e.g., "Spookyland")
- `#teacher-full-name` - Displays teacher name
- `#school-name` - Displays school name

### Dynamic State Elements
- `#loading-state` - Container for loading state
- `#loading-text` - Loading message text
- `#generating-state` - Container for generating state
- `#generating-text` - Generating message text
- `#player-state` - Container for audio player (content injected by JS)

## CSS Classes (Optional but Recommended)

```css
.program-container {
    position: relative;
    padding: 40px;
    border-radius: 16px;
    background-size: cover;
    background-position: center;
    min-height: 400px;
}

.program-header {
    text-align: center;
    margin-bottom: 30px;
}

.teacher-info {
    text-align: center;
    margin-bottom: 30px;
    font-size: 14px;
    opacity: 0.8;
}

#loading-state, #generating-state, #player-state {
    background: rgba(255, 255, 255, 0.95);
    padding: 30px;
    border-radius: 12px;
    text-align: center;
}

#generating-text {
    font-size: 18px;
    font-weight: 500;
    color: #333;
}

/* Audio player styling handled by inline styles in JavaScript */
```

## JavaScript Integration

### 1. Include Required Scripts
Add these scripts in Webflow's custom code section (before </body> tag):

```html
<!-- Configuration -->
<script src="https://little-microphones.vercel.app/config.js"></script>

<!-- Radio Program Script -->
<script src="https://little-microphones.vercel.app/radio.js"></script>
```

### 2. NO Additional Initialization Needed
The radio.js script automatically:
- Detects when DOM is loaded
- Extracts ShareID from URL (?ID=xxx)
- Loads world and teacher data
- Manages state transitions
- Handles audio player creation

### 3. URL Parameters
The page expects a ShareID in the URL:
```
https://yoursite.com/radio?ID=p4l909my
```

## State Management

The JavaScript automatically manages three states:

1. **Loading State** (initial)
   - Shows: loading-state
   - Hides: generating-state, player-state
   - Displays: "Loading your radio program..."

2. **Generating State** (when creating new program)
   - Shows: generating-state
   - Hides: loading-state, player-state
   - Displays: Fun rotating messages every 2 seconds

3. **Player State** (when program is ready)
   - Shows: player-state
   - Hides: loading-state, generating-state
   - Contains: Custom audio player with full controls

## Features Included

### Automatic Features
- ✅ World background image from configuration
- ✅ Teacher data fetched from API
- ✅ World name formatting (spookyland → Spookyland)
- ✅ Fun generating messages that rotate
- ✅ Mobile-responsive audio player
- ✅ Automatic program generation when needed

### Audio Player Features
- Play/pause button
- Progress bar (clickable for seeking)
- Time display (current/total)
- Volume control with mute
- Recording count display
- Styled with inline CSS (no external styles needed)

## Testing

### Development Testing
1. Create the HTML structure in Webflow
2. Add required IDs to elements
3. Include the JavaScript files
4. Test with a valid ShareID: `?ID=p4l909my`

### Common Issues

1. **"Required elements not found"**
   - Check that all required IDs exist
   - Ensure IDs are exactly as specified (case-sensitive)

2. **"No ShareID found in URL"**
   - Make sure URL includes `?ID=xxxxx` parameter

3. **Styles not applying**
   - The audio player uses inline styles
   - Container background is set via JavaScript
   - Add your own CSS for container styling

## Mobile Considerations

The system is mobile-optimized:
- Audio player is responsive
- Touch-friendly controls
- No popups (uses direct links)
- Automatic state management

## Example Complete Setup

```html
<div class="program-container">
    <div class="program-header">
        <h2>Little Microphones</h2>
        <h1 id="world-name">Loading...</h1>
    </div>
    
    <div class="teacher-info">
        <div id="teacher-full-name">Loading...</div>
        <div id="school-name">Loading...</div>
    </div>
    
    <div id="loading-state">
        <div id="loading-text">Loading your radio program...</div>
    </div>
    
    <div id="generating-state" style="display: none;">
        <div id="generating-text">Mixing magical audio potions...</div>
    </div>
    
    <div id="player-state" style="display: none;">
        <!-- Player injected here -->
    </div>
</div>

<script src="https://little-microphones.vercel.app/config.js"></script>
<script src="https://little-microphones.vercel.app/radio.js"></script>
```

That's it! The system handles everything else automatically. 