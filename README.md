# Little Microphones 🎵

A comprehensive audio recording and radio program generation system designed for children's programs. Create personalized radio shows by recording answers to themed questions and automatically combining them into professional radio programs with advanced FFmpeg audio processing.

## 📚 Comprehensive Documentation

For complete system documentation, please refer to the comprehensive and up-to-date documentation in the `/documentation` folder:

### 🎯 Start Here
- **[📋 Product Requirements Document](./documentation/PRD-little-microphones.md)** - Complete system overview, architecture, and product vision with latest updates

### 📁 Enhanced File Documentation  
- **[🔐 lm.js](./documentation/lm.js.md)** - Main authentication & LMID management system with security features
- **[🎵 recording.js](./documentation/recording.js.md)** - Multi-question audio recording system with radio program generation
- **[🛡️ rp.js](./documentation/rp.js.md)** - Recording page authorization & world management with integration details

### 🌐 Complete API Documentation
- **[⚡ API Functions](./documentation/api-documentation.md)** - Complete serverless API reference with security and performance details
  - `/api/upload-audio` - Secure audio file upload service with validation
  - `/api/delete-audio` - Comprehensive audio file deletion service with cleanup
  - `/api/combine-audio` - Professional radio program generation service with FFmpeg
  - `/api/list-recordings` - Cloud recording discovery & synchronization service

### 🚀 Infrastructure & Deployment
- **[📦 Deployment Guide](./documentation/deployment.md)** - Vercel deployment, Bunny.net CDN, infrastructure setup, and monitoring

## 🏗️ System Architecture

### Technology Stack
- **Frontend**: Vanilla JavaScript with WebRTC, IndexedDB, Canvas API, HTML5 Audio
- **Backend**: Node.js serverless functions with FFmpeg audio processing
- **Storage**: Dual-layer architecture (IndexedDB + Bunny.net CDN)
- **Authentication**: Memberstack with metadata-driven authorization
- **Deployment**: Vercel with GitHub integration and automatic deployment
- **Automation**: Make.com webhooks for user management and LMID lifecycle

### System Requirements
- **Frontend**: Webflow hosting with custom JavaScript integration
- **Backend**: Vercel serverless functions (Node.js 18+)
- **Storage**: Bunny.net CDN for global audio file delivery
- **Authentication**: Memberstack for secure user management

### Key Dependencies
```json
{
  "@ffmpeg-installer/ffmpeg": "^1.1.0",
  "fluent-ffmpeg": "^2.1.3"
}
```

### Environment Variables
```bash
BUNNY_API_KEY=your_storage_api_key
BUNNY_STORAGE_ZONE=your_storage_zone_name
BUNNY_CDN_URL=https://your-zone.b-cdn.net
```

## 🎯 Advanced Features

- **🎤 Multi-Question Recording**: Independent audio recorders per question with isolated state management
- **☁️ Professional Cloud Storage**: Automatic backup to Bunny.net CDN with intelligent error recovery
- **📻 Advanced Radio Program Generation**: Professional FFmpeg audio processing with noise reduction and mixing
- **🔒 Comprehensive Security**: Memberstack-based authentication with metadata-driven authorization
- **🌍 Themed Worlds**: Multiple content themes with organized collections and backgrounds
- **📱 Real-time Feedback**: Waveform visualization, upload progress, and animated status updates
- **🔄 Cross-Device Sync**: Cloud-first architecture enabling seamless device switching
- **🎛️ Professional Audio Processing**: Background music mixing, noise reduction, and mastering

## 🔄 Enhanced Development Workflow

1. **Make Changes**: Edit files locally with comprehensive documentation support
2. **Commit & Push**: `git add . && git commit -m "Description" && git push origin main`
3. **Auto Deploy**: Vercel automatically deploys changes with environment validation
4. **Verify**: Test functionality in production environment with monitoring tools

## 🌟 Complete System Overview

```
User → Webflow Frontend → JavaScript (lm.js/recording.js/rp.js) → 
Vercel APIs (4 endpoints) → Bunny.net Storage → CDN Delivery → User Experience
```

## 🎵 Professional Audio Pipeline

```
WebRTC Recording (WebM) → Local Storage (IndexedDB) → 
Cloud Upload (MP3) → Professional FFmpeg Processing → 
Radio Program Generation → CDN Delivery → User Playback
```

## 🛠️ Enhanced Technical Stack

- **Frontend**: Event-driven architecture with custom audio processing
- **Backend**: Serverless functions with professional audio mixing capabilities
- **Storage**: Organized CDN structure with intelligent caching and cleanup
- **Authentication**: Secure metadata-driven system with real-time validation
- **Deployment**: Automated CI/CD with comprehensive monitoring
- **Automation**: Webhook-driven user management with error recovery

## 📞 Support & Documentation

For technical questions or system-specific issues, refer to the detailed and comprehensive documentation in the `/documentation` folder. Each file contains thorough information about its purpose, implementation, security features, and integration points.

## 📊 System Status

**🟢 All Systems Operational**
- Audio Recording: ✅ Professional quality with real-time feedback
- Cloud Storage: ✅ Global CDN with intelligent caching
- Radio Generation: ✅ Advanced FFmpeg processing
- Authentication: ✅ Secure multi-layer validation
- Cross-Device Sync: ✅ Seamless experience across devices
- Documentation: ✅ Comprehensive and current

---

**🎵 Little Microphones** - Empowering children's voices through advanced technology # Testing environment variables
