/**
 * send-email-notifications.js - Simplified Email Notifications via Brevo
 * 
 * PURPOSE: Send email notifications with minimal data - Brevo handles personalization
 * APPROACH: Contact data automatic from Brevo, only dynamic data from code
 * 
 * TEMPLATE DATA SOURCES:
 * - {{contact.ATTRIBUTE}} - All 32 attributes automatically from Brevo contact (name, school, plan, etc.)
 * - {{params.X}} - Dynamic data from this API call (world, lmid, urls, etc.)
 * 
 * AVAILABLE CONTACT ATTRIBUTES (automatic in templates):
 * - Personal: {{contact.FIRSTNAME}}, {{contact.LASTNAME}}, {{contact.PHONE}}
 * - Plan: {{contact.USER_CATEGORY}}, {{contact.PLAN_TYPE}}, {{contact.PLAN_NAME}}  
 * - School: {{contact.SCHOOL_NAME}}, {{contact.SCHOOL_CITY}}, {{contact.SCHOOL_ADDRESS}}
 * - Professional: {{contact.EDUCATOR_ROLE}}, {{contact.EDUCATOR_NO_CLASSES}}, {{contact.EDUCATOR_NO_KIDS}}
 * - System: {{contact.MEMBERSTACK_ID}}, {{contact.LMIDS}}, {{contact.LANGUAGE_PREF}}
 * - Full list: See utils/brevo-contact-config.js (32 total attributes)
 * 
 * SIMPLIFIED API CALL:
 * - recipientEmail: Who to send to (Brevo finds contact automatically)
 * - notificationType: 'teacher' or 'parent' (for template selection)
 * - language: 'pl' or 'en' (for template selection)
 * - dynamicData: Only world, lmid, urls, uploaderName (the rest is automatic)
 * 
 * LAST UPDATED: January 2025
 * VERSION: 7.0.0 - Simplified Brevo-First Approach
 * STATUS: Production Ready ✅
 */

import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';

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
            dynamicData // ONLY dynamic data: world, lmid, urls, uploaderName
        } = req.body;
        
        console.log(`📧 Simplified notification - Type: ${notificationType}, Lang: ${language}, Email: ${recipientEmail}`);
        
        // Validate required fields
        if (!recipientEmail || !notificationType || !language) {
            return res.status(400).json({ 
                error: 'Missing required fields: recipientEmail, notificationType, language' 
            });
        }
        
        // Validate notification type
        if (!['teacher', 'parent'].includes(notificationType)) {
            return res.status(400).json({ 
                error: 'Invalid notificationType. Must be "teacher" or "parent"' 
            });
        }
        
        // Validate language
        if (!['pl', 'en'].includes(language)) {
            return res.status(400).json({ 
                error: 'Invalid language. Must be "pl" or "en"' 
            });
        }
        
        // Get Brevo API key
        const brevoApiKey = process.env.BREVO_API_KEY;
        if (!brevoApiKey) {
            console.error('BREVO_API_KEY not found');
            return res.status(500).json({ error: 'Email service configuration error' });
        }
        
        // Verify contact exists in Brevo (required for template personalization)
        let brevoContact = null;
        try {
            const contactResponse = await makeBrevoRequest(`/contacts/${encodeURIComponent(recipientEmail)}`);
            brevoContact = contactResponse;
            console.log(`✅ Contact verified in Brevo with ${Object.keys(brevoContact.attributes || {}).length} attributes`);
        } catch (error) {
            console.warn(`⚠️ Contact not found in Brevo: ${recipientEmail}`);
            return res.status(404).json({ 
                error: 'Contact not found in Brevo',
                message: 'Contact must be synced to Brevo before sending notifications. All personalization comes from Brevo contact data.'
            });
        }
        
        // Select template ID based on notification type and language
        let templateId;
        if (notificationType === 'teacher') {
            templateId = language === 'pl' ? process.env.BREVO_TEACHER_TEMPLATE_PL : process.env.BREVO_TEACHER_TEMPLATE_EN;
        } else {
            templateId = language === 'pl' ? process.env.BREVO_PARENT_TEMPLATE_PL : process.env.BREVO_PARENT_TEMPLATE_EN;
        }
        
        // Convert to number and validate
        templateId = parseInt(templateId, 10);
        if (isNaN(templateId) || templateId <= 0) {
            console.error(`❌ Invalid template ID: ${templateId} from environment variables`);
            return res.status(500).json({ 
                error: 'Invalid email template configuration',
                details: `Template ID "${templateId}" is not valid for ${notificationType}_${language}`
            });
        }
        
        // Prepare MINIMAL email data - Brevo handles all personalization from contact
        const emailPayload = {
            to: [{
                email: recipientEmail,
                // Name will be auto-filled by Brevo from contact.FIRSTNAME + contact.LASTNAME
            }],
            templateId: templateId,
            params: dynamicData || {}, // Only dynamic data (world, lmid, urls), contact data is automatic
            // ADD TRACKING TAGS for better Dashboard identification
            tags: [
                'little-microphones',
                `notification-${notificationType}`,
                `lang-${language}`,
                `lmid-${dynamicData?.lmid || 'unknown'}`,
                `world-${dynamicData?.world || 'unknown'}`
            ]
        };
        
        console.log(`📧 Sending to Brevo - Template: ${templateId}`);
        console.log(`📋 Dynamic params: ${Object.keys(dynamicData || {}).length} (rest automatic from contact)`);
        console.log(`🎯 Available in template: {{contact.*}} (32 attributes) + {{params.*}} (${Object.keys(dynamicData || {}).length} dynamic)`);
        
        // Send email via native HTTP request (Brevo SDK has issues)
        const result = await makeBrevoRequest('/smtp/email', 'POST', emailPayload);
        
        console.log(`✅ Simplified email sent successfully - MessageID: ${result.messageId}`);
        
        return res.status(200).json({
            success: true,
            message: 'Email notification sent successfully with Brevo contact personalization',
            messageId: result.messageId,
            templateInfo: {
                templateId: templateId,
                notificationType: notificationType,
                language: language,
                contactAttributesAvailable: Object.keys(brevoContact.attributes || {}).length,
                dynamicParamsUsed: Object.keys(dynamicData || {}).length
            }
        });
        
    } catch (error) {
        console.error('❌ Error sending simplified email notification:', error.message);
        
        return res.status(500).json({ 
            error: 'Failed to send email notification',
            details: error.message 
        });
    }
} 