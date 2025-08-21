/**
 * api/test-brevo-new-attribute.js - Test New Attribute Creation in Brevo
 * 
 * PURPOSE: Test if Brevo changes actual API names or just UI labels
 * 
 * USAGE:
 * 1. User adds "TEST_ATT" attribute in Brevo Dashboard
 * 2. GET /api/test-brevo-new-attribute → Should find "test_att" in API
 * 3. User renames to "TEST_ATT2" in Dashboard
 * 4. GET /api/test-brevo-new-attribute → Check if API changes to "test_att2"
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
        console.log('🧪 Testing new attribute creation/rename behavior...');

        // Check Company Attributes for TEST_ATT variations
        const companyAttrsResponse = await makeBrevoRequest('/crm/attributes/companies');
        const companyAttributes = companyAttrsResponse || [];
        const companyAttrNames = companyAttributes.map(attr => attr.internalName);
        
        // Look for TEST_ATT variations
        const testAttrs = companyAttrNames.filter(name => 
            name.toLowerCase().includes('test_att') || 
            name.toLowerCase().includes('test-att') ||
            name.toLowerCase().includes('testatt')
        );

        // Check Contact Attributes for TEST_ATT variations  
        const contactAttrsResponse = await makeBrevoRequest('/contacts/attributes');
        const contactAttributes = contactAttrsResponse.attributes || [];
        const contactAttrNames = contactAttributes.map(attr => attr.name);
        
        const testContactAttrs = contactAttrNames.filter(name => 
            name.toLowerCase().includes('test_att') || 
            name.toLowerCase().includes('test-att') ||
            name.toLowerCase().includes('testatt')
        );

        return res.status(200).json({
            success: true,
            companyTestAttributes: testAttrs,
            contactTestAttributes: testContactAttrs,
            instructions: {
                step1: "Add TEST_ATT attribute in Brevo Dashboard",
                step2: "Call this endpoint to see API name",
                step3: "Rename to TEST_ATT2 in Dashboard", 
                step4: "Call again to see if API name changes"
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error testing attribute behavior:', error.message);
        
        return res.status(500).json({
            success: false,
            error: 'Failed to test attribute behavior',
            details: error.message
        });
    }
}
