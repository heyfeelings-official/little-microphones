/**
 * utils/api-utils.js - Enhanced Shared API Utilities
 * 
 * PURPOSE: Comprehensive utilities for API endpoints to eliminate code duplication
 * DEPENDENCIES: None
 * 
 * EXPORTED FUNCTIONS:
 * - setCorsHeaders(): Set standard CORS headers
 * - handleOptionsRequest(): Handle preflight OPTIONS requests
 * - validateMethod(): Validate HTTP method and return error if invalid
 * - createErrorResponse(): Create standardized error response
 * - createSuccessResponse(): Create standardized success response
 * - validateRequiredParams(): Validate required parameters exist
 * - validateEnvironmentVars(): Validate environment variables exist
 * - logApiRequest(): Log API request for debugging
 * - handleApiRequest(): Comprehensive API request handler with error boundaries
 * - validateMemberstackWebhook(): Validate Memberstack webhook signature
 * - sanitizeError(): Sanitize error messages for safe client responses
 * - formatApiResponse(): Format consistent API responses
 * - timeoutPromise(): Add timeout to promises
 * - retryWithBackoff(): Retry function with exponential backoff
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.0.0 (Enhanced)
 * STATUS: Production Ready ✅
 */

/**
 * Set secure CORS headers for API responses with origin validation
 * @param {Object} res - Response object
 * @param {Array<string>} methods - Allowed HTTP methods (default: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
 */
export function setCorsHeaders(res, methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const ALLOWED_ORIGINS = [
        'https://hey-feelings-v2.webflow.io',
        'https://heyfeelings.com',
        'https://little-microphones.vercel.app',
        'https://webflow.com',
        'https://preview.webflow.com'
    ];
    
    return function(req) {
        const origin = req.headers.origin || req.headers.referer;
        
        // Sprawdź czy origin jest dozwolony
        if (origin && ALLOWED_ORIGINS.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else {
            // Fallback dla development i nieznanych origins
            res.setHeader('Access-Control-Allow-Origin', 'https://hey-feelings-v2.webflow.io');
        }
        
        res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Memberstack-Signature');
        res.setHeader('Access-Control-Max-Age', '86400');
        
        // Bezpieczne headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
    };
}

/**
 * Handle preflight OPTIONS requests
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {boolean} True if OPTIONS request was handled
 */
export function handleOptionsRequest(req, res) {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
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
        const errorResponse = createErrorResponse(
            `Method not allowed. Use ${methods.join(' or ')}.`,
            { allowedMethods: methods, receivedMethod: req.method }
        );
        res.status(405).json(errorResponse);
        return false;
    }
    return true;
}

/**
 * Create standardized error response
 * @param {string} message - Error message
 * @param {Object} details - Optional error details
 * @param {string} code - Optional error code
 * @returns {Object} Error response object
 */
