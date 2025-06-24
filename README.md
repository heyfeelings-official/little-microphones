# Little Microphones 🎙️

**Audio recording platform for educational environments**

[![Version](https://img.shields.io/badge/version-3.1.0-blue.svg)](https://github.com/heyfeelings-official/little-microphones)
[![Status](https://img.shields.io/badge/status-production%20ready-green.svg)](https://little-microphones.vercel.app)
[![Platform](https://img.shields.io/badge/platform-Vercel-black.svg)](https://vercel.com)

## 🎯 Overview

Little Microphones is a web-based audio recording platform that allows users to record responses to questions and generate combined radio programs. The system integrates with Webflow CMS for content management and uses Bunny.net CDN for audio storage and delivery.

## ✨ Key Features

### 🎵 Audio Recording
- **Real-time Waveform**: Visual feedback during recording
- **Multi-format Support**: Automatic best format selection per browser
- **Cloud Backup**: Automatic upload to Bunny.net CDN
- **Recording Limits**: 30 recordings max per question

### 🎙️ Radio Program Generation
- **Immediate Start**: No fake delays, processing begins instantly
- **Numeric Ordering**: Simple 1-2-3-4-5-6 question order from CMS
- **Fun Status Messages**: Entertaining messages during actual FFmpeg work
  - "Teaching monkeys to sing"
  - "Sprinkling audio fairy dust"
  - "Consulting with audio wizards"
- **Professional Quality**: FFmpeg-based audio processing

### 🚀 Performance
- **Clean Logging**: 135+ lines of verbose logging removed (v3.1.0)
- **Streamlined UX**: Collect (5%) → Process (15%) → Complete (95-100%)
- **Cache-Busting**: Timestamp-based versioning prevents old audio

## 🏗️ Technical Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │    │   Serverless    │    │  Cloud Storage  │
│                 │    │    Functions    │    │                 │
│ • Webflow Host  │◄──►│ • Vercel APIs   │◄──►│ • Bunny.net CDN │
│ • JS Assets     │    │ • Node.js 18+   │    │ • Audio Files   │
│ • User Auth     │    │ • FFmpeg Proc   │    │ • Static Assets │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components
- **Frontend**: `recording.js`, `lm.js`, `rp.js`
- **Backend**: `api/upload-audio.js`, `api/delete-audio.js`, `api/combine-audio.js`
- **Storage**: IndexedDB (local), Bunny.net CDN (cloud)
- **Auth**: Memberstack integration

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/heyfeelings-official/little-microphones.git
cd little-microphones
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
# Create .env file with:
BUNNY_API_KEY=your_storage_api_key
BUNNY_STORAGE_ZONE=your_storage_zone_name
BUNNY_CDN_URL=https://your-zone.b-cdn.net
```

### 4. Deploy to Vercel
```bash
vercel --prod
```

## 📊 File Structure

```
Little Microphones/
├── api/                    # Serverless functions
│   ├── upload-audio.js     # Audio file upload
│   ├── delete-audio.js     # Audio file deletion
│   └── combine-audio.js    # Radio program generation
├── documentation/          # Complete system documentation
│   ├── PRD-little-microphones.md
│   ├── api-documentation.md
│   ├── recording.js.md
│   ├── deployment.md
│   ├── rp.js.md
│   └── lm.js.md
├── lm.js                  # Main dashboard script
├── recording.js           # Recording system
├── rp.js                  # Recording page auth
├── package.json           # Dependencies
└── vercel.json           # Deployment config
```

## 🎵 Audio Processing Pipeline

### Question File Naming
```
Static Files (CDN):
audio/spookyland/spookyland-QID1.mp3  // Question 1
audio/spookyland/spookyland-QID2.mp3  // Question 2

User Recordings:
/{lmid}/{world}/kids-world_{world}-lmid_{lmid}-question_{number}-tm_{timestamp}.mp3
```

### Radio Program Structure
```
intro.mp3 →
  spookyland-QID1.mp3 → [user recordings Q1] → monkeys.mp3 →
  spookyland-QID2.mp3 → [user recordings Q2] → monkeys.mp3 →
  ... →
outro.mp3
```

## 🔧 API Endpoints

### Upload Audio
```http
POST /api/upload-audio
Content-Type: application/json

{
  "audioData": "base64_encoded_mp3_data",
  "filename": "kids-world_spookyland-lmid_32-question_1-tm_timestamp.mp3",
  "world": "spookyland",
  "lmid": "32",
  "questionId": "1"
}
```

### Combine Audio
```http
POST /api/combine-audio
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
      "type": "combine_with_background",
      "answerUrls": ["https://..."],
      "backgroundUrl": "https://little-microphones.b-cdn.net/audio/other/monkeys.mp3",
      "questionId": "1"
    }
  ]
}
```

## 📈 Recent Updates (v3.1.0)

### 🎯 Major Improvements
- **Simplified Question Ordering**: Direct use of CMS "Little Microphones Order" field
- **Immediate Radio Generation**: No fake delays, instant processing start
- **Console Logging Cleanup**: Removed 135+ lines of verbose logging
- **Fixed Audio File URLs**: Correct QID format for static files

### 🔧 Technical Changes
- Replaced complex QID normalization with direct numeric ordering
- Implemented immediate audio processing start
- Added entertaining status messages during real FFmpeg work
- Proper cleanup of intervals and status messages

## 🛡️ Security & Performance

### Security Features
- API key protection via Vercel environment variables
- User-specific file isolation
- Memberstack authentication integration
- Input validation on all endpoints

### Performance Optimizations
- Serverless architecture scales automatically
- Global CDN delivery via Bunny.net
- Efficient IndexedDB local storage
- Clean console logging reduces overhead

## 📚 Documentation

Complete documentation is available in the `/documentation` folder:

- **[PRD](./documentation/PRD-little-microphones.md)** - Product requirements and features
- **[API Docs](./documentation/api-documentation.md)** - Complete API reference
- **[Recording System](./documentation/recording.js.md)** - Audio recording documentation
- **[Deployment](./documentation/deployment.md)** - Infrastructure and deployment guide
- **[Radio Player](./documentation/rp.js.md)** - Recording page documentation
- **[Dashboard](./documentation/lm.js.md)** - Main dashboard documentation

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Connect GitHub repository to Vercel
# Set environment variables in Vercel dashboard
# Push to main branch for automatic deployment
```

### Environment Variables
```bash
BUNNY_API_KEY=your_storage_api_key
BUNNY_STORAGE_ZONE=your_storage_zone_name
BUNNY_CDN_URL=https://your-zone.b-cdn.net
```

## 🐛 Troubleshooting

### Common Issues
1. **Missing audio files**: Ensure QID format naming (spookyland-QID1.mp3)
2. **Upload failures**: Check Bunny.net API credentials
3. **Processing timeouts**: Verify FFmpeg availability
4. **Authentication issues**: Validate Memberstack configuration

### Debug Mode
Enable detailed logging in browser console to troubleshoot issues.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is proprietary software owned by Hey Feelings.

## 🔗 Links

- **Live Demo**: [little-microphones.vercel.app](https://little-microphones.vercel.app)
- **Documentation**: [/documentation](./documentation)
- **Issues**: [GitHub Issues](https://github.com/heyfeelings-official/little-microphones/issues)

---

**Last Updated**: June 24, 2025  
**Version**: 3.1.0  
**Status**: Production Ready ✅ 