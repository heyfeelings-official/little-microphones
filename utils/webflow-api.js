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

// Cache for locale IDs
let localeCache = null;

// Cache for Webflow items (5 minutes TTL)
const itemCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// World ID to name mapping (based on your Webflow CMS Option field)
const WORLD_ID_MAP = {
    '2706219f5b529481804b4e24ff1d88aa': 'spookyland',
    // Add more mappings as needed - you can find these IDs in Webflow API responses
};

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
 * Get locale IDs from Webflow site configuration
 * @returns {Promise<Object>} Object with locale mappings
 */
async function getLocaleIds() {
    // DISABLE CACHE - Always fetch fresh locale data
    console.log('🔄 Locale cache disabled - fetching fresh site data');
    
    try {
        const url = `${WEBFLOW_API_BASE}/sites/${SITE_ID}`;
        console.log('🌐 Fetching site details for locales:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: getWebflowHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Webflow Site API error: ${response.status} ${response.statusText}`);
        }
        
        const siteData = await response.json();
        const locales = {
            en: siteData.locale?.primary?.cmsLocaleId,
            pl: null
        };
        
        // Find Polish locale in secondary locales
        if (siteData.locale?.secondary) {
            console.log('🔍 All secondary locales:', siteData.locale.secondary.map(loc => ({
                id: loc.id,
                subdirectory: loc.subdirectory,
                cmsLocaleId: loc.cmsLocaleId
            })));
            
            const polishLocale = siteData.locale.secondary.find(loc => 
                loc.id === 'pl-PL' || loc.id === 'pl' || loc.subdirectory === '/pl' || loc.subdirectory === 'pl'
            );
            
            console.log('🇵🇱 Found Polish locale:', polishLocale);
            
            if (polishLocale) {
                locales.pl = polishLocale.cmsLocaleId;
            }
        }
        
        console.log('🌍 Found locale IDs:', locales);
        console.log('🔍 Site data structure:', {
            primary: siteData.locale?.primary,
            secondary: siteData.locale?.secondary?.map(loc => ({
                id: loc.id,
                subdirectory: loc.subdirectory,
                cmsLocaleId: loc.cmsLocaleId
            }))
        });
        
        // Additional debug: Show which locales are available
        if (locales.en && locales.pl) {
            console.log('✅ Both EN and PL locales configured correctly');
            console.log('🇬🇧 EN cmsLocaleId:', locales.en);
            console.log('🇵🇱 PL cmsLocaleId:', locales.pl);
        } else if (locales.en && !locales.pl) {
            console.log('⚠️ Only EN locale found, PL locale missing');
            console.log('🇬🇧 EN cmsLocaleId:', locales.en);
        } else if (!locales.en && locales.pl) {
            console.log('⚠️ Only PL locale found, EN locale missing');
            console.log('🇵🇱 PL cmsLocaleId:', locales.pl);
        } else {
            console.log('❌ No locales found in Webflow configuration');
        }
        
        // Don't cache - return fresh data
        return locales;
        
    } catch (error) {
        console.error('❌ Error fetching locale IDs:', error);
        // Fallback to no locale filtering
        return { en: null, pl: null };
    }
}

/**
 * Get workbook item from Webflow CMS by slug
 * @param {string} itemSlug - Workbook item slug
 * @param {string} language - Language code ('en' or 'pl')
 * @returns {Promise<Object|null>} Workbook item data or null if not found
 */
export async function getWebflowItem(itemSlug, language = 'en') {
    try {
        console.log('🔍 Fetching Webflow item:', itemSlug, 'Language:', language);
        
        // DISABLE CACHE - Always fetch fresh data from Webflow API
        console.log('🔄 Cache disabled - fetching fresh data from Webflow API');
        
        // Clear any existing cache entries to ensure fresh data
        const cacheKey = `webflow_item_${itemSlug}_${language}`;
        const oldEnKey = `webflow_item_${itemSlug}_en`;
        const oldPlKey = `webflow_item_${itemSlug}_pl`;
        
        if (itemCache.has(cacheKey)) {
            itemCache.delete(cacheKey);
            console.log('🗑️ Cleared existing cache for:', cacheKey);
        }
        if (itemCache.has(oldEnKey)) {
            itemCache.delete(oldEnKey);
            console.log('🗑️ Cleared English cache');
        }
        if (itemCache.has(oldPlKey)) {
            itemCache.delete(oldPlKey);
            console.log('🗑️ Cleared Polish cache');
        }
        
        // Get locale IDs from site configuration
        const locales = await getLocaleIds();
        const localeId = locales[language];
        
        // Fetch all items from collection with correct cmsLocaleId
        let url = `${WEBFLOW_API_BASE}/collections/${COLLECTION_ID}/items`;
        if (localeId) {
            url += `?cmsLocaleIds=${localeId}`;
            console.log('🌐 Fetching from Webflow API with locale:', url);
            console.log('🔍 Request details:', { language, localeId, collectionId: COLLECTION_ID });
        } else {
            console.log('🌐 Fetching from Webflow API (no locale):', url, 'Language:', language);
            console.log('⚠️ No locale ID found for language:', language);
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: getWebflowHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Webflow API error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`📋 Fetched ${result.items?.length || 0} items from Webflow collection (${language}, localeId: ${localeId || 'none'})`);
        
        // Debug: Log first item's Template PDF field to see what Webflow returns
        if (result.items && result.items.length > 0) {
            const firstItem = result.items[0];
            const firstItemPdf = firstItem.fieldData?.['template-pdf'] || firstItem.fieldData?.['Template PDF'] || firstItem.fieldData?.file;
            console.log('🔍 Sample item Template PDF URL:', firstItemPdf?.url);
        }
        
        // Find item by slug
        const item = result.items?.find(item => 
            item.fieldData?.slug === itemSlug || 
            item.fieldData?.['slug'] === itemSlug
        );
        
        if (!item) {
            console.log(`⚠️ Webflow item not found: ${itemSlug}`);
            console.log(`📋 Available items in collection:`, result.items?.map(i => i.fieldData?.slug || i.fieldData?.['slug']) || []);
            return null;
        }
        
        // Map Webflow fields to our structure
        const mappedItem = mapWebflowFields(item, language);
        
        // Cache the result
        // Don't cache - always use fresh data
        console.log('✅ Webflow item fetched (no cache):', itemSlug, 'Language:', language);
        return mappedItem;
        
    } catch (error) {
        console.error('❌ Error fetching Webflow item:', error);
        return null;
    }
}