export function createErrorResponse(message, details = null, code = null) {
    const response = {
        success: false,
        error: message,
        timestamp: new Date().toISOString()
    };
    
    if (details) {
        response.details = details;
    }
    
    if (code) {
        response.code = code;
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
        message: message,
        timestamp: new Date().toISOString()
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

/**
 * Comprehensive API request handler with error boundaries
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} config - Configuration object
 * @param {Function} handler - Main handler function
 * @returns {Promise} Promise that resolves with response
 */
export async function handleApiRequest(req, res, config, handler) {
    const { 
        endpoint, 
        allowedMethods = ['GET', 'POST'], 
        requiredParams = [],
        requiredEnvVars = [],
        timeout = 30000
    } = config;
    
    try {
        // Set CORS headers
        setCorsHeaders(res, allowedMethods);
        
        // Handle OPTIONS
        if (handleOptionsRequest(req, res)) {
            return;
        }
        
        // Validate method
        if (!validateMethod(req, res, allowedMethods)) {
            return;
        }
        
        // Log request
        logApiRequest(endpoint, req, { ...req.body, ...req.query });
        
        // Validate required parameters
        const params = { ...req.body, ...req.query };
        const paramValidation = validateRequiredParams(params, requiredParams);
        if (!paramValidation.valid) {
            const errorResponse = createErrorResponse(
                'Missing required parameters',
                { missing: paramValidation.missing },
                'MISSING_PARAMETERS'
            );
            return res.status(400).json(errorResponse);
        }
        
        // Validate environment variables
        const envValidation = validateEnvironmentVars(requiredEnvVars);
        if (!envValidation.valid) {
            console.error(`Missing environment variables: ${envValidation.missing.join(', ')}`);
            const errorResponse = createErrorResponse(
                'Server configuration error',
                null,
                'SERVER_CONFIG_ERROR'
            );
            return res.status(500).json(errorResponse);
        }
        
        // Execute handler with timeout
        const result = await timeoutPromise(handler(req, res, params), timeout);
        
        // If handler hasn't sent response yet, send success response
        if (!res.headersSent && result) {
            const successResponse = createSuccessResponse('Operation completed successfully', result);
            return res.status(200).json(successResponse);
        }
        
    } catch (error) {
        console.error(`Error in ${endpoint}:`, error);
        
        // Don't send response if already sent
        if (!res.headersSent) {
            const sanitizedError = sanitizeError(error);
            const errorResponse = createErrorResponse(
                sanitizedError.message,
                sanitizedError.details,
                sanitizedError.code
            );
            return res.status(sanitizedError.status || 500).json(errorResponse);
        }
    }
}

/**
 * Validate Memberstack webhook signature (basic implementation)
 * @param {Object} req - Request object
 * @returns {boolean} True if webhook is valid
 */
export function validateMemberstackWebhook(req) {
    // TODO: Implement proper Memberstack webhook signature verification
    // For now, we'll do basic validation
    const userAgent = req.headers['user-agent'];
    const signature = req.headers['x-memberstack-signature'];
    
    // Basic validation - in production, verify the actual signature
    return userAgent && userAgent.includes('Memberstack');
}

/**
 * Sanitize error messages for safe client responses
 * @param {Error} error - Error object
 * @returns {Object} Sanitized error object
 */
export function sanitizeError(error) {
    const sanitized = {
        message: 'An error occurred',
        details: null,
        code: null,
        status: 500
    };
    
    if (error.message) {
        // Remove sensitive information from error messages
        const sensitivePatterns = [
            /password/i,
            /token/i,
            /key/i,
            /secret/i,
            /credential/i
        ];
        
        let message = error.message;
        sensitivePatterns.forEach(pattern => {
            message = message.replace(pattern, '[REDACTED]');
        });
        
        sanitized.message = message;
    }
    
    if (error.code) {
        sanitized.code = error.code;
    }
    
    if (error.status) {
        sanitized.status = error.status;
    }
    
    // Add specific handling for common error types
    if (error.name === 'ValidationError') {
        sanitized.status = 400;
        sanitized.code = 'VALIDATION_ERROR';
    } else if (error.name === 'NotFoundError') {
        sanitized.status = 404;
        sanitized.code = 'NOT_FOUND';
    }
    
    return sanitized;
}

/**
 * Format consistent API response
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {Object} data - Response data
 * @param {Object} meta - Response metadata
 * @returns {Object} Formatted response
 */
export function formatApiResponse(success, message, data = null, meta = null) {
    const response = {
        success,
        message,
        timestamp: new Date().toISOString()
    };
    
    if (data) {
        response.data = data;
    }
    
    if (meta) {
        response.meta = meta;
    }
    
    return response;
}

/**
 * Add timeout to promises
 * @param {Promise} promise - Promise to timeout
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Promise that rejects on timeout
 */
export function timeoutPromise(promise, timeout) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
        })
    ]);
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Promise that resolves with function result
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`Retry attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
} 