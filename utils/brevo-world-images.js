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
      imageUrl: 'https://img.mailinblue.com/XXXXXX/spookyland-pl.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Straszny Park - świat Halloween pełen duchów i potworów',
      displayName: 'Straszny Park'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/XXXXXX/spookyland-en.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Spookyland - Halloween world full of ghosts and monsters',
      displayName: 'Spookyland'
    }
  },
  
  'waterpark': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/XXXXXX/waterpark-pl.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Aquapark - świat wodnych zabaw i zjeżdżalni',
      displayName: 'Aquapark'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/XXXXXX/waterpark-en.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Waterpark - world of water fun and slides',
      displayName: 'Waterpark'
    }
  },
  
  'shopping-spree': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/XXXXXX/shopping-spree-pl.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Szaleństwo Zakupów - świat sklepów i centrum handlowych',
      displayName: 'Szaleństwo Zakupów'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/XXXXXX/shopping-spree-en.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Shopping Spree - world of stores and shopping centers',
      displayName: 'Shopping Spree'
    }
  },
  
  'amusement-park': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/XXXXXX/amusement-park-pl.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Park Rozrywki - świat karuzel, kolejek górskich i zabawy',
      displayName: 'Park Rozrywki'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/XXXXXX/amusement-park-en.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Amusement Park - world of carousels, roller coasters and fun',
      displayName: 'Amusement Park'
    }
  },
  
  'big-city': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/XXXXXX/big-city-pl.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Wielkie Miasto - świat drapaczy chmur i miejskiego życia',
      displayName: 'Wielkie Miasto'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/XXXXXX/big-city-en.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Big City - world of skyscrapers and urban life',
      displayName: 'Big City'
    }
  },
  
  'neighborhood': {
    pl: {
      imageUrl: 'https://img.mailinblue.com/XXXXXX/neighborhood-pl.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Sąsiedztwo - świat domów, ulic i lokalnej społeczności',
      displayName: 'Sąsiedztwo'
    },
    en: {
      imageUrl: 'https://img.mailinblue.com/XXXXXX/neighborhood-en.png', // REPLACE: Upload to Brevo and paste URL
      alt: 'Neighborhood - world of houses, streets and local community',
      displayName: 'Neighborhood'
    }
  }
};

// ===== FALLBACK CONFIGURATION =====
const FALLBACK_IMAGE = {
  pl: {
    imageUrl: 'https://img.mailinblue.com/XXXXXX/default-world-pl.png', // REPLACE: Upload default image to Brevo
    alt: 'Hey Feelings - świat emocji i nauki',
    displayName: 'Hey Feelings'
  },
  en: {
    imageUrl: 'https://img.mailinblue.com/XXXXXX/default-world-en.png', // REPLACE: Upload default image to Brevo
    alt: 'Hey Feelings - world of emotions and learning',
    displayName: 'Hey Feelings'
  }
};

/**
 * Get world image data for email templates
 * @param {string} world - World name (e.g., 'spookyland')
 * @param {string} language - Language code ('pl' or 'en')
 * @returns {Object} Image data with URL, alt text, and display name
 */
export function getWorldImageData(world, language = 'en') {
  // Validate language
  const lang = ['pl', 'en'].includes(language) ? language : 'en';
  
  // Get world configuration
  const worldConfig = WORLD_IMAGES_CONFIG[world];
  
  if (!worldConfig || !worldConfig[lang]) {
    console.warn(`⚠️ No image configuration found for world "${world}" in language "${lang}", using fallback`);
    return {
      worldImageUrl: FALLBACK_IMAGE[lang].imageUrl,
      worldImageAlt: FALLBACK_IMAGE[lang].alt,
      worldName: FALLBACK_IMAGE[lang].displayName,
      isSuccess: false,
      warning: `Missing configuration for ${world}_${lang}`
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