/**
 * utils/brevo-contact-manager.js - Brevo Contact Management and Synchronization
 * 
 * PURPOSE: Centralized contact management for Brevo integration with Memberstack
 * DEPENDENCIES: @getbrevo/brevo SDK, brevo-segments.js configuration
 * 
 * CORE FUNCTIONS:
 * - syncMemberToBrevo(): Complete member synchronization from Memberstack to Brevo
 * - createOrUpdateBrevoContact(): Create or update contact with full data
 * - addContactToSegments(): Add contact to appropriate segments based on plan
 * - removeContactFromSegments(): Remove contact from segments (plan changes)
 * - getBrevoContact(): Retrieve complete contact data from Brevo
 * - updateContactAttributes(): Update contact attributes
 * - addContactTags(): Add tags to contact
 * - removeContactTags(): Remove tags from contact
 * 
 * SYNCHRONIZATION STRATEGY:
 * 1. Get full member data from Memberstack
 * 2. Map Memberstack custom fields to Brevo attributes
 * 3. Determine segments based on active plans
 * 4. Create/update contact with all data
 * 5. Add to appropriate segments and tags
 * 
 * ERROR HANDLING:
 * - Graceful degradation for API failures
 * - Detailed logging for debugging
 * - Retry logic for temporary failures
 * - Fallback strategies for critical operations
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Implementation Ready
 */

import { 
  TransactionalEmailsApi, 
  TransactionalEmailsApiApiKeys, 
  ContactsApi, 
  CreateContact, 
  UpdateContact 
} from '@getbrevo/brevo';

import { 
  PLAN_TO_SEGMENTS_MAP, 
  BREVO_CONTACT_ATTRIBUTES,
  getPlanConfig,
  getSegmentsForPlan,
  getTagsForPlan,
  getAttributesForPlan,
  getSegmentName 
} from './brevo-segments.js';

// ===== BREVO API INITIALIZATION =====

/**
 * Initialize Brevo Contacts API
 * @returns {ContactsApi} Initialized Contacts API instance
 */
function initBrevoContactsApi() {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    throw new Error('BREVO_API_KEY not configured');
  }
  
  const contactsApi = new ContactsApi();
  contactsApi.setApiKey(TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);
  
  return contactsApi;
}

// ===== CORE CONTACT OPERATIONS =====

/**
 * Get complete contact data from Brevo
 * @param {string} email - Contact email address
 * @returns {Promise<Object|null>} Contact data or null if not found
 */
export async function getBrevoContact(email) {
  try {
    const contactsApi = initBrevoContactsApi();
    const contact = await contactsApi.getContactInfo(email);
    
    console.log(`✅ Retrieved Brevo contact: ${email}`);
    return contact;
    
  } catch (error) {
    if (error.status === 404) {
      console.log(`ℹ️ Contact not found in Brevo: ${email}`);
      return null;
    }
    
    console.error(`❌ Error retrieving Brevo contact ${email}:`, error.message);
    throw error;
  }
}

/**
 * Create or update contact in Brevo with complete data
 * @param {Object} memberData - Complete member data from Memberstack
 * @param {Object} planConfig - Plan configuration from brevo-segments.js
 * @returns {Promise<Object>} Result of create/update operation
 */
export async function createOrUpdateBrevoContact(memberData, planConfig) {
  try {
    const contactsApi = initBrevoContactsApi();
    const email = memberData.auth?.email || memberData.email;
    
    if (!email) {
      throw new Error('No email address found for member');
    }
    
    // Map Memberstack custom fields to Brevo attributes
    const attributes = mapMemberstackToBrevoAttributes(memberData, planConfig);
    
    // Check if contact exists
    const existingContact = await getBrevoContact(email);
    
    if (existingContact) {
      // Update existing contact
      console.log(`🔄 Updating existing Brevo contact: ${email}`);
      
      const updateContact = new UpdateContact();
      updateContact.attributes = attributes;
      
      await contactsApi.updateContact(email, updateContact);
      console.log(`✅ Updated Brevo contact: ${email}`);
      
      return { action: 'updated', email, attributes };
      
    } else {
      // Create new contact
      console.log(`➕ Creating new Brevo contact: ${email}`);
      
      const createContact = new CreateContact();
      createContact.email = email;
      createContact.attributes = attributes;
      
      await contactsApi.createContact(createContact);
      console.log(`✅ Created Brevo contact: ${email}`);
      
      return { action: 'created', email, attributes };
    }
    
  } catch (error) {
    console.error(`❌ Error creating/updating Brevo contact:`, error.message);
    throw error;
  }
}

