# Little Microphones - Product Requirements Document (PRD)

## 🎵 Executive Summary

**Little Microphones** is a comprehensive audio recording and radio program generation system designed for children's programs. The platform enables users to create personalized radio shows by recording answers to themed questions and automatically combining them into professional radio programs.

## 🎯 Product Vision

Create an engaging, secure, and user-friendly platform where children can express themselves through audio recordings, creating personalized radio programs that capture their unique perspectives and stories.

## 🏗️ System Architecture

### Core Components

1. **Authentication & User Management**
   - Memberstack-based authentication
   - Secure LMID (Little Microphone ID) management
   - Multi-program support per user (max 5 programs)

2. **Audio Recording System**
   - Browser-based audio recording (WebRTC)
   - Real-time waveform visualization
   - Multi-question recording support
   - Local storage with cloud backup

3. **Cloud Storage & CDN**
   - Bunny.net CDN for audio file storage
   - Organized file structure by user/world/question
   - Automatic backup and synchronization

4. **Radio Program Generation**
   - Serverless audio processing with FFmpeg
   - Automated combination of recordings with background audio
   - Professional radio show output

5. **Deployment & Hosting**
   - Vercel serverless functions
   - GitHub-based version control
   - Automatic deployment pipeline

## 🌍 Product Concepts

### Worlds (Themes)
- **Spookyland**: Fear-themed questions and scenarios
- **Shopping Spree**: Consumer/anxiety-themed content  
- **Amusement Park**: Love-themed experiences
- **Big City**: Anger-themed situations
- **Waterpark**: Empathy-focused content
- **Neighborhood**: Boredom-related topics

### Programs (LMIDs)
Each user can create up to 5 programs, each containing:
- Unique identifier (LMID)
- World-specific recordings
- Question-based structure
- Generated radio program output

## 🔧 Technical Specifications

### Frontend Technologies
- **Vanilla JavaScript**: Core functionality
- **WebRTC MediaRecorder API**: Audio recording
- **IndexedDB**: Local data persistence
- **Canvas API**: Waveform visualization
- **Webflow**: UI framework and hosting

### Backend Technologies
- **Node.js**: Runtime environment
- **Vercel Serverless Functions**: API endpoints
- **FFmpeg**: Audio processing and combination
- **Bunny.net Storage API**: File management

### Key APIs
- **Memberstack API**: User authentication and metadata
- **Bunny.net Storage**: File upload/download/delete
- **Make.com Webhooks**: User management automation

## 📊 Data Flow Architecture

### 1. User Authentication Flow
```
User → Webflow Login → Memberstack Auth → Metadata Verification → Access Granted
```

### 2. Recording Flow
```
Question Display → Audio Recording → Local Storage → Cloud Backup → UI Update
```

### 3. Radio Program Generation Flow
```
Recording Collection → Audio Plan Creation → FFmpeg Processing → Cloud Upload → Program URL
```

## 🔒 Security & Privacy

### Authentication Security
- Memberstack secure token validation
- LMID-based access control
- URL parameter validation
- Session management

### Data Protection
- Local-first data storage
- Encrypted cloud backups
- Automatic orphaned file cleanup
- User data isolation

### Limits & Constraints
- Maximum 5 programs per user
- Maximum 30 recordings per question
- 60-second timeout for audio processing
- File size limitations for recordings

## 🎨 User Experience

### Recording Experience
1. **World Selection**: Choose themed environment
2. **Question Navigation**: Browse through topic-specific questions
3. **Audio Recording**: Click-to-record with visual feedback
4. **Playback & Management**: Review, delete, and organize recordings
5. **Program Generation**: One-click radio show creation

### Visual Feedback
- Live waveform visualization during recording
- Recording status indicators (local/cloud)
- Progress feedback during program generation
- Upload status with retry mechanisms

## 📈 Performance Requirements

### Recording Performance
- < 100ms recording start latency
- Real-time waveform rendering at 60fps
- Instant playback of recorded audio
- Background upload without UI blocking

