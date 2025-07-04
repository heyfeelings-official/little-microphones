/**
 * api/handle-new-member.js - Memberstack Webhook Handler for Parent Registration
 * 
 * PURPOSE: Handles new member registration webhook from Memberstack and assigns LMID based on ShareID metadata
 * DEPENDENCIES: Supabase client, Memberstack webhook verification
 * 
 * REQUEST FORMAT:
 * POST /api/handle-new-member (Webhook from Memberstack)
 * Body: { type: "member.created", data: { member: {...}, metadata: { originating_share_id: "kz7xp4v9" } } }
 * 
 * RESPONSE FORMAT:
 * { success: true, message: "Member processed successfully", assignedLmid: 42 }
 * 
 * LOGIC:
 * 1. Verify webhook authenticity (Memberstack signature)
 * 2. Extract member data and originating_share_id from metadata
 * 3. Look up original LMID and world from ShareID
 * 4. Find next available LMID and assign to new member
 * 5. Update Supabase with new member assignment
 * 6. Return success confirmation
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Find the next available LMID in the database
 * @returns {Promise<number|null>} Next available LMID or null if none available
 */
async function findNextAvailableLmid() {
    try {
        const { data: availableLmids, error } = await supabase
            .from('lmids')
            .select('lmid')
            .eq('status', 'available')
            .order('lmid', { ascending: true })
            .limit(1);

        if (error) {
            console.error('Error finding available LMID:', error);
            return null;
        }

        return availableLmids.length > 0 ? availableLmids[0].lmid : null;
    } catch (error) {
        console.error('Unexpected error finding LMID:', error);
        return null;
    }
}

/**
 * Assign LMID to new member
 * @param {number} lmid - LMID to assign
 * @param {string} memberId - Memberstack member ID
 * @param {string} memberEmail - Member email address
 * @returns {Promise<boolean>} Success status
 */
async function assignLmidToMember(lmid, memberId, memberEmail) {
    try {
        const { error } = await supabase
            .from('lmids')
            .update({
                status: 'used',
                assigned_to_member_id: memberId,
                assigned_to_member_email: memberEmail,
                assigned_at: new Date().toISOString()
            })
            .eq('lmid', lmid);

        if (error) {
            console.error('Error assigning LMID:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Unexpected error assigning LMID:', error);
        return false;
    }
}

/**
 * Verify Memberstack webhook signature (basic implementation)
 * In production, you should implement proper signature verification
 * @param {Object} req - Request object
 * @returns {boolean} True if webhook is valid
 */
function verifyMemberstackWebhook(req) {
    // TODO: Implement proper Memberstack webhook signature verification
    // For now, we'll do basic validation
    const userAgent = req.headers['user-agent'];
    return userAgent && userAgent.includes('Memberstack');
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Memberstack-Signature');

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
        if (!verifyMemberstackWebhook(req)) {
            console.warn('Invalid webhook signature or source');
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
        const memberEmail = member.email;
        const metadata = member.metadata || {};
        const originatingShareId = metadata.originating_share_id;

        console.log(`Processing new member: ${memberEmail} (${memberId})`);

        // If no originating ShareID, this is a normal registration - no special handling needed
        if (!originatingShareId) {
            console.log('No originating ShareID found - normal registration');
            return res.status(200).json({ 
                success: true, 
                message: 'Normal member registration processed' 
            });
        }

        console.log(`Member originated from ShareID: ${originatingShareId}`);

        // Look up the original LMID and world from ShareID
        const { data: originalRecord, error: fetchError } = await supabase
            .from('lmids')
            .select('lmid, assigned_to_member_id')
            .eq('share_id', originatingShareId)
            .single();

        if (fetchError || !originalRecord) {
            console.error('Could not find original LMID for ShareID:', originatingShareId);
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid originating ShareID' 
            });
        }

        console.log(`Original LMID: ${originalRecord.lmid}, assigned to: ${originalRecord.assigned_to_member_id}`);

        // Find next available LMID for the new member
        const availableLmid = await findNextAvailableLmid();
        if (!availableLmid) {
            console.error('No available LMIDs for assignment');
            return res.status(500).json({ 
                success: false, 
                error: 'No available LMIDs for assignment' 
            });
        }

        // Assign the LMID to the new member
        const assignmentSuccess = await assignLmidToMember(availableLmid, memberId, memberEmail);
        if (!assignmentSuccess) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to assign LMID to new member' 
            });
        }

        console.log(`Successfully assigned LMID ${availableLmid} to new member ${memberEmail}`);

        return res.status(200).json({
            success: true,
            message: 'Member processed and LMID assigned successfully',
            assignedLmid: availableLmid,
            memberEmail: memberEmail,
            originatingShareId: originatingShareId,
            originalLmid: originalRecord.lmid
        });

    } catch (error) {
        console.error('Unexpected error in handle-new-member:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
} 