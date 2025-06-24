# rp.js - Recording Page Authorization

## 📋 Overview

**File**: `rp.js`  
**Purpose**: Secure authorization system for recording pages with world-specific content management and radio program generation integration  
**Dependencies**: Memberstack DOM SDK, URL parameters, recording.js  
**Documentation**: `/documentation/rp.js.md`

## 🎯 Primary Functions

### 1. Access Control & Authorization
- URL parameter validation (world & lmid)
- Memberstack authentication verification
- LMID ownership validation against user metadata
- Secure redirection for unauthorized access

### 2. World-Specific Content Management
- Dynamic world collection display
- Background theme management
- World name formatting and display
- Collection visibility control

### 3. Recording System Integration
- Recording functionality initialization
- Radio program generation button setup
- Recording limit validation
- Progress tracking and user feedback

## 🔄 Authorization Flow

### 1. Page Load Sequence
```
DOM Content Loaded →
  URL Parameter Extraction →
    Global Variable Storage →
      Memberstack Authentication →
        Metadata Validation →
          LMID Authorization Check →
            World Content Display →
              Recording System Initialization
```

### 2. Authorization Validation
```javascript
Required Parameters:
- world: Theme identifier (e.g., "spookyland")
- lmid: User's program identifier (e.g., "32")

Validation Process:
URL Parameters → Member Login Check → LMID Ownership → Access Granted
```

### 3. World Collection Management
```javascript
showWorldCollection(world) →
  Hide All Collections →
    Show Target Collection →
      Initialize Recording System →
        Setup Radio Program Button
```

## 🌍 World Management

### Supported Worlds
```javascript
const allCollections = [
  'collection-spookyland',      // Fear-themed content
  'collection-shopping-spree',  // Anxiety-themed content  
  'collection-amusement-park',  // Love-themed content
  'collection-big-city',        // Anger-themed content
  'collection-waterpark',       // Empathy-themed content
  'collection-neighborhood'     // Boredom-themed content
];
```

### World Display Logic
- **Collection ID Pattern**: `collection-{world}`
- **Display Strategy**: Show only relevant world, hide others
- **World Name Formatting**: Capitalize and format for display
- **Background Management**: Optional world-specific backgrounds

## 🔒 Security Implementation

### URL Parameter Security
```javascript
// Extract and validate required parameters
const lmidFromUrl = urlParams.get("lmid");
const worldFromUrl = urlParams.get("world");

// Fail-fast on missing parameters
if (!lmidFromUrl || !worldFromUrl) {
  alert("Missing required information");
  window.history.back();
}
```

### Memberstack Authorization
```javascript
// Validate user authentication
memberstack.getCurrentMember()
  .then(({ data: memberData }) => {
    if (!memberData) {
      alert("You must be logged in");
      window.history.back();
    }
    
    // Check LMID ownership
    if (!memberLmidArray.includes(lmidFromUrl)) {
      alert("You are not authorized");
      window.history.back();
    }
  });
```

### Global Variable Management
```javascript
// Store authorized parameters globally
window.currentLmid = lmidFromUrl;
window.currentWorld = worldFromUrl;

// Make available to recording system
window.currentRecordingParams = {
  world: worldFromUrl,
  lmid: lmidFromUrl
};
```

## 🎵 Radio Program Integration

### Button Setup Process
```javascript
setupExistingRadioProgramButton(world, lmid) →
  Find Existing Button (#generate-program) →
    Remove Old Event Listeners →
      Add New Click Handler →
        Recording Validation →
          Program Generation
```

### Generation Workflow
```javascript
Button Click →
  Recording Check (checkIfUserHasRecordings) →
    Validation Success →
      Button State Update →
        API Call (generateRadioProgram) →
          Progress Feedback →
            Success/Error Handling →
              Button State Reset
```

### Recording Validation
```javascript
checkIfUserHasRecordings(world, lmid) →
  DOM Element Discovery →
    Question ID Normalization →
      Database Query per Question →
        Fallback Database Scan →
          Return Boolean Result
```

## 🔧 Technical Implementation

### Question ID Normalization
```javascript
normalizeQuestionId(questionId) {
  // Converts various formats to standardized QID format
  // Input:  "Q-ID 9", "9", "question-9"
  // Output: "QID9"
  
  // Implementation:
  // 1. Check for existing QID prefix
  // 2. Extract numeric component
  // 3. Standardize to QID format
}
```

