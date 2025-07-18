/**
 * TEST ENDPOINT: Test Brevo Companies API
 * This endpoint tests if the Companies API is accessible and working
 */
import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';

export default async function handler(req, res) {
  // Allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing Brevo Companies API...');
    
    // Test 1: List companies
    console.log('📋 Test 1: Listing companies...');
    const companiesResult = await makeBrevoRequest('/companies?limit=5');
    console.log('✅ Companies list response:', JSON.stringify(companiesResult, null, 2));
    
    // Test 2: Get company attributes
    console.log('📋 Test 2: Getting company attributes...');
    let attributesResult;
    try {
      attributesResult = await makeBrevoRequest('/companies/attributes');
      console.log('✅ Company attributes:', JSON.stringify(attributesResult, null, 2));
    } catch (error) {
      console.log('⚠️ Could not get attributes (might not be the right endpoint):', error.message);
      attributesResult = { error: error.message };
    }
    
    // Test 3: Create test company (only if POST request)
    let createResult = null;
    if (req.method === 'POST' && req.body.createTest) {
      console.log('📋 Test 3: Creating test company...');
      const testCompany = {
        name: `Test School ${Date.now()}`,
        attributes: {
          SCHOOL_PLACE_ID: `test-place-id-${Date.now()}`,
          SCHOOL_NAME: 'Test School',
          SCHOOL_CITY: 'Test City',
          SCHOOL_COUNTRY: 'Poland'
        }
      };
      
      try {
        createResult = await makeBrevoRequest('/companies', 'POST', testCompany);
        console.log('✅ Test company created:', JSON.stringify(createResult, null, 2));
      } catch (error) {
        console.error('❌ Error creating test company:', error.message);
        createResult = { error: error.message };
      }
    }
    
    res.status(200).json({
      success: true,
      tests: {
        listCompanies: {
          success: !!companiesResult.items,
          count: companiesResult.items?.length || 0,
          data: companiesResult
        },
        getAttributes: {
          success: !attributesResult.error,
          data: attributesResult
        },
        createCompany: createResult ? {
          success: !createResult.error,
          data: createResult
        } : { message: 'Send POST request with { "createTest": true } to test company creation' }
      },
      recommendation: companiesResult.items ? 'Companies API is working!' : 'Companies API might have issues'
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    res.status(500).json({ 
      error: 'Test failed', 
      details: error.message,
      recommendation: 'Check if Companies feature is enabled in your Brevo account'
    });
  }
} 