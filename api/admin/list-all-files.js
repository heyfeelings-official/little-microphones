/**
 * api/admin/list-all-files.js - Admin File Listing Service
 * 
 * PURPOSE: Lists all audio files from Bunny.net in a hierarchical tree structure
 * DEPENDENCIES: Bunny.net Storage API, existing utilities
 * 
 * REQUEST FORMAT:
 * GET /api/admin/list-all-files
 * 
 * RESPONSE FORMAT:
 * {
 *   success: true,
 *   tree: {
 *     audio: { ... },
 *     recordings: { ... }
 *   },
 *   totalFiles: 123,
 *   totalSize: 1234567890
 * }
 */

export default async function handler(req, res) {
    // Secure CORS headers
    const { setCorsHeaders } = await import('../../utils/api-utils.js');
    const corsHandler = setCorsHeaders(res, ['GET', 'OPTIONS']);
    corsHandler(req);

    // Rate limiting - 10 requests per minute for admin operations
    const { checkRateLimit } = await import('../../utils/simple-rate-limiter.js');
    if (!checkRateLimit(req, res, 'admin-list-files', 10)) {
        return;
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        // Check environment variables
        if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE) {
            console.error('Missing Bunny.net configuration');
            return res.status(500).json({ 
                success: false,
                error: 'Server configuration error' 
            });
        }

        const baseUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}`;
        const headers = { 
            'AccessKey': process.env.BUNNY_API_KEY,
            'Accept': 'application/json'
        };

        // Build file tree structure
        const fileTree = {
            audio: {
                type: 'folder',
                children: {}
            },
            recordings: {
                type: 'folder',
                children: {}
            }
        };

        let totalFiles = 0;
        let totalSize = 0;

        // 1. List static audio files in /audio directory
        console.log('📂 Fetching static audio files...');
        const audioResponse = await fetch(`${baseUrl}/audio/`, {
            method: 'GET',
            headers: headers
        });

        if (audioResponse.ok) {
            const audioContents = await audioResponse.json();
            
            // Process each world folder and other folder
            for (const item of audioContents) {
                if (item.IsDirectory) {
                    const folderName = item.ObjectName;
                    fileTree.audio.children[folderName] = {
                        type: 'folder',
                        children: {}
                    };

                    // List files in each subfolder
                    const subfolderResponse = await fetch(`${baseUrl}/audio/${folderName}/`, {
                        method: 'GET',
                        headers: headers
                    });

                    if (subfolderResponse.ok) {
                        const subfolderContents = await subfolderResponse.json();
                        
                        for (const file of subfolderContents) {
                            if (!file.IsDirectory) {
                                fileTree.audio.children[folderName].children[file.ObjectName] = {
                                    type: 'file',
                                    size: file.Length,
                                    lastModified: file.LastChanged,
                                    url: `https://${process.env.BUNNY_CDN_URL}/audio/${folderName}/${file.ObjectName}`,
                                    path: `audio/${folderName}/${file.ObjectName}`
                                };
                                totalFiles++;
                                totalSize += file.Length;
                            }
                        }
                    }
                }
            }
        }

        // 2. List user recordings - need to list language folders first
        console.log('📂 Fetching user recordings...');
        const languages = ['en', 'pl']; // Known languages
        
        for (const lang of languages) {
            const langResponse = await fetch(`${baseUrl}/${lang}/`, {
                method: 'GET',
                headers: headers
            });

            if (langResponse.ok) {
                const langContents = await langResponse.json();
                
                // Create language folder in tree
                fileTree.recordings.children[lang] = {
                    type: 'folder',
                    children: {}
                };

                // Process LMID folders
                for (const lmidFolder of langContents) {
                    if (lmidFolder.IsDirectory) {
                        const lmid = lmidFolder.ObjectName;
                        
                        // Create LMID folder in tree
                        fileTree.recordings.children[lang].children[lmid] = {
                            type: 'folder',
                            children: {}
                        };

                        // List world folders inside LMID
                        const lmidResponse = await fetch(`${baseUrl}/${lang}/${lmid}/`, {
                            method: 'GET',
                            headers: headers
                        });

                        if (lmidResponse.ok) {
                            const lmidContents = await lmidResponse.json();
                            
                            for (const worldFolder of lmidContents) {
                                if (worldFolder.IsDirectory) {
                                    const world = worldFolder.ObjectName;
                                    
                                    // Create world folder in tree
                                    fileTree.recordings.children[lang].children[lmid].children[world] = {
                                        type: 'folder',
                                        children: {}
                                    };

                                    // List files in world folder
                                    const worldResponse = await fetch(`${baseUrl}/${lang}/${lmid}/${world}/`, {
                                        method: 'GET',
                                        headers: headers
                                    });

                                    if (worldResponse.ok) {
                                        const worldContents = await worldResponse.json();
                                        
                                        for (const file of worldContents) {
                                            if (!file.IsDirectory) {
                                                fileTree.recordings.children[lang].children[lmid].children[world].children[file.ObjectName] = {
                                                    type: 'file',
                                                    size: file.Length,
                                                    lastModified: file.LastChanged,
                                                    url: `https://${process.env.BUNNY_CDN_URL}/${lang}/${lmid}/${world}/${file.ObjectName}`,
                                                    path: `${lang}/${lmid}/${world}/${file.ObjectName}`
                                                };
                                                totalFiles++;
                                                totalSize += file.Length;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Add summary statistics
        const summary = {
            staticAudioFiles: countFilesInTree(fileTree.audio),
            userRecordings: countFilesInTree(fileTree.recordings),
            totalFiles: totalFiles,
            totalSize: totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
        };

        console.log(`✅ Found ${totalFiles} files, total size: ${summary.totalSizeMB} MB`);

        return res.status(200).json({
            success: true,
            tree: fileTree,
            summary: summary,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error listing files:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to list files',
            details: error.message
        });
    }
}

/**
 * Count files in a tree structure recursively
 */
function countFilesInTree(node) {
    if (node.type === 'file') {
        return 1;
    }
    
    let count = 0;
    if (node.children) {
        for (const child of Object.values(node.children)) {
            count += countFilesInTree(child);
        }
    }
    
    return count;
} 