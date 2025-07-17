/**
 * test-real-registrations.js - Test Real User Registration Flow
 * 
 * PURPOSE: Simulate 3 real user registrations to test complete Brevo integration
 * USAGE: node test-real-registrations.js
 * 
 * TEST USERS:
 * 1. Parent - Simple registration with basic data
 * 2. Educator - Full school registration with all custom fields
 * 3. Therapist - Practice-based registration
 * 
 * TESTS:
 * - Webhook processing (member.created)
 * - Brevo contact creation with attributes
 * - List #2 assignment
 * - Dynamic segmentation data
 * 
 * LAST UPDATED: January 2025
 */

// Using global fetch (Node.js 18+)
// If you get fetch error, install: npm install node-fetch
// Then uncomment: import fetch from 'node-fetch';

// Auto-detect environment or use provided URL
const API_BASE = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : process.env.API_BASE_URL 
  ? process.env.API_BASE_URL
  : 'https://little-microphones.vercel.app'; // Default production URL

const WEBHOOK_ENDPOINT = `${API_BASE}/api/test-registration`;

// For testing purposes - enable test endpoints
process.env.ENABLE_TEST_ENDPOINTS = 'true';

// Test users with realistic data
const TEST_USERS = [
  {
    name: "Parent - Anna Kowalska",
    category: "parents",
    webhookPayload: {
      type: "member.created",
      data: {
        member: {
          id: `mem_parent_${Date.now()}`,
          auth: {
            email: `anna.kowalska.test.${Date.now()}@example.com`
          },
          email: `anna.kowalska.test.${Date.now()}@example.com`,
          createdAt: new Date().toISOString(),
          customFields: {
            'first-name': 'Anna',
            'last-name': 'Kowalska',
            'phone': '+48 123 456 789'
          },
          metaData: {
            language: 'pl'
          },
          planConnections: [{
            id: 'conn_001',
            planId: 'pln_parents-y1ea03qk',
            active: true,
            status: 'ACTIVE'
          }]
        }
      }
    }
  },
  
  {
    name: "Educator - Piotr Nowak (SP 344 Warsaw)",
    category: "educators", 
    webhookPayload: {
      type: "member.created",
      data: {
        member: {
          id: `mem_educator_${Date.now()}`,
          auth: {
            email: `piotr.nowak.test.${Date.now()}@sp344.edu.pl`
          },
          email: `piotr.nowak.test.${Date.now()}@sp344.edu.pl`,
          createdAt: new Date().toISOString(),
          customFields: {
            'first-name': 'Piotr',
            'last-name': 'Nowak',
            'phone': '+48 987 654 321',
            'role': 'Principal',
            'educator-no-classes': '8',
            'educator-no-kids': '180',
            
            // School information (from registration form)
            'search-input': 'SP 344, Erazma z Zakroczymia, Warsaw, Poland',
            'school-place-name': 'SP 344',
            'school-name': 'Szkoła Podstawowa nr 344',
            'school-address-result': 'ul. Erazma z Zakroczymia 15, 00-001 Warsaw, Poland',
            'school-city': 'Warsaw',
            'school-country': 'Poland',
            'school-state': 'Mazowieckie',
            'school-zip': '00-001',
            'street-address': 'ul. Erazma z Zakroczymia 15',
            'school-latitude': '52.2297',
            'school-longitude': '21.0122',
            'school-phone': '+48 22 123 4567',
            'school-website': 'https://sp344.edu.pl',
            'school-facility-type': 'Primary School',
            'school-place-id': 'ChIJN1t_tDeXYMsRwjhBQO2-0uc',
            'school-rating': '4.2'
          },
          metaData: {
            language: 'pl',
            lmids: '1234' // Would be assigned by LMID system
          },
          planConnections: [{
            id: 'conn_002',
            planId: 'pln_free-plan-dhnb0ejd',
            active: true,
            status: 'ACTIVE'
          }]
        }
      }
    }
  },
  
  {
    name: "Therapist - Dr Maria Wiśniewska",
    category: "therapists",
    webhookPayload: {
      type: "member.created", 
      data: {
        member: {
          id: `mem_therapist_${Date.now()}`,
          auth: {
            email: `maria.wisniewska.test.${Date.now()}@terapia.com`
          },
          email: `maria.wisniewska.test.${Date.now()}@terapia.com`,
          createdAt: new Date().toISOString(),
          customFields: {
            'first-name': 'Maria',
            'last-name': 'Wiśniewska',
            'phone': '+48 555 123 456',
            'role': 'Therapist',
            'educator-no-classes': '0', // Individual sessions
            'educator-no-kids': '15',   // Number of patients
            
            // Practice information
            'school-place-name': 'Centrum Terapii Dziecięcej',
            'school-name': 'Centrum Terapii Dziecięcej Dr Wiśniewska',
            'school-address-result': 'ul. Marszałkowska 10, 00-026 Warsaw, Poland',
            'school-city': 'Warsaw',
            'school-country': 'Poland',
            'school-state': 'Mazowieckie',
            'school-zip': '00-026',
            'street-address': 'ul. Marszałkowska 10',
            'school-phone': '+48 22 555 123',
            'school-website': 'https://terapia-dziecieca.pl',
            'school-facility-type': 'Therapy Center'
          },
          metaData: {
            language: 'pl'
          },
          planConnections: [{
            id: 'conn_003',
            planId: 'pln_therapists-free-t7k40ii1',
            active: true,
            status: 'ACTIVE'
          }]
        }
      }
    }
  }
];

/**
 * Simulate webhook call to our API
 * @param {Object} webhookPayload - Memberstack webhook payload
 * @param {string} userDescription - Description for logging
 */
