# PRD - Little Microphones 🎙️

**Data:** 6 września 2024  
**Wersja:** 4.2.0  
**Status:** ✅ Aktywna - Funkcjonalność Wszystkich Światów + Audio System

## Project Overview
Little Microphones is a comprehensive web-based audio recording platform that allows users to record responses to themed questions and generate professional radio programs. The system features a revolutionary sharing architecture that enables teachers to create secure, shareable radio program links while maintaining privacy and security. The platform integrates with Webflow CMS for content management, uses Bunny.net CDN for audio storage and delivery, and features advanced FFmpeg audio processing for professional-quality output.

## System Architecture

### Core Components
- **Frontend JavaScript**: lm.js (dashboard), recording.js (recording system), rp.js (teacher panel), radio.js (universal sharing page)
- **Backend APIs**: 7 serverless functions for upload, deletion, listing, audio combination, sharing, and registration
- **Storage**: Dual-layer with IndexedDB local storage and Bunny.net cloud CDN
- **Authentication**: Memberstack integration with metadata-driven authorization and parent registration
- **Audio Processing**: FFmpeg-based professional audio mixing and mastering with intelligent manifest tracking
- **Sharing System**: ShareID-based secure program distribution with parent onboarding

### Technology Stack
- **Client-Side**: Vanilla JavaScript, WebRTC, IndexedDB, Canvas API, HTML5 Audio
- **Server-Side**: Node.js serverless functions, FFmpeg audio processing, Buffer handling
- **Storage**: Bunny.net CDN with organized folder structure and cache-busting
- **Authentication**: Memberstack with metadata-driven LMID authorization
- **Deployment**: Vercel with GitHub integration and automatic deployment
- **Automation**: Make.com webhooks for user management and LMID lifecycle

## Current System Status ✅

### Core Functionality - WORKING PERFECTLY
- **Advanced Audio Recording**: Multi-format recording with real-time waveform visualization and audio feedback
- **Professional Cloud Storage**: Automatic upload to Bunny.net CDN with intelligent cache-busting and error recovery
- **Comprehensive Database Management**: IndexedDB for local storage with upload status tracking and cross-device sync
- **Professional Radio Program Generation**: Advanced FFmpeg processing with noise reduction, normalization, and background music mixing
- **Real-time Progress Tracking**: Dynamic progress bar with detailed status messages and creative feedback
- **Universal Cross-Platform Compatibility**: Optimized for desktop and mobile browsers with responsive design
- **Revolutionary Sharing System**: ShareID-based secure program distribution with intelligent generation and parent onboarding

### Recent Fixes & Improvements (January 2025)

#### Major Architecture Update: Radio Program Sharing System
- **ShareID Implementation**: Secure, obfuscated identifiers replace world/lmid in URLs
- **Universal Radio Page**: Single page handles all radio program playback and sharing
- **Intelligent Generation**: Programs only regenerate when new recordings are detected
- **Parent Registration**: Seamless parent onboarding with automatic LMID assignment
- **Manifest Tracking**: last-program-manifest.json tracks used files for smart generation
- **Webhook Integration**: Memberstack webhooks handle parent registration flow

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
3. **rp.js** - Teacher panel with share link generation
4. **radio.js** - Universal radio page with intelligent generation and parent registration

### Backend Services
1. **api/combine-audio.js** - FFmpeg-based audio processing with manifest creation
2. **api/upload-audio.js** - Bunny.net upload handling
3. **api/delete-audio.js** - Audio file cleanup
4. **api/get-share-link.js** - ShareID generation and management
5. **api/get-radio-data.js** - Radio program data fetching by ShareID
6. **api/handle-new-member.js** - Parent registration webhook handler
7. **api/list-recordings.js** - Enhanced recording listing with full support

### Storage Systems
- **IndexedDB**: Local recording storage and metadata
- **Bunny.net CDN**: Cloud audio file storage and delivery
- **Supabase**: ShareID management and LMID assignment
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
- **Manifest Creation**: Automatic last-program-manifest.json generation

### Sharing System
- **ShareID Generation**: Secure, obfuscated program identifiers
- **Universal Radio Page**: Single page handles all program playback
- **Intelligent Generation**: Only regenerates when recordings change
- **Parent Registration**: Seamless signup with automatic LMID assignment
- **Secure Distribution**: No world/lmid exposure in URLs

### Audio Player
- **Multiple Sources**: MP3 format with fallback support
- **CORS Headers**: Proper cross-origin resource sharing
- **Responsive Design**: Works across all device sizes
- **Error Recovery**: Graceful handling of playback issues
- **Professional Controls**: Download, share, and regenerate options

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
- [x] ShareID generation and validation
- [x] Universal radio page functionality
- [x] Intelligent program generation
- [x] Parent registration flow
- [x] Webhook integration
- [x] Manifest tracking system

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
6. **Email Notifications**: Automated parent welcome emails
7. **Admin Dashboard**: Registration and usage analytics
8. **Mobile App**: Dedicated mobile application

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
- [Radio.js Documentation](./radio.js.md)
- [Memberstack Webhook Setup](./memberstack-webhook-setup.md)

---

**Last Updated**: January 24, 2025  
**Version**: 4.0.0  
**Status**: Production Ready ✅  

**Documentation Status**: ✅ Comprehensive and Up-to-Date  
**Code Comments**: ✅ Enhanced with detailed system architecture information  
**API Documentation**: ✅ Complete with security and integration details  
**Deployment Guide**: ✅ Updated with latest infrastructure configuration  

**System Health**: All components functioning optimally  
**Performance**: Audio processing ~30-60 seconds, 44.1kHz stereo output  
**Security**: Multi-layer authorization with Memberstack + metadata validation  
**Scalability**: Serverless architecture with global CDN distribution 

## 🚨 KRYTYCZNE NAPRAWY

### Styczeń 2025: Naprawa Synchronizacji LMID z Memberstack

**Problem:**
- System dodawał LMID do Supabase, ale nie aktualizował metadanych w Memberstack
- API Memberstack wymaga `metaData` (camelCase), nie `metadata` (lowercase)  
- Wszystkie aktualizacje metadanych były ciche failures

**Naprawy:**
- ✅ Zmieniono `metadata` na `metaData` w `utils/lmid-utils.js`
- ✅ Zmieniono `metadata` na `metaData` w `api/test-memberstack.js`
- ✅ Przetestowano - API działa poprawnie z `metaData`
- ✅ Wszystkie endpointy synchronizują metadane z Memberstack

**Pliki Zmienione:**
- `utils/lmid-utils.js` - funkcja `updateMemberstackMetadata()`
- `api/test-memberstack.js` - endpoint testowy  
- `api/memberstack-webhook.js` - webhook dla educatorów
- `api/handle-new-member.js` - webhook dla rodziców

**Rezultat:**
- LMID są teraz poprawnie synchronizowane między Supabase i Memberstack
- Metadane są aktualizowane w czasie rzeczywistym
- System działa zgodnie z oczekiwaniami

--- 