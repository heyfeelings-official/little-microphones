# 📚 Brevo Integration Documentation Index

**Last Updated:** January 2025  
**Version:** 2.0.0

## 🎯 Quick Start

If you're looking for specific Brevo documentation, here's where to find it:

### **Main Documentation**
- **[brevo-integration-complete.md](./brevo-integration-complete.md)** - Complete integration overview (START HERE)
- **[brevo-companies-implementation.md](./brevo-companies-implementation.md)** - Companies system v1.1.0
- **[brevo-dashboard-setup.md](./brevo-dashboard-setup.md)** - Dashboard configuration guide
- **[brevo-segments-setup.md](./brevo-segments-setup.md)** - Dynamic segments setup
- **[brevo-email-enhancement.md](./brevo-email-enhancement.md)** - Email personalization v2.0

### **API Reference**
- **[brevo.md](./brevo.md)** - OpenAPI definitions for Brevo Companies API

## 📂 File Structure

```
documentation/
├── BREVO-README.md                      # This file - index
├── brevo-integration-complete.md        # Complete system overview
├── brevo-companies-implementation.md    # Companies functionality
├── brevo-dashboard-setup.md            # Dashboard configuration
├── brevo-segments-setup.md             # Segmentation guide
├── brevo-email-enhancement.md          # Email system
└── brevo.md                            # API reference

utils/
├── brevo-contact-config.js             # Configuration (285 lines)
├── brevo-contact-manager.js            # Contact sync (670 lines)
└── brevo-company-manager.js            # Company management (598 lines)

api/
├── memberstack-webhook.js              # Webhook receiver (267 lines)
├── send-email-notifications.js         # Email sender (155 lines)
└── test-companies.js                   # Test endpoint (280 lines)
```

## 🚀 Quick Implementation Guide

### 1. **Setup Brevo Account**
```bash
# Add to .env
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxx
BREVO_TEACHER_TEMPLATE_PL=1
BREVO_PARENT_TEMPLATE_PL=2
BREVO_TEACHER_TEMPLATE_EN=4
BREVO_PARENT_TEMPLATE_EN=6
```

### 2. **Configure Dashboard**
- Create main list "Hey Feelings List" (ID: 2)
- Add 32 custom contact attributes
- Create company attributes (lowercase_underscore)
- Setup dynamic segments

### 3. **Test Sync**
```bash
# Test webhook sync
curl -X POST /api/memberstack-webhook

# Test companies
curl /api/test-companies?action=test_creation
```

## 🔄 Data Flow

```
1. User Registration/Update (Webflow/Memberstack)
           ↓
2. Webhook to /api/memberstack-webhook
           ↓
3. syncMemberToBrevo() - Contact sync with 32 attributes
           ↓
4. handleMemberSchoolCompanySync() - Company creation/linking
           ↓
5. Available in Brevo for segmentation and emails
```

## 📊 Key Features

### **Contact Management**
- ✅ 32 custom attributes per contact
- ✅ Automatic sync from Memberstack
- ✅ Plan-based categorization
- ✅ Multi-language support (PL/EN)

### **Company Management (v1.1.0)**
- ✅ School/organization entities
- ✅ Deduplication by Google Place ID
- ✅ Automatic unlinking on school change
- ✅ Contact-Company relationships

### **Email System**
- ✅ Template-based emails
- ✅ Rich personalization
- ✅ Plan-based differentiation
- ✅ Transactional & marketing

### **Segmentation**
- ✅ Dynamic segments
- ✅ Attribute-based filtering
- ✅ Real-time updates
- ✅ Complex criteria support

## 🛠 Troubleshooting

### Common Issues

**Q: Contact not syncing?**
- Check webhook delivery in Memberstack
- Verify environment variables
- Check Vercel logs

**Q: Company not created?**
- Verify educator has school data
- Check field names (no "school-" prefix in webhook)
- Ensure role = "Teacher" or similar

**Q: Contact linked to multiple Companies?**
- Update to v1.1.0 for automatic unlinking
- Check COMPANY_ID attribute on contact

## 📈 Version History

### v2.0.0 (January 2025)
- Complete Brevo integration
- 32 contact attributes
- Company management system
- Dynamic segmentation
- Enhanced email personalization

### v1.1.0 (January 2025) 
- Added automatic Company unlinking
- One Contact = One Company enforcement
- School change detection

### v1.0.0 (January 2025)
- Initial implementation
- Basic contact sync
- Company creation

## 📞 Support

**Technical Issues:** Check Vercel logs and Brevo Dashboard  
**Documentation:** See [brevo-integration-complete.md](./brevo-integration-complete.md)  
**Contact:** seb@heyfeelings.com

---

**Remember:** Always test in development before deploying to production!
