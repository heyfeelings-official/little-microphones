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
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.0.0
 * STATUS: Production Ready ✅
 */

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
        
        // Determine template ID based on notification type and language
        let templateId;
        if (notificationType === 'teacher') {
            templateId = language === 'pl' ? 1 : 2; // Polish: 1, English: 2
        } else {
            templateId = language === 'pl' ? 3 : 4; // Polish: 3, English: 4
        }
        
        // Prepare email data for Brevo API (direct API call - more reliable)
        const emailData = {
            to: [{
                email: recipientEmail,
                name: recipientName
            }],
            templateId: templateId,
            params: templateData || {}
        };
        
        console.log(`📧 Sending email via Brevo API:`, {
            to: recipientEmail,
            templateId: templateId,
            params: templateData
        });
        
        // Send email via Brevo API (direct fetch - more reliable than SDK)
        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': brevoApiKey
            },
            body: JSON.stringify(emailData)
        });
        
        if (!brevoResponse.ok) {
            const errorData = await brevoResponse.text();
            console.error('❌ Brevo API error:', errorData);
            return res.status(500).json({ 
                error: 'Failed to send email notification',
                details: errorData 
            });
        }
        
        const result = await brevoResponse.json();
        
        console.log(`✅ Email notification sent successfully to ${recipientEmail} (${notificationType}, ${language})`);
        console.log(`📧 Brevo response:`, result);
        
        return res.status(200).json({
            success: true,
            message: 'Email notification sent successfully',
            messageId: result.messageId
        });
        
    } catch (error) {
        console.error('❌ Error sending email notification:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
} 