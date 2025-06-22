export default function handler(req, res) {
    res.status(200).json({ 
        message: 'API is working!',
        method: req.method,
        timestamp: new Date().toISOString(),
        env_check: {
            bunny_api_key: process.env.BUNNY_API_KEY ? 'SET' : 'NOT SET',
            bunny_storage_zone: process.env.BUNNY_STORAGE_ZONE ? 'SET' : 'NOT SET',
            bunny_cdn_url: process.env.BUNNY_CDN_URL ? 'SET' : 'NOT SET'
        }
    });
} 