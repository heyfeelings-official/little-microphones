/**
 * api/memberstack-webhook.js - Memberstack Webhook Handler for New Educator Registration
 * 
 * PURPOSE: Handles new educator registration webhook from Memberstack and automatically assigns LMID
 * DEPENDENCIES: Supabase client, Memberstack API, LMID utilities
 * 
 * REQUEST FORMAT:
 * POST /api/memberstack-webhook (Webhook from Memberstack)
 * Body: { type: "member.created", data: { member: {...} } }
 * 
 * RESPONSE FORMAT:
 * { success: true, message: "Educator processed successfully", assignedLmid: 42 }
 * 
 * LOGIC:
 * 1. Verify webhook authenticity (Memberstack signature)
 * 2. Extract member data from webhook
 * 3. Find next available LMID
 * 4. Generate all 6 ShareIDs for the LMID
 * 5. Assign LMID to educator with ShareIDs
 * 6. Update Memberstack metadata with LMID
 * 7. Send alert email if no LMIDs available
 */

import { 
    findNextAvailableLmid,
    generateAllShareIds,
    assignLmidToMember,
    updateMemberstackMetadata
} from '../utils/lmid-utils.js';
import { validateMemberstackWebhook } from '../utils/memberstack-utils.js';

/**
 * Send alert email when no LMIDs are available
 * @param {string} memberEmail - Email of the member who couldn't get LMID
 */
async function sendNoLmidAlert(memberEmail) {
    try {
        // Using a simple email service - you can replace with your preferred service
        const emailApiKey = process.env.EMAIL_API_KEY;
        if (!emailApiKey) {
            console.warn('EMAIL_API_KEY not configured, skipping alert email');
            return;
        }

        const emailContent = `
            W systemie zabrakło dostępnych numerów LMID. 
            Nowy użytkownik (${memberEmail}) nie otrzymał swojego ID. 
            Proszę o pilne uzupełnienie puli w bazie danych Supabase.
        `;

        // Replace with your email service API call
        console.log('ALERT: Pula LMID wyczerpana!', emailContent);
        
        // Example with SendGrid, Mailgun, etc.
        // await sendEmail({
        //     to: 'contact@heyfeelings.com',
        //     subject: 'ALERT: Pula LMID wyczerpana!',
        //     html: emailContent
        // });
        
    } catch (error) {
        console.error('Error sending alert email:', error);
    }
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
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }

    try {
        // Verify webhook authenticity
        const validation = validateMemberstackWebhook(req);
        if (!validation.valid) {
            console.warn('⚠️ Webhook validation failed:', validation.error);
            return res.status(401).json({ 
                success: false, 
                error: 'Unauthorized webhook request' 
            });
        }

        const { type, data } = req.body;

        // Only handle member creation events
        if (type !== 'member.created') {
            return res.status(200).json({ 
                success: true, 
                message: 'Event type not handled',
                type: type
            });
        }

        const member = data?.member;
        if (!member) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing member data in webhook' 
            });
        }

        const memberId = member.id;
        const memberEmail = member.auth?.email || member.email;

        console.log(`Processing new educator: ${memberEmail} (${memberId})`);

        // Find next available LMID
        const availableLmid = await findNextAvailableLmid();
        if (!availableLmid) {
            console.error('No available LMIDs for new educator');
            await sendNoLmidAlert(memberEmail);
            return res.status(500).json({ 
                success: false, 
                error: 'No available LMIDs for assignment' 
            });
        }

        // Generate all ShareIDs
        const shareIds = await generateAllShareIds();

        // Assign LMID to educator with all ShareIDs
        const assignmentSuccess = await assignLmidToMember(availableLmid, memberId, memberEmail, shareIds);
        if (!assignmentSuccess) {
            console.error('Error assigning LMID to educator');
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to assign LMID to educator' 
            });
        }

        // Wait a moment for database consistency before metadata update
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update Memberstack metadata using the unified function from utils
        const memberstackSuccess = await updateMemberstackMetadata(memberId, availableLmid.toString());
        if (!memberstackSuccess) {
            console.warn(`⚠️ LMID ${availableLmid} assigned to educator but Memberstack metadata update failed`);
        }

        console.log(`✅ LMID ${availableLmid} assigned to educator ${memberEmail}. Memberstack metadata ${memberstackSuccess ? 'updated' : 'update failed'}.`);

        return res.status(200).json({
            success: true,
            message: 'Educator processed successfully',
            assignedLmid: availableLmid,
            shareIds: shareIds
        });

    } catch (error) {
        console.error('Unexpected error in memberstack-webhook:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
} 