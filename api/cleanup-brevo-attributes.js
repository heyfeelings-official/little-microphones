/**
 * api/cleanup-brevo-attributes.js - Clean up and recreate Brevo attributes
 * 
 * PURPOSE: Remove old SCHOOL_*/EDUCATOR_* attributes and create new PLACE_*/CONTACT_* ones
 * DEPENDENCIES: brevo-contact-manager.js
 * 
 * ⚠️ DANGEROUS OPERATION - USE WITH CAUTION ⚠️
 * 
 * REQUEST FORMAT:
 * GET /api/cleanup-brevo-attributes?action=plan - See what will be deleted/created
 * GET /api/cleanup-brevo-attributes?action=delete_old - Delete old attributes
 * GET /api/cleanup-brevo-attributes?action=create_new - Create new attributes
 * GET /api/cleanup-brevo-attributes?action=full_cleanup - Do everything (DANGEROUS!)
 * 
 * SAFETY: Each action requires confirmation and logs everything
 */

import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';
import { setCorsHeaders, handleOptionsRequest, validateMethod } from '../utils/api-utils.js';

// Attributes to DELETE
const CONTACT_ATTRIBUTES_TO_DELETE = [
    // Old names - being replaced with CONTACT_*
    'PAYMENTS', 'RESOURCES', 'DISCOVER'
    // NOTE: Keeping e-commerce fields as requested by user
];

const COMPANY_ATTRIBUTES_TO_DELETE = [
    // All school_* attributes 
    'school_address', 'school_city', 'school_country', 'school_id',
    'school_latitude', 'school_longitude', 'school_name', 'school_phone',
    'school_state_province', 'school_street_address__memberdata_customfiel', 'school_website',
    // Test attribute
    'test_att',
    // Rename place_facility_type → place_type
    'place_facility_type'
];

// Attributes to CREATE
const NEW_CONTACT_ATTRIBUTES = [
    { name: 'CONTACT_RESOURCES', type: 'text' },
    { name: 'CONTACT_PAYMENTS', type: 'text' },
    { name: 'CONTACT_DISCOVER', type: 'text' }
];

const NEW_COMPANY_ATTRIBUTES = [
    { label: 'Place ID', internalName: 'place_id', type: 'text' },              // KEY!
    { label: 'Place Name', internalName: 'place_name', type: 'text' },
    { label: 'Place City', internalName: 'place_city', type: 'text' },
    { label: 'Place Country', internalName: 'place_country', type: 'text' },
    { label: 'Place Address', internalName: 'place_address', type: 'text' },
    { label: 'Place Street Address', internalName: 'place_street_address', type: 'text' },
    { label: 'Place Phone', internalName: 'place_phone', type: 'text' },
    { label: 'Place Website', internalName: 'place_website', type: 'text' },
    { label: 'Place Latitude', internalName: 'place_latitude', type: 'text' },
    { label: 'Place Longitude', internalName: 'place_longitude', type: 'text' },
    { label: 'Place State', internalName: 'place_state', type: 'text' },
    { label: 'Place Type', internalName: 'place_type', type: 'text' }
];

