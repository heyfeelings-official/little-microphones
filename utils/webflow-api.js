/**
 * utils/webflow-api.js - Webflow CMS API Integration
 * 
 * PURPOSE: Centralized Webflow CMS operations for workbooks collection
 * DEPENDENCIES: Webflow API v2
 * 
 * EXPORTED FUNCTIONS:
 * - getWebflowItem(): Get workbook item by slug from CMS
 * - checkDynamicQR(): Check if item has Dynamic QR enabled
 * - getBasePdfUrl(): Get Base PDF URL from item
 * - mapWebflowFields(): Map Webflow field names to internal structure
 * 
 * ENVIRONMENT VARIABLES REQUIRED:
 * - WEBFLOW_API_TOKEN: Webflow API access token
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Production Ready ✅
 */

// Webflow configuration
const WEBFLOW_API_BASE = 'https://api.webflow.com/v2';
const SITE_ID = '67e5317b686eccb10a95be01';
const COLLECTION_ID = '689a16dd10cb6df7ff0094a0';

// Cache for Webflow items (5 minutes TTL)
const itemCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get Webflow API headers with authentication
 * @returns {Object} Headers object
 */
function getWebflowHeaders() {
    const token = process.env.WEBFLOW_API_TOKEN;
    if (!token) {
        throw new Error('WEBFLOW_API_TOKEN environment variable is required');
    }
    
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
}

/**
 * Get workbook item from Webflow CMS by slug
 * @param {string} itemSlug - Workbook item slug
 * @returns {Promise<Object|null>} Workbook item data or null if not found
 */
export async function getWebflowItem(itemSlug) {
    try {
        console.log('🔍 Fetching Webflow item:', itemSlug);
        
        // Check cache first
        const cacheKey = `webflow_item_${itemSlug}`;
        const cached = itemCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            console.log('📋 Using cached Webflow item:', itemSlug);
            return cached.data;
        }
        
        // Fetch all items from collection (Webflow API doesn't support direct slug lookup)
        const url = `${WEBFLOW_API_BASE}/collections/${COLLECTION_ID}/items`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getWebflowHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Webflow API error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`📋 Fetched ${result.items?.length || 0} items from Webflow collection`);
        
        // Find item by slug
        const item = result.items?.find(item => 
            item.fieldData?.slug === itemSlug || 
            item.fieldData?.['slug'] === itemSlug
        );
        
        if (!item) {
            console.log(`⚠️ Webflow item not found: ${itemSlug}`);
            return null;
        }
        
        // Map Webflow fields to our structure
        const mappedItem = mapWebflowFields(item);
        
        // Cache the result
        itemCache.set(cacheKey, {
            data: mappedItem,
            timestamp: Date.now()
        });
        
        console.log('✅ Webflow item fetched and cached:', itemSlug);
        return mappedItem;
        
    } catch (error) {
        console.error('❌ Error fetching Webflow item:', error);
        return null;
    }
}

/**
 * Map Webflow field names to internal structure
 * @param {Object} webflowItem - Raw Webflow item
 * @returns {Object} Mapped item structure
 */
function mapWebflowFields(webflowItem) {
    const fieldData = webflowItem.fieldData || {};
    
    return {
        id: webflowItem.id,
        slug: fieldData.slug || fieldData['slug'],
        name: fieldData.name || fieldData['name'],
        world: fieldData.world || fieldData['world'],
        dynamicQR: fieldData['dynamic-qr'] || fieldData['dynamicQR'] || false,
        basePdfUrl: fieldData['file-field']?.url || fieldData['base-pdf']?.url || null,
        qrPosition: fieldData['qr-position'] || fieldData['qrPosition'] || null,
        finalPdfLink: fieldData['final-pdf-link']?.url || fieldData['finalPdfLink']?.url || null,
        // Store original field data for debugging
        _originalFields: fieldData
    };
}

/**
 * Check if workbook item has Dynamic QR enabled
 * @param {Object} item - Mapped workbook item
 * @returns {boolean} True if Dynamic QR is enabled
 */
export function checkDynamicQR(item) {
    if (!item) return false;
    return Boolean(item.dynamicQR);
}

/**
 * Get Base PDF URL from workbook item
 * @param {Object} item - Mapped workbook item
 * @returns {string|null} Base PDF URL or null
 */
export function getBasePdfUrl(item) {
    if (!item) return null;
    return item.basePdfUrl;
}

/**
 * Get final PDF link (for non-Dynamic QR items)
 * @param {Object} item - Mapped workbook item
 * @returns {string|null} Final PDF link or null
 */
export function getFinalPdfLink(item) {
    if (!item) return null;
    return item.finalPdfLink;
}

/**
 * Get QR position configuration from item
 * @param {Object} item - Mapped workbook item
 * @returns {Object|null} QR position config or null
 */
export function getQrPosition(item) {
    if (!item || !item.qrPosition) return null;
    
    try {
        // Try to parse as JSON
        return JSON.parse(item.qrPosition);
    } catch (error) {
        console.warn('⚠️ Invalid QR position JSON:', item.qrPosition);
        return null;
    }
}

/**
 * Clear Webflow item cache
 * @param {string} itemSlug - Optional specific item to clear, or all if not provided
 */
export function clearWebflowCache(itemSlug = null) {
    if (itemSlug) {
        const cacheKey = `webflow_item_${itemSlug}`;
        itemCache.delete(cacheKey);
        console.log('🗑️ Cleared Webflow cache for:', itemSlug);
    } else {
        itemCache.clear();
        console.log('🗑️ Cleared all Webflow cache');
    }
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export function getWebflowCacheStats() {
    return {
        size: itemCache.size,
        keys: Array.from(itemCache.keys())
    };
}
