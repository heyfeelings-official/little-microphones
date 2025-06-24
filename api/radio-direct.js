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
        console.log('Radio Direct API called');

        // Only allow POST requests
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const startTime = Date.now();
        const { lmid, world, recordings } = req.body;

        console.log(`Processing radio program for ${world}/${lmid}`);
        console.log('Recordings received:', Object.keys(recordings));

        // Validate input
        if (!lmid || !world || !recordings || Object.keys(recordings).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields or no recordings provided'
            });
        }

        // Build playlist with static files and user recordings
        const playlist = [];
        const baseUrl = `https://little-microphones.b-cdn.net`;

        // Add intro
        playlist.push({
            title: `Welcome to ${world.charAt(0).toUpperCase() + world.slice(1)} Radio`,
            type: 'intro',
            url: `${baseUrl}/intro.mp3`
        });

        // Process each question and its recordings
        const questionIds = Object.keys(recordings).sort();
        console.log(`Processing ${questionIds.length} questions: ${questionIds.join(', ')}`);

        for (let i = 0; i < questionIds.length; i++) {
            const questionId = questionIds[i];
            const questionRecordings = recordings[questionId];

            // Add question prompt
            playlist.push({
                title: `Question ${i + 1}`,
                type: 'question',
                url: `${baseUrl}/${questionId}.mp3`
            });

            // Add all user recordings for this question
            questionRecordings.forEach((filename, index) => {
                playlist.push({
                    title: `Answer ${index + 1} - Question ${i + 1}`,
                    type: 'answer',
                    url: `${baseUrl}/${lmid}/${world}/${filename}`
                });
            });

            // Add transition music between questions (except after last question)
            if (i < questionIds.length - 1) {
                playlist.push({
                    title: 'Musical Transition',
                    type: 'transition',
                    url: `${baseUrl}/monkeys.mp3`
                });
            }
        }

        // Add outro
        playlist.push({
            title: 'Thank you for listening!',
            type: 'outro',
            url: `${baseUrl}/outro.mp3`
        });

        console.log(`Generated playlist with ${playlist.length} items`);

        // Generate a simple API URL that will serve the HTML
        const radioUrl = `https://little-microphones.vercel.app/api/radio-player?lmid=${lmid}&world=${world}&t=${Date.now()}`;

        const processingTime = Date.now() - startTime;

        // Store the playlist in a simple way (you might want to use a database for production)
        // For now, we'll generate a unique identifier and store it temporarily
        const playlistId = `${lmid}-${world}-${Date.now()}`;
        
        console.log(`Radio program generated successfully in ${processingTime}ms`);

        res.json({
            success: true,
            url: radioUrl,
            playlistUrl: radioUrl,
            processingTime: processingTime,
            questionCount: questionIds.length,
            totalRecordings: Object.values(recordings).flat().length,
            type: 'direct',
            playlistId: playlistId,
            playlist: playlist // Include playlist data for debugging
        });

    } catch (error) {
        console.error('Radio Direct API error:', error);

        res.status(500).json({
            success: false,
            error: 'Radio program generation failed',
            details: error.message
        });
    }
} 