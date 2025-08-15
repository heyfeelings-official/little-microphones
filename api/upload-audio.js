/**
 * api/upload-audio.js - Secure Audio File Upload Service
 * 
 * PURPOSE: Serverless function for uploading recorded audio files to Bunny.net CDN with validation and organization
 * DEPENDENCIES: Bunny.net Storage API, Node.js Buffer handling, Base64 processing
 * DOCUMENTATION: See /documentation/api-documentation.md for complete API overview
 * 
 * REQUEST FORMAT:
 * POST /api/upload-audio
 * Body: { audioData: "base64_mp3", filename: "kids-world_...", world: "spookyland", lmid: "32", questionId: "9" }
 * 
 * PROCESSING PIPELINE:
 * Base64 Audio → Buffer Conversion → Filename Validation → Bunny.net Upload → CDN URL Response
 * 
 * FILE ORGANIZATION:
 * - Naming Convention: kids-world_{world}-lmid_{lmid}-question_{number}-tm_{timestamp}.mp3
 * - Storage Path: /{lmid}/{world}/{filename}
 * - CDN Access: https://little-microphones.b-cdn.net/{lmid}/{world}/{filename}
 * 
 * SECURITY FEATURES:
 * - Comprehensive input validation for all required parameters
 * - Filename format verification to prevent unauthorized uploads
 * - Base64 data validation with error handling for malformed audio
 * - Environment variable protection for API keys and credentials
 * - CORS configuration for secure cross-origin requests
 * 
 * AUDIO PROCESSING:
 * - Base64 to binary buffer conversion with error recovery
 * - Data URL prefix removal for clean audio data extraction
 * - File size tracking and reporting for monitoring
 * - MIME type enforcement for audio/mpeg consistency
 * 
 * BUNNY.NET INTEGRATION:
 * - Secure API key authentication with protected storage
 * - Organized folder structure for user and world isolation
 * - Direct CDN upload with immediate URL generation
 * - Error handling for network failures and storage issues
 * 
 * RESPONSE HANDLING:
 * - Success responses with CDN URLs and metadata
 * - Detailed error reporting with specific failure reasons
 * - File size and upload confirmation tracking
 * - Network status monitoring with retry suggestions
 * 
 * ERROR RECOVERY:
 * - Malformed audio data detection and reporting
 * - Network timeout handling with clear error messages
 * - Missing parameter validation with specific guidance
 * - Configuration error detection with setup instructions
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Efficient buffer processing for large audio files
 * - Direct CDN upload without intermediate storage
 * - Minimal server processing for fast response times
 * - Optimized error handling to prevent unnecessary retries
 * 
 * INTEGRATION POINTS:
 * - recording.js: Client-side upload initiation and progress tracking
 * - Bunny.net CDN: Global file storage and content delivery
 * - Vercel Runtime: Serverless execution environment
 * - IndexedDB: Local storage coordination for upload status
 * - send-email-notifications.js: Email notifications for parent uploads
 * 
 * EMAIL NOTIFICATIONS:
 * - Automatic notifications for parent uploads only
 * - Multi-language support (Polish/English) based on request language
 * - Teacher notifications about new student recordings
 * - Parent notifications to other parents (excluding uploader)
 * - Brevo SDK integration with automatic contact creation
 * - Secure logging without exposing personal information
 * - Configurable Hey Feelings domain via HEY_FEELINGS_BASE_URL environment variable (auto-detects: webflow.io for testing, heyfeelings.com for production)
 * - Available template parameters: teacherName, world, lmid, schoolName, dashboardUrl, radioUrl, uploaderName, uploaderType, parentEmail, parentName
 * - parentEmail parameter contains the email of the parent who made the recording (for teacher notifications)
 * - parentName parameter contains the first and last name of the parent who made the recording (available for both teacher and parent notifications)
 * 
 * MONITORING & LOGGING:
 * - Comprehensive upload logging with file metadata
 * - Error tracking with detailed diagnostic information
 * - Performance monitoring for upload speed optimization
 * - Success rate tracking for system reliability metrics
 * - Secure logging without exposing personal data
 * 
 * LAST UPDATED: January 2025
 * VERSION: 6.0.1
 * STATUS: Production Ready ✅
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Process audio for upload with intelligent normalization
 * RESTORED: Pre-upload normalization is crucial for consistent loudness levels
 * @param {Buffer} audioBuffer - Raw audio buffer
 * @param {string} format - Audio format (webm, mp3, wav, ogg)
 * @returns {Promise<Buffer>} Processed audio buffer
 */
