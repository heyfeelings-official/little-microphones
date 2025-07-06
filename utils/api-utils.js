/**
 * utils/api-utils.js - Shared API Utilities
 * 
 * PURPOSE: Common utilities for API endpoints to reduce code duplication
 * DEPENDENCIES: None
 * 
 * EXPORTED FUNCTIONS:
 * - setCorsHeaders(): Set standard CORS headers
 * - handleOptionsRequest(): Handle preflight OPTIONS requests
 * - validateMethod(): Validate HTTP method and return error if invalid
 * - createErrorResponse(): Create standardized error response
 * - createSuccessResponse(): Create standardized success response
 * - validateRequiredParams(): Validate required parameters exist
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Production Ready ✅
 */

/**
 * Set standard CORS headers for API responses
 * @param {Object} res - Response object
 * @param {Array<string>} methods - Allowed HTTP methods (default: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
 */
export function setCorsHeaders(res, methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Handle preflight OPTIONS requests
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {boolean} True if OPTIONS request was handled
 */
export function handleOptionsRequest(req, res) {
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }
    return false;
}

/**
 * Validate HTTP method and return error response if invalid
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string|Array<string>} allowedMethods - Allowed method(s)
 * @returns {boolean} True if method is valid, false if error response was sent
 */
export function validateMethod(req, res, allowedMethods) {
    const methods = Array.isArray(allowedMethods) ? allowedMethods : [allowedMethods];
    
    if (!methods.includes(req.method)) {
        res.status(405).json({
            success: false,
            error: `Method not allowed. Use ${methods.join(' or ')}.`
        });
        return false;
    }
    return true;
}

/**
 * Create standardized error response
 * @param {string} message - Error message
 * @param {string} details - Optional error details
 * @returns {Object} Error response object
 */
export function createErrorResponse(message, details = null) {
    const response = {
        success: false,
        error: message
    };
    
    if (details) {
        response.details = details;
    }
    
    return response;
}

/**
 * Create standardized success response
 * @param {string} message - Success message
 * @param {Object} data - Optional data to include
 * @returns {Object} Success response object
 */
export function createSuccessResponse(message, data = null) {
    const response = {
        success: true,
        message: message
    };
    
    if (data) {
        Object.assign(response, data);
    }
    
    return response;
}

/**
 * Validate required parameters exist in request
 * @param {Object} params - Parameters to validate (from req.body or req.query)
 * @param {Array<string>} requiredFields - List of required field names
 * @returns {Object} Validation result with { valid: boolean, missing: Array<string> }
 */
export function validateRequiredParams(params, requiredFields) {
    const missing = [];
    
    for (const field of requiredFields) {
        if (!params[field] && params[field] !== 0) { // Allow 0 as valid value
            missing.push(field);
        }
    }
    
    return {
        valid: missing.length === 0,
        missing: missing
    };
}

/**
 * Validate environment variables exist
 * @param {Array<string>} requiredEnvVars - List of required environment variable names
 * @returns {Object} Validation result with { valid: boolean, missing: Array<string> }
 */
export function validateEnvironmentVars(requiredEnvVars) {
    const missing = [];
    
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    }
    
    return {
        valid: missing.length === 0,
        missing: missing
    };
}

/**
 * Log API request for debugging
 * @param {string} endpoint - API endpoint name
 * @param {Object} req - Request object
 * @param {Object} params - Parameters being processed
 */
export function logApiRequest(endpoint, req, params = {}) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    console.log(`[${timestamp}] ${method} ${endpoint}`);
    console.log(`User-Agent: ${userAgent}`);
    
    if (Object.keys(params).length > 0) {
        console.log(`Parameters:`, params);
    }
} 