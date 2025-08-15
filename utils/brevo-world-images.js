/**
 * utils/brevo-world-images.js - Configuration for World-specific Images in Email Templates
 * 
 * PURPOSE: Centralized configuration for world images used in Brevo email templates
 * USAGE: Uses Brevo Media Library URLs for maximum deliverability and spam protection
 * 
 * DELIVERABILITY BENEFITS:
 * ✅ Same-domain delivery (img.mailinblue.com) - best spam protection
 * ✅ Automatic image tracking and analytics in Brevo Dashboard
 * ✅ Optimized for email clients and mobile devices
 * ✅ No external domain issues with corporate firewalls
 * 
 * TEMPLATE USAGE:
 * - {{params.worldImageUrl}} - World image from Brevo Media Library
 * - {{params.worldImageAlt}} - Alt text for accessibility
 * - {{params.worldName}} - Human-readable world name
 * 
 * IMAGE SOURCES:
 * All images uploaded to Brevo Media Library (Dashboard → Assets → Media Library)
 * Format: PNG optimized for email clients
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.0.0
 * STATUS: Production Ready ✅
 */

// ===== WORLD IMAGES CONFIGURATION =====
// All images from Brevo Media Library for maximum deliverability
export const WORLD_IMAGES_CONFIG = {
  'spookyland': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f254950b2bb414f3ce8d3.png',
      alt: 'Kraina Strachu - świat Halloween pełen duchów i potworów',
      displayName: 'Kraina Strachu'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f2549b36039f76506ed4d.png',
      alt: 'Spookyland - Halloween world full of ghosts and monsters',
      displayName: 'Spookyland'
    }
  },
  
  'waterpark': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f254950b2bb414f3ce8d0.png',
      alt: 'Park Wodny - świat wodnych zabaw i zjeżdżalni',
      displayName: 'Park Wodny'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f25499f18aca603274cb4.png',
      alt: 'Waterpark - world of water fun and slides',
      displayName: 'Waterpark'
    }
  },
  
  'shopping-spree': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f2549b36039f76506ed4f.png',
      alt: 'Szaleństwo Zakupowe - świat sklepów i centrum handlowych',
      displayName: 'Szaleństwo Zakupowe'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f25499f18aca603274cb5.png',
      alt: 'Shopping Spree - world of stores and shopping centers',
      displayName: 'Shopping Spree'
    }
  },
  
  'amusement-park': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f254950b2bb414f3ce8d1.png',
      alt: 'Park Rozrywki - świat karuzel, kolejek górskich i zabawy',
      displayName: 'Park Rozrywki'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f25494c43d784a80f4d66.png',
      alt: 'Amusement Park - world of carousels, roller coasters and fun',
      displayName: 'Amusement Park'
    }
  },
  
  'big-city': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f25499f18aca603274cb3.png',
      alt: 'Wielkie Miasto - świat drapaczy chmur i miejskiego życia',
      displayName: 'Wielkie Miasto'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f2549b36039f76506ed4e.png',
      alt: 'Big City - world of skyscrapers and urban life',
      displayName: 'Big City'
    }
  },
  
  'neighborhood': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f254950b2bb414f3ce8d2.png',
      alt: 'Nasze Sąsiedztwo - świat domów, ulic i lokalnej społeczności',
      displayName: 'Nasze Sąsiedztwo'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f2549fa7b47741e8e220b.png',
      alt: 'Neighborhood - world of houses, streets and local community',
      displayName: 'Neighborhood'
    }
  }
};

// ===== FALLBACK CONFIGURATION =====
const FALLBACK_IMAGE = {
  pl: {
    imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f25494c43d784a80f4d65.png',
    alt: 'Hey Feelings - świat emocji i nauki',
    displayName: 'Hey Feelings'
  },
  en: {
    imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/689f2549fa7b47741e8e220a.png',
    alt: 'Hey Feelings - world of emotions and learning',
    displayName: 'Hey Feelings'
  }
};

// ===== WORLD NAME NORMALIZATION =====
const WORLD_NAME_MAPPING = {
  // Handle different name formats from frontend/API calls
  'Shopping Spree': 'shopping-spree',
  'shopping spree': 'shopping-spree',
  'SHOPPING SPREE': 'shopping-spree',
  'shopping-spree': 'shopping-spree',
  
  'Amusement Park': 'amusement-park',
  'amusement park': 'amusement-park', 
  'AMUSEMENT PARK': 'amusement-park',
  'amusement-park': 'amusement-park',
  
  'Big City': 'big-city',
  'big city': 'big-city',
  'BIG CITY': 'big-city',
  'big-city': 'big-city',
  
  'Spookyland': 'spookyland',
  'spookyland': 'spookyland',
  'SPOOKYLAND': 'spookyland',
  
  'Waterpark': 'waterpark',
  'waterpark': 'waterpark',
  'WATERPARK': 'waterpark',
  'Water Park': 'waterpark',
  'water park': 'waterpark',
  
  'Neighborhood': 'neighborhood',
  'neighborhood': 'neighborhood',
  'NEIGHBORHOOD': 'neighborhood'
};

