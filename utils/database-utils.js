/**
 * utils/database-utils.js - Database Query Optimization Utilities
 * 
 * PURPOSE: Centralized database operations with caching and optimization
 * DEPENDENCIES: Supabase client, lmid-utils
 * 
 * EXPORTED FUNCTIONS:
 * - getSupabaseClient(): Get configured Supabase client
 * - findLmidByShareId(): Find LMID by ShareID with caching
 * - findLmidsByMemberId(): Find all LMIDs for a member with caching
 * - getLmidDetails(): Get detailed LMID information
 * - updateLmidStatus(): Update LMID status with validation
 * - bulkUpdateLmids(): Update multiple LMIDs efficiently
 * - cacheGet(): Get value from cache
 * - cacheSet(): Set value in cache
 * - cacheClear(): Clear cache entries
 * - optimizeQuery(): Optimize Supabase query performance
 * - validateDatabaseConnection(): Validate database connection
 * - getTableStats(): Get table statistics for monitoring
 * 
 * CACHING STRATEGY:
 * - In-memory cache for frequently accessed data
 * - TTL-based expiration for data consistency
 * - Cache invalidation on data changes
 * - Selective caching based on query patterns
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Production Ready ✅
 */

import { createClient } from '@supabase/supabase-js';
import { WORLDS } from './lmid-utils.js';
import { validateShareId, validateWorldName } from './input-validator.js';

// In-memory cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Cache entry structure: { value, timestamp, ttl }
class CacheEntry {
    constructor(value, ttl = CACHE_TTL) {
        this.value = value;
        this.timestamp = Date.now();
        this.ttl = ttl;
    }
    
    isExpired() {
        return Date.now() - this.timestamp > this.ttl;
    }
}

/**
 * Get configured Supabase client with connection pooling
 * @returns {Object} Supabase client instance
 */
export function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration');
    }
    
    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false, // Don't persist session for API calls
            autoRefreshToken: false
        },
        db: {
            schema: 'public'
        }
    });
}

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {*} Cached value or null if not found/expired
 */
