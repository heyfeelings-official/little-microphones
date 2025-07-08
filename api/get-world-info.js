/**
 * api/get-world-info.js - Quick World Info Retrieval (Refactored)
 * 
 * PURPOSE: Fast endpoint to get world info from ShareID for radio page optimization
 * DEPENDENCIES: Enhanced utils for standardized API handling
 * 
 * REQUEST FORMAT:
 * GET /api/get-world-info?shareId=kz7xp4v9
 * 
 * RESPONSE FORMAT:
 * { success: true, world: "spookyland", lmid: 38, backgroundUrl: "...", timestamp: "2025-01-06T..." }
 * 
 * OPTIMIZATIONS:
 * - Minimal data transfer for faster page loads
 * - Caching for frequently accessed ShareIDs
 * - Quick database lookup with optimized queries
 * - Standardized error handling and response format
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.0.0 (Refactored)
 * STATUS: Production Ready ✅
 */

import { handleApiRequest } from '../utils/api-utils.js';
import { findLmidByShareId } from '../utils/database-utils.js';

// World background images (moved to constants)
const WORLD_BACKGROUNDS = {
    'shopping-spree': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f506146fb421db045378af_cdcb9c23ac6f956cbb6f7f498c75cd11_worlds-Anxiety.avif',
    'waterpark': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f50606d058c933cd554be8_2938a42d480503a33daf8a8334f53f0a_worlds-Empathy.avif',
    'amusement-park': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505fe412762bb8a01b03d_85fcbe125912ab0998bf679d2e8c6082_worlds-Love.avif',
    'big-city': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505f572e936f2b665af1f_7b989a3fe827622216294c6539607059_worlds-Anger.avif',
    'spookyland': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505ecd6f37624ef7affb8_587c997427b10cabcc31cc98d6e516f4_worlds-Fear.png',
    'neighborhood': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/683859c64fa8c3f50ead799a_worlds-boredom.avif'
};

/**
 * Handler function for world info retrieval
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} params - Validated parameters
 * @returns {Promise<Object>} Response data
 */
async function getWorldInfoHandler(req, res, params) {
    const { shareId } = params;
    
    // Use optimized database query with caching
    const lmidData = await findLmidByShareId(shareId);

    if (!lmidData) {
        const error = new Error('ShareID not found');
        error.status = 404;
        error.code = 'SHARE_ID_NOT_FOUND';
        throw error;
    }
    
    // Get background URL for the world
    const backgroundUrl = WORLD_BACKGROUNDS[lmidData.world];

    // Return optimized response data
    return {
        world: lmidData.world,
        lmid: lmidData.lmid,
        backgroundUrl: backgroundUrl || null
    };
}

export default async function handler(req, res) {
    await handleApiRequest(req, res, {
        endpoint: 'get-world-info',
        allowedMethods: ['GET'],
        requiredParams: ['shareId'],
        timeout: 10000 // Fast endpoint needs quick timeout
    }, getWorldInfoHandler);
} 