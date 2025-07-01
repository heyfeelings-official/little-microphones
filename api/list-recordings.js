/**
 * List recordings from Bunny.net cloud storage
 * This API enables cross-device synchronization by providing a complete list of recordings
 * stored in the cloud for a specific world/lmid/questionId combination
 */

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { world, lmid, questionId } = req.query;

        if (!world || !lmid || !questionId) {
            return res.status(400).json({ 
                error: 'Missing required parameters: world, lmid, questionId' 
            });
        }

        // Construct the folder path where recordings are stored
        const folderPath = `kids-world_${world}-lmid_${lmid}/`;
        
        console.log(`Listing recordings for ${world}/${lmid}/Q${questionId} in folder: ${folderPath}`);

        // List files from Bunny.net
        const listUrl = `https://storage.bunnycdn.com/little-microphones/${folderPath}`;
        
        const response = await fetch(listUrl, {
            method: 'GET',
            headers: {
                'AccessKey': process.env.BUNNY_STORAGE_PASSWORD,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Bunny.net list failed: ${response.status} ${response.statusText}`);
            return res.status(500).json({ 
                error: 'Failed to list recordings from cloud storage',
                details: `HTTP ${response.status}`
            });
        }

        const fileList = await response.json();
        
        // Filter files for the specific question ID
        const questionPattern = new RegExp(`-QID${questionId}-\\d+\\.mp3$`);
        const matchingFiles = fileList.filter(file => 
            file.IsDirectory === false && 
            questionPattern.test(file.ObjectName)
        );

        console.log(`Found ${matchingFiles.length} recordings for question ${questionId}`);

        // Transform file list to recording objects
        const recordings = matchingFiles.map(file => ({
            filename: file.ObjectName,
            url: `https://little-microphones.b-cdn.net/${folderPath}${file.ObjectName}`,
            size: file.Length,
            lastModified: new Date(file.LastChanged).getTime(),
            questionId: questionId
        }));

        // Sort by last modified (newest first)
        recordings.sort((a, b) => b.lastModified - a.lastModified);

        return res.status(200).json({
            success: true,
            world: world,
            lmid: lmid,
            questionId: questionId,
            count: recordings.length,
            recordings: recordings
        });

    } catch (error) {
        console.error('List recordings error:', error);
        return res.status(500).json({
            error: 'Failed to list recordings',
            details: error.message
        });
    }
} 