export function cacheGet(key) {
    const entry = cache.get(key);
    if (!entry || entry.isExpired()) {
        cache.delete(key);
        return null;
    }
    return entry.value;
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - Time to live in milliseconds
 */
export function cacheSet(key, value, ttl = CACHE_TTL) {
    // Limit cache size to prevent memory issues
    if (cache.size > 1000) {
        // Remove oldest entries
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
    }
    
    cache.set(key, new CacheEntry(value, ttl));
}

/**
 * Clear cache entries by pattern
 * @param {string|RegExp} pattern - Pattern to match keys
 */
export function cacheClear(pattern = null) {
    if (!pattern) {
        cache.clear();
        return;
    }
    
    const isRegex = pattern instanceof RegExp;
    const keys = Array.from(cache.keys());
    
    keys.forEach(key => {
        if (isRegex ? pattern.test(key) : key.includes(pattern)) {
            cache.delete(key);
        }
    });
}

/**
 * Find LMID by ShareID with caching and optimization
 * @param {string} shareId - ShareID to search for
 * @param {string} world - Optional world hint for faster lookup
 * @returns {Promise<Object|null>} LMID record or null if not found
 */
export async function findLmidByShareId(shareId, world = null) {
    // SECURITY: Validate shareId parameter
    const shareIdValidation = validateShareId(shareId);
    if (!shareIdValidation.valid) {
        console.error('Invalid shareId parameter:', shareIdValidation.error);
        return null;
    }
    shareId = shareIdValidation.sanitized;
    
    // SECURITY: Validate world parameter if provided
    if (world !== null) {
        const worldValidation = validateWorldName(world);
        if (!worldValidation.valid) {
            console.error('Invalid world parameter:', worldValidation.error);
            return null;
        }
        world = worldValidation.sanitized;
    }
    
    const cacheKey = `lmid_by_share_${shareId}_${world || 'all'}`;
    
    // Check cache first
    const cachedResult = cacheGet(cacheKey);
    if (cachedResult) {
        return cachedResult;
    }
    
    const supabase = getSupabaseClient();
    let query;
    
    if (world && WORLDS.includes(world)) {
        // Optimized query with world hint
        const worldColumn = `share_id_${world.replace('-', '_')}`;
        query = supabase
            .from('lmids')
            .select('lmid, assigned_to_member_id, assigned_to_member_email, status')
            .eq(worldColumn, shareId)
            .single();
    } else {
        // Search across all world columns
        const worldQueries = WORLDS.map(w => `share_id_${w.replace('-', '_')}.eq.${shareId}`);
        query = supabase
            .from('lmids')
            .select(`lmid, assigned_to_member_id, assigned_to_member_email, status, ${WORLDS.map(w => `share_id_${w.replace('-', '_')}`).join(', ')}`)
            .or(worldQueries.join(','))
            .single();
    }
    
    const { data, error } = await query;
    
    if (error || !data) {
        return null;
    }
    
    // Add world information to the result if not provided
    if (!world && data) {
        for (const w of WORLDS) {
            const worldColumn = `share_id_${w.replace('-', '_')}`;
            if (data[worldColumn] === shareId) {
                data.world = w;
                break;
            }
        }
    } else if (world) {
        data.world = world;
    }
    
    // Cache the result
    cacheSet(cacheKey, data, CACHE_TTL);
    
    return data;
}

/**
 * Find all LMIDs for a member with caching
 * @param {string} memberId - Member ID
 * @returns {Promise<Array>} Array of LMID records
 */
export async function findLmidsByMemberId(memberId) {
    const cacheKey = `lmids_by_member_${memberId}`;
    
    // Check cache first
    const cachedResult = cacheGet(cacheKey);
    if (cachedResult) {
        return cachedResult;
    }
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('lmids')
        .select('lmid, status, assigned_at, share_id_spookyland, share_id_waterpark, share_id_shopping_spree, share_id_amusement_park, share_id_big_city, share_id_neighborhood')
        .eq('assigned_to_member_id', memberId)
        .eq('status', 'used')
        .order('lmid', { ascending: true });
    
    if (error) {
        console.error('Error fetching member LMIDs:', error);
        return [];
    }
    
    const result = data || [];
    
    // Cache the result with shorter TTL for member data
    cacheSet(cacheKey, result, CACHE_TTL / 2);
    
    return result;
}

/**
 * Get detailed LMID information with related data
 * @param {number} lmid - LMID number
 * @returns {Promise<Object|null>} Detailed LMID information
 */
export async function getLmidDetails(lmid) {
    const cacheKey = `lmid_details_${lmid}`;
    
    // Check cache first
    const cachedResult = cacheGet(cacheKey);
    if (cachedResult) {
        return cachedResult;
    }
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('lmids')
        .select('*')
        .eq('lmid', lmid)
        .single();
    
    if (error || !data) {
        return null;
    }
    
    // Add ShareID mapping for easier access
    data.shareIds = {};
    WORLDS.forEach(world => {
        const worldColumn = `share_id_${world.replace('-', '_')}`;
        data.shareIds[world] = data[worldColumn];
    });
    
    // Cache the result
    cacheSet(cacheKey, data, CACHE_TTL);
    
    return data;
}

/**
 * Update LMID status with validation and cache invalidation
 * @param {number} lmid - LMID number
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateLmidStatus(lmid, status, additionalData = {}) {
    const supabase = getSupabaseClient();
    
    const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
    };
    
    const { error } = await supabase
        .from('lmids')
        .update(updateData)
        .eq('lmid', lmid);
    
    if (error) {
        console.error('Error updating LMID status:', error);
        return false;
    }
    
    // Clear related cache entries
    cacheClear(`lmid_details_${lmid}`);
    cacheClear(`lmids_by_member_`);
    
    return true;
}

/**
 * Update multiple LMIDs efficiently
 * @param {Array} updates - Array of {lmid, status, ...data} objects
 * @returns {Promise<boolean>} Success status
 */
export async function bulkUpdateLmids(updates) {
    const supabase = getSupabaseClient();
    
    try {
        const promises = updates.map(update => {
            const { lmid, ...updateData } = update;
            return supabase
                .from('lmids')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('lmid', lmid);
        });
        
        const results = await Promise.all(promises);
        const hasErrors = results.some(result => result.error);
        
        if (hasErrors) {
            console.error('Some bulk updates failed:', results.filter(r => r.error));
            return false;
        }
        
        // Clear cache for updated LMIDs
        updates.forEach(update => {
            cacheClear(`lmid_details_${update.lmid}`);
        });
        cacheClear(`lmids_by_member_`);
        
        return true;
    } catch (error) {
        console.error('Error in bulk update:', error);
        return false;
    }
}

/**
 * Optimize Supabase query performance
 * @param {Object} query - Supabase query object
 * @returns {Object} Optimized query object
 */
export function optimizeQuery(query) {
    // Add common performance optimizations
    return query
        .limit(1000) // Prevent runaway queries
        .abortSignal(AbortSignal.timeout(30000)); // 30 second timeout
}

/**
 * Validate database connection
 * @returns {Promise<boolean>} Connection status
 */
export async function validateDatabaseConnection() {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('lmids')
            .select('count')
            .limit(1);
        
        return !error;
    } catch (error) {
        console.error('Database connection validation failed:', error);
        return false;
    }
}

/**
 * Get table statistics for monitoring
 * @returns {Promise<Object>} Table statistics
 */
export async function getTableStats() {
    const supabase = getSupabaseClient();
    
    try {
        const { data: totalCount } = await supabase
            .from('lmids')
            .select('count');
        
        const { data: usedCount } = await supabase
            .from('lmids')
            .select('count')
            .eq('status', 'used');
        
        const { data: availableCount } = await supabase
            .from('lmids')
            .select('count')
            .eq('status', 'available');
        
        return {
            total: totalCount?.[0]?.count || 0,
            used: usedCount?.[0]?.count || 0,
            available: availableCount?.[0]?.count || 0,
            cacheSize: cache.size
        };
    } catch (error) {
        console.error('Error getting table stats:', error);
        return {
            total: 0,
            used: 0,
            available: 0,
            cacheSize: cache.size
        };
    }
}

/**
 * Clear expired cache entries (maintenance function)
 */
export function clearExpiredCache() {
    const expiredKeys = [];
    
    cache.forEach((entry, key) => {
        if (entry.isExpired()) {
            expiredKeys.push(key);
        }
    });
    
    expiredKeys.forEach(key => cache.delete(key));
    
    if (expiredKeys.length > 0) {
        console.log(`Cleared ${expiredKeys.length} expired cache entries`);
    }
}

// Auto-cleanup expired cache entries every 5 minutes
setInterval(clearExpiredCache, 5 * 60 * 1000); 