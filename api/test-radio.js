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

    try {
        console.log('Test API called with method:', req.method);
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Environment check:', {
            hasApiKey: !!process.env.BUNNY_API_KEY,
            hasStorageZone: !!process.env.BUNNY_STORAGE_ZONE,
            hasCdnUrl: !!process.env.BUNNY_CDN_URL
        });

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { lmid, world, recordings } = req.body;

        // Simple validation
        if (!lmid || !world || !recordings) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                received: { lmid: !!lmid, world: !!world, recordings: !!recordings }
            });
        }

        // Return a simple success response
        res.json({
            success: true,
            message: 'Test API working',
            data: {
                lmid,
                world,
                recordingCount: Object.keys(recordings).length,
                recordings: recordings
            }
        });

    } catch (error) {
        console.error('Test API error:', error);
        res.status(500).json({
            success: false,
            error: 'Test API failed',
            details: error.message,
            stack: error.stack
        });
    }
} 