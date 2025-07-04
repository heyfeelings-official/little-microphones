/**
 * Local API Testing Script
 */

// Set environment variables
process.env.SUPABASE_URL = 'https://iassjwinjjzgnrwnnfig.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlhc3Nqd2luamp6Z25yd25uZmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MTMyODksImV4cCI6MjA2NTk4OTI4OX0.qTxGNA62l3Cp8E06TtdmZxwWpGqEy4glblBukkNXBTs';

// Import the API handler
const handler = require('./api/get-share-link.js').default;

// Mock request and response objects
const mockReq = {
    method: 'GET',
    query: { lmid: '38' },
    headers: { host: 'localhost:3000' }
};

const mockRes = {
    status: function(code) {
        this.statusCode = code;
        return this;
    },
    json: function(data) {
        console.log(`Status: ${this.statusCode}`);
        console.log('Response:', JSON.stringify(data, null, 2));
        return this;
    },
    setHeader: function(name, value) {
        // Mock header setting
        return this;
    },
    end: function() {
        return this;
    }
};

// Test the API
async function testGetShareLink() {
    console.log('🧪 Testing get-share-link API locally...');
    console.log(`📊 Testing LMID: ${mockReq.query.lmid}`);
    
    try {
        await handler(mockReq, mockRes);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testGetShareLink(); 