/**
 * api/get-teacher-data.js - Get Teacher Data from LMID
 * 
 * PURPOSE: Retrieve teacher and school information from LMID for radio page display
 * DEPENDENCIES: Supabase client, Memberstack API
 * 
 * REQUEST FORMAT:
 * GET /api/get-teacher-data?lmid=123
 * 
 * RESPONSE FORMAT:
 * {
 *   success: true,
 *   teacherName: "John Smith & The Kids",
 *   schoolName: "from Elementary School",
 *   teacherEmail: "john.smith@school.com"
 * }
 * 
 * LOGIC:
 * 1. Get LMID record from Supabase
 * 2. Get member data from Memberstack using assigned_to_member_id
 * 3. Extract teacher name and school from member metadata
 * 4. Return formatted teacher and school names
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Production Ready ✅
 */

import { handleApiRequest } from '../utils/api-utils.js';
import { getSupabaseClient } from '../utils/lmid-utils.js';
import { getMemberDetails } from '../utils/memberstack-utils.js';

/**
 * Handler function for teacher data retrieval
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} params - Validated parameters
 * @returns {Promise<Object>} Response data
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
    
    // Get LMID record from Supabase
    const supabase = getSupabaseClient();
    const { data: lmidRecord, error } = await supabase
        .from('lmids')
        .select('assigned_to_member_id, assigned_to_member_email')
        .eq('lmid', lmidNum)
        .eq('status', 'used')
        .single();

    if (error || !lmidRecord) {
        const notFoundError = new Error('LMID not found or not assigned');
        notFoundError.status = 404;
        notFoundError.code = 'LMID_NOT_FOUND';
        throw notFoundError;
    }

    const memberId = lmidRecord.assigned_to_member_id;
    const memberEmail = lmidRecord.assigned_to_member_email;

    if (!memberId) {
        const unassignedError = new Error('LMID not assigned to any member');
        unassignedError.status = 404;
        unassignedError.code = 'LMID_UNASSIGNED';
        throw unassignedError;
    }

    // Get member details from Memberstack
    const memberData = await getMemberDetails(memberId);
    
    let teacherName = 'Teacher & The Kids';
    let schoolName = 'from School';

    if (memberData) {
        // Extract teacher name from member data
        const firstName = memberData.metaData?.firstName || memberData.metaData?.first_name || '';
        const lastName = memberData.metaData?.lastName || memberData.metaData?.last_name || '';
        const schoolFromMeta = memberData.metaData?.school || memberData.metaData?.schoolName || '';

        // Format teacher name
        if (firstName || lastName) {
            const fullName = `${firstName} ${lastName}`.trim();
            teacherName = fullName ? `${fullName} & The Kids` : 'Teacher & The Kids';
        }

        // Format school name
        if (schoolFromMeta) {
            schoolName = schoolFromMeta.startsWith('from ') ? schoolFromMeta : `from ${schoolFromMeta}`;
        }
    }

    return {
        teacherName,
        schoolName,
        teacherEmail: memberEmail
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