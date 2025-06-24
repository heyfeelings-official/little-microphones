# API Documentation - Serverless Functions

## 📋 Overview

**Purpose**: Serverless API endpoints for audio file management and radio program generation  
**Platform**: Vercel serverless functions  
**Runtime**: Node.js 18+  
**Documentation**: `/documentation/api-documentation.md`  
**Version**: 3.1.0

## 🏗️ Architecture

### Serverless Function Structure
```
/api/
├── upload-audio.js    - Audio file upload to cloud storage
├── delete-audio.js    - Audio file deletion and cleanup  
└── combine-audio.js   - Radio program generation with FFmpeg
```

### Shared Dependencies
- **Bunny.net Storage API**: Cloud file management
- **Environment Variables**: API keys and configuration
- **Error Handling**: Consistent response formats
- **CORS Support**: Cross-origin request handling

---

## 🔗 `/api/upload-audio` - Audio Upload Service

### Purpose
Handles audio file uploads from browser recordings to Bunny.net CDN with format conversion and metadata processing.

### Method & Route
- **Method**: `POST`
- **Route**: `/api/upload-audio`
- **Timeout**: 10 seconds (default)

### Request Format
```javascript
Content-Type: application/json

{
  "audioData": "base64_encoded_mp3_data",
  "filename": "kids-world_spookyland-lmid_32-question_1-tm_1750763211231.mp3",
  "world": "spookyland",
  "lmid": "32", 
  "questionId": "1"  // Simple numeric format (1, 2, 3, 4, 5, 6)
}
```

### Response Format
```javascript
Success (200):
{
  "success": true,
  "url": "https://little-microphones.b-cdn.net/32/spookyland/kids-world_spookyland-lmid_32-question_1-tm_1750763211231.mp3",
  "filename": "kids-world_spookyland-lmid_32-question_1-tm_1750763211231.mp3"
}

Error (400/500):
{
  "success": false,
  "error": "Error message description"
}
```

### File Naming Convention
```
Pattern: kids-world_{world}-lmid_{lmid}-question_{questionNumber}-tm_{timestamp}.mp3
Example: kids-world_spookyland-lmid_32-question_1-tm_1750763211231.mp3
```

### Storage Structure
```
Bunny.net CDN:
/{lmid}/{world}/{filename}.mp3

Example:
/32/spookyland/kids-world_spookyland-lmid_32-question_1-tm_1750763211231.mp3
```

### Processing Pipeline
```
Base64 Audio → Buffer Conversion → Filename Generation → 
Bunny.net Upload → URL Generation → Response
```

### Error Handling
- **Missing parameters**: 400 - Invalid request format
- **Invalid audio data**: 400 - Audio processing failed
- **Upload failure**: 500 - Cloud storage error
- **Authentication**: 500 - Missing environment variables

---

## 🗑️ `/api/delete-audio` - Audio Deletion Service

### Purpose
Handles deletion of individual audio files or entire LMID folders from Bunny.net storage with comprehensive cleanup.

### Method & Route
- **Method**: `DELETE`
- **Route**: `/api/delete-audio`
- **Timeout**: 30 seconds

### Request Formats

#### Single File Deletion
```javascript
Content-Type: application/json

{
  "filename": "kids-world_spookyland-lmid_32-question_1-tm_1750763211231.mp3",
  "world": "spookyland",
  "lmid": "32",
  "questionId": "1"  // Simple numeric format
}
```

#### LMID Folder Deletion
```javascript
Content-Type: application/json

{
  "deleteLmidFolder": true,
  "lmid": "32"
}
```

### Response Format
```javascript
Success (200):
{
  "success": true,
  "message": "File deleted successfully",
  "deletedFile": "filename.mp3" // Single file deletion
}

// OR for folder deletion:
{
  "success": true,
  "message": "LMID folder deleted successfully",
  "deletedFiles": ["file1.mp3", "file2.mp3"],
  "totalDeleted": 15
}

Error (400/500):
{
  "success": false,
  "error": "Error message description"
}
```

### Deletion Strategies

#### Single File Deletion
```
Validation → File Path Construction → Bunny.net DELETE Request → Response
```

#### Folder Deletion (LMID)
```
LMID Validation → Folder Listing → Batch File Deletion → 
Progress Tracking → Response Summary
```

