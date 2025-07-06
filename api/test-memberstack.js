export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }

    const MEMBERSTACK_SECRET_KEY = process.env.MEMBERSTACK_SECRET_KEY;
    const MEMBERSTACK_API_URL = 'https://admin.memberstack.com';
    
    console.log('🔧 [test-memberstack] Starting test...');
    console.log(`🔑 MEMBERSTACK_SECRET_KEY configured: ${!!MEMBERSTACK_SECRET_KEY}`);
    
    if (!MEMBERSTACK_SECRET_KEY) {
        return res.status(500).json({ 
            success: false, 
            error: 'MEMBERSTACK_SECRET_KEY not configured' 
        });
    }

    try {
        const { memberId } = req.body;
        
        if (!memberId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing memberId parameter' 
            });
        }

        // Test 1: Get current member data
        console.log(`📤 GET request to: ${MEMBERSTACK_API_URL}/members/${memberId}`);
        
        const getResponse = await fetch(`${MEMBERSTACK_API_URL}/members/${memberId}`, {
            method: 'GET',
            headers: {
                'x-api-key': MEMBERSTACK_SECRET_KEY,
                'Content-Type': 'application/json',
            }
        });

        console.log(`📥 GET Response status: ${getResponse.status} ${getResponse.statusText}`);

        if (!getResponse.ok) {
            const errorText = await getResponse.text();
            console.error(`❌ GET request failed:`, errorText);
            return res.status(500).json({ 
                success: false, 
                error: `GET request failed: ${getResponse.status} ${errorText}` 
            });
        }

        const currentData = await getResponse.json();
        console.log('📄 Current member data:', JSON.stringify(currentData, null, 2));

        // Test 2: Update metadata
        const testLmids = "43,46,73";
        const requestBody = {
            metaData: {
                lmids: testLmids
            }
        };
        
        console.log(`📤 PATCH request to: ${MEMBERSTACK_API_URL}/members/${memberId}`);
        console.log(`📤 Request body:`, JSON.stringify(requestBody, null, 2));

        const patchResponse = await fetch(`${MEMBERSTACK_API_URL}/members/${memberId}`, {
            method: 'PATCH',
            headers: {
                'x-api-key': MEMBERSTACK_SECRET_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log(`📥 PATCH Response status: ${patchResponse.status} ${patchResponse.statusText}`);

        if (patchResponse.ok) {
            const responseData = await patchResponse.json();
            console.log('✅ PATCH successful:', JSON.stringify(responseData, null, 2));
            
            return res.status(200).json({
                success: true,
                message: 'Memberstack API test successful',
                currentData: currentData,
                updateResponse: responseData
            });
        } else {
            const errorText = await patchResponse.text();
            console.error(`❌ PATCH request failed:`, errorText);
            return res.status(500).json({ 
                success: false, 
                error: `PATCH request failed: ${patchResponse.status} ${errorText}` 
            });
        }

    } catch (error) {
        console.error('❌ Network error during Memberstack API test:', error);
        return res.status(500).json({ 
            success: false, 
            error: `Network error: ${error.message}` 
        });
    }
} 