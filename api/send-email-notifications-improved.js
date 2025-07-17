/**
 * send-email-notifications-improved.js - Enhanced Email Notifications using Brevo Data
 * 
 * PURPOSE: Send email notifications using ONLY Brevo contact data for personalization
 * CHANGES: Simplified approach - trust Brevo data completely, minimal fallbacks
 * 
 * MAJOR IMPROVEMENTS:
 * 1. Uses comprehensive Brevo contact attributes (32 fields)
 * 2. Plan-based template selection (free vs paid users)
 * 3. Enhanced personalization with school details, GPS, ratings
 * 4. Minimal hardcoded data - trust Brevo as single source of truth
 * 5. Better error handling and logging
 */

import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys, SendSmtpEmail } from '@getbrevo/brevo';
import { getBrevoContact } from '../utils/brevo-contact-manager.js';

/**
 * Get enhanced template data from Brevo contact
 * @param {Object} brevoContact - Complete Brevo contact with all 32 attributes
 * @param {Object} basicData - Basic data from upload (world, lmid, etc.)
 * @returns {Object} Comprehensive template data
 */
function createEnhancedTemplateData(brevoContact, basicData) {
    const attrs = brevoContact.attributes;
    
    return {
        // Basic template requirements
        world: basicData.world,
        lmid: basicData.lmid,
        dashboardUrl: basicData.dashboardUrl,
        radioUrl: basicData.radioUrl,
        uploaderName: basicData.uploaderName,
        
        // Enhanced personalization from Brevo (32 attributes available)
        // Core identity
        teacherName: attrs.TEACHER_NAME || `${attrs.FIRSTNAME} ${attrs.LASTNAME}`.trim(),
        parentName: `${attrs.FIRSTNAME} ${attrs.LASTNAME}`.trim(),
        firstName: attrs.FIRSTNAME || '',
        lastName: attrs.LASTNAME || '',
        
        // Plan-based personalization
        planName: attrs.PLAN_NAME || 'Hey Feelings',
        planType: attrs.PLAN_TYPE || 'free',
        userCategory: attrs.USER_CATEGORY || 'user',
        isPaidUser: attrs.PLAN_TYPE === 'paid',
        
        // School/Organization details
        schoolName: attrs.SCHOOL_NAME || '',
        schoolCity: attrs.SCHOOL_CITY || '',
        schoolCountry: attrs.SCHOOL_COUNTRY || '',
        schoolAddress: attrs.SCHOOL_ADDRESS || '',
        schoolPhone: attrs.SCHOOL_PHONE || '',
        schoolWebsite: attrs.SCHOOL_WEBSITE || '',
        schoolRating: attrs.SCHOOL_RATING ? `${attrs.SCHOOL_RATING}/5` : '',
        schoolType: attrs.SCHOOL_FACILITY_TYPE || '',
        
        // Professional details
        educatorRole: attrs.EDUCATOR_ROLE || '',
        studentCount: attrs.EDUCATOR_NO_KIDS || '',
        classCount: attrs.EDUCATOR_NO_CLASSES || '',
        
        // Geographic personalization
        latitude: attrs.SCHOOL_LATITUDE || '',
        longitude: attrs.SCHOOL_LONGITUDE || '',
        
        // Contact info
        phone: attrs.PHONE || '',
        language: attrs.LANGUAGE_PREF || 'en',
        
        // System info
        membershipId: attrs.MEMBERSTACK_ID || '',
        lmids: attrs.LMIDS || '',
        lastSync: attrs.LAST_SYNC || '',
        
        // Smart text generation based on data
        roleDescription: generateRoleDescription(attrs),
        schoolDescription: generateSchoolDescription(attrs),
        personalizedGreeting: generatePersonalizedGreeting(attrs)
    };
}

/**
 * Generate dynamic role description
 */
function generateRoleDescription(attrs) {
    const role = attrs.EDUCATOR_ROLE;
    const students = attrs.EDUCATOR_NO_KIDS;
    const classes = attrs.EDUCATOR_NO_CLASSES;
    
    if (role && students) {
        if (role === 'Principal') return `Principal overseeing ${students} students`;
        if (role === 'Teacher' && classes) return `Teacher with ${classes} classes (${students} students)`;
        return `${role} working with ${students} students`;
    }
    return role || 'Educator';
}

/**
 * Generate dynamic school description
 */
function generateSchoolDescription(attrs) {
    const school = attrs.SCHOOL_NAME;
    const city = attrs.SCHOOL_CITY;
    const rating = attrs.SCHOOL_RATING;
    const type = attrs.SCHOOL_FACILITY_TYPE;
    
    if (!school) return '';
    
    let description = school;
    if (type) description += ` (${type})`;
    if (city) description += ` in ${city}`;
    if (rating) description += ` - ${rating}/5 stars`;
    
    return description;
}

/**
 * Generate personalized greeting
 */
function generatePersonalizedGreeting(attrs) {
    const name = attrs.FIRSTNAME;
    const role = attrs.EDUCATOR_ROLE;
    const planType = attrs.PLAN_TYPE;
    
    if (!name) return 'Hello';
    
    if (planType === 'paid') {
        return `Hello ${name}! As our premium ${role || 'educator'}`;
    }
    
    return `Hello ${name}`;
}

