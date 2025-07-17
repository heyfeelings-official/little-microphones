/**
 * api/simple-webhook.js - Minimal Webhook Endpoint
 * 
 * PURPOSE: Minimal webhook endpoint without any external imports to test basic functionality
 * USAGE: Test webhook from Memberstack to /api/simple-webhook
 */

export default async function handler(req, res) {
    console.log('🎯 SIMPLE WEBHOOK: Started');
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'Simple webhook endpoint is running',
            timestamp: new Date().toISOString()
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('📥 SIMPLE: Received POST request');
        console.log('📋 Headers:', req.headers);
        
        // Get body - try different approaches
        let body = null;
        let rawBody = '';

        if (req.body) {
            body = req.body;
            rawBody = typeof body === 'string' ? body : JSON.stringify(body);
            console.log('✅ SIMPLE: Got body from req.body');
        } else {
            console.log('⚠️ SIMPLE: No req.body available');
        }

        console.log('📄 SIMPLE: Body type:', typeof body);
        console.log('📏 SIMPLE: Raw body length:', rawBody.length);
        console.log('🔍 SIMPLE: Body preview:', rawBody.substring(0, 100));

        // Try to parse as JSON if it's a string
        let parsedBody = body;
        if (typeof body === 'string') {
            try {
                parsedBody = JSON.parse(body);
                console.log('✅ SIMPLE: JSON parsed successfully');
            } catch (e) {
                console.log('❌ SIMPLE: JSON parse failed:', e.message);
            }
        }

        // Extract basic info
        const eventType = parsedBody?.type || parsedBody?.event || 'unknown';
        const memberId = parsedBody?.data?.member?.id || parsedBody?.member?.id || 'unknown';
        
        console.log('📊 SIMPLE: Event info:', {
            eventType,
            memberId,
            hasData: !!parsedBody?.data,
            hasMember: !!(parsedBody?.data?.member || parsedBody?.member)
        });

        const response = {
            success: true,
            simple: true,
            message: 'Simple webhook received successfully',
            timestamp: new Date().toISOString(),
            received: {
                method: req.method,
                contentType: req.headers['content-type'],
                userAgent: req.headers['user-agent'],
                bodyLength: rawBody.length,
                eventType,
                memberId
            }
        };

        console.log('✅ SIMPLE: Webhook processed successfully');
        return res.status(200).json(response);

    } catch (error) {
        console.error('💥 SIMPLE: Error:', error);
        return res.status(500).json({
            success: false,
            simple: true,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
} 