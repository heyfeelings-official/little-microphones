# 🚀 Brevo Integration - Complete Documentation

**VERSION:** 2.0.0 (January 2025)  
**STATUS:** Production Ready ✅  
**ARCHITECTURE:** Lists + Attributes + Companies + Dynamic Segments

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Data Synchronization](#data-synchronization)
5. [Companies System](#companies-system)
6. [Email Notifications](#email-notifications)
7. [Deployment & Configuration](#deployment--configuration)
8. [API Reference](#api-reference)

## 🎯 Overview

Complete CRM integration with Brevo (formerly Sendinblue) providing:
- **Contact Management**: 32 custom attributes per contact
- **Company Management**: School/organization entities with contact linking
- **Email Marketing**: Personalized transactional and marketing emails
- **Dynamic Segmentation**: Attribute-based audience targeting
- **Webhook Sync**: Real-time Memberstack → Brevo synchronization

### Key Features
- ✅ **Automatic Contact Sync** from Memberstack webhooks
- ✅ **Company Creation** for schools with deduplication
- ✅ **Contact Unlinking** when educator changes school
- ✅ **Rich Personalization** using 32 contact attributes
- ✅ **Plan-Based Segmentation** (free/paid/trial)
- ✅ **Multi-Language Support** (PL/EN)

## 🏗 Architecture

### System Components
```
Memberstack (Auth & User Data)
    ↓ webhook
memberstack-webhook.js
    ↓
syncMemberToBrevo()
    ├→ Contact Creation/Update (brevo-contact-manager.js)
    └→ Company Creation/Linking (brevo-company-manager.js)
        ↓
    Brevo Platform
    ├→ Contacts (Main List #2)
    ├→ Companies (Schools/Organizations)  
    ├→ Dynamic Segments
    └→ Email Templates
```

### Data Flow
```
1. User Registration/Update in Webflow/Memberstack
2. Webhook triggers to /api/memberstack-webhook
3. Contact synced to Brevo with 32 attributes
4. Company created/updated if educator
5. Contact linked to Company
6. Available for segmentation and emails
```

## 📦 Components

### Core Files

#### 1. **`utils/brevo-contact-config.js`** (285 lines)
Configuration and mapping for plans and attributes:
```javascript
// Plan definitions with Brevo mapping
PLAN_CONFIGS = {
  'pln_free-plan-dhnb0ejd': {
    brevoCategory: 'parents',
    brevoType: 'free',
    brevoName: 'Parents Free'
  },
  'pln_educators-free-e2fa0u1r': {
    brevoCategory: 'educators',
    brevoType: 'free',
    brevoName: 'Educators Free'
  }
  // ... 8 total plans
}

// Attribute mappings (32 total)
BREVO_ATTRIBUTES = {
  MEMBERSTACK_ID, USER_CATEGORY, PLAN_TYPE, PLAN_NAME,
  SCHOOL_NAME, SCHOOL_CITY, SCHOOL_COUNTRY,
  EDUCATOR_ROLE, EDUCATOR_NO_KIDS, LMIDS,
  // ... and 22 more
}
```

#### 2. **`utils/brevo-contact-manager.js`** (670 lines)
Main contact synchronization engine:
```javascript
// Core functions
makeBrevoRequest()      // HTTP client for Brevo API
getBrevoContact()       // Fetch existing contact
createOrUpdateBrevoContact() // Contact CRUD operations
syncMemberToBrevo()     // Main sync orchestrator

// Sync scenarios handled:
1. No plan + existing contact → Preserve plan data
2. No plan + no contact → Create basic contact
3. Active plan → Full sync with all attributes
```

#### 3. **`utils/brevo-company-manager.js`** (598 lines) v1.1.0
School/organization Companies management:
```javascript
// Core functions
extractSchoolDataFromMember()  // Extract school data from member
generateSchoolCompanyKey()      // Create unique school identifier
findSchoolCompanyByData()       // Search by place_id or name+city
createOrUpdateSchoolCompany()   // Company CRUD with deduplication
unlinkContactFromAllCompanies() // Unlink from old Company (v1.1.0)
linkContactToSchoolCompany()    // Link Contact to Company
handleMemberSchoolCompanySync()  // Orchestrator function

// Company attributes (lowercase with underscore required!)
school_id         // Google Place ID (unique key)
school_name       // School name
school_city       // City
school_country    // Country
school_phone      // Phone number
school_website    // Website URL
school_latitude   // GPS latitude
school_longitude  // GPS longitude
// ... 12 total attributes
```

#### 4. **`api/memberstack-webhook.js`** (267 lines)
Webhook receiver and sync trigger:
```javascript
// Handles events:
- member.created    // New user registration
- member.updated    // Profile/plan changes
- member.deleted    // Account deletion

// Triggers:
1. Contact sync to Brevo
2. Company sync for educators
3. Error logging and recovery
```

#### 5. **`api/send-email-notifications.js`** (155 lines)
Email notification system:
```javascript
// Sends personalized emails using Brevo templates
// Enriches with contact data from Brevo
// Supports teacher/parent templates in PL/EN
```

## 🔄 Data Synchronization

### Contact Attributes (32 Total)

#### Identity & Auth
- `MEMBERSTACK_ID` - Unique member ID
- `FIRSTNAME`, `LASTNAME` - Name components
- `PHONE` - Phone number
- `LANGUAGE_PREF` - pl/en preference

#### Plan Information
- `USER_CATEGORY` - parents/educators/therapists
- `PLAN_TYPE` - free/paid
- `PLAN_NAME` - Human-readable plan name
- `PLAN_ID` - Memberstack plan ID
- `PLAN_STATUS` - active/inactive
- `PLAN_INTERVAL` - monthly/yearly

#### School/Organization (Educators)
- `SCHOOL_NAME` - Institution name
- `SCHOOL_CITY`, `SCHOOL_COUNTRY` - Location
- `SCHOOL_ADDRESS` - Full address
- `SCHOOL_PHONE`, `SCHOOL_WEBSITE` - Contact info
- `SCHOOL_PLACE_ID` - Google Place ID (unique)
- `SCHOOL_LATITUDE`, `SCHOOL_LONGITUDE` - GPS coords
- `SCHOOL_RATING` - Google rating
- `SCHOOL_FACILITY_TYPE` - School type

#### Professional Details
- `EDUCATOR_ROLE` - Teacher/Principal/Admin
- `EDUCATOR_NO_KIDS` - Student count
- `EDUCATOR_NO_CLASSES` - Class count
- `TEACHER_NAME` - Full educator name
- `PARENT_COUNT` - Parents in system
- `INVITATION_CODE` - Unique invite code

#### System Metadata
- `LMIDS` - Assigned LMID numbers
- `REGISTRATION_DATE` - Account creation
- `LAST_SYNC` - Last Brevo sync
- `SOURCE` - Registration source
- `COMPANY`, `COMPANY_ID` - Linked Company

### Synchronization Scenarios

#### 1. **New Registration**
```
Webflow Form → Memberstack → Webhook → Create Contact → Create Company → Link
```

#### 2. **Profile Update**
```
Edit Profile → Memberstack → Webhook → Update Contact → Update Company
```

#### 3. **School Change**
```
Change School → Webhook → Update Contact → Unlink Old Company → Link New Company
```

#### 4. **Plan Upgrade**
```
Upgrade Plan → Webhook → Update Contact Attributes → Segment Updates
```

## 🏢 Companies System

### Overview
Schools and organizations are stored as Brevo Companies, allowing:
- **Relationship Mapping**: See all educators from same school
- **Deduplication**: One Company per school (by Google Place ID)
- **Contact Linking**: Educators linked to their school Company
- **Automatic Unlinking**: Remove from old Company on school change

### Company Identification
```javascript
// Priority 1: Google Place ID (most reliable)
school_id: "ChIJgRxIqq1bH0cRAxg3vJdrJEk"

// Priority 2: Name + City combination (fallback)
key: "szkola_podstawowa_nr_11_siedlce_poland"
```

### Company Attributes
```javascript
{
  name: "Szkola Podstawowa Nr.11 Im.Jana Pawla II",
  attributes: {
    school_id: "ChIJgRxIqq1bH0cRAxg3vJdrJEk",      // Google Place ID
    school_name: "Szkola Podstawowa Nr.11",
    school_city: "Siedlce",
    school_country: "Poland",
    school_street_address: "5 Wiśniowa",
    school_postal_code: "08-110",
    school_state_province: "Mazowieckie",
    school_phone: "25 794 36 81",
    school_website: "http://sp11.siedlce.pl/",
    school_latitude: "52.174817",
    school_longitude: "22.280589"
  }
}
```

### Linking Flow (v1.1.0)
```javascript
// When educator changes school:
1. Extract new school data
2. Find/Create new Company
3. Unlink Contact from old Company ← NEW in v1.1.0
4. Link Contact to new Company
5. Update COMPANY attributes on Contact
```

## 📧 Email Notifications

### Template System
```javascript
// Templates in Brevo Dashboard
BREVO_TEACHER_TEMPLATE_PL = 1  // Polish teacher
BREVO_PARENT_TEMPLATE_PL = 2   // Polish parent
BREVO_TEACHER_TEMPLATE_EN = 4  // English teacher
BREVO_PARENT_TEMPLATE_EN = 6   // English parent
```

### Available Template Variables
```handlebars
{{params.teacherName}}       // Full teacher name
{{params.parentName}}        // Full parent name
{{params.firstName}}         // First name only
{{params.schoolName}}        // School name
{{params.schoolCity}}        // School city
{{params.educatorRole}}      // Teacher/Principal
{{params.studentCount}}      // Number of students
{{params.planName}}          // Hey Feelings Pro
{{params.world}}            // Recording world
{{params.lmid}}             // LMID number
{{params.dashboardUrl}}     // Dashboard link
{{params.radioUrl}}         // Radio player link
```

### Email Enhancement (v2.0)
- **Brevo-First**: All personalization from Brevo data
- **Plan-Based**: Different templates for free/paid
- **Rich Content**: 32 attributes available
- **Fallback Safe**: Graceful handling of missing data

## 🚀 Deployment & Configuration

### Environment Variables
```bash
# Brevo API
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxx
BREVO_API_URL=https://api.brevo.com/v3

# Brevo Templates
BREVO_TEACHER_TEMPLATE_PL=1
BREVO_PARENT_TEMPLATE_PL=2
BREVO_TEACHER_TEMPLATE_EN=4
BREVO_PARENT_TEMPLATE_EN=6

# Memberstack
MEMBERSTACK_SECRET_KEY=sk_live_xxxxx
MEMBERSTACK_WEBHOOK_SECRET=whsec_xxxxx
```

### Brevo Dashboard Setup

#### 1. Create Main List
```
Contacts → Lists → Create List
Name: "Hey Feelings List"
ID: 2 (referenced in code)
```

#### 2. Configure Attributes
```
Contacts → Contact Attributes → Create Attribute
- Type: Text/Number/Date as needed
- Name: SCHOOL_NAME, PLAN_TYPE, etc.
- Total: 32 custom attributes
```

#### 3. Create Company Attributes
```
CRM → Companies → Attributes
All attributes MUST be lowercase_with_underscore:
- school_id (Text) - Google Place ID
- school_name (Text)
- school_city (Text)
// ... etc
```

#### 4. Create Dynamic Segments
```
Contacts → Segments → Create Segment
Examples:
- "Educators Free": USER_CATEGORY = "educators" AND PLAN_TYPE = "free"
- "Warsaw Schools": SCHOOL_CITY = "Warsaw"
- "Large Schools": EDUCATOR_NO_KIDS > 100
```

### Testing

#### Test Contact Sync
```bash
curl -X POST https://your-domain.vercel.app/api/memberstack-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "member.updated",
    "payload": {
      "id": "mem_test123",
      "auth": {"email": "test@school.edu"},
      "customFields": {
        "first-name": "Test",
        "place-name": "Test School",
        "city": "Warsaw"
      }
    }
  }'
```

#### Test Company Operations
```bash
# Use test endpoint
curl https://your-domain.vercel.app/api/test-companies?action=test_creation
```

## 📊 API Reference

### Brevo API Endpoints Used

#### Contacts
- `GET /contacts/{email}` - Get contact details
- `POST /contacts` - Create contact
- `PUT /contacts/{email}` - Update contact
- `DELETE /contacts/{email}` - Delete contact
- `POST /contacts/lists/{listId}/contacts/add` - Add to list

#### Companies  
- `GET /companies?limit=500` - List all companies
- `POST /companies` - Create company
- `PATCH /companies/{id}` - Update company
- `DELETE /companies/{id}` - Delete company
- `PATCH /companies/link-unlink/{id}` - Link/unlink contacts

#### Email
- `POST /smtp/email` - Send transactional email

### Internal API Endpoints

#### `/api/memberstack-webhook`
Receives Memberstack events and triggers sync
```javascript
POST /api/memberstack-webhook
Headers: {
  "svix-signature": "...",
  "svix-timestamp": "...",
  "svix-id": "..."
}
Body: {
  "event": "member.updated",
  "payload": { /* member data */ }
}
```

#### `/api/send-email-notifications`
Sends notification emails via Brevo
```javascript
POST /api/send-email-notifications
Body: {
  "recipientEmail": "teacher@school.edu",
  "world": "Forest",
  "lmid": "123",
  "dashboardUrl": "https://...",
  "radioUrl": "https://..."
}
```

## 🔍 Monitoring & Debugging

### Check Sync Status
1. **Brevo Dashboard**: Contacts → Search by email
2. **Check Attributes**: View all 32 synced fields
3. **Check Company**: CRM → Companies → Search
4. **Check Linking**: View linkedContactsIds in Company

### Common Issues & Solutions

#### Contact Not Syncing
- Check webhook delivery in Memberstack
- Verify MEMBERSTACK_WEBHOOK_SECRET
- Check Vercel logs for errors

#### Company Not Created
- Verify educator has school data
- Check field mapping (place-name, city, etc.)
- Ensure role = "Teacher/Principal"

#### Contact Not Unlinking
- Check COMPANY_ID attribute exists
- Verify old Company still exists
- Check for API errors in logs

### Debug Logging
```javascript
// Enable detailed logging
console.log(`📋 [${syncId}] Sync details:`, {
  hasCustomFields: !!memberData.customFields,
  placeName: memberData.customFields?.['place-name'],
  role: memberData.customFields?.['role'],
  companyResult: companyResult
});
```

## 📈 Performance & Scaling

### Current Capacity
- **Contacts**: Unlimited (Brevo plan dependent)
- **Companies**: 10,000+ supported
- **Attributes**: 32 custom fields
- **API Calls**: 400 req/second limit
- **Webhook Processing**: < 2 seconds average

### Optimization Strategies
1. **Company Deduplication**: By Google Place ID
2. **Batch Operations**: Future enhancement
3. **Caching**: Contact data cached in Brevo
4. **Async Processing**: Non-blocking webhook response

## 🚦 Version History

### v2.0.0 (January 2025)
- ✅ Complete Brevo integration
- ✅ 32 contact attributes
- ✅ Company management system
- ✅ Automatic unlinking (v1.1.0)
- ✅ Enhanced email personalization

### Future Enhancements
- [ ] Batch contact import
- [ ] Company hierarchies (districts)
- [ ] Advanced email automation
- [ ] A/B testing framework
- [ ] Analytics dashboard

---

**Last Updated**: January 2025  
**Maintained By**: Hey Feelings Development Team  
**Support**: seb@heyfeelings.com