### Dynamic Collection Management
```javascript
// Hide all world collections
allCollections.forEach(collectionId => {
  const collection = document.getElementById(collectionId);
  if (collection) {
    collection.style.display = 'none';
  }
});

// Show only target collection
const targetCollection = document.getElementById(`collection-${world}`);
if (targetCollection) {
  targetCollection.style.display = 'block';
}
```

### Recording System Initialization
```javascript
// Delayed initialization to ensure DOM readiness
setTimeout(() => {
  initializeRecordingForWorld(world);
  setupExistingRadioProgramButton(world, lmid);
}, 100);
```

## 🎨 User Interface Management

### World Name Display
```javascript
const worldNameElement = document.getElementById("wrold-name"); // Note: typo in original
if (worldNameElement) {
  // Format: "spookyland" → "Spookyland"
  //         "big-city" → "Big city"
  const formattedWorldName = worldFromUrl
    .charAt(0).toUpperCase() + 
    worldFromUrl.slice(1).replace(/-/g, ' ');
  worldNameElement.textContent = formattedWorldName;
}
```

### Button State Management
```javascript
// During processing
button.disabled = true;
button.textContent = 'Creating Radio Program...';

// After completion
button.disabled = originalDisabled;
button.textContent = originalText;
```

## 🔄 Integration Points

### Recording System Integration
```javascript
// Check for recording.js availability
if (typeof initializeRecordersForWorld === 'function') {
  initializeRecordersForWorld(world);
} else {
  // Retry with delay if not yet loaded
  setTimeout(() => initializeRecordingForWorld(world), 100);
}
```

### Global Function Dependencies
- `initializeRecordersForWorld()` - From recording.js
- `loadRecordingsFromDB()` - From recording.js
- `getAllRecordingsForWorldLmid()` - From recording.js
- `generateRadioProgram()` - From recording.js

## 🧪 Error Handling

### Authorization Failures
```javascript
// Missing parameters
if (!lmidFromUrl || !worldFromUrl) {
  console.error("Missing 'lmid' or 'world' in URL");
  alert("Missing required information");
  window.history.back();
}

// Authentication failures
if (!memberData) {
  console.error("Member is not logged in");
  alert("You must be logged in");
  window.history.back();
}

// Authorization failures
if (!memberLmidArray.includes(lmidFromUrl)) {
  console.error(`Member does not have permission for LMID ${lmidFromUrl}`);
  alert("You are not authorized");
  window.history.back();
}
```

### Runtime Error Handling
```javascript
// Recording check failures
try {
  const hasRecordings = await checkIfUserHasRecordings(world, lmid);
} catch (error) {
  console.error('Error checking for recordings:', error);
  return true; // Assume they have recordings if check fails
}

// Radio program generation failures
try {
  await window.generateRadioProgram(world, lmid);
} catch (error) {
  console.error('Radio program generation failed:', error);
  alert('Failed to generate radio program. Please try again.');
}
```

## 📊 Performance Considerations

### Initialization Timing
- Delayed recording system initialization (100ms)
- Conditional function availability checking
- Graceful degradation for missing dependencies

### Memory Management
- Global variable cleanup strategies
- Event listener management
- DOM element reference handling

### Network Optimization
- Minimal API calls during authorization
- Efficient recording validation queries
- Progress feedback for long operations

## 🔐 Security Best Practices

### Input Validation
- URL parameter sanitization
- Memberstack token verification
- LMID ownership validation

### Access Control
- Session-based authentication
- Metadata-driven authorization
- Secure redirection handling

### Data Protection
- No sensitive data in URL parameters
- Secure storage of authorization state
- Protected API endpoint communication

## 🚀 Future Enhancements

### Short Term
- Enhanced error recovery mechanisms
- Better loading state management
- Improved user feedback systems
- Mobile responsiveness improvements

### Long Term
- Role-based access control
- Advanced permission systems
- Real-time collaboration features
- Enhanced security monitoring

---

## 🔗 Related Files
- **Main Dashboard**: `lm.js` - LMID management and navigation source
- **Recording System**: `recording.js` - Core recording functionality
- **API Integration**: `api/combine-audio.js` - Radio program generation
- **Configuration**: `vercel.json` - Deployment and routing settings 