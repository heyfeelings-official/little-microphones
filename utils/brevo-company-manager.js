/**
 * utils/brevo-company-manager.js - Brevo Companies Management
 * 
 * PURPOSE: Handle school/organization Companies creation and Contact linking
 * DEPENDENCIES: Brevo API, brevo-contact-manager.js
 * 
 * IMPORTANT: This module EXTENDS existing contact sync - does NOT replace it
 * All existing User sync functionality remains unchanged.
 * 
 * FUNCTIONS:
 * - createOrUpdateSchoolCompany(): Create/update school as Brevo Company
 * - linkContactToSchoolCompany(): Link Contact to school Company  
 * - findSchoolCompanyByData(): Find existing Company by school data
 * - generateSchoolCompanyKey(): Generate unique key for school identification
 * - extractSchoolDataFromMember(): Extract school data from Memberstack member
 * 
 * COMPANY DATA MAPPING:
 * - Source: Educator onboarding form (hey-feelings-v2.webflow.io/members/educators/onboarding)
 * - Target: Brevo Company with attributes and linked Contacts
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0 (Initial Implementation)
 * STATUS: Development Ready ⚠️
 */

import { makeBrevoRequest } from './brevo-contact-manager.js';

// ===== COMPANY IDENTIFICATION =====

/**
 * Generate unique key for school identification (for deduplication)
 * @param {Object} schoolData - School data object
 * @returns {string} Unique school identifier
 */
