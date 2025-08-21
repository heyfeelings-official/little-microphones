/**
 * api/test-brevo-attribute-management.js - Test Brevo Attribute Creation/Deletion
 * 
 * PURPOSE: Test if we can programmatically add/delete Contact and Company attributes
 * DEPENDENCIES: brevo-contact-manager.js
 * 
 * REQUEST FORMAT:
 * GET /api/test-brevo-attribute-management?action=test_create
 * GET /api/test-brevo-attribute-management?action=test_delete
 * GET /api/test-brevo-attribute-management?action=list_all
 * 
 * RESPONSE FORMAT:
 * {
 *   "success": true,
 *   "results": {...},
 *   "canManageAttributes": true/false
 * }
 */

import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';
import { setCorsHeaders, handleOptionsRequest, validateMethod } from '../utils/api-utils.js';

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

        console.log(`🧪 Testing Brevo attribute management: ${action || 'list_all'}`);

        if (!action || action === 'list_all') {
            // List all Contact attributes
            try {
                const contactAttrs = await makeBrevoRequest('/contacts/attributes');
                results.contactAttributes = {
                    success: true,
                    total: contactAttrs.attributes?.length || 0,
                    names: contactAttrs.attributes?.map(attr => attr.name) || []
                };
            } catch (error) {
                results.contactAttributes = { success: false, error: error.message };
            }

            // List all Company attributes  
            try {
                const companyAttrs = await makeBrevoRequest('/crm/attributes/companies');
                results.companyAttributes = {
                    success: true,
                    total: companyAttrs?.length || 0,
                    names: companyAttrs?.map(attr => attr.internalName) || []
                };
            } catch (error) {
                results.companyAttributes = { success: false, error: error.message };
            }
        }

        if (action === 'test_create') {
            console.log('🧪 Testing attribute creation...');
            
            // Test Contact attribute creation
            try {
                const contactAttrData = {
                    "name": "TEST_CONTACT_NEW",
                    "type": "text"
                };
                
                const contactResult = await makeBrevoRequest('/contacts/attributes', 'POST', contactAttrData);
                results.createContactAttribute = {
                    success: true,
                    result: contactResult
                };
            } catch (error) {
                results.createContactAttribute = {
                    success: false,
                    error: error.message,
                    note: "Contact attribute creation may not be supported via API"
                };
            }

            // Test Company attribute creation
            try {
                const companyAttrData = {
                    "label": "Test Company New",
                    "attributeType": "text",
                    "objectType": "companies"
                };
                
                const companyResult = await makeBrevoRequest('/crm/attributes', 'POST', companyAttrData);
                results.createCompanyAttribute = {
                    success: true,
                    result: companyResult
                };
            } catch (error) {
                results.createCompanyAttribute = {
                    success: false,
                    error: error.message
                };
            }
        }

        if (action === 'test_delete') {
            console.log('🧪 Testing attribute deletion...');
            
            // Test Contact attribute deletion (try to delete test_att if exists)
            try {
                // Contact attributes don't seem to have delete endpoint in standard API
                results.deleteContactAttribute = {
                    success: false,
                    note: "Contact attribute deletion endpoint not found in Brevo API"
                };
            } catch (error) {
                results.deleteContactAttribute = {
                    success: false,
                    error: error.message
                };
            }

            // Test Company attribute deletion (try to delete test_att if exists)  
            try {
                // Check if we can find the attribute ID first
                const attrs = await makeBrevoRequest('/crm/attributes/companies');
                const testAttr = attrs.find(attr => attr.internalName === 'test_att');
                
                if (testAttr) {
                    // Try to delete it (this might not be supported)
                    const deleteResult = await makeBrevoRequest(`/crm/attributes/${testAttr.id}`, 'DELETE');
                    results.deleteCompanyAttribute = {
                        success: true,
                        deleted: testAttr.internalName,
                        result: deleteResult
                    };
                } else {
                    results.deleteCompanyAttribute = {
                        success: false,
                        note: "test_att attribute not found"
                    };
                }
            } catch (error) {
                results.deleteCompanyAttribute = {
                    success: false,
                    error: error.message,
                    note: "Company attribute deletion may not be supported"
                };
            }
        }

        // Determine if we can manage attributes programmatically
        const canCreate = results.createContactAttribute?.success || results.createCompanyAttribute?.success;
        const canDelete = results.deleteContactAttribute?.success || results.deleteCompanyAttribute?.success;
        
        return res.status(200).json({
            success: true,
            action: action || 'list_all',
            results,
            canManageAttributes: {
                canCreate,
                canDelete,
                recommendation: canCreate && canDelete 
                    ? "Can clean up and recreate all attributes programmatically"
                    : "Manual cleanup in Brevo Dashboard required"
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error testing attribute management:', error.message);
        
        return res.status(500).json({
            success: false,
            error: 'Failed to test attribute management',
            details: error.message
        });
    }
}
