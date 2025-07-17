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
        
        // Log the entire webhook payload for debugging
        console.log('=== FULL WEBHOOK DATA ===');
        console.log('Raw data:', JSON.stringify(data, null, 2));
        console.log('=== END WEBHOOK DATA ===');

        if (!member) {
            console.log('❌ Missing member data in webhook');
            return res.status(400).json({ error: 'Missing member data' });
        }

        // Variable to store full member data
        let fullMemberData = member;

        // Handle different event types
        console.log(`📍 Processing event: ${eventType}`);
        
        switch(eventType) {
            case 'member.created':
            case 'member.updated':
                console.log('Processing member event:', member.id || member.auth?.email);
                console.log('Full member data:', JSON.stringify(member, null, 2));

                // Get full member data if we only have minimal webhook data
                if (!member.id || !member.customFields) {
                    console.log('⚠️ Webhook has minimal data - some features may be limited');
                    console.log('⚠️ Available data:', {
                        hasId: !!member.id,
                        hasEmail: !!member.auth?.email,
                        hasCustomFields: !!member.customFields,
                        hasMetaData: !!member.metaData,
                        hasPlanConnections: !!(member.planConnections && member.planConnections.length > 0)
                    });
                }

                // Check if planConnections exists in payload
                if (!fullMemberData.planConnections && data.payload?.planConnections) {
                    console.log('📊 Found planConnections in payload, merging with member data');
                    fullMemberData.planConnections = data.payload.planConnections;
                }
                
                // Additional check - sometimes planConnections might be at root level
                if (!fullMemberData.planConnections && data.planConnections) {
                    console.log('📊 Found planConnections at root level, merging with member data');
                    fullMemberData.planConnections = data.planConnections;
                }
                
                // For member.created event, check if plan info is in the original payload
                if (!fullMemberData.planConnections && eventType === 'member.created') {
                    // Check the original verifiedPayload structure
                    const originalData = typeof verifiedPayload === 'object' ? verifiedPayload : JSON.parse(verifiedPayload);
                    if (originalData.payload?.planConnections) {
                        console.log('📊 Found planConnections in original payload for member.created');
                        fullMemberData.planConnections = originalData.payload.planConnections;
                    }
                }
                
                // For debugging - log all possible data sources
                console.log('🔍 Data sources check:', {
                    memberHasPlans: !!(member.planConnections && member.planConnections.length > 0),
                    fullMemberHasPlans: !!(fullMemberData.planConnections && fullMemberData.planConnections.length > 0),
                    payloadHasPlans: !!(data.payload?.planConnections && data.payload.planConnections.length > 0),
                    dataHasPlans: !!(data.planConnections && data.planConnections.length > 0)
                });
                
                // Final check - log what we have
                if (fullMemberData.planConnections && fullMemberData.planConnections.length > 0) {
                    console.log('✅ Plan connections found:', fullMemberData.planConnections.map(p => ({
                        planId: p.planId,
                        status: p.status,
                        active: p.active
                    })));
                } else {
                    console.log('⚠️ No plan connections found after all checks');
                }

                // 1. Always sync to Brevo (for all users)
                try {
                    const { syncMemberToBrevo } = await import('../utils/brevo-contact-manager.js');
                    const brevoResult = await syncMemberToBrevo(fullMemberData);
                    if (brevoResult.success) {
                        console.log('✅ Brevo contact sync completed:', brevoResult.action);
                        
                        // If we synced as basic (no plan) but now found plans, update immediately
                        if (brevoResult.action === 'created_basic' || brevoResult.action === 'updated_basic') {
                            if (fullMemberData.planConnections && fullMemberData.planConnections.length > 0) {
                                console.log('🔄 Found plans after basic sync, updating Brevo with plan data...');
                                const updateResult = await syncMemberToBrevo(fullMemberData);
                                if (updateResult.success) {
                                    console.log('✅ Brevo updated with plan data:', updateResult.action);
                                }
                            }
                        }
                    } else {
                        console.log('❌ Brevo sync failed:', brevoResult.error);
                    }
                } catch (brevoError) {
                    console.log('❌ Brevo sync failed:', brevoError.message);
                    console.log('Error details:', brevoError.stack);
                }

                // 2. Check if user has plans to determine category
                const activePlans = fullMemberData.planConnections?.filter(conn => 
                    conn.status === 'ACTIVE' || conn.active === true
                ) || [];
                
                console.log('Active plans:', activePlans.map(p => p.planId));

                // 3. Determine user category from plans
                let userCategory = null;
                if (activePlans.length > 0) {
                    const { getPlanConfig } = await import('../utils/brevo-contact-config.js');
                    for (const plan of activePlans) {
                        const planConfig = getPlanConfig(plan.planId);
                        if (planConfig) {
                            userCategory = planConfig.attributes.USER_CATEGORY;
                            console.log(`📋 User category determined from plan ${plan.planId}: ${userCategory}`);
                            break;
                        }
                    }
                }

                // 4. Assign LMID only for educators and therapists
                if (userCategory === 'educators' || userCategory === 'therapists') {
                    console.log(`🎓 User is ${userCategory} - checking for LMID assignment`);
                    try {
                        // Check if user already has LMID
                        if (fullMemberData.metaData?.lmids) {
                            console.log('ℹ️ User already has LMID:', fullMemberData.metaData.lmids);
                        } else {
                            // Find next available LMID
                            const nextLmid = await findNextAvailableLmid();
                            if (!nextLmid) {
                                console.log('❌ No available LMIDs for assignment');
                            } else {
                                console.log('📍 Found available LMID:', nextLmid);

                                // Generate ShareIDs for all worlds
                                const shareIds = await generateAllShareIds();
                                console.log('🎲 Generated ShareIDs:', shareIds);

                                // Get member ID and email
                                const memberId = fullMemberData.id || fullMemberData.auth?.email || fullMemberData.email;
                                const memberEmail = fullMemberData.auth?.email || fullMemberData.email;
                                
                                if (!memberEmail || !memberId) {
                                    console.log('❌ Member email or ID not found');
                                } else {
                                    // Assign LMID to member
                                    const assignmentSuccess = await assignLmidToMember(nextLmid, memberId, memberEmail, shareIds);
                                    if (assignmentSuccess) {
                                        console.log('✅ LMID assigned successfully:', nextLmid);
                                        
                                        // Update Memberstack metadata
                                        try {
                                            const { updateMemberstackMetadata } = await import('../utils/lmid-utils.js');
                                            await updateMemberstackMetadata(memberId, nextLmid.toString());
                                            console.log('✅ Memberstack metadata updated');
                                        } catch (metaError) {
                                            console.log('⚠️ Failed to update Memberstack metadata:', metaError.message);
                                        }
                                    } else {
                                        console.log('❌ LMID assignment failed');
                                    }
                                }
                            }
                        }
                    } catch (lmidError) {
                        console.log('❌ LMID assignment error:', lmidError.message);
                    }
                } else if (userCategory === 'parents') {
                    console.log('👨‍👩‍👧‍👦 Parent user - no LMID needed');
                } else {
                    console.log('⚠️ No active plans yet - LMID assignment pending until plan selection');
                }
                break;

            case 'member.plan.added':
            case 'member.plan.updated':
            case 'member.plan.canceled':
                console.log(`💳 Processing plan event: ${eventType}`);
                console.log('Plan event data:', JSON.stringify(data, null, 2));
                
                // For plan events, we need to resync the member to Brevo
                // to update their segments based on new plan status
                try {
                    // Get the member data - it could be in different places
                    let planMember = member || data.member || data.payload?.member || data.payload;
                    
                    // For plan events, sometimes the full member data is at root
                    if (!planMember || !planMember.id) {
                        console.log('🔍 Looking for member data in plan event...');
                        // Try to extract member ID and fetch full data
                        const memberId = data.memberId || data.member_id || data.payload?.memberId;
                        if (memberId) {
                            console.log(`📥 Found member ID ${memberId}, would fetch full data (not implemented)`);
                            // TODO: Implement getMemberById if needed
                        }
                    }
                    
                    if (planMember && (planMember.id || planMember.auth?.email)) {
                        console.log(`👤 Processing plan change for member: ${planMember.id || planMember.auth?.email}`);
                        
                        // Ensure planConnections is included
                        if (!planMember.planConnections && data.planConnections) {
                            planMember.planConnections = data.planConnections;
                        }
                        if (!planMember.planConnections && data.payload?.planConnections) {
                            planMember.planConnections = data.payload.planConnections;
                        }
                        
                        const { syncMemberToBrevo } = await import('../utils/brevo-contact-manager.js');
                        const brevoResult = await syncMemberToBrevo(planMember);
                        if (brevoResult.success) {
                            console.log('✅ Brevo sync after plan change completed');
                        } else {
                            console.log('❌ Brevo sync after plan change failed:', brevoResult.error);
                        }
                        
                        // For plan.added, check if we need to assign LMID
                        if (eventType === 'member.plan.added') {
                            console.log('🆕 New plan added - checking if LMID assignment needed');
                            // The member.updated event will handle LMID assignment
                            // as Memberstack typically sends both events
                        }
                    } else {
                        console.log('⚠️ No member data in plan event');
                    }
                } catch (planError) {
                    console.log('❌ Error processing plan event:', planError.message);
                }
                break;

            case 'member.deleted':
                console.log('🗑️ Processing member deletion');
                // Optional: Mark contact as deleted in Brevo or remove from lists
                try {
                    const deletedEmail = member?.auth?.email || member?.email;
                    if (deletedEmail) {
                        console.log(`📧 Member deleted: ${deletedEmail}`);
                        // You can implement Brevo contact deletion/deactivation here if needed
                    }
                } catch (deleteError) {
                    console.log('❌ Error processing deletion:', deleteError.message);
                }
                break;

            case 'team.member.added':
            case 'team.member.removed':
                console.log(`👥 Team event: ${eventType}`);
                console.log('Team data:', JSON.stringify(data, null, 2));
                // Handle team events if needed for your use case
                break;

            default:
                console.log(`ℹ️ Unhandled event type: ${eventType}`);
                console.log('Event data:', JSON.stringify(data, null, 2));
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