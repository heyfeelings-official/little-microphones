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

import { 
    findNextAvailableLmid,
    generateAllShareIds,
    assignLmidToMember,
    updateMemberstackMetadata
} from '../utils/lmid-utils.js';
import { validateMemberstackWebhook, getMemberDetails } from '../utils/memberstack-utils.js';
import { syncMemberToBrevo, handleMemberPlanChange } from '../utils/brevo-contact-manager.js';

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

// ===== WEBHOOK EVENT HANDLERS =====

/**
 * Handle member.created webhook - new member registration
 * @param {Object} data - Webhook data
 * @param {string} webhookId - Unique webhook identifier
 * @returns {Promise<Object>} Handler result
 */
async function handleMemberCreated(data, webhookId) {
    try {
        const member = data?.member;
        if (!member) {
            return {
                success: false,
                error: 'Missing member data in webhook'
            };
        }

        const memberId = member.id;
        const memberEmail = member.auth?.email || member.email;

        console.log(`👤 [${webhookId}] Processing new member: ${memberEmail} (${memberId})`);

        // Get full member data from Memberstack API
        const fullMemberData = await getMemberDetails(memberId, false);
        if (!fullMemberData) {
            console.warn(`⚠️ [${webhookId}] Could not retrieve full member data for ${memberId}`);
            // Use webhook data as fallback
            fullMemberData = member;
        }

        // Determine if this is an educator/therapist (needs LMID) or parent
        const planConnections = fullMemberData.planConnections || [];
        const activePlans = planConnections.filter(conn => conn.active && conn.status === 'ACTIVE');
        
        // Check if user needs LMID (educators and therapists)
        const needsLmid = activePlans.some(plan => {
            const planId = plan.planId;
            return planId.includes('educator') || planId.includes('therapist');
        });

        let lmidResult = null;
        
        if (needsLmid) {
            console.log(`🎓 [${webhookId}] Member needs LMID - processing as educator/therapist`);
            
            // Find next available LMID
            const availableLmid = await findNextAvailableLmid();
            if (!availableLmid) {
                console.error(`❌ [${webhookId}] No available LMIDs for new educator`);
                await sendNoLmidAlert(memberEmail);
                return {
                    success: false,
                    error: 'No available LMIDs for assignment'
                };
            }

            // Generate all ShareIDs
            const shareIds = await generateAllShareIds();

            // Assign LMID to educator with all ShareIDs
            const assignmentSuccess = await assignLmidToMember(availableLmid, memberId, memberEmail, shareIds);
            if (!assignmentSuccess) {
                console.error(`❌ [${webhookId}] Error assigning LMID to educator`);
                return {
                    success: false,
                    error: 'Failed to assign LMID to educator'
                };
            }

            // Wait a moment for database consistency before metadata update
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Update Memberstack metadata
            const memberstackSuccess = await updateMemberstackMetadata(memberId, availableLmid.toString());
            if (!memberstackSuccess) {
                console.warn(`⚠️ [${webhookId}] LMID ${availableLmid} assigned but Memberstack metadata update failed`);
            }

            // Update member data with new LMID for Brevo sync
            if (!fullMemberData.metaData) {
                fullMemberData.metaData = {};
            }
            fullMemberData.metaData.lmids = availableLmid.toString();

            lmidResult = {
                assignedLmid: availableLmid,
                shareIds: shareIds,
                memberstackUpdated: memberstackSuccess
            };

            console.log(`✅ [${webhookId}] LMID ${availableLmid} assigned to ${memberEmail}`);
        } else {
            console.log(`👨‍👩‍👧‍👦 [${webhookId}] Member is parent - no LMID needed`);
        }

        // Synchronize to Brevo (for all member types)
        let brevoResult = null;
        try {
            brevoResult = await syncMemberToBrevo(fullMemberData);
            console.log(`✅ [${webhookId}] Brevo sync ${brevoResult.success ? 'successful' : 'failed'}`);
        } catch (brevoError) {
            console.error(`❌ [${webhookId}] Brevo sync failed:`, brevoError.message);
            brevoResult = { success: false, error: brevoError.message };
        }

        return {
            success: true,
            message: 'Member created and processed successfully',
            data: {
                memberId,
                memberEmail,
                needsLmid,
                lmidResult,
                brevoResult
            }
        };

    } catch (error) {
        console.error(`❌ [${webhookId}] Error in handleMemberCreated:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Handle member.updated webhook - member profile updates
 * @param {Object} data - Webhook data
 * @param {string} webhookId - Unique webhook identifier
 * @returns {Promise<Object>} Handler result
 */
async function handleMemberUpdated(data, webhookId) {
    try {
        const member = data?.member;
        if (!member) {
            return {
                success: false,
                error: 'Missing member data in webhook'
            };
        }

        const memberId = member.id;
        const memberEmail = member.auth?.email || member.email;

        console.log(`🔄 [${webhookId}] Processing member update: ${memberEmail} (${memberId})`);

        // Get full member data from Memberstack API
        const fullMemberData = await getMemberDetails(memberId, false);
        if (!fullMemberData) {
            console.warn(`⚠️ [${webhookId}] Could not retrieve full member data for ${memberId}`);
            return {
                success: false,
                error: 'Could not retrieve updated member data'
            };
        }

        // Synchronize updated data to Brevo
        let brevoResult = null;
        try {
            brevoResult = await syncMemberToBrevo(fullMemberData);
            console.log(`✅ [${webhookId}] Brevo sync ${brevoResult.success ? 'successful' : 'failed'}`);
        } catch (brevoError) {
            console.error(`❌ [${webhookId}] Brevo sync failed:`, brevoError.message);
            brevoResult = { success: false, error: brevoError.message };
        }

        return {
            success: true,
            message: 'Member update processed successfully',
            data: {
                memberId,
                memberEmail,
                brevoResult
            }
        };

    } catch (error) {
        console.error(`❌ [${webhookId}] Error in handleMemberUpdated:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Handle subscription events - plan changes
 * @param {Object} data - Webhook data
 * @param {string} eventType - Type of subscription event
 * @param {string} webhookId - Unique webhook identifier
 * @returns {Promise<Object>} Handler result
 */
async function handleSubscriptionEvent(data, eventType, webhookId) {
    try {
        const subscription = data?.subscription;
        const member = data?.member;
        
        if (!subscription || !member) {
            return {
                success: false,
                error: 'Missing subscription or member data in webhook'
            };
        }

        const memberId = member.id;
        const memberEmail = member.auth?.email || member.email;
        const planId = subscription.planId;

        console.log(`💳 [${webhookId}] Processing ${eventType}: ${memberEmail} - plan ${planId}`);

        // Get full member data with current plans
        const fullMemberData = await getMemberDetails(memberId, false);
        if (!fullMemberData) {
            console.warn(`⚠️ [${webhookId}] Could not retrieve full member data for ${memberId}`);
            return {
                success: false,
                error: 'Could not retrieve member data for plan update'
            };
        }

        // For subscription events, we need to handle plan changes in Brevo
        // The full sync will automatically put them in the right segments based on current plans
        let brevoResult = null;
        try {
            brevoResult = await syncMemberToBrevo(fullMemberData);
            console.log(`✅ [${webhookId}] Brevo plan sync ${brevoResult.success ? 'successful' : 'failed'}`);
        } catch (brevoError) {
            console.error(`❌ [${webhookId}] Brevo plan sync failed:`, brevoError.message);
            brevoResult = { success: false, error: brevoError.message };
        }

        return {
            success: true,
            message: `Subscription ${eventType} processed successfully`,
            data: {
                memberId,
                memberEmail,
                planId,
                eventType,
                brevoResult
            }
        };

    } catch (error) {
        console.error(`❌ [${webhookId}] Error in handleSubscriptionEvent:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}



export default async function handler(req, res) {
    // Secure CORS headers
    const { setCorsHeaders } = await import('../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['POST', 'OPTIONS']);
    corsHandler(req);

    // Rate limiting - 20 webhooks per minute
    const { checkRateLimit } = await import('../utils/simple-rate-limiter.js');
    if (!checkRateLimit(req, res, 'memberstack-webhook', 20)) {
        return; // Rate limit exceeded
    }

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
        const webhookId = Math.random().toString(36).substring(2, 15);
        
        console.log(`🔄 [${webhookId}] Processing webhook: ${type}`);

        // Route to appropriate handler based on event type
        let result;
        switch (type) {
            case 'member.created':
                result = await handleMemberCreated(data, webhookId);
                break;
                
            case 'member.updated':
                result = await handleMemberUpdated(data, webhookId);
                break;
                
            case 'subscription.created':
            case 'subscription.updated':
            case 'subscription.cancelled':
                result = await handleSubscriptionEvent(data, type, webhookId);
                break;
                
            default:
                console.log(`ℹ️ [${webhookId}] Unhandled webhook type: ${type}`);
                return res.status(200).json({ 
                    success: true, 
                    message: 'Event type acknowledged but not processed',
                    type: type,
                    webhookId: webhookId
                });
        }

        // Return the result from the specific handler
        return res.status(result.success ? 200 : 500).json({
            ...result,
            webhookId: webhookId
        });

    } catch (error) {
        console.error('Unexpected error in memberstack-webhook:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
} 