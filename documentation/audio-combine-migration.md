# RadioGenerator.js Migration Guide

## Overview
The new `radio-generator.js` provides a single, unified interface for radio program generation that can be used across all pages and contexts.

## ✅ **What We've Unified**

### Before (4 Different Implementations)
1. `api/combine-audio.js` - Backend API ✅ (Keep as is)
2. `recording.js` - Inline generation logic ❌ (Replace)
3. `radio.js` - Duplicate functions ❌ (Replace) 
4. `radio-page-complete.html` - Duplicate functions ❌ (Replace)

### After (Single Source of Truth)
1. `api/combine-audio.js` - Backend API ✅ (Keep as is)
2. `radio-generator.js` - **NEW** Unified frontend script ✅
3. All pages use `window.RadioGenerator.*` functions

## 🚀 **Usage Examples**

### 1. Basic Radio Program Generation
```javascript
// Include the script
<script src="radio-generator.js"></script>

// Generate from recordings array
const recordings = [
    { questionId: '1', filename: 'recording1.mp3', url: 'https://...', timestamp: 123456 },
    { questionId: '2', filename: 'recording2.mp3', url: 'https://...', timestamp: 123457 }
];

const result = await window.RadioGenerator.generateProgram('spookyland', '38', recordings);

if (result.success) {
    console.log('Program URL:', result.url);
    // Play the audio or show player
} else {
    console.error('Generation failed:', result.error);
}
```

### 2. ShareID-Based Generation (Radio Pages)
```javascript
// For radio pages that use ShareID
const shareId = 'rtlyqncj';

const result = await window.RadioGenerator.generateFromShareId(shareId, {
    onProgress: (message, percentage) => {
        console.log(`${percentage}%: ${message}`);
        updateProgressBar(percentage);
    }
});

if (result.success) {
    if (result.fromCache) {
        console.log('Using existing program:', result.url);
    } else {
        console.log('Generated new program:', result.url);
    }
    showAudioPlayer(result.url);
}
```

### 3. Check Program Status Only
```javascript
// Just check if generation is needed
const shareId = 'rtlyqncj';
const status = await window.RadioGenerator.checkStatus(shareId);

if (status.success) {
    console.log('Needs new program:', status.needsNewProgram);
    console.log('Current recordings:', status.currentRecordings.length);
    console.log('Last manifest:', status.lastManifest);
}
```

## 📋 **Migration Steps**

### Step 1: Update Webflow Pages
```html
<!-- Add to Webflow page head or before closing body tag -->
<script src="https://little-microphones.vercel.app/radio-generator.js"></script>

<!-- Replace existing radio generation code with: -->
<script>
async function generateRadioProgram() {
    const shareId = getShareIdFromUrl(); // Your existing function
    
    const result = await window.RadioGenerator.generateFromShareId(shareId, {
        onProgress: (message, percentage) => {
            updateProgress(message, percentage); // Your existing function
        }
    });
    
    if (result.success) {
        showAudioPlayer(result.url); // Your existing function
    } else {
        showError('Generation Failed', result.error); // Your existing function
    }
}
</script>
```

This migration will eliminate code duplication and provide a single, reliable interface for radio program generation across your entire application. 