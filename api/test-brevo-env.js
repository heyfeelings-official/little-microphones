/**
 * api/test-brevo-env.js - Test Brevo environment variables
 * 
 * PURPOSE: Debug if BREVO_API_KEY is properly configured
 * USAGE: GET /api/test-brevo-env
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
        const brevoApiKey = process.env.BREVO_API_KEY;
        
        return res.status(200).json({
            success: true,
            hasBrevoApiKey: !!brevoApiKey,
            brevoKeyLength: brevoApiKey ? brevoApiKey.length : 0,
            brevoKeyPrefix: brevoApiKey ? brevoApiKey.substring(0, 10) + '...' : null,
            allEnvVars: {
                BUNNY_API_KEY: !!process.env.BUNNY_API_KEY,
                BUNNY_STORAGE_ZONE: !!process.env.BUNNY_STORAGE_ZONE,
                BUNNY_CDN_URL: !!process.env.BUNNY_CDN_URL,
                BREVO_API_KEY: !!process.env.BREVO_API_KEY,
                SUPABASE_URL: !!process.env.SUPABASE_URL,
                SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
                MEMBERSTACK_SECRET_KEY: !!process.env.MEMBERSTACK_SECRET_KEY,
                VERCEL_URL: !!process.env.VERCEL_URL,
                NODE_ENV: process.env.NODE_ENV || 'not set'
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