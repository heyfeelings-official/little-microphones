# Little Microphones - Product Requirements Document (PRD)

## Project Overview
Little Microphones is a web-based audio recording platform that allows users to record responses to questions and generate combined radio programs. The system integrates with Webflow CMS for content management and uses Bunny.net CDN for audio storage and delivery.

## Current System Status ✅

### Core Functionality - WORKING
- **Audio Recording**: Multi-format recording with real-time waveform visualization
- **Cloud Storage**: Automatic upload to Bunny.net CDN with cache-busting
- **Database Management**: IndexedDB for local storage with upload status tracking
- **Radio Program Generation**: Professional audio processing with FFmpeg
- **Progress Tracking**: Dynamic progress bar with detailed status messages
- **Cross-Platform Compatibility**: Works on desktop and mobile browsers

### Recent Fixes & Improvements (January 2025)

#### Audio Processing Overhaul
- **Default Audio Parameters**: Reset to less aggressive, more natural settings
  - Light noise reduction (5dB) instead of aggressive (20dB)
  - Moderate volume boost (1.2x) instead of high boost (2.5x)
  - Wider frequency range for better audio quality
  - Balanced background music at 25% volume

#### User Experience Improvements
- **Enhanced Progress Feedback**: Added fake progress messages for better UX
  - "Gathering the questions..."
  - "Looking for answers..."
  - "Found X answers"
  - "Combining answers for Question X"
  - "Adding background sound"
  - "Putting things together"
  - "Sprinkling some fun"
  - "Fun added"
  - "Hmm let's add even more fun"
  - Additional creative status messages

#### Technical Fixes
- **Modal Close Button**: Fixed non-functional close button with proper event listeners
- **Simplified UI**: Removed download, regenerate, and "open in new tab" buttons
- **Question Ordering**: Implemented DOM-based ordering instead of alphabetical
  - Questions now play in the order they appear on the page
  - Answers play in chronological order (first recorded = first played)
- **Cache-Busting**: Timestamp-based file versioning prevents old audio usage

## Technical Architecture

### Frontend Components
1. **recording.js** - Main recording interface and radio program generation
2. **lm.js** - Webflow integration and initialization
3. **rp.js** - Radio program player and controls

### Backend Services
1. **api/combine-audio.js** - FFmpeg-based audio processing
2. **api/upload-audio.js** - Bunny.net upload handling
3. **api/delete-audio.js** - Audio file cleanup

### Storage Systems
- **IndexedDB**: Local recording storage and metadata
- **Bunny.net CDN**: Cloud audio file storage and delivery
- **Webflow CMS**: Question content and world configuration

## Audio Processing Pipeline

### Input Sources
- User recordings (various formats: webm, mp4, wav)
- Question prompts (MP3 files from CDN)
- Background music (monkeys.mp3)
- Intro/outro audio files

### Processing Steps
1. **Audio Collection**: Gather recordings from IndexedDB
2. **Quality Processing**: Apply noise reduction and normalization
3. **Segment Assembly**: Combine intro → questions → answers → background → outro
4. **Final Mastering**: Apply master EQ and compression
5. **Upload & Delivery**: Upload to CDN with cache-busting

### Audio Parameters (Current Settings)
```javascript
userRecordings: {
    noiseReduction: 5,         // Light noise reduction
    volumeBoost: 1.2,          // Slight volume boost
    highpass: 60,              // Light low-frequency filter
    lowpass: 12000,            // Light high-frequency filter
    dynamicNormalization: 0.7  // Moderate normalization
},
backgroundMusic: {
    volume: 0.25,              // Background volume
    highpass: 80,              // EQ for background
    lowpass: 8000,             // Reduce high frequencies
},
master: {
    volume: 1.0,               // Normal overall volume
    highpass: 40,              // Remove very low frequencies
    lowpass: 15000,            // Keep most frequencies
    dynamicNormalization: 0.7  // Light final normalization
}
```

## Current Features

### Recording Interface
- **Real-time Waveform**: Visual feedback during recording
- **Format Detection**: Automatic best format selection per browser
- **Recording Limits**: Configurable per-question limits
- **Upload Status**: Real-time upload progress and status
- **Error Handling**: Comprehensive error messages and recovery

### Radio Program Generation
- **Question Ordering**: DOM-based ordering for natural flow
- **Answer Chronology**: First recorded answers play first
- **Background Music**: Automatically mixed with exact duration matching
- **Progress Tracking**: Detailed progress with creative status messages
- **Cache Prevention**: Timestamp-based versioning prevents old audio

### Audio Player
- **Multiple Sources**: MP3 format with fallback support
- **CORS Headers**: Proper cross-origin resource sharing
- **Responsive Design**: Works across all device sizes
- **Error Recovery**: Graceful handling of playback issues

## Quality Assurance

### Testing Checklist
- [x] Recording functionality across browsers
- [x] Upload to Bunny.net CDN
- [x] IndexedDB storage and retrieval
- [x] Radio program generation
- [x] Audio quality and mixing
- [x] Progress tracking and user feedback
- [x] Modal close functionality
- [x] Question ordering accuracy
- [x] Cache-busting effectiveness

### Performance Metrics
- **Recording Quality**: 44.1kHz, stereo, variable bitrate
- **Upload Speed**: Optimized for Bunny.net CDN
- **Processing Time**: ~30-60 seconds for typical radio programs
- **File Sizes**: Compressed MP3 output for efficient delivery
- **Cache Performance**: Timestamp-based versioning prevents stale content

## Future Considerations

### Potential Enhancements
1. **Audio Editing**: Basic trim/edit functionality
2. **Multiple Formats**: Support for additional audio formats
3. **Batch Processing**: Multiple radio program generation
4. **Analytics**: Usage tracking and performance metrics
5. **Accessibility**: Enhanced screen reader support

### Scalability Notes
- Current system handles moderate concurrent users
- Bunny.net CDN provides global distribution
- Serverless architecture scales with demand
- IndexedDB provides offline capability

## Documentation References
- [API Documentation](./api-documentation.md)
- [Deployment Guide](./deployment.md)
- [Recording.js Documentation](./recording.js.md)
- [Radio Player Documentation](./rp.js.md)
- [LM.js Documentation](./lm.js.md)

---

**Last Updated**: January 24, 2025
**Version**: 2.4.0
**Status**: Production Ready ✅ 