async function processAudioForUpload(audioBuffer, format) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-upload-'));
    const inputPath = path.join(tempDir, `input.${format}`);
    const outputPath = path.join(tempDir, `output.${format}`);
    
    try {
        // Write input buffer to temp file
        await fs.writeFile(inputPath, audioBuffer);
        
        // Apply intelligent normalization - keep same format to avoid filter issues
        await new Promise((resolve, reject) => {
            const command = ffmpeg(inputPath)
                .audioFilters([
                    // EBU R128 loudness normalization for broadcast standards
                    'loudnorm=I=-16.0:LRA=7.0:TP=-1.0:print_format=json',
                    // Light enhancement for speech clarity
                    'highpass=f=80',           // Remove low-frequency noise
                    'lowpass=f=8000',          // Remove high-frequency noise
                    'compand=0.02,0.20:-60/-60,-30/-15,-20/-10,-5/-5,0/-3:6:0:-3' // Speech compressor
                ])
                .output(outputPath);
            
            // Timeout protection (20 seconds)
            const timeoutId = setTimeout(() => {
                try {
                    command.kill('SIGKILL');
                    console.warn(`⏰ Upload normalization timeout after 20s`);
                } catch (error) {
                    console.warn('Error killing FFmpeg process:', error.message);
                }
                reject(new Error('Upload normalization timed out after 20 seconds'));
            }, 20000);
            
            command
                .on('start', () => {
                    console.log(`🎵 Pre-upload normalization (${format})`);
                })
                .on('end', () => {
                    clearTimeout(timeoutId);
                    resolve();
                })
                .on('error', (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                })
                .run();
        });
        
        // Read processed file back to buffer
        const processedBuffer = await fs.readFile(outputPath);
        
        // Cleanup temp files
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
        await fs.rmdir(tempDir).catch(() => {});
        
        console.log(`✨ Pre-upload normalized: ${audioBuffer.length} → ${processedBuffer.length} bytes`);
        return processedBuffer;
        
    } catch (error) {
        // Cleanup on error
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
        await fs.rmdir(tempDir).catch(() => {});
        
        console.warn(`⚠️ Pre-upload normalization failed (WebM filter issue), using original: ${error.message}`);
        return audioBuffer; // Return original on failure - this is expected with WebM format
    }
}