### Audio Processing Performance
- < 60 seconds for radio program generation
- Support for 10+ audio segments per program
- Automatic format conversion and normalization
- Memory-efficient serverless processing

### Storage Performance
- < 2 seconds for file upload completion
- Automatic retry for failed uploads
- CDN-based global content delivery
- Efficient file organization and cleanup

## 🔄 Audio Processing Pipeline

### 1. Recording Capture
- WebRTC MediaRecorder API
- Format: WebM (recording) → MP3 (storage)
- Quality: 128kbps, 44.1kHz, Stereo
- Duration: Unlimited per recording

### 2. File Organization
```
Storage Structure:
/{lmid}/{world}/
  ├── kids-world_{world}-lmid_{lmid}-question_{qid}-tm_{timestamp}.mp3
  └── radio-program-{world}-{lmid}.mp3

Static Files:
/audio/{world}/
  ├── {world}-QID{number}.mp3  (question prompts)
  └── /other/
      ├── intro.mp3
      ├── outro.mp3
      └── monkeys.mp3
```

### 3. Radio Program Assembly
```
Audio Sequence:
intro.mp3 → 
  question1.mp3 → [user recordings for Q1] → monkeys.mp3 →
  question2.mp3 → [user recordings for Q2] → monkeys.mp3 →
  ... →
outro.mp3
```

## 🛠️ Development Workflow

### 1. Local Development
```bash
# File changes
git add .
git commit -m "Description"
git push origin main

# Automatic deployment
Vercel detects changes → Builds project → Deploys to production
```

### 2. Testing Process
- Local browser testing for recording functionality
- Console logging for debugging and monitoring
- Cloud storage verification for file integrity
- End-to-end radio program generation testing

### 3. Deployment Pipeline
- **Source**: GitHub repository
- **Build**: Vercel automatic builds
- **Environment**: Production environment variables
- **Monitoring**: Console logs and error tracking

## 📋 API Endpoints

### `/api/upload-audio`
- **Method**: POST
- **Purpose**: Upload recorded audio to cloud storage
- **Input**: Audio blob, metadata (world, lmid, questionId, timestamp)
- **Output**: Cloud URL and upload confirmation

### `/api/delete-audio`
- **Method**: DELETE  
- **Purpose**: Remove audio files from cloud storage
- **Input**: File identifier or LMID folder
- **Output**: Deletion confirmation

### `/api/combine-audio`
- **Method**: POST
- **Purpose**: Generate radio program from recordings
- **Input**: World, LMID, recordings collection
- **Output**: Combined audio file URL

## 🎯 Success Metrics

### User Engagement
- Recording completion rate per question
- Program generation success rate
- User retention across sessions
- Multi-world engagement

### Technical Performance
- Upload success rate (target: >99%)
- Audio processing time (target: <60s)
- System uptime (target: >99.9%)
- Error rate (target: <1%)

### Content Quality
- Successful radio program generation
- Audio quality consistency
- File organization integrity
- User satisfaction with output

## 🚀 Future Enhancements

### Short Term
- Additional world themes
- Enhanced audio effects and filters
- Mobile app development
- Social sharing features

### Long Term
- AI-powered content suggestions
- Multi-language support
- Advanced audio editing tools
- Community features and collaboration

## 🔧 Technical Debt & Maintenance

### Current Limitations
- FFmpeg dependency size in serverless environment
- WebM to MP3 conversion during upload
- Manual file cleanup processes
- Limited error recovery mechanisms

### Monitoring & Maintenance
- Regular cloud storage cleanup
- Performance monitoring and optimization
- Security updates and dependency management
- User feedback integration and improvements

---

## 📚 Related Documentation

- [lm.js Documentation](./lm.js.md) - Main authentication and LMID management
- [recording.js Documentation](./recording.js.md) - Audio recording system
- [rp.js Documentation](./rp.js.md) - Recording page authorization
- [API Documentation](./api-documentation.md) - Serverless function details
- [Deployment Documentation](./deployment.md) - Vercel and infrastructure setup 