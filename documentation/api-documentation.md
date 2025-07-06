# API Documentation - Serverless Functions

## 📋 Overview

**Purpose**: Serverless API endpoints for audio file management and radio program generation  
**Platform**: Vercel serverless functions  
**Runtime**: Node.js 18+  
**Documentation**: `/documentation/api-documentation.md`

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
  "filename": "kids-world_spookyland-lmid_32-question_9-tm_1750763211231.mp3",
  "world": "spookyland",
  "lmid": "32", 
  "questionId": "QID9"
}
```

### Response Format
```javascript
Success (200):
{
  "success": true,
  "url": "https://little-microphones.b-cdn.net/32/spookyland/kids-world_spookyland-lmid_32-question_9-tm_1750763211231.mp3",
  "filename": "kids-world_spookyland-lmid_32-question_9-tm_1750763211231.mp3"
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
Example: kids-world_spookyland-lmid_32-question_9-tm_1750763211231.mp3
```

### Storage Structure
```
Bunny.net CDN:
/{lmid}/{world}/{filename}.mp3

Example:
/32/spookyland/kids-world_spookyland-lmid_32-question_9-tm_1750763211231.mp3
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
  "filename": "kids-world_spookyland-lmid_32-question_9-tm_1750763211231.mp3",
  "world": "spookyland",
  "lmid": "32",
  "questionId": "QID9"
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
Combines multiple audio recordings with background music and prompts into a single radio program using FFmpeg processing.

### Method & Route
- **Method**: `POST`
- **Route**: `/api/combine-audio`
- **Timeout**: 60 seconds (extended for audio processing)

### Request Format
```javascript
Content-Type: application/json

{
  "world": "spookyland",
  "lmid": "32",
  "recordings": [
    {
      "questionId": "QID9",
      "timestamp": 1750763211231,
      "cloudUrl": "https://little-microphones.b-cdn.net/32/spookyland/..."
    },
    {
      "questionId": "QID2", 
      "timestamp": 1750763245678,
      "cloudUrl": "https://little-microphones.b-cdn.net/32/spookyland/..."
    }
  ]
}
```

### Response Format
```javascript
Success (200):
{
  "success": true,
  "message": "Audio combination completed successfully",
  "url": "https://little-microphones.b-cdn.net/32/spookyland/radio-program-spookyland-32.mp3",
  "totalSegments": 12
}

Error (400/500):
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "suggestions": {
    // FFmpeg setup recommendations
  }
}
```

### Audio Processing Pipeline

#### 1. Audio Plan Creation
```javascript
createAudioPlan(world, lmid, recordingsByQuestion) →
  intro.mp3 →
    question1.mp3 → [user recordings Q1] → monkeys.mp3 →
    question2.mp3 → [user recordings Q2] → monkeys.mp3 →
    ... →
  outro.mp3
```

#### 2. File URL Generation
```javascript
// Question prompts
https://little-microphones.b-cdn.net/audio/{world}/{world}-{questionId}.mp3

// User recordings  
https://little-microphones.b-cdn.net/{lmid}/{world}/kids-world_{world}-lmid_{lmid}-question_{number}-tm_{timestamp}.mp3

// Static files
https://little-microphones.b-cdn.net/audio/other/{intro|outro|monkeys}.mp3
```

#### 3. FFmpeg Processing
```javascript
File Download → Format Conversion → Audio Concatenation → 
Quality Normalization → Final Upload → URL Response
```

### FFmpeg Configuration
```javascript
Processing Settings:
- Format: MP3
- Bitrate: 128kbps  
- Sample Rate: 44.1kHz
- Channels: Stereo
- Codec: libmp3lame
```

### Static Audio Files
```javascript
STATIC_FILES = {
  intro: 'https://little-microphones.b-cdn.net/audio/other/intro.mp3',
  outro: 'https://little-microphones.b-cdn.net/audio/other/outro.mp3', 
  monkeys: 'https://little-microphones.b-cdn.net/audio/other/monkeys.mp3'
}
```

### Question ID Normalization
```javascript
// Input variations: "Q-ID 9", "9", "question-9"
// Output standard: "QID9"

cleanQuestionId = questionId.toString().trim();
if (!cleanQuestionId.startsWith('QID')) {
  if (/^\d+$/.test(cleanQuestionId)) {
    cleanQuestionId = `QID${cleanQuestionId}`;
  }
}
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

### Combination Performance
- **Temporary file management**: Efficient cleanup
- **Memory optimization**: Streaming audio processing
- **Parallel downloads**: Concurrent file retrieval
- **Caching strategies**: Static file optimization

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

### Debugging Tools
- **Console logging**: Comprehensive operation tracking
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

## API Endpoints

### 1. create-lmid.js
**PURPOSE**: Creates a new LMID for teachers and automatically generates all 6 world-specific ShareIDs

**METHOD**: POST `/api/create-lmid`

**REQUEST BODY**:
```json
{
  "memberId": "mem_123456789",
  "memberEmail": "teacher@school.com"
}
```

**RESPONSE**:
```json
{
  "success": true,
  "lmid": 123,
  "shareIds": {
    "spookyland": "abc12345",
    "waterpark": "def67890",
    "shopping-spree": "ghi13579",
    "amusement-park": "jkl24680",
    "big-city": "mno97531",
    "neighborhood": "pqr86420"
  },
  "message": "LMID created successfully with all world ShareIDs"
}
```

**FEATURES**:
- Finds next available LMID from database
- Generates 6 unique ShareIDs (one per world)
- Validates ShareID uniqueness across all worlds
- Assigns LMID to teacher with all metadata
- Returns complete ShareID mapping

**USED BY**: `lm.js` when teacher clicks "Create a new Program" button

**DATABASE CHANGES**: Updates `lmids` table with:
- `status`: 'used'
- `assigned_to_member_id`: teacher's Memberstack ID
- `assigned_to_member_email`: teacher's email
- `assigned_at`: current timestamp
- `share_id_spookyland`: generated ShareID
- `share_id_waterpark`: generated ShareID
- `share_id_shopping_spree`: generated ShareID
- `share_id_amusement_park`: generated ShareID
- `share_id_big_city`: generated ShareID
- `share_id_neighborhood`: generated ShareID

---

### 2. memberstack-webhook.js
**PURPOSE**: Handles new educator registration webhook from Memberstack and automatically assigns LMID

**METHOD**: POST `/api/memberstack-webhook`

**REQUEST BODY** (Webhook from Memberstack):
```json
{
  "type": "member.created",
  "data": {
    "member": {
      "id": "mem_123456789",
      "auth": {
        "email": "teacher@school.com"
      }
    }
  }
}
```

**RESPONSE**:
```json
{
  "success": true,
  "message": "Educator processed successfully",
  "assignedLmid": 123,
  "shareIds": {
    "spookyland": "abc12345",
    "waterpark": "def67890",
    "shopping-spree": "ghi13579",
    "amusement-park": "jkl24680",
    "big-city": "mno97531",
    "neighborhood": "pqr86420"
  }
}
```

**FEATURES**:
- Verifies Memberstack webhook authenticity
- Finds next available LMID from database
- Generates 6 unique ShareIDs (one per world)
- Assigns LMID to educator with all metadata
- Updates Memberstack metadata with LMID
- Sends alert email if no LMIDs available

**USED BY**: Memberstack webhook on new educator registration

**REPLACES**: "Creating Memberstack Educator" Make.com scenario

---

### 3. lmid-operations.js
**PURPOSE**: Handles LMID operations (add, delete) with Memberstack integration

**METHOD**: POST `/api/lmid-operations`

**REQUEST BODY**:
```json
{
  "action": "add" | "delete",
  "memberId": "mem_123456789",
  "memberEmail": "teacher@school.com",
  "lmidToDelete": 123,
  "newLmidString": "1,2,3"
}
```

**RESPONSE**:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "lmid": 123,
  "shareIds": {
    "spookyland": "abc12345",
    "waterpark": "def67890",
    "shopping-spree": "ghi13579",
    "amusement-park": "jkl24680",
    "big-city": "mno97531",
    "neighborhood": "pqr86420"
  }
}
```

**FEATURES**:
- Handles both add and delete operations
- Integrates with Memberstack API for member data
- Generates ShareIDs for add operations
- Updates Memberstack metadata
- Validates member existence

**USED BY**: `lm.js` for delete operations (add operations now use `/api/create-lmid`)

**REPLACES**: "LMID CRUD" Make.com scenario

--- 