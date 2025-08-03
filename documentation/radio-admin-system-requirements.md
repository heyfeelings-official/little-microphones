# Radio Admin System - AI Agent Implementation Guide

## 🎯 PROJECT OVERVIEW

Create a web-based admin interface for managing audio files on Bunny.net CDN that are used for radio program generation. The system should allow browsing, uploading, replacing, deleting, and trimming audio files with a user-friendly interface.

## 📋 CORE REQUIREMENTS

### 1. FILE MANAGEMENT
- **File Tree View**: Display Bunny.net audio files in hierarchical folder structure
- **Audio Playback**: Integrated player for previewing files before editing
- **Upload Files**: Support drag-and-drop and click-to-upload functionality
- **Replace Files**: Replace existing files while maintaining same path/name
- **Delete Files**: Remove files from Bunny.net with confirmation dialogs
- **File Filtering**: Show only audio files (hide non-audio files)

### 2. AUDIO TRIMMING SYSTEM
- **Visual Timeline**: Waveform display showing full audio duration
- **Trim Handles**: Draggable start/end markers for selecting trim range
- **Real-time Preview**: Play trimmed section before applying changes
- **Client-side Processing**: Use Web Audio API for trimming (no server FFmpeg)
- **Format Handling**: Support .webm, .mp3, .wav, .ogg formats

### 3. INTERFACE REQUIREMENTS
- **Standalone Web App**: Host on Vercel at `/admin/` path
- **Modern UI**: Clean, responsive design (suggest Tailwind CSS)
- **Toast Notifications**: User feedback for all operations
- **Keyboard Shortcuts**: Space for play/pause, Delete key for file deletion
- **Progress Indicators**: Show loading states during operations

## 🏗️ TECHNICAL ARCHITECTURE

### FRONTEND STRUCTURE
```
public/admin/
├── index.html          # Main admin interface
├── styles.css          # Custom styling
├── admin-ui.js         # Main JavaScript logic
└── audio-processor.js  # Client-side audio trimming
```

### API INTEGRATION
- **Use existing APIs**: Extend `api/upload-audio.js` and `api/delete-audio.js` with `adminMode` flag
- **New API needed**: `api/admin/list-all-files.js` for file tree data
- **File organization**: Maintain existing `/audio/{world}/` folder structure

## 🔧 PROVEN TECHNICAL SOLUTIONS

### 1. AUDIO PLAYBACK
- **Library**: Use Howler.js for reliable cross-browser audio support
- **Benefits**: Better .webm support, consistent duration handling, robust error handling
- **Implementation**: Replace native HTML5 audio with HowlerAudioManager class

### 2. AUDIO TRIMMING
- **Method**: Client-side Web Audio API processing (avoid server-side FFmpeg)
- **Process**: Download → AudioContext.decodeAudioData → trim → encode → upload
- **Encoding Priority**: 
  1. WebM (90% smaller files, 128kbps bitrate)
  2. WAV fallback (if WebM not supported)
- **WebM Implementation**: Use MediaRecorder API with timeout-based stopping (not onended events)

### 3. FILE UPLOAD STRATEGY
- **Small files**: Base64 encoding via existing JSON API
- **Large files**: Consider multipart/form-data or chunked upload
- **Security**: Never expose Bunny.net API keys to frontend
- **Path validation**: Ensure uploads maintain `/audio/` prefix structure

### 4. UI STATE MANAGEMENT
- **AppState object**: Centralized state for selected file, trim markers, audio duration
- **Event handling**: Use safeAddEventListener helper to prevent null element errors
- **File tree updates**: Selective DOM updates instead of full reloads

## 🚨 KNOWN CHALLENGES & SOLUTIONS

### FILE SIZE LIMITATIONS
- **Problem**: Large audio files cause 413 (Request Too Large) errors
- **Solutions Tested**:
  - ✅ WebM encoding (reduces size by ~90%)
  - ✅ Timeout-based MediaRecorder stopping
  - ❌ Direct Bunny.net upload (security risk - exposes API key)
  - ❌ Server-side FFmpeg (unreliable on Vercel serverless)

