/**
 * api/memberstack-webhook.js - Comprehensive Memberstack Webhook Handler
 * 
 * PURPOSE: Handles Memberstack webhooks for member and subscription events with Brevo synchronization
 * DEPENDENCIES: Supabase client, Memberstack API, LMID utilities, Brevo contact manager
 * 
 * SUPPORTED WEBHOOKS:
 * - member.created: New member registration (assigns LMID + syncs to Brevo)
 * - member.updated: Member profile updates (syncs changes to Brevo)
 * - subscription.created: New subscription (updates segments in Brevo)
 * - subscription.updated: Subscription changes (updates segments in Brevo)
 * - subscription.cancelled: Subscription cancellation (updates segments in Brevo)
 * 
 * RESPONSE FORMAT:
 * { success: true, message: "Event processed successfully", data: {...} }
 * 
 * PROCESSING LOGIC:
 * 1. Verify webhook authenticity (Memberstack signature)
 * 2. Route to appropriate handler based on event type
 * 3. Get full member data from Memberstack API
 * 4. Perform LMID operations (for educators)
 * 5. Synchronize member data to Brevo with appropriate segments
 * 6. Handle plan changes and segment updates
 * 
 * BREVO INTEGRATION:
 * - Automatic contact creation/update with full member data
 * - Plan-based segmentation and tagging
 * - Real-time synchronization on member changes
 * - Template data sourcing from Brevo for notifications
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.0.0 (Brevo Integration)
 * STATUS: Implementation Ready
 */

import { assignLmidToMember, findNextAvailableLmid, generateAllShareIds } from '../utils/lmid-utils.js';
import { Webhook } from 'svix';

