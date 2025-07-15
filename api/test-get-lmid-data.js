/**
 * api/test-get-lmid-data.js - Test the getLmidData function directly
 * 
 * PURPOSE: Debug the getLmidData function used in upload-audio.js
 * USAGE: GET /api/test-get-lmid-data?lmid=139
 */

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { lmid } = req.query;
        
        if (!lmid) {
            return res.status(400).json({ error: 'Missing lmid parameter' });
        }

        console.log(`🔍 Testing getLmidData for LMID ${lmid}`);
        console.log(`🌐 process.env.VERCEL_URL: ${process.env.VERCEL_URL}`);

        // Copy the exact getLmidData function from upload-audio.js
        const getLmidDataResult = await getLmidData(lmid);
        
        return res.status(200).json({
            success: true,
            lmid: lmid,
            result: getLmidDataResult,
            env: {
                VERCEL_URL: process.env.VERCEL_URL || 'not set',
                usedUrl: `${process.env.VERCEL_URL || 'https://little-microphones.vercel.app'}/api/lmid-operations`
            }
        });
        
    } catch (error) {
        console.error('❌ Test error:', error);
        return res.status(500).json({ 
            error: 'Test failed',
            details: error.message 
        });
    }
}

/**
 * Get LMID data including teacher and parent email addresses
 * @param {string} lmid - LMID number
 * @returns {Promise<Object>} LMID data with email addresses
 */
async function getLmidData(lmid) {
    try {
        const apiUrl = 'https://little-microphones.vercel.app/api/lmid-operations';
        console.log(`📡 Making API call to: ${apiUrl}`);
        
        const requestBody = {
            action: 'get',
            lmid: lmid
        };
        console.log(`📤 Request body:`, requestBody);
        
        // Call the existing lmid-operations API to get LMID data
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log(`📊 Response status: ${response.status}`);
        console.log(`📊 Response ok: ${response.ok}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API response error: ${response.status} - ${errorText}`);
            throw new Error(`Failed to fetch LMID data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📥 API response data:`, data);
        
        if (!data.success) {
            console.error(`❌ API returned error: ${data.error}`);
            throw new Error(`LMID data error: ${data.error}`);
        }
        
        const result = {
            lmid: lmid,
            teacherEmail: data.data.teacherEmail,
            teacherName: data.data.teacherName,
            schoolName: data.data.schoolName,
            parentEmails: data.data.parentEmails || [],
            parentMemberIdToEmail: data.data.parentMemberIdToEmail || {},
            shareId: data.data.shareId
        };
        
        console.log(`✅ Processed result:`, result);
        return result;
        
    } catch (error) {
        console.error('❌ Error fetching LMID data:', error);
        console.error('❌ Error stack:', error.stack);
        return null;
    }
} 