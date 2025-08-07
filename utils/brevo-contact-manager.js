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
      FIRSTNAME: memberData.customFields?.['first-name'] || 
                 memberData.customFields?.firstName || 
                 memberData.metaData?.firstName || '',
      LASTNAME: memberData.customFields?.['last-name'] || 
                memberData.customFields?.lastName || 
                memberData.metaData?.lastName || '',
      PHONE: memberData.customFields?.['phone'] || 
             memberData.customFields?.phone || 
             memberData.metaData?.phone || '',
      LANGUAGE_PREF: memberData.metaData?.language || 
                     memberData.customFields?.language || 
                     memberData.customFields?.['language-pref'] || 'en',
      
      // Memberstack integration
      MEMBERSTACK_ID: memberData.id || '',
      REGISTRATION_DATE: memberData.createdAt || new Date().toISOString(),
      LAST_SYNC: new Date().toISOString(),
      
      // Teacher/School name (general) - check all possible field names
      TEACHER_NAME: memberData.customFields?.['teacher-name'] || 
                   memberData.customFields?.teacherName ||
                   memberData.metaData?.teacherName ||
                   `${memberData.customFields?.['first-name'] || ''} ${memberData.customFields?.['last-name'] || ''}`.trim(),
      SCHOOL_NAME: memberData.customFields?.['school-name'] || 
                   memberData.customFields?.schoolName ||
                   memberData.customFields?.['school'] || 
                   memberData.customFields?.school ||
                   memberData.customFields?.['school-place-name'] || 
                   memberData.metaData?.schoolName || '',
      
      // School details (for Educators) - check all field variations
      SCHOOL_SEARCH_INPUT: memberData.customFields?.['school-search-input'] || 
                          memberData.customFields?.schoolSearchInput ||
                          memberData.customFields?.['search-input'] || 
                          memberData.metaData?.schoolSearchInput || '',
      SCHOOL_ADDRESS: memberData.customFields?.['school-address'] || 
                     memberData.customFields?.schoolAddress ||
                     memberData.customFields?.['school_address'] || 
                     memberData.customFields?.['school-address-result'] || 
                     memberData.metaData?.schoolAddress || '',
      SCHOOL_CITY: memberData.customFields?.['school-city'] || 
                   memberData.customFields?.schoolCity ||
                   memberData.customFields?.['city'] || 
                   memberData.metaData?.schoolCity || '',
      SCHOOL_COUNTRY: memberData.customFields?.['school-country'] || 
                      memberData.customFields?.schoolCountry ||
                      memberData.customFields?.['country'] || 
                      memberData.metaData?.schoolCountry || '',
      SCHOOL_FACILITY_TYPE: memberData.customFields?.['school-type'] || 
                           memberData.customFields?.schoolType ||
                           memberData.customFields?.['school_type'] || 
                           memberData.customFields?.['school-facility-type'] || 
                           memberData.metaData?.schoolFacilityType || '',
      SCHOOL_LATITUDE: String(memberData.customFields?.['school-latitude'] || 
                              memberData.customFields?.schoolLatitude ||
                              memberData.customFields?.['school_latitude'] || 
                              memberData.metaData?.schoolLatitude || ''),
      SCHOOL_LONGITUDE: String(memberData.customFields?.['school-longitude'] || 
                               memberData.customFields?.schoolLongitude ||
                               memberData.customFields?.['school_longitude'] || 
                               memberData.metaData?.schoolLongitude || ''),
      SCHOOL_PHONE: memberData.customFields?.['school-phone'] || 
                    memberData.customFields?.schoolPhone ||
                    memberData.customFields?.['school_phone'] || 
                    memberData.metaData?.schoolPhone || '',
      SCHOOL_PLACE_ID: memberData.customFields?.['school-place-id'] || 
                       memberData.customFields?.schoolPlaceId ||
                       memberData.customFields?.['school_place_id'] || 
                       memberData.metaData?.schoolPlaceId || '',
      SCHOOL_PLACE_NAME: memberData.customFields?.['school-place-name'] || 
                         memberData.customFields?.schoolPlaceName ||
                         memberData.customFields?.['school_place_name'] || 
                         memberData.customFields?.['school-place-name-short'] || 
                         memberData.metaData?.schoolPlaceName || '',
      SCHOOL_RATING: memberData.customFields?.['school-rating'] || 
                     memberData.customFields?.schoolRating ||
                     memberData.customFields?.['school_rating'] || 
                     memberData.metaData?.schoolRating || '',
      SCHOOL_STATE: memberData.customFields?.['school-state'] || 
                    memberData.customFields?.schoolState ||
                    memberData.customFields?.['school_state'] || 
                    memberData.metaData?.schoolState || '',
      SCHOOL_STREET_ADDRESS: memberData.customFields?.['school-street-address'] || 
                             memberData.customFields?.schoolStreetAddress ||
                             memberData.customFields?.['school_street_address'] || 
                             memberData.metaData?.schoolStreetAddress || '',
      SCHOOL_WEBSITE: memberData.customFields?.['school-website'] || 
                      memberData.customFields?.schoolWebsite ||
                      memberData.customFields?.['school_website'] || 
                      memberData.metaData?.schoolWebsite || '',
      SCHOOL_ZIP: memberData.customFields?.['school-zip'] || 
                  memberData.customFields?.schoolZip ||
                  memberData.customFields?.['school_zip'] || 
                  memberData.metaData?.schoolZip || '',
      
      // Professional information (for Educators) - check all variations
      EDUCATOR_ROLE: memberData.customFields?.['role'] || 
                     memberData.customFields?.role ||
                     memberData.customFields?.['educator-role'] || 
                     memberData.customFields?.educatorRole ||
                     memberData.metaData?.educatorRole || '',
      EDUCATOR_NO_CLASSES: memberData.customFields?.['no-classes'] || 
                           memberData.customFields?.noClasses ||
                           memberData.customFields?.['no_classes'] || 
                           memberData.customFields?.['educator-no-classes'] || 
                           memberData.metaData?.educatorNoClasses || '',
      EDUCATOR_NO_KIDS: memberData.customFields?.['no-kids'] || 
                        memberData.customFields?.noKids ||
                        memberData.customFields?.['no_kids'] || 
                        memberData.customFields?.['educator-no-kids'] || 
                        memberData.metaData?.educatorNoKids || '',
      
      // Application-specific
      LMIDS: memberData.metaData?.lmids || '',
      
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
    
    // Clean up null/undefined values - Brevo doesn't like them
    // Also preserve existing values if new value is empty
    const cleanedAttributes = {};
    Object.keys(allAttributes).forEach(key => {
      const value = allAttributes[key];
      if (value !== null && value !== undefined && value !== '') {
        cleanedAttributes[key] = value;
      } else if (existingContact?.attributes?.[key]) {
        // If new value is empty but existing contact has data, preserve it
        cleanedAttributes[key] = existingContact.attributes[key];
      }
    });
    
    // Log final cleaned attributes for debugging
    console.log(`📋 [${syncId}] Final cleaned attributes being sent to Brevo:`, {
      ...cleanedAttributes,
      fieldsCount: Object.keys(cleanedAttributes).length,
      hasAllImportantFields: {
        FIRSTNAME: !!cleanedAttributes.FIRSTNAME,
        LASTNAME: !!cleanedAttributes.LASTNAME,
        PLAN_NAME: !!cleanedAttributes.PLAN_NAME,
        SCHOOL_CITY: !!cleanedAttributes.SCHOOL_CITY,
        EDUCATOR_ROLE: !!cleanedAttributes.EDUCATOR_ROLE,
        EDUCATOR_NO_KIDS: !!cleanedAttributes.EDUCATOR_NO_KIDS
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
        FIRSTNAME: memberData.customFields?.['first-name'] || 
                   memberData.customFields?.firstName || 
                   memberData.metaData?.firstName || '',
        LASTNAME: memberData.customFields?.['last-name'] || 
                  memberData.customFields?.lastName || 
                  memberData.metaData?.lastName || '',
        PHONE: memberData.customFields?.['phone'] || 
               memberData.customFields?.phone || 
               memberData.metaData?.phone || '',
        LANGUAGE_PREF: memberData.metaData?.language || 
                       memberData.customFields?.language || 
                       memberData.customFields?.['language-pref'] || 'en',
        
        // Memberstack integration
        MEMBERSTACK_ID: memberData.id || '',
        LAST_SYNC: new Date().toISOString(),
        
        // Teacher/School name (general)
        TEACHER_NAME: memberData.customFields?.['teacher-name'] || 
                     memberData.customFields?.teacherName ||
                     memberData.metaData?.teacherName ||
                     `${memberData.customFields?.['first-name'] || ''} ${memberData.customFields?.['last-name'] || ''}`.trim(),
        SCHOOL_NAME: memberData.customFields?.['school-name'] || 
                     memberData.customFields?.schoolName ||
                     memberData.customFields?.['school'] || 
                     memberData.customFields?.school ||
                     memberData.customFields?.['place-name'] || 
                     memberData.metaData?.schoolName || '',
        
        // School details (map from generic field names)
        SCHOOL_SEARCH_INPUT: memberData.customFields?.['search-input'] || 
                            memberData.customFields?.searchInput ||
                            memberData.customFields?.['school-search-input'] || 
                            memberData.metaData?.schoolSearchInput || '',
        SCHOOL_ADDRESS: memberData.customFields?.['address-result'] || 
                       memberData.customFields?.addressResult ||
                       memberData.customFields?.['school-address'] || 
                       memberData.customFields?.['school-address-result'] || 
                       memberData.metaData?.schoolAddress || '',
        SCHOOL_CITY: memberData.customFields?.['city'] || 
                     memberData.customFields?.city ||
                     memberData.customFields?.['school-city'] || 
                     memberData.metaData?.schoolCity || '',
        SCHOOL_COUNTRY: memberData.customFields?.['country'] || 
                        memberData.customFields?.country ||
                        memberData.customFields?.['school-country'] || 
                        memberData.metaData?.schoolCountry || '',
        SCHOOL_FACILITY_TYPE: memberData.customFields?.['facility-type'] || 
                             memberData.customFields?.facilityType ||
                             memberData.customFields?.['school-type'] || 
                             memberData.customFields?.['school-facility-type'] || 
                             memberData.metaData?.schoolFacilityType || '',
        SCHOOL_LATITUDE: String(memberData.customFields?.['latitude'] || 
                                memberData.customFields?.latitude ||
                                memberData.customFields?.['school-latitude'] || 
                                memberData.metaData?.schoolLatitude || ''),
        SCHOOL_LONGITUDE: String(memberData.customFields?.['longitude'] || 
                                 memberData.customFields?.longitude ||
                                 memberData.customFields?.['school-longitude'] || 
                                 memberData.metaData?.schoolLongitude || ''),
        SCHOOL_PHONE: memberData.customFields?.['school-phone'] || 
                      memberData.customFields?.schoolPhone ||
                      memberData.metaData?.schoolPhone || '',
        SCHOOL_PLACE_ID: memberData.customFields?.['place-id'] || 
                         memberData.customFields?.placeId ||
                         memberData.customFields?.['school-place-id'] || 
                         memberData.metaData?.schoolPlaceId || '',
        SCHOOL_PLACE_NAME: memberData.customFields?.['place-name'] || 
                           memberData.customFields?.placeName ||
                           memberData.customFields?.['school-place-name'] || 
                           memberData.metaData?.schoolPlaceName || '',
        SCHOOL_RATING: memberData.customFields?.['rating'] || 
                       memberData.customFields?.rating ||
                       memberData.customFields?.['school-rating'] || 
                       memberData.metaData?.schoolRating || '',
        SCHOOL_STATE: memberData.customFields?.['state'] || 
                      memberData.customFields?.state ||
                      memberData.customFields?.['school-state'] || 
                      memberData.metaData?.schoolState || '',
        SCHOOL_STREET_ADDRESS: memberData.customFields?.['street-address'] || 
                               memberData.customFields?.streetAddress ||
                               memberData.customFields?.['school-street-address'] || 
                               memberData.metaData?.schoolStreetAddress || '',
        SCHOOL_WEBSITE: memberData.customFields?.['website'] || 
                        memberData.customFields?.website ||
                        memberData.customFields?.['school-website'] || 
                        memberData.metaData?.schoolWebsite || '',
        SCHOOL_ZIP: memberData.customFields?.['zip'] || 
                    memberData.customFields?.zip ||
                    memberData.customFields?.['school-zip'] || 
                    memberData.metaData?.schoolZip || '',
        
        // Professional information (map from generic field names)
        EDUCATOR_ROLE: memberData.customFields?.['role'] || 
                       memberData.customFields?.role ||
                       memberData.customFields?.['educator-role'] || 
                       memberData.metaData?.educatorRole || '',
        EDUCATOR_NO_CLASSES: memberData.customFields?.['no-classes'] || 
                             memberData.customFields?.noClasses ||
                             memberData.customFields?.['educator-no-classes'] || 
                             memberData.metaData?.educatorNoClasses || '',
        EDUCATOR_NO_KIDS: memberData.customFields?.['no-kids'] || 
                          memberData.customFields?.noKids ||
                          memberData.customFields?.['educator-no-kids'] || 
                          memberData.metaData?.educatorNoKids || '',
        
        // Application-specific
        LMIDS: memberData.metaData?.lmids || existingContactData.attributes?.LMIDS || '',
        
        // Preserve existing plan data
        USER_CATEGORY: existingContactData.attributes.USER_CATEGORY,
        PLAN_TYPE: existingContactData.attributes.PLAN_TYPE,
        PLAN_NAME: existingContactData.attributes.PLAN_NAME,
        PLAN_ID: existingContactData.attributes.PLAN_ID
      };
      
      // Clean up null/undefined/empty values - only update fields with actual data
      const cleanedAttributes = {};
      Object.keys(updateAttributes).forEach(key => {
        const value = updateAttributes[key];
        if (value !== null && value !== undefined && value !== '') {
          cleanedAttributes[key] = value;
        }
      });
      
      console.log(`📋 [${syncId}] Updating contact with preserved plan and mapped fields:`, {
        ...cleanedAttributes,
        fieldsCount: Object.keys(cleanedAttributes).length
      });
      
      await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`, 'PUT', {
        attributes: cleanedAttributes
      });
      
      console.log(`✅ [${syncId}] Updated contact preserving existing plan data`);
      
      // OPTIONAL: Handle school Company sync (if applicable) for preserve plan scenario
      let companyResult = null;
      try {
        const { handleMemberSchoolCompanySync } = await import('./brevo-company-manager.js');
        companyResult = await handleMemberSchoolCompanySync(memberData, email);
        
        if (companyResult.success && companyResult.action !== 'skipped_no_school_data') {
          console.log(`✅ [${syncId}] Company sync completed for preserve plan: ${companyResult.action}`);
        }
      } catch (companyError) {
        console.warn(`⚠️ [${syncId}] Company sync error in preserve plan scenario: ${companyError.message}`);
      }
      
      return { success: true, syncId, email, action: 'updated_preserve_plan', companyResult };
    }
    
    if (activePlans.length === 0) {
      console.log(`📝 [${syncId}] No active plans for ${email} - syncing basic contact data`);
      
      // Create basic contact without plan-specific attributes
      const basicAttributes = {
        FIRSTNAME: memberData.customFields?.['first-name'] || memberData.customFields?.firstName || '',
        LASTNAME: memberData.customFields?.['last-name'] || memberData.customFields?.lastName || '',
        MEMBERSTACK_ID: memberData.id || '',
        REGISTRATION_DATE: memberData.createdAt || new Date().toISOString(),
        LAST_SYNC: new Date().toISOString(),
        // Set default category as pending until plan is selected
        USER_CATEGORY: 'pending',
        PLAN_TYPE: 'none',
        PLAN_NAME: 'No Plan Yet'
      };
      
      try {
        // Check if contact exists
        const existingContact = await getBrevoContact(email);
        
        if (existingContact) {
          // Update existing contact
          await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`, 'PUT', {
            attributes: basicAttributes
          });
          console.log(`✅ [${syncId}] Updated basic contact for ${email} (no plan)`);
          
          // OPTIONAL: Handle school Company sync for basic contact update
          let companyResult = null;
          try {
            const { handleMemberSchoolCompanySync } = await import('./brevo-company-manager.js');
            companyResult = await handleMemberSchoolCompanySync(memberData, email);
          } catch (companyError) {
            console.warn(`⚠️ [${syncId}] Company sync error for basic update: ${companyError.message}`);
          }
          
          return { success: true, syncId, email, action: 'updated_basic', companyResult };
        } else {
          // Create new contact
          await makeBrevoRequest('/contacts', 'POST', {
            email: email,
            listIds: [BREVO_MAIN_LIST.HEY_FEELINGS_LIST],
            attributes: basicAttributes
          });
          console.log(`✅ [${syncId}] Created basic contact for ${email} (no plan)`);
          
          // OPTIONAL: Handle school Company sync for basic contact creation
          let companyResult = null;
          try {
            const { handleMemberSchoolCompanySync } = await import('./brevo-company-manager.js');
            companyResult = await handleMemberSchoolCompanySync(memberData, email);
          } catch (companyError) {
            console.warn(`⚠️ [${syncId}] Company sync error for basic creation: ${companyError.message}`);
          }
          
          return { success: true, syncId, email, action: 'created_basic', companyResult };
        }
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
    
    if (contactResult.success) {
      console.log(`✅ [${syncId}] Brevo Contact sync completed successfully for ${email}`);
      
      // OPTIONAL: Handle school Company sync (if applicable)
      // This is a NON-BREAKING addition - Contact sync already succeeded
      let companyResult = null;
      try {
        const { handleMemberSchoolCompanySync } = await import('./brevo-company-manager.js');
        companyResult = await handleMemberSchoolCompanySync(memberData, email);
        
        if (companyResult.success && companyResult.action !== 'skipped_no_school_data') {
          console.log(`✅ [${syncId}] Company sync also completed: ${companyResult.action} (Company: ${companyResult.companyId})`);
        } else if (companyResult.action === 'skipped_no_school_data') {
          console.log(`📋 [${syncId}] Company sync skipped - no school data for ${email}`);
        } else {
          console.warn(`⚠️ [${syncId}] Company sync failed but Contact sync succeeded: ${companyResult.error}`);
        }
      } catch (companyError) {
        console.warn(`⚠️ [${syncId}] Company sync error but Contact sync succeeded: ${companyError.message}`);
      }
      
      // Return successful Contact result (Company sync is optional and doesn't affect this)
      return { 
        success: true, 
        syncId, 
        email, 
        contactResult,
        companyResult // Optional: include Company result if available
      };
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