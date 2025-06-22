export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Check environment variables without exposing their values
        const envCheck = {
            bunny_api_key: !!process.env.BUNNY_API_KEY,
            bunny_storage_zone: !!process.env.BUNNY_STORAGE_ZONE,
            bunny_cdn_url: !!process.env.BUNNY_CDN_URL
        };

        res.json({ 
            message: "API is working!", 
            method: req.method,
            timestamp: new Date().toISOString(),
            env_check: envCheck
        });

    } catch (error) {
        console.error('Test API error:', error);
        res.status(500).json({ 
            error: 'Test failed', 
            details: error.message 
        });
    }
} 