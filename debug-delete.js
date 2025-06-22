// Debug script to test LMID deletion API
// Run this in browser console to test the delete functionality

async function testDeleteAPI() {
    console.log('🧪 Testing LMID deletion API...');
    
    try {
        const response = await fetch('https://little-microphones.vercel.app/api/delete-audio', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deleteLmidFolder: true,
                lmid: 'test-lmid-999' // Test with non-existent LMID
            })
        });

        console.log('📡 Response status:', response.status);
        console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

        const result = await response.json();
        console.log('📦 Response body:', result);

        if (result.success) {
            console.log('✅ API test successful!');
        } else {
            console.log('⚠️ API returned error:', result.error);
        }

    } catch (error) {
        console.error('❌ API test failed:', error);
    }
}

// Run the test
console.log('🚀 Copy and paste this into browser console to test:');
console.log('testDeleteAPI()');

// Also expose the function globally
window.testDeleteAPI = testDeleteAPI; 