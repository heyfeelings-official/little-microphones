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

// NO CACHE - Always fetch fresh data from Webflow API

// World ID to name mapping (based on your Webflow CMS Option field)
const WORLD_ID_MAP = {
    '2706219f5b529481804b4e24ff1d88aa': 'spookyland',
    // TODO: Add remaining world IDs from Webflow API responses:
    // Look for these world names in logs and add their IDs:
    // - waterpark
    // - shopping-spree  
    // - amusement-park
    // - big-city
    // - neighborhood
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
    
    // Debug: log field data using EXACT Webflow field names
    console.log('🔍 Mapping Webflow fields for:', fieldData['Slug'] || fieldData.slug, '- World ID:', fieldData['World'], '→', WORLD_ID_MAP[fieldData['World']] || 'unmapped');
    
    // Special logging for World ID mapping (easy to find in logs)
    if (fieldData['World'] && !WORLD_ID_MAP[fieldData['World']]) {
        console.log('🌍 WORLD_ID_NEEDED:', {
            slug: fieldData['Slug'] || fieldData.slug,
            worldId: fieldData['World'],
            worldName: 'UNKNOWN - ADD TO WORLD_ID_MAP'
        });
    }
    
    console.log('🔍 All available fields:', Object.keys(fieldData));
    console.log('🔍 Raw PDF field data (exact Webflow field names):', JSON.stringify({
        'Template PDF': fieldData['Template PDF'],    // Exact field name from Webflow CMS
        'Static PDF': fieldData['Static PDF'],        // Exact field name from Webflow CMS
        'Dynamic QR': fieldData['Dynamic QR'],        // Exact field name from Webflow CMS
        'World': fieldData['World'],                  // Exact field name from Webflow CMS
        'Name': fieldData['Name'],                    // Exact field name from Webflow CMS
        'Slug': fieldData['Slug']                     // Exact field name from Webflow CMS
    }, null, 2));
    
    return {
        id: webflowItem.id,
        slug: fieldData['Slug'] || fieldData.slug,                    // EXACT: "Slug" (Plain text)
        name: fieldData['Name'] || fieldData.name,                    // EXACT: "Name" (Plain text)
        world: WORLD_ID_MAP[fieldData['World']] || fieldData['World'] || fieldData.world,  // EXACT: "World" (Option)
        dynamicQR: fieldData['Dynamic QR'] || false,                  // EXACT: "Dynamic QR" (Switch)
        templatePdfUrl: getLanguageSpecificPdfUrl(fieldData, language),  // EXACT: "Template PDF" (File)
        staticPdfUrl: fieldData['Static PDF']?.url || null,          // EXACT: "Static PDF" (File)
        qrPosition: null,  // Not in CMS - remove old references
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
 * Get Template PDF URL from workbook item
 * @param {Object} item - Mapped workbook item
 * @returns {string|null} Template PDF URL or null
 */
export function getTemplatePdfUrl(item) {
    if (!item) return null;
    return item.templatePdfUrl;
}

/**
 * Get static PDF URL (for non-Dynamic QR items)
 * @param {Object} item - Mapped workbook item
 * @returns {string|null} Static PDF URL or null
 */
export function getStaticPdfUrl(item) {
    if (!item) return null;
    return item.staticPdfUrl;
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

// Cache functions removed - always fetch fresh data

/**
 * Get PDF URL from Webflow field data (localized content handled by Webflow API)
 * @param {Object} fieldData - Webflow field data
 * @param {string} language - Language code ('en' or 'pl')
 * @returns {string|null} PDF URL or null
 */
function getLanguageSpecificPdfUrl(fieldData, language) {
    // Use EXACT Webflow CMS field name from screenshot: "Template PDF" (File)
    const templateField = fieldData['Template PDF'];      // EXACT field name from Webflow CMS
    
    const templatePdf = templateField?.url || null;

    console.log(`🔍 Template PDF field search for ${language}:`, {
        'Template PDF': Boolean(fieldData['Template PDF']),    // EXACT field name
        foundUrl: templatePdf,
        isPDF: templatePdf ? templatePdf.includes('.pdf') : false,
        isImage: templatePdf ? (templatePdf.includes('.jpg') || templatePdf.includes('.jpeg') || templatePdf.includes('.png')) : false
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
