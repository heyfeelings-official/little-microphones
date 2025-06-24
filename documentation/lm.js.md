# lm.js - Main Authentication & LMID Management

## 📋 Overview

**File**: `lm.js`  
**Purpose**: Core authentication system and LMID (Little Microphone ID) management for the main dashboard  
**Dependencies**: Memberstack DOM SDK, Webflow  
**Documentation**: `/documentation/lm.js.md`

## 🎯 Primary Functions

### 1. Authentication & Authorization
- Validates user login status via Memberstack
- Securely retrieves user metadata including authorized LMIDs
- Manages session state and user permissions

### 2. LMID Display & Management
- Dynamically renders user's authorized programs (LMIDs)
- Supports multiple LMID formats (string, number, comma-separated)
- Clones template elements for each program
- Initializes Webflow interactions for new elements

### 3. Program Operations
- **Create**: Add new programs (max 5 per user)
- **Delete**: Remove programs with confirmation and cleanup
- **Navigate**: Route to world-specific recording pages

## 🔄 Process Flow

### 1. Page Load Sequence
```
DOM Content Loaded →
  Memberstack Availability Check →
    User Authentication →
      LMID Metadata Extraction →
        Template Cloning →
          UI Population →
            Event Listener Setup
```

### 2. LMID Creation Flow
```
Button Click →
  User Authentication Check →
    LMID Limit Validation (5 max) →
      Webhook Call (Make.com) →
        Memberstack Metadata Update →
          UI Element Creation →
            Webflow Re-initialization
```

### 3. LMID Deletion Flow
```
Delete Button Click →
  Parent Element Identification →
    Confirmation Modal →
      User Validation Input →
        Cloud File Cleanup →
          Webhook Call →
            Metadata Update →
              UI Element Removal
```

## 🔒 Security Features

### User Validation
- Secure Memberstack token verification
- Real-time authentication status checking
- LMID ownership validation before operations

### Data Protection
- Metadata-based authorization (no URL manipulation)
- Secure webhook communication with Make.com
- File cleanup before LMID deletion
- Protected member ID and email transmission

### Input Validation
- LMID limit enforcement (5 programs maximum)
- Confirmation dialog with typed validation
- Robust error handling and user feedback

## 🎨 UI Components

### LMID Template System
- **Template Element**: `#lm-slot` (initially hidden)
- **Dynamic Clones**: Created for each authorized LMID
- **Data Attributes**: `data-lmid` for identification
- **Child Elements**: `#lmid-number` for display

### Interactive Elements
- **Add Button**: `#add-lmid` for creating new programs
- **Delete Button**: `#lm-delete` for program removal
- **World Links**: `[data-world]` for navigation

### Visual Feedback
- Loading states during operations
- Error highlighting for failed operations
- Confirmation modals with custom styling
- Progress indicators for long operations

## 📊 Data Structures

### Memberstack Metadata
```javascript
{
  id: "member_uuid",
  auth: { email: "user@example.com" },
  metaData: {
    lmids: "1,2,3" | "5" | 5  // Flexible format support
  }
}
```

### Webhook Payload (Make.com)
```javascript
{
  action: "add" | "delete",
  memberId: "member_uuid",
  memberEmail: "user@example.com", // Add operations only
  lmidToDelete: "3",              // Delete operations only
  newLmidString: "1,2" | null     // Delete operations only
}
```

## 🌍 World Navigation

### URL Construction
- **Base URL**: From link href attribute in Webflow
- **Parameters**: `?world={world}&lmid={lmid}`
- **Example**: `/rp?world=spookyland&lmid=3`

### Supported Worlds
- `spookyland` - Fear-themed content
- `shopping-spree` - Anxiety-themed content
- `amusement-park` - Love-themed content
- `big-city` - Anger-themed content
- `waterpark` - Empathy-themed content
- `neighborhood` - Boredom-themed content

## 🔧 Error Handling

### Authentication Errors
- Missing Memberstack SDK
- User not logged in
- Invalid or missing metadata

### Operation Errors
- Network failures during webhook calls
- File deletion failures
- Template element not found
- LMID limit exceeded

### User Feedback
- Alert dialogs for critical errors
- Console logging for debugging
- Visual state changes during operations
- Graceful degradation for partial failures

## 🎛️ Configuration

### Environment Dependencies
- **Memberstack**: User authentication service
- **Make.com Webhook**: `unifiedWebhookUrl` for LMID operations
- **Bunny.net API**: File deletion service endpoint
- **Webflow**: UI framework and DOM structure

### Rate Limits & Constraints
- Maximum 5 LMIDs per user
- Webhook timeout handling
- File deletion timeout handling
- UI operation throttling

## 🔄 Integration Points

### External Services
1. **Memberstack**: Authentication and metadata management
2. **Make.com**: Webhook automation for LMID lifecycle
3. **Bunny.net**: Cloud storage for file cleanup
4. **Webflow**: UI framework and template system

### Internal Dependencies
- `recording.js`: Expects world/lmid parameters
- `rp.js`: Receives navigation parameters
- `api/delete-audio.js`: File cleanup integration

## 🧪 Testing Approach

### Manual Testing
1. Login/logout scenarios
2. LMID creation (including limit testing)
3. LMID deletion with file cleanup
4. World navigation functionality
5. Error condition handling

### Debugging Tools
- Console logging for all operations
- Visual feedback for user actions
- Network tab monitoring for API calls
- Memberstack dashboard for metadata verification

## 📈 Performance Considerations

### Optimization Strategies
- Lazy loading of LMID content
- Efficient DOM manipulation
- Minimal Webflow re-initialization
- Cached template cloning

### Potential Bottlenecks
- Memberstack API response time
- Webhook processing delays
- Large numbers of LMIDs (5 max mitigates this)
- File deletion timeout issues

## 🚀 Future Enhancements

### Short Term
- Offline mode support
- Enhanced error recovery
- Bulk operations support
- Better loading indicators

### Long Term
- Real-time synchronization
- Advanced user permissions
- LMID sharing capabilities
- Analytics integration

---

## 🔗 Related Files
- **Recording System**: `recording.js` - Audio recording functionality
- **Page Authorization**: `rp.js` - Recording page access control
- **File Management**: `api/delete-audio.js` - Cloud storage cleanup
- **Configuration**: `vercel.json` - Deployment settings 