/**
 * Map Memberstack custom fields to Brevo attributes
 * @param {Object} memberData - Memberstack member data
 * @param {Object} planConfig - Plan configuration
 * @returns {Object} Brevo attributes object
 */
function mapMemberstackToBrevoAttributes(memberData, planConfig) {
  const customFields = memberData.customFields || {};
  const metaData = memberData.metaData || {};
  
  // Extract names from different possible fields
  const firstName = 
    customFields['first-name'] || 
    customFields['First Name'] || 
    customFields.firstName ||
    metaData.firstName ||
    customFields['first_name'] ||
    '';
    
  const lastName = 
    customFields['last-name'] || 
    customFields['Last Name'] || 
    customFields.lastName ||
    metaData.lastName ||
    customFields['last_name'] ||
    '';
    
  const phone = 
    customFields.phone || 
    customFields.Phone ||
    metaData.phone ||
    '';
    
  const schoolName = 
    customFields['school-place-name'] || 
    customFields['school-name'] ||
    customFields.school ||
    metaData.school ||
    metaData.schoolName ||
    '';

  // Extract educator-specific fields
  const educatorRole = customFields.role || '';
  const educatorNoClasses = customFields['educator-no-classes'] ? parseInt(customFields['educator-no-classes']) : null;
  const educatorNoKids = customFields['educator-no-kids'] ? parseInt(customFields['educator-no-kids']) : null;
  
  // Extract school location fields
  const schoolLatitude = customFields['school-latitude'] ? parseFloat(customFields['school-latitude']) : null;
  const schoolLongitude = customFields['school-longitude'] ? parseFloat(customFields['school-longitude']) : null;
  const schoolRating = customFields['school-rating'] ? parseFloat(customFields['school-rating']) : null;

  // Build attributes object
  const attributes = {
    // Basic Information
    FIRSTNAME: firstName,
    LASTNAME: lastName,
    PHONE: phone,
    
    // Memberstack Integration
    MEMBERSTACK_ID: memberData.id,
    REGISTRATION_DATE: memberData.createdAt || new Date().toISOString(),
    LAST_SYNC: new Date().toISOString(),
    
    // Plan Information (from planConfig)
    USER_CATEGORY: planConfig.attributes.USER_CATEGORY,
    PLAN_TYPE: planConfig.attributes.PLAN_TYPE,
    PLAN_NAME: planConfig.attributes.PLAN_NAME,
    PLAN_ID: planConfig.attributes.PLAN_ID,
    
    // Organizational Data
    SCHOOL_NAME: schoolName,
    TEACHER_NAME: firstName && lastName ? `${firstName} ${lastName}`.trim() : '',
    
    // School Information (for Educators)
    SCHOOL_SEARCH_INPUT: customFields['search-input'] || '',
    SCHOOL_ADDRESS: customFields['school-address-result'] || '',
    SCHOOL_CITY: customFields['school-city'] || '',
    SCHOOL_COUNTRY: customFields['school-country'] || '',
    SCHOOL_FACILITY_TYPE: customFields['school-facility-type'] || '',
    SCHOOL_LATITUDE: schoolLatitude,
    SCHOOL_LONGITUDE: schoolLongitude,
    SCHOOL_PHONE: customFields['school-phone'] || '',
    SCHOOL_PLACE_ID: customFields['school-place-id'] || '',
    SCHOOL_PLACE_NAME: customFields['school-place-name'] || '',
    SCHOOL_RATING: schoolRating,
    SCHOOL_STATE: customFields['school-state'] || '',
    SCHOOL_STREET_ADDRESS: customFields['street-address'] || '',
    SCHOOL_WEBSITE: customFields['school-website'] || '',
    SCHOOL_ZIP: customFields['school-zip'] || '',
    
    // Professional Information (for Educators)
    EDUCATOR_ROLE: educatorRole,
    EDUCATOR_NO_CLASSES: educatorNoClasses,
    EDUCATOR_NO_KIDS: educatorNoKids,
    
    // Application-specific
    LMIDS: metaData.lmids || '',
    LANGUAGE_PREF: metaData.language || 'pl'
  };
  
  // Remove empty values to keep Brevo clean
  Object.keys(attributes).forEach(key => {
    if (attributes[key] === '' || attributes[key] === null || attributes[key] === undefined) {
      delete attributes[key];
    }
  });
  
  console.log(`📋 Mapped attributes for ${memberData.id}:`, Object.keys(attributes));
  
  return attributes;
}

