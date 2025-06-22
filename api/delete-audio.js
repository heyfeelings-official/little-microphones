export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow DELETE requests
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { filename, world, lmid, questionId } = req.body;

        // Validation
        if (!filename) {
            return res.status(400).json({ error: 'Missing required field: filename' });
        }

        if (!world || !lmid || !questionId) {
            return res.status(400).json({ error: 'Missing required fields: world, lmid, and questionId' });
        }

        // Validate filename format for security
        if (!filename.includes(`kids-world_${world}-lmid_${lmid}-question_${questionId}`)) {
            return res.status(400).json({ error: 'Invalid filename format' });
        }

        // Check environment variables
        if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE) {
            console.error('Missing Bunny.net configuration');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Delete from Bunny.net
        const deleteUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${filename}`;
        
        console.log(`Deleting ${filename} from Bunny.net`);
        
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY
            }
        });

        if (response.ok) {
            console.log(`Successfully deleted: ${filename}`);
            res.json({ 
                success: true, 
                message: 'File deleted successfully',
                filename: filename
            });
        } else if (response.status === 404) {
            // File doesn't exist, consider it a success
            console.log(`File not found (already deleted): ${filename}`);
            res.json({ 
                success: true, 
                message: 'File not found (already deleted)',
                filename: filename
            });
        } else {
            const errorText = await response.text();
            console.error(`Bunny.net delete failed: ${response.status} - ${errorText}`);
            throw new Error(`Delete failed: ${response.status}`);
        }

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ 
            error: 'Delete failed', 
            details: error.message 
        });
    }
} 