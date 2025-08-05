/**
 * Simple Rate Limiter for Little Microphones API
 * 
 * Provides in-memory rate limiting to prevent DDoS attacks and API abuse.
 * Automatically cleans up old entries to prevent memory leaks.
 * 
 * @author Little Microphones Security Team
 * @version 1.0.0
 * @date January 2025
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
     * @param {string} endpoint - API endpoint name
     * @param {number} maxRequests - Maximum requests per window (default: 60)
     * @param {number} windowMs - Time window in milliseconds (default: 60000 = 1 minute)
     * @returns {Object} Rate limit result
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
     * Clean up old entries to prevent memory leaks
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
        
        console.log(`🧹 Rate limiter cleanup: ${this.requests.size} active IP+endpoint combinations`);
    }
}

// Singleton instance
const rateLimiter = new SimpleRateLimiter();

/**
 * Check rate limit for incoming request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {string} endpoint - API endpoint name
 * @param {number} maxRequests - Maximum requests per minute (default: 60)
 * @returns {boolean} True if allowed, false if blocked
 */
export function checkRateLimit(req, res, endpoint, maxRequests = 60) {
    // Bypass rate limiting for internal API calls
    if (req.headers['user-agent'] === 'internal-api-call') {
        console.log(`🔓 Bypassing rate limit for internal call: ${endpoint}`);
        return true;
    }
    
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               'unknown';
    
    const result = rateLimiter.checkLimit(ip, endpoint, maxRequests);
    
    if (!result.allowed) {
        console.warn(`⚠️ Rate limit exceeded for ${endpoint}`, { 
            ip: ip.substring(0, 12) + '...', // Log partial IP for privacy
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
    res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + 60); // Reset w następnej minucie
    
    return true;
}

/**
 * Get rate limit statistics (for monitoring)
 * @returns {Object} Rate limit statistics
 */
export function getRateLimitStats() {
    return {
        activeKeys: rateLimiter.requests.size,
        memoryUsage: JSON.stringify(Array.from(rateLimiter.requests.keys())).length
    };
} 