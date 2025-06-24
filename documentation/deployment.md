# Deployment & Infrastructure Documentation

## 📋 Overview

**Purpose**: Complete deployment guide and infrastructure documentation for Little Microphones  
**Platform**: Vercel serverless deployment with GitHub integration  
**CDN**: Bunny.net for audio file storage and delivery  
**Documentation**: `/documentation/deployment.md`

## 🏗️ Infrastructure Architecture

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │    │   Serverless    │    │  Cloud Storage  │
│                 │    │    Functions    │    │                 │
│ • Webflow Host  │◄──►│ • Vercel APIs   │◄──►│ • Bunny.net CDN │
│ • JS Assets     │    │ • Node.js 18+   │    │ • Audio Files   │
│ • User Auth     │    │ • FFmpeg Proc   │    │ • Static Assets │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   External      │    │   Automation    │    │   User Mgmt     │
│   Services      │    │   Services      │    │   Services      │
│                 │    │                 │    │                 │
│ • GitHub Repo   │    │ • Make.com      │    │ • Memberstack   │
│ • Version Ctrl  │    │ • Webhooks      │    │ • Authentication│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow
```
User Interaction → Frontend (Webflow) → JavaScript → API (Vercel) → 
Storage (Bunny.net) → CDN Delivery → User Experience
```

---

## 🚀 Vercel Deployment

### Repository Configuration
```
GitHub Repository: heyfeelings-official/little-microphones
Branch: main
Auto-Deploy: Enabled on push to main
Build Command: None (static files)
Output Directory: . (root)
```

### Project Structure
```
Little Microphones/
├── api/                    # Serverless functions
│   ├── upload-audio.js
│   ├── delete-audio.js  
│   └── combine-audio.js
├── documentation/          # System documentation
├── lm.js                  # Main dashboard script
├── recording.js           # Recording system
├── rp.js                  # Recording page auth
├── package.json           # Dependencies
├── package-lock.json      # Lockfile
└── vercel.json           # Deployment config
```

### Environment Variables (Vercel)
```bash
# Required for all API functions
BUNNY_API_KEY=your_storage_api_key_here
BUNNY_STORAGE_ZONE=your_storage_zone_name
BUNNY_CDN_URL=https://your-zone.b-cdn.net

# Optional configuration
NODE_ENV=production
```

