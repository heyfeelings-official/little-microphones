# recording.js - Audio Recording System

## 📋 Overview

**File**: `recording.js`  
**Purpose**: Comprehensive audio recording system with multi-question support, local storage, cloud backup, and radio program generation  
**Dependencies**: MediaRecorder API, IndexedDB, Bunny.net Storage API  
**Documentation**: `/documentation/recording.js.md`

## 🎯 Core Functionality

### 1. Multi-Question Audio Recording
- Independent recorder instances per question
- MediaRecorder API for browser-based audio capture
- Format conversion from WebM (recording) to MP3 (storage)

### 2. Local Data Management
- IndexedDB for persistent local storage
- Recording metadata and blob storage
- Offline-first approach with cloud synchronization
- Automatic cleanup of orphaned recordings

### 3. Cloud Backup System
- Automatic upload to Bunny.net CDN
- Upload progress tracking and retry mechanisms
- Dual-source audio playback (local + cloud)
- File verification and integrity checking

### 4. Radio Program Generation
- Collects recordings across multiple questions
- Integrates with combine-audio API for processing
- Progress tracking with modal feedback
- Automatic file organization and naming

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Layer      │    │  Recording      │    │  Storage        │
│                 │    │  Engine         │    │  Layer          │
│ • Record Button │◄──►│ • MediaRecorder │◄──►│ • IndexedDB     │
│ • Timer Display │    │ • Audio Stream  │    │ • Bunny.net     │
│ • Player List   │    │ • Blob Creation │    │ • URL.createObj │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

```
User Action → Recording Start → Audio Capture → Local Storage → 
Cloud Upload → UI Update → Playback Ready
```

## 🎵 Recording Process

### 1. Initialization Sequence
```javascript
initializeRecordersForWorld(world) →
  Discovery of question elements →
    Individual recorder setup →
      Event listener attachment →
        Previous recordings load
```

### 2. Recording Lifecycle
```
Button Click →
  Permission Request →
    MediaRecorder Start →
      Timer Display →
        User Stops →
          Audio Processing →
            Local Storage →
              Cloud Upload →
                UI Update
```

### 3. Audio Processing Pipeline
```
MediaRecorder (WebM) →
  Blob Creation →
    IndexedDB Storage →
      Background Upload →
        MP3 Conversion →
          Bunny.net Storage →
            URL Generation
```

## 🗄️ Data Storage

### IndexedDB Schema
```javascript
Database: "kidsAudioDB"
Store: "audioRecordings"
Structure: {
  id: "unique_recording_id",
  questionId: "QID9", // Normalized format
  world: "spookyland",
  lmid: "32",
  timestamp: 1234567890123,
  audio: Blob, // WebM audio data
  uploadStatus: "pending|uploading|uploaded|failed",
  uploadProgress: 0-100,
  cloudUrl: "https://little-microphones.b-cdn.net/...",
  retryCount: 0
}
```

### Cloud Storage Structure
```
Bunny.net CDN:
/{lmid}/{world}/kids-world_{world}-lmid_{lmid}-question_{number}-tm_{timestamp}.mp3

Example:
/32/spookyland/kids-world_spookyland-lmid_32-question_9-tm_1750763211231.mp3
```

## 🎨 User Interface

### Recording Components
- **Record Button**: Primary recording trigger with visual states
- **Timer Display**: Recording duration counter
- **Status Indicators**: Recording, processing, and upload states

### Recording List
- **Audio Players**: HTML5 audio controls for playback
- **Upload Status**: Cloud backup status with icons
- **Timestamps**: Formatted date/time display
- **Delete Controls**: Individual recording removal

### Visual Feedback
```css
States:
• recording → Pulsing red animation
• processing → Background animation  
• uploaded → Cloud icon
• failed → Warning icon
```

## 🔄 Radio Program Generation

### Collection Process
```javascript
collectRecordingsForRadioProgram(world, lmid) →
  Question ID Discovery →
    Recording Retrieval →
      Data Formatting →
        API Payload Creation
```

### Audio Sequence Planning
```
Radio Program Structure:
intro.mp3 →
  question1.mp3 → [all user recordings for Q1] → monkeys.mp3 →
  question2.mp3 → [all user recordings for Q2] → monkeys.mp3 →
  ... →
outro.mp3
```

