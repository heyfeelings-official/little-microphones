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

        // Create job in Supabase
        const { data: job, error } = await supabase
            .from('audio_generation_jobs')
            .insert({
                lmid: lmid.toString(),
                world,
                lang,
                type,
                audio_segments: audioSegments,
                file_count: fileCount
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

        // Return job ID immediately (no processing)
        return res.status(200).json({
            success: true,
            jobId: job.id,
            status: job.status,
            message: 'Generation job created successfully. Use get-job-status API to check progress.'
        });

    } catch (error) {
        console.error('❌ Error creating audio generation job:', error);
        
        return res.status(500).json({ 
            error: 'Failed to create generation job',
            details: error.message 
        });
    }
}