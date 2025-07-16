#!/usr/bin/env node

/**
 * test-webhook-security.js - Test Webhook Signature Verification
 * 
 * PURPOSE: Test the implemented webhook signature verification security
 * USAGE: node test-webhook-security.js
 * 
 * TESTS:
 * 1. Test without MEMBERSTACK_WEBHOOK_SECRET (fallback to user-agent)
 * 2. Test with MEMBERSTACK_WEBHOOK_SECRET but no signature
 * 3. Test with invalid signature
 * 4. Test with valid signature
 * 
 * LAST UPDATED: January 2025
 */

import crypto from 'crypto';

// Mock request object
function createMockRequest(userAgent, signature, body) {
    return {
        headers: {
            'user-agent': userAgent,
            'x-memberstack-signature': signature
        },
        body: body
    };
}

// Mock validateMemberstackWebhook function (copy from utils/memberstack-utils.js)
function validateMemberstackWebhook(req, options = {}) {
    const signature = req.headers['x-memberstack-signature'];
    const webhookSecret = process.env.MEMBERSTACK_WEBHOOK_SECRET;
    
    // Jeśli brak secret - fallback na user agent (development)
    if (!webhookSecret) {
        const userAgent = req.headers['user-agent'] || '';
        return {
            valid: userAgent.includes('Memberstack'),
            error: userAgent.includes('Memberstack') ? null : 'Invalid user agent'
        };
    }
    
    // Pełna weryfikacja podpisu
    if (!signature) {
        return { valid: false, error: 'Missing webhook signature' };
    }
    
    try {
        const body = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex');
        
        const providedSignature = signature.replace('sha256=', '');
        
        const isValid = crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        );
        
        return {
            valid: isValid,
            error: isValid ? null : 'Invalid webhook signature'
        };
    } catch (error) {
        return { valid: false, error: 'Signature verification failed' };
    }
}

// Test functions
function testWithoutSecret() {
    console.log('\n🧪 TEST 1: Without MEMBERSTACK_WEBHOOK_SECRET (fallback mode)');
    delete process.env.MEMBERSTACK_WEBHOOK_SECRET;
    
    // Test with valid user agent
    const req1 = createMockRequest('Mozilla/5.0 Memberstack/1.0', null, {});
    const result1 = validateMemberstackWebhook(req1);
    console.log('✅ Valid user agent:', result1);
    
    // Test with invalid user agent
    const req2 = createMockRequest('Mozilla/5.0 Chrome/1.0', null, {});
    const result2 = validateMemberstackWebhook(req2);
    console.log('❌ Invalid user agent:', result2);
}

function testWithSecret() {
    console.log('\n🧪 TEST 2: With MEMBERSTACK_WEBHOOK_SECRET');
    process.env.MEMBERSTACK_WEBHOOK_SECRET = 'test-secret-key';
    
    const testBody = { type: 'member.created', data: { member: { email: 'test@example.com' } } };
    
    // Test without signature
    const req1 = createMockRequest('Memberstack/1.0', null, testBody);
    const result1 = validateMemberstackWebhook(req1);
    console.log('❌ Missing signature:', result1);
    
    // Test with invalid signature
    const req2 = createMockRequest('Memberstack/1.0', 'sha256=invalid-signature', testBody);
    const result2 = validateMemberstackWebhook(req2);
    console.log('❌ Invalid signature:', result2);
    
    // Test with valid signature
    const body = JSON.stringify(testBody);
    const validSignature = crypto
        .createHmac('sha256', 'test-secret-key')
        .update(body)
        .digest('hex');
    
    const req3 = createMockRequest('Memberstack/1.0', `sha256=${validSignature}`, testBody);
    const result3 = validateMemberstackWebhook(req3);
    console.log('✅ Valid signature:', result3);
}

function testTimingSafeComparison() {
    console.log('\n🧪 TEST 3: Timing-safe comparison');
    process.env.MEMBERSTACK_WEBHOOK_SECRET = 'test-secret-key';
    
    const testBody = { type: 'member.created', data: { member: { email: 'test@example.com' } } };
    const body = JSON.stringify(testBody);
    
    // Create a signature that differs by one character
    const correctSignature = crypto
        .createHmac('sha256', 'test-secret-key')
        .update(body)
        .digest('hex');
    
    const incorrectSignature = correctSignature.substring(0, correctSignature.length - 1) + '0';
    
    const req = createMockRequest('Memberstack/1.0', `sha256=${incorrectSignature}`, testBody);
    const result = validateMemberstackWebhook(req);
    console.log('❌ Timing-safe rejection:', result);
}

// Run tests
console.log('🔐 Testing Webhook Signature Verification Security');
console.log('='.repeat(50));

testWithoutSecret();
testWithSecret();
testTimingSafeComparison();

console.log('\n✅ All tests completed!');
console.log('\n📝 Next steps:');
console.log('1. Add MEMBERSTACK_WEBHOOK_SECRET to Vercel environment variables');
console.log('2. Test with real webhook from Memberstack');
console.log('3. Monitor logs for security warnings'); 