/**
 * Select template based on plan and user type
 */
function selectEnhancedTemplate(notificationType, language, brevoContact) {
    const attrs = brevoContact.attributes;
    const planType = attrs.PLAN_TYPE;
    const userCategory = attrs.USER_CATEGORY;
    
    // Future enhancement: Different templates for paid users
    let templateSuffix = '';
    if (planType === 'paid') {
        templateSuffix = '_PREMIUM'; // e.g., BREVO_TEACHER_TEMPLATE_EN_PREMIUM
    }
    
    // Standard template selection with plan awareness
    let envVar;
    if (notificationType === 'teacher') {
        envVar = language === 'pl' ? 'BREVO_TEACHER_TEMPLATE_PL' : 'BREVO_TEACHER_TEMPLATE_EN';
    } else {
        envVar = language === 'pl' ? 'BREVO_PARENT_TEMPLATE_PL' : 'BREVO_PARENT_TEMPLATE_EN';
    }
    
    // Try premium template first, fallback to standard
    const premiumTemplate = process.env[envVar + templateSuffix];
    const standardTemplate = process.env[envVar];
    
    const templateId = parseInt(premiumTemplate || standardTemplate, 10);
    
    return {
        templateId,
        isPremium: !!premiumTemplate && planType === 'paid',
        planType,
        userCategory
    };
}

export default async function handler(req, res) {
    // Secure CORS headers
    const { setCorsHeaders } = await import('../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['POST', 'OPTIONS']);
    corsHandler(req);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { 
            recipientEmail, 
            notificationType, // 'teacher' or 'parent'
            language, // 'pl' or 'en'
            basicTemplateData // world, lmid, urls - minimal data from upload
        } = req.body;
        
        console.log(`📧 Enhanced notification - Type: ${notificationType}, Lang: ${language}, Email: ${recipientEmail}`);
        
        // Validate required fields
        if (!recipientEmail || !notificationType || !language) {
            return res.status(400).json({ 
                error: 'Missing required fields: recipientEmail, notificationType, language' 
            });
        }
        
        // Get Brevo API key
        const brevoApiKey = process.env.BREVO_API_KEY;
        if (!brevoApiKey) {
            console.error('BREVO_API_KEY not found');
            return res.status(500).json({ error: 'Email service configuration error' });
        }
        
        // Get complete contact data from Brevo - REQUIRED
        const brevoContact = await getBrevoContact(recipientEmail);
        
        if (!brevoContact || !brevoContact.attributes) {
            console.warn(`⚠️ Contact not found in Brevo: ${recipientEmail}`);
            return res.status(404).json({ 
                error: 'Contact not found in Brevo',
                message: 'Contact must be synced to Brevo before sending notifications'
            });
        }
        
        console.log(`✅ Contact found in Brevo with ${Object.keys(brevoContact.attributes).length} attributes`);
        
        // Create comprehensive template data from Brevo
        const enhancedTemplateData = createEnhancedTemplateData(brevoContact, basicTemplateData || {});
        
        // Select template based on plan and user data
        const templateInfo = selectEnhancedTemplate(notificationType, language, brevoContact);
        
        if (isNaN(templateInfo.templateId) || templateInfo.templateId <= 0) {
            console.error(`❌ Invalid template ID: ${templateInfo.templateId}`);
            return res.status(500).json({ error: 'Invalid email template configuration' });
        }
        
        console.log(`📧 Selected template ${templateInfo.templateId} (${templateInfo.isPremium ? 'PREMIUM' : 'STANDARD'}) for ${templateInfo.userCategory}/${templateInfo.planType}`);
        console.log(`📋 Using ${Object.keys(enhancedTemplateData).length} personalization parameters from Brevo`);
        
        // Initialize Brevo SDK
        const apiInstance = new TransactionalEmailsApi();
        apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);
        
        // Prepare email with enhanced personalization
        const sendSmtpEmail = new SendSmtpEmail();
        sendSmtpEmail.to = [{
            email: recipientEmail,
            name: enhancedTemplateData.teacherName || enhancedTemplateData.parentName
        }];
        sendSmtpEmail.templateId = templateInfo.templateId;
        sendSmtpEmail.params = enhancedTemplateData;
        
        // Send email
        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        
        console.log(`✅ Enhanced email sent successfully`);
        console.log(`📊 Template: ${templateInfo.templateId}, Plan: ${templateInfo.planType}, User: ${templateInfo.userCategory}`);
        
        return res.status(200).json({
            success: true,
            message: 'Enhanced email notification sent successfully',
            messageId: result.messageId,
            templateInfo: {
                templateId: templateInfo.templateId,
                isPremium: templateInfo.isPremium,
                planType: templateInfo.planType,
                userCategory: templateInfo.userCategory,
                parametersUsed: Object.keys(enhancedTemplateData).length
            }
        });
        
    } catch (error) {
        console.error('❌ Error sending enhanced email notification:', error.message);
        
        return res.status(500).json({ 
            error: 'Failed to send enhanced email notification',
            details: error.message 
        });
    }
} 