### File Discovery Process
```javascript
// List all files in LMID folder
GET /storage-zone/{lmid}/

// Filter relevant files
Pattern Matching → File Validation → Deletion Queue
```

### Error Scenarios
- **File not found**: 404 - File doesn't exist in storage
- **Permission denied**: 403 - Bunny.net authentication failed
- **Network timeout**: 500 - Request timeout exceeded
- **Partial deletion**: 207 - Some files deleted, others failed

---

## 🎵 `/api/combine-audio` - Radio Program Generation

### Purpose
Combines multiple audio recordings with background music and prompts into a single radio program using FFmpeg processing with immediate start.

### Method & Route
- **Method**: `POST`
- **Route**: `/api/combine-audio`
- **Timeout**: 60 seconds (extended for audio processing)

### Request Format (v3.1.0 - New Structure)
```javascript
Content-Type: application/json

{
  "world": "spookyland",
  "lmid": "32",
  "audioSegments": [
    {
      "type": "single",
      "url": "https://little-microphones.b-cdn.net/audio/other/intro.mp3"
    },
    {
      "type": "single",
      "url": "https://little-microphones.b-cdn.net/audio/spookyland/spookyland-QID1.mp3"
    },
    {
      "type": "combine_with_background",
      "answerUrls": [
        "https://little-microphones.b-cdn.net/32/spookyland/kids-world_spookyland-lmid_32-question_1-tm_1750777259513.mp3"
      ],
      "backgroundUrl": "https://little-microphones.b-cdn.net/audio/other/monkeys.mp3",
      "questionId": "1"
    },
    {
      "type": "single",
      "url": "https://little-microphones.b-cdn.net/audio/spookyland/spookyland-QID2.mp3"
    },
    {
      "type": "combine_with_background",
      "answerUrls": [
        "https://little-microphones.b-cdn.net/32/spookyland/kids-world_spookyland-lmid_32-question_2-tm_1750777266413.mp3"
      ],
      "backgroundUrl": "https://little-microphones.b-cdn.net/audio/other/monkeys.mp3",
      "questionId": "2"
    },
    {
      "type": "single",
      "url": "https://little-microphones.b-cdn.net/audio/other/outro.mp3"
    }
  ]
}
```

### Response Format
```javascript
Success (200):
{
  "success": true,
  "message": "Radio program generated successfully",
  "url": "https://little-microphones.b-cdn.net/32/spookyland/radio-program-spookyland-32-v1750777327.mp3",
  "totalSegments": 6,
  "audioParams": {
    // Audio processing parameters used
  }
}

Error (400/500):
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Audio Processing Pipeline

#### 1. Immediate Processing Start
```javascript
// v3.1.0: No fake delays, immediate start
Request Received →
  Audio Segments Validation →
    FFmpeg Processing Start →
      Download Files →
        Combine Audio →
          Upload Result
```

#### 2. File URL Generation (Updated)
```javascript
// Question prompts (static files with QID format)
https://little-microphones.b-cdn.net/audio/{world}/{world}-QID{number}.mp3

// User recordings (numeric format)
https://little-microphones.b-cdn.net/{lmid}/{world}/kids-world_{world}-lmid_{lmid}-question_{number}-tm_{timestamp}.mp3

// Static files
https://little-microphones.b-cdn.net/audio/other/{intro|outro|monkeys}.mp3
```

#### 3. FFmpeg Processing
```javascript
Segment Processing → Format Conversion → Audio Concatenation → 
Quality Normalization → Final Upload → URL Response
```

### Audio Segment Types

#### Single Audio File
```javascript
{
  "type": "single",
  "url": "https://little-microphones.b-cdn.net/audio/spookyland/spookyland-QID1.mp3"
}
```

#### Combined Answers with Background
```javascript
{
  "type": "combine_with_background",
  "answerUrls": [
    "https://little-microphones.b-cdn.net/32/spookyland/recording1.mp3",
    "https://little-microphones.b-cdn.net/32/spookyland/recording2.mp3"
  ],
  "backgroundUrl": "https://little-microphones.b-cdn.net/audio/other/monkeys.mp3",
  "questionId": "1"
}
```

### FFmpeg Configuration
```javascript
Processing Settings:
- Format: MP3
- Bitrate: 128kbps  
- Sample Rate: 44.1kHz
- Channels: Stereo
- Codec: libmp3lame
- Zero-padded filenames for proper ordering
```

### Static Audio Files
```javascript
STATIC_FILES = {
  intro: 'https://little-microphones.b-cdn.net/audio/other/intro.mp3',
  outro: 'https://little-microphones.b-cdn.net/audio/other/outro.mp3', 
  monkeys: 'https://little-microphones.b-cdn.net/audio/other/monkeys.mp3'
}
```

### Question ID System (v3.1.0 - Simplified)
```javascript
// No more QID normalization needed
// Direct numeric format from CMS "Little Microphones Order" field
questionId: "1"  // Question 1
questionId: "2"  // Question 2
questionId: "3"  // Question 3

