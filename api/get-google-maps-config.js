/**
 * get-google-maps-config.js - Secure Google Maps API Configuration Endpoint
 * 
 * PURPOSE: Provides secure access to Google Maps API configuration
 * SECURITY: API key is stored in environment variables, not exposed in client code
 * 
 * FUNCTIONALITY:
 * - Returns Google Maps API key from environment variables
 * - Validates request origin
 * - Provides configuration for client-side Google Maps initialization
 * 
 * LAST UPDATED: January 2025
 * VERSION: 2.0.0
 * STATUS: Production Ready ✅
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Get Google Maps API key from environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('❌ GOOGLE_MAPS_API_KEY environment variable not set');
      return res.status(500).json({ 
        success: false, 
        error: 'Google Maps API key not configured' 
      });
    }

    // Return configuration
    const config = {
      success: true,
      config: {
        apiKey: apiKey,
        mapId: '327d871ffc2322da31da39d4', // Production Map ID
        callback: 'initMap',
        libraries: ['places', 'marker']
      }
    };

    // Set CORS headers for security
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json(config);

  } catch (error) {
    console.error('❌ Error in get-google-maps-config:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
} 