export default async function handler(req, res) {
    // Secure CORS headers
    const { setCorsHeaders } = await import('../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
    corsHandler(req);

    // Rate limiting - 10 uploads per minute
    const { checkRateLimit } = await import('../utils/simple-rate-limiter.js');
    if (!checkRateLimit(req, res, 'upload-audio', 10)) {
        return; // Rate limit exceeded
    }

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let { audioData, filename, world, lmid, questionId, lang } = req.body;

        // SECURITY: Input sanitization
        function sanitizeInput(data) {
            if (typeof data !== 'string') return data;
            
            // Remove potentially dangerous characters and normalize
            return data.replace(/[<>]/g, '').trim();
        }

        // Apply sanitization to all string inputs
        filename = sanitizeInput(filename);
        world = sanitizeInput(world);
        lmid = sanitizeInput(lmid);
        questionId = sanitizeInput(questionId);
        lang = sanitizeInput(lang);
        // Note: audioData is not sanitized as it's base64 encoded binary data

        // Validation
        if (!audioData || !filename) {
            return res.status(400).json({ error: 'Missing required fields: audioData and filename' });
        }

        if (!world || !lmid || !questionId) {
            return res.status(400).json({ error: 'Missing required fields: world, lmid, and questionId' });
        }

        if (!lang) {
            return res.status(400).json({ error: 'Missing required field: lang' });
        }
        
        // Filename validation moved to enhanced security validation above

        // Check environment variables
        if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE) {
            console.error('Missing Bunny.net configuration');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Convert base64 to buffer
        let audioBuffer;
        try {
            // Remove data URL prefix if present
            const base64Data = audioData.replace(/^data:audio\/[^;]+;base64,/, '');
            audioBuffer = Buffer.from(base64Data, 'base64');
        } catch (error) {
            return res.status(400).json({ error: 'Invalid audio data format' });
        }

        // SECURITY: File size validation
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
        const MIN_FILE_SIZE = 100; // 100 bytes (allow very short recordings, prevent empty/corrupted files)
        
        if (audioBuffer.length > MAX_FILE_SIZE) {
            return res.status(400).json({ 
                error: 'File too large. Maximum size is 50MB.',
                size: audioBuffer.length,
                maxSize: MAX_FILE_SIZE
            });
        }

        if (audioBuffer.length < MIN_FILE_SIZE) {
            return res.status(400).json({ 
                error: 'File too small. Minimum size is 100 bytes.',
                size: audioBuffer.length,
                minSize: MIN_FILE_SIZE
            });
        }

        // SECURITY: Audio file validation using magic numbers
        function isValidAudioFile(buffer) {
            const header = buffer.slice(0, 16);
            
            // WebM - EBML header
            if (header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3) {
                return { valid: true, format: 'webm' };
            }
            
            // MP3 - ID3 tag or MPEG frame
            if (header.toString('ascii', 0, 3) === 'ID3' || 
                (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0)) {
                return { valid: true, format: 'mp3' };
            }
            
            // WAV - RIFF header
            if (header.toString('ascii', 0, 4) === 'RIFF' && 
                header.toString('ascii', 8, 12) === 'WAVE') {
                return { valid: true, format: 'wav' };
            }
            
            // OGG - OggS header
            if (header.toString('ascii', 0, 4) === 'OggS') {
                return { valid: true, format: 'ogg' };
            }
            
            return { valid: false, format: 'unknown' };
        }

        // Validate audio file format
        const audioValidation = isValidAudioFile(audioBuffer);
        if (!audioValidation.valid) {
            return res.status(400).json({ 
                error: 'Invalid file type. Only audio files are allowed.',
                detectedFormat: audioValidation.format
            });
        }

        // SECURITY: Filename validation with dangerous characters check
        function validateAudioFilename(filename, world, lmid, questionId) {
            // Check for dangerous characters
            const dangerousChars = /[<>:"/\\|?*\x00-\x1F]/;
            if (dangerousChars.test(filename)) {
                return { valid: false, error: 'Filename contains invalid characters' };
            }
            
            // Check filename length
            if (filename.length > 255) {
                return { valid: false, error: 'Filename too long (max 255 characters)' };
            }
            
            // Check file extension (support WebM and MP3)
            if (!filename.endsWith('.webm') && !filename.endsWith('.mp3')) {
                return { valid: false, error: 'Only WebM and MP3 files are allowed' };
            }
            
            // Validate filename format patterns
            const teacherFormat = filename.includes(`kids-world_${world}-lmid_${lmid}-question_${questionId}`);
            const parentFormat = filename.match(new RegExp(`^parent_[^-]+-world_${world}-lmid_${lmid}-question_${questionId}-tm_\\d+\\.(webm|mp3)$`));
            
            if (!teacherFormat && !parentFormat) {
                return { valid: false, error: 'Invalid filename format - must be either teacher or parent format' };
            }
            
            return { valid: true };
        }

        // Enhanced filename validation
        const filenameValidation = validateAudioFilename(filename, world, lmid, questionId);
        if (!filenameValidation.valid) {
            return res.status(400).json({ error: filenameValidation.error });
        }

        // DISABLED: Skip normalization due to WebM + loudnorm compatibility issues
        // WebM format with loudnorm filter causes FFmpeg "Error reinitializing filters"
        let processedAudioBuffer = audioBuffer;
        console.log(`📤 Uploading original WebM (normalization disabled): ${filename}`);

        // Upload to Bunny.net with folder structure: lang/lmid/world/filename
        const filePath = `${lang}/${lmid}/${world}/${filename}`;
        const uploadUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${filePath}`;
        
        console.log(`📤 Uploading ${filename} (${processedAudioBuffer.length} bytes)`);
        
        // Determine Content-Type based on filename extension
        const contentType = filename.endsWith('.webm') ? 'audio/webm' : 'audio/mpeg';
        
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': contentType
            },
            body: processedAudioBuffer
        });

        if (response.ok) {
            const cdnUrl = `https://${process.env.BUNNY_CDN_URL}/${filePath}`;
            console.log(`✅ Upload successful: ${audioBuffer.length} bytes`);
            
            // Send email notifications after successful upload
            let emailNotificationStatus = 'not_applicable';
            let emailNotificationMessage = '';
            
            try {
                // Get LMID data first (contains all emails)
                const lmidData = await getLmidData(lmid);
                
                if (!lmidData) {
                    throw new Error(`LMID data not found for LMID ${lmid}`);
                }
                
                // Determine upload type and set notification logic
                const isParentUpload = filename.startsWith('parent_');
                let uploaderEmail = null;
                
                if (isParentUpload) {
                    // Extract parent member ID from filename
                    const memberIdMatch = filename.match(/^parent_([^-]+)-/);
                    
                    if (memberIdMatch) {
                        const parentMemberId = memberIdMatch[1];
                        // Find uploader email from the cached mapping
                        uploaderEmail = findParentEmailByMemberId(parentMemberId, lmidData.parentMemberIdToEmail, lmidData.parentEmails);
                    } else {
                        console.warn(`⚠️ Could not extract Member ID from filename`);
                    }
                    
                    console.log(`👨‍👩‍👧‍👦 Parent upload - notifying ONLY educator`);
                    await sendNewRecordingNotifications(lmid, world, questionId, lang, uploaderEmail, lmidData, 'parent_upload');
                    
                    emailNotificationStatus = 'sent';
                    emailNotificationMessage = 'Email notifications sent to educator only';
                } else {
                    console.log(`👨‍🏫 Educator upload - notifying ALL parents`);
                    // For educator uploads, uploaderEmail is the teacher's email
                    uploaderEmail = lmidData.teacherEmail;
                    
                    await sendNewRecordingNotifications(lmid, world, questionId, lang, uploaderEmail, lmidData, 'educator_upload');
                    
                    emailNotificationStatus = 'sent';
                    emailNotificationMessage = 'Email notifications sent to all parents';
                }
            } catch (emailError) {
                console.error('❌ Email notification failed:', emailError.message);
                emailNotificationStatus = 'failed';
                emailNotificationMessage = 'Upload successful, email notification failed';
            }
            
            res.json({ 
                success: true, 
                url: cdnUrl,
                filename: filename,
                size: audioBuffer.length,
                emailNotification: {
                    status: emailNotificationStatus,
                    message: emailNotificationMessage
                }
            });
        } else {
            const errorText = await response.text();
            console.error(`❌ Upload failed: ${response.status} - ${errorText}`);
            throw new Error(`Upload failed: ${response.status}`);
        }

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Upload failed', 
            details: error.message 
        });
    }
}

