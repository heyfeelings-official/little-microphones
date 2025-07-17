/**
 * utils/brevo-contact-config.js - Brevo Contact Management Configuration
 * 
 * PURPOSE: Configure Brevo contact management with proper Lists + Attributes structure
 * DEPENDENCIES: Memberstack plan configuration from config.js
 * 
 * BREVO ARCHITECTURE:
 * - Lists: Static collections for organizing contacts (e.g., "Hey Feelings List #2")
 * - Segments: Dynamic filters created in Brevo Dashboard based on contact attributes
 * - Attributes: Contact data used for dynamic segmentation and personalization
 * 
 * INTEGRATION STRATEGY:
 * 1. All contacts → Main List #2 "Hey Feelings List"
 * 2. Set comprehensive contact attributes based on Memberstack data
 * 3. Create dynamic segments in Brevo Dashboard using attribute filters
 * 4. Use attributes for email template personalization
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.0.0 (Corrected Lists vs Segments architecture)
 * STATUS: Production Ready
 */

// ===== BREVO MAIN LIST =====
export const BREVO_MAIN_LIST = {
  HEY_FEELINGS_LIST: 2  // Main list for ALL contacts
};

// ===== BREVO TAGS (Can Overlap) =====
export const BREVO_TAGS = {
  // User Categories
  PARENT: 'Parent',
  EDUCATOR: 'Educator', 
  THERAPIST: 'Therapist',
  
  // Plan Types
  FREE_PLAN: 'Free Plan',
  PAID_PLAN: 'Paid Plan'
};

// ===== CONTACT ATTRIBUTES SCHEMA =====
export const BREVO_CONTACT_ATTRIBUTES = {
  // Basic Information
  FIRSTNAME: 'string',
  LASTNAME: 'string',
  PHONE: 'string',
  
  // Memberstack Integration
  MEMBERSTACK_ID: 'string',
  REGISTRATION_DATE: 'date',
  LAST_SYNC: 'date',
  
  // Plan Information (for dynamic segmentation)
  USER_CATEGORY: 'string',    // parents, educators, therapists
  PLAN_TYPE: 'string',        // free, paid
  PLAN_NAME: 'string',        // Human-readable plan name
  PLAN_ID: 'string',          // Memberstack plan ID
  
  // Organizational Data
  SCHOOL_NAME: 'string',      // School or organization name
  TEACHER_NAME: 'string',     // For teachers/therapists
  
  // School Information (for Educators)
  SCHOOL_SEARCH_INPUT: 'string',     // Original search input for school
  SCHOOL_ADDRESS: 'string',          // Full school address
  SCHOOL_CITY: 'string',             // School city
  SCHOOL_COUNTRY: 'string',          // School country
  SCHOOL_FACILITY_TYPE: 'string',    // Type of educational facility
  SCHOOL_LATITUDE: 'number',         // School GPS latitude
  SCHOOL_LONGITUDE: 'number',        // School GPS longitude
  SCHOOL_PHONE: 'string',            // School phone number
  SCHOOL_PLACE_ID: 'string',         // Google Places ID
  SCHOOL_PLACE_NAME: 'string',       // School place name (short)
  SCHOOL_RATING: 'number',           // School rating
  SCHOOL_STATE: 'string',            // School state/province
  SCHOOL_STREET_ADDRESS: 'string',   // School street address
  SCHOOL_WEBSITE: 'string',          // School website URL
  SCHOOL_ZIP: 'string',              // School ZIP/postal code
  
  // Professional Information (for Educators)
  EDUCATOR_ROLE: 'string',           // Principal, Teacher, Admin, etc.
  EDUCATOR_NO_CLASSES: 'number',     // Number of classes taught
  EDUCATOR_NO_KIDS: 'number',        // Number of children/students
  
  // Application-specific
  LMIDS: 'string',            // Comma-separated LMID list
  LANGUAGE_PREF: 'string'     // pl, en
};

