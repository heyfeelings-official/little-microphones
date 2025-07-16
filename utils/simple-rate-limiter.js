/**
 * utils/simple-rate-limiter.js - Simple In-Memory Rate Limiter
 * 
 * PURPOSE: Lightweight rate limiting for startup environments
 * DEPENDENCIES: Node.js native modules only
 * 
 * FEATURES:
 * - In-memory request tracking per IP/endpoint
 * - Configurable limits per endpoint
 * - Automatic cleanup of old requests
 * - Graceful error messages with retry times
 * - Self-contained with no external dependencies
 * 
 * USAGE:
 * import { checkRateLimit } from '../utils/simple-rate-limiter.js';
 * 
 * if (!checkRateLimit(req, res, 'endpoint-name', 60)) {
 *     return; // Rate limit exceeded, response already sent
 * }
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Production Ready ✅
 */

class SimpleRateLimiter {
    constructor() {
        this.requests = new Map();
        // Automatyczne czyszczenie co 5 minut
        setInterval(() => this.cleanup(), 300000);
    }

    /**
     * Check if request is within rate limit
     * @param {string} ip - Client IP address
     * @param {string} endpoint - Endpoint identifier
     * @param {number} maxRequests - Maximum requests allowed
     * @param {number} windowMs - Time window in milliseconds
     * @returns {Object} Rate limit check result
     */
    checkLimit(ip, endpoint, maxRequests = 60, windowMs = 60000) {
        const key = `${ip}:${endpoint}`;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }
        
        const userRequests = this.requests.get(key);
        const recentRequests = userRequests.filter(time => time > windowStart);
        
        if (recentRequests.length >= maxRequests) {
            return {
                allowed: false,
                retryAfter: Math.ceil((recentRequests[0] - windowStart) / 1000)
            };
        }
        
        recentRequests.push(now);
        this.requests.set(key, recentRequests);
        
        return {
            allowed: true,
            remaining: maxRequests - recentRequests.length
        };
    }

    /**
     * Cleanup old request records
     */
    cleanup() {
        const now = Date.now();
        const cutoff = now - 3600000; // 1 hour ago
        
        for (const [key, requests] of this.requests.entries()) {
            const filtered = requests.filter(time => time > cutoff);
            if (filtered.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, filtered);
            }
        }
        
        console.log(`🧹 Rate limiter cleanup: ${this.requests.size} active IP/endpoint combinations`);
    }
}

// Singleton instance
const rateLimiter = new SimpleRateLimiter();

/**
 * Check rate limit for a request and send 429 response if exceeded
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} endpoint - Endpoint identifier
 * @param {number} maxRequests - Maximum requests allowed (default: 60)
 * @param {number} windowMs - Time window in milliseconds (default: 60000)
 * @returns {boolean} True if request is allowed, false if rate limited
 */
export function checkRateLimit(req, res, endpoint, maxRequests = 60, windowMs = 60000) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               '127.0.0.1';
    
    const result = rateLimiter.checkLimit(ip, endpoint, maxRequests, windowMs);
    
    if (!result.allowed) {
        console.warn(`⚠️ Rate limit exceeded for ${endpoint}`, { 
            ip, 
            endpoint, 
            retryAfter: result.retryAfter 
        });
        
        res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: result.retryAfter,
            message: `Too many requests. Please try again in ${result.retryAfter} seconds.`
        });
        return false;
    }
    
    // Dodaj headers o limitach
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Date.now() + windowMs);
    
    return true;
}

/**
 * Get current rate limit statistics (for monitoring)
 * @returns {Object} Rate limit statistics
 */
export function getRateLimitStats() {
    return {
        activeConnections: rateLimiter.requests.size,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
    };
}