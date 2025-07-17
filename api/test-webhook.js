/**
 * api/test-webhook.js - Test Webhook Logic Without Signature
 * 
 * PURPOSE: Test webhook processing logic without signature verification
 * USAGE: POST to /api/test-webhook with member data
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        console.log('🧪 TEST WEBHOOK: Starting test...');
        
        // Create test member data (similar to Memberstack test)
        const testMember = req.body?.member || {
            id: 'mem_test_' + Date.now(),
            auth: { email: 'test@example.com' },
            email: 'test@example.com',
            customFields: {
                'first-name': 'Test User'
            },
            planConnections: req.body?.planConnections || [
                {
                    planId: 'pln_free-plan-dhnb0ejd', // Educator plan
                    active: true,
                    status: 'ACTIVE'
                }
            ],
            verified: true,
            stripeCustomerId: 'cus_test_123'
        };

        const testEvent = {
            type: req.body?.type || 'member.created',
            data: { member: testMember }
        };

        console.log('📧 TEST: Processing test event:', {
            type: testEvent.type,
            memberId: testMember.id,
            email: testMember.email,
            planCount: testMember.planConnections?.length || 0
        });

        const results = [];

        // LMID Assignment Logic (same as real webhook)
        try {
            const { assignLmidToMember, findNextAvailableLmid, generateAllShareIds } = await import('../utils/lmid-utils.js');
            const { getPlanConfig } = await import('../utils/brevo-contact-config.js');
            
            // Check if member is eligible for LMID
            const activePlans = testMember.planConnections?.filter(conn => conn.active && conn.status === 'ACTIVE') || [];
            console.log('🔍 TEST: Plan eligibility check:', {
                totalPlans: testMember.planConnections?.length || 0,
                activePlans: activePlans.length,
                planIds: activePlans.map(p => p.planId)
            });
            
            const isEligibleForLmid = activePlans.some(plan => {
                const planConfig = getPlanConfig(plan.planId);
                const isEligible = planConfig && (planConfig.category === 'educators' || planConfig.category === 'therapists');
                console.log(`📋 TEST: Plan ${plan.planId}: category=${planConfig?.category}, eligible=${isEligible}`);
                return isEligible;
            });
            
            if (isEligibleForLmid) {
                console.log(`🎯 TEST: Member ${testMember.id} is eligible for LMID assignment`);
                
                // Find next available LMID
                const nextLmid = await findNextAvailableLmid();
                if (nextLmid) {
                    console.log(`🔍 TEST: Found available LMID: ${nextLmid}`);
                    
                    // Generate ShareIDs for all worlds
                    const shareIds = await generateAllShareIds();
                    console.log(`🔗 TEST: Generated ShareIDs:`, shareIds);
                    
                    // Assign LMID to member
                    const assignmentResult = await assignLmidToMember(testMember.id, nextLmid, shareIds);
                    if (assignmentResult.success) {
                        results.push(`LMID assigned: ${nextLmid}`);
                        console.log(`✅ TEST: LMID ${nextLmid} assigned to member ${testMember.id}`);
                    } else {
                        results.push(`LMID assignment failed: ${assignmentResult.error}`);
                        console.error(`❌ TEST: LMID assignment failed:`, assignmentResult.error);
                    }
                } else {
                    results.push('LMID assignment failed: No available LMIDs');
                    console.error('❌ TEST: No available LMIDs found');
                }
            } else {
                const categories = activePlans.map(p => getPlanConfig(p.planId)?.category).filter(Boolean);
                console.log(`ℹ️ TEST: Member ${testMember.id} not eligible for LMID (categories: ${categories.join(', ') || 'none'})`);
                results.push(`Not eligible for LMID (categories: ${categories.join(', ') || 'none'})`);
            }
        } catch (lmidError) {
            console.error('❌ TEST: LMID assignment error:', lmidError);
            results.push(`LMID assignment error: ${lmidError.message}`);
        }

        // Brevo Synchronization (same as real webhook)
        try {
            const { syncMemberToBrevo } = await import('../utils/brevo-contact-manager.js');
            console.log('🔄 TEST: Starting Brevo sync...');
            
            const brevoResult = await syncMemberToBrevo(testMember);
            if (brevoResult.success) {
                results.push(`Brevo sync: ${brevoResult.action || 'completed'}`);
                console.log(`✅ TEST: Brevo sync successful for ${testMember.id}`);
            } else {
                console.warn('⚠️ TEST: Brevo sync failed:', brevoResult.error);
                results.push(`Brevo sync failed: ${brevoResult.error}`);
            }
        } catch (brevoError) {
            console.error('❌ TEST: Brevo sync error:', brevoError);
            results.push(`Brevo sync error: ${brevoError.message}`);
        }

        const response = {
            success: true,
            test: true,
            type: testEvent.type,
            member_id: testMember.id,
            email: testMember.email,
            results: results,
            timestamp: new Date().toISOString()
        };

        console.log('✅ TEST: Webhook test completed:', response);
        return res.status(200).json(response);

    } catch (error) {
        console.error('❌ TEST: Webhook test error:', {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 3)
        });
        
        return res.status(500).json({
            success: false,
            test: true,
            error: 'Internal server error',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
} 