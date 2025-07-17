/**
 * utils/brevo-contact-manager.js - Brevo Contact Management using native HTTP requests
 * 
 * PURPOSE: Centralized contact management for Brevo integration without SDK
 * DEPENDENCIES: Node.js built-in https module
 * 
 * FUNCTIONS:
 * - syncMemberToBrevo(): Complete member synchronization
 * - createOrUpdateBrevoContact(): Create or update contact
 * - getBrevoContact(): Retrieve contact data
 * - addContactToMainList(): Add contact to main list
 * 
 * LAST UPDATED: January 2025
 * VERSION: 3.0.0 (Native HTTP requests)
 * STATUS: Production Ready
 */

import https from 'https';
import { 
  PLAN_TO_ATTRIBUTES_MAP, 
  BREVO_CONTACT_ATTRIBUTES,
  BREVO_MAIN_LIST,
  getPlanConfig,
  getTagsForPlan,
  getAttributesForPlan
} from './brevo-contact-config.js';

// ===== BREVO API CONFIGURATION =====
const BREVO_API_BASE = 'https://api.brevo.com/v3';

/**
 * Make HTTP request to Brevo API
 * @param {string} endpoint - API endpoint (e.g., '/contacts')
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} data - Request body data
 * @returns {Promise<Object>} Response data
 */
export async function makeBrevoRequest(endpoint, method = 'GET', data = null) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    throw new Error('BREVO_API_KEY not configured');
  }

  const fullUrl = BREVO_API_BASE + endpoint;
  const url = new URL(fullUrl);
  
  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method: method,
    headers: {
      'api-key': brevoApiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'Little-Microphones/1.0'
    }
  };

  if (data) {
    const jsonData = JSON.stringify(data);
    options.headers['Content-Length'] = Buffer.byteLength(jsonData);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonResponse = responseData ? JSON.parse(responseData) : {};
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonResponse);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${jsonResponse.message || 'Request failed'}`));
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// ===== CORE CONTACT OPERATIONS =====

/**
 * Get contact data from Brevo
 * @param {string} email - Contact email address
 * @returns {Promise<Object>} Contact data or null if not found
 */
export async function getBrevoContact(email) {
  try {
    const response = await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`);
    return response;
  } catch (error) {
    if (error.message.includes('404')) {
      return null; // Contact not found
    }
    throw error;
  }
}

/**
 * Create or update contact in Brevo
 * @param {Object} memberData - Member data from Memberstack
 * @param {Object} planConfig - Plan configuration
 * @returns {Promise<Object>} Operation result
 */