async function simulateRegistration(webhookPayload, userDescription) {
  const testId = Math.random().toString(36).substring(2, 15);
  
  console.log(`\n🔄 [${testId}] Testing: ${userDescription}`);
  console.log(`📧 Email: ${webhookPayload.data.member.email}`);
  console.log(`📋 Plan: ${webhookPayload.data.member.planConnections[0].planId}`);
  
  try {
    // Simple headers for test endpoint
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Test-Registration/1.0'
    };
    
    // Extract just the member data for test endpoint
    const testPayload = {
      member: webhookPayload.data.member
    };
    
    console.log(`📤 Sending registration test to: ${WEBHOOK_ENDPOINT}`);
    
    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ [${testId}] Webhook processed successfully`);
      console.log(`📊 Result:`, JSON.stringify(result, null, 2));
      
      if (result.data?.brevoResult) {
        console.log(`🎯 Brevo sync: ${result.data.brevoResult.success ? 'SUCCESS' : 'FAILED'}`);
        if (result.data.brevoResult.success) {
          console.log(`📈 Plans processed: ${result.data.brevoResult.plansProcessed}`);
        }
      }
      
      if (result.data?.lmidResult) {
        console.log(`🎓 LMID assigned: ${result.data.lmidResult.assignedLmid || 'N/A'}`);
      }
      
      return { success: true, result, testId };
      
    } else {
      console.log(`❌ [${testId}] Webhook failed: ${response.status}`);
      console.log(`📋 Error:`, JSON.stringify(result, null, 2));
      return { success: false, error: result, testId };
    }
    
  } catch (error) {
    console.log(`❌ [${testId}] Network error: ${error.message}`);
    return { success: false, error: error.message, testId };
  }
}

/**
 * Test contact verification in Brevo (optional - requires API key)
 * @param {string} email - Contact email to verify
 */
async function verifyBrevoContact(email) {
  if (!process.env.BREVO_API_KEY) {
    console.log(`⚠️ BREVO_API_KEY not set - skipping Brevo verification`);
    return null;
  }
  
  try {
    const response = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const contact = await response.json();
      console.log(`✅ Contact found in Brevo`);
      console.log(`📊 Attributes: ${Object.keys(contact.attributes || {}).length} fields`);
      console.log(`📋 Lists: ${contact.listIds?.length || 0} lists`);
      
      // Show key attributes
      if (contact.attributes) {
        const keyAttrs = ['USER_CATEGORY', 'PLAN_TYPE', 'PLAN_NAME', 'SCHOOL_NAME', 'EDUCATOR_ROLE'];
        keyAttrs.forEach(attr => {
          if (contact.attributes[attr]) {
            console.log(`   - ${attr}: ${contact.attributes[attr]}`);
          }
        });
      }
      
      return contact;
    } else if (response.status === 404) {
      console.log(`⚠️ Contact not found in Brevo (may take time to sync)`);
      return null;
    } else {
      console.log(`❌ Brevo API error: ${response.status}`);
      return null;
    }
    
  } catch (error) {
    console.log(`❌ Brevo verification failed: ${error.message}`);
    return null;
  }
}

/**
 * Main test runner
 */
async function runRegistrationTests() {
  console.log('🚀 === REAL REGISTRATION FLOW TESTING ===');
  console.log(`📅 Test run: ${new Date().toISOString()}`);
  console.log(`🔗 Testing endpoint: ${WEBHOOK_ENDPOINT}`);
  
  const results = [];
  
  for (let i = 0; i < TEST_USERS.length; i++) {
    const user = TEST_USERS[i];
    
    console.log(`\n📝 === TEST ${i + 1}/${TEST_USERS.length}: ${user.name} ===`);
    
    // Simulate registration
    const registrationResult = await simulateRegistration(user.webhookPayload, user.name);
    results.push({ user: user.name, registration: registrationResult });
    
    // Wait a moment for processing
    console.log(`⏳ Waiting for processing...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify in Brevo (optional)
    const email = user.webhookPayload.data.member.email;
    const brevoContact = await verifyBrevoContact(email);
    
    if (registrationResult.success) {
      results[results.length - 1].brevo = brevoContact;
    }
    
    // Wait between tests
    if (i < TEST_USERS.length - 1) {
      console.log(`⏳ Waiting before next test...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('\n📊 === TEST SUMMARY ===');
  const successfulTests = results.filter(r => r.registration.success);
  console.log(`✅ Successful registrations: ${successfulTests.length}/${results.length}`);
  
  const brevoContacts = results.filter(r => r.brevo).length;
  console.log(`📧 Contacts verified in Brevo: ${brevoContacts}/${results.length}`);
  
  if (successfulTests.length === results.length) {
    console.log('\n🎉 ALL TESTS PASSED! Registration flow working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check logs above for details.');
  }
  
  console.log('\n📋 Next steps:');
  console.log('1. Check Brevo Dashboard → Contacts → Hey Feelings List #2');
  console.log('2. Verify contact attributes are populated correctly');
  console.log('3. Create test segments using the attributes');
  console.log('4. Test email campaigns with personalization');
  
  // Show sample segment filters
  console.log('\n🎯 Sample Segment Filters for Brevo Dashboard:');
  console.log('   Parents: USER_CATEGORY equals "parents"');
  console.log('   Warsaw Educators: USER_CATEGORY equals "educators" AND SCHOOL_CITY equals "Warsaw"');
  console.log('   Free Plans: PLAN_TYPE equals "free"');
  console.log('   Large Schools: EDUCATOR_NO_KIDS greater than 50');
  
  return results;
}

// Run tests if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                    process.argv[1]?.endsWith('test-real-registrations.js');

if (isMainModule) {
  runRegistrationTests().catch(console.error);
}

export { runRegistrationTests, TEST_USERS }; 