/**
 * test-parent-cleanup.js - Test Parent LMID Cleanup Functionality
 * 
 * PURPOSE: Test the parent cleanup system when teachers delete LMIDs
 * USAGE: Run in browser console or as Node.js script
 * 
 * FEATURES:
 * - Test parent cleanup API endpoint
 * - Simulate LMID deletion with parent cleanup
 * - Verify cleanup results
 * 
 * VERSION: 1.0.0
 * LAST UPDATED: January 2025
 */

// Configuration
const API_BASE_URL = 'https://little-microphones.vercel.app/api';

/**
 * Test the parent cleanup API directly
 */
async function testParentCleanupAPI() {
    console.log('🧪 Testing Parent Cleanup API...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/parent-cleanup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                lmidToRemove: 999, // Test LMID that probably doesn't exist
                teacherMemberId: 'mem_test_teacher_123'
            })
        });

        const result = await response.json();
        
        console.log('📤 Request sent to:', `${API_BASE_URL}/parent-cleanup`);
        console.log('📊 Response status:', response.status);
        console.log('📋 Response data:', result);
        
        if (result.success) {
            console.log(`✅ Parent cleanup test successful: ${result.cleanedParents} parents processed`);
            if (result.details && result.details.length > 0) {
                console.log('📝 Cleanup details:');
                result.details.forEach((detail, index) => {
                    console.log(`  ${index + 1}. ${detail.memberEmail}: "${detail.oldLmids}" → "${detail.newLmids}" (${detail.success ? 'Success' : 'Failed'})`);
                });
            }
        } else {
            console.log('❌ Parent cleanup test failed:', result.error);
        }
        
        return result;
        
    } catch (error) {
        console.error('💥 Parent cleanup test error:', error);
        return null;
    }
}

/**
 * Test the full LMID deletion with parent cleanup
 */
async function testLMIDDeletionWithCleanup() {
    console.log('🧪 Testing LMID Deletion with Parent Cleanup...');
    
    // Note: This would need actual member credentials to work
    // For now, just test the API structure
    
    try {
        const response = await fetch(`${API_BASE_URL}/lmid-operations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'delete',
                memberId: 'mem_test_teacher_123',
                lmidToDelete: 999,
                newLmidString: '1,2'
            })
        });

        const result = await response.json();
        
        console.log('📤 Request sent to:', `${API_BASE_URL}/lmid-operations`);
        console.log('📊 Response status:', response.status);
        console.log('📋 Response data:', result);
        
        if (result.success) {
            console.log('✅ LMID deletion test successful');
            
            if (result.parentCleanup) {
                console.log('👨‍👩‍👧‍👦 Parent cleanup results:');
                console.log(`  - Success: ${result.parentCleanup.success}`);
                console.log(`  - Cleaned parents: ${result.parentCleanup.cleanedParents}`);
                console.log(`  - Message: ${result.parentCleanup.message}`);
            } else {
                console.log('⚠️ No parent cleanup data in response');
            }
        } else {
            console.log('❌ LMID deletion test failed:', result.error);
        }
        
        return result;
        
    } catch (error) {
        console.error('💥 LMID deletion test error:', error);
        return null;
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🚀 Starting Parent Cleanup Tests...');
    console.log('='.repeat(50));
    
    // Test 1: Direct parent cleanup API
    console.log('\n1️⃣ Testing Parent Cleanup API directly...');
    const cleanupResult = await testParentCleanupAPI();
    
    // Test 2: LMID deletion with integrated cleanup
    console.log('\n2️⃣ Testing LMID Deletion with integrated cleanup...');
    const deletionResult = await testLMIDDeletionWithCleanup();
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 Tests completed!');
    
    return {
        cleanupTest: cleanupResult,
        deletionTest: deletionResult
    };
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testParentCleanupAPI,
        testLMIDDeletionWithCleanup,
        runAllTests
    };
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
    // Add to global scope for easy testing
    window.testParentCleanup = {
        testAPI: testParentCleanupAPI,
        testDeletion: testLMIDDeletionWithCleanup,
        runAll: runAllTests
    };
    
    console.log('🧪 Parent Cleanup Tests loaded!');
    console.log('📝 Available commands:');
    console.log('  - testParentCleanup.testAPI() - Test cleanup API directly');
    console.log('  - testParentCleanup.testDeletion() - Test LMID deletion with cleanup');
    console.log('  - testParentCleanup.runAll() - Run all tests');
} 