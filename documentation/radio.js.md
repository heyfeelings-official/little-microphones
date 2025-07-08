# radio.js Documentation

## Overview
`radio.js` manages the public radio program page functionality for Little Microphones. It handles loading and playing generated radio programs based on share IDs.

**Version:** 4.6.12
**Last Updated:** January 2025
**Status:** Production Ready ✅

## Recent Changes (v4.6.12)
- **Progress Bar Consistency**: Fixed height inconsistency between recording and radio pages
  - Updated `recording/recording.js` progress bar height from 4px to 8px
  - Added hover effects to progress bar in recording.js for better UX
  - Updated border-radius from 2px to 4px for consistency
- **Z-Index Hierarchy**: Fixed layer ordering according to Webflow design
  - Video background: z-index: 1 (was 0)
  - Child elements (text, player): z-index: 33 (was 1)
  - `program-container-shadow`: excluded from manipulation, preserves z-index: 2
  - Now maintains proper layering: video → shadow → interface elements

## Previous Changes (v4.6.9)
- Fixed video background z-index issues (changed from -1 to 0)
- Updated RecordingUI integration to use options parameter
- Removed aggressive delete button hiding in favor of clean API
- Improved container z-index management for proper layering
- Added child element positioning to ensure content appears above video

## Key Features
- Loads radio program data using share ID from URL
- Displays teacher and school information
- Shows world-specific video backgrounds with image fallbacks
- Uses RecordingUI module for consistent audio player
- Handles program generation if needed
- Public access (no authentication required) 