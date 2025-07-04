# radio.js - Universal Radio Program Page Documentation

## Overview
The `radio.js` script powers the universal radio program page that handles ShareID-based access, intelligent program generation, and parent registration functionality.

## Purpose
This script enables the sharing system architecture where:
- Teachers can share radio programs via secure ShareID links
- Parents can listen to programs and register for their own access
- Programs are generated intelligently based on recording changes
- The system maintains security through obfuscated identifiers

## Architecture

### Core Components

#### 1. ShareID Management
- **URL Parsing**: Extracts ShareID from `?ID=shareId` parameter
- **Validation**: Ensures ShareID exists and is valid
- **Security**: No exposure of world/lmid in URLs

#### 2. Data Fetching
- **API Integration**: Calls `/api/get-radio-data` with ShareID
- **Error Handling**: Graceful degradation for network issues
- **Caching**: Efficient data management

#### 3. Intelligent Program Generation
- **Manifest Comparison**: Compares current recordings vs last program
- **Smart Decisions**: Only generates when new recordings exist
- **Manual Override**: Teachers can force regeneration

#### 4. Audio Player
- **Professional UI**: Custom HTML5 player with enhanced controls
- **Responsive Design**: Works across all devices
- **Accessibility**: Keyboard shortcuts and screen reader support

#### 5. Registration System
- **Memberstack Integration**: Seamless parent registration
- **Metadata Passing**: ShareID included in registration data
- **State Management**: Handles logged-in vs guest users

## Key Functions

### Initialization
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // Extract ShareID from URL
    // Fetch radio data
    // Determine if new program needed
    // Setup UI and registration
});
```

### Data Management
```javascript
async function fetchRadioData(shareId) {
    // Calls /api/get-radio-data
    // Returns: world, lmid, recordings, manifest, needsNewProgram
}
```

### Program Generation
```javascript
async function generateNewProgram() {
    // Calls /api/combine-audio
    // Updates manifest
    // Shows new audio player
}
```

### Registration Flow
```javascript
function handleRegistration() {
    // Opens Memberstack modal
    // Passes ShareID as metadata
    // Triggers webhook system
}
```

## User Flows

### 1. Teacher Flow
1. **Access**: Teacher clicks "Get Share Link" from rp.js
2. **Link Generation**: System creates ShareID and opens radio page
3. **Program Display**: Shows existing program or generates new one
4. **Sharing**: Teacher shares the radio page URL with parents

### 2. Parent Flow
1. **Access**: Parent clicks shared radio link
2. **Program Playback**: Listens to radio program
3. **Registration**: Clicks "Register to Record" button
4. **Account Creation**: Completes Memberstack registration
5. **LMID Assignment**: Webhook assigns new LMID for same world

### 3. Guest Flow
1. **Access**: Anyone with link can listen
2. **Limited Features**: No registration options shown
3. **Sharing**: Can share link with others

## Intelligent Generation Logic

### Decision Matrix
```javascript
if (currentRadioData.needsNewProgram) {
    // New recordings detected
    await generateNewProgram();
} else {
    // Program is current
    showExistingProgram(currentRadioData.lastManifest);
}
```

### Manifest Comparison
The system compares:
- **Current Recordings**: Files available now
- **Last Program Manifest**: Files used in last generation
- **Decision**: Generate only if recordings changed

### Manual Regeneration
Teachers can force regeneration:
- **Update Program Button**: Always available
- **Confirmation Dialog**: Prevents accidental regeneration
- **Fresh Generation**: Creates new program regardless of changes

## Audio Player Features

### Professional Controls
- **Play/Pause**: Standard playback controls
- **Seek Bar**: Navigate through program
- **Volume Control**: Adjust playback volume
- **Speed Control**: Playback speed adjustment (future)

### Download & Sharing
- **Download Button**: Save program for offline listening
- **Share Button**: Copy link or use native sharing
- **Social Integration**: Share to social platforms (future)

### Accessibility
- **Keyboard Shortcuts**:
  - Space: Play/Pause
  - Left Arrow: Seek -10 seconds
  - Right Arrow: Seek +10 seconds
- **Screen Reader**: Proper ARIA labels
- **High Contrast**: Supports accessibility themes

## Registration System

### Memberstack Integration
```javascript
// Check if user is logged in
memberstack.getCurrentMember()
    .then(({ data: memberData }) => {
        if (memberData) {
            hideRegistrationOption();
        } else {
            showRegistrationOption();
        }
    });
