/**
 * api/get-job-status.js - Audio Generation Job Status Checker
 * 
 * PURPOSE: Check status of audio generation jobs in Supabase queue system
 * DATABASE: Queries audio_generation_jobs table for job status and results
 * 
 * REQUEST FORMAT:
 * GET /api/get-job-status?jobId=uuid
 * 
 * RESPONSE FORMATS:
 * 
 * PENDING:
 * { success: true, status: "pending", jobId: "uuid", message: "Job is waiting in queue" }
 * 
 * PROCESSING:
 * { success: true, status: "processing", jobId: "uuid", message: "Job is being processed", startedAt: "ISO date" }
 * 
 * COMPLETED:
 * { success: true, status: "completed", jobId: "uuid", programUrl: "https://...", manifest: {...}, completedAt: "ISO date" }
 * 
 * FAILED:
 * { success: false, status: "failed", jobId: "uuid", error: "Error message", completedAt: "ISO date" }
 */

export default async function handler(req, res) {
    // Secure CORS headers
    const { setCorsHeaders } = await import('../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['GET', 'OPTIONS']);
    corsHandler(req);

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { jobId } = req.query;

        // Validation
        if (!jobId) {
            return res.status(400).json({ 
                error: 'Missing required parameter: jobId' 
            });
        }

        console.log(`🔍 Checking job status: ${jobId}`);

        // Import Supabase client
        const { getSupabaseClient } = await import('../utils/database-utils.js');
        const supabase = getSupabaseClient();

        // Get job from Supabase
        const { data: job, error } = await supabase
            .from('audio_generation_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (error) {
            console.error('❌ Failed to fetch job:', error);
            return res.status(404).json({ 
                error: 'Job not found',
                details: error.message
            });
        }

        if (!job) {
            return res.status(404).json({ 
                error: 'Job not found' 
            });
        }

        console.log(`📋 Job ${jobId}: ${job.status} | Created: ${job.created_at}`);

        // Return status based on job state
        switch (job.status) {
            case 'pending':
                return res.status(200).json({
                    success: true,
                    status: 'pending',
                    jobId: job.id,
                    message: 'Job is waiting in queue',
                    createdAt: job.created_at,
                    fileCount: job.file_count
                });

            case 'processing':
                return res.status(200).json({
                    success: true,
                    status: 'processing',
                    jobId: job.id,
                    message: 'Job is being processed',
                    createdAt: job.created_at,
                    startedAt: job.started_at,
                    fileCount: job.file_count
                });

            case 'completed':
                return res.status(200).json({
                    success: true,
                    status: 'completed',
                    jobId: job.id,
                    programUrl: job.program_url,
                    manifest: job.manifest_data,
                    message: 'Job completed successfully',
                    createdAt: job.created_at,
                    startedAt: job.started_at,
                    completedAt: job.completed_at,
                    processingDuration: job.processing_duration_ms,
                    fileCount: job.file_count
                });

            case 'failed':
                return res.status(200).json({
                    success: false,
                    status: 'failed',
                    jobId: job.id,
                    error: job.error_message || 'Job processing failed',
                    message: 'Job failed to process',
                    createdAt: job.created_at,
                    startedAt: job.started_at,
                    completedAt: job.completed_at,
                    fileCount: job.file_count
                });

            default:
                return res.status(500).json({
                    error: 'Unknown job status',
                    status: job.status
                });
        }

    } catch (error) {
        console.error('❌ Error checking job status:', error);
        
        return res.status(500).json({ 
            error: 'Failed to check job status',
            details: error.message 
        });
    }
}