### Vercel Configuration (`vercel.json`)
```json
{
  "functions": {
    "api/combine-audio.js": {
      "maxDuration": 60
    },
    "api/delete-audio.js": {
      "maxDuration": 30
    },
    "api/upload-audio.js": {
      "maxDuration": 10
    }
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

### Dependencies (`package.json`)
```json
{
  "name": "little-microphones",
  "version": "1.0.0",
  "dependencies": {
    "@ffmpeg-installer/ffmpeg": "^1.1.0",
    "fluent-ffmpeg": "^2.1.3"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

---

## 🌐 Bunny.net CDN Configuration

### Storage Zone Setup
```
Zone Name: little-microphones-storage
Region: Global (Multi-region)
Storage Type: Standard
Access: Private (API key required)
```

### Directory Structure
```
Root (/) [Storage Zone]
├── audio/                     # Static audio files
│   ├── spookyland/
│   │   ├── spookyland-QID1.mp3
│   │   ├── spookyland-QID2.mp3
│   │   └── ...
│   ├── shopping-spree/
│   ├── amusement-park/
│   ├── big-city/
│   ├── waterpark/
│   ├── neighborhood/
│   └── other/
│       ├── intro.mp3
│       ├── outro.mp3
│       └── monkeys.mp3
├── {lmid}/                    # User-specific folders
│   └── {world}/
│       ├── kids-world_{world}-lmid_{lmid}-question_{qid}-tm_{timestamp}.mp3
│       └── radio-program-{world}-{lmid}.mp3
└── ...
```

### API Configuration
```
Storage API URL: https://storage.bunnycdn.com
CDN URL: https://little-microphones.b-cdn.net
Authentication: API Key (stored in Vercel environment)
CORS: Enabled for cross-origin uploads
```

### File Permissions
```
Upload: API key required
Download: Public (CDN accessible)
Delete: API key required
List: API key required
```

---

## 🔗 Webflow Integration

### Script Deployment
```html
<!-- Main Dashboard (Webflow page) -->
<script src="https://little-microphones.vercel.app/lm.js"></script>

<!-- Recording Pages (Webflow pages) -->
<script src="https://little-microphones.vercel.app/rp.js"></script>
<script src="https://little-microphones.vercel.app/recording.js"></script>
```

### Custom Attributes
```html
<!-- LMID Template -->
<div id="lm-slot" style="display: none;">
  <span id="lmid-number"></span>
  <!-- Other template content -->
</div>

<!-- World Navigation -->
<a href="/rp" data-world="spookyland">Spookyland</a>

<!-- Recording Elements -->
<div class="faq1_accordion lm" data-question-id="QID9">
  <button class="record-button">Record</button>
  <canvas class="live-waveform-canvas"></canvas>
  <ul class="recording-list w-list-unstyled"></ul>
</div>
```

### Memberstack Configuration
```javascript
// Required metadata structure
memberData.metaData = {
  lmids: "1,2,3" // Comma-separated string of authorized LMIDs
}
```

---

## 🔄 CI/CD Pipeline

### Deployment Workflow
```
Developer Change → Git Commit → GitHub Push → 
Vercel Build Trigger → Function Deployment → 
Automatic URL Update → CDN Cache Invalidation
```

### Development Process
```bash
# 1. Local development
git checkout main
# Make changes to files

# 2. Testing
# Test locally in browser
# Verify console logs

# 3. Deployment
git add .
git commit -m "Descriptive commit message"
git push origin main

# 4. Automatic deployment
# Vercel detects changes
# Builds and deploys automatically
# Updates production URLs
```

### Rollback Process
```bash
# If deployment fails or issues arise:

# Option 1: Revert commit
git revert HEAD
git push origin main

# Option 2: Rollback in Vercel dashboard
# Go to Vercel project → Deployments → Previous version → Promote
```

---

## 🛡️ Security Configuration

### API Security
- **Environment variables**: Secured in Vercel dashboard
- **CORS policies**: Configured per endpoint
- **Input validation**: Implemented in all API functions
- **Error sanitization**: Safe error messages only

### CDN Security
- **Private storage**: API key required for uploads/deletes
- **Public delivery**: CDN URLs for audio playback
- **Access controls**: User-specific folder isolation
- **Rate limiting**: Bunny.net native protection

### Authentication Security
- **Memberstack integration**: Secure token validation
- **Session management**: Browser-based session handling
- **LMID authorization**: Metadata-driven access control
- **URL parameter validation**: Server-side verification

---

## 📊 Monitoring & Analytics

### Vercel Analytics
```
Function Invocations: Track API usage
Error Rates: Monitor function failures  
Response Times: Performance metrics
Build Status: Deployment success/failure
```

### Bunny.net Analytics
```
Storage Usage: File count and size
Bandwidth Usage: CDN delivery metrics
API Requests: Upload/delete operations
Error Rates: Storage operation failures
```

### Custom Logging
```javascript
// Console logging strategy
console.log('✅ Success operations');
console.warn('⚠️ Warning conditions');  
console.error('❌ Error situations');
console.info('ℹ️ Informational messages');
```

---

## 🧪 Testing & Quality Assurance

### Pre-deployment Testing
```bash
# 1. Local function testing
# Test API endpoints manually
# Verify environment variable access
# Validate file operations

# 2. Integration testing  
# Test full user workflows
# Verify Bunny.net connectivity
# Validate Memberstack integration

# 3. Performance testing
# Load test API endpoints
# Verify timeout configurations
# Test concurrent operations
```

### Production Validation
```bash
# Post-deployment checks
1. Verify all API endpoints respond
2. Test file upload/download operations
3. Validate radio program generation
4. Check error handling scenarios
5. Monitor performance metrics
```

---

## 🔧 Maintenance & Updates

### Regular Maintenance Tasks
```bash
# Weekly
- Review Vercel function logs
- Monitor storage usage growth
- Check for failed uploads/deletions
- Validate environment variables

# Monthly  
- Update dependencies (security patches)
- Review and cleanup orphaned files
- Optimize storage organization
- Performance analysis and optimization

# Quarterly
- Infrastructure cost analysis
- Security audit and updates
- Feature usage analytics review
- Capacity planning and scaling
```

### Dependency Updates
```bash
# Check for updates
npm audit
npm outdated

# Update packages
npm update
npm audit fix

# Test and deploy
git add package*.json
git commit -m "Update dependencies"
git push origin main
```

### Emergency Procedures
```bash
# Service outage response
1. Check Vercel status dashboard
2. Verify Bunny.net service status  
3. Review recent deployments
4. Check environment variables
5. Implement rollback if necessary

# Data recovery procedures
1. Verify Bunny.net backup policies
2. Check user data integrity
3. Restore from known good state
4. Communicate with affected users
```

---

## 💰 Cost Management

### Vercel Costs
```
Plan: Pro Plan (recommended)
Function Executions: Pay per invocation
Bandwidth: Included in plan
Build Minutes: Included in plan
```

### Bunny.net Costs
```
Storage: Pay per GB stored
Bandwidth: Pay per GB delivered
API Requests: Minimal cost per operation
Geographic regions: Global pricing
```

### Cost Optimization
- **Efficient file cleanup**: Regular orphaned file removal
- **Optimal file formats**: Compressed audio formats
- **CDN efficiency**: Leverage caching strategies
- **Function optimization**: Minimize execution time

---

## 🚀 Scaling Considerations

### Current Limitations
- **Vercel function limits**: 10-second default timeout
- **FFmpeg processing**: Memory and CPU constraints
- **Concurrent users**: Serverless scaling limitations
- **Storage growth**: Linear cost scaling

### Scaling Strategies
- **Function optimization**: Code efficiency improvements
- **Caching implementation**: Reduce redundant operations
- **Database optimization**: Efficient IndexedDB usage
- **CDN optimization**: Global content delivery

---

## 🔗 External Dependencies

### Critical Services
1. **GitHub**: Source code repository and version control
2. **Vercel**: Serverless hosting and deployment platform
3. **Bunny.net**: CDN and storage infrastructure
4. **Memberstack**: User authentication and management
5. **Make.com**: Webhook automation for user operations
6. **Webflow**: Frontend hosting and UI framework

### Service Health Monitoring
- **Status pages**: Monitor all service status dashboards
- **Redundancy planning**: Identify single points of failure
- **Backup strategies**: Data protection and recovery plans
- **Alternative providers**: Contingency planning for critical services

---

## 📚 Additional Resources

### Documentation Links
- [Vercel Documentation](https://vercel.com/docs)
- [Bunny.net API Documentation](https://docs.bunny.net/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Memberstack Documentation](https://www.memberstack.com/docs)

### Support Contacts
- **Vercel Support**: Technical deployment issues
- **Bunny.net Support**: Storage and CDN problems
- **Memberstack Support**: Authentication concerns
- **Internal Team**: System-specific questions 

---

**Last Updated**: June 24, 2025  
**Version**: 3.1.0  
**Status**: Production Ready ✅

### Recent Updates (v3.1.0)
- **Simplified Question Ordering**: Direct numeric CMS field usage
- **Immediate Radio Generation**: No fake delays, instant processing start
- **Clean Console Logging**: 135+ lines of verbose logging removed
- **Fixed Audio File URLs**: Correct QID format for static files 