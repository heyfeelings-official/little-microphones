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
    try {
        // Use correct Webflow API v2 endpoint for site details (locales are in site object)
        const url = `${WEBFLOW_API_BASE}/sites/${SITE_ID}`;
        console.log('🌐 Fetching site details from Webflow API v2:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: getWebflowHeaders()
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Webflow Site API error:', response.status, errorText);
            throw new Error(`Webflow Site API error: ${response.status} ${response.statusText}`);
        }
        
        const siteData = await response.json();
        console.log('🔍 Site locales data:', JSON.stringify(siteData.locales, null, 2));
        
        const locales = { en: null, pl: null };
        
        // Parse locales from site data (based on documentation examples)
        if (siteData.locales) {
            // Primary locale (usually English)
            if (siteData.locales.primary) {
                locales.en = siteData.locales.primary.cmsLocaleId;
                console.log('🇬🇧 English (primary) locale ID:', siteData.locales.primary.cmsLocaleId);
            }
            
            // Secondary locales (look for Polish)
            if (siteData.locales.secondary && Array.isArray(siteData.locales.secondary)) {
                const polishLocale = siteData.locales.secondary.find(locale => 
                    locale.displayName?.toLowerCase().includes('polish') || 
                    locale.displayName?.toLowerCase().includes('pl') ||
                    locale.tag?.toLowerCase() === 'pl' ||
                    locale.subdirectory === '/pl'
                );
                
                if (polishLocale) {
                    locales.pl = polishLocale.cmsLocaleId;
                    console.log('🇵🇱 Polish (secondary) locale ID:', polishLocale.cmsLocaleId);
                }
            }
        }
        
        console.log('🌍 Final locale mapping:', locales);
        return locales;
        
    } catch (error) {
        console.error('❌ Error fetching locale IDs:', error);
        // Return empty locales on error
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
        
        // No cache - always fetch fresh data from Webflow API
        
        // Get locale IDs from site configuration
        const locales = await getLocaleIds();
        const localeId = locales[language];
        
        // Fetch all items from collection with correct cmsLocaleId (SINGULAR per Webflow docs)
        let url = `${WEBFLOW_API_BASE}/collections/${COLLECTION_ID}/items`;
        if (localeId) {
            url += `?cmsLocaleId=${localeId}`;  // SINGULAR form per Webflow API documentation
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
            const firstItemTemplate = firstItem.fieldData?.['template-pdf'] || firstItem.fieldData?.['Template PDF'];
            const firstItemPdf = firstItemTemplate?.url;
            console.log('🔍 Sample item Template PDF URL:', firstItemPdf);
            
            // Additional debug for localization
            if (language === 'pl' && firstItemPdf?.url) {
                const isPolishFile = firstItemPdf.url.includes('-pl') || firstItemPdf.url.includes('_pl');
                console.log(`🇵🇱 Polish PDF validation: ${isPolishFile ? '✅ CORRECT Polish file' : '❌ WRONG - Getting English file!'}`);
                if (!isPolishFile) {
                    console.error('⚠️ CRITICAL: Webflow API returned English PDF for Polish locale!');
                    console.log('Debug info:', { 
                        requestedLanguage: language, 
                        localeId, 
                        apiUrl: url,
                        receivedUrl: firstItemPdf.url 
                    });
                }
            }
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
    console.log('🔍 All available fields:', Object.keys(fieldData));
    console.log('🔍 Raw field data for ALL PDF-related fields:', JSON.stringify({
        'template-pdf': fieldData['template-pdf'],
        'Template PDF': fieldData['Template PDF'],
        'templatepdf': fieldData['templatepdf'],
        'file': fieldData.file,
        'File field': fieldData['file-field'] || fieldData['File field'],
        'pdf': fieldData.pdf,
        'PDF': fieldData.PDF,
        'base-pdf': fieldData['base-pdf'],
        'Base PDF': fieldData['Base PDF'],
        'workbook-pdf': fieldData['workbook-pdf'],
        'Workbook PDF': fieldData['Workbook PDF']
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
    // Try all possible field variations that might contain the PDF
    // Priority order: specific PDF fields first, then generic file fields
    const templateField = fieldData['template-pdf'] || 
                         fieldData['Template PDF'] || 
                         fieldData['templatepdf'] ||
                         fieldData['base-pdf'] ||
                         fieldData['Base PDF'] ||
                         fieldData['workbook-pdf'] ||
                         fieldData['Workbook PDF'] ||
                         fieldData['pdf'] ||
                         fieldData['PDF'] ||
                         fieldData['file'] ||           // Generic file field (could be image!)
                         fieldData['File field'];
    
    const templatePdf = templateField?.url || null;

    console.log(`🔍 Template PDF field search for ${language}:`, {
        'template-pdf': Boolean(fieldData['template-pdf']),
        'Template PDF': Boolean(fieldData['Template PDF']),
        'templatepdf': Boolean(fieldData['templatepdf']),
        'base-pdf': Boolean(fieldData['base-pdf']),
        'Base PDF': Boolean(fieldData['Base PDF']),
        'workbook-pdf': Boolean(fieldData['workbook-pdf']),
        'Workbook PDF': Boolean(fieldData['Workbook PDF']),
        'pdf': Boolean(fieldData['pdf']),
        'PDF': Boolean(fieldData['PDF']),
        'file': Boolean(fieldData['file']),
        'File field': Boolean(fieldData['File field']),
        foundUrl: templatePdf,
        isImage: templatePdf ? templatePdf.includes('.jpg') || templatePdf.includes('.jpeg') || templatePdf.includes('.png') : false
    });

    if (templatePdf) {
        // Check if it's an image file (not a PDF)
        const isImage = templatePdf.includes('.jpg') || templatePdf.includes('.jpeg') || templatePdf.includes('.png') || templatePdf.includes('.gif');
        
        if (isImage) {
            console.error('🚨 CRITICAL: Found IMAGE file instead of PDF!', {
                language,
                foundUrl: templatePdf,
                fileType: 'IMAGE',
                expectedType: 'PDF'
            });
            console.error('⚠️ Please check your Webflow CMS - the file field should contain a PDF, not an image!');
            return null; // Don't use image files as PDFs
        }

        console.log(`📄 Using Template PDF (${language}):`, templatePdf);

        // Validate language correctness for PL
        if (language === 'pl') {
            const looksPolish = /(^|[-_])pl(\.|-|_|$)/i.test(templatePdf);
            console.log(`🔍 Polish file validation: ${looksPolish ? '✅ CORRECT' : '❌ WRONG'} - File: ${templatePdf}`);
            
            if (!looksPolish) {
                console.error('🚨 CRITICAL: Polish locale returned non-Polish PDF!', {
                    language,
                    expectedPattern: 'should contain "pl"',
                    actualUrl: templatePdf
                });
            }
        } else if (language === 'en') {
            const looksEnglish = !/(^|[-_])pl(\.|-|_|$)/i.test(templatePdf);
            console.log(`🔍 English file validation: ${looksEnglish ? '✅ CORRECT' : '❌ WRONG'} - File: ${templatePdf}`);
        }
        
        return templatePdf;
    }

    console.error('⚠️ No Template PDF found for language:', language, 'Available fields:', Object.keys(fieldData));
    return null;
}
