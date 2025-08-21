/**
 * api/test-brevo-attributes.js - Test Brevo Attributes After Field Rename
 * 
 * PURPOSE: Verify all Contact and Company attributes after renaming fields in Brevo
 * DEPENDENCIES: brevo-contact-manager.js
 * 
 * REQUEST FORMAT:
 * GET /api/test-brevo-attributes?check=contacts
 * GET /api/test-brevo-attributes?check=companies
 * GET /api/test-brevo-attributes?check=all
 * 
 * RESPONSE FORMAT:
 * {
 *   "success": true,
 *   "contactAttributes": [...],
 *   "companyAttributes": [...],
 *   "verificationStatus": "..."
 * }
 */

import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';
import { setCorsHeaders, handleOptionsRequest, validateMethod } from '../utils/api-utils.js';

// Expected attributes after field rename
const EXPECTED_CONTACT_ATTRIBUTES = [
    // Basic (unchanged)
    'FIRSTNAME', 'LASTNAME', 'PHONE', 'EMAIL',
    
    // Plan info (unchanged)
    'USER_CATEGORY', 'PLAN_TYPE', 'PLAN_NAME', 'PLAN_ID',
    'MEMBERSTACK_ID', 'REGISTRATION_DATE', 'LAST_SYNC', 
    'TEACHER_NAME', 'LMIDS', 'LANGUAGE_PREF',
    
    // RENAMED FIELDS - these should be the NEW names
    'PLACE_PHONE',           // was SCHOOL_PHONE
    'PLACE_ID',              // was SCHOOL_PLACE_ID (CRITICAL!)
    'PLACE_NAME',            // was SCHOOL_PLACE_NAME 
    'PLACE_RATING',          // was SCHOOL_RATING
    'PLACE_CITY',            // was SCHOOL_CITY
    'PLACE_COUNTRY',         // was SCHOOL_COUNTRY
    'PLACE_FACILITY_TYPE',   // was SCHOOL_FACILITY_TYPE
    'PLACE_LATITUDE',        // was SCHOOL_LATITUDE
    'PLACE_LONGITUDE',       // was SCHOOL_LONGITUDE
    'PLACE_STATE',           // was SCHOOL_STATE
    'PLACE_WEBSITE',         // was SCHOOL_WEBSITE
    'PLACE_ZIP',             // was SCHOOL_ZIP
    
    'CONTACT_ROLE',          // was EDUCATOR_ROLE
    'CONTACT_NO_CLASSES',    // was EDUCATOR_NO_CLASSES
    'CONTACT_NO_KIDS',       // was EDUCATOR_NO_KIDS
    
    // These should exist as-is
    'PAYMENTS', 'RESOURCES', 'DISCOVER',
    
    // Company linking
    'COMPANY', 'COMPANY_ID'
];

const EXPECTED_COMPANY_ATTRIBUTES = [
    // RENAMED FIELDS - these should be the NEW names
    'place_address',         // was school_address
    'place_city',            // was school_city
    'place_country',         // was school_country
    'place_id',              // was school_id (CRITICAL!)
    'place_latitude',        // was school_latitude
    'place_longitude',       // was school_longitude
    'place_name',            // was school_name
    'place_phone',           // was school_phone
    'place_postal_code',     // was school_postal_code
    'place_state_province',  // was school_state_province
    'place_street_address',  // was school_street_address__memberdata_customfiel
    'place_website',         // was school_website
    
    // NEW FIELDS
    'total_classes',
    'total_educators', 
    'total_students'
];

export default async function handler(req, res) {
    // Set CORS headers
    setCorsHeaders(res, ['GET', 'OPTIONS']);
    
    // Handle preflight requests
    if (handleOptionsRequest(req, res)) {
        return;
    }
    
    // Validate method
    if (!validateMethod(req, res, 'GET')) {
        return;
    }

    try {
        const { check } = req.query;
        const results = {};
        let overallSuccess = true;

        console.log(`🧪 Verifying Brevo attributes after field rename: ${check || 'all'}`);

        // Check Contact Attributes
        if (!check || check === 'contacts' || check === 'all') {
            console.log('📋 Checking Contact attributes...');
            
            try {
                const contactAttrsResponse = await makeBrevoRequest('/contacts/attributes');
                const contactAttributes = contactAttrsResponse.attributes || [];
                
                // Extract attribute names
                const contactAttrNames = contactAttributes.map(attr => attr.name);
                
                // Check which expected attributes exist
                const missingContactAttrs = EXPECTED_CONTACT_ATTRIBUTES.filter(
                    expected => !contactAttrNames.includes(expected)
                );
                
                // Check for old attribute names that should be gone
                const oldContactAttrs = contactAttrNames.filter(name => 
                    name.startsWith('SCHOOL_') || name.startsWith('EDUCATOR_')
                );
                
                results.contactAttributes = {
                    total: contactAttributes.length,
                    found: contactAttrNames,
                    expectedCount: EXPECTED_CONTACT_ATTRIBUTES.length,
                    missing: missingContactAttrs,
                    oldAttributesStillPresent: oldContactAttrs,
                    success: missingContactAttrs.length === 0 && oldContactAttrs.length === 0
                };
                
                if (!results.contactAttributes.success) {
                    overallSuccess = false;
                }
                
            } catch (error) {
                results.contactAttributes = {
                    success: false,
                    error: error.message
                };
                overallSuccess = false;
            }
        }

        // Check Company Attributes  
        if (!check || check === 'companies' || check === 'all') {
            console.log('🏢 Checking Company attributes...');
            
            try {
                const companyAttrsResponse = await makeBrevoRequest('/crm/attributes/companies');
                const companyAttributes = companyAttrsResponse || [];
                
                // Extract attribute internal names
                const companyAttrNames = companyAttributes.map(attr => attr.internalName);
                
                // Check which expected attributes exist
                const missingCompanyAttrs = EXPECTED_COMPANY_ATTRIBUTES.filter(
                    expected => !companyAttrNames.includes(expected)
                );
                
                // Check for old attribute names that should be gone
                const oldCompanyAttrs = companyAttrNames.filter(name => 
                    name.startsWith('school_')
                );
                
                results.companyAttributes = {
                    total: companyAttributes.length,
                    found: companyAttrNames,
                    expectedCount: EXPECTED_COMPANY_ATTRIBUTES.length,
                    missing: missingCompanyAttrs,
                    oldAttributesStillPresent: oldCompanyAttrs,
                    success: missingCompanyAttrs.length === 0 && oldCompanyAttrs.length === 0
                };
                
                if (!results.companyAttributes.success) {
                    overallSuccess = false;
                }
                
            } catch (error) {
                results.companyAttributes = {
                    success: false,
                    error: error.message
                };
                overallSuccess = false;
            }
        }

        // Summary
        const summary = {
            overallSuccess,
            timestamp: new Date().toISOString(),
            checksPerformed: check || 'all',
            readyForCodeUpdate: overallSuccess
        };

        if (overallSuccess) {
            console.log('✅ All Brevo attributes verified - ready for code update!');
        } else {
            console.log('❌ Some attributes missing or incorrectly named - check results');
        }

        return res.status(200).json({
            success: overallSuccess,
            results,
            summary,
            message: overallSuccess 
                ? 'All attributes verified - code can be updated safely'
                : 'Some issues found - resolve before updating code'
        });

    } catch (error) {
        console.error('❌ Error verifying Brevo attributes:', error.message);
        
        return res.status(500).json({
            success: false,
            error: 'Failed to verify Brevo attributes',
            details: error.message
        });
    }
}
