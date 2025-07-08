# Webflow Script Inclusion Checklist

## Overview
This checklist ensures all necessary JavaScript files are properly included in Webflow pages for the Little Microphones application to function correctly.

## Important Notes
- All scripts must be traditional JavaScript (no ES6 modules) for Webflow compatibility
- Scripts must be loaded in the correct order due to dependencies
- Use cache-busting parameters for production deployments
- All scripts should be loaded from Vercel CDN: `https://little-microphones.vercel.app/`

## Recording Page Scripts (rp.js pages)

### Required Scripts (in order):
1. **config.js** - Global configuration
   ```html
   <script src="https://little-microphones.vercel.app/config.js?v=1.0.0"></script>
   ```

2. **lm.js** - Authentication system
   ```html
   <script src="https://little-microphones.vercel.app/lm.js?v=1.0.0"></script>
   ```

3. **recording-ui.js** - UI components module
   ```html
   <script src="https://little-microphones.vercel.app/recording-ui.js?v=1.0.0"></script>
   ```

4. **recording-audio.js** - Audio recording module
   ```html
   <script src="https://little-microphones.vercel.app/recording-audio.js?v=1.0.0"></script>
   ```

5. **recording-storage.js** - Storage management module
   ```html
   <script src="https://little-microphones.vercel.app/recording-storage.js?v=1.0.0"></script>
   ```

6. **recording-radio.js** - Radio generation module
   ```html
   <script src="https://little-microphones.vercel.app/recording-radio.js?v=1.0.0"></script>
   ```

7. **recording.js** - Main recording controller
   ```html
   <script src="https://little-microphones.vercel.app/recording.js?v=1.0.0"></script>
   ```

8. **rp.js** - Page-specific controller
   ```html
   <script src="https://little-microphones.vercel.app/rp.js?v=1.0.0"></script>
   ```

### Webflow Implementation:
Add these scripts to: **Page Settings > Custom Code > Before </body> tag**

## Radio Page Scripts

### Required Scripts (in order):
1. **config.js** - Global configuration
   ```html
   <script src="https://little-microphones.vercel.app/config.js?v=1.0.0"></script>
   ```

2. **lm.js** - Authentication system (if needed for user features)
   ```html
   <script src="https://little-microphones.vercel.app/lm.js?v=1.0.0"></script>
   ```

3. **radio-player.js** - Audio player module
   ```html
   <script src="https://little-microphones.vercel.app/radio-player.js?v=1.0.0"></script>
   ```

4. **radio-api.js** - API communication module
   ```html
   <script src="https://little-microphones.vercel.app/radio-api.js?v=1.0.0"></script>
   ```

5. **radio.js** - Main radio controller
   ```html
   <script src="https://little-microphones.vercel.app/radio.js?v=1.0.0"></script>
   ```

### Webflow Implementation:
Add these scripts to: **Page Settings > Custom Code > Before </body> tag**

## Debug Script (Optional)

For development and troubleshooting:
```html
<script src="https://little-microphones.vercel.app/debug-elements.js?v=1.0.0"></script>
```

## Complete Example for Recording Page

```html
<!-- Before </body> tag in Webflow Page Settings -->

<!-- Memberstack (should already be in site-wide settings) -->
<script src="https://api.memberstack.com/static/memberstack.js" data-memberstack-id="your-id"></script>

<!-- Little Microphones Scripts -->
<script src="https://little-microphones.vercel.app/config.js?v=1.0.0"></script>
<script src="https://little-microphones.vercel.app/lm.js?v=1.0.0"></script>
<script src="https://little-microphones.vercel.app/recording-ui.js?v=1.0.0"></script>
<script src="https://little-microphones.vercel.app/recording-audio.js?v=1.0.0"></script>
<script src="https://little-microphones.vercel.app/recording-storage.js?v=1.0.0"></script>
<script src="https://little-microphones.vercel.app/recording-radio.js?v=1.0.0"></script>
<script src="https://little-microphones.vercel.app/recording.js?v=1.0.0"></script>
<script src="https://little-microphones.vercel.app/rp.js?v=1.0.0"></script>
```

## Complete Example for Radio Page

```html
<!-- Before </body> tag in Webflow Page Settings -->

<!-- Memberstack (should already be in site-wide settings) -->
<script src="https://api.memberstack.com/static/memberstack.js" data-memberstack-id="your-id"></script>

<!-- Little Microphones Scripts -->
<script src="https://little-microphones.vercel.app/config.js?v=1.0.0"></script>
<script src="https://little-microphones.vercel.app/lm.js?v=1.0.0"></script>
<script src="https://little-microphones.vercel.app/radio-player.js?v=1.0.0"></script>
<script src="https://little-microphones.vercel.app/radio-api.js?v=1.0.0"></script>
<script src="https://little-microphones.vercel.app/radio.js?v=1.0.0"></script>
```

## Verification Checklist

### For Recording Pages:
- [ ] config.js loads first (check console for "LM_CONFIG loaded")
- [ ] lm.js loads (check console for "LM Auth System loaded")
- [ ] All recording modules load (check console for module loaded messages)
- [ ] recording.js initializes (check console for "Recording system ready")
- [ ] rp.js activates correct world (check console for world activation)

### For Radio Page:
- [ ] config.js loads first
- [ ] Radio modules load (check console for "RadioPlayer module loaded")
- [ ] radio.js initializes (check console for "Radio page initializing")
- [ ] ShareID extraction works (check console for "ShareID extracted")

## Common Issues

### Scripts Not Loading:
- Check Vercel deployment is live
- Verify script URLs are correct
- Check browser console for 404 errors
- Ensure no CORS issues

### Scripts Loading Out of Order:
- Scripts must be in exact order shown above
- Each script must fully load before next one
- Don't use async or defer attributes

### Module Not Found Errors:
- Ensure all dependency scripts are included
- Check that modules are converted to traditional JS
- Verify window objects are properly exposed

## Cache Busting

For production updates, increment version numbers:
```html
<!-- Old -->
<script src="https://little-microphones.vercel.app/config.js?v=1.0.0"></script>

<!-- New -->
<script src="https://little-microphones.vercel.app/config.js?v=1.0.1"></script>
```

## Testing Script Loading

Add this debug script to verify all modules loaded:
```html
<script>
window.addEventListener('load', function() {
    console.log('=== Little Microphones Module Check ===');
    console.log('Config:', typeof window.LM_CONFIG !== 'undefined' ? '✅' : '❌');
    console.log('Auth:', typeof window.LMAuth !== 'undefined' ? '✅' : '❌');
    console.log('RecordingUI:', typeof window.RecordingUI !== 'undefined' ? '✅' : '❌');
    console.log('RecordingAudio:', typeof window.RecordingAudio !== 'undefined' ? '✅' : '❌');
    console.log('RecordingStorage:', typeof window.RecordingStorage !== 'undefined' ? '✅' : '❌');
    console.log('RecordingRadio:', typeof window.RecordingRadio !== 'undefined' ? '✅' : '❌');
    console.log('RadioPlayer:', typeof window.RadioPlayer !== 'undefined' ? '✅' : '❌');
    console.log('RadioAPI:', typeof window.RadioAPI !== 'undefined' ? '✅' : '❌');
    console.log('=====================================');
});
</script>
```

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Status:** Active Reference Document ✅ 