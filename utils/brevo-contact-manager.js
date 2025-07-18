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

import {
  BREVO_COMPANY_ATTRIBUTES,
  COMPANY_CONTACT_LINK,
  getCompanyAttributes,
  shouldLinkToCompany,
  getSchoolIdFromMember
} from './brevo-company-config.js';

// ===== BREVO API CONFIGURATION =====
const BREVO_API_BASE = 'https://api.brevo.com/v3';

/**
 * Helper function to handle empty values - returns null for clearing
 * This ensures Brevo clears fields when values are removed from Memberstack
 * @param {*} value - Value to check
 * @returns {*} - Original value or null if empty (to clear field in Brevo)
 */
function handleEmptyValue(value) {
  if (value === null || value === undefined || value === '') {
    return null; // Return null to clear the field in Brevo
  }
  return value;
}

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
  
  console.log(`🌐 Brevo API Request: ${method} ${fullUrl}`);
  if (data) {
    console.log(`📤 Request body:`, JSON.stringify(data, null, 2));
  }
  
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
        console.log(`📥 Response status: ${res.statusCode}`);
        console.log(`📥 Response data:`, responseData);
        
        try {
          const jsonResponse = responseData ? JSON.parse(responseData) : {};
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonResponse);
          } else {
            const errorMsg = `HTTP ${res.statusCode}: ${jsonResponse.message || 'Request failed'}`;
            console.error(`❌ Brevo API error: ${errorMsg}`);
            console.error(`❌ Full error response:`, responseData);
            reject(new Error(errorMsg));
          }
        } catch (parseError) {
          console.error(`❌ Failed to parse response:`, parseError.message);
          console.error(`❌ Raw response:`, responseData);
          reject(new Error(`Failed to parse response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Request error:`, error);
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
  console.log(`📋 [${syncId}] Plan config:`, planConfig);
  
  try {
    // Check if contact exists
    const existingContact = await getBrevoContact(email);
    
    // Get plan-specific attributes - these should NOT be overridden
    const planAttributes = getAttributesForPlan(planConfig.planId || planConfig.attributes?.PLAN_ID);
    console.log(`📋 [${syncId}] Plan attributes:`, planAttributes);
    
    // Map all member data to Brevo attributes
    const allAttributes = {
      // Basic contact information
      FIRSTNAME: handleEmptyValue(memberData.customFields?.['first-name'] || 
                 memberData.customFields?.firstName || 
                 memberData.metaData?.firstName),
      LASTNAME: handleEmptyValue(memberData.customFields?.['last-name'] || 
                memberData.customFields?.lastName || 
                memberData.metaData?.lastName),
      PHONE: handleEmptyValue(memberData.customFields?.['phone'] || 
             memberData.customFields?.phone || 
             memberData.metaData?.phone),
      LANGUAGE_PREF: memberData.metaData?.language || 
                     memberData.customFields?.language || 
                     memberData.customFields?.['language-pref'] || 'en',
      
      // Memberstack integration
      MEMBERSTACK_ID: handleEmptyValue(memberData.id),
      REGISTRATION_DATE: memberData.createdAt || new Date().toISOString(),
      LAST_SYNC: new Date().toISOString(),
      
      // Teacher/School name (general) - check all possible field names
      TEACHER_NAME: handleEmptyValue(memberData.customFields?.['teacher-name'] || 
                   memberData.customFields?.teacherName ||
                   memberData.metaData?.teacherName ||
                   `${memberData.customFields?.['first-name'] || ''} ${memberData.customFields?.['last-name'] || ''}`.trim()),
      SCHOOL_NAME: handleEmptyValue(memberData.customFields?.['school-name'] || 
                   memberData.customFields?.schoolName ||
                   memberData.customFields?.['school'] || 
                   memberData.customFields?.school ||
                   memberData.customFields?.['school-place-name'] || 
                   memberData.metaData?.schoolName),
      
      // School details (for Educators) - check all field variations
      SCHOOL_SEARCH_INPUT: handleEmptyValue(memberData.customFields?.['school-search-input'] || 
                          memberData.customFields?.schoolSearchInput ||
                          memberData.customFields?.['search-input'] || 
                          memberData.metaData?.schoolSearchInput),
      SCHOOL_ADDRESS: handleEmptyValue(memberData.customFields?.['school-address'] || 
                     memberData.customFields?.schoolAddress ||
                     memberData.customFields?.['school_address'] || 
                     memberData.customFields?.['school-address-result'] || 
                     memberData.metaData?.schoolAddress),
      SCHOOL_CITY: handleEmptyValue(memberData.customFields?.['school-city'] || 
                   memberData.customFields?.schoolCity ||
                   memberData.customFields?.['city'] || 
                   memberData.metaData?.schoolCity),
      SCHOOL_COUNTRY: handleEmptyValue(memberData.customFields?.['school-country'] || 
                      memberData.customFields?.schoolCountry ||
                      memberData.customFields?.['country'] || 
                      memberData.metaData?.schoolCountry),
      SCHOOL_FACILITY_TYPE: handleEmptyValue(memberData.customFields?.['school-type'] || 
                           memberData.customFields?.schoolType ||
                           memberData.customFields?.['school_type'] || 
                           memberData.customFields?.['school-facility-type'] || 
                           memberData.metaData?.schoolFacilityType),
      SCHOOL_LATITUDE: handleEmptyValue(String(memberData.customFields?.['school-latitude'] || 
                              memberData.customFields?.schoolLatitude ||
                              memberData.customFields?.['school_latitude'] || 
                              memberData.metaData?.schoolLatitude || '')),
      SCHOOL_LONGITUDE: handleEmptyValue(String(memberData.customFields?.['school-longitude'] || 
                               memberData.customFields?.schoolLongitude ||
                               memberData.customFields?.['school_longitude'] || 
                               memberData.metaData?.schoolLongitude || '')),
      SCHOOL_PHONE: handleEmptyValue(memberData.customFields?.['school-phone'] || 
                    memberData.customFields?.schoolPhone ||
                    memberData.customFields?.['school_phone'] || 
                    memberData.metaData?.schoolPhone),
      SCHOOL_PLACE_ID: handleEmptyValue(memberData.customFields?.['school-place-id'] || 
                       memberData.customFields?.schoolPlaceId ||
                       memberData.customFields?.['school_place_id'] || 
                       memberData.metaData?.schoolPlaceId),
      SCHOOL_PLACE_NAME: handleEmptyValue(memberData.customFields?.['school-place-name'] || 
                         memberData.customFields?.schoolPlaceName ||
                         memberData.customFields?.['school_place_name'] || 
                         memberData.customFields?.['school-place-name-short'] || 
                         memberData.metaData?.schoolPlaceName),
      SCHOOL_RATING: handleEmptyValue(memberData.customFields?.['school-rating'] || 
                     memberData.customFields?.schoolRating ||
                     memberData.customFields?.['school_rating'] || 
                     memberData.metaData?.schoolRating),
      SCHOOL_STATE: handleEmptyValue(memberData.customFields?.['school-state'] || 
                    memberData.customFields?.schoolState ||
                    memberData.customFields?.['school_state'] || 
                    memberData.metaData?.schoolState),
      SCHOOL_STREET_ADDRESS: handleEmptyValue(memberData.customFields?.['school-street-address'] || 
                             memberData.customFields?.schoolStreetAddress ||
                             memberData.customFields?.['school_street_address'] || 
                             memberData.metaData?.schoolStreetAddress),
      SCHOOL_WEBSITE: handleEmptyValue(memberData.customFields?.['school-website'] || 
                      memberData.customFields?.schoolWebsite ||
                      memberData.customFields?.['school_website'] || 
                      memberData.metaData?.schoolWebsite),
      SCHOOL_ZIP: handleEmptyValue(memberData.customFields?.['school-zip'] || 
                  memberData.customFields?.schoolZip ||
                  memberData.customFields?.['school_zip'] || 
                  memberData.metaData?.schoolZip),
      
      // Professional information (for Educators) - check all variations
      EDUCATOR_ROLE: handleEmptyValue(memberData.customFields?.['role'] || 
                     memberData.customFields?.role ||
                     memberData.customFields?.['educator-role'] || 
                     memberData.customFields?.educatorRole ||
                     memberData.metaData?.educatorRole),
      EDUCATOR_NO_CLASSES: handleEmptyValue(memberData.customFields?.['no-classes'] || 
                           memberData.customFields?.noClasses ||
                           memberData.customFields?.['no_classes'] || 
                           memberData.customFields?.['educator-no-classes'] || 
                           memberData.metaData?.educatorNoClasses),
      EDUCATOR_NO_KIDS: handleEmptyValue(memberData.customFields?.['no-kids'] || 
                        memberData.customFields?.noKids ||
                        memberData.customFields?.['no_kids'] || 
                        memberData.customFields?.['educator-no-kids'] || 
                        memberData.metaData?.educatorNoKids),
      
      // Application-specific
      LMIDS: handleEmptyValue(memberData.metaData?.lmids),
      
      // Company linking
      SCHOOL_PLACE_ID: handleEmptyValue(getSchoolIdFromMember(memberData)),
      
      // Custom fields for user preferences/settings
      RESOURCES: handleEmptyValue(memberData.customFields?.['resources'] || 
                 memberData.customFields?.resources ||
                 memberData.metaData?.resources),
      PAYMENTS: handleEmptyValue(memberData.customFields?.['payments'] || 
                memberData.customFields?.payments ||
                memberData.metaData?.payments),
      DISCOVER: handleEmptyValue(memberData.customFields?.['discover'] || 
                memberData.customFields?.discover ||
                memberData.metaData?.discover),
      
      // IMPORTANT: Plan attributes must be last to avoid being overridden
      // This includes USER_CATEGORY, PLAN_TYPE, PLAN_NAME, PLAN_ID
      ...planAttributes
    };
    
    // Log final attributes to debug
    console.log(`📋 [${syncId}] Final attributes:`, {
      PLAN_NAME: allAttributes.PLAN_NAME,
      PLAN_ID: allAttributes.PLAN_ID,
      USER_CATEGORY: allAttributes.USER_CATEGORY,
      PLAN_TYPE: allAttributes.PLAN_TYPE
    });
    
    // Send all attributes including null values to clear empty fields
    // Log final attributes for debugging
    console.log(`📋 [${syncId}] Final attributes being sent to Brevo:`, {
      ...allAttributes,
      fieldsCount: Object.keys(allAttributes).length,
      nullFields: Object.keys(allAttributes).filter(key => allAttributes[key] === null),
      hasAllImportantFields: {
        FIRSTNAME: !!allAttributes.FIRSTNAME,
        LASTNAME: !!allAttributes.LASTNAME,
        PLAN_NAME: !!allAttributes.PLAN_NAME,
        SCHOOL_CITY: !!allAttributes.SCHOOL_CITY,
        EDUCATOR_ROLE: !!allAttributes.EDUCATOR_ROLE,
        EDUCATOR_NO_KIDS: !!allAttributes.EDUCATOR_NO_KIDS
      }
    });
    
    // Prepare contact data
    const contactData = {
      email: email,
      attributes: allAttributes,
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
  console.log(`📊 [${syncId}] Member data check:`, {
    hasSchoolPlaceId: !!memberData.customFields?.['school-place-id'],
    schoolPlaceId: memberData.customFields?.['school-place-id'],
    hasSchoolName: !!(memberData.customFields?.['school-name'] || memberData.customFields?.schoolName),
    schoolName: memberData.customFields?.['school-name'] || memberData.customFields?.schoolName,
    shouldLinkToCompany: shouldLinkToCompany(memberData)
  });
  
  try {
    // Get existing contact first to preserve plan data if needed
    let existingContactData = null;
    try {
      existingContactData = await getBrevoContact(email);
      if (existingContactData) {
        console.log(`📋 [${syncId}] Found existing contact with attributes:`, {
          PLAN_NAME: existingContactData.attributes?.PLAN_NAME,
          PLAN_ID: existingContactData.attributes?.PLAN_ID,
          USER_CATEGORY: existingContactData.attributes?.USER_CATEGORY
        });
      }
    } catch (err) {
      // Ignore errors - contact might not exist
    }
    
    // Get active plans - check only status, not active field (which may be missing)
    const activePlans = memberData.planConnections?.filter(conn => 
      conn.status === 'ACTIVE' || conn.active === true
    ) || [];
    
    console.log(`📊 [${syncId}] Plan connections:`, memberData.planConnections?.map(p => ({
      planId: p.planId,
      status: p.status,
      active: p.active
    })));
    console.log(`📊 [${syncId}] Active plans after filter:`, activePlans.map(p => p.planId));
    
    // If no plans in webhook but contact exists with plan data, preserve it
    if (activePlans.length === 0 && existingContactData?.attributes?.PLAN_ID && existingContactData?.attributes?.PLAN_ID !== 'none') {
      console.log(`⚠️ [${syncId}] No plans in webhook but existing contact has plan data - preserving existing plan`);
      
      // Update contact with new data but preserve plan attributes
      const updateAttributes = {
        // Basic contact information
        FIRSTNAME: handleEmptyValue(memberData.customFields?.['first-name'] || 
                   memberData.customFields?.firstName || 
                   memberData.metaData?.firstName),
        LASTNAME: handleEmptyValue(memberData.customFields?.['last-name'] || 
                  memberData.customFields?.lastName || 
                  memberData.metaData?.lastName),
        PHONE: handleEmptyValue(memberData.customFields?.['phone'] || 
               memberData.customFields?.phone || 
               memberData.metaData?.phone),
        LANGUAGE_PREF: memberData.metaData?.language || 
                       memberData.customFields?.language || 
                       memberData.customFields?.['language-pref'] || 'en',
        
        // Memberstack integration
        MEMBERSTACK_ID: handleEmptyValue(memberData.id),
        LAST_SYNC: new Date().toISOString(),
        
        // Teacher/School name (general)
        TEACHER_NAME: handleEmptyValue(memberData.customFields?.['teacher-name'] || 
                     memberData.customFields?.teacherName ||
                     memberData.metaData?.teacherName ||
                     `${memberData.customFields?.['first-name'] || ''} ${memberData.customFields?.['last-name'] || ''}`.trim()),
        SCHOOL_NAME: handleEmptyValue(memberData.customFields?.['school-name'] || 
                     memberData.customFields?.schoolName ||
                     memberData.customFields?.['school'] || 
                     memberData.customFields?.school ||
                     memberData.customFields?.['place-name'] || 
                     memberData.metaData?.schoolName),
        
        // School details (map from generic field names)
        SCHOOL_SEARCH_INPUT: handleEmptyValue(memberData.customFields?.['search-input'] || 
                            memberData.customFields?.searchInput ||
                            memberData.customFields?.['school-search-input'] || 
                            memberData.metaData?.schoolSearchInput),
        SCHOOL_ADDRESS: handleEmptyValue(memberData.customFields?.['address-result'] || 
                       memberData.customFields?.addressResult ||
                       memberData.customFields?.['school-address'] || 
                       memberData.customFields?.['school-address-result'] || 
                       memberData.metaData?.schoolAddress),
        SCHOOL_CITY: handleEmptyValue(memberData.customFields?.['city'] || 
                     memberData.customFields?.city ||
                     memberData.customFields?.['school-city'] || 
                     memberData.metaData?.schoolCity),
        SCHOOL_COUNTRY: handleEmptyValue(memberData.customFields?.['country'] || 
                        memberData.customFields?.country ||
                        memberData.customFields?.['school-country'] || 
                        memberData.metaData?.schoolCountry),
        SCHOOL_FACILITY_TYPE: handleEmptyValue(memberData.customFields?.['facility-type'] || 
                             memberData.customFields?.facilityType ||
                             memberData.customFields?.['school-type'] || 
                             memberData.customFields?.['school-facility-type'] || 
                             memberData.metaData?.schoolFacilityType),
        SCHOOL_LATITUDE: handleEmptyValue(String(memberData.customFields?.['latitude'] || 
                                memberData.customFields?.latitude ||
                                memberData.customFields?.['school-latitude'] || 
                                memberData.metaData?.schoolLatitude || '')),
        SCHOOL_LONGITUDE: handleEmptyValue(String(memberData.customFields?.['longitude'] || 
                                 memberData.customFields?.longitude ||
                                 memberData.customFields?.['school-longitude'] || 
                                 memberData.metaData?.schoolLongitude || '')),
        SCHOOL_PHONE: handleEmptyValue(memberData.customFields?.['school-phone'] || 
                      memberData.customFields?.schoolPhone ||
                      memberData.metaData?.schoolPhone),
        SCHOOL_PLACE_ID: handleEmptyValue(memberData.customFields?.['place-id'] || 
                         memberData.customFields?.placeId ||
                         memberData.customFields?.['school-place-id'] || 
                         memberData.metaData?.schoolPlaceId),
        SCHOOL_PLACE_NAME: handleEmptyValue(memberData.customFields?.['place-name'] || 
                           memberData.customFields?.placeName ||
                           memberData.customFields?.['school-place-name'] || 
                           memberData.metaData?.schoolPlaceName),
        SCHOOL_RATING: handleEmptyValue(memberData.customFields?.['rating'] || 
                       memberData.customFields?.rating ||
                       memberData.customFields?.['school-rating'] || 
                       memberData.metaData?.schoolRating),
        SCHOOL_STATE: handleEmptyValue(memberData.customFields?.['state'] || 
                      memberData.customFields?.state ||
                      memberData.customFields?.['school-state'] || 
                      memberData.metaData?.schoolState),
        SCHOOL_STREET_ADDRESS: handleEmptyValue(memberData.customFields?.['street-address'] || 
                               memberData.customFields?.streetAddress ||
                               memberData.customFields?.['school-street-address'] || 
                               memberData.metaData?.schoolStreetAddress),
        SCHOOL_WEBSITE: handleEmptyValue(memberData.customFields?.['website'] || 
                        memberData.customFields?.website ||
                        memberData.customFields?.['school-website'] || 
                        memberData.metaData?.schoolWebsite),
        SCHOOL_ZIP: handleEmptyValue(memberData.customFields?.['zip'] || 
                    memberData.customFields?.zip ||
                    memberData.customFields?.['school-zip'] || 
                    memberData.metaData?.schoolZip),
        
        // Professional information (map from generic field names)
        EDUCATOR_ROLE: handleEmptyValue(memberData.customFields?.['role'] || 
                       memberData.customFields?.role ||
                       memberData.customFields?.['educator-role'] || 
                       memberData.metaData?.educatorRole),
        EDUCATOR_NO_CLASSES: handleEmptyValue(memberData.customFields?.['no-classes'] || 
                             memberData.customFields?.noClasses ||
                             memberData.customFields?.['educator-no-classes'] || 
                             memberData.metaData?.educatorNoClasses),
        EDUCATOR_NO_KIDS: handleEmptyValue(memberData.customFields?.['no-kids'] || 
                          memberData.customFields?.noKids ||
                          memberData.customFields?.['educator-no-kids'] || 
                          memberData.metaData?.educatorNoKids),
        
        // Application-specific
        LMIDS: handleEmptyValue(memberData.metaData?.lmids || existingContactData.attributes?.LMIDS),
        
        // Custom fields for user preferences/settings  
        RESOURCES: handleEmptyValue(memberData.customFields?.['resources'] || 
                   memberData.customFields?.resources ||
                   memberData.metaData?.resources),
        PAYMENTS: handleEmptyValue(memberData.customFields?.['payments'] || 
                  memberData.customFields?.payments ||
                  memberData.metaData?.payments),
        DISCOVER: handleEmptyValue(memberData.customFields?.['discover'] || 
                  memberData.customFields?.discover ||
                  memberData.metaData?.discover),
        
        // Preserve existing plan data
        USER_CATEGORY: existingContactData.attributes.USER_CATEGORY,
        PLAN_TYPE: existingContactData.attributes.PLAN_TYPE,
        PLAN_NAME: existingContactData.attributes.PLAN_NAME,
        PLAN_ID: existingContactData.attributes.PLAN_ID
      };
      
      // Send all attributes including null values to clear empty fields
      console.log(`📋 [${syncId}] Updating contact with preserved plan and mapped fields:`, {
        ...updateAttributes,
        fieldsCount: Object.keys(updateAttributes).length,
        nullFields: Object.keys(updateAttributes).filter(key => updateAttributes[key] === null)
      });
      
      await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`, 'PUT', {
        attributes: updateAttributes
      });
      
      console.log(`✅ [${syncId}] Updated contact preserving existing plan data`);
      return { success: true, syncId, email, action: 'updated_preserve_plan' };
    }
    
    if (activePlans.length === 0) {
      console.log(`📝 [${syncId}] No active plans for ${email} - syncing basic contact data`);
      
      // Create basic contact without plan-specific attributes
      const basicAttributes = {
        FIRSTNAME: handleEmptyValue(memberData.customFields?.['first-name'] || memberData.customFields?.firstName),
        LASTNAME: handleEmptyValue(memberData.customFields?.['last-name'] || memberData.customFields?.lastName),
        PHONE: handleEmptyValue(memberData.customFields?.['phone'] || memberData.customFields?.phone),
        MEMBERSTACK_ID: handleEmptyValue(memberData.id),
        REGISTRATION_DATE: memberData.createdAt || new Date().toISOString(),
        LAST_SYNC: new Date().toISOString(),
        
        // Custom fields for user preferences/settings
        RESOURCES: handleEmptyValue(memberData.customFields?.['resources'] || 
                   memberData.customFields?.resources ||
                   memberData.metaData?.resources),
        PAYMENTS: handleEmptyValue(memberData.customFields?.['payments'] || 
                  memberData.customFields?.payments ||
                  memberData.metaData?.payments),
        DISCOVER: handleEmptyValue(memberData.customFields?.['discover'] || 
                  memberData.customFields?.discover ||
                  memberData.metaData?.discover),
        
        // Set default category as pending until plan is selected
        USER_CATEGORY: 'pending',
        PLAN_TYPE: 'none',
        PLAN_NAME: 'No Plan Yet'
      };
      
      try {
        // Add SCHOOL_PLACE_ID if member has school data
        if (shouldLinkToCompany(memberData)) {
          const schoolId = getSchoolIdFromMember(memberData);
          if (schoolId) {
            basicAttributes.SCHOOL_PLACE_ID = schoolId;
            console.log(`📝 [${syncId}] Adding SCHOOL_PLACE_ID to basic contact: ${schoolId}`);
          }
        }
        
        // Check if contact exists
        const existingContact = await getBrevoContact(email);
        
        if (existingContact) {
          // Update existing contact
          await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`, 'PUT', {
            attributes: basicAttributes
          });
          console.log(`✅ [${syncId}] Updated basic contact for ${email} (no plan)`);
        } else {
          // Create new contact
          await makeBrevoRequest('/contacts', 'POST', {
            email: email,
            listIds: [BREVO_MAIN_LIST.HEY_FEELINGS_LIST],
            attributes: basicAttributes
          });
          console.log(`✅ [${syncId}] Created basic contact for ${email} (no plan)`);
        }
        
        // Handle Company creation for users without plan but with school data (e.g., during onboarding)
        if (shouldLinkToCompany(memberData)) {
          const schoolId = getSchoolIdFromMember(memberData);
          
          if (schoolId) {
            console.log(`🏢 [${syncId}] Processing company for contact ${email} (no plan yet)`);
            
            // Prepare school data from member data
            const schoolData = {
              SCHOOL_PLACE_ID: schoolId,
              SCHOOL_NAME: handleEmptyValue(memberData.customFields?.['school-name'] ||
                           memberData.customFields?.schoolName ||
                           memberData.metaData?.schoolName),
              SCHOOL_CITY: handleEmptyValue(memberData.customFields?.['school-city'] ||
                           memberData.customFields?.city ||
                           memberData.metaData?.schoolCity),
              SCHOOL_COUNTRY: handleEmptyValue(memberData.customFields?.['school-country'] ||
                              memberData.customFields?.country ||
                              memberData.metaData?.schoolCountry),
              SCHOOL_PHONE: handleEmptyValue(memberData.customFields?.['school-phone'] ||
                            memberData.metaData?.schoolPhone),
              SCHOOL_WEBSITE: handleEmptyValue(memberData.customFields?.['school-website'] ||
                              memberData.customFields?.website ||
                              memberData.metaData?.schoolWebsite),
              SCHOOL_STREET_ADDRESS: handleEmptyValue(memberData.customFields?.['school-street-address'] ||
                                     memberData.customFields?.['street-address'] ||
                                     memberData.metaData?.schoolStreetAddress),
              SCHOOL_STATE_PROVINCE: handleEmptyValue(memberData.customFields?.['school-state'] ||
                                     memberData.customFields?.state ||
                                     memberData.metaData?.schoolState),
              SCHOOL_POSTAL_CODE: handleEmptyValue(memberData.customFields?.['school-zip'] ||
                                  memberData.customFields?.zip ||
                                  memberData.metaData?.schoolZip),
              SCHOOL_LATITUDE: handleEmptyValue(String(memberData.customFields?.['school-latitude'] ||
                                      memberData.customFields?.latitude ||
                                      memberData.metaData?.schoolLatitude || '')),
              SCHOOL_LONGITUDE: handleEmptyValue(String(memberData.customFields?.['school-longitude'] ||
                                       memberData.customFields?.longitude ||
                                       memberData.metaData?.schoolLongitude || ''))
            };
            
            // Create or update company
            const companyResult = await createOrUpdateBrevoCompany(schoolData);
            
            if (companyResult.success) {
              console.log(`✅ [${syncId}] Company processed successfully for user without plan`);
              
              // Link contact to company
              const linkData = {
                EDUCATOR_ROLE: handleEmptyValue(memberData.customFields?.role || 
                              memberData.customFields?.['educator-role'] ||
                              memberData.metaData?.educatorRole),
                IS_PRIMARY_CONTACT: memberData.customFields?.role?.toLowerCase().includes('principal') || false
              };
              
              const linkResult = await linkContactToCompany(email, schoolId, linkData);
              
              if (linkResult.success) {
                console.log(`✅ [${syncId}] Contact linked to company successfully`);
              } else {
                console.warn(`⚠️ [${syncId}] Failed to link contact to company: ${linkResult.error}`);
              }
            } else {
              console.warn(`⚠️ [${syncId}] Failed to process company: ${companyResult.error}`);
            }
          }
        }
        
        return { success: true, syncId, email, action: 'synced_basic_with_company' };
      } catch (basicError) {
        console.error(`❌ [${syncId}] Basic sync failed:`, basicError.message);
        return { success: false, syncId, email, error: basicError.message };
      }
    }
    
    // Process first active plan (original logic)
    const plan = activePlans[0];
    const planConfig = getPlanConfig(plan.planId);
    
    if (!planConfig) {
      console.warn(`⚠️ [${syncId}] Unknown plan ${plan.planId} for ${email}`);
      return { success: false, syncId, email, error: `Unknown plan: ${plan.planId}` };
    }
    
    console.log(`📋 [${syncId}] Syncing plan ${planConfig.attributes.PLAN_NAME} for ${email}`);
    
    // Create/update contact
    const contactResult = await createOrUpdateBrevoContact(memberData, planConfig);
    
    if (!contactResult.success) {
      console.error(`❌ [${syncId}] Brevo sync failed for ${email}: ${contactResult.error}`);
      return { success: false, syncId, email, error: contactResult.error };
    }
    
    // Handle Company creation/update for educators and therapists with school data
    if (shouldLinkToCompany(memberData)) {
      const schoolId = getSchoolIdFromMember(memberData);
      
      if (schoolId) {
        console.log(`🏢 [${syncId}] Processing company for contact ${email}`);
        
        // Prepare school data from member data
        const schoolData = {
          SCHOOL_PLACE_ID: schoolId,
          SCHOOL_NAME: handleEmptyValue(memberData.customFields?.schoolName || 
                       memberData.customFields?.['school-name'] ||
                       memberData.metaData?.schoolName),
          SCHOOL_CITY: handleEmptyValue(memberData.customFields?.city || 
                       memberData.customFields?.['school-city'] ||
                       memberData.metaData?.schoolCity),
          SCHOOL_COUNTRY: handleEmptyValue(memberData.customFields?.country || 
                          memberData.customFields?.['school-country'] ||
                          memberData.metaData?.schoolCountry),
          SCHOOL_PHONE: handleEmptyValue(memberData.customFields?.['school-phone'] ||
                        memberData.metaData?.schoolPhone),
          SCHOOL_WEBSITE: handleEmptyValue(memberData.customFields?.website ||
                          memberData.customFields?.['school-website'] ||
                          memberData.metaData?.schoolWebsite),
          SCHOOL_STREET_ADDRESS: handleEmptyValue(memberData.customFields?.['street-address'] ||
                                 memberData.metaData?.schoolStreetAddress),
          SCHOOL_STATE_PROVINCE: handleEmptyValue(memberData.customFields?.state ||
                                 memberData.customFields?.['school-state'] ||
                                 memberData.metaData?.schoolState),
          SCHOOL_POSTAL_CODE: handleEmptyValue(memberData.customFields?.zip ||
                              memberData.customFields?.['school-zip'] ||
                              memberData.metaData?.schoolZip),
          SCHOOL_LATITUDE: handleEmptyValue(String(memberData.customFields?.latitude ||
                           memberData.customFields?.['school-latitude'] ||
                           memberData.metaData?.schoolLatitude || '')),
          SCHOOL_LONGITUDE: handleEmptyValue(String(memberData.customFields?.longitude ||
                            memberData.customFields?.['school-longitude'] ||
                            memberData.metaData?.schoolLongitude || ''))
        };
        
        // Create or update company
        const companyResult = await createOrUpdateBrevoCompany(schoolData);
        
        if (companyResult.success) {
          console.log(`✅ [${syncId}] Company processed successfully`);
          
          // Link contact to company
          const linkData = {
            EDUCATOR_ROLE: handleEmptyValue(memberData.customFields?.role || 
                          memberData.customFields?.['educator-role'] ||
                          memberData.metaData?.educatorRole),
            IS_PRIMARY_CONTACT: memberData.customFields?.role?.toLowerCase().includes('principal') || false
          };
          
          const linkResult = await linkContactToCompany(email, schoolId, linkData);
          
          if (linkResult.success) {
            console.log(`✅ [${syncId}] Contact linked to company successfully`);
          } else {
            console.warn(`⚠️ [${syncId}] Failed to link contact to company: ${linkResult.error}`);
          }
        } else {
          console.warn(`⚠️ [${syncId}] Failed to process company: ${companyResult.error}`);
        }
      }
    }
    
    console.log(`✅ [${syncId}] Brevo sync completed successfully for ${email}`);
    return { success: true, syncId, email, contactResult };
    
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

/**
 * Delete contact from Brevo
 * @param {string} email - Contact email address
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteBrevoContact(email) {
  const syncId = Math.random().toString(36).substring(2, 15);
  
  console.log(`🗑️ [${syncId}] Deleting Brevo contact: ${email}`);
  
  try {
    // Check if contact exists first
    const existingContact = await getBrevoContact(email);
    
    if (!existingContact) {
      console.log(`ℹ️ [${syncId}] Contact ${email} not found in Brevo - nothing to delete`);
      return { success: true, syncId, email, action: 'not_found' };
    }
    
    // Delete the contact
    await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`, 'DELETE');
    
    console.log(`✅ [${syncId}] Successfully deleted contact: ${email}`);
    return { success: true, syncId, email, action: 'deleted' };
    
  } catch (error) {
    console.error(`❌ [${syncId}] Error deleting contact ${email}:`, error.message);
    
    // If error is 404, the contact was already deleted
    if (error.message.includes('404')) {
      console.log(`ℹ️ [${syncId}] Contact ${email} was already deleted from Brevo`);
      return { success: true, syncId, email, action: 'already_deleted' };
    }
    
    return { success: false, syncId, email, error: error.message };
  }
}

/**
 * Remove contact from specific Brevo list (alternative to full deletion)
 * @param {string} email - Contact email address
 * @param {number} listId - Brevo list ID
 * @returns {Promise<Object>} Removal result
 */
export async function removeContactFromBrevoList(email, listId = BREVO_MAIN_LIST.HEY_FEELINGS_LIST) {
  const syncId = Math.random().toString(36).substring(2, 15);
  
  console.log(`📋 [${syncId}] Removing contact ${email} from Brevo list ${listId}`);
  
  try {
    const result = await makeBrevoRequest(`/contacts/lists/${listId}/contacts/remove`, 'POST', {
      emails: [email]
    });
    
    console.log(`✅ [${syncId}] Successfully removed contact from list: ${email}`);
    return { success: true, syncId, email, listId, result };
    
  } catch (error) {
    console.error(`❌ [${syncId}] Error removing contact ${email} from list ${listId}:`, error.message);
    return { success: false, syncId, email, listId, error: error.message };
  }
}

// ===== BREVO COMPANIES MANAGEMENT =====

/**
 * Create or update a company in Brevo
 * @param {Object} schoolData - School data from Memberstack
 * @returns {Promise<Object>} Company creation/update result
 */
export async function createOrUpdateBrevoCompany(schoolData) {
  const syncId = Math.random().toString(36).substring(2, 15);
  const schoolId = schoolData.SCHOOL_PLACE_ID || getSchoolIdFromMember({ metaData: schoolData });
  
  if (!schoolId) {
    console.error(`❌ [${syncId}] Cannot create company without SCHOOL_PLACE_ID`);
    return { success: false, error: 'Missing SCHOOL_PLACE_ID' };
  }
  
  console.log(`🏢 [${syncId}] Creating/updating company: ${schoolData.SCHOOL_NAME} (ID: ${schoolId})`);
  console.log(`🏢 [${syncId}] Full school data:`, JSON.stringify(schoolData, null, 2));
  
  try {
    // Prepare company attributes
    const companyAttributes = getCompanyAttributes(schoolData);
    console.log(`📋 [${syncId}] Company attributes:`, JSON.stringify(companyAttributes, null, 2));
    
    // Try to create company first
    console.log(`➕ [${syncId}] Attempting to create company ${schoolId}`);
    
    const requestBody = {
      name: companyAttributes.name || schoolData.SCHOOL_NAME || 'Unknown School'
    };
    console.log(`📋 [${syncId}] Company creation request:`, JSON.stringify(requestBody, null, 2));
    
    try {
      const result = await makeBrevoRequest('/companies', 'POST', requestBody);
      
      console.log(`✅ [${syncId}] Successfully created company ${schoolId}`);
      console.log(`📋 [${syncId}] Company creation response:`, JSON.stringify(result, null, 2));
      return { success: true, syncId, companyId: schoolId, action: 'created', data: result };
      
    } catch (createError) {
      // If creation fails with 409 (conflict), try to update
      if (createError.message.includes('409') || createError.message.includes('already exists')) {
        console.log(`📝 [${syncId}] Company exists, attempting to update ${schoolId}`);
        
        try {
          const updateResult = await makeBrevoRequest(`/companies/${schoolId}`, 'PATCH', companyAttributes);
          
          console.log(`✅ [${syncId}] Successfully updated company ${schoolId}`);
          return { success: true, syncId, companyId: schoolId, action: 'updated', data: updateResult };
          
        } catch (updateError) {
          console.error(`❌ [${syncId}] Update also failed:`, updateError.message);
          throw updateError;
        }
      }
      
      // If it's not a conflict error, throw it
      throw createError;
    }
    
  } catch (error) {
    console.error(`❌ [${syncId}] Error creating/updating company:`, error.message);
    console.error(`❌ [${syncId}] Error details:`, error.stack);
    if (error.response) {
      console.error(`❌ [${syncId}] Error response:`, error.response);
    }
    return { success: false, syncId, error: error.message };
  }
}

/**
 * Get company data from Brevo
 * @param {string} companyId - Company ID (SCHOOL_PLACE_ID)
 * @returns {Promise<Object|null>} Company data or null if not found
 */
export async function getBrevoCompany(companyId) {
  if (!companyId) return null;
  
  try {
    const result = await makeBrevoRequest(`/companies/${encodeURIComponent(companyId)}`);
    return result;
  } catch (error) {
    if (error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Link a contact to a company
 * @param {string} email - Contact email
 * @param {string} companyId - Company ID (SCHOOL_PLACE_ID)
 * @param {Object} linkData - Additional link data (role, department, etc.)
 * @returns {Promise<Object>} Link result
 */
export async function linkContactToCompany(email, companyId, linkData = {}) {
  const syncId = Math.random().toString(36).substring(2, 15);
  
  console.log(`🔗 [${syncId}] Linking contact ${email} to company ${companyId}`);
  
  try {
    // In Brevo, linking is done by updating contact with company ID
    const updateData = {
      attributes: {
        [COMPANY_CONTACT_LINK.CONTACT_COMPANY_FIELD]: companyId,
        ...linkData
      }
    };
    
    const result = await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`, 'PUT', updateData);
    
    console.log(`✅ [${syncId}] Successfully linked contact to company`);
    return { success: true, syncId, email, companyId, result };
    
  } catch (error) {
    console.error(`❌ [${syncId}] Error linking contact to company:`, error.message);
    return { success: false, syncId, error: error.message };
  }
}

/**
 * Get all contacts linked to a company
 * @param {string} companyId - Company ID (SCHOOL_PLACE_ID)
 * @returns {Promise<Object>} Contacts data
 */
export async function getCompanyContacts(companyId) {
  try {
    // Filter contacts by SCHOOL_PLACE_ID attribute
    const filter = `${COMPANY_CONTACT_LINK.CONTACT_COMPANY_FIELD}='${companyId}'`;
    const result = await makeBrevoRequest(`/contacts?filter=${encodeURIComponent(filter)}`);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update company metrics (e.g., total students, educators)
 * @param {string} companyId - Company ID (SCHOOL_PLACE_ID)
 * @param {Object} metrics - Metrics to update
 * @returns {Promise<Object>} Update result
 */
export async function updateCompanyMetrics(companyId, metrics) {
  const syncId = Math.random().toString(36).substring(2, 15);
  
  console.log(`📊 [${syncId}] Updating metrics for company ${companyId}`);
  
  try {
    const updateData = {
      attributes: {
        TOTAL_STUDENTS: metrics.totalStudents,
        TOTAL_EDUCATORS: metrics.totalEducators,
        TOTAL_CLASSES: metrics.totalClasses
      }
    };
    
    const result = await makeBrevoRequest(`/crm/companies/${companyId}`, 'PATCH', updateData);
    
    console.log(`✅ [${syncId}] Successfully updated company metrics`);
    return { success: true, syncId, companyId, result };
    
  } catch (error) {
    console.error(`❌ [${syncId}] Error updating company metrics:`, error.message);
    return { success: false, syncId, error: error.message };
  }
} 