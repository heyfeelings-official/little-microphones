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

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { audioData, filename, world, lmid, questionId } = req.body;

        // Validation
        if (!audioData || !filename) {
            return res.status(400).json({ error: 'Missing required fields: audioData and filename' });
        }

        if (!world || !lmid || !questionId) {
            return res.status(400).json({ error: 'Missing required fields: world, lmid, and questionId' });
        }

        // Validate filename format
        if (!filename.includes(`kids-world_${world}-lmid_${lmid}-question_${questionId}`)) {
            return res.status(400).json({ error: 'Invalid filename format' });
        }

        // Check environment variables
        if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE) {
            console.error('Missing Bunny.net configuration');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Convert base64 to buffer
        let audioBuffer;
        try {
            // Remove data URL prefix if present
            const base64Data = audioData.replace(/^data:audio\/[^;]+;base64,/, '');
            audioBuffer = Buffer.from(base64Data, 'base64');
        } catch (error) {
            return res.status(400).json({ error: 'Invalid audio data format' });
        }

        // Upload to Bunny.net
        const uploadUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${filename}`;
        
        console.log(`Uploading ${filename} to Bunny.net (${audioBuffer.length} bytes)`);
        console.log(`Upload URL: ${uploadUrl}`);
        console.log(`API Key present: ${!!process.env.BUNNY_API_KEY}`);
        console.log(`Storage Zone: ${process.env.BUNNY_STORAGE_ZONE}`);
        
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'audio/webm'
            },
            body: audioBuffer
        });

        console.log(`Bunny.net response status: ${response.status}`);
        console.log(`Bunny.net response headers:`, Object.fromEntries(response.headers.entries()));

        if (response.ok) {
            const cdnUrl = `https://${process.env.BUNNY_CDN_URL}/${filename}`;
            console.log(`Successfully uploaded: ${cdnUrl}`);
            
            res.json({ 
                success: true, 
                url: cdnUrl,
                filename: filename,
                size: audioBuffer.length
            });
        } else {
            const errorText = await response.text();
            console.error(`Bunny.net upload failed: ${response.status} - ${errorText}`);
            console.error(`Full response:`, {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                body: errorText
            });
            throw new Error(`Upload failed: ${response.status}`);
        }

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Upload failed', 
            details: error.message 
        });
    }
} 