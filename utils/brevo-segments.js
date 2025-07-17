/**
 * utils/brevo-segments.js - Brevo Segmentation Configuration
 * 
 * PURPOSE: Define Brevo segments/lists mapping to Memberstack plans for targeted campaigns
 * DEPENDENCIES: Memberstack plan configuration from config.js
 * 
 * SEGMENTATION STRATEGY:
 * - Each user belongs to ONE specific plan segment (mutually exclusive)
 * - Users also belong to hierarchical category segments (parents/educators/therapists)
 * - Tags can overlap and provide additional targeting options
 * - Attributes store detailed user information for personalization
 * 
 * SEGMENT HIERARCHY:
 * - Plan-specific segments (EDUCATORS_PLAN_SCHOOL_BUNDLE)
 * - Category segments (EDUCATORS_ALL, EDUCATORS_FREE, EDUCATORS_PAID)
 * - Cross-category segments (ALL_USERS, ALL_FREE, ALL_PAID)
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Implementation Ready
 */

// ===== BREVO SEGMENTS/LISTS (Mutually Exclusive) =====
// Real Brevo segment IDs configured in production (January 2025)
export const BREVO_SEGMENTS = {
  // === PARENTS ===
  PARENTS_ALL: 2,                       // All parents across all plans
  PARENTS_FREE: 3,                      // Parents with free plans only
  PARENTS_PAID: 4,                      // Parents with paid plans only (future)
  PARENTS_PLAN_FREE: 5,                 // pln_parents-y1ea03qk
  
  // === EDUCATORS ===
  EDUCATORS_ALL: 6,                     // All educators across all plans
  EDUCATORS_FREE: 7,                    // Educators with free plans only
  EDUCATORS_PAID: 8,                    // Educators with paid plans only
  EDUCATORS_PLAN_FREE: 9,               // pln_free-plan-dhnb0ejd
  EDUCATORS_PLAN_FREE_PROMO: 11,        // pln_educators-free-promo-ebfw0xzj (ID #10 missing - deleted segment)
  EDUCATORS_PLAN_SCHOOL_BUNDLE: 12,     // pln_educators-school-bundle-monthly-jqo20xap
  EDUCATORS_PLAN_SINGLE_CLASSROOM: 13,  // pln_educators-single-classroom-monthly-lkhq021n
  
  // === THERAPISTS ===
  THERAPISTS_ALL: 14,                   // All therapists across all plans
  THERAPISTS_FREE: 15,                  // Therapists with free plans only
  THERAPISTS_PAID: 16,                  // Therapists with paid plans only
  THERAPISTS_PLAN_FREE: 17,             // pln_therapists-free-t7k40ii1
  THERAPISTS_PLAN_FREE_PROMO: 18,       // pln_therapists-free-promo-i2kz0huu
  THERAPISTS_PLAN_SINGLE_PRACTICE: 19,  // pln_therapists-single-practice-juk60iii
  
  // === CROSS-CATEGORY ===
  ALL_USERS: 20,                        // All users across all categories
  ALL_FREE: 21,                         // All users with free plans
  ALL_PAID: 22                          // All users with paid plans
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

// ===== PLAN TO SEGMENTS MAPPING =====
export const PLAN_TO_SEGMENTS_MAP = {
  // === PARENTS ===
  'pln_parents-y1ea03qk': {
    category: 'parents',
    isPaid: false,
    primarySegment: BREVO_SEGMENTS.PARENTS_PLAN_FREE,
    categorySegments: [
      BREVO_SEGMENTS.PARENTS_ALL,
      BREVO_SEGMENTS.PARENTS_FREE,
      BREVO_SEGMENTS.ALL_USERS,
      BREVO_SEGMENTS.ALL_FREE
    ],
    tags: [BREVO_TAGS.PARENT, BREVO_TAGS.FREE_PLAN],
    attributes: {
      USER_CATEGORY: 'parents',
      PLAN_TYPE: 'free',
      PLAN_NAME: 'Parents Free',
      PLAN_ID: 'pln_parents-y1ea03qk'
    }
  },
  
  // === EDUCATORS ===
  'pln_free-plan-dhnb0ejd': {
    category: 'educators',
    isPaid: false,
    primarySegment: BREVO_SEGMENTS.EDUCATORS_PLAN_FREE,
    categorySegments: [
      BREVO_SEGMENTS.EDUCATORS_ALL,
      BREVO_SEGMENTS.EDUCATORS_FREE,
      BREVO_SEGMENTS.ALL_USERS,
      BREVO_SEGMENTS.ALL_FREE
    ],
    tags: [BREVO_TAGS.EDUCATOR, BREVO_TAGS.FREE_PLAN],
    attributes: {
      USER_CATEGORY: 'educators',
      PLAN_TYPE: 'free',
      PLAN_NAME: 'Educators Free',
      PLAN_ID: 'pln_free-plan-dhnb0ejd'
    }
  },
  
  'pln_educators-free-promo-ebfw0xzj': {
    category: 'educators',
    isPaid: false,
    primarySegment: BREVO_SEGMENTS.EDUCATORS_PLAN_FREE_PROMO,
    categorySegments: [
      BREVO_SEGMENTS.EDUCATORS_ALL,
      BREVO_SEGMENTS.EDUCATORS_FREE,
      BREVO_SEGMENTS.ALL_USERS,
      BREVO_SEGMENTS.ALL_FREE
    ],
    tags: [BREVO_TAGS.EDUCATOR, BREVO_TAGS.FREE_PLAN],
    attributes: {
      USER_CATEGORY: 'educators',
      PLAN_TYPE: 'free',
      PLAN_NAME: 'Educators Free Promo',
      PLAN_ID: 'pln_educators-free-promo-ebfw0xzj'
    }
  },
  
  'pln_educators-school-bundle-monthly-jqo20xap': {
    category: 'educators',
    isPaid: true,
    primarySegment: BREVO_SEGMENTS.EDUCATORS_PLAN_SCHOOL_BUNDLE,
    categorySegments: [
      BREVO_SEGMENTS.EDUCATORS_ALL,
      BREVO_SEGMENTS.EDUCATORS_PAID,
      BREVO_SEGMENTS.ALL_USERS,
      BREVO_SEGMENTS.ALL_PAID
    ],
    tags: [BREVO_TAGS.EDUCATOR, BREVO_TAGS.PAID_PLAN],
    attributes: {
      USER_CATEGORY: 'educators',
      PLAN_TYPE: 'paid',
      PLAN_NAME: 'Educators School Bundle',
      PLAN_ID: 'pln_educators-school-bundle-monthly-jqo20xap'
    }
  },
  
  'pln_educators-single-classroom-monthly-lkhq021n': {
    category: 'educators',
    isPaid: true,
    primarySegment: BREVO_SEGMENTS.EDUCATORS_PLAN_SINGLE_CLASSROOM,
    categorySegments: [
      BREVO_SEGMENTS.EDUCATORS_ALL,
      BREVO_SEGMENTS.EDUCATORS_PAID,
      BREVO_SEGMENTS.ALL_USERS,
      BREVO_SEGMENTS.ALL_PAID
    ],
    tags: [BREVO_TAGS.EDUCATOR, BREVO_TAGS.PAID_PLAN],
    attributes: {
      USER_CATEGORY: 'educators',
      PLAN_TYPE: 'paid',
      PLAN_NAME: 'Educators Single Classroom',
      PLAN_ID: 'pln_educators-single-classroom-monthly-lkhq021n'
    }
  },
  
  // === THERAPISTS ===
  'pln_therapists-free-t7k40ii1': {
    category: 'therapists',
    isPaid: false,
    primarySegment: BREVO_SEGMENTS.THERAPISTS_PLAN_FREE,
    categorySegments: [
      BREVO_SEGMENTS.THERAPISTS_ALL,
      BREVO_SEGMENTS.THERAPISTS_FREE,
      BREVO_SEGMENTS.ALL_USERS,
      BREVO_SEGMENTS.ALL_FREE
    ],
    tags: [BREVO_TAGS.THERAPIST, BREVO_TAGS.FREE_PLAN],
    attributes: {
      USER_CATEGORY: 'therapists',
      PLAN_TYPE: 'free',
      PLAN_NAME: 'Therapists Free',
      PLAN_ID: 'pln_therapists-free-t7k40ii1'
    }
  },
  
  'pln_therapists-free-promo-i2kz0huu': {
    category: 'therapists',
    isPaid: false,
    primarySegment: BREVO_SEGMENTS.THERAPISTS_PLAN_FREE_PROMO,
    categorySegments: [
      BREVO_SEGMENTS.THERAPISTS_ALL,
      BREVO_SEGMENTS.THERAPISTS_FREE,
      BREVO_SEGMENTS.ALL_USERS,
      BREVO_SEGMENTS.ALL_FREE
    ],
    tags: [BREVO_TAGS.THERAPIST, BREVO_TAGS.FREE_PLAN],
    attributes: {
      USER_CATEGORY: 'therapists',
      PLAN_TYPE: 'free',
      PLAN_NAME: 'Therapists Free Promo',
      PLAN_ID: 'pln_therapists-free-promo-i2kz0huu'
    }
  },
  
  'pln_therapists-single-practice-juk60iii': {
    category: 'therapists',
    isPaid: true,
    primarySegment: BREVO_SEGMENTS.THERAPISTS_PLAN_SINGLE_PRACTICE,
    categorySegments: [
      BREVO_SEGMENTS.THERAPISTS_ALL,
      BREVO_SEGMENTS.THERAPISTS_PAID,
      BREVO_SEGMENTS.ALL_USERS,
      BREVO_SEGMENTS.ALL_PAID
    ],
    tags: [BREVO_TAGS.THERAPIST, BREVO_TAGS.PAID_PLAN],
    attributes: {
      USER_CATEGORY: 'therapists',
      PLAN_TYPE: 'paid',
      PLAN_NAME: 'Therapists Single Practice',
      PLAN_ID: 'pln_therapists-single-practice-juk60iii'
    }
  }
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
  
  // Plan Information
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

// ===== UTILITY FUNCTIONS =====

/**
 * Get plan configuration by Memberstack plan ID
 * @param {string} planId - Memberstack plan ID
 * @returns {Object|null} Plan configuration or null if not found
 */
export function getPlanConfig(planId) {
  return PLAN_TO_SEGMENTS_MAP[planId] || null;
}

/**
 * Get all segments for a specific plan
 * @param {string} planId - Memberstack plan ID
 * @returns {Array} Array of segment IDs
 */
export function getSegmentsForPlan(planId) {
  const config = getPlanConfig(planId);
  if (!config) return [];
  
  return [config.primarySegment, ...config.categorySegments];
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
 * Get attributes for a specific plan
 * @param {string} planId - Memberstack plan ID
 * @returns {Object} Attributes object
 */
export function getAttributesForPlan(planId) {
  const config = getPlanConfig(planId);
  return config ? config.attributes : {};
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
  return Object.keys(PLAN_TO_SEGMENTS_MAP).filter(planId => {
    const config = PLAN_TO_SEGMENTS_MAP[planId];
    return config.category === category;
  });
}

/**
 * Get segment name by ID (for debugging/logging)
 * @param {number} segmentId - Brevo segment ID
 * @returns {string} Segment name or 'Unknown Segment'
 */
export function getSegmentName(segmentId) {
  const segmentEntry = Object.entries(BREVO_SEGMENTS).find(([name, id]) => id === segmentId);
  return segmentEntry ? segmentEntry[0] : 'Unknown Segment';
} 