# Little Microphones 🎵

A comprehensive audio recording and radio program generation system designed for children's programs. Create personalized radio shows by recording answers to themed questions and automatically combining them into professional radio programs.

## 📚 Documentation

For complete system documentation, please refer to the comprehensive documentation in the `/documentation` folder:

### 🎯 Start Here
- **[📋 Product Requirements Document](./documentation/PRD-little-microphones.md)** - Complete system overview, architecture, and product vision

### 📁 File Documentation
- **[🔐 lm.js](./documentation/lm.js.md)** - Main authentication & LMID management system
- **[🎵 recording.js](./documentation/recording.js.md)** - Multi-question audio recording system
- **[🛡️ rp.js](./documentation/rp.js.md)** - Recording page authorization & world management

### 🌐 API Documentation
- **[⚡ API Functions](./documentation/api-documentation.md)** - Complete serverless API reference
  - `/api/upload-audio` - Audio file upload service
  - `/api/delete-audio` - Audio file deletion service  
  - `/api/combine-audio` - Radio program generation service

### 🚀 Infrastructure
- **[📦 Deployment Guide](./documentation/deployment.md)** - Vercel deployment, Bunny.net CDN, and infrastructure setup

## 🏗️ Quick Start

### System Requirements
- **Frontend**: Webflow hosting with custom JavaScript
- **Backend**: Vercel serverless functions (Node.js 18+)
- **Storage**: Bunny.net CDN for audio files
- **Authentication**: Memberstack for user management

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

## 🎯 Core Features

- **🎤 Multi-Question Recording**: Independent audio recorders per question
- **☁️ Cloud Storage**: Automatic backup to Bunny.net CDN
- **📻 Radio Program Generation**: Automated audio combination with FFmpeg
- **🔒 Secure Authentication**: Memberstack-based user management
- **🌍 Themed Worlds**: Multiple content themes (Spookyland, Shopping Spree, etc.)
- **📱 Real-time Feedback**: Waveform visualization and upload progress

## 🔄 Development Workflow

1. **Make Changes**: Edit files locally
2. **Commit & Push**: `git add . && git commit -m "Description" && git push origin main`
3. **Auto Deploy**: Vercel automatically deploys changes
4. **Verify**: Test functionality in production environment

## 🌟 Architecture Overview

```
User → Webflow Frontend → JavaScript (lm.js/recording.js/rp.js) → 
Vercel APIs → Bunny.net Storage → CDN Delivery → User Experience
```

## 🎵 Audio Pipeline

```
WebRTC Recording (WebM) → Local Storage (IndexedDB) → 
Cloud Upload (MP3) → Radio Program Generation → Final Output
```

## 🛠️ Technical Stack

- **Frontend**: Vanilla JavaScript, WebRTC, IndexedDB, Canvas API
- **Backend**: Node.js serverless functions, FFmpeg audio processing
- **Storage**: Bunny.net CDN with organized file structure
- **Authentication**: Memberstack with metadata-driven authorization
- **Deployment**: Vercel with GitHub integration
- **Automation**: Make.com webhooks for user management

## 📞 Support

For technical questions or system-specific issues, refer to the detailed documentation in the `/documentation` folder. Each file contains comprehensive information about its purpose, implementation, and integration points.

---

**🎵 Little Microphones** - Empowering children's voices through technology 