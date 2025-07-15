# Changelog - Little Microphones

## [6.0.0] - 2025-01-15 - Email Notifications Working ✅

### 🎉 Major Features Added
- **Email Notifications System**: Complete Brevo integration for parent uploads
- **Multi-language Email Templates**: Polish and English templates based on request language
- **Automatic Contact Management**: Brevo contacts created automatically before sending emails
- **Secure Logging**: Personal data removed from all console logs for privacy compliance

### 📧 Email Notification Features
- Teacher notifications when parents upload new recordings
- Parent notifications to other parents (excluding uploader) 
- Language-specific templates (PL: templates 1,3 / EN: templates 2,4)
- Automatic contact creation in Brevo with proper attributes
- Error resilience - upload succeeds even if email fails

### 🔒 Security & Privacy Improvements
- **Secure Logging**: All email addresses and personal data removed from logs
- **Error Handling**: Improved error messages without exposing sensitive information
- **Data Protection**: Console logs cleaned of personal identifiable information
- **Template Security**: Proper template ID validation and secure API calls

### 🛠️ Technical Improvements
- Uses official Brevo SDK (@getbrevo/brevo) instead of custom implementation
- Fixed internal API call URL issues preventing email delivery
- Improved error handling with detailed debugging information
- Streamlined logging for better monitoring without privacy concerns
- Fixed JSON parsing errors in email notification API calls

### 🧹 Code Quality
- Removed all test files and unused code from development
- Simplified console logging for production readiness
- Updated documentation with email notification architecture
- Version bump to 6.0.0 reflecting major email system completion

## [5.1.0] - 2025-01-14 - Kids, Parents and Languages Working ✅

### 🎉 Major Features Added
- **Multi-language Support**: Full localization for Polish (pl) and English (en)
- **Soft Deletion**: Safe LMID removal with data preservation
- **Enhanced Parent System**: Improved ShareID-based access for parents
- **Complete LMID-Memberstack Sync**: Real-time metadata synchronization

### 🌍 Localization Features
- Language detection from URL path (`/pl/` vs `/en/`)
- Localized audio file structure: `/{lang}/audio/{world}/`
- Language parameter preservation in UI switchers
- API endpoints accept `lang` parameter for all operations
- Automatic language context in recording and playback systems

### 🔒 Data Security Improvements
- **Soft Deletion**: LMID records marked as `status: 'deleted'` instead of hard deletion
- Historical data preservation for audit trails
- ShareID integrity maintained (no reuse of deleted ShareIDs)
- Database operation safety with rollback capabilities

### 👨‍👩‍👧‍👦 Parent & Child Features
- Seamless ShareID-based access for parents
- Automatic LMID assignment when parents visit ShareID links
- Child recording capabilities in their preferred language
- Parent dashboard integration with teacher-created programs

### 🔄 Technical Improvements
- Enhanced error handling and logging
- Improved API response formats
- Better validation and security checks
- Optimized database queries with caching
- Comprehensive testing coverage

### 📁 Files Modified
- `config.js` - Language configuration and detection
- `api/lmid-operations.js` - Soft deletion implementation
- `utils/lmid-utils.js` - Memberstack synchronization fixes
- `little-microphones.js` - Language parameter handling
- `record.js` - Localized recording system
- `radio.js` - Multi-language audio playback
- All main JS files - Language support integration

### 🐛 Bug Fixes
- Fixed hard deletion causing data loss
- Resolved Memberstack metadata sync issues
- Corrected language parameter loss in navigation
- Fixed ShareID reuse vulnerabilities
- Improved error messaging and user feedback

### ✅ Production Ready
- All systems tested and verified working
- Teachers can create and manage LMID programs
- Parents can access programs via ShareID
- Children can record in their preferred language
- Data integrity and security maintained
- Real-time synchronization between all systems

---

## Previous Versions

### [4.4.0] - 2025-01-06
- Initial LMID-Memberstack synchronization
- Basic multi-world support
- Teacher dashboard functionality

### [4.0.0] - 2024-12-XX
- Core recording system
- ShareID generation
- Basic parent access system 