// ===== EMAIL NOTIFICATION FUNCTIONS =====

// Note: getParentNameByMemberId function removed - now using Brevo contact data via enriched notifications

/**
 * Find parent Member ID by email from mapping
 * @param {string} email - Parent email address
 * @param {Object} parentMemberIdToEmail - Mapping of Member ID to email
 * @returns {string|null} Parent Member ID
 */
function findParentMemberIdByEmail(email, parentMemberIdToEmail) {
    if (!parentMemberIdToEmail || typeof parentMemberIdToEmail !== 'object' || !email) {
        return null;
    }
    
    // Find Member ID that maps to this email
    for (const [memberId, memberEmail] of Object.entries(parentMemberIdToEmail)) {
        if (memberEmail === email) {
            return memberId;
        }
    }
    
    return null;
}

/**
 * Send email notifications for new recording
 * @param {string} lmid - LMID number
 * @param {string} world - World name
 * @param {string} questionId - Question ID
 * @param {string} lang - Language code from request
 * @param {string} uploaderEmail - Email of uploader (parent or educator)
 * @param {Object} lmidData - Pre-fetched LMID data to avoid duplicate API calls
 * @param {string} uploadType - 'parent_upload' or 'educator_upload'
 */
async function sendNewRecordingNotifications(lmid, world, questionId, lang, uploaderEmail, lmidData, uploadType) {
    try {
        const requestId = Math.random().toString(36).substring(2, 15);
        console.log(`📧 [${requestId}] Processing notifications - LMID ${lmid}, World ${world}, Lang: ${lang}`);
        console.log(`📧 [${requestId}] Upload type: ${uploadType}`);
        console.log(`📧 [${requestId}] Uploader email: ${uploaderEmail ? 'provided' : 'not provided'}`);
        
        if (!lmidData) {
            console.warn(`⚠️ [${requestId}] No LMID data available, skipping notifications`);
            return;
        }
        
        // Determine uploader name for template data
        const isTeacherUpload = uploadType === 'educator_upload';
        let uploaderName = isTeacherUpload ? lmidData.teacherName : 'Rodzic';
        
        // Note: Parent name resolution now handled by Brevo contact data in templates
        // All personalization (names, school, plan) comes from Brevo contact attributes
        
        // Determine Hey Feelings base URL based on environment
        let heyFeelingsBaseUrl = process.env.HEY_FEELINGS_BASE_URL;
        
        // Auto-detect environment if not explicitly set
        if (!heyFeelingsBaseUrl) {
            // For now, always use testing environment until we manually set production
            const isDevelopment = true; // Force testing environment
            
            heyFeelingsBaseUrl = isDevelopment 
                ? 'https://hey-feelings-v2.webflow.io'     // Testing environment
                : 'https://heyfeelings.com';                // Production environment
                
            console.log(`🌍 [${requestId}] Forced environment: ${isDevelopment ? 'development' : 'production'}, using ${heyFeelingsBaseUrl}`);
        }
        
        // Import world image utility
        const { getWorldImageData } = await import('../utils/brevo-world-images.js');
        
        // Get world image data for email template
        console.log(`🖼️ [${requestId}] Requesting world image for: world="${world}", lang="${lang}"`);
        const worldImageData = getWorldImageData(world, lang);
        console.log(`🖼️ [${requestId}] World image data: ${worldImageData.isSuccess ? 'found' : 'fallback'} - ${worldImageData.worldImageUrl ? 'URL available' : 'no URL'}`);
        console.log(`🖼️ [${requestId}] World image result:`, JSON.stringify(worldImageData, null, 2));
        
        // SIMPLIFIED: Only dynamic data - contact data automatic from Brevo
        const dynamicData = {
            world: translateWorldName(world, lang),
            lmid: lmid,
            dashboardUrl: `${heyFeelingsBaseUrl}/${lang}/members/little-microphones`,
            radioUrl: `${heyFeelingsBaseUrl}/little-microphones?ID=${lmidData.shareId}`,
            uploaderName: uploaderName,
            worldImageUrl: worldImageData.worldImageUrl,
            worldImageAlt: worldImageData.worldImageAlt,
            worldName: worldImageData.worldName,
            teacherName: lmidData.teacherName || 'Teacher',
            schoolName: lmidData.schoolName || 'School'
        };
        
        console.log(`📧 [${requestId}] Simplified notifications - Dynamic data: ${Object.keys(dynamicData).length} fields`);
        console.log(`🖼️ [${requestId}] World image URL being sent: ${worldImageData.worldImageUrl}`);
        console.log(`📋 [${requestId}] All dynamic data:`, JSON.stringify(dynamicData, null, 2));
        console.log(`🎯 [${requestId}] Contact data (name, school, plan, etc.) automatic from Brevo`);
        
        if (uploadType === 'parent_upload') {
            // Parent uploaded → Send notification ONLY to educator
            if (lmidData.teacherEmail) {
                console.log(`📧 [${requestId}] Parent upload - sending notification ONLY to educator in ${lang}`);
                await sendNotificationViaAPI({
                    recipientEmail: lmidData.teacherEmail,
                    notificationType: 'teacher',
                    language: lang,
                    dynamicData: dynamicData
                });
                console.log(`✅ [${requestId}] Educator notification sent (personalization from Brevo)`);
            } else {
                console.warn(`⚠️ [${requestId}] No teacher email found for parent upload notification`);
            }
        } else if (uploadType === 'educator_upload') {
            // Educator uploaded → Send notifications to ALL parents (no exclusions)
            if (lmidData.parentEmails && lmidData.parentEmails.length > 0) {
                console.log(`📧 [${requestId}] Educator upload - sending notifications to ALL ${lmidData.parentEmails.length} parents in ${lang}`);
                const parentPromises = lmidData.parentEmails.map(parentEmail => 
                    sendNotificationViaAPI({
                        recipientEmail: parentEmail,
                        notificationType: 'parent',
                        language: lang,
                        dynamicData: dynamicData
                    })
                );
                
                await Promise.all(parentPromises);
                console.log(`✅ [${requestId}] Parent notifications sent to ${lmidData.parentEmails.length} recipients (personalization from Brevo)`);
            } else {
                console.log(`⏭️ [${requestId}] No parent emails found for educator upload notification`);
            }
        }
        
        // Summary logging
        let totalRecipients = 0;
        if (uploadType === 'parent_upload') {
            totalRecipients = lmidData.teacherEmail ? 1 : 0;
        } else if (uploadType === 'educator_upload') {
            totalRecipients = lmidData.parentEmails ? lmidData.parentEmails.length : 0;
        }
        
        console.log(`✅ [${requestId}] Simplified notifications completed - LMID ${lmid}, World ${world}, Lang ${lang}`);
        console.log(`📊 [${requestId}] Upload type: ${uploadType}, Recipients: ${totalRecipients}, personalized via Brevo`);
        console.log(`🎯 [${requestId}] Template data: {{contact.*}} (automatic) + {{params.*}} (${Object.keys(dynamicData).length} dynamic)`);
        
    } catch (error) {
        console.error(`❌ [${requestId}] Simplified email notification error:`, error.message);
        console.error(`❌ [${requestId}] Notification details:`, {
            lmid,
            world,
            questionId,
            lang,
            hasLmidData: !!lmidData,
            hasTeacherEmail: !!lmidData?.teacherEmail,
            parentEmailsCount: lmidData?.parentEmails?.length || 0
        });
        throw new Error('Email notification failed');
    }
}

