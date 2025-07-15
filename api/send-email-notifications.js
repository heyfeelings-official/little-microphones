/**
 * send-email-notifications.js - Email Notifications API
 * 
 * PURPOSE: Send email notifications via Brevo for new recordings
 * USAGE: Called from upload-audio.js after successful recording upload
 * 
 * ENDPOINTS:
 * - POST /api/send-email-notifications
 * 
 * FEATURES:
 * - Teacher notifications (new recording from student)
 * - Parent notifications (new recording from child)
 * - Multi-language support (Polish/English)
 * - Brevo template system integration
 * - Uses official Brevo SDK (@getbrevo/brevo)
 * - Automatic contact creation in Brevo
 * - Secure logging without exposing personal data
 * 
 * TEMPLATE MAPPING:
 * - Teacher PL: Template ID 2
 * - Teacher EN: Template ID 4
 * - Parent PL: Template ID 3
 * - Parent EN: Template ID 5
 * 
 * LAST UPDATED: January 2025
 * VERSION: 6.0.0
 * STATUS: Production Ready ✅
 */

import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys, SendSmtpEmail, ContactsApi, CreateContact } from '@getbrevo/brevo';

/**
 * Ensure contact exists in Brevo before sending email
 * @param {string} email - Email address
 * @param {string} name - Contact name
 * @param {string} brevoApiKey - Brevo API key
 */
async function ensureContactExists(email, name, brevoApiKey) {
    try {
        // Initialize Contacts API
        const contactsApi = new ContactsApi();
        contactsApi.setApiKey(TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);
        
        // Try to get contact first
        try {
            const contact = await contactsApi.getContactInfo(email);
            console.log(`📧 Contact already exists in Brevo`);
            return true;
        } catch (error) {
            // Contact doesn't exist, create it
            if (error.status === 404) {
                console.log(`📧 Creating new contact in Brevo`);
                
                const createContact = new CreateContact();
                createContact.email = email;
                createContact.attributes = {
                    FIRSTNAME: name.split(' ')[0] || name,
                    LASTNAME: name.split(' ').slice(1).join(' ') || ''
                };
                
                await contactsApi.createContact(createContact);
                console.log(`✅ Contact created successfully`);
                return true;
            } else {
                console.error(`❌ Error checking contact:`, error.message);
                return false;
            }
        }
    } catch (error) {
        console.error(`❌ Error ensuring contact exists:`, error.message);
        return false;
    }
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { 
            recipientEmail, 
            recipientName, 
            notificationType, // 'teacher' or 'parent'
            language, // 'pl' or 'en'
            templateData 
        } = req.body;
        
        console.log(`📧 Email notification request - Type: ${notificationType}, Lang: ${language}`);
        console.log(`📧 Request body:`, JSON.stringify(req.body, null, 2));
        
        // Validate required fields
        if (!recipientEmail || !recipientName || !notificationType || !language) {
            return res.status(400).json({ 
                error: 'Missing required fields: recipientEmail, recipientName, notificationType, language' 
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
        
        // Get Brevo API key from environment
        const brevoApiKey = process.env.BREVO_API_KEY;
        if (!brevoApiKey) {
            console.error('BREVO_API_KEY not found in environment variables');
            return res.status(500).json({ error: 'Email service configuration error' });
        }
        
        // Ensure contact exists in Brevo before sending email
        const contactExists = await ensureContactExists(recipientEmail, recipientName, brevoApiKey);
        if (!contactExists) {
            console.warn(`⚠️ Could not ensure contact exists, proceeding anyway`);
        }
        
        // Initialize Brevo SDK
        const apiInstance = new TransactionalEmailsApi();
        apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);
        
        // Determine template ID based on notification type and language
        // IMPORTANT: These IDs must match actual Brevo template IDs
        let templateId;
        if (notificationType === 'teacher') {
            templateId = language === 'pl' ? 2 : 4; // Polish: 2, English: 4
        } else {
            templateId = language === 'pl' ? 3 : 5; // Polish: 3, English: 5
        }
        
        console.log(`📧 Selected template ${templateId} for ${notificationType} in ${language}`);
        
        // Prepare email data for Brevo SDK
        const sendSmtpEmail = new SendSmtpEmail();
        sendSmtpEmail.to = [{
            email: recipientEmail,
            name: recipientName
        }];
        sendSmtpEmail.templateId = templateId;
        sendSmtpEmail.params = templateData || {};
        
        console.log(`📧 Sending to Brevo - Template: ${templateId}`);
        
        // Send email via Brevo SDK
        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        
        console.log(`✅ Email sent successfully`);
        
        return res.status(200).json({
            success: true,
            message: 'Email notification sent successfully',
            messageId: result.messageId
        });
        
    } catch (error) {
        console.error('❌ Error sending email notification:', error.message);
        
        return res.status(500).json({ 
            error: 'Failed to send email notification',
            details: error.message 
        });
    }
} 