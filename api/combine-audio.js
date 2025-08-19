/**
 * api/combine-audio.js - Audio Generation Job Creator (Queue System)
 * 
 * PURPOSE: Creates jobs for radio program generation in Supabase queue system
 * PROCESSING: Actual audio processing moved to process-queue.js for memory optimization
 * DATABASE: Uses Supabase audio_generation_jobs table for queue management
 * DOCUMENTATION: See /documentation/api-documentation.md for complete API overview
 * 
 * REQUEST FORMAT:
 * POST /api/combine-audio
 * Body: { world: "spookyland", lmid: "32", audioSegments: [segments...] }
 * 
 * RESPONSE FORMAT:
 * { success: true, jobId: "uuid", status: "pending" }
 * 
 * QUEUE WORKFLOW:
 * 1. Validate input parameters
 * 2. Create job record in Supabase (status: pending)
 * 3. Return job ID immediately (no processing)
 * 4. Frontend polls get-job-status.js for completion
 * 5. process-queue.js handles actual FFmpeg processing
 * 
 * MEMORY BENEFITS:
 * - No FFmpeg processing in this function (fast response)
 * - Queue system prevents memory overload
 * - Scalable: 1 job at a time vs 100 concurrent jobs
 * - Better error handling and retry capabilities
 */

/**
 * Fallback: Direct processing call when webhook fails
 */
async function tryDirectProcessing(jobId) {
    try {
        console.log(`🔧 Attempting direct processing for job: ${jobId}`);
        
        // Import and call process-queue directly
        const processQueueHandler = await import('./process-queue.js');
        
        // Create mock request/response for direct call
        const mockReq = {
            method: 'POST',
                                body: { specificJobId: jobId, triggeredBy: 'direct-fallback' },
            headers: {}
        };
        
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    console.log(`📊 Direct processing response: ${code}`, data);
                    return data;
                },
                end: () => console.log(`📊 Direct processing ended with status: ${code}`)
            }),
            setHeader: () => {},
            writeHead: () => {},
            write: () => {},
            end: () => {}
        };
        
        await processQueueHandler.default(mockReq, mockRes);
        console.log(`✅ Direct processing initiated for job: ${jobId}`);
        
    } catch (directError) {
        console.error(`❌ Direct processing failed for job ${jobId}:`, directError.message);
        console.log(`💡 Job will remain in queue for manual processing`);
    }
}

