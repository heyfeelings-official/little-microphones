import { setCorsHeaders } from '../utils/api-utils.js';
import { checkRateLimit } from '../utils/simple-rate-limiter.js';

export default async function handler(req, res) {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Rate limiting
        const rateLimitResult = checkRateLimit(req);
        if (!rateLimitResult.allowed) {
            return res.status(429).json({ 
                error: 'Too many requests', 
                retryAfter: rateLimitResult.retryAfter 
            });
        }
        
        // Bunny.net configuration
        const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
        const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
        const BUNNY_STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD;
        
        if (!BUNNY_API_KEY || !BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_PASSWORD) {
            console.error('Missing Bunny.net configuration');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        
        // Fetch all files from Bunny.net storage
        // Note: Bunny.net API returns files in a flat structure
        const bunnyUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/`;
        
        console.log('📁 Fetching files from Bunny.net...');
        
        const response = await fetch(bunnyUrl, {
            method: 'GET',
            headers: {
                'AccessKey': BUNNY_STORAGE_PASSWORD,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('Bunny.net API error:', response.status, response.statusText);
            throw new Error(`Failed to fetch files: ${response.statusText}`);
        }
        
        const files = await response.json();
        console.log(`✅ Found ${files.length} items in storage`);
        
        // Transform the file data for the frontend
        const transformedFiles = await transformFileList(files, '');
        
        return res.status(200).json({
            success: true,
            files: transformedFiles
        });
        
    } catch (error) {
        console.error('Error listing files:', error);
        return res.status(500).json({ 
            error: 'Failed to list files',
            details: error.message 
        });
    }
}

// Recursively transform Bunny.net file list to include full paths
async function transformFileList(items, currentPath) {
    let allFiles = [];
    
    for (const item of items) {
        const fullPath = currentPath ? `${currentPath}/${item.ObjectName}` : item.ObjectName;
        
        if (item.IsDirectory) {
            // Fetch contents of subdirectory
            const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
            const BUNNY_STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD;
            
            const subDirUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${fullPath}/`;
            
            try {
                const response = await fetch(subDirUrl, {
                    method: 'GET',
                    headers: {
                        'AccessKey': BUNNY_STORAGE_PASSWORD,
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const subItems = await response.json();
                    const subFiles = await transformFileList(subItems, fullPath);
                    allFiles = allFiles.concat(subFiles);
                }
            } catch (error) {
                console.error(`Error fetching subdirectory ${fullPath}:`, error);
            }
        } else {
            // It's a file
            allFiles.push({
                path: `/${fullPath}`,
                name: item.ObjectName,
                size: item.Length,
                lastModified: item.LastChanged,
                contentType: item.ContentType || 'application/octet-stream'
            });
        }
    }
    
    return allFiles;
}