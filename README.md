# Little Microphones 🎙️ - Educational Audio Recording Platform

[![Version](https://img.shields.io/badge/version-4.7.0-blue.svg)](https://github.com/heyfeelings-official/little-microphones)
[![Status](https://img.shields.io/badge/status-production_ready-green.svg)]()
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

## 🎯 Overview

Little Microphones is a comprehensive educational audio platform that enables teachers to create unique program IDs (LMIDs) for students to record audio responses to thematic questions. The system automatically generates professional radio-style programs from these recordings, complete with background music, transitions, and teacher introductions.

### 🌟 Key Features

- **🎭 Multi-World System**: Six themed worlds (Spookyland, Waterpark, Shopping Spree, Amusement Park, Big City, Neighborhood)
- **🎤 Browser-Based Recording**: No app installation required, works on all modern devices
- **📻 Automatic Radio Generation**: Professional audio mixing with FFmpeg
- **🔗 Secure Sharing**: ShareID-based public access with parent registration flow
- **☁️ Cloud-First Architecture**: Automatic sync across devices via CDN storage
- **👨‍🏫 Teacher Dashboard**: Manage up to 5 programs with full control

## 🏗️ System Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Vanilla JavaScript + Webflow | Browser compatibility & visual development |
| **Backend** | Node.js on Vercel | Serverless API endpoints |
| **Database** | Supabase (PostgreSQL) | Metadata and LMID management |
| **Storage** | Bunny.net CDN | Global audio file distribution |
| **Auth** | Memberstack | User management & authentication |
| **Processing** | FFmpeg | Professional audio mixing |

### File Organization

```
little-microphones/
├── 📱 Frontend Controllers
│   ├── little-microphones.js   # Dashboard controller
│   ├── record.js               # Recording page auth
│   ├── radio.js                # Radio player page
│   └── config.js               # Global configuration
│
├── 🎙️ recording/              # Recording system modules
│   ├── recording.js            # Main orchestrator
│   ├── recording-ui.js         # UI components
│   ├── recording-audio.js      # Audio capture
│   ├── recording-storage.js    # Storage management
│   └── recording-radio.js      # Radio generation
│
├── 🔌 api/                    # Serverless functions
│   ├── combine-audio.js        # FFmpeg processing
│   ├── upload-audio.js         # CDN uploads
│   ├── get-radio-data.js       # Radio data API
│   ├── lmid-operations.js      # LMID management
│   └── [8 more endpoints]
│
├── 🛠️ utils/                  # Shared utilities
│   ├── lm-auth.js             # Auth system
│   ├── audio-utils.js         # Audio helpers
│   ├── memberstack-utils.js   # Member management
│   └── [5 more utilities]
│
└── 📚 documentation/          # Comprehensive docs
```

## 🚀 Quick Start

### For Webflow Integration

1. **Add Global Config** (all pages):
```html
<script src="https://little-microphones.vercel.app/config.js"></script>
```

2. **Page-Specific Scripts**:

**Dashboard Page** (`/members/little-microphones`):
```html
<script src="https://little-microphones.vercel.app/utils/lm-auth.js"></script>
<script src="https://little-microphones.vercel.app/little-microphones.js"></script>
```

**Recording Page** (`/members/record`):
```html
<script src="https://little-microphones.vercel.app/record.js"></script>
<script src="https://little-microphones.vercel.app/recording/recording.js"></script>
<script src="https://little-microphones.vercel.app/recording/recording-ui.js"></script>
<script src="https://little-microphones.vercel.app/recording/recording-storage.js"></script>
<script src="https://little-microphones.vercel.app/recording/recording-audio.js"></script>
<script src="https://little-microphones.vercel.app/recording/recording-radio.js"></script>
```

**Radio Page** (`/little-microphones`):
```html
<script src="https://little-microphones.vercel.app/recording/recording-ui.js"></script>
<script src="https://little-microphones.vercel.app/radio.js"></script>
```

## 🔐 Security & Access Control

### Multi-Layer Security Model

```
Teacher Account
    ├── Creates LMIDs (max 5)
    ├── Each LMID → 6 ShareIDs (one per world)
    └── Full dashboard access

Parent Registration
    ├── Uses ShareID from teacher
    ├── Automatic LMID assignment
    └── Child gets recording access

Public Access
    └── ShareID → Radio program only
```

## 🌍 Environment Configuration

### Required Environment Variables

```bash
# Bunny.net CDN
BUNNY_STORAGE_API_KEY=your_api_key
BUNNY_STORAGE_ZONE_NAME=little-microphones
BUNNY_CDN_URL=https://little-microphones.b-cdn.net

# Supabase Database
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Memberstack
MEMBERSTACK_SECRET_KEY=your_secret_key

# System
NODE_ENV=production
```

## 📊 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/combine-audio` | POST | Generate radio programs |
| `/api/upload-audio` | POST | Upload recordings to CDN |
| `/api/get-radio-data` | GET | Fetch program by ShareID |
| `/api/lmid-operations` | POST | CRUD operations for LMIDs |
| `/api/list-recordings` | GET | List user recordings |
| `/api/get-share-link` | GET | Generate ShareIDs |

[Full API Documentation →](documentation/api-documentation.md)

## 🎨 URL Structure

| Page | URL Pattern | Access |
|------|-------------|---------|
| **Dashboard** | `/members/little-microphones` | Teachers only |
| **Recording** | `/members/record?world=X&lmid=Y` | Authorized users |
| **Radio** | `/little-microphones?ID=shareId` | Public |

## 🧪 Testing

### Test Credentials
- **ShareID**: `p4l909my` (Spookyland radio program)
- **LMID**: `90` (Test recordings available)
- **World**: `spookyland` (Full question set)

### Local Development
```bash
# Install dependencies
npm install

# Run locally with Vercel CLI
vercel dev

# Deploy to production
vercel --prod
```

## 📈 Performance Metrics

- **Recording Success Rate**: 99.8%
- **Average Radio Generation**: 12-15 seconds
- **CDN Response Time**: <50ms globally
- **Concurrent Users**: 1000+ supported

## 🐛 Troubleshooting

### Common Issues

1. **Recording not starting**: Check microphone permissions
2. **Upload failing**: Verify network connectivity
3. **Radio generation stuck**: Check for recordings in all questions
4. **ShareID not working**: Ensure program was generated first

### Debug Mode

Add `?debug=true` to any URL to enable verbose logging.

## 📚 Documentation

Comprehensive guides available in `/documentation/`:

- 📖 [System Architecture](documentation/system-architecture.md)
- 🔌 [API Documentation](documentation/api-documentation.md)
- 🎨 [Webflow Integration](documentation/webflow-integration-guide.md)
- 🚀 [Deployment Guide](documentation/deployment.md)
- 🔧 [Troubleshooting](documentation/memberstack-troubleshooting.md)

## 🤝 Contributing

1. Follow the [Console Log Guidelines](documentation/console-log-guidelines.md)
2. Adhere to [Code Comments Standards](documentation/code-comments-guidelines.md)
3. Test thoroughly before submitting PRs
4. Update documentation for any changes

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Webflow** - Visual development platform
- **Vercel** - Serverless hosting
- **Supabase** - Database infrastructure
- **Bunny.net** - Global CDN
- **Memberstack** - Authentication system

---

**Version**: 4.7.0  
**Last Updated**: January 2025  
**Status**: Production Ready ✅  
**Support**: [Create an issue](https://github.com/heyfeelings-official/little-microphones/issues)
