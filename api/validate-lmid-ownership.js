/**
 * api/validate-lmid-ownership.js - LMID Ownership Validation
 * 
 * PURPOSE: Validates that a member owns specific LMIDs before allowing metadata updates
 * DEPENDENCIES: Supabase client
 * 
 * REQUEST FORMAT:
 * POST /api/validate-lmid-ownership
 * {
 *   "memberId": "mem_123",
 *   "lmids": "1,2,3"
 * }
 * 
 * RESPONSE FORMAT:
 * {
 *   "success": true,
 *   "valid": true,
 *   "ownedLmids": ["1", "2", "3"],
 *   "invalidLmids": []
 * }
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get validated LMIDs for a member from database
 * @param {string} memberId - Memberstack member ID
 * @returns {Promise<string>} Comma-separated string of valid LMIDs
 */
async function getValidatedLmids(memberId) {
    try {
        const { data: ownedRecords, error } = await supabase
            .from('lmids')
            .select('lmid')
            .eq('assigned_to_member_id', memberId)
            .eq('status', 'used')
            .order('lmid', { ascending: true });

        if (error) {
            console.error('Error fetching member LMIDs:', error);
            return '';
        }

        if (!ownedRecords || ownedRecords.length === 0) {
            return '';
        }

        return ownedRecords.map(record => record.lmid.toString()).join(',');
    } catch (error) {
        console.error('Error in getValidatedLmids:', error);
        return '';
    }
}

/**
 * Validate LMID ownership
 * @param {string} memberId - Memberstack member ID
 * @param {string} lmidsToValidate - Comma-separated LMIDs to validate
 * @returns {Promise<Object>} Validation result
 */
async function validateLmidOwnership(memberId, lmidsToValidate) {
    // Get actual owned LMIDs from database
    const validLmidsString = await getValidatedLmids(memberId);
    const validLmids = validLmidsString ? validLmidsString.split(',') : [];
    
    // Parse LMIDs to validate
    const lmidsArray = lmidsToValidate ? lmidsToValidate.split(',').map(id => id.trim()) : [];
    
    // Check which LMIDs are valid
    const ownedLmids = [];
    const invalidLmids = [];
    
    for (const lmid of lmidsArray) {
        if (validLmids.includes(lmid)) {
            ownedLmids.push(lmid);
        } else {
            invalidLmids.push(lmid);
        }
    }
    
    return {
        valid: invalidLmids.length === 0,
        ownedLmids,
        invalidLmids,
        actualOwnedLmids: validLmids
    };
}

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }

    try {
        const { memberId, lmids } = req.body;

        if (!memberId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameter: memberId' 
            });
        }

        // Validate member ID format
        if (!memberId.startsWith('mem_') || memberId.length < 10) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid member ID format' 
            });
        }

        // Validate ownership
        const validation = await validateLmidOwnership(memberId, lmids || '');

        return res.status(200).json({
            success: true,
            valid: validation.valid,
            ownedLmids: validation.ownedLmids,
            invalidLmids: validation.invalidLmids,
            actualOwnedLmids: validation.actualOwnedLmids,
            message: validation.valid 
                ? 'All LMIDs are valid' 
                : `Invalid LMIDs detected: ${validation.invalidLmids.join(', ')}`
        });

    } catch (error) {
        console.error('Error in validate-lmid-ownership:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error during validation' 
        });
    }
} 