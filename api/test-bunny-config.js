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
        const hasApiKey = !!process.env.BUNNY_API_KEY;
        const hasStorageZone = !!process.env.BUNNY_STORAGE_ZONE;
        const hasCdnUrl = !!process.env.BUNNY_CDN_URL;
        
        // Test basic connectivity to Bunny.net (list root directory)
        let connectivityTest = null;
        if (hasApiKey && hasStorageZone) {
            try {
                const testUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/`;
                const testResponse = await fetch(testUrl, {
                    method: 'GET',
                    headers: {
                        'AccessKey': process.env.BUNNY_API_KEY
                    }
                });
                
                connectivityTest = {
                    status: testResponse.status,
                    ok: testResponse.ok,
                    statusText: testResponse.statusText
                };
                
                if (testResponse.ok) {
                    const contents = await testResponse.json();
                    connectivityTest.itemCount = Array.isArray(contents) ? contents.length : 'unknown';
                }
            } catch (error) {
                connectivityTest = {
                    error: error.message
                };
            }
        }

        res.json({
            success: true,
            environment: {
                hasApiKey,
                hasStorageZone,
                hasCdnUrl,
                storageZone: hasStorageZone ? process.env.BUNNY_STORAGE_ZONE : 'NOT_SET',
                cdnUrl: hasCdnUrl ? process.env.BUNNY_CDN_URL : 'NOT_SET'
            },
            connectivityTest,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Config test error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Configuration test failed', 
            details: error.message 
        });
    }
} 