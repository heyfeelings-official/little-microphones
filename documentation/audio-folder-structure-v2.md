# Audio Folder Structure v2.0 - World-Specific Organization

## Overview
New audio folder structure with world-specific organization, jingles, and role-based intro/outro files.

## New Folder Structure

```
audio/
├── jingles/
│   ├── intro-jingle.mp3        # Global intro jingle (all programs start with this)
│   ├── middle-jingle.mp3       # Middle jingle (after world-specific intro)
│   └── outro-jingle.mp3        # Global outro jingle (all programs end with this)
├── amusement-park/
│   ├── other/
│   │   ├── amusement-park-intro-parents.mp3     # Intro for parents
│   │   ├── amusement-park-intro-educators.mp3   # Intro for educators
│   │   ├── amusement-park-outro-parents.mp3     # Outro for parents
│   │   ├── amusement-park-outro-educators.mp3   # Outro for educators
│   │   └── amusement-park-background.mp3        # Background music for answers
│   └── questions/
│       ├── amusement-park-QID1.mp3
│       ├── amusement-park-QID2.mp3
│       ├── amusement-park-QID3.mp3
│       ├── amusement-park-QID4.mp3
│       ├── amusement-park-QID5.mp3
│       ├── amusement-park-QID6.mp3
│       ├── amusement-park-QID7.mp3
│       ├── amusement-park-QID8.mp3
│       ├── amusement-park-QID9.mp3
│       └── amusement-park-QID10.mp3
├── big-city-park/
│   ├── other/
│   │   ├── big-city-park-intro-parents.mp3
│   │   ├── big-city-park-intro-educators.mp3
│   │   ├── big-city-park-outro-parents.mp3
│   │   ├── big-city-park-outro-educators.mp3
│   │   └── big-city-park-background.mp3
│   └── questions/
│       ├── big-city-park-QID1.mp3
│       ├── big-city-park-QID2.mp3
│       └── ... (up to QID10)
└── spookyland/
    ├── other/
    │   ├── spookyland-intro-parents.mp3
    │   ├── spookyland-intro-educators.mp3
    │   ├── spookyland-outro-parents.mp3
    │   ├── spookyland-outro-educators.mp3
    │   └── spookyland-background.mp3
    └── questions/
        ├── spookyland-QID1.mp3
        ├── spookyland-QID2.mp3
        └── ... (up to QID10)
```

## Audio Generation Sequence

### New Generation Order:
1. **intro-jingle.mp3** (global jingle)
2. **{world}-intro-{role}.mp3** (world-specific, role-based intro)
3. **middle-jingle.mp3** (global middle jingle)
4. **1s silence** (pause before questions)
5. **{world}-QID{n}.mp3** (question from world-specific questions folder)
6. **User recordings** (answers without background - background added globally)
7. **Repeat steps 4-6 for each question with recordings**
8. **outro-jingle.mp3** (global jingle)
9. **{world}-outro-{role}.mp3** (world-specific, role-based outro - LAST)

### Background Music:
- **Global Background**: Applied to entire program except intro/outro jingles
- **Volume**: 50% of original background track
- **Coverage**: World-specific intro + all questions/answers + world-specific outro

### Role Detection:
- **Educators**: Recordings with filename prefix `kids-`
- **Parents**: Recordings with filename prefix `parent_mem_sb_`

## Updated Files

### 1. `utils/audio-utils.js`
- ✅ Updated `convertRecordingsToAudioSegments()` to support new structure
- ✅ Added `detectUserRole()` function
- ✅ Added `userRole` parameter with default 'parents'

### 2. `recording/recording.js`
- ✅ Updated audio segment generation with new folder paths
- ✅ Added jingles at beginning and end
- ✅ Added role detection from recordings
- ✅ Updated question and background paths

### 3. `radio.js`
- ✅ Updated `generateAudioSegmentsForType()` function
- ✅ Added jingles support
- ✅ Updated to use world-specific folders
- ✅ Added role-based intro/outro selection

## Migration Notes

### Old Structure (Deprecated):
```
audio/
├── other/
│   ├── intro.webm      # Single intro for all
│   ├── outro.webm      # Single outro for all
│   ├── monkeys.webm    # Single background for all
│   ├── {world}-QID1.webm  # Questions mixed in other folder
│   └── ...
└── {world}/
    └── {world}-QID{n}.webm  # Some questions in world folders
```

### New Structure Benefits:
- **World-specific content**: Each world has its own intro/outro/background
- **Role-based personalization**: Different content for parents vs educators
- **Better organization**: Questions separated from system files
- **Global branding**: Consistent jingles across all programs
- **Scalability**: Easy to add new worlds without file conflicts

## Technical Implementation

### URL Patterns:
- Jingles: `audio/jingles/{intro|outro}-jingle.mp3`
- World intro/outro: `audio/{world}/other/{world}-{intro|outro}-{parents|educators}.mp3`
- Questions: `audio/{world}/questions/{world}-QID{n}.mp3`
- Background: `audio/{world}/other/{world}-background.mp3`

### Cache Busting:
All URLs include timestamp parameters (`?t={timestamp}`) for fresh content delivery.

### Language Support:
Uses `window.LM_CONFIG.getLocalizedAudioUrl()` for multi-language support in browser contexts.

## Status: ✅ Implementation Complete
- All core files updated
- Role detection implemented
- New audio sequence active
- Backward compatibility maintained through fallbacks