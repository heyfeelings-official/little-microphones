/**
 * api/test-registration.js - Test Registration Endpoint (Development Only)
 * 
 * PURPOSE: Test registration flow without webhook validation
 * USAGE: POST to /api/test-registration with member data
 * 
 * ⚠️ WARNING: This endpoint bypasses security validation
 * Only for testing purposes - disable in production
 * 
 * LAST UPDATED: January 2025
 */

import { 
    findNextAvailableLmid,
    generateAllShareIds,
    assignLmidToMember,
    updateMemberstackMetadata
} from '../utils/lmid-utils.js';
import { syncMemberToBrevo } from '../utils/brevo-contact-manager.js';

/**
 * Simple alert function for no LMID available
 * @param {string} email - Member email
 */
async function sendNoLmidAlert(email) {
    console.error(`🚨 NO LMID AVAILABLE for new member: ${email}`);
    // In production, this would send real alerts
}

/**
 * Process test registration (similar to handleMemberCreated but simplified)
 * @param {Object} memberData - Member data
 * @param {string} testId - Test identifier
 */
async function processTestRegistration(memberData, testId) {
    try {
        const memberId = memberData.id;
        const memberEmail = memberData.auth?.email || memberData.email;
        const planIds = memberData.planConnections?.map(conn => conn.planId) || [];
        
        console.log(`🧪 [${testId}] Processing test registration: ${memberEmail}`);
        console.log(`📋 [${testId}] Plans: ${planIds.join(', ')}`);
        
        // Determine if user needs LMID (educators/therapists)
        const needsLmid = planIds.some(planId => 
            planId.includes('educator') || 
            planId.includes('therapist') ||
            planId === 'pln_free-plan-dhnb0ejd'
        );
        
        let lmidResult = null;
        
        if (needsLmid) {
            console.log(`🎓 [${testId}] Member needs LMID - processing as educator/therapist`);
            
            // Find next available LMID
            const availableLmid = await findNextAvailableLmid();
            if (!availableLmid) {
                console.error(`❌ [${testId}] No available LMIDs for new educator`);
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
                console.error(`❌ [${testId}] Error assigning LMID to educator`);
                return {
                    success: false,
                    error: 'Failed to assign LMID to educator'
                };
            }

            // Update member data with new LMID for Brevo sync
            if (!memberData.metaData) {
                memberData.metaData = {};
            }
            memberData.metaData.lmids = availableLmid.toString();

            lmidResult = {
                assignedLmid: availableLmid,
                shareIds: shareIds,
                memberstackUpdated: true // Skip real Memberstack update in test
            };

            console.log(`✅ [${testId}] LMID ${availableLmid} assigned to ${memberEmail}`);
        } else {
            console.log(`👨‍👩‍👧‍👦 [${testId}] Member is parent - no LMID needed`);
        }

        // Synchronize to Brevo (for all member types)
        let brevoResult = null;
        try {
            brevoResult = await syncMemberToBrevo(memberData);
            console.log(`✅ [${testId}] Brevo sync ${brevoResult.success ? 'successful' : 'failed'}`);
        } catch (brevoError) {
            console.error(`❌ [${testId}] Brevo sync failed:`, brevoError.message);
            brevoResult = { success: false, error: brevoError.message };
        }

        return {
            success: true,
            message: 'Test registration processed successfully',
            data: {
                memberId,
                memberEmail,
                needsLmid,
                lmidResult,
                brevoResult
            }
        };

    } catch (error) {
        console.error(`❌ [${testId}] Error in processTestRegistration:`, error.message);
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
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }

    // Safety check - disable in production unless explicitly enabled
    const isTestingEnabled = process.env.ENABLE_TEST_ENDPOINTS === 'true' || 
                            process.env.NODE_ENV !== 'production';
    
    if (!isTestingEnabled) {
        return res.status(403).json({
            success: false,
            error: 'Test endpoint disabled in production'
        });
    }

    try {
        const { member } = req.body;
        
        if (!member) {
            return res.status(400).json({
                success: false,
                error: 'Missing member data in request body'
            });
        }
        
        const testId = Math.random().toString(36).substring(2, 15);
        
        console.log(`🧪 [${testId}] Test registration request received`);
        
        // Process the registration
        const result = await processTestRegistration(member, testId);
        
        if (result.success) {
            console.log(`✅ [${testId}] Test registration completed successfully`);
            return res.status(200).json(result);
        } else {
            console.log(`❌ [${testId}] Test registration failed: ${result.error}`);
            return res.status(400).json(result);
        }
        
    } catch (error) {
        console.error('❌ Error in test registration handler:', error.message);
        
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            details: error.message 
        });
    }
} 