### Generation Workflow
```
Button Click →
  Recording Validation →
    Progress Modal Display →
      API Call to combine-audio →
        FFmpeg Processing →
          Success Modal →
            Download Link
```

## 🔧 Technical Implementation

### Question ID Normalization
```javascript
normalizeQuestionId(questionId) {
  // Converts various formats to QID standard:
  // "Q-ID 9" → "QID9"
  // "9" → "QID9"  
  // "question-9" → "QID9"
}
```

### Audio Source Selection
```javascript
Priority Order:
1. Cloud URL (if verified accessible)
2. Local blob (if available)
3. No audio message (if neither available)
```

### Upload Retry Logic
```javascript
Upload Process:
1. Convert WebM to MP3 using MediaRecorder
2. Generate unique filename with timestamp
3. Attempt upload to Bunny.net
4. Retry on failure (with exponential backoff)
5. Update UI status throughout process
```

## 🛡️ Security & Limits

### Recording Constraints
- **Max recordings per question**: 30
- **Recording duration**: Unlimited per session
- **File size**: Browser memory dependent
- **Concurrent recordings**: 1 per question

### Data Protection
- Local-first storage approach
- Secure cloud upload with API keys
- User-specific file isolation
- Automatic cleanup of failed uploads

### Error Handling
- Microphone permission failures
- Network connectivity issues
- Storage quota exceeded
- Upload timeout scenarios

## 🧹 Cleanup & Maintenance

### Orphaned Recording Cleanup
```javascript
cleanupOrphanedRecordings(questionId, world, lmid) →
  Cloud file verification →
    Local database comparison →
      Orphaned file removal →
        Database update
```

### Automatic Maintenance
- Regular cleanup scheduling
- Failed upload retry attempts
- Storage quota monitoring
- Performance optimization

## 📊 Performance Optimization

### Memory Management
- Lazy loading of recordings
- Efficient blob handling
- Garbage collection for audio objects

### Network Optimization
- Background upload processing
- Progressive upload retry
- CDN-based content delivery
- Compressed audio formats

### Storage Optimization
- IndexedDB transaction efficiency
- Selective data loading
- Cleanup of unused blobs
- Storage quota awareness

## 🧪 Testing & Debugging

### Testing Scenarios
1. **Recording Functionality**
   - Multiple simultaneous questions
   - Long-duration recordings
   - Permission denial handling
   - Network interruption recovery

2. **Storage Operations**
   - Large recording collections
   - Upload failure scenarios
   - Database corruption recovery
   - Storage quota limits

3. **Radio Program Generation**
   - Various recording combinations
   - Missing recording handling
   - API timeout scenarios
   - File format compatibility

### Debugging Tools
- Comprehensive console logging
- Upload progress tracking
- Error state visualization
- Network request monitoring

## 🔗 API Integration

### Upload API (`/api/upload-audio`)
```javascript
Payload: {
  audioData: base64_encoded_mp3,
  filename: "kids-world_spookyland-lmid_32-question_9-tm_1750763211231.mp3",
  world: "spookyland",
  lmid: "32", 
  questionId: "QID9"
}
```

### Combine API (`/api/combine-audio`)
```javascript
Payload: {
  world: "spookyland",
  lmid: "32",
  recordings: [
    {
      questionId: "QID9",
      timestamp: 1750763211231,
      cloudUrl: "https://..."
    }
  ]
}
```

## 🚀 Future Enhancements

### Short Term
- Real-time collaboration features
- Enhanced audio effects
- Mobile responsiveness improvements
- Offline mode enhancements

### Long Term
- AI-powered content suggestions
- Advanced audio editing
- Social sharing capabilities
- Multi-language support

---

## 🔗 Related Files
- **Main Dashboard**: `lm.js` - Authentication and LMID management
- **Page Authorization**: `rp.js` - Recording page access control
- **Upload API**: `api/upload-audio.js` - Cloud storage upload
- **Combine API**: `api/combine-audio.js` - Radio program generation
- **Delete API**: `api/delete-audio.js` - File cleanup operations 