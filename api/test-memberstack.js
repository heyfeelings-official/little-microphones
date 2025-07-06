import { getSupabaseClient } from '../utils/lmid-utils.js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
    }

    const { memberId } = req.body;
    if (!memberId) {
        return res.status(400).json({ success: false, error: 'Missing required parameter: memberId' });
    }

    console.log(`🔧 [SYNC-MEMBERSTACK] Starting one-time sync for member: ${memberId}`);

    try {
        // Step 1: Fetch correct LMIDs from our database (Supabase)
        console.log('🔍 Fetching correct LMIDs from Supabase...');
        const supabase = getSupabaseClient();
        const { data: correctLmidRecords, error: dbError } = await supabase
            .from('lmids')
            .select('lmid')
            .eq('assigned_to_member_id', memberId)
            .eq('status', 'used')
            .order('lmid', { ascending: true });

        if (dbError) {
            console.error('❌ Supabase error:', dbError);
            throw new Error('Failed to fetch correct LMIDs from database.');
        }

        const correctLmidArray = correctLmidRecords.map(r => r.lmid);
        const correctLmidString = correctLmidArray.join(',');
        console.log(`📄 Correct LMIDs from Supabase: [${correctLmidString}]`);

        // Step 2: Force-update Memberstack metadata with the correct data
        console.log('📤 Preparing to force-update Memberstack...');
        const MEMBERSTACK_SECRET_KEY = process.env.MEMBERSTACK_SECRET_KEY;
        const MEMBERSTACK_API_URL = 'https://admin.memberstack.com';

        if (!MEMBERSTACK_SECRET_KEY) {
            throw new Error('MEMBERSTACK_SECRET_KEY not configured on server.');
        }

        const requestBody = {
            metaData: {
                lmids: correctLmidString
            }
        };

        const requestUrl = `${MEMBERSTACK_API_URL}/members/${memberId}`;
        console.log(`📤 Making PATCH request to: ${requestUrl}`);
        console.log(`📤 Request body:`, JSON.stringify(requestBody, null, 2));

        const response = await fetch(requestUrl, {
            method: 'PATCH',
            headers: {
                'x-api-key': MEMBERSTACK_SECRET_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log(`📥 Memberstack response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Memberstack API error:`, errorText);
            throw new Error(`Failed to update Memberstack metadata. Status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('✅ Memberstack metadata synchronized successfully!');

        return res.status(200).json({
            success: true,
            message: `Successfully synchronized Memberstack metadata for member ${memberId}.`,
            synchronizedLmids: correctLmidString,
            memberstackResponse: responseData
        });

    } catch (error) {
        console.error('❌ [SYNC-MEMBERSTACK] Error during sync process:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'An internal server error occurred during the sync process.'
        });
    }
} 