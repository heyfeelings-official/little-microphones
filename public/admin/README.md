# Radio Admin Interface

## Access

The admin interface is available at:
- Local: http://localhost:3000/admin
- Production: https://little-microphones.vercel.app/admin

## Features

### File Management
- **File Tree View**: Browse all audio files organized by world and type
- **Upload**: Drag & drop or click to upload new audio files
- **Delete**: Remove unwanted files directly from the interface
- **Format Conversion**: Automatic conversion to WebM format

### Audio Editing
- **Playback**: Built-in audio player with timeline visualization
- **Trimming**: Manual trim with visual markers or automatic silence detection
- **Silence Detection**: Automatically detect and remove silence from start/end
- **Real-time Preview**: See waveform and trim markers while editing

### Keyboard Shortcuts
- `Space`: Play/Pause audio
- `Delete`: Delete selected file
- `Ctrl+S`: Save changes
- `Escape`: Close upload modal

## File Structure

Files are organized in the following structure on Bunny.net:

```
/audio/
  ├── spookyland/       # World-specific questions
  ├── waterpark/
  ├── shopping-spree/
  ├── amusement-park/
  ├── big-city/
  ├── neighborhood/
  └── other/           # intro.webm, outro.webm, monkeys.webm

/{lang}/{lmid}/{world}/  # User recordings
```

## Usage Instructions

### Uploading Files
1. Click "Upload" button in the file tree panel
2. Select destination folder from dropdown
3. Drag files or click to browse
4. Click "Upload" to start

### Trimming Audio
1. Select a file from the tree
2. Click "Detect Silence" for automatic trim points
3. Or manually drag the green (start) and red (end) markers
4. Click "Apply Trim" to save changes

### Deleting Files
1. Select a file from the tree
2. Click "Delete File" button
3. Confirm deletion

## Notes
- All changes are automatically saved to Bunny.net
- Files marked with * have unsaved edits
- The interface works best on desktop browsers
- No authentication is currently required (add before production use) 