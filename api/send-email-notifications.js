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
 * - Uses official Brevo SDK
 * 
 * LAST UPDATED: January 2025
 * VERSION: 3.0.0
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
            console.log(`📧 Contact ${email} already exists in Brevo`);
            return true;
        } catch (error) {
            // Contact doesn't exist, create it
            if (error.status === 404) {
                console.log(`📧 Creating new contact in Brevo: ${email}`);
                
                const createContact = new CreateContact();
                createContact.email = email;
                createContact.attributes = {
                    FIRSTNAME: name.split(' ')[0] || name,
                    LASTNAME: name.split(' ').slice(1).join(' ') || ''
                };
                
                await contactsApi.createContact(createContact);
                console.log(`✅ Contact created successfully: ${email}`);
                return true;
            } else {
                console.error(`❌ Error checking contact ${email}:`, error);
                return false;
            }
        }
    } catch (error) {
        console.error(`❌ Error ensuring contact exists for ${email}:`, error);
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
            console.warn(`⚠️ Could not ensure contact exists for ${recipientEmail}, proceeding anyway`);
        }
        
        // Initialize Brevo SDK
        const apiInstance = new TransactionalEmailsApi();
        apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);
        
        // Determine template ID based on notification type and language
        let templateId;
        if (notificationType === 'teacher') {
            templateId = language === 'pl' ? 1 : 2; // Polish: 1, English: 2
        } else {
            templateId = language === 'pl' ? 3 : 4; // Polish: 3, English: 4
        }
        
        // Prepare email data for Brevo SDK
        const sendSmtpEmail = new SendSmtpEmail();
        sendSmtpEmail.to = [{
            email: recipientEmail,
            name: recipientName
        }];
        sendSmtpEmail.templateId = templateId;
        sendSmtpEmail.params = templateData || {};
        
        console.log(`📧 Sending email via Brevo SDK:`, {
            to: recipientEmail,
            templateId: templateId,
            params: templateData
        });
        
        // Send email via Brevo SDK
        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        
        console.log(`✅ Email notification sent successfully to ${recipientEmail} (${notificationType}, ${language})`);
        console.log(`📧 Brevo response:`, result);
        
        return res.status(200).json({
            success: true,
            message: 'Email notification sent successfully',
            messageId: result.messageId
        });
        
    } catch (error) {
        console.error('❌ Error sending email notification:', error);
        console.error('❌ Error details:', error.response?.body || error.message);
        
        return res.status(500).json({ 
            error: 'Failed to send email notification',
            details: error.response?.body || error.message 
        });
    }
} 