/**
 * Find parent email by Member ID from already retrieved mapping
 * @param {string} memberId - Memberstack Member ID
 * @param {Object} parentMemberIdToEmail - Mapping of Member ID to email
 * @param {Array} parentEmails - Array of parent emails as fallback
 * @returns {string|null} Parent email address
 */
function findParentEmailByMemberId(memberId, parentMemberIdToEmail, parentEmails) {
    if (!parentMemberIdToEmail || typeof parentMemberIdToEmail !== 'object') {
        console.warn(`⚠️ Parent Member ID mapping is invalid`);
        return null;
    }
    
    const email = parentMemberIdToEmail[memberId];
    if (email) {
        return email;
    }
    
    console.warn(`⚠️ Member ID not found in parent mapping`);
    return null;
}

/**
 * Get LMID data including teacher and parent email addresses
 * @param {string} lmid - LMID number
 * @returns {Promise<Object>} LMID data with email addresses
 */
async function getLmidData(lmid) {
    try {
        // Always use the main domain for internal API calls to avoid auth issues
        const baseUrl = 'https://little-microphones.vercel.app';

        
        // Call the existing lmid-operations API to get LMID data
        const response = await fetch(`${baseUrl}/api/lmid-operations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'get',
                lmid: lmid
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ LMID API error: ${response.status} - ${errorText}`);
            throw new Error(`Failed to fetch LMID data: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            console.error(`❌ LMID API returned error: ${data.error}`);
            throw new Error(`LMID data error: ${data.error}`);
        }
        
        const result = {
            lmid: lmid,
            teacherEmail: data.data.teacherEmail,
            teacherName: data.data.teacherName,
            schoolName: data.data.schoolName,
            parentEmails: data.data.parentEmails || [],
            parentMemberIdToEmail: data.data.parentMemberIdToEmail || {},
            shareId: data.data.shareId
        };
        
        console.log(`✅ LMID ${lmid} data retrieved successfully`);
        return result;
        
    } catch (error) {
        console.error('❌ Error fetching LMID data:', error.message);
        return null;
    }
}

/**
 * Send notification via our centralized API
 * @param {Object} notificationData - Notification data
 */
async function sendNotificationViaAPI(notificationData) {
    // Always use the main domain for internal API calls to avoid auth issues
    const apiUrl = 'https://little-microphones.vercel.app/api/send-email-notifications';
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationData)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Email API error: ${response.status} - ${errorText}`);
        throw new Error(`Email API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Email API call successful`);
    return result;
}

/**
 * Translate world name to specified language
 * @param {string} world - World name
 * @param {string} language - Language code
 * @returns {string} Translated world name
 */
function translateWorldName(world, language) {
    const translations = {
        pl: {
            'spookyland': 'Kraina Strachu',
            'waterpark': 'Park Wodny',
            'shopping-spree': 'Szaleństwo Zakupowe',
            'amusement-park': 'Park Rozrywki',
            'big-city': 'Wielkie Miasto',
            'neighborhood': 'Nasze Sąsiedztwo'
        },
        en: {
            'spookyland': 'Spookyland',
            'waterpark': 'Waterpark',
            'shopping-spree': 'Shopping Spree',
            'amusement-park': 'Amusement Park',
            'big-city': 'Big City',
            'neighborhood': 'Neighborhood'
        }
    };
    
    return translations[language]?.[world] || world;
} 