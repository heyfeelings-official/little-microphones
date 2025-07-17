/**
 * test-webhook-production.js - Test Real Webhook with Secret
 * 
 * PURPOSE: Test memberstack-webhook endpoint with proper signature
 * RUN AFTER: Configuring MEMBERSTACK_WEBHOOK_SECRET in Vercel
 */

import crypto from 'crypto';

// Test user data
const testUser = {
  id: 'mem_test_' + Date.now(),
  auth: { email: 'webhook.test@example.com' },
  email: 'webhook.test@example.com',
  planConnections: [{
    planId: 'pln_free-plan-dhnb0ejd',
    active: true,
    status: 'ACTIVE'
  }],
  customFields: {
    'teacher-name': 'Test Teacher Production',
    'school-name': 'Test School Production'
  }
};

const webhookPayload = {
  type: 'member.created',
  data: { member: testUser }
};

/**
 * Create Memberstack-style webhook signature
 * @param {string} secret - Webhook secret from Memberstack
 * @param {string} payload - JSON payload as string
 * @returns {string} Signature header value
 */
function createMemberstackSignature(secret, payload) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Test webhook with proper signature
 */
async function testWebhookWithSignature() {
  const webhookSecret = process.env.MEMBERSTACK_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.log('❌ MEMBERSTACK_WEBHOOK_SECRET not found in environment');
    console.log('📝 Add it to your .env file for local testing:');
    console.log('   MEMBERSTACK_WEBHOOK_SECRET=whsec_your_secret_here');
    return;
  }

  const payloadString = JSON.stringify(webhookPayload);
  const signature = createMemberstackSignature(webhookSecret, payloadString);
  
  console.log('🧪 Testing webhook with proper signature...');
  console.log(`📧 Test user: ${testUser.email}`);
  console.log(`🔐 Secret configured: ${webhookSecret.substring(0, 10)}...`);
  
  try {
    const response = await fetch('https://little-microphones.vercel.app/api/memberstack-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Memberstack-Signature': signature
      },
      body: payloadString
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Webhook SUCCESS!');
      console.log(`📤 Response:`, JSON.stringify(result, null, 2));
      
      if (result.data.lmidResult) {
        console.log(`🎯 LMID assigned: ${result.data.lmidResult.assignedLmid}`);
      }
      
      if (result.data.brevoResult?.success) {
        console.log('📮 Brevo sync: SUCCESS');
      }
      
    } else {
      console.log('❌ Webhook FAILED');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Request ERROR:', error.message);
  }
}

// Test without signature (should fail)
async function testWebhookWithoutSignature() {
  console.log('\n🔒 Testing webhook WITHOUT signature (should fail)...');
  
  try {
    const response = await fetch('https://little-microphones.vercel.app/api/memberstack-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });

    const result = await response.json();
    
    if (response.status === 401) {
      console.log('✅ Security working - webhook rejected without signature');
    } else {
      console.log('⚠️ Unexpected response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Request ERROR:', error.message);
  }
}

// Run tests
console.log('🚀 === WEBHOOK PRODUCTION TESTING ===');
console.log('📅 Test run:', new Date().toISOString());

await testWebhookWithSignature();
await testWebhookWithoutSignature();

console.log('\n🎯 Next steps after successful test:');
console.log('1. ✅ Webhook security is working');
console.log('2. ✅ LMID assignment is working');  
console.log('3. ✅ Brevo sync is working');
console.log('4. 🔗 Real Memberstack registrations will now work automatically'); 