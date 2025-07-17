/**
 * api/webhook-status.js - Webhook Configuration Status Check
 * 
 * PURPOSE: Check if webhook is properly configured without exposing secrets
 * USAGE: GET /api/webhook-status
 */

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            error: 'Method not allowed. Use GET.' 
        });
    }

    try {
        const webhookSecret = process.env.MEMBERSTACK_WEBHOOK_SECRET;
        const memberstackKey = process.env.MEMBERSTACK_SECRET_KEY;
        const brevoKey = process.env.BREVO_API_KEY;
        
        const status = {
            webhook_secret: webhookSecret ? 'configured' : 'missing',
            memberstack_key: memberstackKey ? 'configured' : 'missing',
            brevo_key: brevoKey ? 'configured' : 'missing',
            webhook_endpoint: 'https://little-microphones.vercel.app/api/memberstack-webhook',
            timestamp: new Date().toISOString()
        };
        
        const allConfigured = webhookSecret && memberstackKey && brevoKey;
        
        return res.status(200).json({
            success: true,
            status: allConfigured ? 'ready' : 'incomplete',
            configuration: status,
            next_steps: allConfigured ? 
                'All configured! You can test webhook from Memberstack Dashboard.' :
                'Please configure missing environment variables in Vercel.'
        });
        
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
} 