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

// World background videos (updated to use MP4 instead of AVIF)
const WORLD_BACKGROUNDS = {
    'big-city': 'https://heyfeelings.b-cdn.net/Worlds/city-opt.mp4',
    'amusement-park': 'https://heyfeelings.b-cdn.net/Worlds/funfair-opt.mp4',
    'spookyland': 'https://heyfeelings.b-cdn.net/Worlds/halloween-opt.mp4',
    'neighborhood': 'https://heyfeelings.b-cdn.net/Worlds/home-opt.mp4',
    'shopping-spree': 'https://heyfeelings.b-cdn.net/Worlds/mall-opt.mp4',
    'waterpark': 'https://heyfeelings.b-cdn.net/Worlds/waterpark-opt.mp4'
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

    // Return optimized response data for parent redirect system
    return {
        world: lmidData.world,
        world_name: lmidData.world, // For display purposes
        lmid: lmidData.lmid,
        original_lmid: lmidData.lmid, // Same as lmid - parents share teacher's LMID
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