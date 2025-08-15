# Little Microphones System Architecture v4.7.0

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [File Organization by Function](#file-organization-by-function)
4. [Component Dependencies](#component-dependencies)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)

## 🎯 System Overview

Little Microphones is an educational audio recording platform that allows teachers to create unique program IDs (LMIDs) for students to record audio responses to questions. The system generates professional radio-style programs from these recordings.

### Key Features
- **Multi-tenant System**: Teachers create LMIDs, students record under those IDs
- **Audio Recording**: Browser-based recording with real-time feedback
- **Radio Generation**: Professional audio mixing with FFmpeg
- **Secure Sharing**: ShareID-based public access to generated programs
- **Cross-device Sync**: Cloud-first architecture with CDN storage

## 🛠 Technology Stack

### Frontend
- **Core**: Vanilla JavaScript (ES5/ES6 compatible for Webflow)
- **UI Framework**: Webflow (visual development platform)
- **Audio**: Web Audio API, MediaRecorder API
- **Storage**: IndexedDB (local), Bunny.net CDN (cloud)
- **Auth**: Memberstack (third-party authentication)

### Backend
- **Runtime**: Node.js 18.x on Vercel serverless
- **Database**: Supabase (PostgreSQL)
- **Storage**: Bunny.net CDN
- **Audio Processing**: FFmpeg via fluent-ffmpeg
- **API**: RESTful endpoints via Vercel Functions

### Infrastructure
- **Hosting**: Vercel (serverless functions + static hosting)
- **CDN**: Bunny.net (audio file storage and delivery)
- **Database**: Supabase (managed PostgreSQL)
- **Auth Provider**: Memberstack (user management)
- **CRM/Email**: Brevo (contact management, companies, email marketing)
- **Automation**: Make.com (webhooks and workflows)

## 📁 File Organization by Function

### 1. **Entry Points & Page Controllers**
```
├── little-microphones.js   # Dashboard controller (main entry)
├── record.js              # Recording page controller
├── radio.js               # Radio player page controller
└── config.js              # Global configuration
```

### 2. **Recording System** (`/recording/`)
```
recording/
├── recording.js           # Main recording orchestrator (2198 lines)
├── recording-ui.js        # UI component factory (856 lines)
├── recording-audio.js     # Audio capture & processing (610 lines)
├── recording-storage.js   # Storage management (636 lines)
└── recording-radio.js     # Radio generation logic (520 lines)
```

### 3. **Backend API** (`/api/`)
```
api/
├── combine-audio.js       # FFmpeg audio processing (680 lines)
├── upload-audio.js        # CDN upload handler (175 lines)
├── delete-audio.js        # File cleanup service (415 lines)
├── list-recordings.js     # Recording enumeration (203 lines)
├── get-radio-data.js      # Radio data fetching (251 lines)
├── get-share-link.js      # ShareID generation (172 lines)
├── get-world-info.js      # World metadata (75 lines)
├── get-teacher-data.js    # Teacher info retrieval (119 lines)
├── lmid-operations.js     # LMID CRUD operations (275 lines)
├── memberstack-webhook.js # User registration webhook + Brevo sync (267 lines)
├── send-email-notifications.js # Brevo email sender (155 lines)
└── test-companies.js      # Company testing endpoint (280 lines)
```

### 4. **Utilities** (`/utils/`)
```
utils/
├── lm-auth.js            # Authentication system (501 lines)
├── audio-utils.js        # Audio helpers (408 lines)
├── audio-ffmpeg.js       # FFmpeg wrappers (754 lines)
├── database-utils.js     # Database operations (424 lines)
├── lmid-utils.js         # LMID management (391 lines)
├── memberstack-utils.js  # Memberstack integration (538 lines)
├── brevo-contact-config.js  # Brevo configuration (285 lines)
├── brevo-contact-manager.js # Brevo sync engine (670 lines)
├── brevo-company-manager.js # Company management (598 lines)
├── api-utils.js          # API helpers (398 lines)
└── cache-busting.js      # Cache management (248 lines)
```

### 5. **Documentation** (`/documentation/`)
```
documentation/
├── PRD-little-microphones.md      # Product requirements
├── api-documentation.md           # API reference
├── audio-architecture.md          # Audio system design
├── deployment.md                  # Deployment guide
├── memberstack-integration.md     # Auth integration
├── webflow-integration-guide.md   # Webflow setup
└── [other documentation files]
```

## 🔄 Component Dependencies

### Dependency Graph
```
config.js (Global Configuration)
    ↓
utils/lm-auth.js (Authentication Layer)
    ↓
┌─────────────────┬──────────────────┬─────────────────┐
│                 │                  │                 │
little-microphones.js    record.js         radio.js
(Dashboard)         (Recording Page)    (Player Page)
    │                    │                  │
    │                    ↓                  │
    │            recording/*.js             │
    │            (Recording System)         │
    │                    │                  │
    └────────────────────┴──────────────────┘
                         │
                         ↓
                    api/*.js
                (Backend Services)
```

### Load Order Requirements
1. `config.js` - Must load first (global configuration)
2. `utils/lm-auth.js` - Authentication system
3. Page-specific controllers load their dependencies
4. Recording system modules load on-demand

## 🌊 Data Flow Architecture

### Recording Flow
```
User Action → MediaRecorder → IndexedDB → Upload Queue → Bunny CDN
                                ↓
                        Progress Updates
                                ↓
                            UI Feedback
```

### Radio Generation Flow
```
Collect Recordings → Build Audio Plan → Send to API → FFmpeg Processing
                                                            ↓
                                                     Upload to CDN
                                                            ↓
                                                     Return URL
                                                            ↓
                                                     Player UI
```

### Authentication Flow
```
Page Load → Check Memberstack → Validate LMID → Load UI
                    ↓
            Get Member Metadata
                    ↓
            Verify Permissions
```

### CRM Sync Flow (Brevo)
```
Memberstack Event → Webhook → Sync Contact to Brevo → Create/Update Company
                                     ↓                         ↓
                              32 Custom Attributes     Link Contact to Company
                                     ↓
                              Dynamic Segmentation
```

## 🔒 Security Architecture

### Multi-Layer Security
1. **Frontend Authentication**: Memberstack session validation
2. **LMID Authorization**: Metadata-based access control
3. **API Security**: Request validation and rate limiting
4. **Storage Security**: Signed URLs and access tokens

### Access Control Model
```
Teacher Account
    ↓
Creates LMIDs (max 5)
    ↓
Each LMID has 6 ShareIDs (one per world)
    ↓
Parents use ShareID to register
    ↓
Children access via parent's LMID
```

## 🚀 Deployment Architecture

### Infrastructure Overview
```
GitHub Repository
    ↓
Vercel (Automatic Deployment)
    ├── Static Assets (JS/HTML/CSS)
    ├── Serverless Functions (/api/*)
    └── Environment Variables
    
Supabase Database
    ├── lmids table
    ├── share_ids table
    └── Row-level security
    
Bunny.net CDN
    ├── /audio/ (static files)
    └── /{lmid}/{world}/ (recordings)
    
Memberstack
    ├── User accounts
    └── Metadata storage
    
Brevo CRM
    ├── Contact management (32 attributes)
    ├── Company entities (schools)
    ├── Dynamic segments
    └── Email templates
```

### Environment Variables
```
# Bunny.net CDN
BUNNY_STORAGE_API_KEY
BUNNY_STORAGE_ZONE_NAME
BUNNY_CDN_URL

# Supabase
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

# Memberstack
MEMBERSTACK_SECRET_KEY
MEMBERSTACK_WEBHOOK_SECRET

# Brevo
BREVO_API_KEY
BREVO_EDUCATOR_TEMPLATE_PL
BREVO_PARENT_TEMPLATE_PL
BREVO_EDUCATOR_TEMPLATE_EN
BREVO_PARENT_TEMPLATE_EN

# System
NODE_ENV
```

## 📊 Performance Considerations

### Optimizations
- **Lazy Loading**: Recording modules load on-demand
- **CDN Delivery**: All audio files served from edge locations
- **Parallel Processing**: Multiple recordings upload simultaneously
- **Background Upload**: Non-blocking UI during uploads
- **Efficient Queries**: Indexed database operations

### Scalability
- **Serverless Architecture**: Auto-scaling with demand
- **CDN Storage**: Unlimited audio storage capacity
- **Database Pooling**: Connection management in Supabase
- **Stateless Design**: No server-side session storage

## 🔧 Maintenance & Monitoring

### Key Metrics
- Recording success rate
- Upload completion rate
- Radio generation time
- API response times
- Storage usage

### Error Handling
- Comprehensive try-catch blocks
- User-friendly error messages
- Automatic retry mechanisms
- Detailed console logging (development)
- Sentry integration (planned)

---

**Last Updated**: January 2025  
**Version**: 4.8.0 (Added Brevo CRM Integration)
**Status**: Production Ready ✅ 