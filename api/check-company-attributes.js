/**
 * Test endpoint to check which Company attributes exist in Brevo
 */
import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Checking Brevo Company attributes...');
    
    // Try to get company attributes metadata
    // Note: This endpoint might not exist, but let's try
    try {
      const attributes = await makeBrevoRequest('/companies/attributes');
      console.log('✅ Company attributes:', JSON.stringify(attributes, null, 2));
      return res.status(200).json({
        success: true,
        attributes: attributes
      });
    } catch (error) {
      console.log('⚠️ Cannot get attributes metadata:', error.message);
    }
    
    // Alternative: Try to create a test company to see what attributes are accepted
    console.log('🧪 Testing company creation with minimal data...');
    
    try {
      // First test with just name
      const testCompany1 = await makeBrevoRequest('/companies', 'POST', {
        name: 'TEST_COMPANY_DELETE_ME_' + Date.now()
      });
      
      console.log('✅ Basic company creation works!');
      
      // Now test with our attributes
      const testAttributes = {
        SCHOOL_CITY: 'Test City',
        SCHOOL_COUNTRY: 'Test Country',
        SCHOOL_PLACE_ID: 'test_' + Date.now()
      };
      
      const results = {
        basicCreation: 'SUCCESS',
        testedAttributes: {},
        companyId: testCompany1.id
      };
      
      // Test each attribute individually
      for (const [key, value] of Object.entries(testAttributes)) {
        try {
          await makeBrevoRequest(`/companies/${testCompany1.id}`, 'PATCH', {
            attributes: { [key]: value }
          });
          results.testedAttributes[key] = 'EXISTS';
        } catch (error) {
          results.testedAttributes[key] = 'MISSING - ' + error.message;
        }
      }
      
      // Clean up - delete test company
      try {
        await makeBrevoRequest(`/companies/${testCompany1.id}`, 'DELETE');
        results.cleanup = 'SUCCESS';
      } catch (error) {
        results.cleanup = 'FAILED - ' + error.message;
      }
      
      return res.status(200).json(results);
      
    } catch (error) {
      return res.status(200).json({
        basicCreation: 'FAILED',
        error: error.message,
        conclusion: 'Companies API is available but attributes need to be created in Brevo Dashboard'
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
} 