/**
 * Normalize world name to match configuration keys
 * @param {string} worldName - World name in any format
 * @returns {string} Normalized world name matching WORLD_IMAGES_CONFIG keys
 */
function normalizeWorldName(worldName) {
  if (!worldName) return null;
  
  // First try direct mapping
  if (WORLD_NAME_MAPPING[worldName]) {
    return WORLD_NAME_MAPPING[worldName];
  }
  
  // Try lowercase with spaces converted to hyphens
  const normalized = worldName.toLowerCase().replace(/\s+/g, '-');
  if (WORLD_IMAGES_CONFIG[normalized]) {
    console.log(`🔄 Auto-normalized "${worldName}" → "${normalized}"`);
    return normalized;
  }
  
  // If no match found, return original
  console.warn(`⚠️ Could not normalize world name: "${worldName}"`);
  return worldName;
}

/**
 * Get world image data for email templates
 * @param {string} world - World name (e.g., 'spookyland', 'Shopping Spree')
 * @param {string} language - Language code ('pl' or 'en')
 * @returns {Object} Image data with URL, alt text, and display name
 */
export function getWorldImageData(world, language = 'en') {
  // Validate language
  const lang = ['pl', 'en'].includes(language) ? language : 'en';
  console.log(`🖼️ [getWorldImageData] Input: world="${world}", language="${language}" → lang="${lang}"`);
  
  // Normalize world name to match configuration
  const normalizedWorld = normalizeWorldName(world);
  console.log(`🌍 World normalization: "${world}" → "${normalizedWorld}"`);
  
  // Get world configuration
  const worldConfig = WORLD_IMAGES_CONFIG[normalizedWorld];
  console.log(`🔍 [getWorldImageData] World config found: ${worldConfig ? 'YES' : 'NO'}`);
  console.log(`🔍 [getWorldImageData] Language config for "${lang}": ${worldConfig && worldConfig[lang] ? 'YES' : 'NO'}`);
  
  if (!worldConfig || !worldConfig[lang]) {
    console.warn(`⚠️ No image configuration found for world "${normalizedWorld}" (original: "${world}") in language "${lang}", using fallback`);
    return {
      worldImageUrl: FALLBACK_IMAGE[lang].imageUrl,
      worldImageAlt: FALLBACK_IMAGE[lang].alt,
      worldName: FALLBACK_IMAGE[lang].displayName,
      isSuccess: false,
      warning: `Missing configuration for ${normalizedWorld}_${lang} (original: ${world})`
    };
  }
  
  return {
    worldImageUrl: worldConfig[lang].imageUrl,
    worldImageAlt: worldConfig[lang].alt,
    worldName: worldConfig[lang].displayName,
    isSuccess: true
  };
}

/**
 * Get all available worlds with their image data
 * @param {string} language - Language code ('pl' or 'en')
 * @returns {Array} Array of world objects with image data
 */
export function getAllWorldsImageData(language = 'en') {
  const lang = ['pl', 'en'].includes(language) ? language : 'en';
  
  return Object.keys(WORLD_IMAGES_CONFIG).map(world => ({
    worldId: world,
    ...getWorldImageData(world, lang)
  }));
}

/**
 * Validate that all world images are properly configured
 * @returns {Object} Validation result with missing configurations
 */
export function validateWorldImagesConfig() {
  const missing = [];
  const languages = ['pl', 'en'];
  
  Object.keys(WORLD_IMAGES_CONFIG).forEach(world => {
    languages.forEach(lang => {
      const config = WORLD_IMAGES_CONFIG[world]?.[lang];
      if (!config || !config.imageUrl || config.imageUrl.includes('XXXXXX')) {
        missing.push(`${world}_${lang}`);
      }
    });
  });
  
  return {
    isValid: missing.length === 0,
    missing: missing,
    totalExpected: Object.keys(WORLD_IMAGES_CONFIG).length * 2,
    totalConfigured: Object.keys(WORLD_IMAGES_CONFIG).length * 2 - missing.length
  };
} 