export async function createOrUpdateBrevoContact(memberData, planConfig) {
  const email = memberData.auth?.email || memberData.email;
  const syncId = Math.random().toString(36).substring(2, 15);
  
  console.log(`🔄 [${syncId}] Creating/updating Brevo contact: ${email}`);
  
  try {
    // Check if contact exists
    const existingContact = await getBrevoContact(email);
    
    // Get plan-specific attributes
    const planAttributes = getAttributesForPlan(planConfig.planId || planConfig.attributes?.PLAN_ID);
    
    // Map all member data to Brevo attributes
    const allAttributes = {
      // Plan-specific attributes
      ...planAttributes,
      
      // Basic contact information
      FIRSTNAME: memberData.customFields?.['first-name'] || '',
      LASTNAME: memberData.customFields?.['last-name'] || '',
      PHONE: memberData.customFields?.['phone'] || '',
      LANGUAGE_PREF: memberData.metaData?.language || 'en',
      
      // Memberstack integration
      MEMBERSTACK_ID: memberData.id || '',
      REGISTRATION_DATE: memberData.createdAt || new Date().toISOString(),
      LAST_SYNC: new Date().toISOString(),
      
      // Teacher/School name (general)
      TEACHER_NAME: memberData.customFields?.['teacher-name'] || 
                   `${memberData.customFields?.['first-name'] || ''} ${memberData.customFields?.['last-name'] || ''}`.trim(),
      SCHOOL_NAME: memberData.customFields?.['school-name'] || 
                   memberData.customFields?.['school'] || 
                   memberData.customFields?.['school-place-name'] || '',
      
      // School details (for Educators)
      SCHOOL_SEARCH_INPUT: memberData.customFields?.['school-search-input'] || memberData.customFields?.['search-input'] || '',
      SCHOOL_ADDRESS: memberData.customFields?.['school-address'] || 
                     memberData.customFields?.['school_address'] || 
                     memberData.customFields?.['school-address-result'] || '',
      SCHOOL_CITY: memberData.customFields?.['school-city'] || memberData.customFields?.['city'] || '',
      SCHOOL_COUNTRY: memberData.customFields?.['school-country'] || memberData.customFields?.['country'] || '',
      SCHOOL_FACILITY_TYPE: memberData.customFields?.['school-type'] || 
                           memberData.customFields?.['school_type'] || 
                           memberData.customFields?.['school-facility-type'] || '',
      SCHOOL_LATITUDE: String(memberData.customFields?.['school-latitude'] || memberData.customFields?.['school_latitude'] || ''),
      SCHOOL_LONGITUDE: String(memberData.customFields?.['school-longitude'] || memberData.customFields?.['school_longitude'] || ''),
      SCHOOL_PHONE: memberData.customFields?.['school-phone'] || memberData.customFields?.['school_phone'] || '',
      SCHOOL_PLACE_ID: memberData.customFields?.['school-place-id'] || memberData.customFields?.['school_place_id'] || '',
      SCHOOL_PLACE_NAME: memberData.customFields?.['school-place-name'] || memberData.customFields?.['school_place_name'] || '',
      SCHOOL_RATING: memberData.customFields?.['school-rating'] || memberData.customFields?.['school_rating'] || '',
      SCHOOL_STATE: memberData.customFields?.['school-state'] || memberData.customFields?.['school_state'] || '',
      SCHOOL_STREET_ADDRESS: memberData.customFields?.['school-street-address'] || memberData.customFields?.['school_street_address'] || '',
      SCHOOL_WEBSITE: memberData.customFields?.['school-website'] || memberData.customFields?.['school_website'] || '',
      SCHOOL_ZIP: memberData.customFields?.['school-zip'] || memberData.customFields?.['school_zip'] || '',
      
      // Professional information (for Educators)
      EDUCATOR_ROLE: memberData.customFields?.['role'] || memberData.customFields?.['educator-role'] || '',
      EDUCATOR_NO_CLASSES: memberData.customFields?.['no-classes'] || 
                           memberData.customFields?.['no_classes'] || 
                           memberData.customFields?.['educator-no-classes'] || '',
      EDUCATOR_NO_KIDS: memberData.customFields?.['no-kids'] || 
                        memberData.customFields?.['no_kids'] || 
                        memberData.customFields?.['educator-no-kids'] || '',
      
      // Application-specific
      LMIDS: memberData.metaData?.lmids || ''
    };
    
    // Clean up null/undefined values - Brevo doesn't like them
    const cleanedAttributes = {};
    Object.keys(allAttributes).forEach(key => {
      const value = allAttributes[key];
      if (value !== null && value !== undefined && value !== '') {
        cleanedAttributes[key] = value;
      }
    });
    
    // Prepare contact data
    const contactData = {
      email: email,
      attributes: cleanedAttributes,
      listIds: [BREVO_MAIN_LIST.HEY_FEELINGS_LIST], // Add to main list
      updateEnabled: true
    };

    let result;
    if (existingContact) {
      // Update existing contact
      result = await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`, 'PUT', contactData);
      console.log(`✅ [${syncId}] Updated existing contact: ${email}`);
    } else {
      // Create new contact
      result = await makeBrevoRequest('/contacts', 'POST', contactData);
      console.log(`✅ [${syncId}] Created new contact: ${email}`);
    }
    
    return { success: true, syncId, email, result };
    
  } catch (error) {
    console.error(`❌ [${syncId}] Error creating/updating contact ${email}:`, error.message);
    return { success: false, syncId, email, error: error.message };
  }
}

/**
 * Add contact to main list
 * @param {string} email - Contact email
 * @returns {Promise<Object>} Operation result
 */
export async function addContactToMainList(email) {
  try {
    const result = await makeBrevoRequest(`/contacts/lists/${BREVO_MAIN_LIST.HEY_FEELINGS_LIST}/contacts/add`, 'POST', {
      emails: [email]
    });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Synchronize member to Brevo
 * @param {Object} memberData - Member data from Memberstack
 * @returns {Promise<Object>} Synchronization result
 */
export async function syncMemberToBrevo(memberData) {
  const syncId = Math.random().toString(36).substring(2, 15);
  const email = memberData.auth?.email || memberData.email;
  
  console.log(`🔄 [${syncId}] Starting Brevo sync for ${email}`);
  
  try {
    // Get active plans
    const activePlans = memberData.planConnections?.filter(conn => conn.active && conn.status === 'ACTIVE') || [];
    
    if (activePlans.length === 0) {
      console.warn(`⚠️ [${syncId}] No active plans found for ${email}`);
      return { success: false, syncId, email, error: 'No active plans found' };
    }
    
    // Process first active plan
    const plan = activePlans[0];
    const planConfig = getPlanConfig(plan.planId);
    
    if (!planConfig) {
      console.warn(`⚠️ [${syncId}] Unknown plan ${plan.planId} for ${email}`);
      return { success: false, syncId, email, error: `Unknown plan: ${plan.planId}` };
    }
    
    console.log(`📋 [${syncId}] Syncing plan ${planConfig.attributes.PLAN_NAME} for ${email}`);
    
    // Create/update contact
    const contactResult = await createOrUpdateBrevoContact(memberData, planConfig);
    
    if (contactResult.success) {
      console.log(`✅ [${syncId}] Brevo sync completed successfully for ${email}`);
      return { success: true, syncId, email, contactResult };
    } else {
      console.error(`❌ [${syncId}] Brevo sync failed for ${email}: ${contactResult.error}`);
      return { success: false, syncId, email, error: contactResult.error };
    }
    
  } catch (error) {
    console.error(`❌ [${syncId}] Error in Brevo sync for ${email}:`, error.message);
    return { success: false, syncId, email, error: error.message };
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Test Brevo API connection
 * @returns {Promise<Object>} Connection test result
 */
export async function testBrevoConnection() {
  try {
    const result = await makeBrevoRequest('/account');
    return { success: true, account: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get contacts from Brevo
 * @param {number} limit - Number of contacts to retrieve
 * @returns {Promise<Object>} Contacts data
 */
export async function getBrevoContacts(limit = 10) {
  try {
    const result = await makeBrevoRequest(`/contacts?limit=${limit}`);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
} 