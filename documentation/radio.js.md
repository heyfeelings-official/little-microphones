# radio.js Documentation

## Overview
`radio.js` manages the public radio program page functionality for Little Microphones. It handles loading and playing generated radio programs based on share IDs.

**Version:** 4.6.9
**Last Updated:** January 2025
**Status:** Production Ready ✅

## Recent Changes (v4.6.9)
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