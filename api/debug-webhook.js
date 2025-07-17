/**
 * api/debug-webhook.js - Debug Webhook Endpoint
 * 
 * PURPOSE: Dedicated endpoint for debugging webhook issues with detailed logging
 * USAGE: Test webhook from Memberstack to /api/debug-webhook
 */

export default async function handler(req, res) {
    console.log('🚀 DEBUG WEBHOOK: Request received');
    console.log('📋 Method:', req.method);
    console.log('🔗 URL:', req.url);
    console.log('📦 Headers:', JSON.stringify(req.headers, null, 2));

    try {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            console.log('✅ DEBUG: OPTIONS request handled');
            return res.status(200).end();
        }

        if (req.method !== 'POST') {
            console.log('❌ DEBUG: Invalid method:', req.method);
            return res.status(405).json({ error: 'Method not allowed' });
        }

        console.log('🔍 DEBUG: Processing POST request...');

        // Get raw body
        let rawBody = '';
        let parsedBody = null;

        try {
            // Try to get raw body using micro buffer
            const { buffer } = await import('micro');
            const bodyBuffer = await buffer(req);
            rawBody = bodyBuffer.toString('utf8');
            console.log('✅ DEBUG: Raw body extracted via micro buffer');
            console.log('📏 Body length:', rawBody.length);
            console.log('📄 Body preview:', rawBody.substring(0, 200) + '...');
        } catch (bufferError) {
            console.error('❌ DEBUG: Error extracting raw body:', bufferError.message);
            
            // Fallback to req.body
            if (req.body) {
                rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
                console.log('⚠️ DEBUG: Using fallback req.body');
            } else {
                console.error('❌ DEBUG: No body available');
                return res.status(400).json({ error: 'No body data' });
            }
        }

        // Parse JSON
        try {
            parsedBody = JSON.parse(rawBody);
            console.log('✅ DEBUG: JSON parsed successfully');
            console.log('📊 Parsed body structure:', {
                hasEvent: !!parsedBody.event,
                hasType: !!parsedBody.type,
                hasData: !!parsedBody.data,
                hasMember: !!parsedBody.data?.member,
                eventType: parsedBody.event || parsedBody.type
            });
        } catch (jsonError) {
            console.error('❌ DEBUG: JSON parse error:', jsonError.message);
            return res.status(400).json({ error: 'Invalid JSON' });
        }

        // Check for required webhook data
        const eventType = parsedBody.event || parsedBody.type;
        const member = parsedBody.data?.member || parsedBody.member;

        console.log('🧩 DEBUG: Event analysis:', {
            eventType,
            hasMember: !!member,
            memberId: member?.id,
            memberEmail: member?.email || member?.auth?.email,
            planConnections: member?.planConnections?.length || 0
        });

        if (!eventType) {
            console.error('❌ DEBUG: Missing event type');
            return res.status(400).json({ error: 'Missing event type' });
        }

        if (!member || !member.id) {
            console.error('❌ DEBUG: Missing member data');
            return res.status(400).json({ error: 'Missing member data' });
        }

        // Test basic imports
        console.log('🔧 DEBUG: Testing imports...');
        
        try {
            const configModule = await import('../utils/brevo-contact-config.js');
            console.log('✅ DEBUG: brevo-contact-config imported successfully');
            
            const { getPlanConfig } = configModule;
            if (typeof getPlanConfig === 'function') {
                console.log('✅ DEBUG: getPlanConfig function available');
            } else {
                console.error('❌ DEBUG: getPlanConfig is not a function');
            }
        } catch (importError) {
            console.error('❌ DEBUG: Import error (brevo-contact-config):', importError.message);
        }

        try {
            const lmidModule = await import('../utils/lmid-utils.js');
            console.log('✅ DEBUG: lmid-utils imported successfully');
            
            const { findNextAvailableLmid, generateAllShareIds, assignLmidToMember } = lmidModule;
            console.log('✅ DEBUG: LMID functions available:', {
                findNextAvailableLmid: typeof findNextAvailableLmid,
                generateAllShareIds: typeof generateAllShareIds,
                assignLmidToMember: typeof assignLmidToMember
            });
        } catch (importError) {
            console.error('❌ DEBUG: Import error (lmid-utils):', importError.message);
        }

        try {
            const brevoModule = await import('../utils/brevo-contact-manager.js');
            console.log('✅ DEBUG: brevo-contact-manager imported successfully');
            
            const { syncMemberToBrevo } = brevoModule;
            console.log('✅ DEBUG: syncMemberToBrevo available:', typeof syncMemberToBrevo);
        } catch (importError) {
            console.error('❌ DEBUG: Import error (brevo-contact-manager):', importError.message);
        }

        // Test environment variables
        console.log('🌍 DEBUG: Environment check:', {
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
            hasBrevoKey: !!process.env.BREVO_API_KEY,
            hasMemberstackKey: !!process.env.MEMBERSTACK_SECRET_KEY,
            hasWebhookSecret: !!process.env.MEMBERSTACK_WEBHOOK_SECRET
        });

        // Return detailed debug response
        const debugResponse = {
            success: true,
            debug: true,
            timestamp: new Date().toISOString(),
            request: {
                method: req.method,
                headers: Object.keys(req.headers),
                bodyLength: rawBody.length,
                contentType: req.headers['content-type']
            },
            webhook: {
                eventType,
                memberId: member.id,
                memberEmail: member.email || member.auth?.email,
                planConnections: member.planConnections?.length || 0
            },
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch
            }
        };

        console.log('✅ DEBUG: Webhook debug completed successfully');
        console.log('📋 DEBUG: Response:', JSON.stringify(debugResponse, null, 2));

        return res.status(200).json(debugResponse);

    } catch (error) {
        console.error('💥 DEBUG: Critical error:', {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5)
        });

        return res.status(500).json({
            success: false,
            debug: true,
            error: error.message,
            name: error.name,
            timestamp: new Date().toISOString()
        });
    }
} 