### AUDIO PROCESSING RELIABILITY
- **Problem**: MediaRecorder hanging on `source.onended` events
- **Solution**: Use `setTimeout(duration + 100ms)` to stop recording
- **Fallback**: Always provide WAV encoding fallback if WebM fails

### VERCEL SERVERLESS LIMITATIONS
- **FFmpeg Issues**: Not reliably available, avoid server-side audio processing
- **Timeout Config**: Set API functions to 60s max duration in vercel.json
- **Memory Limits**: Use client-side processing to avoid server memory issues

## 🎨 UI/UX GUIDELINES

### LAYOUT STRUCTURE
```
[Header with Upload Button]
[File Tree | Audio Player & Timeline]
[           | Trim Controls & Actions]
```

### VISUAL DESIGN
- **File Tree**: Folder icons, expand/collapse, hover actions
- **Timeline**: Static waveform bars, playhead, trim markers with labels
- **Controls**: Play/pause, stop, volume, trim inputs, action buttons
- **Feedback**: Toast notifications (success/error/warning/info)

### INTERACTION PATTERNS
- **File Selection**: Click file → load in player → show trim controls
- **Trimming**: Drag handles OR input exact times → preview → apply
- **Upload**: Drag files to folders OR click folder upload buttons
- **Keyboard**: Spacebar (play/pause), Delete key (file), Esc (close modals)

## 📊 IMPLEMENTATION PRIORITY

### PHASE 1: BASIC STRUCTURE
1. Setup HTML/CSS/JS files in `public/admin/`
2. Create file tree API endpoint
3. Implement basic file listing and navigation

### PHASE 2: AUDIO INTEGRATION
1. Integrate Howler.js for playback
2. Add waveform visualization (static bars)
3. Implement file selection and preview

### PHASE 3: TRIMMING SYSTEM
1. Add Web Audio API trimming functionality
2. Implement WebM encoding with MediaRecorder
3. Add trim UI controls and markers

### PHASE 4: FILE OPERATIONS
1. Extend existing APIs with adminMode
2. Add upload/replace/delete functionality
3. Implement progress feedback and error handling

## 🔍 TESTING STRATEGY

### BROWSER COMPATIBILITY
- Test WebM support detection and WAV fallback
- Verify Howler.js audio loading across browsers
- Check Web Audio API support (modern browsers only)

### FILE FORMAT TESTING
- Upload various audio formats (.webm, .mp3, .wav, .ogg)
- Test trimming with different sample rates and channel counts
- Verify playback after trim operations

### ERROR SCENARIOS
- Large file uploads (413 errors)
- Network failures during operations
- Invalid audio files
- Browser audio permission issues

## 💡 FUTURE ENHANCEMENTS

### ADVANCED FEATURES
- Batch operations (select multiple files)
- Audio format conversion
- Waveform generation from actual audio data
- Undo/redo functionality
- Audio compression/normalization

### SCALABILITY IMPROVEMENTS
- Chunked upload for very large files
- Presigned URL uploads (direct to Bunny.net)
- Progressive file loading for large directories
- Audio streaming for long files

## 🔒 SECURITY CONSIDERATIONS

- Never expose Bunny.net API keys to frontend
- Validate all file paths to prevent directory traversal
- Implement proper CORS headers for admin endpoints
- Add authentication layer (not implemented in initial version)
- Sanitize all user inputs and file names

---

## 📝 IMPLEMENTATION NOTES

This document represents lessons learned from a complete implementation and subsequent removal of the radio admin system. The solutions marked as "✅" were tested and working, while "❌" solutions had significant issues that prevented deployment.

The biggest technical challenge was audio encoding - server-side FFmpeg is unreliable on Vercel, so client-side Web Audio API processing is essential. WebM encoding via MediaRecorder provides excellent compression but requires careful timeout handling.

Focus on simplicity and proven web technologies rather than complex audio processing libraries. The combination of Howler.js (playback) + Web Audio API (processing) + MediaRecorder (encoding) provides a robust foundation for browser-based audio editing.