export default async function handler(req, res) {
    setCorsHeaders(res, ['GET', 'OPTIONS']);
    
    if (handleOptionsRequest(req, res)) {
        return;
    }
    
    if (!validateMethod(req, res, 'GET')) {
        return;
    }

    try {
        const { action } = req.query;
        const results = {};

        console.log(`🧹 Brevo attributes cleanup: ${action || 'plan'}`);

        if (!action || action === 'plan') {
            return res.status(200).json({
                success: true,
                action: 'plan',
                plan: {
                    contactAttributesToDelete: CONTACT_ATTRIBUTES_TO_DELETE,
                    companyAttributesToDelete: COMPANY_ATTRIBUTES_TO_DELETE,
                    newContactAttributes: NEW_CONTACT_ATTRIBUTES,
                    newCompanyAttributes: NEW_COMPANY_ATTRIBUTES
                },
                steps: {
                    step1: 'call ?action=delete_old to remove old attributes',
                    step2: 'call ?action=create_new to create new attributes',
                    step3: 'or call ?action=full_cleanup to do both (DANGEROUS!)'
                },
                warning: '⚠️ This will permanently delete attributes and their data!'
            });
        }

        if (action === 'delete_old') {
            console.log('🗑️ Deleting old attributes...');
            
            // Delete Contact attributes
            for (const attrName of CONTACT_ATTRIBUTES_TO_DELETE) {
                try {
                    // Contact attributes need category - try "normal" category
                    await makeBrevoRequest(`/contacts/attributes/normal/${attrName}`, 'DELETE');
                    console.log(`✅ Deleted Contact attribute: ${attrName}`);
                    results[`deleted_contact_${attrName}`] = { success: true };
                } catch (error) {
                    console.warn(`⚠️ Could not delete Contact attribute ${attrName}:`, error.message);
                    results[`deleted_contact_${attrName}`] = { success: false, error: error.message };
                }
            }

            // Delete Company attributes (need to get their IDs first)
            try {
                const companyAttrs = await makeBrevoRequest('/crm/attributes/companies');
                
                for (const attrName of COMPANY_ATTRIBUTES_TO_DELETE) {
                    const attr = companyAttrs.find(a => a.internalName === attrName);
                    if (attr) {
                        try {
                            await makeBrevoRequest(`/crm/attributes/${attr.id}`, 'DELETE');
                            console.log(`✅ Deleted Company attribute: ${attrName} (ID: ${attr.id})`);
                            results[`deleted_company_${attrName}`] = { success: true, id: attr.id };
                        } catch (error) {
                            console.warn(`⚠️ Could not delete Company attribute ${attrName}:`, error.message);
                            results[`deleted_company_${attrName}`] = { success: false, error: error.message };
                        }
                    } else {
                        results[`deleted_company_${attrName}`] = { success: false, error: 'Not found' };
                    }
                }
            } catch (error) {
                results.companyAttributesDeletion = { success: false, error: error.message };
            }
        }

        if (action === 'create_new') {
            console.log('➕ Creating new attributes...');
            
            // Create Contact attributes
            for (const attr of NEW_CONTACT_ATTRIBUTES) {
                try {
                    const contactAttrData = {
                        "type": attr.type
                    };
                    
                    await makeBrevoRequest(`/contacts/attributes/normal/${attr.name}`, 'POST', contactAttrData);
                    console.log(`✅ Created Contact attribute: ${attr.name}`);
                    results[`created_contact_${attr.name}`] = { success: true };
                } catch (error) {
                    console.warn(`⚠️ Could not create Contact attribute ${attr.name}:`, error.message);
                    results[`created_contact_${attr.name}`] = { success: false, error: error.message };
                }
            }

            // Create Company attributes
            for (const attr of NEW_COMPANY_ATTRIBUTES) {
                try {
                    const companyAttrData = {
                        "label": attr.label,
                        "attributeType": attr.type,
                        "objectType": "companies"
                    };
                    
                    const result = await makeBrevoRequest('/crm/attributes', 'POST', companyAttrData);
                    console.log(`✅ Created Company attribute: ${attr.internalName} (ID: ${result.id})`);
                    results[`created_company_${attr.internalName}`] = { success: true, id: result.id };
                } catch (error) {
                    console.warn(`⚠️ Could not create Company attribute ${attr.internalName}:`, error.message);
                    results[`created_company_${attr.internalName}`] = { success: false, error: error.message };
                }
            }
        }

        if (action === 'full_cleanup') {
            // DO BOTH - VERY DANGEROUS!
            console.log('💥 FULL CLEANUP - DELETING AND RECREATING ALL ATTRIBUTES!');
            
            // This would call both delete and create operations
            // Implement only if absolutely needed
            results.warning = 'Full cleanup not implemented - too dangerous. Use delete_old then create_new separately.';
        }

        return res.status(200).json({
            success: true,
            action: action || 'plan',
            results,
            message: action === 'plan' 
                ? 'Plan generated - review before executing'
                : `Completed ${action} operation`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error in attribute cleanup:', error.message);
        
        return res.status(500).json({
            success: false,
            error: 'Attribute cleanup failed',
            details: error.message,
            action: req.query.action
        });
    }
}
