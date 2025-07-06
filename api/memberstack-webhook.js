/**
 * api/memberstack-webhook.js - Memberstack Webhook Handler for New Educator Registration
 * 
 * PURPOSE: Handles new educator registration webhook from Memberstack and automatically assigns LMID
 * DEPENDENCIES: Supabase client, Memberstack API
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

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const worlds = ['spookyland', 'waterpark', 'shopping-spree', 'amusement-park', 'big-city', 'neighborhood'];

/**
 * Generate a random, URL-safe ShareID
 * @returns {string} 8-character random string
 */
function generateShareId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Check if a ShareID is already used in any world column
 * @param {string} shareId - ShareID to check
 * @returns {Promise<boolean>} True if already used
 */
async function isShareIdUsed(shareId) {
    const { data } = await supabase
        .from('lmids')
        .select('lmid')
        .or(`share_id_spookyland.eq.${shareId},share_id_waterpark.eq.${shareId},share_id_shopping_spree.eq.${shareId},share_id_amusement_park.eq.${shareId},share_id_big_city.eq.${shareId},share_id_neighborhood.eq.${shareId}`)
        .limit(1);
    
    return data && data.length > 0;
}

/**
 * Generate unique ShareIDs for all worlds
 * @returns {Promise<Object>} Object with world names as keys and ShareIDs as values
 */
async function generateAllShareIds() {
    const shareIds = {};
    
    for (const world of worlds) {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const shareId = generateShareId();
            const isUsed = await isShareIdUsed(shareId);
            
            if (!isUsed) {
                shareIds[world] = shareId;
                break;
            }
            
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            throw new Error(`Failed to generate unique ShareID for world: ${world}`);
        }
    }
    
    return shareIds;
}

/**
 * Find the next available LMID
 * @returns {Promise<number|null>} Next available LMID or null if none available
 */
async function findNextAvailableLmid() {
    const { data, error } = await supabase
        .from('lmids')
        .select('lmid')
        .eq('status', 'available')
        .order('lmid', { ascending: true })
        .limit(1);

    if (error) {
        console.error('Error finding available LMID:', error);
        return null;
    }

    return data.length > 0 ? data[0].lmid : null;
}

/**
 * Update Memberstack member metadata with LMID
 * @param {string} memberId - Memberstack member ID
 * @param {number} lmid - LMID to assign
 * @returns {Promise<boolean>} Success status
 */
async function updateMemberstackMetadata(memberId, lmid) {
    try {
        const memberstackApiKey = process.env.MEMBERSTACK_API_KEY;
        if (!memberstackApiKey) {
            console.error('MEMBERSTACK_API_KEY not configured');
            return false;
        }

        const response = await fetch(`https://api.memberstack.com/v1/members/${memberId}`, {
            method: 'PATCH',
            headers: {
                'X-API-Key': memberstackApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                metaData: {
                    lmids: lmid.toString()
                }
            })
        });

        if (!response.ok) {
            console.error('Failed to update Memberstack metadata:', response.status);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error updating Memberstack metadata:', error);
        return false;
    }
}

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

/**
 * Verify Memberstack webhook signature
 * @param {Object} req - Request object
 * @returns {boolean} True if webhook is valid
 */
function verifyMemberstackWebhook(req) {
    // TODO: Implement proper Memberstack webhook signature verification
    // For now, we'll do basic validation
    const userAgent = req.headers['user-agent'];
    const signature = req.headers['x-memberstack-signature'];
    
    // Basic validation - in production, verify the actual signature
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
        const updateData = {
            status: 'used',
            assigned_to_member_id: memberId,
            assigned_to_member_email: memberEmail,
            assigned_at: new Date().toISOString(),
            share_id_spookyland: shareIds.spookyland,
            share_id_waterpark: shareIds.waterpark,
            share_id_shopping_spree: shareIds['shopping-spree'],
            share_id_amusement_park: shareIds['amusement-park'],
            share_id_big_city: shareIds['big-city'],
            share_id_neighborhood: shareIds.neighborhood
        };

        const { error: updateError } = await supabase
            .from('lmids')
            .update(updateData)
            .eq('lmid', availableLmid);

        if (updateError) {
            console.error('Error assigning LMID to educator:', updateError);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to assign LMID to educator' 
            });
        }

        // Update Memberstack metadata
        const memberstackSuccess = await updateMemberstackMetadata(memberId, availableLmid);
        if (!memberstackSuccess) {
            console.warn('Failed to update Memberstack metadata, but LMID was assigned');
        }

        console.log(`Successfully assigned LMID ${availableLmid} to educator ${memberEmail}`);

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