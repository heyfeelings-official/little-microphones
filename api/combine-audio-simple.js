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

    const startTime = Date.now();

    try {
        const { lmid, world, recordings } = req.body;

        // Validation
        if (!lmid || !world || !recordings) {
            return res.status(400).json({ 
                error: 'Missing required fields: lmid, world, and recordings' 
            });
        }

        // Validate recordings structure
        if (typeof recordings !== 'object' || Object.keys(recordings).length === 0) {
            return res.status(400).json({ 
                error: 'Invalid recordings format. Expected object with question keys.' 
            });
        }

        // Check environment variables
        if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE || !process.env.BUNNY_CDN_URL) {
            console.error('Missing Bunny.net configuration');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        console.log(`Starting simplified radio program generation for LMID ${lmid}, World ${world}`);
        console.log(`Recordings structure:`, Object.keys(recordings).map(q => `${q}: ${recordings[q].length} files`));
        console.log(`Full recordings data:`, JSON.stringify(recordings, null, 2));

        // Create a simple playlist/manifest instead of actually combining files
        const baseUrl = `https://${process.env.BUNNY_CDN_URL}`;
        const playlist = [];
        
        // Add intro if available
        playlist.push({
            type: 'intro',
            url: `${baseUrl}/audio/other/intro.mp3`,
            title: 'Introduction'
        });

        // Add each question block
        for (const [questionKey, questionRecordings] of Object.entries(recordings)) {
            if (questionRecordings && questionRecordings.length > 0) {
                const questionId = questionKey.replace(/^Q/, '');
                
                // Add question prompt
                playlist.push({
                    type: 'question',
                    url: `${baseUrl}/audio/${world}/${world}-Q${questionId}.mp3`,
                    title: `Question ${questionId}`,
                    questionId: questionId
                });

                // Add all answers for this question
                questionRecordings.forEach((recordingFilename, index) => {
                    playlist.push({
                        type: 'answer',
                        url: `${baseUrl}/${lmid}/${world}/${recordingFilename}`,
                        title: `Answer ${index + 1} for Question ${questionId}`,
                        questionId: questionId,
                        answerIndex: index + 1
                    });
                });

                // Add background music between questions
                if (Object.keys(recordings).indexOf(questionKey) < Object.keys(recordings).length - 1) {
                    playlist.push({
                        type: 'transition',
                        url: `${baseUrl}/audio/other/monkeys.mp3`,
                        title: 'Transition Music',
                        duration: 5 // 5 seconds
                    });
                }
            }
        }

        // Add outro
        playlist.push({
            type: 'outro',
            url: `${baseUrl}/audio/other/outro.mp3`,
            title: 'Outro'
        });

        // Create a simple HTML audio player page for the radio program
        console.log('Generating radio player HTML...');
        const radioHtml = generateRadioPlayerHtml(playlist, world, lmid);
        console.log('HTML generated, length:', radioHtml.length);
        
        // Upload the HTML player to Bunny.net
        console.log('Starting upload to Bunny.net...');
        const uploadResult = await uploadRadioPlayer(radioHtml, lmid, world);
        console.log('Upload completed:', uploadResult);

        const processingTime = Date.now() - startTime;
        console.log(`Simplified radio program generated in ${processingTime}ms`);

        res.json({
            success: true,
            url: uploadResult.url,
            playlistUrl: uploadResult.playlistUrl,
            processingTime: processingTime,
            questionCount: Object.keys(recordings).length,
            totalRecordings: Object.values(recordings).flat().length,
            type: 'playlist' // Indicates this is a playlist-based solution
        });

    } catch (error) {
        console.error('Radio program generation error:', error);

        res.status(500).json({
            success: false,
            error: 'Radio program generation failed',
            details: error.message
        });
    }
}

