# Audio Processing Architecture

## Overview
The Little Microphones system has audio combination logic in multiple places. This document explains the current architecture and consolidation status.

## Current Architecture

### 1. Core Audio Processing API
**File**: `api/combine-audio.js`
- **Purpose**: Main serverless function for audio processing
- **Dependencies**: FFmpeg, Bunny.net storage
- **Functions**: 
  - `combineAudioWithFFmpeg()` - Main processing pipeline
  - `combineAnswersWithBackground()` - Combines user recordings with background music
  - `assembleFinalProgram()` - Final concatenation of all segments
  - `downloadFile()`, `uploadToBunny()`, `cleanupTempDirectory()` - Utility functions

### 2. Shared Utilities
**File**: `api/audio-utils.js` ✅ **NEW - CENTRALIZED**
- **Purpose**: Shared functions to avoid duplication
- **Functions**:
  - `convertRecordingsToAudioSegments()` - Converts raw recordings to API format
  - `extractTimestampFromFilename()` - Extracts timestamp from filenames
  - `extractFilesUsed()` - Extracts filenames from audio segments for manifest
  - `STATIC_FILES` - Static audio file URLs

### 3. Frontend Radio Page
**File**: `radio.js`
- **Purpose**: Universal radio page script for ShareID-based access
- **Audio Functions**: 
  - `convertRecordingsToAudioSegments()` - **DUPLICATE** (needed for browser context)
  - `extractTimestampFromFilename()` - **DUPLICATE** (needed for browser context)
- **Main Functions**: ShareID handling, program generation, audio player management

### 4. Webflow Template
**File**: `radio-page-complete.html`
- **Purpose**: Self-contained HTML template for Webflow integration
- **Audio Functions**: 
  - `convertRecordingsToAudioSegments()` - **DUPLICATE** (needed for self-contained template)
  - `extractTimestampFromFilename()` - **DUPLICATE** (needed for self-contained template)
- **Main Functions**: Complete radio page functionality embedded in HTML

### 5. Legacy Recording Interface
**File**: `recording.js`
- **Purpose**: Main recording interface with radio generation
- **Audio Functions**: 
  - `generateRadioProgram()` - Calls combine-audio API
  - Uses same `convertRecordingsToAudioSegments()` logic inline

## Code Duplication Analysis

### ✅ Successfully Consolidated
1. **`extractFilesUsed()`** - Now only in `api/audio-utils.js` and imported by `api/combine-audio.js`
2. **`STATIC_FILES`** - Now only in `api/audio-utils.js` and imported by `api/combine-audio.js`

### ⚠️ Still Duplicated (By Design)
1. **`convertRecordingsToAudioSegments()`** - Exists in 3 places:
   - `api/audio-utils.js` (master version for Node.js)
   - `radio.js` (browser version)
   - `radio-page-complete.html` (self-contained template version)

2. **`extractTimestampFromFilename()`** - Exists in 3 places:
   - `api/audio-utils.js` (master version for Node.js)
   - `radio.js` (browser version)  
   - `radio-page-complete.html` (self-contained template version)

## Why Duplication Exists

### Technical Constraints
1. **Browser vs Node.js**: `radio.js` runs in browser and can't use ES6 imports
2. **Self-Contained Template**: `radio-page-complete.html` must be self-contained for Webflow
3. **Module System**: No build process to bundle shared code

### Architectural Decisions
1. **`api/audio-utils.js`**: Master version with ES6 exports for Node.js APIs
2. **`radio.js`**: Browser-compatible functions for standalone radio page
3. **`radio-page-complete.html`**: Embedded functions for Webflow template

## Audio Processing Flow

```
User Recordings → convertRecordingsToAudioSegments() → Audio Segments
                                                           ↓
Audio Segments → api/combine-audio.js → FFmpeg Processing → Radio Program
                                                           ↓
Radio Program → Bunny.net Storage → CDN URL → Audio Player
```

## Recommendations

### Immediate (Current State)
- ✅ Keep current architecture - it works and serves different needs
- ✅ `api/audio-utils.js` serves as the master reference
- ✅ Document the intentional duplication

### Future Improvements
1. **Build Process**: Add bundler to create shared browser modules
2. **Web Components**: Create reusable components for audio processing
3. **Service Worker**: Cache shared functions in browser
4. **CDN Hosting**: Host shared utilities on CDN for import

## Testing Strategy

### Function Consistency
All three versions of duplicate functions should:
1. Accept same parameters
2. Return same output format
3. Handle edge cases identically
4. Use same algorithm logic

### Validation Script
```javascript
// Test all three versions produce identical output
const testRecordings = [...];
const world = 'spookyland';

const nodeResult = audioUtils.convertRecordingsToAudioSegments(testRecordings, world);
const browserResult = convertRecordingsToAudioSegments(testRecordings, world);
const htmlResult = /* from radio-page-complete.html */;

assert.deepEqual(nodeResult, browserResult);
assert.deepEqual(browserResult, htmlResult);
```

## Maintenance Guidelines

### When Updating Logic
1. **Update Master First**: Always update `api/audio-utils.js` first
2. **Copy to Browser Versions**: Copy exact logic to `radio.js` and HTML template
3. **Test All Versions**: Ensure all three versions produce identical results
4. **Document Changes**: Update this architecture document

### Code Review Checklist
- [ ] Are all three versions of functions updated?
- [ ] Do all versions handle the same edge cases?
- [ ] Are parameter names and return formats consistent?
- [ ] Are console.log messages consistent across versions?

This architecture balances code reuse with practical deployment constraints while maintaining system functionality across different environments. 