export function generateSchoolCompanyKey(schoolData) {
    if (!schoolData?.name || !schoolData?.city) {
        return null;
    }
    
    // Create normalized key: schoolname_city_country
    const name = schoolData.name.toLowerCase().trim();
    const city = schoolData.city.toLowerCase().trim();
    const country = (schoolData.country || '').toLowerCase().trim();
    
    return `${name}_${city}_${country}`
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

/**
 * Extract school data from Memberstack member data
 * @param {Object} memberData - Member data from Memberstack
 * @returns {Object|null} School data object or null if insufficient data
 */
export function extractSchoolDataFromMember(memberData) {
    // Extract school data from various possible field locations
    // Check BOTH new onboarding field names AND legacy field names
    // Note: Webhook sends fields WITHOUT 'school-' prefix, but Memberstack UI shows WITH prefix
    const schoolName = memberData.customFields?.['place-name'] ||        // Webhook: without prefix
                       memberData.customFields?.['school-place-name'] || // Memberstack UI: with prefix
                       memberData.customFields?.['school-name'] || 
                       memberData.customFields?.schoolName ||
                       memberData.customFields?.['school'] || 
                       memberData.customFields?.school ||
                       memberData.metaData?.schoolName;
                       
    const schoolCity = memberData.customFields?.['city'] ||              // Webhook: without prefix
                       memberData.customFields?.['school-city'] ||      // Memberstack UI: with prefix
                       memberData.customFields?.schoolCity ||
                       memberData.metaData?.schoolCity;
                       
    const schoolCountry = memberData.customFields?.['country'] ||        // Webhook: without prefix
                          memberData.customFields?.['school-country'] || // Memberstack UI: with prefix
                          memberData.customFields?.schoolCountry ||
                          memberData.metaData?.schoolCountry;
    
    // Must have at minimum: name and city to be a valid school
    if (!schoolName || !schoolCity) {
        return null;
    }
    
    // Check if this is an educator/therapist based on:
    // 1. Plan connections (if available)
    // 2. Role field from onboarding
    // 3. Presence of school data itself
    const userCategory = memberData.planConnections?.find(conn => 
        conn.status === 'ACTIVE' || conn.active === true
    )?.planId;
    
    const hasEducatorPlan = userCategory && (
        userCategory.includes('educators') || 
        userCategory.includes('therapists') ||
        userCategory.includes('school') ||
        userCategory.includes('classroom')
    );
    
    const hasEducatorRole = memberData.customFields?.['role'] && (
        memberData.customFields['role'].toLowerCase().includes('teacher') ||
        memberData.customFields['role'].toLowerCase().includes('educator') ||
        memberData.customFields['role'].toLowerCase().includes('therapist') ||
        memberData.customFields['role'].toLowerCase().includes('counselor')
    );
    
    // Process if: has educator plan OR has educator role OR has valid school data
    const shouldProcessCompany = hasEducatorPlan || hasEducatorRole || (schoolName && schoolCity);
    
    if (!shouldProcessCompany) {
        console.log(`⚠️ Skipping Company creation - not an educator/therapist:`, {
            hasEducatorPlan,
            hasEducatorRole,
            hasSchoolData: !!(schoolName && schoolCity),
            role: memberData.customFields?.['role']
        });
        return null;
    }
    
    return {
        name: schoolName.trim(),
        city: schoolCity.trim(),
        country: schoolCountry?.trim() || '',
        address: memberData.customFields?.['street-address'] ||         // Webhook: without prefix
                 memberData.customFields?.['school-street-address'] ||  // Alternative naming
                 memberData.customFields?.['school-address'] ||         // Memberstack UI: with prefix
                 memberData.customFields?.schoolAddress ||
                 memberData.customFields?.['school_address'] || 
                 memberData.metaData?.schoolAddress || '',
        phone: memberData.customFields?.['phone'] ||                     // Webhook: without prefix
               memberData.customFields?.['school-phone'] ||             // Memberstack UI: with prefix
               memberData.customFields?.schoolPhone ||
               memberData.metaData?.schoolPhone || '',
        website: memberData.customFields?.['website'] ||                 // Webhook: without prefix
                 memberData.customFields?.['school-website'] ||          // Memberstack UI: with prefix
                 memberData.customFields?.schoolWebsite ||
                 memberData.metaData?.schoolWebsite || '',
        facilityType: memberData.customFields?.['facility-type'] ||      // Webhook: without prefix
                      memberData.customFields?.['school-facility-type'] || // Memberstack UI: with prefix
                      memberData.customFields?.['school-type'] || 
                      memberData.customFields?.schoolType ||
                      memberData.metaData?.schoolFacilityType || '',
        rating: memberData.customFields?.['rating'] ||                   // Webhook: without prefix (if exists)
                memberData.customFields?.['school-rating'] ||            // Memberstack UI: with prefix
                memberData.customFields?.schoolRating ||
                memberData.metaData?.schoolRating || '',
        placeId: memberData.customFields?.['place-id'] ||                // Webhook: without prefix
                 memberData.customFields?.['school-place-id'] ||         // Memberstack UI: with prefix
                 memberData.customFields?.schoolPlaceId ||
                 memberData.metaData?.schoolPlaceId || ''
    };
}

// ===== COMPANY CRUD OPERATIONS =====

/**
 * Find existing school Company by school data
 * @param {Object} schoolData - School data to search for
 * @returns {Promise<Object|null>} Company object or null if not found
 */
export async function findSchoolCompanyByData(schoolData) {
    const syncId = Math.random().toString(36).substring(2, 15);
    
    try {
        console.log(`🔍 [${syncId}] Searching for existing Company: ${schoolData.name} in ${schoolData.city}`);
        
        // Search for companies by name (Brevo API doesn't support complex filtering)
        const response = await makeBrevoRequest('/companies?limit=100', 'GET');
        
        if (!response || !response.companies) {
            console.log(`📋 [${syncId}] No existing companies found in Brevo`);
            return null;
        }
        
        // Find match by name and city (manual filtering)
        const schoolKey = generateSchoolCompanyKey(schoolData);
        
        for (const company of response.companies) {
            const companyKey = generateSchoolCompanyKey({
                name: company.attributes?.name || company.name,
                city: company.attributes?.city || '',
                country: company.attributes?.country || ''
            });
            
            if (companyKey === schoolKey) {
                console.log(`✅ [${syncId}] Found existing Company: ${company.id} for ${schoolData.name}`);
                return company;
            }
        }
        
        console.log(`📋 [${syncId}] No existing Company found for ${schoolData.name} in ${schoolData.city}`);
        return null;
        
    } catch (error) {
        console.error(`❌ [${syncId}] Error searching for Company:`, error.message);
        return null;
    }
}

/**
 * Create or update school Company in Brevo
 * @param {Object} schoolData - School data object
 * @returns {Promise<Object>} Operation result with Company ID
 */
export async function createOrUpdateSchoolCompany(schoolData) {
    const syncId = Math.random().toString(36).substring(2, 15);
    
    console.log(`🏫 [${syncId}] Creating/updating school Company: ${schoolData.name}`);
    
    try {
        // Check if Company already exists
        const existingCompany = await findSchoolCompanyByData(schoolData);
        
        // Prepare Company data with only standard Brevo Company attributes
        // Note: Brevo Companies have limited attribute support compared to Contacts
        const companyData = {
            name: schoolData.name,
            attributes: {
                // Standard Brevo Company attributes only
                domain: (() => {
                    try {
                        return schoolData.website ? new URL(schoolData.website).hostname : '';
                    } catch (e) {
                        return schoolData.website || '';
                    }
                })(),
                number_of_employees: 0, // Will be updated when we have teacher count
                phone_number: schoolData.phone || '',
                address: schoolData.address || '',
                city: schoolData.city || '',
                country: schoolData.country || '',
                
                // Note: Custom attributes like facility_type, rating, place_id cause 400 errors
                // These are stored in Contact attributes instead
            }
        };
        
        let result;
        
        if (existingCompany) {
            // Update existing Company
            console.log(`🔄 [${syncId}] Updating existing Company: ${existingCompany.id}`);
            
            // Note: Brevo Companies don't support custom timestamps
            // Remove any system fields for update
            
            result = await makeBrevoRequest(`/companies/${existingCompany.id}`, 'PATCH', companyData);
            
            console.log(`✅ [${syncId}] Updated Company: ${existingCompany.id} for ${schoolData.name}`);
            
            return {
                success: true,
                syncId,
                action: 'updated',
                companyId: existingCompany.id,
                companyName: schoolData.name
            };
        } else {
            // Create new Company
            console.log(`🆕 [${syncId}] Creating new Company for: ${schoolData.name}`);
            
            result = await makeBrevoRequest('/companies', 'POST', companyData);
            
            const newCompanyId = result.id;
            console.log(`✅ [${syncId}] Created new Company: ${newCompanyId} for ${schoolData.name}`);
            
            return {
                success: true,
                syncId,
                action: 'created',
                companyId: newCompanyId,
                companyName: schoolData.name
            };
        }
        
    } catch (error) {
        console.error(`❌ [${syncId}] Error creating/updating Company for ${schoolData.name}:`, error.message);
        return {
            success: false,
            syncId,
            error: error.message,
            schoolName: schoolData.name
        };
    }
}

/**
 * Link Contact to school Company in Brevo
 * @param {string} contactEmail - Contact email address
 * @param {string} companyId - Brevo Company ID
 * @returns {Promise<Object>} Linking result
 */
export async function linkContactToSchoolCompany(contactEmail, companyId) {
    const syncId = Math.random().toString(36).substring(2, 15);
    
    console.log(`🔗 [${syncId}] Linking Contact ${contactEmail} to Company ${companyId}`);
    
    try {
        // Link Contact to Company using Brevo API
        const linkData = {
            linkContactIds: [contactEmail], // Brevo accepts email as contact identifier
            unlinkContactIds: []
        };
        
        const result = await makeBrevoRequest(`/companies/${companyId}/link`, 'PATCH', linkData);
        
        console.log(`✅ [${syncId}] Successfully linked Contact ${contactEmail} to Company ${companyId}`);
        
        return {
            success: true,
            syncId,
            contactEmail,
            companyId,
            action: 'linked'
        };
        
    } catch (error) {
        console.error(`❌ [${syncId}] Error linking Contact ${contactEmail} to Company ${companyId}:`, error.message);
        return {
            success: false,
            syncId,
            contactEmail,
            companyId,
            error: error.message
        };
    }
}

// ===== INTEGRATED SYNC FUNCTION =====

/**
 * Handle complete school Company sync for a member (if applicable)
 * This function is designed to be called FROM syncMemberToBrevo() after Contact sync
 * 
 * @param {Object} memberData - Member data from Memberstack
 * @param {string} contactEmail - Contact email (already synced)
 * @returns {Promise<Object>} Company sync result
 */
export async function handleMemberSchoolCompanySync(memberData, contactEmail) {
    const syncId = Math.random().toString(36).substring(2, 15);
    
    try {
        // Extract school data from member
        const schoolData = extractSchoolDataFromMember(memberData);
        
        if (!schoolData) {
            console.log(`📋 [${syncId}] No school data found for ${contactEmail} - skipping Company sync`, {
                hasCustomFields: !!memberData.customFields,
                customFieldsKeys: Object.keys(memberData.customFields || {}),
                placeName: memberData.customFields?.['place-name'],
                city: memberData.customFields?.['city'],
                role: memberData.customFields?.['role']
            });
            return { success: true, action: 'skipped_no_school_data' };
        }
        
        console.log(`🏫 [${syncId}] Processing Company sync for ${contactEmail} at ${schoolData.name}`);
        
        // Create or update school Company
        const companyResult = await createOrUpdateSchoolCompany(schoolData);
        
        if (!companyResult.success) {
            console.error(`❌ [${syncId}] Company creation failed for ${schoolData.name}:`, companyResult.error);
            return {
                success: false,
                syncId,
                action: 'company_creation_failed',
                error: companyResult.error
            };
        }
        
        // Link Contact to Company
        const linkResult = await linkContactToSchoolCompany(contactEmail, companyResult.companyId);
        
        if (!linkResult.success) {
            console.error(`❌ [${syncId}] Contact linking failed for ${contactEmail}:`, linkResult.error);
            return {
                success: false,
                syncId,
                action: 'linking_failed',
                error: linkResult.error,
                companyId: companyResult.companyId
            };
        }
        
        console.log(`✅ [${syncId}] Complete Company sync successful for ${contactEmail} → Company ${companyResult.companyId}`);
        
        return {
            success: true,
            syncId,
            action: 'complete_sync',
            contactEmail,
            companyId: companyResult.companyId,
            companyName: companyResult.companyName,
            companyAction: companyResult.action,
            linkAction: linkResult.action
        };
        
    } catch (error) {
        console.error(`❌ [${syncId}] Error in Company sync for ${contactEmail}:`, error.message);
        return {
            success: false,
            syncId,
            action: 'sync_error',
            error: error.message
        };
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Test Company functionality with sample school data
 * @returns {Promise<Object>} Test result
 */
export async function testCompanyFunctionality() {
    const testSchoolData = {
        name: 'Test Primary School',
        city: 'Test City',
        country: 'Test Country',
        address: '123 Test Street',
        phone: '+1234567890',
        website: 'www.testschool.edu',
        facilityType: 'Primary School',
        rating: '4.5'
    };
    
    console.log('🧪 Testing Company functionality...');
    
    try {
        // Test Company creation
        const companyResult = await createOrUpdateSchoolCompany(testSchoolData);
        
        if (!companyResult.success) {
            return { success: false, error: 'Company creation test failed' };
        }
        
        console.log('✅ Company functionality test passed');
        return { 
            success: true, 
            companyId: companyResult.companyId,
            action: companyResult.action
        };
        
    } catch (error) {
        console.error('❌ Company functionality test failed:', error.message);
        return { success: false, error: error.message };
    }
}