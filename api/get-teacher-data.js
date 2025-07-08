/**
 * api/get-teacher-data.js - Teacher Data Retrieval Service
 * 
 * PURPOSE: Fetches teacher data for a given LMID from Supabase database
 * DEPENDENCIES: Supabase client, API utilities
 * 
 * REQUEST FORMAT:
 * GET /api/get-teacher-data?lmid=123
 * 
 * RESPONSE FORMAT:
 * {
 *   success: true,
 *   teacherName: "John Smith & The Kids",
 *   schoolName: "from Elementary School X",
 *   teacherEmail: "teacher@school.com"
 * }
 * 
 * DATA SOURCE: Supabase lmids table columns:
 * - teacher_first_name
 * - teacher_last_name  
 * - teacher_school_name
 * - assigned_to_member_email
 * 
 * LOGIC:
 * 1. Validate LMID parameter
 * 2. Query Supabase for teacher data stored during LMID assignment
 * 3. Format teacher name and school name for display
 * 4. Return formatted data or fallback values
 */

import { handleApiRequest } from '../utils/api-utils.js';
import { getSupabaseClient } from '../utils/lmid-utils.js';

/**
 * Get teacher data for LMID from Supabase database
 * @param {Object} req - Request object
 * @param {Object} res - Response object  
 * @param {Object} params - Validated parameters
 * @returns {Promise<Object>} Teacher data response
 */
async function getTeacherDataHandler(req, res, params) {
    const { lmid } = params;
    
    // Validate LMID is a positive integer
    const lmidNum = parseInt(lmid, 10);
    if (isNaN(lmidNum) || lmidNum <= 0) {
        const error = new Error('LMID must be a positive integer');
        error.status = 400;
        error.code = 'INVALID_LMID';
        throw error;
    }

    console.log(`👨‍🏫 Fetching teacher data for LMID: ${lmidNum}`);

    const supabase = getSupabaseClient();
    
    // Get teacher data from Supabase lmids table
    const { data: lmidRecord, error } = await supabase
        .from('lmids')
        .select('assigned_to_member_email, teacher_first_name, teacher_last_name, teacher_school_name')
        .eq('lmid', lmidNum)
        .eq('status', 'used')
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No data found
            const notFoundError = new Error(`LMID ${lmidNum} not found or not assigned`);
            notFoundError.status = 404;
            notFoundError.code = 'LMID_NOT_FOUND';
            throw notFoundError;
        }
        
        console.error('Supabase error fetching LMID record:', error);
        const dbError = new Error('Database error retrieving LMID data');
        dbError.status = 500;
        dbError.code = 'DATABASE_ERROR';
        throw dbError;
    }

    console.log('👨‍🏫 Raw teacher data from Supabase:', lmidRecord);

    // Format teacher data with fallbacks
    let teacherName = 'Teacher';
    let schoolName = 'School';

    if (lmidRecord.teacher_first_name || lmidRecord.teacher_last_name) {
        const firstName = lmidRecord.teacher_first_name || '';
        const lastName = lmidRecord.teacher_last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        if (fullName) {
            teacherName = fullName;
        }
    }

    if (lmidRecord.teacher_school_name) {
        schoolName = lmidRecord.teacher_school_name;
    }

    console.log(`👨‍🏫 Formatted teacher data: "${teacherName}" "${schoolName}"`);

    return {
        teacherName: teacherName,
        schoolName: schoolName,
        teacherEmail: lmidRecord.assigned_to_member_email
    };
}

/**
 * Main handler with validation and error handling
 */
export default async function handler(req, res) {
    return handleApiRequest(req, res, {
        allowedMethods: ['GET'],
        requiredParams: ['lmid'],
        endpoint: 'get-teacher-data'
    }, getTeacherDataHandler);
} 