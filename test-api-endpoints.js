/**
 * test-api-endpoints.js - API Endpoints Testing Script
 * 
 * This script tests all API endpoints for the Little Microphones radio sharing system
 * Run this script to verify all endpoints are working correctly before production deployment
 */

const API_BASE = 'https://little-microphones.vercel.app';

// Test configuration
const TEST_CONFIG = {
    world: 'spookyland',
    lmid: '32',
    testShareId: 'test-share-id-123',
    testEmail: 'test@example.com'
};

/**
 * Test utility functions
 */
async function testEndpoint(name, url, options = {}) {
    console.log(`\n🧪 Testing ${name}...`);
    console.log(`📡 URL: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log(`✅ ${name} - SUCCESS`);
            console.log(`📊 Status: ${response.status}`);
            console.log(`📋 Response:`, data);
            return { success: true, data, status: response.status };
        } else {
            console.log(`❌ ${name} - FAILED`);
            console.log(`📊 Status: ${response.status}`);
            console.log(`📋 Error:`, data);
            return { success: false, data, status: response.status };
        }
    } catch (error) {
        console.log(`💥 ${name} - ERROR`);
        console.log(`📋 Error:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test all API endpoints
 */
async function runAllTests() {
    console.log('🎵 Little Microphones API Endpoints Testing');
    console.log('==========================================');
    
    const results = [];
    
    // Test 1: List recordings
    console.log('\n📁 TESTING RECORDING ENDPOINTS');
    const listResult = await testEndpoint(
        'List Recordings',
        `${API_BASE}/api/list-recordings?world=${TEST_CONFIG.world}&lmid=${TEST_CONFIG.lmid}`
    );
    results.push({ name: 'List Recordings', ...listResult });
    
    // Test 2: List all recordings (new functionality)
    const listAllResult = await testEndpoint(
        'List All Recordings',
        `${API_BASE}/api/list-recordings?world=${TEST_CONFIG.world}&lmid=${TEST_CONFIG.lmid}&all=true`
    );
    results.push({ name: 'List All Recordings', ...listAllResult });
    
    // Test 3: Get share link
    console.log('\n🔗 TESTING SHARING ENDPOINTS');
    const shareResult = await testEndpoint(
        'Get Share Link',
        `${API_BASE}/api/get-share-link?lmid=${TEST_CONFIG.lmid}`
    );
    results.push({ name: 'Get Share Link', ...shareResult });
    
    // Extract ShareID from share link result for next test
    let testShareId = TEST_CONFIG.testShareId;
    if (shareResult.success && shareResult.data.shareId) {
        testShareId = shareResult.data.shareId;
        console.log(`📝 Using generated ShareID: ${testShareId}`);
    }
    
    // Test 4: Get radio data
    const radioDataResult = await testEndpoint(
        'Get Radio Data',
        `${API_BASE}/api/get-radio-data?shareId=${testShareId}`
    );
    results.push({ name: 'Get Radio Data', ...radioDataResult });
    
    // Test 5: Handle new member (webhook simulation)
    console.log('\n👥 TESTING REGISTRATION ENDPOINTS');
    const webhookResult = await testEndpoint(
        'Handle New Member Webhook',
        `${API_BASE}/api/handle-new-member`,
        {
            method: 'POST',
            body: {
                event: 'member.created',
                data: {
                    id: 'test_member_123',
                    email: TEST_CONFIG.testEmail,
                    customFields: {
                        originating_share_id: testShareId
                    },
                    createdAt: new Date().toISOString()
                }
            }
        }
    );
    results.push({ name: 'Handle New Member Webhook', ...webhookResult });
    
    // Test 6: Audio combination (if recordings exist)
    console.log('\n🎵 TESTING AUDIO PROCESSING ENDPOINTS');
    if (listResult.success && listResult.data.recordings && listResult.data.recordings.length > 0) {
        const audioSegments = [
            {
                type: 'single',
                url: 'https://little-microphones.b-cdn.net/audio/other/intro.mp3'
            },
            {
                type: 'combine_with_background',
                questionId: 'question1',
                answerUrls: listResult.data.recordings.slice(0, 2).map(r => r.url),
                backgroundUrl: 'https://little-microphones.b-cdn.net/audio/other/monkeys.mp3'
            },
            {
                type: 'single',
                url: 'https://little-microphones.b-cdn.net/audio/other/outro.mp3'
            }
        ];
        
        const combineResult = await testEndpoint(
            'Combine Audio',
            `${API_BASE}/api/combine-audio`,
            {
                method: 'POST',
                body: {
                    world: TEST_CONFIG.world,
                    lmid: TEST_CONFIG.lmid,
                    audioSegments: audioSegments
                }
            }
        );
        results.push({ name: 'Combine Audio', ...combineResult });
    } else {
        console.log('⚠️ Skipping audio combination test - no recordings found');
        results.push({ name: 'Combine Audio', success: false, error: 'No recordings to test with' });
    }
    
    // Test 7: Upload audio (basic endpoint test)
    console.log('\n📤 TESTING UPLOAD ENDPOINTS');
    const uploadTestResult = await testEndpoint(
        'Upload Audio (OPTIONS)',
        `${API_BASE}/api/upload-audio`,
        {
            method: 'OPTIONS'
        }
    );
    results.push({ name: 'Upload Audio OPTIONS', ...uploadTestResult });
    
    // Test 8: Delete audio (basic endpoint test)
    const deleteTestResult = await testEndpoint(
        'Delete Audio (OPTIONS)',
        `${API_BASE}/api/delete-audio`,
        {
            method: 'OPTIONS'
        }
    );
    results.push({ name: 'Delete Audio OPTIONS', ...deleteTestResult });
    
    // Print summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('======================');
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${results.length}`);
    
    console.log('\n📋 DETAILED RESULTS:');
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.name}`);
        if (!result.success && result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });
    
    // Environment check
    console.log('\n🔧 ENVIRONMENT CHECK');
    console.log('===================');
    console.log(`API Base URL: ${API_BASE}`);
    console.log(`Test World: ${TEST_CONFIG.world}`);
    console.log(`Test LMID: ${TEST_CONFIG.lmid}`);
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('==================');
    
    if (failed === 0) {
        console.log('🎉 All tests passed! System is ready for production.');
    } else {
        console.log('⚠️ Some tests failed. Please review the errors above.');
        console.log('🔧 Common fixes:');
        console.log('   - Verify environment variables are set');
        console.log('   - Check database connectivity');
        console.log('   - Ensure all API endpoints are deployed');
        console.log('   - Verify Bunny.net CDN configuration');
    }
    
    return results;
}

