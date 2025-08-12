# 🏫 Brevo Companies Implementation

**STATUS:** Production Ready ✅  
**CREATED:** January 2025  
**VERSION:** 1.1.0 (Added automatic unlinking from old Companies)

## 🎯 **OVERVIEW**

Complete implementation of Brevo Companies for school/organization management, integrated as a NON-BREAKING addition to existing Contact synchronization. Version 1.1.0 adds automatic unlinking when educator changes school.

## 🔄 **INTEGRATION ARCHITECTURE**

### **✅ SAFE IMPLEMENTATION:**
```
Existing Contact Sync → SUCCESS → Unlink Old Company → Create/Update Company → Link New Company
                    ↓
                    FAILURE → Return (no Company sync attempted)
```

### **🔒 NON-BREAKING GUARANTEES:**
- ✅ **Contact sync unchanged** - All existing functionality preserved
- ✅ **Company sync optional** - Failures don't affect Contact sync  
- ✅ **Backward compatible** - Existing API responses unchanged
- ✅ **Error isolated** - Company errors logged but don't break flow
- ✅ **Automatic unlinking** - Prevents multiple Company links (v1.1.0)
- ✅ **One Contact = One Company** - Clean relationship management

## 📋 **COMPANY DATA MAPPING**

### **Data Source: Educator Onboarding**
URL: `https://hey-feelings-v2.webflow.io/members/educators/onboarding`

### **DATA STRUCTURE:**
- **Company Name:** School name from `place-name` field
- **Company Attributes (lowercase_underscore required!):** 
  - `school_id` - Google Place ID (unique key)
  - `school_name` - Institution name
  - `school_city`, `school_country` - Location
  - `school_street_address` - Street address
  - `school_postal_code`, `school_state_province` - Address details
  - `school_phone`, `school_website` - Contact info
  - `school_latitude`, `school_longitude` - GPS coordinates

## 🏗️ **COMPANY DEDUPLICATION**

### **Unique School Identification:**
```javascript
// Priority 1: Google Place ID (most reliable)
school_id: "ChIJgRxIqq1bH0cRAxg3vJdrJEk"

// Priority 2: Name + City combination (fallback)
key: "szkola_podstawowa_nr_11_siedlce_poland"
```

### **🎯 FLOW:**
1. Extract school data from Memberstack member
2. Check if educator/therapist (skip parents)
3. Search existing Company by place_id OR name+city
4. Create/Update Company with school attributes
5. **Unlink Contact from old Company if exists** (v1.1.0)
6. Link Contact to new Company
7. Update COMPANY/COMPANY_ID attributes on Contact
8. Return result (non-blocking)

## 🚀 **KEY FUNCTIONS**

### **`createOrUpdateSchoolCompany(schoolData)`**
- Creates new Company or updates existing
- Deduplication by Google Place ID (primary) or name+city (fallback)
- Returns Company ID for linking

### **`unlinkContactFromAllCompanies(email)`** (v1.1.0)
- Finds Contact's current Company via COMPANY_ID attribute
- Unlinks Contact from that Company
- Clears COMPANY and COMPANY_ID attributes
- Prevents Contact being linked to multiple Companies

### **`linkContactToSchoolCompany(email, companyId, companyName)`** 
- Gets Contact numeric ID for linking
- Links Contact to Company via `/companies/link-unlink/{id}`
- Updates COMPANY and COMPANY_ID attributes
- Non-blocking operation

### **`handleMemberSchoolCompanySync(memberData, contactEmail)`**
- Main orchestrator function
- Extracts school data and manages full sync flow
- Called after successful Contact sync

## 📊 **SYNC SCENARIOS**

### **1. New Educator Registration:**
```
Memberstack Webhook → Contact Created → Company Created → Contact Linked
```

### **2. Educator Profile Update (Same School):**
```
Memberstack Update → Contact Updated → Company Updated → Linking Verified
```

### **3. Educator Changes School (v1.1.0):**
```
School Change → Contact Updated → Unlink Old Company → Create/Find New Company → Link New Company
```

### **4. Parent Registration:**
```
Memberstack Webhook → Contact Created → Company Sync SKIPPED
```

## 🔧 **TECHNICAL DETAILS**

### **API Endpoints Used:**
- `GET /companies?limit=500` - Search existing companies
- `POST /companies` - Create new company
- `PATCH /companies/{id}` - Update existing company
- `PATCH /companies/link-unlink/{id}` - Link/unlink contacts
- `GET /contacts/{email}` - Get contact details with numeric ID

