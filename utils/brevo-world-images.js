/**
 * utils/brevo-world-images.js - Configuration for World-specific Images in Email Templates
 * 
 * PURPOSE: Centralized configuration for world images used in Brevo email templates
 * USAGE: Images uploaded to Brevo Media Library, URLs mapped per world + language
 * 
 * HOW TO USE:
 * 1. Upload images to Brevo Media Library (each world × 2 languages)
 * 2. Copy image URLs from Brevo and paste below
 * 3. Use getWorldImageData() in email API to get URLs for template params
 * 
 * TEMPLATE USAGE:
 * - {{params.worldImageUrl}} - Main world image
 * - {{params.worldImageAlt}} - Alt text for accessibility
 * - {{params.worldName}} - Human-readable world name
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Ready for Implementation
 */

// ===== WORLD IMAGES CONFIGURATION =====
export const WORLD_IMAGES_CONFIG = {
  'spookyland': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a0e0ec03072a1fa85842.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Kraina Strachu - świat Halloween pełen duchów i potworów',
      displayName: 'Kraina Strachu'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a0e0e4e4ea1a183ac37f.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Spookyland - Halloween world full of ghosts and monsters',
      displayName: 'Spookyland'
    }
  },
  
  'waterpark': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a0e0a931bca9947fb9da.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Park Wodny - świat wodnych zabaw i zjeżdżalni',
      displayName: 'Park Wodny'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a0e0a931bca9947fb9dc.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Waterpark - world of water fun and slides',
      displayName: 'Waterpark'
    }
  },
  
  'shopping-spree': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a0e0e4e4ea1a183ac380.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Szaleństwo Zakupowe - świat sklepów i centrum handlowych',
      displayName: 'Szaleństwo Zakupowe'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a0e031a9a1e0f502fa83.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Shopping Spree - world of stores and shopping centers',
      displayName: 'Shopping Spree'
    }
  },
  
  'amusement-park': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a0d7e4e4ea1a183ac37a.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Park Rozrywki - świat karuzel, kolejek górskich i zabawy',
      displayName: 'Park Rozrywki'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a0d7e4e4ea1a183ac37b.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Amusement Park - world of carousels, roller coasters and fun',
      displayName: 'Amusement Park'
    }
  },
  
  'big-city': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a0e0e4e4ea1a183ac37e.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Wielkie Miasto - świat drapaczy chmur i miejskiego życia',
      displayName: 'Wielkie Miasto'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a0e0ec03072a1fa85841.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Big City - world of skyscrapers and urban life',
      displayName: 'Big City'
    }
  },
  
  'neighborhood': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a0e0a931bca9947fb9db.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Nasze Sąsiedztwo - świat domów, ulic i lokalnej społeczności',
      displayName: 'Nasze Sąsiedztwo'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a0e0a931bca9947fb9d9.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Neighborhood - world of houses, streets and local community',
      displayName: 'Neighborhood'
    }
  }
};

// ===== FALLBACK CONFIGURATION =====
const FALLBACK_IMAGE = {
  pl: {
    imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a447ec03072a1fa859bb.png', // REPLACE: Upload default image to Brevo
    alt: 'Hey Feelings - świat emocji i nauki',
    displayName: 'Hey Feelings'
  },
  en: {
    imageUrl: 'https://img.mailinblue.com/9578092/images/content_library/original/6880a447e4e4ea1a183ac4f5.png', // REPLACE: Upload default image to Brevo
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
  
  // Normalize world name to match configuration
  const normalizedWorld = normalizeWorldName(world);
  console.log(`🌍 World normalization: "${world}" → "${normalizedWorld}"`);
  
  // Get world configuration
  const worldConfig = WORLD_IMAGES_CONFIG[normalizedWorld];
  
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