/**
 * Test ShareID generation and validation
 */
async function testShareIdFlow() {
    console.log('\n🔗 TESTING SHAREID FLOW');
    console.log('=======================');
    
    // Step 1: Generate ShareID
    console.log('Step 1: Generate ShareID');
    const shareResult = await testEndpoint(
        'Generate ShareID',
        `${API_BASE}/api/get-share-link?lmid=${TEST_CONFIG.lmid}`
    );
    
    if (!shareResult.success) {
        console.log('❌ ShareID generation failed - cannot continue flow test');
        return false;
    }
    
    const shareId = shareResult.data.shareId;
    console.log(`✅ Generated ShareID: ${shareId}`);
    
    // Step 2: Validate ShareID
    console.log('\nStep 2: Validate ShareID');
    const validateResult = await testEndpoint(
        'Validate ShareID',
        `${API_BASE}/api/get-radio-data?shareId=${shareId}`
    );
    
    if (!validateResult.success) {
        console.log('❌ ShareID validation failed');
        return false;
    }
    
    console.log('✅ ShareID validation successful');
    console.log(`📊 World: ${validateResult.data.world}`);
    console.log(`📊 LMID: ${validateResult.data.lmid}`);
    console.log(`📊 Recordings: ${validateResult.data.recordingCount}`);
    
    // Step 3: Test invalid ShareID
    console.log('\nStep 3: Test invalid ShareID');
    const invalidResult = await testEndpoint(
        'Invalid ShareID',
        `${API_BASE}/api/get-radio-data?shareId=invalid-share-id-123`
    );
    
    if (invalidResult.success) {
        console.log('⚠️ Invalid ShareID should have failed but succeeded');
    } else {
        console.log('✅ Invalid ShareID correctly rejected');
    }
    
    return true;
}

/**
 * Test webhook payload formats
 */
async function testWebhookFormats() {
    console.log('\n🔗 TESTING WEBHOOK FORMATS');
    console.log('==========================');
    
    // Test different webhook payload formats
    const testPayloads = [
        {
            name: 'Standard Memberstack Payload',
            payload: {
                event: 'member.created',
                data: {
                    id: 'mem_test123',
                    email: 'test@example.com',
                    customFields: {
                        originating_share_id: 'test-share-123'
                    },
                    createdAt: '2025-01-15T10:30:00Z'
                }
            }
        },
        {
            name: 'Missing ShareID',
            payload: {
                event: 'member.created',
                data: {
                    id: 'mem_test456',
                    email: 'test2@example.com',
                    customFields: {},
                    createdAt: '2025-01-15T10:30:00Z'
                }
            }
        },
        {
            name: 'Invalid Event Type',
            payload: {
                event: 'member.updated',
                data: {
                    id: 'mem_test789',
                    email: 'test3@example.com',
                    customFields: {
                        originating_share_id: 'test-share-456'
                    },
                    createdAt: '2025-01-15T10:30:00Z'
                }
            }
        }
    ];
    
    for (const test of testPayloads) {
        const result = await testEndpoint(
            test.name,
            `${API_BASE}/api/handle-new-member`,
            {
                method: 'POST',
                body: test.payload
            }
        );
        
        console.log(`📋 ${test.name}: ${result.success ? '✅' : '❌'}`);
    }
}

/**
 * Run specific test suites
 */
async function runTestSuite(suite) {
    switch (suite) {
        case 'all':
            await runAllTests();
            break;
        case 'shareid':
            await testShareIdFlow();
            break;
        case 'webhook':
            await testWebhookFormats();
            break;
        default:
            console.log('Available test suites: all, shareid, webhook');
    }
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testShareIdFlow,
        testWebhookFormats,
        runTestSuite
    };
}

// Auto-run if called directly
if (typeof window !== 'undefined') {
    // Browser environment
    console.log('🌐 Running in browser environment');
    window.LittleMicrophonesTests = {
        runAllTests,
        testShareIdFlow,
        testWebhookFormats,
        runTestSuite
    };
} else if (require.main === module) {
    // Node.js environment
    console.log('🖥️ Running in Node.js environment');
    const suite = process.argv[2] || 'all';
    runTestSuite(suite);
} 