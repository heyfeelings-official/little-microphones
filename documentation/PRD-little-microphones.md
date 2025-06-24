# Little Microphones - Product Requirements Document (PRD)

## Project Overview
Little Microphones is a web-based audio recording platform that allows users to record responses to questions and generate combined radio programs. The system integrates with Webflow CMS for content management and uses Bunny.net CDN for audio storage and delivery.

## Current System Status ✅

### Core Functionality - WORKING
- **Audio Recording**: Multi-format recording with real-time waveform visualization
- **Cloud Storage**: Automatic upload to Bunny.net CDN with cache-busting
- **Database Management**: IndexedDB for local storage with upload status tracking
- **Radio Program Generation**: Professional audio processing with FFmpeg
- **Progress Tracking**: Immediate processing start with entertaining status messages
- **Cross-Platform Compatibility**: Works on desktop and mobile browsers

### Recent Major Updates (v3.1.0 - June 2025)

#### Simplified Question Ordering System
- **Unified Numeric Ordering**: Direct use of CMS "Little Microphones Order" field
- **Eliminated QID Complexity**: No more QID normalization (QID1, QID2, etc.)
- **Simple Numeric IDs**: Questions now use direct numbers (1, 2, 3, 4, 5, 6)
- **Reliable Sorting**: Numeric sort ensures perfect question order

#### Immediate Radio Program Generation
- **No Fake Delays**: Removed time-wasting fake progress at beginning
- **Instant Start**: Audio processing begins immediately after collecting recordings
- **Fun Status Messages**: Entertaining messages during actual FFmpeg work
  - "Teaching monkeys to sing"
  - "Sprinkling audio fairy dust"
  - "Consulting with audio wizards"
  - "Adding sparkles and unicorns"
- **Streamlined Progress**: Collect (5%) → Process (15%) → Complete (95-100%)

#### Console Logging Cleanup
- **135+ Lines Removed**: Eliminated verbose and redundant logging
- **Essential Info Only**: Clean debugging output showing only important details
- **Performance Improved**: Faster execution with reduced logging overhead
- **Better Debugging**: More focused and useful debugging information

#### Technical Fixes
- **Fixed Audio File URLs**: Correct QID format for static files (spookyland-QID1.mp3)
- **Eliminated Duplicates**: Fixed duplicate question loading issues
- **Proper Cleanup**: Better interval and status message cleanup
- **Cache-Busting**: Timestamp-based file versioning prevents old audio usage

### Previous Updates (January 2025)

#### Audio Processing Overhaul
- **Default Audio Parameters**: Reset to less aggressive, more natural settings
  - Light noise reduction (5dB) instead of aggressive (20dB)
  - Moderate volume boost (1.2x) instead of high boost (2.5x)
  - Wider frequency range for better audio quality
  - Balanced background music at 25% volume

#### User Experience Improvements
- **Modal Close Button**: Fixed non-functional close button with proper event listeners
- **Simplified UI**: Removed download, regenerate, and "open in new tab" buttons
- **Question Ordering**: Implemented numeric ordering for natural flow
- **Answer Chronology**: First recorded answers play first

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
- **Webflow CMS**: Question content and world configuration with numeric ordering

## Audio Processing Pipeline

### Input Sources
- User recordings (various formats: webm, mp4, wav)
- Question prompts (MP3 files from CDN - QID format)
- Background music (monkeys.mp3)
- Intro/outro audio files

### Processing Steps
1. **Audio Collection**: Immediate gathering of recordings from IndexedDB
2. **Numeric Ordering**: Sort questions by CMS "Little Microphones Order" field
3. **Segment Assembly**: Combine intro → questions → answers → background → outro
4. **Quality Processing**: Apply noise reduction and normalization during FFmpeg
5. **Upload & Delivery**: Upload to CDN with cache-busting

### Question File Naming Convention
```
Static Files (on CDN):
audio/spookyland/spookyland-QID1.mp3  // Question 1
audio/spookyland/spookyland-QID2.mp3  // Question 2
audio/spookyland/spookyland-QID3.mp3  // Question 3
...

User Recordings:
/{lmid}/{world}/kids-world_{world}-lmid_{lmid}-question_{number}-tm_{timestamp}.mp3
```

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
- **Recording Limits**: Configurable per-question limits (30 max per question)
- **Upload Status**: Real-time upload progress and status
- **Error Handling**: Comprehensive error messages and recovery

### Radio Program Generation
- **Numeric Ordering**: Simple 1-2-3-4-5-6 question order from CMS
- **Immediate Start**: No delays, processing begins instantly
- **Answer Chronology**: First recorded answers play first
- **Background Music**: Automatically mixed with exact duration matching
- **Fun Progress**: Entertaining status messages during actual processing
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
- [x] Numeric question ordering accuracy
- [x] Cache-busting effectiveness
- [x] Immediate processing start
- [x] Fun status message system

### Performance Metrics
- **Recording Quality**: 44.1kHz, stereo, variable bitrate
- **Upload Speed**: Optimized for Bunny.net CDN
- **Processing Time**: ~30-60 seconds for typical radio programs
- **Generation Speed**: Immediate start, no fake delays
- **File Sizes**: Compressed MP3 output for efficient delivery
- **Cache Performance**: Timestamp-based versioning prevents stale content

## Future Considerations

### Potential Enhancements
1. **Audio Editing**: Basic trim/edit functionality
2. **Multiple Formats**: Support for additional audio formats
3. **Batch Processing**: Multiple radio program generation
4. **Analytics**: Usage tracking and performance metrics
5. **Accessibility**: Enhanced screen reader support
6. **Real-time Collaboration**: Multi-user recording sessions

### Scalability Notes
- Current system handles moderate concurrent users
- Bunny.net CDN provides global distribution
- Serverless architecture scales with demand
- IndexedDB provides offline capability
- Clean logging reduces server load

## Documentation References
- [API Documentation](./api-documentation.md)
- [Deployment Guide](./deployment.md)
- [Recording.js Documentation](./recording.js.md)
- [Radio Player Documentation](./rp.js.md)
- [LM.js Documentation](./lm.js.md)

---

**Last Updated**: June 24, 2025
**Version**: 3.1.0
**Status**: Production Ready ✅ 