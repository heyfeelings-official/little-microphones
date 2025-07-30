import { withCors } from '../../utils/api-utils.js';
import { withRateLimit } from '../../utils/simple-rate-limiter.js';

/**
 * Admin API: Delete Static Audio File
 * Deletes a specific audio file from Bunny.net storage
 */
const handler = async (req, res) => {
    console.log('🗑️ Delete static audio request:', {
        method: req.method,
        body: req.body,
        url: req.url
    });

    if (req.method !== 'DELETE') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        const { path } = req.body;

        if (!path) {
            return res.status(400).json({
                success: false,
                error: 'File path is required'
            });
        }

        console.log('📂 Deleting file at path:', path);

        // Remove leading slash if present
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        
        // Construct Bunny.net delete URL
        const deleteUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${cleanPath}`;
        
        console.log('🌐 Bunny.net delete URL:', deleteUrl);

        // Delete from Bunny.net
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'AccessKey': process.env.BUNNY_STORAGE_PASSWORD,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Bunny.net response status:', response.status);

        if (response.ok || response.status === 404) {
            // Success or file already doesn't exist
            console.log('✅ File deleted successfully');
            
            return res.status(200).json({
                success: true,
                message: `File deleted: ${path}`,
                path: path
            });
        } else {
            const errorText = await response.text();
            console.error('❌ Bunny.net delete error:', errorText);
            
            return res.status(response.status).json({
                success: false,
                error: `Delete failed: ${response.status} ${response.statusText}`,
                details: errorText
            });
        }

    } catch (error) {
        console.error('❌ Delete static audio error:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
};

// Apply rate limiting and CORS
export default withCors(withRateLimit(handler, {
    windowMs: 60000, // 1 minute
    maxRequests: 50 // Allow up to 50 delete requests per minute
}));