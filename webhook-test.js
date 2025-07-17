/**
 * webhook-test.js - Production Webhook Test
 * 
 * PURPOSE: Test webhook with TEST_MODE environment variable
 * USAGE: Set TEST_MODE=true in Vercel and run test
 */

const testUser = {
  id: 'mem_prod_test_' + Date.now(),
  auth: { email: 'production.test@example.com' },
  email: 'production.test@example.com',
  planConnections: [{
    planId: 'pln_free-plan-dhnb0ejd', // Educator plan
    active: true,
    status: 'ACTIVE'
  }],
  customFields: {
    'teacher-name': 'Production Test Teacher',
    'school-name': 'Production Test School'
  }
};

const webhook = {
  type: 'member.created',
  data: { member: testUser }
};

async function testWebhook() {
  console.log('🧪 Testing production webhook...');
  console.log(`📧 Test user: ${testUser.email}`);
  
  try {
    const response = await fetch('https://little-microphones.vercel.app/api/memberstack-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhook)
    });

    const result = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📤 Response:`, JSON.stringify(result, null, 2));
    
    if (result.success && result.data?.lmidResult) {
      console.log(`🎯 LMID assigned: ${result.data.lmidResult.assignedLmid}`);
    }
    
    if (result.data?.brevoResult?.success) {
      console.log('📮 Brevo sync: SUCCESS');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testWebhook(); 