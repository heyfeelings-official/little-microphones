/**
 * Server-Sent Events endpoint for real-time job status updates
 * Replaces polling mechanism with push-based updates
 */

export default async function handler(req, res) {
    console.log('🔄 SSE: New connection established');
    
    // CORS headers for SSE
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { jobId } = req.query;
    
    if (!jobId) {
        return res.status(400).json({ error: 'jobId parameter is required' });
    }
    
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    console.log(`📡 SSE: Monitoring job ${jobId}`);
    
    let checkCount = 0;
    const maxChecks = 300; // 5 minutes max (300 * 1000ms)
    
    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    const checkJobStatus = async () => {
        try {
            checkCount++;
            
            // Import Supabase client
            const { getSupabaseClient } = await import('../utils/database-utils.js');
            const supabase = getSupabaseClient();
            
            // Get job status
            const { data: job, error } = await supabase
                .from('audio_generation_jobs')
                .select('*')
                .eq('id', jobId)
                .single();
            
            if (error) {
                console.error('❌ SSE: Database error:', error);
                sendEvent({
                    type: 'error',
                    message: 'Failed to fetch job status',
                    error: error.message
                });
                res.end();
                return;
            }
            
            if (!job) {
                console.error('❌ SSE: Job not found:', jobId);
                sendEvent({
                    type: 'error',
                    message: 'Job not found'
                });
                res.end();
                return;
            }
            
            // Send status update
            const statusData = {
                type: 'status',
                jobId: job.id,
                status: job.status,
                created_at: job.created_at,
                started_at: job.started_at,
                completed_at: job.completed_at,
                lmid: job.lmid,
                world: job.world,
                lang: job.lang,
                programType: job.type,
                fileCount: job.file_count
            };
            
            // Add result data if completed
            if (job.status === 'completed' && job.program_url) {
                statusData.programUrl = job.program_url;
                statusData.manifestData = job.manifest_data;
            }
            
            // Add error if failed
            if (job.status === 'failed' && job.error_message) {
                statusData.error = job.error_message;
            }
            
            console.log(`📊 SSE: Job ${jobId} status: ${job.status} (check ${checkCount})`);
            sendEvent(statusData);
            
            // End connection if job is completed or failed
            if (job.status === 'completed' || job.status === 'failed') {
                console.log(`✅ SSE: Job ${jobId} finished with status: ${job.status}`);
                res.end();
                return;
            }
            
            // End connection if max checks reached
            if (checkCount >= maxChecks) {
                console.log(`⏰ SSE: Max checks reached for job ${jobId}`);
                sendEvent({
                    type: 'timeout',
                    message: 'Maximum monitoring time reached'
                });
                res.end();
                return;
            }
            
            // Schedule next check
            setTimeout(checkJobStatus, 1000); // Check every second
            
        } catch (error) {
            console.error('❌ SSE: Unexpected error:', error);
            sendEvent({
                type: 'error',
                message: 'Unexpected error occurred',
                error: error.message
            });
            res.end();
        }
    };
    
    // Handle client disconnect
    req.on('close', () => {
        console.log(`🔌 SSE: Client disconnected from job ${jobId}`);
    });
    
    req.on('error', (err) => {
        console.error('❌ SSE: Connection error:', err);
    });
    
    // Send initial connection confirmation
    sendEvent({
        type: 'connected',
        message: `Monitoring job ${jobId}`,
        timestamp: new Date().toISOString()
    });
    
    // Start monitoring
    checkJobStatus();
}
