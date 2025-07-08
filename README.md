# Little Microphones - Audio Recording & Radio Program System

## Overview
Little Microphones is a comprehensive audio recording and radio program generation system built for educational environments. Students can record answers to questions and automatically generate personalized radio programs.

## New File Structure (v4.4.6+)

### Main Application Files
- **`record.js`** - Recording page authorization system (formerly `rp.js`)
- **`little-microphones.js`** - Dashboard controller (formerly `lm.js`)
- **`radio.js`** - Radio program player page
- **`config.js`** - Global configuration and utilities

### Recording System
- **`recording/`** - Organized recording functionality
  - `recording.js` - Main recording system
  - `recording-audio.js` - Audio processing
  - `recording-ui.js` - UI components
  - `recording-storage.js` - Storage management
  - `recording-radio.js` - Radio generation

### Backend API
- **`api/`** - Serverless functions for Vercel
  - `upload-audio.js` - Audio file uploads to Bunny CDN
  - `combine-audio.js` - Radio program generation
  - `get-radio-data.js` - Radio program data retrieval
  - `get-teacher-data.js` - Teacher information
  - `lmid-operations.js` - LMID management
  - And more...

### Utilities
- **`utils/`** - Helper functions and utilities
  - `lm-auth.js` - Authentication system
  - `audio-utils.js` - Audio processing utilities
  - `database-utils.js` - Database operations
  - And more...

## New URL Structure

### Dashboard
- **URL**: `/members/little-microphones`
- **Purpose**: Main dashboard for managing programs
- **File**: `little-microphones.js`

### Recording Pages
- **URL**: `/members/record?world=spookyland&lmid=123`
- **Purpose**: Protected recording interface
- **Files**: `record.js` + `recording/recording.js`

### Radio Programs (Public)
- **URL**: `/little-microphones?ID=shareId`
- **Purpose**: Public access to radio programs
- **File**: `radio.js`

## Key Features

### Audio Recording
- Multi-question recording system
- Local storage with cloud backup
- Real-time upload progress
- Audio format optimization
- Recording management (play, delete, organize)

### Radio Program Generation
- Automatic program creation from recordings
- Professional audio mixing with background music
- Intro/outro integration
- Smart caching and regeneration
- Share link generation

### User Management
- Memberstack integration for authentication
- LMID (Learning Management ID) system
- Teacher data management
- Secure authorization flows

### Technical Features
- IndexedDB for local storage
- Bunny.net CDN for audio hosting
- Supabase for metadata storage
- FFmpeg for audio processing
- Real-time progress tracking

## Webflow Integration

### Script Tags
```html
<!-- Global Config (all pages) -->
<script src="https://little-microphones.vercel.app/config.js"></script>

<!-- Dashboard Page -->
<script src="https://little-microphones.vercel.app/little-microphones.js"></script>

<!-- Recording Pages -->
<script src="https://little-microphones.vercel.app/record.js"></script>
<script src="https://little-microphones.vercel.app/recording/recording.js"></script>

<!-- Radio Program Page -->
<script src="https://little-microphones.vercel.app/radio.js"></script>
```

### Required HTML Elements
- Dashboard: LMID templates and management UI
- Recording: Question collections and recorder wrappers
- Radio: State containers and audio player elements

## Environment Setup

### Required Environment Variables
```bash
# Supabase Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Bunny.net CDN
BUNNY_API_KEY=your_bunny_api_key
BUNNY_STORAGE_ZONE=your_storage_zone
BUNNY_CDN_URL=your_cdn_url

# Memberstack
MEMBERSTACK_SECRET_KEY=your_memberstack_secret
```

### Database Tables
- `lmids` - LMID management and metadata
- `share_links` - Radio program sharing
- `audio_manifests` - Audio program tracking

## Development

### Local Development
```bash
npm install
vercel dev
```

### Deployment
```bash
vercel --prod
```

### Testing
- ShareID: `p4l909my` (test radio program)
- LMID: `90` (test recordings)
- World: `spookyland` (test environment)

## Migration Notes

### From v4.4.5 and earlier:
1. **File renames**: Update script references
   - `rp.js` → `record.js`
   - `lm.js` → `little-microphones.js`
2. **URL changes**: Update navigation links
   - `/members/rp` → `/members/record`
   - `/members/lm` → `/members/little-microphones`
   - `/members/radio` → `/little-microphones`
3. **File organization**: Recording files moved to `recording/` folder

## Documentation

See `/documentation/` folder for detailed guides:
- API documentation
- Webflow integration guides
- Audio architecture
- Deployment instructions
- Troubleshooting guides

## Support

- Check documentation first
- Review console logs for errors
- Test with known ShareIDs/LMIDs
- Verify environment variables

**Version**: 4.4.6+  
**Status**: Production Ready ✅  
**Last Updated**: January 2025