### **Company Creation:**
```javascript
// Company data sent to Brevo (attributes MUST be lowercase_underscore!)
{
  name: "Szkola Podstawowa Nr.11 Im.Jana Pawla II",
  attributes: {
    school_id: "ChIJgRxIqq1bH0cRAxg3vJdrJEk",  // Google Place ID (key field)
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

### **Contact Linking:**
```javascript
// Unlink from old Company first (v1.1.0)
unlinkContactFromAllCompanies(contactEmail)

// Link Contact to new Company
linkContactToSchoolCompany(contactEmail, companyId, companyName)
```

## 📋 **FIELD MAPPINGS**

### **Memberstack Webhook → Company Attributes:**
| Webhook Field | Company Attribute | Type | Notes |
|-------------------|-------------------|------|-------|
| place-name | school_name | Text | School name |
| place-id | school_id | Text | **KEY: Google Place ID for deduplication** |
| city | school_city | Text | City name |
| country | school_country | Text | Country name |
| street-address | school_street_address__memberdata_customfiel | Text | Truncated internal name |
| zip | school_postal_code | Text | Postal code |
| state | school_state_province | Text | State/Province |
| phone | school_phone | Text | Phone number |
| website | school_website | Text | Website URL |
| latitude | school_latitude | Text | GPS latitude |
| longitude | school_longitude | Text | GPS longitude |
| address-result | school_address | Text | Full address string |

## 🧪 **TESTING & VERIFICATION**

### **Test Endpoint:** `/api/test-companies`

#### **Available Tests:**
```
GET /api/test-companies?action=test_creation
GET /api/test-companies?action=test_search  
GET /api/test-companies?action=test_extraction
GET /api/test-companies?action=test_educator_flow&email=test@school.com
```

### **Verify in Brevo Dashboard:**
1. **Companies:** CRM → Companies → Search by name
2. **Attributes:** View all school data fields
3. **Linking:** Check linkedContactsIds array
4. **Contact:** Check COMPANY and COMPANY_ID attributes

## 🛠 **TROUBLESHOOTING**

### **Company not created:**
- Check if member has school data: `place-name`, `city` fields
- Verify educator role: `role = "Teacher"` or plan contains "educators"
- Check field mapping: webhook sends WITHOUT "school-" prefix
- Verify API logs for detailed error messages

### **Contact not unlinking from old Company:**
- Check if Contact has COMPANY_ID attribute set
- Verify old Company still exists in Brevo
- Check `/companies/link-unlink/{id}` API response

### **Field mapping issues:**
- Webhook fields: `place-name`, `city`, `phone` (no prefix)
- Memberstack UI: `school-place-name`, `school-city` (with prefix)
- Company attributes: `school_name`, `school_city` (lowercase_underscore)

## 📈 **BREVO DASHBOARD IMPACT**

### **New Company Data Available:**
- **Companies List:** All schools as separate entities
- **Company Attributes:** Rich school information
- **Contact-Company Links:** Teachers linked to schools
- **Segmentation:** Company-based segments possible

### **Enhanced Email Templates:**
```javascript
// New template variables available:
{{company.name}}           // School name
{{company.school_city}}    // School location  
{{company.school_website}} // School website
{{company.school_phone}}   // School phone

// Combined personalization:
"Hello {{contact.FIRSTNAME}} from {{company.name}} in {{company.school_city}}"
```

## 🎛️ **OPERATIONAL NOTES**

### **Automatic Processing:**
- **Educators/Therapists:** Automatic Company creation and linking
- **Parents:** Skipped (no Company processing)
- **Existing Contacts:** Retroactive Company processing on next sync
- **School Changes:** Automatic unlinking and relinking (v1.1.0)

### **Error Handling:**
- Company creation errors don't affect Contact sync
- Missing school data → Company sync skipped gracefully  
- API failures → Logged warnings, Contact sync continues
- Unlinking failures → Logged but doesn't block new linking

### **Performance:**
- Additional API calls only for educators with school data
- Deduplication prevents Company proliferation
- Async Company sync doesn't block Contact sync
- Unlinking adds ~1 second to school change sync

## 🚀 **VERSION HISTORY**

### **v1.0.0 (January 2025)**
- Initial Companies implementation
- School data extraction and mapping
- Company creation with deduplication
- Contact linking to Companies

### **v1.1.0 (January 2025)**
- Added `unlinkContactFromAllCompanies()` function
- Automatic unlinking when educator changes school
- Prevents multiple Company links per Contact
- Clears old COMPANY/COMPANY_ID attributes

## 🎯 **NEXT STEPS**

1. **Monitor Company operations** in production
2. **Track school changes** and unlinking success
3. **Add Company analytics** to dashboard
4. **Implement Company-based** email campaigns
5. **Create school district** hierarchies (future)

---

**IMPLEMENTATION COMPLETE:** Companies functionality fully integrated with automatic unlinking for school changes. Non-breaking enhancement to existing Contact sync.