/**
 * Map Webflow field names to internal structure
 * @param {Object} webflowItem - Raw Webflow item
 * @param {string} language - Language code ('en' or 'pl')
 * @returns {Object} Mapped item structure
 */
function mapWebflowFields(webflowItem, language = 'en') {
    const fieldData = webflowItem.fieldData || {};
    
    // Debug: log field data (remove after testing)
    console.log('🔍 Mapping Webflow fields for:', fieldData.slug, '- World ID:', fieldData.world, '→', WORLD_ID_MAP[fieldData.world] || 'unmapped');
    console.log('🔍 Raw Template PDF field data:', JSON.stringify({
        'template-pdf': fieldData['template-pdf'],
        'Template PDF': fieldData['Template PDF'],
        'file': fieldData.file
    }, null, 2));
    
    return {
        id: webflowItem.id,
        slug: fieldData.slug || fieldData['slug'],
        name: fieldData.name || fieldData['name'],
        world: WORLD_ID_MAP[fieldData.world] || fieldData.world || fieldData['world'],
        dynamicQR: fieldData['dynamic-qr'] || fieldData['dynamicQR'] || fieldData['Dynamic QR'] || false,
        basePdfUrl: getLanguageSpecificPdfUrl(fieldData, language),
        qrPosition: fieldData['qr-position'] || 
                   fieldData['QR position'] || 
                   fieldData['qrPosition'] || 
                   null,
        finalPdfLink: fieldData['final-pdf-link']?.url || 
                     fieldData['Final PDF Link']?.url || 
                     fieldData['finalPdfLink']?.url || 
                     null,
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

/**
 * Get PDF URL from Webflow field data (localized content handled by Webflow API)
 * @param {Object} fieldData - Webflow field data
 * @param {string} language - Language code ('en' or 'pl')
 * @returns {string|null} PDF URL or null
 */
function getLanguageSpecificPdfUrl(fieldData, language) {
    console.log('🔍 getLanguageSpecificPdfUrl called with:', { language });
    console.log('🔍 Available field data keys:', Object.keys(fieldData));
    console.log('🔍 Template PDF field raw data:', {
        'template-pdf': fieldData['template-pdf'],
        'Template PDF': fieldData['Template PDF'],
        'file': fieldData.file,
        'file-field': fieldData['file-field'],
        'File field': fieldData['File field'],
        'base-pdf': fieldData['base-pdf']
    });
    
    // Webflow localization automatically returns the correct content based on locale parameter
    // So we just need to check the standard Template PDF field
    const templatePdf = fieldData['template-pdf']?.url ||
                       fieldData['Template PDF']?.url ||
                       fieldData.file?.url ||
                       fieldData['file-field']?.url ||
                       fieldData['File field']?.url ||
                       fieldData['base-pdf']?.url;

    if (templatePdf) {
        console.log(`📄 Using localized Template PDF (${language}):`, templatePdf);

        // Additional debug: Check if this is the expected file for the language
        if (language === 'pl' && templatePdf) {
            const isPolishFile = templatePdf.includes('pl') || templatePdf.includes('polish') || templatePdf.includes('PL');
            console.log(`🔍 Polish file check: ${isPolishFile ? 'CORRECT' : 'WRONG'} - File: ${templatePdf}`);
        } else if (language === 'en' && templatePdf) {
            const isEnglishFile = !templatePdf.includes('pl') && !templatePdf.includes('polish');
            console.log(`🔍 English file check: ${isEnglishFile ? 'CORRECT' : 'WRONG'} - File: ${templatePdf}`);
        }
        return templatePdf;
    }

    console.log('⚠️ No Template PDF found for language:', language);
    return null;
}
