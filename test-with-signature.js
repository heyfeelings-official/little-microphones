/**
 * test-with-signature.js - Test with proper webhook signature
 * 
 * PURPOSE: Test single registration with proper HMAC signature
 * USAGE: MEMBERSTACK_WEBHOOK_SECRET=your_secret node test-with-signature.js
 */

import crypto from 'crypto';

// Simple test function
async function testWithSignature() {
  const webhookSecret = process.env.MEMBERSTACK_WEBHOOK_SECRET || 'test-secret-key';
  
  const payload = {
    type: "member.created",
    data: {
      member: {
        id: `mem_test_${Date.now()}`,
        auth: { email: `test.user.${Date.now()}@example.com` },
        email: `test.user.${Date.now()}@example.com`,
        createdAt: new Date().toISOString(),
        customFields: {
          'first-name': 'Test',
          'last-name': 'User',
          'role': 'Principal',
          'educator-no-kids': '150'
        },
        metaData: { language: 'pl' },
        planConnections: [{
          id: 'conn_test',
          planId: 'pln_free-plan-dhnb0ejd',
          active: true,
          status: 'ACTIVE'
        }]
      }
    }
  };
  
  const body = JSON.stringify(payload);
  
  // Generate HMAC signature
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');
  
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Memberstack-Webhooks/1.0',
    'x-memberstack-signature': `sha256=${signature}`
  };
  
  console.log('🧪 Testing with proper signature...');
  console.log('📧 Email:', payload.data.member.email);
  console.log('🔐 Signature:', `sha256=${signature.substring(0, 16)}...`);
  
  try {
    const response = await fetch('https://little-microphones.vercel.app/api/memberstack-webhook', {
      method: 'POST',
      headers: headers,
      body: body
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS!');
      console.log('📊 Result:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ FAILED:', response.status);
      console.log('📋 Error:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Run if no secret provided
if (!process.env.MEMBERSTACK_WEBHOOK_SECRET) {
  console.log('⚠️ No MEMBERSTACK_WEBHOOK_SECRET provided.');
  console.log('💡 You can either:');
  console.log('1. Set TEST_MODE=true in Vercel Environment Variables');
  console.log('2. Run: MEMBERSTACK_WEBHOOK_SECRET=your_secret node test-with-signature.js');
  console.log('3. Use the test endpoint we will create...');
  
  // Simple test without signature
  console.log('\n🧪 Testing simple endpoint response...');
  
  fetch('https://little-microphones.vercel.app/api/memberstack-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true })
  }).then(r => r.text()).then(console.log).catch(console.error);
  
} else {
  testWithSignature();
} 