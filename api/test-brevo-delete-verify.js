/**
 * api/test-brevo-delete-verify.js - Verify if attributes were actually deleted
 * 
 * PURPOSE: Test if we can create attribute with same name as "deleted" one
 * If creation fails with "already exists" - delete didn't work
 * If creation succeeds - delete worked but API cache is slow
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
        console.log('Testing if school_id was really deleted...');
        
        const results = {};
        
        // Try to create school_id attribute again
        // If it exists, this will fail
        // If it was deleted, this will succeed
        try {
            const testData = {
                "label": "Test School ID Recreation",
                "attributeType": "text",
                "objectType": "companies"
            };
            
            const result = await makeBrevoRequest('/crm/attributes', 'POST', testData);
            results.schoolIdRecreationTest = {
                success: true,
                message: "school_id was successfully deleted - could recreate attribute",
                newId: result.id
            };
            
            // Now delete the test attribute
            try {
                await makeBrevoRequest(`/crm/attributes/${result.id}`, 'DELETE');
                results.cleanupTestAttribute = { success: true };
            } catch (cleanupError) {
                results.cleanupTestAttribute = { success: false, error: cleanupError.message };
            }
            
        } catch (error) {
            if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                results.schoolIdRecreationTest = {
                    success: false,
                    message: "school_id still exists - delete operation failed",
                    error: error.message
                };
            } else {
                results.schoolIdRecreationTest = {
                    success: false,
                    message: "Unexpected error testing recreation",
                    error: error.message
                };
            }
        }

        // Also check if we can see the current state more clearly
        try {
            const currentAttrs = await makeBrevoRequest('/crm/attributes/companies');
            const schoolAttrs = currentAttrs.filter(attr => attr.internalName.startsWith('school_'));
            const placeAttrs = currentAttrs.filter(attr => attr.internalName.startsWith('place_'));
            
            results.currentState = {
                total: currentAttrs.length,
                schoolAttributesCount: schoolAttrs.length,
                placeAttributesCount: placeAttrs.length,
                schoolAttributes: schoolAttrs.map(a => a.internalName),
                placeAttributes: placeAttrs.map(a => a.internalName)
            };
        } catch (error) {
            results.currentState = { error: error.message };
        }

        return res.status(200).json({
            success: true,
            results,
            conclusion: results.schoolIdRecreationTest?.success 
                ? "Attributes were deleted successfully, API cache might be slow"
                : "Attributes still exist, deletion failed",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error verifying deletion:', error.message);
        
        return res.status(500).json({
            success: false,
            error: 'Failed to verify deletion',
            details: error.message
        });
    }
}