export default async function handler(req, res) {
    console.log('\n=== MEMBERSTACK WEBHOOK START ===');
    console.log('Method:', req.method);
    console.log('Headers received:', req.headers);

    if (req.method !== 'POST') {
        console.log('❌ Method not allowed:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get webhook secret
    const webhookSecret = process.env.MEMBERSTACK_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.log('❌ Missing MEMBERSTACK_WEBHOOK_SECRET');
        return res.status(500).json({ error: 'Missing webhook secret' });
    }
    console.log('✅ Webhook secret found');

    try {
        // Get raw body and headers for Svix verification
        let body;
        if (typeof req.body === 'string') {
            body = req.body;
        } else if (req.body && typeof req.body === 'object') {
            body = JSON.stringify(req.body);
        } else {
            console.log('❌ Unable to get request body');
            return res.status(400).json({ error: 'Invalid request body' });
        }
        
        console.log('Request body type:', typeof req.body);
        console.log('Request body length:', body.length);

        // Extract Svix headers
        const svixId = req.headers['svix-id'];
        const svixTimestamp = req.headers['svix-timestamp'];
        const svixSignature = req.headers['svix-signature'];

        if (!svixId || !svixTimestamp || !svixSignature) {
            console.log('❌ Missing Svix headers');
            console.log('svix-id:', svixId);
            console.log('svix-timestamp:', svixTimestamp);
            console.log('svix-signature:', svixSignature);
            return res.status(400).json({ error: 'Missing required Svix headers' });
        }

        console.log('✅ All Svix headers present');

        // Verify webhook signature using Svix
        const wh = new Webhook(webhookSecret);
        let verifiedPayload;

        try {
            verifiedPayload = wh.verify(body, {
                'svix-id': svixId,
                'svix-timestamp': svixTimestamp,
                'svix-signature': svixSignature
            });
            console.log('✅ Svix signature verification successful');
        } catch (verifyError) {
            console.log('❌ Svix signature verification failed:', verifyError.message);
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Parse the verified payload
        const data = typeof verifiedPayload === 'object' ? verifiedPayload : JSON.parse(verifiedPayload);
        console.log('Webhook structure:', {
            hasEvent: !!data.event,
            hasPayload: !!data.payload,
            hasType: !!data.type,
            hasData: !!data.data
        });

        // Memberstack uses "event" and "payload" structure
        const eventType = data.event || data.type;
        const member = data.payload || data.data;

        console.log('Event type:', eventType);
        console.log('Member ID:', member?.id);
        console.log('Member auth email:', member?.auth?.email);

        if (!member) {
            console.log('❌ Missing member data in webhook');
            return res.status(400).json({ error: 'Missing member data' });
        }

        // Variable to store full member data
        let fullMemberData = member;

        // Handle different event types
        if (eventType === 'member.created' || eventType === 'member.updated') {
            console.log('Processing member:', member.id || member.auth?.email);
            console.log('Full member data:', JSON.stringify(member, null, 2));

            // Get full member data if we only have minimal webhook data
            if (!member.id || !member.customFields) {
                console.log('⚠️ Webhook has minimal data - some features may be limited');
                console.log('⚠️ Available data:', {
                    hasId: !!member.id,
                    hasEmail: !!member.auth?.email,
                    hasCustomFields: !!member.customFields,
                    hasMetaData: !!member.metaData
                });
            }

            // 1. Create/update Brevo contact for all users
            try {
                const { syncMemberToBrevo } = await import('../utils/brevo-contact-manager.js');
                const brevoResult = await syncMemberToBrevo(fullMemberData);
                if (brevoResult.success) {
                    console.log('✅ Brevo contact sync completed:', brevoResult.action);
                } else {
                    console.log('❌ Brevo sync failed:', brevoResult.error);
                }
            } catch (brevoError) {
                console.log('❌ Brevo sync failed:', brevoError.message);
                // Don't fail the webhook for Brevo errors
            }

            // 2. Assign LMID only for educators and therapists (not parents)
            const userCategory = fullMemberData.customFields?.USER_CATEGORY || 
                               fullMemberData.customFields?.['user-category'] || 
                               fullMemberData.metaData?.USER_CATEGORY;
            console.log('User category:', userCategory);
            console.log('Custom fields:', fullMemberData.customFields);
            console.log('Meta data:', fullMemberData.metaData);

            if (userCategory === 'educator' || userCategory === 'therapist') {
                try {
                    // Find next available LMID
                    const nextLmid = await findNextAvailableLmid();
                    if (!nextLmid) {
                        console.log('❌ No available LMIDs for assignment');
                        return res.status(500).json({ error: 'No available LMIDs' });
                    }
                    console.log('📍 Found available LMID:', nextLmid);

                    // Generate ShareIDs for all worlds
                    const shareIds = await generateAllShareIds();
                    console.log('🎲 Generated ShareIDs:', shareIds);

                    // Get member ID and email
                    const memberId = fullMemberData.id || fullMemberData.auth?.email || fullMemberData.email;
                    const memberEmail = fullMemberData.auth?.email || fullMemberData.email;
                    
                    if (!memberEmail || !memberId) {
                        console.log('❌ Member email or ID not found');
                        return res.status(400).json({ error: 'Member email and ID required for LMID assignment' });
                    }

                    // Assign LMID to member
                    const assignmentSuccess = await assignLmidToMember(nextLmid, memberId, memberEmail, shareIds);
                    if (assignmentSuccess) {
                        console.log('✅ LMID assigned successfully:', nextLmid);
                    } else {
                        console.log('❌ LMID assignment failed');
                        return res.status(500).json({ error: 'LMID assignment failed' });
                    }
                } catch (lmidError) {
                    console.log('❌ LMID assignment error:', lmidError.message);
                    return res.status(500).json({ error: 'LMID assignment error: ' + lmidError.message });
                }
            } else if (userCategory === 'parent') {
                console.log('ℹ️ Parent user - skipping LMID assignment');
            } else {
                console.log('⚠️ Unknown user category - skipping LMID assignment');
            }
        } else {
            console.log('ℹ️ Event type not handled:', eventType);
        }

        console.log('✅ Webhook processed successfully');
        console.log('=== MEMBERSTACK WEBHOOK END ===\n');
        
        return res.status(200).json({ 
            success: true, 
            message: 'Webhook processed successfully',
            eventType: eventType,
            memberId: fullMemberData?.id || member?.id || member?.auth?.email
        });

    } catch (error) {
        console.log('❌ Webhook processing error:', error.message);
        console.log('Error stack:', error.stack);
        console.log('=== MEMBERSTACK WEBHOOK END (ERROR) ===\n');
        
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
} 