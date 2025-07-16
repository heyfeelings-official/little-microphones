/**
 * api/test-env-vars.js - Test Environment Variables
 * 
 * PURPOSE: Check if environment variables are properly set in Vercel
 * WARNING: This file should be deleted after testing for security reasons
 */

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Basic security check - only allow during development
    const isDev = req.headers.host?.includes('localhost') || req.headers.host?.includes('vercel.app');
    if (!isDev) {
        return res.status(403).json({ error: 'Not available in production' });
    }
    
    const envVars = {
        MEMBERSTACK_WEBHOOK_SECRET: process.env.MEMBERSTACK_WEBHOOK_SECRET ? '✅ SET' : '❌ NOT SET',
        MEMBERSTACK_SECRET_KEY: process.env.MEMBERSTACK_SECRET_KEY ? '✅ SET' : '❌ NOT SET',
        SUPABASE_URL: process.env.SUPABASE_URL ? '✅ SET' : '❌ NOT SET',
        SUPABASE_KEY: process.env.SUPABASE_KEY ? '✅ SET' : '❌ NOT SET'
    };
    
    return res.status(200).json({
        message: 'Environment Variables Status',
        variables: envVars,
        webhook_secret_length: process.env.MEMBERSTACK_WEBHOOK_SECRET?.length || 0,
        timestamp: new Date().toISOString()
    });
} 