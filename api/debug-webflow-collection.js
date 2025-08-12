/**
 * Debug endpoint to fetch Webflow collection schema and see actual field slugs
 */

import { getWebflowHeaders } from '../utils/webflow-api.js';
import { setCorsHeaders } from '../utils/api-utils.js';

const WEBFLOW_API_BASE = 'https://api.webflow.com/v2';
const COLLECTION_ID = '689a16dd10cb6df7ff0094a0'; // From config

export default async function handler(req, res) {
    // Handle CORS
    setCorsHeaders(res, ['GET', 'OPTIONS']);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        console.log('🔍 Fetching Webflow collection schema...');
        
        // Fetch collection details to see field schema
        const collectionUrl = `${WEBFLOW_API_BASE}/collections/${COLLECTION_ID}`;
        console.log('📡 Collection API URL:', collectionUrl);
        
        const collectionResponse = await fetch(collectionUrl, {
            method: 'GET',
            headers: getWebflowHeaders()
        });
        
        if (!collectionResponse.ok) {
            throw new Error(`Collection API error: ${collectionResponse.status} ${collectionResponse.statusText}`);
        }
        
        const collectionData = await collectionResponse.json();
        console.log('📋 Collection data:', JSON.stringify(collectionData, null, 2));
        
        // Also fetch a sample item to see actual field data
        const itemsUrl = `${WEBFLOW_API_BASE}/collections/${COLLECTION_ID}/items?limit=1`;
        console.log('📡 Items API URL:', itemsUrl);
        
        const itemsResponse = await fetch(itemsUrl, {
            method: 'GET',
            headers: getWebflowHeaders()
        });
        
        if (!itemsResponse.ok) {
            throw new Error(`Items API error: ${itemsResponse.status} ${itemsResponse.statusText}`);
        }
        
        const itemsData = await itemsResponse.json();
        console.log('📋 Sample item data:', JSON.stringify(itemsData, null, 2));
        
        return res.status(200).json({
            success: true,
            collection: collectionData,
            sampleItem: itemsData.items?.[0] || null,
            message: 'Check Vercel logs for detailed field information'
        });
        
    } catch (error) {
        console.error('❌ Debug error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
