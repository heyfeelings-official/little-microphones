/**
 * Test Brevo API field clearing methods
 * 
 * This script tests different ways to clear contact fields in Brevo API
 * Usage: node test-brevo-clear-field.js YOUR_API_KEY TEST_EMAIL
 */

import https from 'https';

const API_KEY = process.argv[2];
const TEST_EMAIL = process.argv[3] || 'test@example.com';

if (!API_KEY) {
  console.error('❌ Usage: node test-brevo-clear-field.js YOUR_API_KEY [TEST_EMAIL]');
  process.exit(1);
}

console.log('🧪 Testing Brevo field clearing methods...');
console.log(`📧 Test email: ${TEST_EMAIL}`);
console.log('');

// Test different values for clearing fields
const clearingTests = [
  { name: 'Empty string', value: '' },
  { name: 'Null value', value: null },
  { name: 'Undefined (field omitted)', value: undefined },
  { name: 'String "null"', value: 'null' },
  { name: 'String "NULL"', value: 'NULL' }
];

// Function to make Brevo API request
async function makeBrevoRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.brevo.com',
      path: `/v3${endpoint}`,
      method: method,
      headers: {
        'api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = res.statusCode === 204 ? {} : JSON.parse(responseData);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: result });
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(result)}`));
          }
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}, Response: ${responseData}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main test function
async function runTests() {
  try {
    // Step 1: Create/Update contact with test data
    console.log('1️⃣ Setting up test contact with data...');
    const setupData = {
      email: TEST_EMAIL,
      attributes: {
        FIRSTNAME: 'Test',
        LASTNAME: 'User',
        PHONE: '+48123456789',
        CUSTOM_FIELD: 'Test Value'
      }
    };
    
    await makeBrevoRequest('POST', '/contacts', setupData);
    console.log('✅ Contact created/updated with test data');
    console.log('');
    
    // Wait a bit for data to propagate
    await wait(2000);
    
    // Step 2: Get current contact data
    console.log('2️⃣ Getting current contact data...');
    const currentContact = await makeBrevoRequest('GET', `/contacts/${encodeURIComponent(TEST_EMAIL)}`);
    console.log('Current attributes:', JSON.stringify(currentContact.data.attributes, null, 2));
    console.log('');
    
    // Step 3: Test different clearing methods
    console.log('3️⃣ Testing different field clearing methods...');
    console.log('');
    
    for (const test of clearingTests) {
      console.log(`Testing: ${test.name}`);
      
      try {
        // Build update data based on test type
        const updateData = { attributes: {} };
        
        if (test.value === undefined) {
          // Don't include the field at all
          updateData.attributes.LASTNAME = 'User'; // Keep this field
          // FIRSTNAME is omitted
        } else {
          updateData.attributes.FIRSTNAME = test.value;
        }
        
        // Make update request
        await makeBrevoRequest('PUT', `/contacts/${encodeURIComponent(TEST_EMAIL)}`, updateData);
        console.log('✅ Update successful');
        
        // Wait for update to propagate
        await wait(1000);
        
        // Check result
        const updatedContact = await makeBrevoRequest('GET', `/contacts/${encodeURIComponent(TEST_EMAIL)}`);
        const firstnameValue = updatedContact.data.attributes.FIRSTNAME;
        
        console.log(`Result: FIRSTNAME = ${JSON.stringify(firstnameValue)}`);
        console.log(`Field was ${firstnameValue === null || firstnameValue === '' || firstnameValue === undefined ? 'CLEARED' : 'NOT CLEARED'}`);
        console.log('---');
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        console.log('---');
      }
      
      await wait(1000);
    }
    
    // Step 4: Test removing field completely by omitting in cleanedAttributes pattern
    console.log('');
    console.log('4️⃣ Testing cleanedAttributes pattern (only send non-empty fields)...');
    
    // First set the field again
    await makeBrevoRequest('PUT', `/contacts/${encodeURIComponent(TEST_EMAIL)}`, {
      attributes: { FIRSTNAME: 'Test' }
    });
    
    await wait(1000);
    
    // Now update with cleanedAttributes pattern (field not included)
    const cleanedUpdate = {
      attributes: {
        LASTNAME: 'User',
        PHONE: '+48123456789'
        // FIRSTNAME is not included
      }
    };
    
    await makeBrevoRequest('PUT', `/contacts/${encodeURIComponent(TEST_EMAIL)}`, cleanedUpdate);
    console.log('✅ Update with cleanedAttributes pattern');
    
    await wait(1000);
    
    const finalContact = await makeBrevoRequest('GET', `/contacts/${encodeURIComponent(TEST_EMAIL)}`);
    console.log('Final attributes:', JSON.stringify(finalContact.data.attributes, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
runTests(); 