export default async function handler(req, res) {
    // Secure CORS headers
    const { setCorsHeaders } = await import('../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['GET', 'POST', 'OPTIONS']);
    corsHandler(req);

    // Rate limiting - 10 job creation per minute (increased for queue system)
    const { checkRateLimit } = await import('../utils/simple-rate-limiter.js');
    if (!checkRateLimit(req, res, 'combine-audio', 10)) {
        return; // Rate limit exceeded
    }

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { world, lmid, audioSegments, programType, lang } = req.body;

        // Validation
        if (!world || !lmid || !audioSegments || !lang) {
            return res.status(400).json({ 
                error: 'Missing required parameters: world, lmid, audioSegments, and lang' 
            });
        }
        
        // Validate programType if provided
        const validProgramTypes = ['kids', 'parent'];
        const type = programType || 'kids'; // Default to kids for backward compatibility
        if (!validProgramTypes.includes(type)) {
            return res.status(400).json({ 
                error: 'Invalid programType. Must be "kids" or "parent"' 
            });
        }

        // Validate audioSegments structure
        if (!Array.isArray(audioSegments) || audioSegments.length === 0) {
            return res.status(400).json({ 
                error: 'Invalid audioSegments format. Expected array of segments.' 
            });
        }

        console.log(`🎵 Creating job for radio program generation: ${lang}/${world}/${lmid} (${type} program)`);
        console.log(`📊 Job will process ${audioSegments.length} audio segments`);

        // Import Supabase client
        const { getSupabaseClient } = await import('../utils/database-utils.js');
        const supabase = getSupabaseClient();

        // Count files for job metadata
        let fileCount = 0;
        audioSegments.forEach(segment => {
            if (segment.answerUrls && Array.isArray(segment.answerUrls)) {
                fileCount += segment.answerUrls.length;
            }
        });

        // ANTI-DUPLICATE: Check if identical job already exists or is processing
        const { data: existingJobs } = await supabase
            .from('audio_generation_jobs')
            .select('id, status, file_count, created_at')
            .eq('lmid', lmid.toString())
            .eq('world', world)
            .eq('lang', lang)
            .eq('type', type)
            .eq('file_count', fileCount)
            .in('status', ['pending', 'processing'])
            .order('created_at', { ascending: false })
            .limit(1);

        if (existingJobs && existingJobs.length > 0) {
            const existingJob = existingJobs[0];
            console.log(`🔄 Found identical job already ${existingJob.status}: ${existingJob.id} (same file_count: ${fileCount})`);
            console.log(`⏳ Returning existing job ID instead of creating duplicate`);
            
            return res.status(200).json({
                success: true,
                jobId: existingJob.id,
                status: existingJob.status,
                message: `Identical job already ${existingJob.status}. Use SSE job-stream API for real-time updates.`,
                isDuplicate: true
            });
        }

        // Create job in Supabase with audio_segments for reliable processing
        const { data: job, error } = await supabase
            .from('audio_generation_jobs')
            .insert({
                lmid: lmid.toString(),
                world,
                lang,
                type,
                file_count: fileCount,
                audio_segments: audioSegments
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Failed to create job:', error);
            return res.status(500).json({ 
                error: 'Failed to create generation job',
                details: error.message
            });
        }

        console.log(`✅ Job created successfully: ${job.id}`);
        console.log(`📋 Job status: ${job.status} | Files: ${fileCount} | Created: ${job.created_at}`);

        // 🚀 IMMEDIATE TRIGGER: Start processing right away (no cron waiting!)
        console.log(`⚡ Triggering immediate processing for job ${job.id}`);
        
        try {
            // Get the current domain for the webhook call
            const protocol = req.headers['x-forwarded-proto'] || 'https';
            const host = req.headers['host'];
            const baseUrl = `${protocol}://${host}`;
            
            console.log(`🌐 Webhook URL: ${baseUrl}/api/process-queue`);
            console.log(`📤 Payload: ${JSON.stringify({ specificJobId: job.id, triggeredBy: 'immediate' })}`);
            
            // Trigger processing immediately with detailed logging
            await fetch(`${baseUrl}/api/process-queue`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'Little-Microphones-Internal'
                },
                body: JSON.stringify({ 
                    specificJobId: job.id,
                    triggeredBy: 'immediate'
                })
            })
            .then(response => {
                console.log(`📊 Webhook response status: ${response.status} ${response.statusText}`);
                if (response.status === 429) {
                    // Queue processor is busy - this is normal, job will be processed later
                    console.log(`⏳ Queue processor busy - job ${job.id} will be processed when available`);
                    return; // Don't treat as error - SSE will handle status updates
                } else if (!response.ok) {
                    return response.text().then(text => {
                        console.error(`❌ Webhook failed: ${response.status} - ${text}`);
                        console.log(`🔄 Trying direct function call fallback...`);
                        return tryDirectProcessing(job.id);
                    });
                } else {
                    console.log(`✅ Webhook sent successfully for job ${job.id}`);
                }
            })
            .catch(err => {
                console.error(`❌ Immediate trigger failed for job ${job.id}:`, err.message);
                console.error(`❌ Error details:`, err);
                console.log(`🔄 Trying direct function call fallback...`);
                return tryDirectProcessing(job.id);
            });
            
        } catch (triggerError) {
            console.error(`❌ Could not trigger immediate processing:`, triggerError.message);
            console.error(`❌ Trigger error details:`, triggerError);
            console.log(`💡 Job ${job.id} will remain in queue for manual processing`);
        }

        // Return job ID immediately
        return res.status(200).json({
            success: true,
            jobId: job.id,
            status: job.status,
            message: 'Job created and processing triggered. Use SSE job-stream API for real-time updates.'
        });

    } catch (error) {
        console.error('❌ Error creating audio generation job:', error);
        
        return res.status(500).json({ 
            error: 'Failed to create generation job',
            details: error.message 
        });
    }
} 