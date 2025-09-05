# rp.js - Recording Page Authorization & Radio Program Sharing Documentation

## Overview
The `rp.js` script handles member authorization for recording pages and provides radio program sharing functionality through a simplified "Generate Program" button.

## Purpose
This script enables secure access to recording interfaces and provides teachers with an easy way to share radio programs with parents and students.

## Core Functions

### 1. Member Authorization
- **URL Parameter Validation**: Extracts and validates `lmid` and `world` from URL
- **Memberstack Integration**: Verifies member login status and permissions
- **LMID Authorization**: Checks if member has access to the requested LMID
- **Error Handling**: Redirects unauthorized users with appropriate messages

### 2. World Collection Management
- **Dynamic Display**: Shows only the recording interface for the current world
- **UI Initialization**: Sets up recording functionality with proper delays
- **World Name Formatting**: Updates page title and world display elements

### 3. Simplified Radio Program Sharing
**NEW IMPLEMENTATION (Mobile-Optimized)**:
- **Pre-Generation**: ShareID is generated during page load, not on click
- **Direct Navigation**: Uses `href` attribute instead of `window.open()` for mobile compatibility
- **Popup Blocker Avoidance**: Eliminates mobile popup blocker issues
- **Native Browser Handling**: Leverages browser's built-in link handling

## Key Functions

### setupExistingRadioProgramButton(world, lmid)
**Purpose**: Converts the existing "generate-program" button into a radio program sharing link

**NEW Mobile-Optimized Implementation**:
```javascript
// BEFORE (Complex, Mobile Issues):
newButton.addEventListener('click', async (event) => {
  // API call on click
  const response = await fetch('/api/get-share-link');
  window.open(radioUrl, '_blank'); // Blocked on mobile
});

// AFTER (Simple, Mobile-Friendly):
async function generateShareIdAndSetupButton(button, world, lmid) {
  // Pre-generate ShareID during page load
  const response = await fetch('/api/get-share-link');
  const radioUrl = `/little-microphones?ID=${result.shareId}`;
  
  // Set as direct link (works on mobile)
  button.setAttribute('href', radioUrl);
  button.setAttribute('target', '_blank');
  button.textContent = 'Open Radio Program';
}
```

**Benefits**:
- ✅ Works reliably on mobile devices
- ✅ No popup blocker issues
- ✅ Faster user experience (pre-generated links)
- ✅ Native browser navigation
- ✅ Fallback error handling

### generateShareIdAndSetupButton(button, world, lmid)
**Purpose**: Pre-generates ShareID and configures button for direct navigation

**Process**:
1. **API Call**: Fetches/creates ShareID for world/lmid combination
2. **URL Generation**: Creates radio page URL with ShareID parameter
3. **Button Configuration**: Sets href, target, and rel attributes
4. **Text Update**: Changes button text to "Open Radio Program"
5. **Error Handling**: Provides fallback for API failures

## Authorization Flow

### 1. URL Parameter Extraction
```javascript
const lmidFromUrl = urlParams.get("lmid");
const worldFromUrl = urlParams.get("world");
```

### 2. Member Verification
```javascript
memberstack.getCurrentMember()
  .then(({ data: memberData }) => {
    // Check if member is logged in
    // Validate LMID permissions
    // Set up recording environment
  });
```

### 3. Permission Checking
- **Metadata Parsing**: Extracts authorized LMIDs from member metadata
- **LMID Validation**: Ensures member can access requested LMID
- **Global Setup**: Exposes recording parameters for other scripts

## Radio Program Sharing Architecture

### ShareID System
- **Unique Identifiers**: Each world/lmid combination gets a unique ShareID
- **Database Storage**: ShareIDs stored in Supabase for persistence
- **URL Format**: `/little-microphones?ID=shareId` (no exposed world/lmid)

### Mobile Compatibility Improvements
**Problem Solved**: Mobile browsers often block `window.open()` calls that aren't directly triggered by user interaction.

**Solution**: Pre-generate ShareID and use native link attributes:
- `href`: Direct URL to radio page
- `target="_blank"`: Opens in new tab
- `rel="noopener noreferrer"`: Security best practices

### Button States
- **Loading**: "Generate Program" (initial state)
- **Ready**: "Open Radio Program" (after ShareID generation)
- **Error**: "Radio Program (Error)" (if API fails)

## Error Handling

### Authorization Errors
- **Missing Parameters**: Redirects with error message
- **Invalid Member**: Returns to previous page
- **Insufficient Permissions**: Blocks access with explanation

### API Errors
- **Network Failures**: Shows user-friendly error messages
- **ShareID Generation**: Provides fallback button behavior
- **Graceful Degradation**: System remains functional even with partial failures

## Integration Points

### With recording.js
- **Global Parameters**: Exposes `window.currentRecordingParams`
- **World Initialization**: Triggers recording setup for specific world
- **UI Coordination**: Manages timing of component initialization

### With Memberstack
- **Authentication**: Verifies member login status
- **Metadata Access**: Reads member's authorized LMID list
- **Permission Enforcement**: Blocks unauthorized access attempts

### With Radio System
- **ShareID Generation**: Creates shareable identifiers
- **URL Construction**: Builds radio page links
- **Cross-Platform Compatibility**: Ensures mobile and desktop functionality

## Security Features

### LMID Protection
- **Server-Side Validation**: All LMID access verified against member metadata
- **URL Obfuscation**: ShareIDs hide actual world/lmid combinations
- **Permission Boundaries**: Members can only access authorized programs

### Error Prevention
- **Input Validation**: All URL parameters validated before use
- **State Verification**: Member login status checked before operations
- **Graceful Failures**: System degrades gracefully when components fail

## Best Practices

### Mobile Optimization
- **Pre-Generation**: Generate ShareIDs during page load, not on demand
- **Native Navigation**: Use browser's built-in link handling
- **Popup Avoidance**: Avoid `window.open()` in favor of href attributes

### Performance
- **Lazy Loading**: Initialize components only when needed
- **UI Delays**: Allow DOM to settle before complex operations
- **Error Boundaries**: Isolate failures to prevent cascade effects

### User Experience
- **Clear Feedback**: Button text indicates current state
- **Error Messages**: Provide actionable error information
- **Consistent Behavior**: Same experience across all devices

## Configuration

### Global Dependencies
- **window.LM_CONFIG**: Global configuration object
- **window.$memberstackDom**: Memberstack DOM integration
- **API_BASE_URL**: Base URL for all API endpoints

### Timing Configuration
- **UI_UPDATE_DELAY**: Delay before initializing recording components
- **API_TIMEOUT**: Maximum time to wait for API responses
- **ERROR_DISPLAY_DURATION**: How long to show error messages

## Future Enhancements

### Planned Improvements
- **Offline Support**: Cache ShareIDs for offline access
- **Analytics Integration**: Track sharing and access patterns
- **Batch Operations**: Support multiple program sharing
- **Custom Branding**: Allow teachers to customize shared links

### Mobile Enhancements
- **Progressive Web App**: Add PWA features for mobile users
- **Touch Optimization**: Improve touch interface responsiveness
- **Offline Playback**: Enable offline radio program access

This documentation reflects the current mobile-optimized implementation that prioritizes reliability and user experience across all devices. 