// Static file naming still uses QID for compatibility:
spookyland-QID1.mp3  // Question 1 prompt
spookyland-QID2.mp3  // Question 2 prompt
```

### Error Recovery
- **FFmpeg not available**: Fallback with setup suggestions
- **File download failures**: Individual file error handling
- **Processing timeout**: Partial processing with status report
- **Upload failures**: Local file preservation with retry options

---

## 🔧 Environment Configuration

### Required Environment Variables
```bash
# Bunny.net Storage Configuration
BUNNY_API_KEY=your_storage_api_key
BUNNY_STORAGE_ZONE=your_storage_zone_name  
BUNNY_CDN_URL=https://your-zone.b-cdn.net

# Optional: Additional configuration
NODE_ENV=production
```

### Vercel Configuration
```json
// vercel.json
{
  "functions": {
    "api/combine-audio.js": {
      "maxDuration": 60
    },
    "api/delete-audio.js": {
      "maxDuration": 30  
    },
    "api/upload-audio.js": {
      "maxDuration": 10
    }
  }
}
```

## 🛡️ Security & Rate Limiting

### API Security
- **CORS enabled**: Cross-origin request support
- **Environment variable protection**: API keys secured in Vercel
- **Input validation**: Request parameter validation
- **Error sanitization**: Safe error message exposure

### Rate Limiting Considerations
- **Vercel function limits**: Based on plan limitations
- **Bunny.net API limits**: Storage operation throttling
- **FFmpeg processing**: Memory and CPU constraints
- **Concurrent request handling**: Serverless scaling

## 📊 Performance Optimization

### Upload Performance
- **Streaming uploads**: Direct buffer to storage
- **Parallel processing**: Non-blocking upload operations
- **Compression**: Efficient audio format handling
- **CDN utilization**: Global content distribution

### Combination Performance (v3.1.0)
- **Immediate start**: No fake delays before processing
- **Clean logging**: Reduced console output for better performance
- **Zero-padded filenames**: Proper file ordering
- **Efficient processing**: Streamlined FFmpeg operations

## 🧪 Testing & Debugging

### Testing Strategies
```javascript
// Unit testing approaches
1. Mock Bunny.net API responses
2. Test file format validation
3. Verify error handling paths
4. Performance benchmark testing

// Integration testing
1. End-to-end upload/download cycles
2. Radio program generation workflows  
3. Error recovery scenarios
4. Timeout handling validation
```

### Debugging Tools (v3.1.0)
- **Clean console logging**: Essential information only
- **Vercel function logs**: Real-time monitoring
- **Error tracking**: Detailed error reporting
- **Performance monitoring**: Response time analysis

## 🚀 Future Enhancements

### Short Term
- **Retry mechanisms**: Automatic upload retry logic
- **Progress streaming**: Real-time operation feedback
- **Batch operations**: Multiple file processing
- **Enhanced error recovery**: Intelligent failure handling

### Long Term
- **Advanced audio processing**: Effects and filters
- **Real-time collaboration**: Multi-user recording sessions
- **AI integration**: Content analysis and suggestions
- **Analytics integration**: Usage tracking and optimization

---

## 🔗 Related Files
- **Upload Integration**: `recording.js` - Client-side upload logic
- **Deletion Integration**: `lm.js` - LMID cleanup operations
- **Generation Integration**: `recording.js` - Radio program creation
- **Configuration**: `vercel.json` - Deployment settings

---

**Last Updated**: June 24, 2025  
**Version**: 3.1.0  
**Status**: Production Ready ✅ 