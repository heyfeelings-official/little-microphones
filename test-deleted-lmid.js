// test-deleted-lmid.js
// Test script to verify deleted LMID protection

const API_BASE_URL = 'http://localhost:3000/api';

async function testDeletedLMID() {
    console.log('🧪 Testing Deleted LMID Protection...\n');
    
    // Test ShareID that belongs to deleted LMID
    const testShareId = 'kz7xp4v9'; // This should be a real ShareID from deleted LMID
    
    console.log('1. Testing get-world-info with deleted LMID:');
    try {
        const response = await fetch(`${API_BASE_URL}/get-world-info?shareId=${testShareId}`);
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', data);
        console.log('✅ Should return 410 with PROGRAM_DELETED error\n');
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    console.log('2. Testing get-radio-data with deleted LMID:');
    try {
        const response = await fetch(`${API_BASE_URL}/get-radio-data?shareId=${testShareId}&lang=en`);
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', data);
        console.log('✅ Should return 410 with PROGRAM_DELETED error\n');
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    console.log('3. Testing get-share-link with deleted LMID:');
    try {
        const response = await fetch(`${API_BASE_URL}/get-share-link?lmid=38&world=spookyland`);
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', data);
        console.log('✅ Should return 410 with LMID_DELETED error\n');
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    console.log('🎉 Deleted LMID protection tests completed!');
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testDeletedLMID();
}

export { testDeletedLMID }; 