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
        .select('assigned_to_member_email, teacher_first_name, teacher_last_name, teacher_school_name, assigned_to_member_id')
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

    // Get teacher data directly from Memberstack (more reliable than database sync)
    let teacherName = 'Teacher';
    let schoolName = 'School';

    if (lmidRecord.assigned_to_member_id) {
        console.log(`👨‍🏫 Fetching teacher data from Memberstack for: ${lmidRecord.assigned_to_member_id}`);
        
        // Get both name and school from Memberstack in parallel
        const [memberName, memberSchool] = await Promise.all([
            getTeacherNameByMemberId(lmidRecord.assigned_to_member_id),
            getSchoolNameByMemberId(lmidRecord.assigned_to_member_id)
        ]);
        
        teacherName = memberName;
        schoolName = memberSchool;
    }

    console.log(`👨‍🏫 Formatted teacher data: "${teacherName}" "${schoolName}"`);

    return {
        teacherName: teacherName,
        schoolName: schoolName,
        teacherEmail: lmidRecord.assigned_to_member_email
    };
}

/**
 * Get teacher name from Memberstack API by Member ID
 * @param {string} memberId - Memberstack Member ID
 * @returns {Promise<string>} Teacher name or 'Teacher' if not found
 */
async function getTeacherNameByMemberId(memberId) {
    if (!memberId) {
        return 'Teacher';
    }
    
    try {
        const MEMBERSTACK_SECRET_KEY = process.env.MEMBERSTACK_SECRET_KEY;
        if (!MEMBERSTACK_SECRET_KEY) {
            console.warn(`⚠️ Memberstack secret key not configured`);
            return 'Teacher';
        }
        
        const response = await fetch(`https://admin.memberstack.com/members/${memberId}`, {
            method: 'GET',
            headers: {
                'x-api-key': MEMBERSTACK_SECRET_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const memberData = data.data || data;
            
            // Extract first name from various possible fields
            const firstName = 
                memberData.customFields?.['first-name'] || // Correct field name with hyphen
                memberData.customFields?.['First Name'] ||  // Alternative with space  
                memberData.customFields?.firstName ||
                memberData.customFields?.['first_name'] ||
                memberData.metaData?.firstName ||
                memberData.metaData?.['first-name'] ||
                '';
            
            const lastName = 
                memberData.customFields?.['last-name'] ||   // Correct field name with hyphen
                memberData.customFields?.['Last Name'] ||   // Alternative with space
                memberData.customFields?.lastName ||
                memberData.customFields?.['last_name'] ||
                memberData.metaData?.lastName ||
                memberData.metaData?.['last-name'] ||
                '';
            
            console.log(`✅ [getTeacherNameByMemberId] Teacher name: "${firstName} ${lastName}"`);
            
            // Combine names
            const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
            return fullName || 'Teacher';
        } else {
            console.warn(`⚠️ [getTeacherNameByMemberId] Memberstack API error: ${response.status} ${response.statusText}`);
            return 'Teacher';
        }
    } catch (error) {
        console.error(`❌ [getTeacherNameByMemberId] Error fetching teacher data:`, error.message);
        return 'Teacher';
    }
}

/**
 * Get school name from Memberstack API by Member ID
 * @param {string} memberId - Memberstack Member ID
 * @returns {Promise<string>} School name or 'School' if not found
 */
async function getSchoolNameByMemberId(memberId) {
    if (!memberId) {
        return 'School';
    }
    
    try {
        const MEMBERSTACK_SECRET_KEY = process.env.MEMBERSTACK_SECRET_KEY;
        if (!MEMBERSTACK_SECRET_KEY) {
            console.warn(`⚠️ Memberstack secret key not configured`);
            return 'School';
        }
        
        const response = await fetch(`https://admin.memberstack.com/members/${memberId}`, {
            method: 'GET',
            headers: {
                'x-api-key': MEMBERSTACK_SECRET_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const memberData = data.data || data;
            
            // Extract school name from various possible fields (based on your grep results)
            const schoolName = 
                memberData.customFields?.['place-name'] ||        // Primary field you mentioned
                memberData.customFields?.['place-name'] ||        // NEW: unified field name
                memberData.metaData?.placeName ||
                memberData.customFields?.school ||                // Simple field
                memberData.metaData?.school ||
                memberData.metaData?.schoolName ||
                '';
            
            console.log(`✅ [getSchoolNameByMemberId] School name: "${schoolName}"`);
            
            return schoolName || 'School';
        } else {
            console.warn(`⚠️ [getSchoolNameByMemberId] Memberstack API error: ${response.status} ${response.statusText}`);
            return 'School';
        }
    } catch (error) {
        console.error(`❌ [getSchoolNameByMemberId] Error fetching school data:`, error.message);
        return 'School';
    }
}

// Main export function
export default async function handler(req, res) {
    return handleApiRequest(req, res, {
        allowedMethods: ['GET'],
        requiredParams: ['lmid'],
        endpoint: 'get-teacher-data'
    }, getTeacherDataHandler);
} 