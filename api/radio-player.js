export default async function handler(req, res) {
    try {
        const { lmid, world, t } = req.query;

        if (!lmid || !world) {
            return res.status(400).send('Missing lmid or world parameter');
        }

        // Build the playlist (this is a simplified version - in production you'd store this)
        const baseUrl = `https://little-microphones.b-cdn.net`;
        const worldName = world.charAt(0).toUpperCase() + world.slice(1).replace(/-/g, ' ');

        // For now, create a basic playlist - this would normally be stored/retrieved
        const playlist = [
            {
                title: `Welcome to ${worldName} Radio`,
                type: 'intro',
                url: `${baseUrl}/intro.mp3`
            },
            {
                title: 'Question 1',
                type: 'question',
                url: `${baseUrl}/Q-ID%209.mp3`
            },
            {
                title: 'Your Recordings',
                type: 'answer',
                url: `${baseUrl}/${lmid}/${world}/recording_1.webm`
            },
            {
                title: 'Musical Transition',
                type: 'transition',
                url: `${baseUrl}/monkeys.mp3`
            },
            {
                title: 'Thank you for listening!',
                type: 'outro',
                url: `${baseUrl}/outro.mp3`
            }
        ];

        const html = `
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

        // Set content type to HTML
        res.setHeader('Content-Type', 'text/html');
        res.send(html);

    } catch (error) {
        console.error('Radio player error:', error);
        res.status(500).send(`Error generating radio player: ${error.message}`);
    }
}

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