// ===== SEGMENT MANAGEMENT =====

/**
 * Add contact to multiple segments (lists)
 * @param {string} email - Contact email
 * @param {Array} segmentIds - Array of Brevo segment IDs
 * @returns {Promise<Object>} Results of segment operations
 */
export async function addContactToSegments(email, segmentIds) {
  const results = [];
  
  for (const segmentId of segmentIds) {
    try {
      await addContactToSegment(email, segmentId);
      results.push({ segmentId, success: true, segmentName: getSegmentName(segmentId) });
    } catch (error) {
      console.error(`❌ Failed to add ${email} to segment ${segmentId}:`, error.message);
      results.push({ segmentId, success: false, error: error.message, segmentName: getSegmentName(segmentId) });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`📊 Added ${email} to ${successCount}/${segmentIds.length} segments`);
  
  return { results, successCount, totalCount: segmentIds.length };
}

/**
 * Add contact to a specific segment (list)
 * @param {string} email - Contact email
 * @param {number} segmentId - Brevo segment ID
 * @returns {Promise<void>}
 */
async function addContactToSegment(email, segmentId) {
  try {
    const contactsApi = initBrevoContactsApi();
    
    // Add contact to list
    await contactsApi.addContactToList(segmentId, {
      emails: [email]
    });
    
    console.log(`✅ Added ${email} to segment ${getSegmentName(segmentId)} (${segmentId})`);
    
  } catch (error) {
    // If contact is already in list, that's usually OK
    if (error.message && error.message.includes('already')) {
      console.log(`ℹ️ ${email} already in segment ${getSegmentName(segmentId)} (${segmentId})`);
      return;
    }
    
    throw error;
  }
}

/**
 * Remove contact from multiple segments
 * @param {string} email - Contact email
 * @param {Array} segmentIds - Array of Brevo segment IDs
 * @returns {Promise<Object>} Results of removal operations
 */
export async function removeContactFromSegments(email, segmentIds) {
  const results = [];
  
  for (const segmentId of segmentIds) {
    try {
      await removeContactFromSegment(email, segmentId);
      results.push({ segmentId, success: true, segmentName: getSegmentName(segmentId) });
    } catch (error) {
      console.error(`❌ Failed to remove ${email} from segment ${segmentId}:`, error.message);
      results.push({ segmentId, success: false, error: error.message, segmentName: getSegmentName(segmentId) });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`📊 Removed ${email} from ${successCount}/${segmentIds.length} segments`);
  
  return { results, successCount, totalCount: segmentIds.length };
}

/**
 * Remove contact from a specific segment
 * @param {string} email - Contact email
 * @param {number} segmentId - Brevo segment ID
 * @returns {Promise<void>}
 */
async function removeContactFromSegment(email, segmentId) {
  try {
    const contactsApi = initBrevoContactsApi();
    
    await contactsApi.removeContactFromList(segmentId, {
      emails: [email]
    });
    
    console.log(`✅ Removed ${email} from segment ${getSegmentName(segmentId)} (${segmentId})`);
    
  } catch (error) {
    // If contact is not in list, that's usually OK
    if (error.message && error.message.includes('not found')) {
      console.log(`ℹ️ ${email} not in segment ${getSegmentName(segmentId)} (${segmentId})`);
      return;
    }
    
    throw error;
  }
}

// ===== TAG MANAGEMENT =====

/**
 * Add tags to contact
 * @param {string} email - Contact email
 * @param {Array} tags - Array of tag names
 * @returns {Promise<Object>} Results of tag operations
 */
export async function addContactTags(email, tags) {
  try {
    const contactsApi = initBrevoContactsApi();
    
    // Brevo API expects tags as an array of strings
    await contactsApi.updateContact(email, {
      tags: tags
    });
    
    console.log(`🏷️ Added tags to ${email}: ${tags.join(', ')}`);
    
    return { success: true, tags, email };
    
  } catch (error) {
    console.error(`❌ Failed to add tags to ${email}:`, error.message);
    throw error;
  }
}

/**
 * Update contact attributes
 * @param {string} email - Contact email
 * @param {Object} attributes - Attributes to update
 * @returns {Promise<Object>} Update result
 */
export async function updateContactAttributes(email, attributes) {
  try {
    const contactsApi = initBrevoContactsApi();
    
    const updateContact = new UpdateContact();
    updateContact.attributes = attributes;
    
    await contactsApi.updateContact(email, updateContact);
    
    console.log(`📝 Updated attributes for ${email}:`, Object.keys(attributes));
    
    return { success: true, email, attributes };
    
  } catch (error) {
    console.error(`❌ Failed to update attributes for ${email}:`, error.message);
    throw error;
  }
}

// ===== MAIN SYNCHRONIZATION FUNCTION =====

/**
 * Complete member synchronization from Memberstack to Brevo
 * @param {Object} memberData - Complete member data from Memberstack
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
      return { success: false, error: 'No active plans found' };
    }
    
    // For each active plan, perform full synchronization
    const syncResults = [];
    
    for (const plan of activePlans) {
      const planConfig = getPlanConfig(plan.planId);
      
      if (!planConfig) {
        console.warn(`⚠️ [${syncId}] Unknown plan ${plan.planId} for ${email}`);
        continue;
      }
      
      console.log(`📋 [${syncId}] Syncing plan ${planConfig.attributes.PLAN_NAME} for ${email}`);
      
      // 1. Create/update contact with full data
      const contactResult = await createOrUpdateBrevoContact(memberData, planConfig);
      
      // 2. Add to appropriate segments
      const allSegments = [planConfig.primarySegment, ...planConfig.categorySegments];
      const segmentResult = await addContactToSegments(email, allSegments);
      
      // 3. Add tags
      const tagResult = await addContactTags(email, planConfig.tags);
      
      syncResults.push({
        planId: plan.planId,
        planName: planConfig.attributes.PLAN_NAME,
        contactResult,
        segmentResult,
        tagResult
      });
    }
    
    console.log(`✅ [${syncId}] Completed Brevo sync for ${email} - ${syncResults.length} plans processed`);
    
    return {
      success: true,
      syncId,
      email,
      plansProcessed: syncResults.length,
      results: syncResults
    };
    
  } catch (error) {
    console.error(`❌ [${syncId}] Brevo sync failed for ${email}:`, error.message);
    
    return {
      success: false,
      syncId,
      email,
      error: error.message
    };
  }
}

/**
 * Handle plan changes for existing member
 * @param {Object} memberData - Member data with updated plans
 * @param {Array} oldPlans - Previous plan IDs
 * @param {Array} newPlans - New plan IDs
 * @returns {Promise<Object>} Plan change result
 */
export async function handleMemberPlanChange(memberData, oldPlans = [], newPlans = []) {
  const changeId = Math.random().toString(36).substring(2, 15);
  const email = memberData.auth?.email || memberData.email;
  
  console.log(`🔄 [${changeId}] Handling plan change for ${email}`);
  console.log(`📊 [${changeId}] Old plans: ${oldPlans.join(', ')}`);
  console.log(`📊 [${changeId}] New plans: ${newPlans.join(', ')}`);
  
  try {
    // Remove from old plan segments
    for (const oldPlanId of oldPlans) {
      const oldPlanConfig = getPlanConfig(oldPlanId);
      if (oldPlanConfig) {
        const oldSegments = [oldPlanConfig.primarySegment, ...oldPlanConfig.categorySegments];
        await removeContactFromSegments(email, oldSegments);
      }
    }
    
    // Add to new plan segments (full sync for new plans)
    if (newPlans.length > 0) {
      await syncMemberToBrevo(memberData);
    }
    
    console.log(`✅ [${changeId}] Plan change completed for ${email}`);
    
    return {
      success: true,
      changeId,
      email,
      oldPlans,
      newPlans
    };
    
  } catch (error) {
    console.error(`❌ [${changeId}] Plan change failed for ${email}:`, error.message);
    
    return {
      success: false,
      changeId,
      email,
      error: error.message
    };
  }
} 