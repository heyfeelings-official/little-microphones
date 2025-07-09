# Changelog

All notable changes to Little Microphones will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.7.0] - 2025-01-08

### Added
- Comprehensive system architecture documentation
- Production-ready console.log guidelines
- Professional code commenting standards
- File organization by function documentation

### Changed
- Updated README to production-ready format with badges
- Enhanced documentation structure and clarity
- Improved code organization descriptions

### Fixed
- Progress bar height consistency between recording and radio pages
- Z-index hierarchy issues with shadow overlays
- Container z-index manipulation affecting Webflow layouts

## [4.6.13] - 2025-01-08

### Fixed
- Removed container z-index manipulation that interfered with Webflow hierarchy
- Program-container-shadow now properly maintains its z-index from Webflow

## [4.6.12] - 2025-01-08

### Fixed
- Progress bar height inconsistency (4px → 8px)
- Added hover effects to recording.js progress bar
- Fixed z-index hierarchy for proper layer ordering
- Video background z-index: 1, interface elements z-index: 33

## [4.6.11] - 2025-01-08

### Fixed
- Removed progress bar height changes on hover
- Maintains consistent 8px height across all instances

## [4.6.10] - 2025-01-08

### Fixed
- Shadow overlay positioning issues
- Player background transparency (now solid white)
- Progress bar visibility and interaction
- Player width consistency (100% container width)

## [4.6.9] - 2025-01-08

### Added
- RecordingUI options parameter for flexible configuration
- Clean API for hiding UI elements

### Changed
- Modified recording-ui.js to accept showDeleteButton and showUploadIcon options
- Radio page now uses clean API instead of DOM manipulation

### Fixed
- Video z-index issues (changed from -1 to 0)
- Delete button visibility on radio page

## [4.6.8] - 2025-01-08

### Changed
- Implemented aggressive delete button hiding with multiple selectors
- Added comprehensive DOM manipulation for radio page

### Note
- This version was too aggressive and caused issues

## [4.6.7] - 2025-01-08

### Fixed
- Video background autoplay, muted, loop properties
- Delete button visibility on radio page
- Enhanced error handling for video loading

## [4.6.0] - 2025-01-07

### Added
- Video backgrounds for all worlds
- Automatic fallback from MP4 to AVIF images
- Enhanced world background system

### Changed
- Updated config.js with WORLD_VIDEOS mapping
- Improved setWorldBackground function

## [4.5.0] - 2025-01-06

### Added
- ShareID-based radio program system
- Universal radio page for all programs
- Parent registration flow via ShareID
- Intelligent program regeneration

### Changed
- Radio URLs now use ShareID instead of world/lmid
- Simplified radio page to single entry point
- Enhanced security with obfuscated identifiers

## [4.4.6] - 2025-01-05

### Changed
- Renamed core files for clarity:
  - `lm.js` → `little-microphones.js`
  - `rp.js` → `record.js`
- Updated all URL paths to match new naming
- Reorganized recording files into `/recording/` directory

### Fixed
- File import paths and dependencies
- Webflow script references

## [4.4.0] - 2025-01-04

### Added
- Modular recording system architecture
- Separated recording functionality into focused modules
- Enhanced error handling and recovery

### Changed
- Split monolithic recording.js into:
  - recording-ui.js (UI components)
  - recording-audio.js (audio capture)
  - recording-storage.js (data persistence)
  - recording-radio.js (program generation)

## [4.3.0] - 2025-01-03

### Added
- Real-time LMID synchronization with Memberstack
- Enhanced authentication system (lm-auth.js)
- Centralized LMID management

### Fixed
- LMID metadata sync issues
- Dashboard population bugs
- Authentication flow problems

## [4.2.0] - 2025-01-02

### Added
- Professional audio processing with FFmpeg
- Background music mixing at 25% volume
- Noise reduction and normalization
- Master EQ and compression

### Changed
- Audio parameters to less aggressive defaults
- Improved audio quality settings

## [4.1.0] - 2024-12-30

### Added
- IndexedDB local storage for recordings
- Automatic cloud backup to Bunny.net CDN
- Cross-device synchronization
- Upload progress tracking

### Changed
- Storage architecture from local-only to cloud-first
- Improved reliability and data persistence

## [4.0.0] - 2024-12-28

### Added
- Complete system rewrite for Webflow integration
- Multi-world support (6 themed worlds)
- Teacher dashboard for LMID management
- Browser-based recording without plugins
- Automatic radio program generation

### Changed
- Architecture from monolithic to modular
- Authentication from custom to Memberstack
- Storage from local to cloud-based
- UI from custom to Webflow-driven

### Breaking Changes
- Complete API restructure
- New file naming conventions
- Updated URL structures
- New authentication flow

---

## Version History Summary

### 4.x Series (2024-2025) - Production Ready
- Complete platform rewrite
- Webflow integration
- Cloud-first architecture
- Professional audio processing

### 3.x Series (2024) - Beta
- Initial recording functionality
- Basic radio generation
- Local storage only

### 2.x Series (2024) - Alpha
- Proof of concept
- Basic audio capture
- Simple playback

### 1.x Series (2024) - Prototype
- Initial exploration
- Technology evaluation
- Architecture planning 