function generateRadioPlayerHtml(playlist, world, lmid) {
    const worldName = world.charAt(0).toUpperCase() + world.slice(1).replace(/-/g, ' ');
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Radio Program - ${worldName} - LMID ${lmid}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            color: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 30px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .player-controls {
            text-align: center;
            margin-bottom: 30px;
        }
        .play-all-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid white;
            color: white;
            padding: 15px 30px;
            font-size: 18px;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .play-all-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        .playlist {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            padding: 20px;
        }
        .playlist-item {
            display: flex;
            align-items: center;
            padding: 15px;
            margin-bottom: 10px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            transition: all 0.3s ease;
        }
        .playlist-item:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        .playlist-item.playing {
            background: rgba(255, 255, 255, 0.3);
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
        }
        .item-icon {
            font-size: 24px;
            margin-right: 15px;
            width: 30px;
            text-align: center;
        }
        .item-info {
            flex: 1;
        }
        .item-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .item-type {
            font-size: 12px;
            opacity: 0.8;
        }
        .item-controls {
            display: flex;
            gap: 10px;
        }
        .control-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
        }
        .control-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        .current-audio {
            margin-top: 20px;
            text-align: center;
        }
        .current-audio audio {
            width: 100%;
            max-width: 500px;
        }
        .progress {
            text-align: center;
            margin-top: 20px;
            font-size: 18px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎙️ ${worldName} Radio Program</h1>
        <p style="text-align: center; opacity: 0.9;">LMID ${lmid} • ${playlist.length} segments</p>
        
        <div class="player-controls">
            <button class="play-all-btn" onclick="playAll()">▶️ Play Complete Program</button>
        </div>

        <div class="current-audio">
            <audio id="currentAudio" controls style="display: none;">
                Your browser does not support the audio element.
            </audio>
            <div class="progress" id="progress">Click "Play Complete Program" to start</div>
        </div>

        <div class="playlist" id="playlist">
            ${playlist.map((item, index) => `
                <div class="playlist-item" data-index="${index}">
                    <div class="item-icon">${getItemIcon(item.type)}</div>
                    <div class="item-info">
                        <div class="item-title">${item.title}</div>
                        <div class="item-type">${item.type.toUpperCase()}</div>
                    </div>
                    <div class="item-controls">
                        <button class="control-btn" onclick="playItem(${index})">▶️ Play</button>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <script>
        const playlist = ${JSON.stringify(playlist)};
        let currentIndex = 0;
        let isPlayingAll = false;
        const audio = document.getElementById('currentAudio');
        const progress = document.getElementById('progress');

        function getItemIcon(type) {
            const icons = {
                intro: '🎵',
                question: '❓', 
                answer: '💬',
                transition: '🎶',
                outro: '🎵'
            };
            return icons[type] || '🔊';
        }

        function playAll() {
            isPlayingAll = true;
            currentIndex = 0;
            playCurrentItem();
        }

        function playItem(index) {
            isPlayingAll = false;
            currentIndex = index;
            playCurrentItem();
        }

        function playCurrentItem() {
            if (currentIndex >= playlist.length) {
                progress.textContent = 'Program completed! 🎉';
                updatePlaylistDisplay();
                return;
            }

            const item = playlist[currentIndex];
            audio.src = item.url;
            audio.style.display = 'block';
            
            progress.textContent = 'Playing: ' + item.title + ' (' + (currentIndex + 1) + '/' + playlist.length + ')';
            
            // Update visual feedback
            updatePlaylistDisplay();
            
            audio.play().catch(error => {
                console.warn('Could not play:', item.url, error);
                if (isPlayingAll) {
                    nextItem();
                } else {
                    progress.textContent = 'Could not play: ' + item.title;
                }
            });
        }

        function nextItem() {
            currentIndex++;
            if (isPlayingAll) {
                playCurrentItem();
            }
        }

        function updatePlaylistDisplay() {
            document.querySelectorAll('.playlist-item').forEach((item, index) => {
                item.classList.toggle('playing', index === currentIndex);
            });
        }

        // Auto-advance when playing all
        audio.addEventListener('ended', () => {
            if (isPlayingAll) {
                nextItem();
            }
        });

        // Handle errors
        audio.addEventListener('error', () => {
            if (isPlayingAll) {
                nextItem();
            }
        });
    </script>
</body>
</html>`;
}

async function uploadRadioPlayer(htmlContent, lmid, world) {
    try {
        const filename = `radio-program-${lmid}-${world}.html`;
        const uploadPath = `${lmid}/${world}/${filename}`;
        const uploadUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${uploadPath}`;
        
        console.log(`Uploading radio player: ${filename}`);
        
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'text/html'
            },
            body: htmlContent
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }

        const playUrl = `https://${process.env.BUNNY_CDN_URL}/${uploadPath}`;
        
        console.log(`Radio player uploaded successfully: ${playUrl}`);
        
        return {
            url: playUrl,
            playlistUrl: playUrl,
            filename: filename
        };
        
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
} 