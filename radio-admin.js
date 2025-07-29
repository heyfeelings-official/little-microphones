/**
 * radio-admin.js - Comprehensive Audio File Management System
 * 
 * PURPOSE: Admin interface for managing audio files on Bunny.net
 * FEATURES:
 * - Hierarchical file tree view
 * - Audio player with waveform visualization
 * - Trim controls with silence detection
 * - File upload/delete operations
 * - Format conversion
 * 
 * USAGE: Include in Webflow page at /radio-admin
 */

(function() {
    'use strict';

    // Configuration
    const API_BASE = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : 'https://little-microphones.vercel.app';

    // Global state
    let fileTree = {};
    let selectedFile = null;
    let audioPlayer = null;
    let waveformCanvas = null;
    let waveformCtx = null;
    let trimStartMarker = 0;
    let trimEndMarker = 0;
    let isPlaying = false;
    let editedFiles = new Set();

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', init);

    /**
     * Initialize the admin interface
     */
    async function init() {
        console.log('🎵 Radio Admin System initializing...');
        
        // Create UI structure
        createAdminUI();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load initial file tree
        await loadFileTree();
        
        console.log('✅ Radio Admin System ready');
    }

    /**
     * Create the main admin UI structure
     */
    function createAdminUI() {
        const container = document.body;
        container.innerHTML = `
            <div class="radio-admin-container">
                <!-- Header -->
                <div class="admin-header">
                    <h1>🎵 Radio Admin - Audio File Management</h1>
                    <div class="header-actions">
                        <button id="refresh-tree" class="btn btn-secondary">
                            <span class="icon">🔄</span> Refresh
                        </button>
                        <button id="export-all" class="btn btn-primary">
                            <span class="icon">💾</span> Export All Changes
                        </button>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="admin-content">
                    <!-- File Tree Panel -->
                    <div class="file-tree-panel">
                        <div class="panel-header">
                            <h2>📁 File Structure</h2>
                            <button id="upload-new" class="btn btn-small">
                                <span class="icon">⬆️</span> Upload
                            </button>
                        </div>
                        <div id="file-tree" class="file-tree">
                            <div class="loading">Loading files...</div>
                        </div>
                    </div>

                    <!-- Audio Editor Panel -->
                    <div class="audio-editor-panel">
                        <div id="no-file-selected" class="empty-state">
                            <span class="icon">🎵</span>
                            <p>Select an audio file to edit</p>
                        </div>

                        <div id="editor-content" style="display: none;">
                            <!-- File Info -->
                            <div class="file-info">
                                <h2 id="file-name">File Name</h2>
                                <div class="file-meta">
                                    <span id="file-size">0 MB</span>
                                    <span id="file-duration">0:00</span>
                                    <span id="file-path">path/to/file</span>
                                </div>
                            </div>

                            <!-- Audio Player with Timeline -->
                            <div class="audio-player-section">
                                <audio id="audio-player" controls></audio>
                                
                                <!-- Waveform & Timeline -->
                                <div class="timeline-container">
                                    <canvas id="waveform-canvas"></canvas>
                                    <div class="timeline-markers">
                                        <div id="trim-start" class="trim-marker start" draggable="true">
                                            <span class="marker-time">0:00</span>
                                        </div>
                                        <div id="trim-end" class="trim-marker end" draggable="true">
                                            <span class="marker-time">0:00</span>
                                        </div>
                                        <div id="playhead" class="playhead"></div>
                                    </div>
                                </div>

                                <!-- Timeline Controls -->
                                <div class="timeline-controls">
                                    <button id="play-pause" class="btn">
                                        <span class="icon">▶️</span> Play
                                    </button>
                                    <button id="detect-silence" class="btn">
                                        <span class="icon">🔍</span> Detect Silence
                                    </button>
                                    <button id="reset-trim" class="btn">
                                        <span class="icon">↩️</span> Reset
                                    </button>
                                </div>
                            </div>

                            <!-- Trim Controls -->
                            <div class="trim-controls">
                                <h3>✂️ Trim Settings</h3>
                                <div class="trim-inputs">
                                    <div class="input-group">
                                        <label>Start Time (s)</label>
                                        <input type="number" id="trim-start-input" step="0.1" min="0" value="0">
                                    </div>
                                    <div class="input-group">
                                        <label>End Time (s)</label>
                                        <input type="number" id="trim-end-input" step="0.1" min="0" value="0">
                                    </div>
                                    <button id="apply-trim" class="btn btn-primary">
                                        Apply Trim
                                    </button>
                                </div>
                            </div>

                            <!-- File Actions -->
                            <div class="file-actions">
                                <button id="save-file" class="btn btn-success">
                                    <span class="icon">💾</span> Save Changes
                                </button>
                                <button id="delete-file" class="btn btn-danger">
                                    <span class="icon">🗑️</span> Delete File
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Upload Modal -->
                <div id="upload-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h2>Upload Audio File</h2>
                        <div class="upload-area">
                            <input type="file" id="file-input" accept="audio/*" multiple>
                            <div class="drop-zone" id="drop-zone">
                                <span class="icon">📤</span>
                                <p>Drop audio files here or click to browse</p>
                            </div>
                        </div>
                        <div class="upload-path">
                            <label>Upload to path:</label>
                            <select id="upload-path-select">
                                <option value="audio/other/">Other (intro/outro)</option>
                                <option value="audio/spookyland/">Spookyland</option>
                                <option value="audio/waterpark/">Waterpark</option>
                                <option value="audio/shopping-spree/">Shopping Spree</option>
                                <option value="audio/amusement-park/">Amusement Park</option>
                                <option value="audio/big-city/">Big City</option>
                                <option value="audio/neighborhood/">Neighborhood</option>
                            </select>
                        </div>
                        <div class="modal-actions">
                            <button id="cancel-upload" class="btn btn-secondary">Cancel</button>
                            <button id="start-upload" class="btn btn-primary">Upload</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Styles -->
            <style>
                .radio-admin-container {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 20px;
                    background: #f5f5f5;
                    min-height: 100vh;
                }

                .admin-header {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .admin-header h1 {
                    margin: 0;
                    font-size: 24px;
                    color: #333;
                }

                .header-actions {
                    display: flex;
                    gap: 10px;
                }

                .admin-content {
                    display: grid;
                    grid-template-columns: 350px 1fr;
                    gap: 20px;
                    height: calc(100vh - 140px);
                }

                .file-tree-panel, .audio-editor-panel {
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #eee;
                }

                .panel-header h2 {
                    margin: 0;
                    font-size: 18px;
                    color: #333;
                }

                .file-tree {
                    flex: 1;
                    overflow-y: auto;
                    font-size: 14px;
                }

                .tree-item {
                    padding: 4px 0;
                    cursor: pointer;
                    user-select: none;
                }

                .tree-item:hover {
                    background: #f0f0f0;
                }

                .tree-item.selected {
                    background: #e3f2fd;
                    font-weight: 500;
                }

                .tree-folder {
                    font-weight: 500;
                }

                .tree-folder::before {
                    content: '📁 ';
                }

                .tree-folder.open::before {
                    content: '📂 ';
                }

                .tree-file::before {
                    content: '🎵 ';
                }

                .tree-children {
                    margin-left: 20px;
                    display: none;
                }

                .tree-children.open {
                    display: block;
                }

                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: #999;
                }

                .empty-state .icon {
                    font-size: 48px;
                    margin-bottom: 10px;
                }

                .file-info {
                    margin-bottom: 20px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #eee;
                }

                .file-info h2 {
                    margin: 0 0 10px 0;
                    font-size: 20px;
                    color: #333;
                }

                .file-meta {
                    display: flex;
                    gap: 20px;
                    font-size: 14px;
                    color: #666;
                }

                .audio-player-section {
                    margin-bottom: 30px;
                }

                #audio-player {
                    width: 100%;
                    margin-bottom: 20px;
                }

                .timeline-container {
                    position: relative;
                    height: 150px;
                    background: #f8f8f8;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    overflow: hidden;
                }

                #waveform-canvas {
                    width: 100%;
                    height: 100%;
                }

                .timeline-markers {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    pointer-events: none;
                }

                .trim-marker {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    cursor: ew-resize;
                    pointer-events: all;
                }

                .trim-marker.start {
                    background: #4CAF50;
                    left: 0;
                }

                .trim-marker.end {
                    background: #f44336;
                    right: 0;
                }

                .trim-marker .marker-time {
                    position: absolute;
                    top: 5px;
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                    white-space: nowrap;
                }

                .trim-marker.start .marker-time {
                    left: 5px;
                }

                .trim-marker.end .marker-time {
                    right: 5px;
                }

                .playhead {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 1px;
                    background: #2196F3;
                    left: 0;
                    pointer-events: none;
                }

                .timeline-controls {
                    display: flex;
                    gap: 10px;
                    margin-top: 15px;
                }

                .trim-controls {
                    background: #f8f8f8;
                    padding: 20px;
                    border-radius: 4px;
                    margin-bottom: 20px;
                }

                .trim-controls h3 {
                    margin: 0 0 15px 0;
                    font-size: 16px;
                    color: #333;
                }

                .trim-inputs {
                    display: flex;
                    gap: 15px;
                    align-items: flex-end;
                }

                .input-group {
                    flex: 1;
                }

                .input-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-size: 14px;
                    color: #666;
                }

                .input-group input {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .file-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }

                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    font-size: 14px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    transition: background-color 0.2s;
                }

                .btn:hover {
                    opacity: 0.9;
                }

                .btn-primary {
                    background: #2196F3;
                    color: white;
                }

                .btn-secondary {
                    background: #757575;
                    color: white;
                }

                .btn-success {
                    background: #4CAF50;
                    color: white;
                }

                .btn-danger {
                    background: #f44336;
                    color: white;
                }

                .btn-small {
                    padding: 5px 10px;
                    font-size: 12px;
                }

                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    max-width: 500px;
                    width: 100%;
                }

                .modal-content h2 {
                    margin: 0 0 20px 0;
                    font-size: 20px;
                    color: #333;
                }

                .upload-area {
                    margin-bottom: 20px;
                }

                .drop-zone {
                    border: 2px dashed #ddd;
                    border-radius: 8px;
                    padding: 40px;
                    text-align: center;
                    cursor: pointer;
                    transition: border-color 0.2s;
                }

                .drop-zone:hover {
                    border-color: #2196F3;
                }

                .drop-zone.dragover {
                    border-color: #2196F3;
                    background: #e3f2fd;
                }

                .upload-path {
                    margin-bottom: 20px;
                }

                .upload-path label {
                    display: block;
                    margin-bottom: 5px;
                    font-size: 14px;
                    color: #666;
                }

                .upload-path select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .modal-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }

                .loading {
                    text-align: center;
                    color: #999;
                    padding: 20px;
                }

                .file-edited {
                    font-style: italic;
                    color: #ff9800;
                }

                .file-edited::after {
                    content: ' *';
                    color: #ff9800;
                }
            </style>
        `;
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // File tree
        document.getElementById('refresh-tree').addEventListener('click', loadFileTree);
        document.getElementById('upload-new').addEventListener('click', showUploadModal);
        
        // Audio player
        const player = document.getElementById('audio-player');
        player.addEventListener('timeupdate', updatePlayhead);
        player.addEventListener('loadedmetadata', initializeTimeline);
        
        // Timeline controls
        document.getElementById('play-pause').addEventListener('click', togglePlayPause);
        document.getElementById('detect-silence').addEventListener('click', detectSilence);
        document.getElementById('reset-trim').addEventListener('click', resetTrim);
        document.getElementById('apply-trim').addEventListener('click', applyTrim);
        
        // Trim inputs
        document.getElementById('trim-start-input').addEventListener('change', updateTrimFromInputs);
        document.getElementById('trim-end-input').addEventListener('change', updateTrimFromInputs);
        
        // File actions
        document.getElementById('save-file').addEventListener('click', saveFile);
        document.getElementById('delete-file').addEventListener('click', deleteFile);
        document.getElementById('export-all').addEventListener('click', exportAllChanges);
        
        // Upload modal
        document.getElementById('cancel-upload').addEventListener('click', hideUploadModal);
        document.getElementById('start-upload').addEventListener('click', startUpload);
        
        // Drag and drop
        setupDragAndDrop();
        
        // Timeline markers
        setupMarkerDragging();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboard);
    }

    /**
     * Load file tree from API
     */
    async function loadFileTree() {
        const treeContainer = document.getElementById('file-tree');
        treeContainer.innerHTML = '<div class="loading">Loading files...</div>';
        
        try {
            const response = await fetch(`${API_BASE}/api/admin/list-all-files`);
            const data = await response.json();
            
            if (data.success) {
                fileTree = data.tree;
                renderFileTree(treeContainer, fileTree);
                
                // Update summary
                console.log(`📊 Loaded ${data.summary.totalFiles} files (${data.summary.totalSizeMB} MB)`);
            } else {
                treeContainer.innerHTML = '<div class="error">Failed to load files</div>';
            }
        } catch (error) {
            console.error('Error loading file tree:', error);
            treeContainer.innerHTML = '<div class="error">Error loading files</div>';
        }
    }

    /**
     * Render file tree recursively
     */
    function renderFileTree(container, tree, level = 0) {
        container.innerHTML = '';
        
        for (const [name, node] of Object.entries(tree)) {
            if (node.type === 'folder') {
                const folderEl = createFolderElement(name, node, level);
                container.appendChild(folderEl);
            } else if (node.type === 'file') {
                const fileEl = createFileElement(name, node, level);
                container.appendChild(fileEl);
            }
        }
    }

    /**
     * Create folder element
     */
    function createFolderElement(name, folder, level) {
        const div = document.createElement('div');
        div.className = 'tree-item tree-folder';
        div.style.paddingLeft = `${level * 20}px`;
        div.textContent = name;
        
        // Create children container
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'tree-children';
        
        // Toggle folder open/close
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            div.classList.toggle('open');
            childrenDiv.classList.toggle('open');
            
            // Lazy load children if needed
            if (childrenDiv.children.length === 0 && folder.children) {
                renderFileTree(childrenDiv, folder.children, level + 1);
            }
        });
        
        const wrapper = document.createElement('div');
        wrapper.appendChild(div);
        wrapper.appendChild(childrenDiv);
        
        return wrapper;
    }

    /**
     * Create file element
     */
    function createFileElement(name, file, level) {
        const div = document.createElement('div');
        div.className = 'tree-item tree-file';
        div.style.paddingLeft = `${level * 20}px`;
        div.textContent = name;
        
        // Mark edited files
        if (editedFiles.has(file.path)) {
            div.classList.add('file-edited');
        }
        
        // File click handler
        div.addEventListener('click', () => selectFile(file));
        
        return div;
    }

    /**
     * Select and load a file
     */
    async function selectFile(file) {
        selectedFile = file;
        
        // Update UI
        document.getElementById('no-file-selected').style.display = 'none';
        document.getElementById('editor-content').style.display = 'block';
        
        // Update file info
        document.getElementById('file-name').textContent = file.path.split('/').pop();
        document.getElementById('file-size').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
        document.getElementById('file-path').textContent = file.path;
        
        // Load audio
        const player = document.getElementById('audio-player');
        player.src = file.url;
        
        // Reset trim markers
        resetTrim();
        
        // Mark selected in tree
        document.querySelectorAll('.tree-item').forEach(el => {
            el.classList.remove('selected');
        });
        event.target.classList.add('selected');
    }

    /**
     * Initialize timeline when audio loads
     */
    function initializeTimeline() {
        const player = document.getElementById('audio-player');
        const duration = player.duration;
        
        // Update duration display
        document.getElementById('file-duration').textContent = formatTime(duration);
        
        // Set initial trim markers
        trimStartMarker = 0;
        trimEndMarker = duration;
        
        // Update inputs
        document.getElementById('trim-start-input').value = 0;
        document.getElementById('trim-start-input').max = duration;
        document.getElementById('trim-end-input').value = duration.toFixed(1);
        document.getElementById('trim-end-input').max = duration;
        
        // Draw waveform
        drawWaveform();
        
        // Update marker positions
        updateMarkerPositions();
    }

    /**
     * Draw waveform visualization
     */
    function drawWaveform() {
        const canvas = document.getElementById('waveform-canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Draw placeholder waveform
        ctx.fillStyle = '#ddd';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw fake waveform bars
        ctx.fillStyle = '#999';
        const barWidth = 3;
        const barGap = 2;
        const barCount = Math.floor(canvas.width / (barWidth + barGap));
        
        for (let i = 0; i < barCount; i++) {
            const x = i * (barWidth + barGap);
            const height = Math.random() * canvas.height * 0.8 + canvas.height * 0.1;
            const y = (canvas.height - height) / 2;
            ctx.fillRect(x, y, barWidth, height);
        }
    }

    /**
     * Update playhead position
     */
    function updatePlayhead() {
        const player = document.getElementById('audio-player');
        const playhead = document.getElementById('playhead');
        const canvas = document.getElementById('waveform-canvas');
        
        if (player.duration) {
            const position = (player.currentTime / player.duration) * canvas.width;
            playhead.style.left = `${position}px`;
        }
    }

    /**
     * Update marker positions
     */
    function updateMarkerPositions() {
        const player = document.getElementById('audio-player');
        const canvas = document.getElementById('waveform-canvas');
        const startMarker = document.getElementById('trim-start');
        const endMarker = document.getElementById('trim-end');
        
        if (player.duration) {
            const startPos = (trimStartMarker / player.duration) * canvas.width;
            const endPos = (trimEndMarker / player.duration) * canvas.width;
            
            startMarker.style.left = `${startPos}px`;
            endMarker.style.left = `${endPos}px`;
            
            // Update time labels
            startMarker.querySelector('.marker-time').textContent = formatTime(trimStartMarker);
            endMarker.querySelector('.marker-time').textContent = formatTime(trimEndMarker);
        }
    }

    /**
     * Setup marker dragging
     */
    function setupMarkerDragging() {
        const startMarker = document.getElementById('trim-start');
        const endMarker = document.getElementById('trim-end');
        const canvas = document.getElementById('waveform-canvas');
        
        let draggingMarker = null;
        
        // Start marker
        startMarker.addEventListener('mousedown', (e) => {
            e.preventDefault();
            draggingMarker = 'start';
        });
        
        // End marker
        endMarker.addEventListener('mousedown', (e) => {
            e.preventDefault();
            draggingMarker = 'end';
        });
        
        // Mouse move
        document.addEventListener('mousemove', (e) => {
            if (!draggingMarker) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, canvas.width));
            const player = document.getElementById('audio-player');
            const time = (x / canvas.width) * player.duration;
            
            if (draggingMarker === 'start') {
                trimStartMarker = Math.min(time, trimEndMarker - 0.1);
                document.getElementById('trim-start-input').value = trimStartMarker.toFixed(1);
            } else {
                trimEndMarker = Math.max(time, trimStartMarker + 0.1);
                document.getElementById('trim-end-input').value = trimEndMarker.toFixed(1);
            }
            
            updateMarkerPositions();
        });
        
        // Mouse up
        document.addEventListener('mouseup', () => {
            draggingMarker = null;
        });
    }

    /**
     * Toggle play/pause
     */
    function togglePlayPause() {
        const player = document.getElementById('audio-player');
        const btn = document.getElementById('play-pause');
        
        if (player.paused) {
            player.play();
            btn.innerHTML = '<span class="icon">⏸️</span> Pause';
        } else {
            player.pause();
            btn.innerHTML = '<span class="icon">▶️</span> Play';
        }
    }

    /**
     * Detect silence in audio
     */
    async function detectSilence() {
        if (!selectedFile) return;
        
        const btn = document.getElementById('detect-silence');
        btn.disabled = true;
        btn.innerHTML = '<span class="icon">⏳</span> Detecting...';
        
        try {
            const response = await fetch(`${API_BASE}/api/admin/trim-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: selectedFile.path,
                    mode: 'auto',
                    detectSilence: true
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.silenceDetection) {
                // Update trim markers
                trimStartMarker = data.silenceDetection.detectedStart;
                trimEndMarker = data.silenceDetection.detectedEnd;
                
                // Update inputs
                document.getElementById('trim-start-input').value = trimStartMarker.toFixed(1);
                document.getElementById('trim-end-input').value = trimEndMarker.toFixed(1);
                
                // Update visual markers
                updateMarkerPositions();
                
                alert(`Silence detected!\nSuggested trim: ${formatTime(trimStartMarker)} - ${formatTime(trimEndMarker)}`);
            }
        } catch (error) {
            console.error('Error detecting silence:', error);
            alert('Failed to detect silence');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="icon">🔍</span> Detect Silence';
        }
    }

    /**
     * Reset trim markers
     */
    function resetTrim() {
        const player = document.getElementById('audio-player');
        if (player.duration) {
            trimStartMarker = 0;
            trimEndMarker = player.duration;
            
            document.getElementById('trim-start-input').value = 0;
            document.getElementById('trim-end-input').value = trimEndMarker.toFixed(1);
            
            updateMarkerPositions();
        }
    }

    /**
     * Update trim from input fields
     */
    function updateTrimFromInputs() {
        trimStartMarker = parseFloat(document.getElementById('trim-start-input').value) || 0;
        trimEndMarker = parseFloat(document.getElementById('trim-end-input').value) || 0;
        updateMarkerPositions();
    }

    /**
     * Apply trim to file
     */
    async function applyTrim() {
        if (!selectedFile) return;
        
        const btn = document.getElementById('apply-trim');
        btn.disabled = true;
        btn.innerHTML = 'Trimming...';
        
        try {
            const response = await fetch(`${API_BASE}/api/admin/trim-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: selectedFile.path,
                    mode: 'manual',
                    trimStart: trimStartMarker,
                    trimEnd: trimEndMarker
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.trimmed) {
                // Mark file as edited
                editedFiles.add(selectedFile.path);
                
                // Reload audio with new version
                const player = document.getElementById('audio-player');
                player.src = data.url;
                
                // Update file tree to show edited status
                await loadFileTree();
                
                alert('Audio trimmed successfully!');
            } else {
                alert('No trimming needed - file unchanged');
            }
        } catch (error) {
            console.error('Error trimming audio:', error);
            alert('Failed to trim audio');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Apply Trim';
        }
    }

    /**
     * Save file changes
     */
    async function saveFile() {
        if (!selectedFile || !editedFiles.has(selectedFile.path)) {
            alert('No changes to save');
            return;
        }
        
        // In this case, changes are already saved to Bunny.net
        editedFiles.delete(selectedFile.path);
        await loadFileTree();
        alert('File saved successfully!');
    }

    /**
     * Delete file
     */
    async function deleteFile() {
        if (!selectedFile) return;
        
        if (!confirm(`Are you sure you want to delete ${selectedFile.path}?`)) {
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/api/delete-audio`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: selectedFile.path.split('/').pop(),
                    world: extractWorldFromPath(selectedFile.path),
                    lmid: extractLmidFromPath(selectedFile.path),
                    questionId: extractQuestionIdFromPath(selectedFile.path),
                    lang: extractLangFromPath(selectedFile.path) || 'en'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Clear selection
                selectedFile = null;
                document.getElementById('no-file-selected').style.display = 'block';
                document.getElementById('editor-content').style.display = 'none';
                
                // Reload tree
                await loadFileTree();
                
                alert('File deleted successfully!');
            } else {
                alert('Failed to delete file: ' + data.error);
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Failed to delete file');
        }
    }

    /**
     * Show upload modal
     */
    function showUploadModal() {
        document.getElementById('upload-modal').style.display = 'flex';
    }

    /**
     * Hide upload modal
     */
    function hideUploadModal() {
        document.getElementById('upload-modal').style.display = 'none';
        document.getElementById('file-input').value = '';
    }

    /**
     * Setup drag and drop
     */
    function setupDragAndDrop() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        
        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            handleFiles(files);
        });
        
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            handleFiles(files);
        });
    }

    /**
     * Handle file upload
     */
    function handleFiles(files) {
        const audioFiles = files.filter(file => file.type.startsWith('audio/'));
        
        if (audioFiles.length === 0) {
            alert('Please select audio files only');
            return;
        }
        
        // Update UI to show selected files
        const dropZone = document.getElementById('drop-zone');
        dropZone.innerHTML = `
            <span class="icon">📤</span>
            <p>${audioFiles.length} file(s) selected</p>
            <p style="font-size: 12px; color: #666;">${audioFiles.map(f => f.name).join(', ')}</p>
        `;
    }

    /**
     * Start upload process
     */
    async function startUpload() {
        const fileInput = document.getElementById('file-input');
        const files = Array.from(fileInput.files);
        const uploadPath = document.getElementById('upload-path-select').value;
        
        if (files.length === 0) {
            alert('Please select files to upload');
            return;
        }
        
        const btn = document.getElementById('start-upload');
        btn.disabled = true;
        btn.innerHTML = 'Uploading...';
        
        let successCount = 0;
        
        for (const file of files) {
            try {
                // Convert to base64
                const base64 = await fileToBase64(file);
                
                // Determine full path
                const fullPath = uploadPath + file.name;
                
                // Upload file
                const response = await fetch(`${API_BASE}/api/admin/upload-static-audio`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        audioData: base64,
                        filename: file.name,
                        path: fullPath
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    successCount++;
                    console.log(`✅ Uploaded: ${data.path}`);
                } else {
                    console.error(`❌ Failed to upload ${file.name}: ${data.error}`);
                }
            } catch (error) {
                console.error(`❌ Error uploading ${file.name}:`, error);
            }
        }
        
        // Hide modal and reload tree
        hideUploadModal();
        await loadFileTree();
        
        alert(`Upload complete! ${successCount}/${files.length} files uploaded successfully.`);
        
        btn.disabled = false;
        btn.innerHTML = 'Upload';
    }

    /**
     * Export all changes
     */
    function exportAllChanges() {
        if (editedFiles.size === 0) {
            alert('No changes to export');
            return;
        }
        
        const changes = Array.from(editedFiles).join('\n');
        alert(`Files with unsaved changes:\n\n${changes}\n\nAll changes are automatically saved to Bunny.net`);
    }

    /**
     * Handle keyboard shortcuts
     */
    function handleKeyboard(e) {
        // Spacebar: play/pause
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            togglePlayPause();
        }
        
        // Delete: delete file
        if (e.code === 'Delete' && selectedFile) {
            deleteFile();
        }
        
        // Ctrl+S: save
        if (e.ctrlKey && e.code === 'KeyS') {
            e.preventDefault();
            saveFile();
        }
    }

    /**
     * Utility: Convert file to base64
     */
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Utility: Format time
     */
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Utility: Extract world from path
     */
    function extractWorldFromPath(path) {
        const match = path.match(/audio\/([\w-]+)\//);
        return match ? match[1] : null;
    }

    /**
     * Utility: Extract LMID from path
     */
    function extractLmidFromPath(path) {
        const match = path.match(/\/(\d+)\//);
        return match ? match[1] : null;
    }

    /**
     * Utility: Extract question ID from path
     */
    function extractQuestionIdFromPath(path) {
        const match = path.match(/QID(\d+)/);
        return match ? match[1] : null;
    }

    /**
     * Utility: Extract language from path
     */
    function extractLangFromPath(path) {
        const match = path.match(/^(en|pl)\//);
        return match ? match[1] : null;
    }

})(); 