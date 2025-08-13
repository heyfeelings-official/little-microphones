/**
 * api/cms-cache.js - Cached Webflow CMS API
 * 
 * PURPOSE: High-performance cached access to Webflow CMS data
 * REDUCES: Rate limiting issues by serving cached data
 * INVALIDATION: Via webhooks when CMS changes
 * 
 * ENDPOINTS:
 * - GET /api/cms-cache?collection=workbooks&lang=en
 * - GET /api/cms-cache?item=lesson-1&lang=pl
 * 
 * CACHE STRATEGY:
 * - TTL: 15 minutes (safety net)
 * - Webhook invalidation: Immediate
 * - Memory cache: Production ready for moderate traffic
 * 
 * VERSION: 1.0.0
 * LAST UPDATED: January 2025
 */

import { getWebflowItem, getWebflowHeaders } from '../utils/webflow-api.js';
import { setCorsHeaders } from '../utils/api-utils.js';
import { webflowCache } from './webflow-webhook.js';

// Cache configuration
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds
const WEBFLOW_API_BASE = 'https://api.webflow.com/v2';
const COLLECTION_ID = '689a16dd10cb6df7ff0094a0';

/**
 * Get all items from Webflow collection (with caching)
 */
async function getCachedCollectionItems(language = 'en') {
    const cacheKey = `collection_${COLLECTION_ID}_${language}`;
    
    // Check cache first
    const cached = webflowCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`🎯 Cache HIT for collection (${language}): ${cached.data.length} items`);
        return cached.data;
    }
    
    console.log(`📡 Cache MISS - Fetching collection from Webflow API (${language})`);
    
    try {
        // Get locale ID for language
        const locales = await getLocaleIds();
        const localeId = locales[language];
        
        // Fetch from Webflow API
        let url = `${WEBFLOW_API_BASE}/collections/${COLLECTION_ID}/items`;
        if (localeId) {
            url += `?cmsLocaleId=${localeId}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: getWebflowHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Webflow API error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        const items = result.items || [];
        
        // Map to our internal structure
        const mappedItems = items.map(item => mapWebflowFields(item, language));
        
        // Cache the result
        webflowCache.set(cacheKey, {
            data: mappedItems,
            timestamp: Date.now()
        });
        
        console.log(`✅ Cached ${mappedItems.length} items for language: ${language}`);
        return mappedItems;
        
    } catch (error) {
        console.error(`❌ Error fetching collection items (${language}):`, error);
        
        // Return stale cache if available
        if (cached) {
            console.log(`⚠️ Returning stale cache data (${language})`);
            return cached.data;
        }
        
        throw error;
    }
}

/**
 * Get single item from cache or Webflow API
 */
async function getCachedItem(itemSlug, language = 'en') {
    const cacheKey = `item_${itemSlug}_${language}`;
    
    // Check cache first
    const cached = webflowCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`🎯 Cache HIT for item: ${itemSlug} (${language})`);
        return cached.data;
    }
    
    console.log(`📡 Cache MISS - Fetching item from Webflow API: ${itemSlug} (${language})`);
    
    try {
        // Use existing getWebflowItem function
        const item = await getWebflowItem(itemSlug, language);
        
        if (item) {
            // Cache the result
            webflowCache.set(cacheKey, {
                data: item,
                timestamp: Date.now()
            });
            
            console.log(`✅ Cached item: ${itemSlug} (${language})`);
        }
        
        return item;
        
    } catch (error) {
        console.error(`❌ Error fetching item ${itemSlug} (${language}):`, error);
        
        // Return stale cache if available
        if (cached) {
            console.log(`⚠️ Returning stale cache data for: ${itemSlug} (${language})`);
            return cached.data;
        }
        
        throw error;
    }
}

/**
 * Get locale IDs (cached)
 */
async function getLocaleIds() {
    const cacheKey = 'locales';
    
    // Check cache first
    const cached = webflowCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }
    
    try {
        const SITE_ID = '67e5317b686eccb10a95be01';
        const response = await fetch(`${WEBFLOW_API_BASE}/sites/${SITE_ID}`, {
            method: 'GET',
            headers: getWebflowHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Webflow API error: ${response.status}`);
        }
        
        const siteData = await response.json();
        const locales = {
            'en': siteData.locales?.primary?.cmsLocaleId || null,
            'pl': siteData.locales?.secondary?.find(loc => loc.tag === 'pl')?.cmsLocaleId || null
        };
        
        // Cache locales
        webflowCache.set(cacheKey, {
            data: locales,
            timestamp: Date.now()
        });
        
        return locales;
        
    } catch (error) {
        console.error('❌ Error fetching locales:', error);
        
        // Return stale cache if available
        if (cached) {
            return cached.data;
        }
        
        // Fallback to empty locales
        return { 'en': null, 'pl': null };
    }
}

/**
 * Map Webflow fields to internal structure
 */
function mapWebflowFields(webflowItem, language = 'en') {
    const fieldData = webflowItem.fieldData || {};
    
    return {
        id: webflowItem.id,
        slug: fieldData.slug,
        name: fieldData.name,
        world: getWorldName(fieldData.world),
        dynamicQR: fieldData['dynamic-qr'] || false,
        templatePdfUrl: fieldData['file']?.url || null,
        staticPdfUrl: fieldData['static-pdf']?.url || null
    };
}

/**
 * Get world name from world ID
 */
function getWorldName(worldId) {
    const WORLD_ID_MAP = {
        '0cf56f86b166aa623329b5f8d4b2cfab': 'neighborhood',
        'b8b1f1d1a4ec9f8b3522c4202ae44223': 'amusement-park', 
        '9de7ec84974d0fd5377dc044cdf90677': 'waterpark',
        '297751f8ebde13753af8e7508ab39fc0': 'big-city',
        '3b1ea852faa84905441ba211ffcfde47': 'shopping-spree',
        '2706219f5b529481804b4e24ff1d88aa': 'spookyland'
    };
    
    return WORLD_ID_MAP[worldId] || worldId;
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
    // Set CORS headers
    const corsHandler = setCorsHeaders(res, ['GET', 'OPTIONS']);
    corsHandler(req);
    
    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only accept GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { collection, item, lang = 'en' } = req.query;
        
        console.log(`📋 Cache API request: collection=${collection}, item=${item}, lang=${lang}`);
        
        let result;
        
        if (collection === 'workbooks') {
            // Return all workbook items
            result = await getCachedCollectionItems(lang);
            
            res.json({
                success: true,
                data: result,
                cached: true,
                count: result.length,
                language: lang,
                timestamp: new Date().toISOString()
            });
            
        } else if (item) {
            // Return specific item
            result = await getCachedItem(item, lang);
            
            if (!result) {
                return res.status(404).json({
                    success: false,
                    error: 'Item not found',
                    item,
                    language: lang
                });
            }
            
            res.json({
                success: true,
                data: result,
                cached: true,
                language: lang,
                timestamp: new Date().toISOString()
            });
            
        } else {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: collection or item',
                usage: {
                    collection: '/api/cms-cache?collection=workbooks&lang=en',
                    item: '/api/cms-cache?item=lesson-1&lang=pl'
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Cache API error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}

/**
 * Cache statistics endpoint
 */
export function getCacheStats() {
    return {
        size: webflowCache.size,
        keys: Array.from(webflowCache.keys()),
        memory: process.memoryUsage()
    };
}