// ===== PLAN TO ATTRIBUTES MAPPING =====
export const PLAN_TO_ATTRIBUTES_MAP = {
  // === PARENTS ===
  'pln_parents-y1ea03qk': {
    category: 'parents',
    isPaid: false,
    attributes: {
      USER_CATEGORY: 'parents',
      PLAN_TYPE: 'free',
      PLAN_NAME: 'Parents Free',
      PLAN_ID: 'pln_parents-y1ea03qk'
    },
    tags: [BREVO_TAGS.PARENT, BREVO_TAGS.FREE_PLAN]
  },
  
  // === EDUCATORS ===
  'pln_free-plan-dhnb0ejd': {
    category: 'educators',
    isPaid: false,
    attributes: {
      USER_CATEGORY: 'educators',
      PLAN_TYPE: 'free',
      PLAN_NAME: 'Educators Free',
      PLAN_ID: 'pln_free-plan-dhnb0ejd'
    },
    tags: [BREVO_TAGS.EDUCATOR, BREVO_TAGS.FREE_PLAN]
  },
  
  'pln_educators-free-promo-ebfw0xzj': {
    category: 'educators',
    isPaid: false,
    attributes: {
      USER_CATEGORY: 'educators',
      PLAN_TYPE: 'free',
      PLAN_NAME: 'Educators Free Promo',
      PLAN_ID: 'pln_educators-free-promo-ebfw0xzj'
    },
    tags: [BREVO_TAGS.EDUCATOR, BREVO_TAGS.FREE_PLAN]
  },
  
  'pln_educators-school-bundle-monthly-jqo20xap': {
    category: 'educators',
    isPaid: true,
    attributes: {
      USER_CATEGORY: 'educators',
      PLAN_TYPE: 'paid',
      PLAN_NAME: 'Educators School Bundle',
      PLAN_ID: 'pln_educators-school-bundle-monthly-jqo20xap'
    },
    tags: [BREVO_TAGS.EDUCATOR, BREVO_TAGS.PAID_PLAN]
  },
  
  'pln_educators-single-classroom-monthly-lkhq021n': {
    category: 'educators',
    isPaid: true,
    attributes: {
      USER_CATEGORY: 'educators',
      PLAN_TYPE: 'paid',
      PLAN_NAME: 'Educators Single Classroom',
      PLAN_ID: 'pln_educators-single-classroom-monthly-lkhq021n'
    },
    tags: [BREVO_TAGS.EDUCATOR, BREVO_TAGS.PAID_PLAN]
  },
  
  // === THERAPISTS ===
  'pln_therapists-free-t7k40ii1': {
    category: 'therapists',
    isPaid: false,
    attributes: {
      USER_CATEGORY: 'therapists',
      PLAN_TYPE: 'free',
      PLAN_NAME: 'Therapists Free',
      PLAN_ID: 'pln_therapists-free-t7k40ii1'
    },
    tags: [BREVO_TAGS.THERAPIST, BREVO_TAGS.FREE_PLAN]
  },
  
  'pln_therapists-free-promo-i2kz0huu': {
    category: 'therapists',
    isPaid: false,
    attributes: {
      USER_CATEGORY: 'therapists',
      PLAN_TYPE: 'free',
      PLAN_NAME: 'Therapists Free Promo',
      PLAN_ID: 'pln_therapists-free-promo-i2kz0huu'
    },
    tags: [BREVO_TAGS.THERAPIST, BREVO_TAGS.FREE_PLAN]
  },
  
  'pln_therapists-single-practice-juk60iii': {
    category: 'therapists',
    isPaid: true,
    attributes: {
      USER_CATEGORY: 'therapists',
      PLAN_TYPE: 'paid',
      PLAN_NAME: 'Therapists Single Practice',
      PLAN_ID: 'pln_therapists-single-practice-juk60iii'
    },
    tags: [BREVO_TAGS.THERAPIST, BREVO_TAGS.PAID_PLAN]
  }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Get plan configuration by Memberstack plan ID
 * @param {string} planId - Memberstack plan ID
 * @returns {Object|null} Plan configuration or null if not found
 */
export function getPlanConfig(planId) {
  return PLAN_TO_ATTRIBUTES_MAP[planId] || null;
}

/**
 * Get attributes for a specific plan
 * @param {string} planId - Memberstack plan ID
 * @returns {Object} Attributes object
 */
export function getAttributesForPlan(planId) {
  const config = getPlanConfig(planId);
  return config ? config.attributes : {};
}

/**
 * Get tags for a specific plan
 * @param {string} planId - Memberstack plan ID
 * @returns {Array} Array of tags
 */
export function getTagsForPlan(planId) {
  const config = getPlanConfig(planId);
  return config ? config.tags : [];
}

/**
 * Check if plan is a paid plan
 * @param {string} planId - Memberstack plan ID
 * @returns {boolean} True if paid plan
 */
export function isPaidPlan(planId) {
  const config = getPlanConfig(planId);
  return config ? config.isPaid : false;
}

/**
 * Get user category for plan
 * @param {string} planId - Memberstack plan ID
 * @returns {string} User category (parents, educators, therapists)
 */
export function getPlanCategory(planId) {
  const config = getPlanConfig(planId);
  return config ? config.category : 'unknown';
}

/**
 * Get all plans for a specific category
 * @param {string} category - User category (parents, educators, therapists)
 * @returns {Array} Array of plan IDs
 */
export function getPlansForCategory(category) {
  return Object.keys(PLAN_TO_ATTRIBUTES_MAP).filter(planId => {
    const config = PLAN_TO_ATTRIBUTES_MAP[planId];
    return config.category === category;
  });
}

// ===== DYNAMIC SEGMENT EXAMPLES =====
// These are created in Brevo Dashboard, not via API
export const SEGMENT_EXAMPLES = {
  PARENTS_FREE: 'USER_CATEGORY equals "parents" AND PLAN_TYPE equals "free"',
  EDUCATORS_PAID: 'USER_CATEGORY equals "educators" AND PLAN_TYPE equals "paid"',
  THERAPISTS_ALL: 'USER_CATEGORY equals "therapists"',
  SCHOOL_BUNDLE_USERS: 'PLAN_ID equals "pln_educators-school-bundle-monthly-jqo20xap"',
  LARGE_SCHOOLS: 'EDUCATOR_NO_KIDS greater than 100',
  POLISH_USERS: 'LANGUAGE_PREF equals "pl"',
  WARSAW_SCHOOLS: 'SCHOOL_CITY equals "Warsaw"'
};

/**
 * Generate segment filter suggestion for Brevo Dashboard
 * @param {string} category - User category
 * @param {string} planType - Plan type (free/paid)
 * @returns {string} Filter suggestion
 */
export function generateSegmentFilter(category, planType = null) {
  let filter = `USER_CATEGORY equals "${category}"`;
  if (planType) {
    filter += ` AND PLAN_TYPE equals "${planType}"`;
  }
  return filter;
} 