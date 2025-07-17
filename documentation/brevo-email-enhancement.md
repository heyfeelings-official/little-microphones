# 📧 Brevo Email Notifications Enhancement

**STATUS:** Ready for Implementation ✅  
**CREATED:** January 2025  
**VERSION:** Enhanced v2.0

## 🎯 **OVERVIEW**

Comprehensive upgrade of email notification system to fully leverage Brevo contact data for personalized communications.

## ❌ **CURRENT ISSUES IDENTIFIED:**

### 1. **Mixed Data Sources**
- Upload API sends hardcoded template data
- Email API enriches with Brevo data but keeps fallbacks
- **Result:** Inconsistent personalization

### 2. **Limited Personalization**
- Using only basic fields (name, school)
- Not leveraging 32 available Brevo attributes
- **Result:** Generic emails for all user types

### 3. **No Plan-Based Differentiation**
- Same templates for free vs paid users
- Missing premium user experience
- **Result:** No incentive for plan upgrades

## ✅ **ENHANCED SOLUTION**

### **New Architecture:**
```
Upload API → Minimal Data → Enhanced Email API → Full Brevo Data → Personalized Email
```

### **Key Improvements:**

#### 1. **📧 Enhanced Email API** (`send-email-notifications-improved.js`)
- **Brevo-First Approach:** Contact MUST exist in Brevo before sending
- **32 Attributes Available:** Full contact data for personalization
- **Smart Template Data:** Dynamic content generation based on user profile
- **Plan-Based Templates:** Different templates for free vs paid users

#### 2. **🎯 Comprehensive Personalization**
Available template parameters from Brevo:

```javascript
// Basic Identity
{{params.teacherName}}         // From TEACHER_NAME or FIRSTNAME+LASTNAME
{{params.parentName}}          // From FIRSTNAME+LASTNAME
{{params.firstName}}           // Individual name components

// Plan-Based
{{params.planName}}            // Hey Feelings Pro, Hey Feelings Basic
{{params.planType}}            // paid, free
{{params.isPaidUser}}          // true/false for conditional content

// School Details
{{params.schoolName}}          // Oxford Primary School
{{params.schoolCity}}          // London
{{params.schoolAddress}}       // Full address
{{params.schoolRating}}        // 4.5/5 stars
{{params.schoolType}}          // Primary School, High School

// Professional
{{params.educatorRole}}        // Teacher, Principal, Therapist
{{params.studentCount}}        // 25 students
{{params.classCount}}          // 3 classes

// Smart Generated Content
{{params.roleDescription}}     // "Teacher with 3 classes (75 students)"
{{params.schoolDescription}}   // "Oxford Primary School in London - 4.5/5 stars"
{{params.personalizedGreeting}} // "Hello Sarah! As our premium teacher"
```

#### 3. **🎨 Template Selection Logic**
```javascript
// Standard templates
BREVO_TEACHER_TEMPLATE_EN = 4
BREVO_PARENT_TEMPLATE_EN = 6

// Premium templates (future)
BREVO_TEACHER_TEMPLATE_EN_PREMIUM = 7
BREVO_PARENT_TEMPLATE_EN_PREMIUM = 8
```

#### 4. **📱 Simplified Upload API**
- Send minimal data: `world`, `lmid`, `urls`, `uploaderName`
- Remove hardcoded personalization
- Trust Brevo as single source of truth

## 🚀 **IMPLEMENTATION STEPS**

### **Phase 1: Deploy Enhanced System**
```bash
# 1. Deploy enhanced email API
cp api/send-email-notifications-improved.js api/send-email-notifications-enhanced.js

# 2. Update upload API calls
# Replace: sendNotificationViaAPI() 
# With: sendEnhancedNotificationViaAPI()
```

### **Phase 2: Test with Real Users**
```bash
# Test enhanced notifications
node test-enhanced-notifications.js
```

### **Phase 3: Create Premium Templates**
- Design premium email templates in Brevo Dashboard
- Add environment variables for premium template IDs
- Enable automatic premium template selection for paid users

## 📊 **BENEFITS**

### **For Users:**
- ✅ **Personalized Content:** "Hello Sarah! Your student Emma from Oxford Primary School..."
- ✅ **Relevant Information:** School details, ratings, class size
- ✅ **Premium Experience:** Special templates for paid users
- ✅ **Accurate Data:** Always up-to-date from Brevo sync

### **For Business:**
- ✅ **Scalable:** Easy to add new personalization without code changes
- ✅ **Maintainable:** Single source of truth in Brevo
- ✅ **Premium Differentiation:** Encourage plan upgrades
- ✅ **Analytics:** Track engagement by plan type

## 🔧 **TEMPLATE EXAMPLES**

### **Standard Template:**
```
Hello {{params.firstName}}!

{{params.uploaderName}} just shared a new recording from {{params.world}} in LMID {{params.lmid}}.

View in your dashboard: {{params.dashboardUrl}}
```

### **Enhanced Template:**
```
{{params.personalizedGreeting}}!

Great news from {{params.schoolDescription}}! {{params.uploaderName}} just shared a new recording from {{params.world}} in LMID {{params.lmid}}.

As a {{params.roleDescription}}, you can track all your students' progress in one place.

View in your dashboard: {{params.dashboardUrl}}
Listen to recordings: {{params.radioUrl}}

Best regards,
The Hey Feelings Team
```

## ⚠️ **MIGRATION NOTES**

### **Breaking Changes:**
- Contacts MUST exist in Brevo before sending notifications
- Changed API endpoint from `/send-email-notifications` to `/send-email-notifications-improved`
- Different request body structure

### **Compatibility:**
- Keep original API as fallback during transition
- Gradual migration path available
- All existing templates remain functional

## 🧪 **TESTING CHECKLIST**

- [ ] Enhanced API responds with correct template selection
- [ ] Plan-based template logic works (free vs paid)
- [ ] All 32 Brevo attributes map correctly to template params
- [ ] Upload API sends minimal data correctly
- [ ] Error handling for missing Brevo contacts
- [ ] Performance impact assessment
- [ ] Email delivery and formatting verification

## 📈 **NEXT STEPS**

1. **Deploy Enhanced System** - Test with synthetic data
2. **User Testing** - Real users with full Brevo profiles
3. **Premium Templates** - Design and implement paid user templates
4. **Analytics Enhancement** - Track email engagement by plan type
5. **A/B Testing** - Compare personalized vs generic email performance

---

**DEPLOYMENT READY:** Enhanced system provides immediately better personalization with existing Brevo data integration. Premium features can be added incrementally. 