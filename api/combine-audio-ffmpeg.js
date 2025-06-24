import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

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
        console.log('FFmpeg audio combining API called');

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

        // Initialize FFmpeg
        console.log('Initializing FFmpeg...');
        const ffmpeg = new FFmpeg();
        
        // Load FFmpeg with CDN URLs
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        console.log('FFmpeg loaded successfully');

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

        // Download and write all audio files to FFmpeg filesystem
        console.log('Downloading audio files...');
        const downloadPromises = audioSequence.map(async (item, index) => {
            try {
                console.log(`Downloading ${item.filename}...`);
                const response = await fetch(item.url);
                if (!response.ok) {
                    console.warn(`Failed to download ${item.filename}: ${response.status}`);
                    return null;
                }
                const arrayBuffer = await response.arrayBuffer();
                const filename = `${String(index).padStart(3, '0')}_${item.filename}`;
                await ffmpeg.writeFile(filename, new Uint8Array(arrayBuffer));
                console.log(`Successfully downloaded and wrote ${filename}`);
                return filename;
            } catch (error) {
                console.error(`Error downloading ${item.filename}:`, error);
                return null;
            }
        });

        const downloadedFiles = (await Promise.all(downloadPromises)).filter(Boolean);
        console.log(`Successfully downloaded ${downloadedFiles.length} files`);

        if (downloadedFiles.length === 0) {
            throw new Error('No audio files could be downloaded');
        }

        // Create concat demuxer input file
        const concatContent = downloadedFiles.map(filename => `file '${filename}'`).join('\n');
        await ffmpeg.writeFile('concat_list.txt', concatContent);

        console.log('Starting audio combination with FFmpeg...');
        
        // Combine all audio files into one
        await ffmpeg.exec([
            '-f', 'concat',
            '-safe', '0',
            '-i', 'concat_list.txt',
            '-c', 'copy',
            '-y',
            'combined_radio_program.mp3'
        ]);

        console.log('Audio combination completed');

        // Read the combined file
        const combinedData = await ffmpeg.readFile('combined_radio_program.mp3');
        
        // Upload to Bunny.net storage
        const filename = `radio-program-${lmid}-${world}.mp3`;
        const uploadPath = `${lmid}/${world}/${filename}`;
        
        console.log('Uploading combined audio to Bunny.net...');
        
        // Note: You'll need to set these environment variables in Vercel
        if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE || !process.env.BUNNY_CDN_URL) {
            throw new Error('Bunny.net credentials not configured');
        }

        const uploadUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${uploadPath}`;
        
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'audio/mpeg'
            },
            body: combinedData
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        const finalUrl = `https://${process.env.BUNNY_CDN_URL}/${uploadPath}`;
        
        console.log(`Combined radio program uploaded successfully: ${finalUrl}`);

        const processingTime = Date.now() - startTime;

        res.json({
            success: true,
            url: finalUrl,
            playlistUrl: finalUrl, // Same as URL since it's a single file
            processingTime: processingTime,
            questionCount: questionIds.length,
            totalRecordings: Object.values(recordings).flat().length,
            totalSegments: audioSequence.length,
            type: 'combined', // Indicates this is a single combined file
            filename: filename
        });

    } catch (error) {
        console.error('FFmpeg audio combining error:', error);

        res.status(500).json({
            success: false,
            error: 'Audio combination failed',
            details: error.message
        });
    }
} 