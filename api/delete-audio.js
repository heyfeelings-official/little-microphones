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

        // Delete from Bunny.net with folder structure: lmid/world/filename
        const filePath = `${lmid}/${world}/${filename}`;
        const deleteUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${filePath}`;
        
        console.log(`Deleting ${filename} from Bunny.net`);
        console.log(`Delete path: ${filePath}`);
        
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY
            }
        });

        if (response.ok || response.status === 404) {
            if (response.ok) {
                console.log(`Successfully deleted: ${filename}`);
            } else {
                console.log(`File not found (already deleted): ${filename}`);
            }

            // After successful file deletion, check and clean up empty folders
            await cleanupEmptyFolders(lmid, world);

            res.json({ 
                success: true, 
                message: response.ok ? 'File deleted successfully' : 'File not found (already deleted)',
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

/**
 * Clean up empty folders after file deletion
 * @param {string} lmid - The lmid folder
 * @param {string} world - The world folder
 */
async function cleanupEmptyFolders(lmid, world) {
    try {
        const baseUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}`;
        const headers = { 'AccessKey': process.env.BUNNY_API_KEY };

        // Step 1: Check if world folder (lmid/world/) is empty
        const worldFolderUrl = `${baseUrl}/${lmid}/${world}/`;
        console.log(`Checking if world folder is empty: ${lmid}/${world}/`);
        
        const worldListResponse = await fetch(worldFolderUrl, {
            method: 'GET',
            headers: headers
        });

        if (worldListResponse.ok) {
            const worldContents = await worldListResponse.json();
            
            // If world folder is empty (no files), delete it
            if (Array.isArray(worldContents) && worldContents.length === 0) {
                console.log(`World folder ${lmid}/${world}/ is empty, deleting...`);
                
                const deleteWorldResponse = await fetch(worldFolderUrl, {
                    method: 'DELETE',
                    headers: headers
                });

                if (deleteWorldResponse.ok) {
                    console.log(`Successfully deleted empty world folder: ${lmid}/${world}/`);
                    
                    // Step 2: Check if lmid folder is now empty
                    const lmidFolderUrl = `${baseUrl}/${lmid}/`;
                    console.log(`Checking if lmid folder is empty: ${lmid}/`);
                    
                    const lmidListResponse = await fetch(lmidFolderUrl, {
                        method: 'GET',
                        headers: headers
                    });

                    if (lmidListResponse.ok) {
                        const lmidContents = await lmidListResponse.json();
                        
                        // If lmid folder is empty (no subfolders), delete it
                        if (Array.isArray(lmidContents) && lmidContents.length === 0) {
                            console.log(`LMID folder ${lmid}/ is empty, deleting...`);
                            
                            const deleteLmidResponse = await fetch(lmidFolderUrl, {
                                method: 'DELETE',
                                headers: headers
                            });

                            if (deleteLmidResponse.ok) {
                                console.log(`Successfully deleted empty lmid folder: ${lmid}/`);
                            } else {
                                console.warn(`Failed to delete lmid folder ${lmid}/: ${deleteLmidResponse.status}`);
                            }
                        } else {
                            console.log(`LMID folder ${lmid}/ is not empty, keeping it`);
                        }
                    } else {
                        console.warn(`Failed to list lmid folder contents: ${lmidListResponse.status}`);
                    }
                } else {
                    console.warn(`Failed to delete world folder ${lmid}/${world}/: ${deleteWorldResponse.status}`);
                }
            } else {
                console.log(`World folder ${lmid}/${world}/ is not empty, keeping it`);
            }
        } else {
            console.warn(`Failed to list world folder contents: ${worldListResponse.status}`);
        }
    } catch (error) {
        console.error('Error during folder cleanup:', error);
        // Don't throw error - folder cleanup is optional
    }
} 