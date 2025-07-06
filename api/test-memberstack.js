/**
 * api/test-memberstack.js - Memberstack Metadata Sync Testing Endpoint (Refactored)
 * 
 * PURPOSE: Force-sync member metadata between Supabase and Memberstack for testing
 * DEPENDENCIES: Enhanced utils for standardized API handling and database operations
 * 
 * REQUEST FORMAT:
 * POST /api/test-memberstack
 * Body: { memberId: "mem_123..." }
 * 
 * RESPONSE FORMAT:
 * { success: true, message: "...", synchronizedLmids: "1,2,3", timestamp: "2025-01-06T..." }
 * 
 * FUNCTIONALITY:
 * - Fetches correct LMID data from Supabase database
 * - Force-updates Memberstack metadata with correct data
 * - Provides detailed logging for debugging sync issues
 * - Uses enhanced error handling and caching
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.0.0 (Refactored)
 * STATUS: Production Ready ✅
 */

import { handleApiRequest } from '../utils/api-utils.js';
import { findLmidsByMemberId } from '../utils/database-utils.js';
import { updateMemberMetadata } from '../utils/memberstack-utils.js';

/**
 * Handler function for Memberstack metadata sync testing
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} params - Validated parameters
 * @returns {Promise<Object>} Response data
 */
async function testMemberstackHandler(req, res, params) {
    const { memberId } = params;
    
    console.log(`🔧 [SYNC-MEMBERSTACK] Starting one-time sync for member: ${memberId}`);
    
    try {
        // Step 1: Fetch correct LMIDs from our database using optimized query
        console.log('🔍 Fetching correct LMIDs from Supabase...');
        const lmidRecords = await findLmidsByMemberId(memberId);
        
        if (!lmidRecords || lmidRecords.length === 0) {
            console.log(`📭 No LMIDs found for member: ${memberId}`);
            return {
                message: `No LMIDs found for member ${memberId}`,
                synchronizedLmids: '',
                lmidCount: 0
            };
        }
        
        const correctLmidArray = lmidRecords.map(record => record.lmid);
        const correctLmidString = correctLmidArray.join(',');
        console.log(`📄 Correct LMIDs from Supabase: [${correctLmidString}]`);
        
        // Step 2: Force-update Memberstack metadata using enhanced function
        console.log('📤 Force-updating Memberstack metadata...');
        const updateSuccess = await updateMemberMetadata(memberId, {
            lmids: correctLmidString
        }, {
            validateOwnership: false, // Skip validation for force sync
            clearCache: true
        });
        
        if (!updateSuccess) {
            const error = new Error('Failed to update Memberstack metadata');
            error.status = 500;
            error.code = 'MEMBERSTACK_UPDATE_FAILED';
            throw error;
        }
        
        console.log('✅ Memberstack metadata synchronized successfully!');
        
        return {
            message: `Successfully synchronized Memberstack metadata for member ${memberId}`,
            synchronizedLmids: correctLmidString,
            lmidCount: correctLmidArray.length,
            lmidDetails: lmidRecords.map(record => ({
                lmid: record.lmid,
                assignedAt: record.assigned_at
            }))
        };
        
    } catch (error) {
        console.error('❌ [SYNC-MEMBERSTACK] Error during sync process:', error);
        
        // Re-throw with enhanced error information
        const enhancedError = new Error(`Sync process failed: ${error.message}`);
        enhancedError.status = error.status || 500;
        enhancedError.code = error.code || 'SYNC_FAILED';
        throw enhancedError;
    }
}

export default async function handler(req, res) {
    await handleApiRequest(req, res, {
        endpoint: 'test-memberstack',
        allowedMethods: ['POST'],
        requiredParams: ['memberId'],
        requiredEnvVars: ['MEMBERSTACK_SECRET_KEY'],
        timeout: 30000 // Allow extra time for Memberstack API calls
    }, testMemberstackHandler);
} 