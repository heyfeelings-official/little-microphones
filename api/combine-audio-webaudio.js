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

    try {
        console.log('Web Audio combining API called');

        // Only allow POST requests
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const startTime = Date.now();
        const { lmid, world, recordings } = req.body;

        console.log(`Processing audio combination for ${world}/${lmid}`);
        console.log('Recordings received:', Object.keys(recordings));

        // Validate input
        if (!lmid || !world || !recordings || Object.keys(recordings).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields or no recordings provided'
            });
        }

        // Build the sequence of audio files to combine
        const audioSequence = [];
        const baseUrl = `https://little-microphones.b-cdn.net`;

        // Add intro
        audioSequence.push({
            filename: 'intro.mp3',
            url: `${baseUrl}/intro.mp3`,
            type: 'intro'
        });

        // Process each question and its recordings
        const questionIds = Object.keys(recordings).sort();
        console.log(`Processing ${questionIds.length} questions: ${questionIds.join(', ')}`);

        for (let i = 0; i < questionIds.length; i++) {
            const questionId = questionIds[i];
            const questionRecordings = recordings[questionId];

            // Add question prompt
            audioSequence.push({
                filename: `${questionId}.mp3`,
                url: `${baseUrl}/${questionId}.mp3`,
                type: 'question'
            });

            // Add all user recordings for this question
            questionRecordings.forEach((filename, index) => {
                audioSequence.push({
                    filename: filename,
                    url: `${baseUrl}/${lmid}/${world}/${filename}`,
                    type: 'answer'
                });
            });

            // Add transition music between questions (except after last question)
            if (i < questionIds.length - 1) {
                audioSequence.push({
                    filename: 'monkeys.mp3',
                    url: `${baseUrl}/monkeys.mp3`,
                    type: 'transition'
                });
            }
        }

        // Add outro
        audioSequence.push({
            filename: 'outro.mp3',
            url: `${baseUrl}/outro.mp3`,
            type: 'outro'
        });

        console.log(`Built audio sequence with ${audioSequence.length} files`);

        // For now, let's use a more reliable approach: create a single M3U8 playlist file
        // This creates a single "file" that browsers can play as one continuous stream
        
        const playlistContent = audioSequence.map((item, index) => {
            return `#EXTINF:0,${item.type} - ${item.filename}\n${item.url}`;
        }).join('\n');

        const m3u8Content = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-PLAYLIST-TYPE:VOD\n${playlistContent}\n#EXT-X-ENDLIST`;

        // Upload the M3U8 playlist to Bunny.net storage
        const filename = `radio-program-${lmid}-${world}.m3u8`;
        const uploadPath = `${lmid}/${world}/${filename}`;
        
        console.log('Uploading M3U8 playlist to Bunny.net...');
        
        // Check for required environment variables
        if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE || !process.env.BUNNY_CDN_URL) {
            // Fallback: return the playlist content directly as a data URL
            console.log('Bunny.net credentials not available, returning playlist directly');
            
            const dataUrl = `data:application/vnd.apple.mpegurl;base64,${Buffer.from(m3u8Content).toString('base64')}`;
            
            const processingTime = Date.now() - startTime;
            
            return res.json({
                success: true,
                url: dataUrl,
                playlistUrl: dataUrl,
                processingTime: processingTime,
                questionCount: questionIds.length,
                totalRecordings: Object.values(recordings).flat().length,
                totalSegments: audioSequence.length,
                type: 'playlist-m3u8',
                filename: filename,
                playlist: audioSequence // Include for debugging
            });
        }

        const uploadUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${uploadPath}`;
        
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'application/vnd.apple.mpegurl'
            },
            body: m3u8Content
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        const finalUrl = `https://${process.env.BUNNY_CDN_URL}/${uploadPath}`;
        
        console.log(`M3U8 playlist uploaded successfully: ${finalUrl}`);

        const processingTime = Date.now() - startTime;

        res.json({
            success: true,
            url: finalUrl,
            playlistUrl: finalUrl,
            processingTime: processingTime,
            questionCount: questionIds.length,
            totalRecordings: Object.values(recordings).flat().length,
            totalSegments: audioSequence.length,
            type: 'playlist-m3u8', // Indicates this is an M3U8 playlist
            filename: filename
        });

    } catch (error) {
        console.error('Web Audio combining error:', error);

        res.status(500).json({
            success: false,
            error: 'Audio combination failed',
            details: error.message
        });
    }
} 