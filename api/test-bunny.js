export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Check environment variables
        const envCheck = {
            bunny_api_key_present: !!process.env.BUNNY_API_KEY,
            bunny_api_key_length: process.env.BUNNY_API_KEY ? process.env.BUNNY_API_KEY.length : 0,
            bunny_storage_zone: process.env.BUNNY_STORAGE_ZONE,
            bunny_cdn_url: process.env.BUNNY_CDN_URL
        };

        console.log('Environment check:', envCheck);

        // Test a simple GET request to Bunny.net storage to check authentication
        const testUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/`;
        
        console.log('Testing Bunny.net connection with URL:', testUrl);
        
        const testResponse = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY
            }
        });

        const responseText = await testResponse.text();
        
        console.log('Bunny.net test response:', {
            status: testResponse.status,
            statusText: testResponse.statusText,
            headers: Object.fromEntries(testResponse.headers.entries()),
            body: responseText.substring(0, 500) // First 500 chars
        });

        // Try to upload a tiny test file
        const testContent = 'test-file-content';
        const testFilename = `test-${Date.now()}.txt`;
        const uploadUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${testFilename}`;
        
        console.log('Testing upload with URL:', uploadUrl);
        
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'text/plain'
            },
            body: testContent
        });

        const uploadResponseText = await uploadResponse.text();
        
        console.log('Bunny.net upload test response:', {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            headers: Object.fromEntries(uploadResponse.headers.entries()),
            body: uploadResponseText
        });

        // Return comprehensive diagnostic info
        res.json({
            message: "Bunny.net diagnostic test completed",
            timestamp: new Date().toISOString(),
            environment_variables: envCheck,
            list_test: {
                url: testUrl,
                status: testResponse.status,
                statusText: testResponse.statusText,
                success: testResponse.ok
            },
            upload_test: {
                url: uploadUrl,
                filename: testFilename,
                status: uploadResponse.status,
                statusText: uploadResponse.statusText,
                success: uploadResponse.ok,
                response_body: uploadResponseText
            }
        });

    } catch (error) {
        console.error('Bunny.net test error:', error);
        res.status(500).json({ 
            error: 'Test failed', 
            details: error.message,
            stack: error.stack
        });
    }
} 