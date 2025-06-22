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
        const { filename, world, lmid, questionId, deleteLmidFolder } = req.body;

        // Check environment variables
        if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE) {
            console.error('Missing Bunny.net configuration');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Handle LMID folder deletion (delete entire LMID and all its contents)
        if (deleteLmidFolder && lmid) {
            console.log(`🗂️ Deleting entire LMID folder: ${lmid}/`);
            console.log(`📋 Request body:`, req.body);
            console.log(`🔑 Environment check - API Key present: ${!!process.env.BUNNY_API_KEY}`);
            console.log(`🏪 Storage Zone: ${process.env.BUNNY_STORAGE_ZONE}`);
            
            try {
                await deleteLmidFolderRecursively(lmid);
                console.log(`✅ Successfully completed LMID folder deletion for: ${lmid}/`);
                
                res.json({ 
                    success: true, 
                    message: `Successfully deleted LMID folder: ${lmid}/`,
                    lmid: lmid
                });
            } catch (error) {
                console.error(`❌ Error during LMID folder deletion for ${lmid}:`, error);
                res.status(500).json({ 
                    success: false,
                    error: 'LMID folder deletion failed', 
                    details: error.message,
                    lmid: lmid
                });
            }
            return;
        }

        // Handle single file deletion (existing functionality)
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
 * Delete entire LMID folder and all its contents recursively
 * @param {string} lmid - The LMID folder to delete
 */
async function deleteLmidFolderRecursively(lmid) {
    try {
        const baseUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}`;
        const headers = { 'AccessKey': process.env.BUNNY_API_KEY };
        const lmidFolderUrl = `${baseUrl}/${lmid}/`;

        console.log(`🚀 Starting recursive deletion of LMID folder: ${lmid}/`);
        console.log(`📡 Listing contents at: ${lmidFolderUrl}`);

        // Step 1: List all contents in the LMID folder
        const listResponse = await fetch(lmidFolderUrl, {
            method: 'GET',
            headers: headers
        });

        console.log(`📋 List response status: ${listResponse.status}`);

        if (listResponse.ok) {
            const contents = await listResponse.json();
            console.log(`📦 Raw contents response:`, contents);
            
            if (Array.isArray(contents)) {
                console.log(`📁 Found ${contents.length} items in LMID folder ${lmid}/`);
                
                // Step 2: Delete all world subfolders and their contents
                for (const item of contents) {
                    console.log(`🔍 Processing item:`, item);
                    if (item.IsDirectory) {
                        const worldFolder = item.ObjectName;
                        console.log(`🌍 Deleting world folder: ${lmid}/${worldFolder}/`);
                        await deleteWorldFolderRecursively(lmid, worldFolder);
                    } else {
                        // Delete any files directly in the LMID folder
                        const fileName = item.ObjectName;
                        console.log(`📄 Deleting file: ${lmid}/${fileName}`);
                        await deleteFile(`${lmid}/${fileName}`);
                    }
                }
            } else {
                console.log(`⚠️ Contents is not an array:`, typeof contents, contents);
            }
        } else if (listResponse.status === 404) {
            console.log(`🔍 LMID folder ${lmid}/ not found (already deleted)`);
            return;
        } else {
            const errorText = await listResponse.text();
            console.warn(`❌ Failed to list LMID folder contents: ${listResponse.status} - ${errorText}`);
        }

        // Step 3: Delete the LMID folder itself
        console.log(`Deleting LMID folder: ${lmid}/`);
        const deleteFolderResponse = await fetch(lmidFolderUrl, {
            method: 'DELETE',
            headers: headers
        });

        if (deleteFolderResponse.ok) {
            console.log(`Successfully deleted LMID folder: ${lmid}/`);
        } else if (deleteFolderResponse.status === 404) {
            console.log(`LMID folder ${lmid}/ not found (already deleted)`);
        } else {
            console.warn(`Failed to delete LMID folder ${lmid}/: ${deleteFolderResponse.status}`);
        }

    } catch (error) {
        console.error(`Error during recursive LMID deletion for ${lmid}:`, error);
        throw error;
    }
}

/**
 * Delete a world folder and all its contents
 * @param {string} lmid - The LMID folder
 * @param {string} world - The world folder to delete
 */
async function deleteWorldFolderRecursively(lmid, world) {
    try {
        const baseUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}`;
        const headers = { 'AccessKey': process.env.BUNNY_API_KEY };
        const worldFolderUrl = `${baseUrl}/${lmid}/${world}/`;

        // List all files in the world folder
        const listResponse = await fetch(worldFolderUrl, {
            method: 'GET',
            headers: headers
        });

        if (listResponse.ok) {
            const files = await listResponse.json();
            
            if (Array.isArray(files)) {
                // Delete all files in the world folder
                for (const file of files) {
                    if (!file.IsDirectory) {
                        const fileName = file.ObjectName;
                        console.log(`Deleting file: ${lmid}/${world}/${fileName}`);
                        await deleteFile(`${lmid}/${world}/${fileName}`);
                    }
                }
            }
        }

        // Delete the world folder itself
        const deleteFolderResponse = await fetch(worldFolderUrl, {
            method: 'DELETE',
            headers: headers
        });

        if (deleteFolderResponse.ok) {
            console.log(`Successfully deleted world folder: ${lmid}/${world}/`);
        } else if (deleteFolderResponse.status === 404) {
            console.log(`World folder ${lmid}/${world}/ not found (already deleted)`);
        } else {
            console.warn(`Failed to delete world folder ${lmid}/${world}/: ${deleteFolderResponse.status}`);
        }

    } catch (error) {
        console.error(`Error deleting world folder ${lmid}/${world}:`, error);
        // Don't throw - continue with other deletions
    }
}

/**
 * Delete a single file
 * @param {string} filePath - The path to the file to delete
 */
async function deleteFile(filePath) {
    try {
        const baseUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}`;
        const headers = { 'AccessKey': process.env.BUNNY_API_KEY };
        const deleteUrl = `${baseUrl}/${filePath}`;

        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: headers
        });

        if (response.ok) {
            console.log(`Successfully deleted file: ${filePath}`);
        } else if (response.status === 404) {
            console.log(`File not found (already deleted): ${filePath}`);
        } else {
            console.warn(`Failed to delete file ${filePath}: ${response.status}`);
        }

    } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
        // Don't throw - continue with other deletions
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