```

### Metadata Passing
```javascript
memberstack.openModal('signup', {
    metadata: {
        originating_share_id: currentShareId
    }
});
```

### Webhook Processing
1. **Registration Completed**: Memberstack sends webhook
2. **ShareID Extraction**: API extracts ShareID from metadata
3. **World Lookup**: Finds original world from ShareID
4. **LMID Assignment**: Assigns new LMID in same world
5. **Database Update**: Creates new record for parent

## Error Handling

### Network Errors
- **Retry Logic**: Automatic retry for failed requests
- **Fallback Messages**: User-friendly error messages
- **Recovery Options**: Refresh button and troubleshooting

### Invalid ShareID
- **Validation**: Checks ShareID format and existence
- **Error Messages**: Clear explanation of the issue
- **Redirection**: Guidance for users with invalid links

### Audio Playback Issues
- **Format Support**: Multiple audio format fallbacks
- **Loading States**: Progress indicators during loading
- **Error Recovery**: Retry mechanisms for failed playback

## Performance Optimizations

### Lazy Loading
- **Audio Content**: Load audio only when needed
- **Progressive Enhancement**: Core functionality first
- **Efficient Requests**: Minimize API calls

### Caching Strategy
- **Local Storage**: Cache non-sensitive data
- **Browser Cache**: Leverage browser caching
- **CDN Integration**: Fast content delivery

### Mobile Optimization
- **Responsive Design**: Works on all screen sizes
- **Touch Controls**: Optimized for mobile interaction
- **Bandwidth Awareness**: Efficient data usage

## Security Features

### ShareID Validation
- **Format Checking**: Validates ShareID structure
- **Existence Verification**: Confirms ShareID exists in database
- **Access Control**: Prevents unauthorized access

### XSS Protection
- **Input Sanitization**: All user inputs sanitized
- **Content Security**: Safe HTML generation
- **Script Injection**: Prevention of malicious scripts

### Data Protection
- **Secure Communication**: HTTPS for all API calls
- **Metadata Security**: Safe handling of registration data
- **Privacy Compliance**: Follows data protection standards

## Integration Points

### API Endpoints
- **GET /api/get-radio-data**: Fetch program data by ShareID
- **POST /api/combine-audio**: Generate new radio program
- **POST /api/handle-new-member**: Process registrations

### External Services
- **Memberstack**: User authentication and registration
- **Bunny.net CDN**: Audio file delivery
- **Vercel**: Serverless function hosting

### Database Integration
- **Supabase**: ShareID and LMID management
- **Real-time Updates**: Live data synchronization
- **Backup Systems**: Data redundancy

## Configuration

### Environment Variables
```javascript
// API endpoints
const API_BASE = 'https://little-microphones.vercel.app';

// CDN configuration
const CDN_BASE = 'https://little-microphones.b-cdn.net';
```

### Memberstack Setup
```javascript
// Initialize Memberstack
const memberstack = window.$memberstackDom;

// Configure registration modal
memberstack.openModal('signup', {
    metadata: {
        originating_share_id: shareId
    }
});
```

## Testing

### Unit Tests
- **ShareID Parsing**: Verify URL parameter extraction
- **Data Fetching**: Test API integration
- **Error Handling**: Validate error scenarios

### Integration Tests
- **End-to-End Flow**: Complete user journey testing
- **Registration Process**: Webhook integration testing
- **Audio Playback**: Cross-browser compatibility

### Performance Tests
- **Load Times**: Measure page load performance
- **Audio Streaming**: Test playback efficiency
- **Mobile Performance**: Device-specific testing

## Deployment

### File Structure
```
radio.js (main script)
├── Global state management
├── Initialization functions
├── Data fetching logic
├── Program generation
├── Audio player management
├── Registration system
├── UI components
└── Error handling
```

### Dependencies
- **Memberstack DOM SDK**: User authentication
- **Browser APIs**: Audio, Fetch, Local Storage
- **CSS Framework**: Embedded styles

### Webflow Integration
```html
<!-- Radio page HTML structure -->
<div id="main-container">
    <div id="world-name"></div>
    <div id="program-info"></div>
    <div id="audio-player-container"></div>
    <div id="registration-container"></div>
</div>

<!-- Include radio.js script -->
<script src="radio.js"></script>
```

## Monitoring

### Analytics
- **Usage Tracking**: Monitor program plays
- **Registration Metrics**: Track parent signups
- **Performance Monitoring**: Page load times

### Error Logging
- **Client-side Errors**: JavaScript error tracking
- **API Failures**: Network request monitoring
- **User Experience**: UX issue identification

### Success Metrics
- **Program Completions**: Full playback tracking
- **Registration Conversions**: Signup success rates
- **User Engagement**: Time spent on page

## Future Enhancements

### Advanced Features
- **Playlist Management**: Multiple program support
- **Offline Playback**: Download for offline use
- **Social Features**: Comments and sharing

### Analytics Dashboard
- **Usage Statistics**: Detailed program analytics
- **User Behavior**: Listening patterns
- **Performance Metrics**: System health monitoring

### Mobile App
- **Native App**: Dedicated mobile application
- **Push Notifications**: Program updates
- **Offline Sync**: Local storage management

## Troubleshooting

### Common Issues
1. **ShareID Not Found**: Check URL format and database
2. **Audio Won't Play**: Verify file format and CDN
3. **Registration Fails**: Check Memberstack configuration
4. **Slow Loading**: Optimize network requests

### Debug Tools
- **Console Logging**: Detailed debug information
- **Network Panel**: Monitor API requests
- **Error Tracking**: Comprehensive error reporting

## Support

### Documentation
- **API Reference**: Complete endpoint documentation
- **Integration Guide**: Step-by-step setup
- **Best Practices**: Implementation recommendations

### Community
- **Developer Forum**: Technical discussions
- **Issue Tracker**: Bug reports and features
- **Update Notifications**: Version announcements

**Last Updated:** January 2025  
**Version:** 4.0.0  
**Status:** Production Ready ✅ 