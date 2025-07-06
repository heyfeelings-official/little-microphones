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

        // Test 2: Update metadata - Try multiple formats
        const testLmids = "43,46,73";
        
        // Try 1: metadata (lowercase)
        console.log(`📤 PATCH request to: ${MEMBERSTACK_API_URL}/members/${memberId}`);
        console.log(`🧪 Testing format 1: metadata (lowercase)`);
        
        const requestBody1 = {
            metadata: {
                lmids: testLmids
            }
        };
        console.log(`📤 Request body 1:`, JSON.stringify(requestBody1, null, 2));

        const patchResponse1 = await fetch(`${MEMBERSTACK_API_URL}/members/${memberId}`, {
            method: 'PATCH',
            headers: {
                'x-api-key': MEMBERSTACK_SECRET_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody1)
        });

        console.log(`📥 Response 1 status: ${patchResponse1.status} ${patchResponse1.statusText}`);
        
        if (patchResponse1.ok) {
            const responseData1 = await patchResponse1.json();
            console.log('✅ Format 1 successful:', JSON.stringify(responseData1, null, 2));
            
            return res.status(200).json({
                success: true,
                message: 'Memberstack API test successful with format 1',
                currentData: currentData,
                updateResponse: responseData1
            });
        }
        
        // Try 2: metaData (camelCase)
        console.log(`🧪 Testing format 2: metaData (camelCase)`);
        
        const requestBody2 = {
            metaData: {
                lmids: testLmids
            }
        };
        console.log(`📤 Request body 2:`, JSON.stringify(requestBody2, null, 2));

        const patchResponse2 = await fetch(`${MEMBERSTACK_API_URL}/members/${memberId}`, {
            method: 'PATCH',
            headers: {
                'x-api-key': MEMBERSTACK_SECRET_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody2)
        });

        console.log(`📥 Response 2 status: ${patchResponse2.status} ${patchResponse2.statusText}`);
        
        if (patchResponse2.ok) {
            const responseData2 = await patchResponse2.json();
            console.log('✅ Format 2 successful:', JSON.stringify(responseData2, null, 2));
            
            return res.status(200).json({
                success: true,
                message: 'Memberstack API test successful with format 2',
                currentData: currentData,
                updateResponse: responseData2
            });
        }
        
        // Try 3: Direct lmids property
        console.log(`🧪 Testing format 3: direct lmids property`);
        
        const requestBody3 = {
            lmids: testLmids
        };
        console.log(`📤 Request body 3:`, JSON.stringify(requestBody3, null, 2));

        const patchResponse3 = await fetch(`${MEMBERSTACK_API_URL}/members/${memberId}`, {
            method: 'PATCH',
            headers: {
                'x-api-key': MEMBERSTACK_SECRET_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody3)
        });

        console.log(`📥 Response 3 status: ${patchResponse3.status} ${patchResponse3.statusText}`);
        
        const patchResponse = patchResponse3; // Use last response for error handling

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