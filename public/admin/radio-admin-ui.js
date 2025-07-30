/**
 * Radio Admin UI - Audio File Management Interface
 * Handles file tree, audio playback, trimming, and file operations
 */

// Configuration
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : window.location.origin;

// Debug logging
console.log('🎯 Admin API Base URL:', API_BASE);

// Application State
const AppState = {
    fileTree: {},
    selectedFile: null,
    audioPlayer: null,
    waveformCanvas: null,
    waveformCtx: null,
    trimStartMarker: 0,
    trimEndMarker: 0,
    audioDuration: 0,
    editedFiles: new Set(),
    isDraggingMarker: null,
    waveformData: [] // Store waveform so it doesn't move when trimming
};

// Audio file extensions we support
const AUDIO_EXTENSIONS = ['.webm', '.mp3', '.wav', '.ogg', '.m4a', '.aac'];

// Initialize Application
document.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('🎵 Radio Admin UI initializing...');
    
    // Initialize components
    AppState.audioPlayer = document.getElementById('audio-player');
    AppState.waveformCanvas = document.getElementById('waveform-canvas');
    AppState.waveformCtx = AppState.waveformCanvas.getContext('2d');
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial file tree
    await loadFileTree();
    
    console.log('✅ Radio Admin UI ready');
}

// Event Listeners Setup
function setupEventListeners() {
    // File tree controls
    document.getElementById('refresh-tree').addEventListener('click', loadFileTree);
    document.getElementById('upload-new').addEventListener('click', showUploadModal);
    
    // Audio player events
    AppState.audioPlayer.addEventListener('timeupdate', updatePlayhead);
    AppState.audioPlayer.addEventListener('loadedmetadata', initializeTimeline);
    AppState.audioPlayer.addEventListener('loadeddata', initializeTimeline);
    AppState.audioPlayer.addEventListener('canplay', initializeTimeline);
    AppState.audioPlayer.addEventListener('durationchange', initializeTimeline);
    AppState.audioPlayer.addEventListener('error', handleAudioError);
    
    // Timeline controls
    document.getElementById('detect-silence').addEventListener('click', detectSilence);
    document.getElementById('reset-trim').addEventListener('click', resetTrim);
    document.getElementById('apply-trim').addEventListener('click', applyTrim);
    
    // Trim inputs
    document.getElementById('trim-start-input').addEventListener('input', updateTrimFromInputs);
    document.getElementById('trim-end-input').addEventListener('input', updateTrimFromInputs);
    
    // File actions
    document.getElementById('replace-file').addEventListener('click', replaceFile);
    document.getElementById('delete-file').addEventListener('click', deleteFile);
    document.getElementById('save-file').addEventListener('click', saveFile);
    document.getElementById('export-all').addEventListener('click', exportAllChanges);
    
    // Upload modal
    document.getElementById('cancel-upload').addEventListener('click', hideUploadModal);
    document.getElementById('start-upload').addEventListener('click', startUpload);
    
    // Timeline click to seek
    AppState.waveformCanvas.addEventListener('click', seekToPosition);
    
    // Setup drag and drop
    setupDragAndDrop();
    
    // Setup marker dragging
    setupMarkerDragging();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

// File Tree Management
async function loadFileTree() {
    const treeContainer = document.getElementById('file-tree');
    treeContainer.innerHTML = `
        <div class="flex items-center justify-center py-12">
            <div class="text-center">
                <svg class="animate-spin h-8 w-8 text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p class="mt-2 text-sm text-gray-500">Loading files...</p>
            </div>
        </div>
    `;
    
    try {
        console.log('🔄 Fetching file tree from:', `${API_BASE}/api/admin/list-all-files`);
        const response = await fetch(`${API_BASE}/api/admin/list-all-files`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 Received data:', data);
        
        if (data.success) {
            AppState.fileTree = data.tree;
            
            // Filter and organize tree to show only audio files
            const filteredTree = filterAudioFiles(AppState.fileTree);
            renderFileTree(treeContainer, filteredTree);
            
            const audioFileCount = countAudioFiles(filteredTree);
            showToast(`✅ Loaded ${audioFileCount} audio files (${data.summary.totalSizeMB} MB)`, 'success');
        } else {
            throw new Error(data.error || 'Failed to load files');
        }
    } catch (error) {
        console.error('❌ Error loading file tree:', error);
        treeContainer.innerHTML = `
            <div class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Error loading files</h3>
                <p class="mt-1 text-sm text-gray-500">${error.message}</p>
                <button onclick="loadFileTree()" class="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    Try Again
                </button>
            </div>
        `;
        showToast(`❌ Error: ${error.message}`, 'error');
    }
}

// Filter out non-audio files and organize properly
function filterAudioFiles(tree) {
    const filtered = {};
    
    for (const [name, node] of Object.entries(tree)) {
        if (node.type === 'folder') {
            // Skip the "audio" folder if it's empty or doesn't contain real files
            if (name === 'audio') {
                // Process contents of audio folder directly
                if (node.children) {
                    for (const [subName, subNode] of Object.entries(node.children)) {
                        const filteredSubNode = filterAudioFiles({ [subName]: subNode });
                        if (Object.keys(filteredSubNode).length > 0) {
                            Object.assign(filtered, filteredSubNode);
                        }
                    }
                }
            } else {
                const filteredChildren = filterAudioFiles(node.children || {});
                if (Object.keys(filteredChildren).length > 0) {
                    filtered[name] = {
                        ...node,
                        children: filteredChildren
                    };
                }
            }
        } else if (node.type === 'file') {
            // Only include audio files
            const isAudio = AUDIO_EXTENSIONS.some(ext => 
                name.toLowerCase().endsWith(ext.toLowerCase())
            );
            
            if (isAudio) {
                filtered[name] = node;
            }
        }
    }
    
    return filtered;
}

// Count audio files in tree
function countAudioFiles(tree) {
    let count = 0;
    for (const [name, node] of Object.entries(tree)) {
        if (node.type === 'file') {
            count++;
        } else if (node.type === 'folder' && node.children) {
            count += countAudioFiles(node.children);
        }
    }
    return count;
}

function renderFileTree(container, tree, level = 0) {
    container.innerHTML = '';
    
    // Sort entries: folders first, then files
    const entries = Object.entries(tree).sort(([aName, aNode], [bName, bNode]) => {
        if (aNode.type === 'folder' && bNode.type === 'file') return -1;
        if (aNode.type === 'file' && bNode.type === 'folder') return 1;
        return aName.localeCompare(bName);
    });
    
    for (const [name, node] of entries) {
        if (node.type === 'folder') {
            const folderEl = createFolderElement(name, node, level);
            container.appendChild(folderEl);
        } else if (node.type === 'file') {
            const fileEl = createFileElement(name, node, level);
            container.appendChild(fileEl);
        }
    }
}

function createFolderElement(name, folder, level) {
    const wrapper = document.createElement('div');
    
    const div = document.createElement('div');
    div.className = 'tree-item tree-folder';
    div.style.paddingLeft = `${level * 20}px`;
    div.textContent = name;
    
    const childrenDiv = document.createElement('div');
    childrenDiv.className = 'tree-children';
    
    // Auto-open folders with few items
    const childCount = Object.keys(folder.children || {}).length;
    if (childCount <= 10) {
        div.classList.add('open');
        childrenDiv.classList.add('open');
        renderFileTree(childrenDiv, folder.children || {}, level + 1);
    }
    
    div.addEventListener('click', (e) => {
        e.stopPropagation();
        div.classList.toggle('open');
        childrenDiv.classList.toggle('open');
        
        if (childrenDiv.children.length === 0 && folder.children) {
            renderFileTree(childrenDiv, folder.children, level + 1);
        }
    });
    
    wrapper.appendChild(div);
    wrapper.appendChild(childrenDiv);
    
    return wrapper;
}

function createFileElement(name, file, level) {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center justify-between group hover:bg-gray-50 rounded px-2 py-1';
    
    const fileDiv = document.createElement('div');
    fileDiv.className = 'tree-item tree-file flex-1';
    fileDiv.style.paddingLeft = `${level * 20}px`;
    fileDiv.textContent = name;
    
    if (AppState.editedFiles.has(file.path)) {
        fileDiv.classList.add('file-edited');
    }
    
    // Add upload button for each file
    const actionDiv = document.createElement('div');
    actionDiv.className = 'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity';
    
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'p-1 text-gray-400 hover:text-blue-600 rounded';
    uploadBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
    `;
    uploadBtn.title = 'Replace this file';
    uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        replaceSpecificFile(file);
    });
    
    actionDiv.appendChild(uploadBtn);
    
    fileDiv.addEventListener('click', () => selectFile(file, fileDiv));
    
    wrapper.appendChild(fileDiv);
    wrapper.appendChild(actionDiv);
    
    return wrapper;
}

// Audio Error Handler
function handleAudioError(e) {
    console.error('🔊 Audio error:', e);
    const audio = e.target;
    const error = audio.error;
    
    if (error) {
        console.error('Audio error details:', {
            code: error.code,
            message: error.message,
            src: audio.src
        });
        
        showToast(`❌ Audio loading error: ${getAudioErrorMessage(error.code)}`, 'error');
    }
    
    // Reset UI state
    document.getElementById('file-duration').textContent = 'Error';
    AppState.audioDuration = 0;
}

function getAudioErrorMessage(code) {
    switch (code) {
        case 1: return 'MEDIA_ERR_ABORTED - Audio loading aborted';
        case 2: return 'MEDIA_ERR_NETWORK - Network error';
        case 3: return 'MEDIA_ERR_DECODE - Audio decode error';
        case 4: return 'MEDIA_ERR_SRC_NOT_SUPPORTED - Audio format not supported';
        default: return 'Unknown audio error';
    }
}

// File Selection and Loading
async function selectFile(file, element) {
    AppState.selectedFile = file;
    
    console.log('🎵 Selected file:', file);
    
    // Update UI
    document.getElementById('no-file-selected').style.display = 'none';
    document.getElementById('editor-content').style.display = 'block';
    
    // Update file info
    document.getElementById('file-name').textContent = file.path.split('/').pop();
    document.getElementById('file-size').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    document.getElementById('file-path').textContent = file.path;
    
    // Reset UI state first
    document.getElementById('file-duration').textContent = 'Loading...';
    AppState.audioDuration = 0;
    
    // Mark selected in tree
    document.querySelectorAll('.tree-item').forEach(el => {
        el.classList.remove('selected');
    });
    element.classList.add('selected');
    
    // Load audio with cache busting and timeout
    const audio = AppState.audioPlayer;
    audio.src = `${file.url}?v=${Date.now()}`;
    
    // Set up a timeout for metadata loading
    const loadTimeout = setTimeout(() => {
        console.warn('⏰ Audio metadata loading timeout');
        document.getElementById('file-duration').textContent = 'Timeout';
        showToast('⚠️ Audio loading timed out. File may be corrupted.', 'warning');
    }, 10000); // 10 second timeout
    
    // Clear timeout when metadata loads
    const clearTimeoutOnLoad = () => {
        clearTimeout(loadTimeout);
        audio.removeEventListener('loadedmetadata', clearTimeoutOnLoad);
        audio.removeEventListener('error', clearTimeoutOnLoad);
    };
    
    audio.addEventListener('loadedmetadata', clearTimeoutOnLoad, { once: true });
    audio.addEventListener('error', clearTimeoutOnLoad, { once: true });
    
    // Force load
    audio.load();
    
    // Reset trim markers after a short delay to ensure audio is loaded
    setTimeout(() => {
        if (AppState.audioDuration > 0) {
            resetTrim();
        }
    }, 100);
}

// Timeline Management
function initializeTimeline() {
    const audio = AppState.audioPlayer;
    
    // Wait for metadata to fully load
    if (audio.readyState < 1) {
        console.log('⏳ Waiting for audio metadata to load...');
        return;
    }
    
    const duration = audio.duration;
    
    // Handle invalid duration cases
    if (!duration || !isFinite(duration) || duration <= 0 || isNaN(duration)) {
        console.warn('⚠️ Audio duration is not valid:', duration, 'readyState:', audio.readyState);
        AppState.audioDuration = 0;
        
        // Don't set inputs with invalid values
        document.getElementById('trim-start-input').value = '';
        document.getElementById('trim-end-input').value = '';
        document.getElementById('trim-start-input').max = '';
        document.getElementById('trim-end-input').max = '';
        
        document.getElementById('file-duration').textContent = 'Loading...';
        return; // Don't try to reload - it might cause infinite loop
    }
    
    AppState.audioDuration = duration;
    
    console.log('⏱️ Audio duration loaded:', duration, 'seconds');
    
    // Update duration display
    document.getElementById('file-duration').textContent = formatTime(duration);
    
    // Set initial trim markers at start and end
    AppState.trimStartMarker = 0;
    AppState.trimEndMarker = duration;
    
    // Update inputs
    document.getElementById('trim-start-input').value = 0;
    document.getElementById('trim-start-input').max = duration;
    document.getElementById('trim-end-input').value = duration.toFixed(1);
    document.getElementById('trim-end-input').max = duration;
    
    // Generate static waveform data so it doesn't move during trimming
    generateStaticWaveform();
    
    // Update marker positions
    updateMarkerPositions();
}

function generateStaticWaveform() {
    const canvas = AppState.waveformCanvas;
    const ctx = AppState.waveformCtx;
    
    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    // Generate consistent waveform data
    AppState.waveformData = [];
    const barCount = Math.floor(width / 5);
    
    for (let i = 0; i < barCount; i++) {
        // Use time-based randomness for consistent waveform
        const seed = (i * 7.234) % 1;
        const amplitude = Math.sin(seed * Math.PI * 4) * 0.5 + 0.5;
        const barHeight = amplitude * height * 0.7 + height * 0.1;
        
        AppState.waveformData.push({
            x: i * 5,
            height: barHeight,
            y: (height - barHeight) / 2
        });
    }
    
    drawWaveform();
}

function drawWaveform() {
    const canvas = AppState.waveformCanvas;
    const ctx = AppState.waveformCtx;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform bars (static, don't move)
    ctx.fillStyle = '#6b7280';
    AppState.waveformData.forEach(bar => {
        ctx.fillRect(bar.x, bar.y, 3, bar.height);
    });
    
    // Draw trim area overlay (darker outside trim area)
    if (AppState.audioDuration > 0) {
        const startX = (AppState.trimStartMarker / AppState.audioDuration) * width;
        const endX = (AppState.trimEndMarker / AppState.audioDuration) * width;
        
        // Dimmed areas outside trim
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, startX, height);
        ctx.fillRect(endX, 0, width - endX, height);
        
        // Highlighted trim area
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, 0, endX - startX, height);
    }
}

function updatePlayhead() {
    const player = AppState.audioPlayer;
    const playhead = document.getElementById('playhead');
    const canvas = AppState.waveformCanvas;
    
    if (player.duration && !player.paused) {
        const position = (player.currentTime / player.duration) * canvas.offsetWidth;
        playhead.style.left = `${position}px`;
    }
}

function updateMarkerPositions() {
    const canvas = AppState.waveformCanvas;
    const startMarker = document.getElementById('trim-start');
    const endMarker = document.getElementById('trim-end');
    
    if (AppState.audioDuration > 0) {
        const startPos = (AppState.trimStartMarker / AppState.audioDuration) * canvas.offsetWidth;
        const endPos = (AppState.trimEndMarker / AppState.audioDuration) * canvas.offsetWidth;
        
        startMarker.style.left = `${startPos}px`;
        endMarker.style.left = `${endPos}px`;
        
        // Update time labels
        startMarker.querySelector('.marker-time').textContent = formatTime(AppState.trimStartMarker);
        endMarker.querySelector('.marker-time').textContent = formatTime(AppState.trimEndMarker);
        
        // Redraw waveform to show trim overlay (but keep bars static)
        drawWaveform();
    }
}

// Timeline Interaction
function seekToPosition(e) {
    const rect = AppState.waveformCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = (x / rect.width) * AppState.audioDuration;
    AppState.audioPlayer.currentTime = position;
}

function setupMarkerDragging() {
    const startMarker = document.getElementById('trim-start');
    const endMarker = document.getElementById('trim-end');
    const canvas = AppState.waveformCanvas;
    
    // Mouse down on markers
    startMarker.addEventListener('mousedown', (e) => {
        e.preventDefault();
        AppState.isDraggingMarker = 'start';
        document.body.style.cursor = 'ew-resize';
    });
    
    endMarker.addEventListener('mousedown', (e) => {
        e.preventDefault();
        AppState.isDraggingMarker = 'end';
        document.body.style.cursor = 'ew-resize';
    });
    
    // Mouse move
    document.addEventListener('mousemove', (e) => {
        if (!AppState.isDraggingMarker || AppState.audioDuration === 0) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const time = (x / rect.width) * AppState.audioDuration;
        
        if (AppState.isDraggingMarker === 'start') {
            AppState.trimStartMarker = Math.max(0, Math.min(time, AppState.trimEndMarker - 0.1));
            document.getElementById('trim-start-input').value = AppState.trimStartMarker.toFixed(1);
        } else {
            AppState.trimEndMarker = Math.min(AppState.audioDuration, Math.max(time, AppState.trimStartMarker + 0.1));
            document.getElementById('trim-end-input').value = AppState.trimEndMarker.toFixed(1);
        }
        
        updateMarkerPositions();
    });
    
    // Mouse up
    document.addEventListener('mouseup', () => {
        if (AppState.isDraggingMarker) {
            AppState.isDraggingMarker = null;
            document.body.style.cursor = 'default';
        }
    });
}

// Audio Controls
async function detectSilence() {
    if (!AppState.selectedFile) {
        showToast('⚠️ Please select a file first', 'warning');
        return;
    }
    
    const btn = document.getElementById('detect-silence');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Detecting...';
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/trim-audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: AppState.selectedFile.path,
                mode: 'auto',
                detectSilence: true
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.silenceDetection) {
            AppState.trimStartMarker = data.silenceDetection.detectedStart;
            AppState.trimEndMarker = data.silenceDetection.detectedEnd;
            
            document.getElementById('trim-start-input').value = AppState.trimStartMarker.toFixed(1);
            document.getElementById('trim-end-input').value = AppState.trimEndMarker.toFixed(1);
            
            updateMarkerPositions();
            
            showToast(`🎯 Silence detected! Trim: ${formatTime(AppState.trimStartMarker)} - ${formatTime(AppState.trimEndMarker)}`, 'success');
        } else {
            showToast('ℹ️ No significant silence detected', 'info');
        }
    } catch (error) {
        console.error('Error detecting silence:', error);
        showToast(`❌ Failed to detect silence: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function resetTrim() {
    if (AppState.audioDuration > 0) {
        AppState.trimStartMarker = 0;
        AppState.trimEndMarker = AppState.audioDuration;
        
        document.getElementById('trim-start-input').value = 0;
        document.getElementById('trim-end-input').value = AppState.trimEndMarker.toFixed(1);
        
        updateMarkerPositions();
        showToast('↩️ Trim reset to full audio length', 'info');
    }
}

function updateTrimFromInputs() {
    // Don't update if audio duration is invalid
    if (!AppState.audioDuration || !isFinite(AppState.audioDuration) || AppState.audioDuration <= 0) {
        console.warn('Cannot update trim inputs - invalid audio duration:', AppState.audioDuration);
        return;
    }
    
    const startInput = document.getElementById('trim-start-input');
    const endInput = document.getElementById('trim-end-input');
    
    let newStart = parseFloat(startInput.value) || 0;
    let newEnd = parseFloat(endInput.value) || AppState.audioDuration;
    
    // Validate that inputs are finite numbers
    if (!isFinite(newStart)) newStart = 0;
    if (!isFinite(newEnd)) newEnd = AppState.audioDuration;
    
    // Validate bounds
    newStart = Math.max(0, Math.min(newStart, AppState.audioDuration - 0.1));
    newEnd = Math.max(newStart + 0.1, Math.min(newEnd, AppState.audioDuration));
    
    AppState.trimStartMarker = newStart;
    AppState.trimEndMarker = newEnd;
    
    // Update inputs with validated values - only set if finite
    if (isFinite(newStart)) {
        startInput.value = newStart.toFixed(1);
    }
    if (isFinite(newEnd)) {
        endInput.value = newEnd.toFixed(1);
    }
    
    updateMarkerPositions();
}

async function applyTrim() {
    if (!AppState.selectedFile) {
        showToast('⚠️ Please select a file first', 'warning');
        return;
    }
    
    const btn = document.getElementById('apply-trim');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Trimming...';
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/trim-audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: AppState.selectedFile.path,
                mode: 'manual',
                trimStart: AppState.trimStartMarker,
                trimEnd: AppState.trimEndMarker
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.trimmed) {
            AppState.editedFiles.add(AppState.selectedFile.path);
            
            // Reload audio with new version
            AppState.audioPlayer.src = data.url;
            
            // Update file tree to show edited status
            await loadFileTree();
            
            showToast('✂️ Audio trimmed successfully!', 'success');
        } else {
            showToast('ℹ️ No trimming needed - file unchanged', 'info');
        }
    } catch (error) {
        console.error('Error trimming audio:', error);
        showToast(`❌ Failed to trim audio: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// File Operations
function replaceFile() {
    if (!AppState.selectedFile) {
        showToast('⚠️ Please select a file first', 'warning');
        return;
    }
    
    const input = document.getElementById('replace-file-input');
    input.click();
    
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            await replaceFileWithNew(AppState.selectedFile, files[0]);
        }
    };
}

function replaceSpecificFile(file) {
    const input = document.getElementById('replace-file-input');
    input.click();
    
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            await replaceFileWithNew(file, files[0]);
        }
    };
}

async function replaceFileWithNew(targetFile, newFile) {
    try {
        showToast(`🔄 Replacing ${targetFile.path.split('/').pop()}...`, 'info');
        
        const base64 = await fileToBase64(newFile);
        
        // Ensure path starts with "audio/" as required by API
        let uploadPath = targetFile.path;
        if (!uploadPath.startsWith('audio/')) {
            uploadPath = 'audio/' + uploadPath;
        }
        
        const response = await fetch(`${API_BASE}/api/upload-audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminMode: true,
                audioData: base64,
                filename: newFile.name,
                path: uploadPath
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`✅ File replaced successfully!`, 'success');
            
            // Update file info with new data
            if (AppState.selectedFile && AppState.selectedFile.path === targetFile.path) {
                // Update selected file object with new data
                AppState.selectedFile.size = newFile.size;
                AppState.selectedFile.lastModified = Date.now();
                AppState.selectedFile.url = data.url;
                
                // Update UI display
                document.getElementById('file-name').textContent = newFile.name;
                document.getElementById('file-size').textContent = `${(newFile.size / 1024 / 1024).toFixed(2)} MB`;
                
                // Reload the audio player with new file
                AppState.audioPlayer.src = `${data.url}?v=${Date.now()}`;
                
                // Reset audio state
                document.getElementById('file-duration').textContent = 'Loading...';
                AppState.audioDuration = 0;
                
                // Force metadata reload
                AppState.audioPlayer.load();
            }
            
            // Update only the file in the tree (find and update the specific file element)
            const fileElements = document.querySelectorAll('.tree-file');
            fileElements.forEach(el => {
                if (el.textContent.trim() === targetFile.path.split('/').pop()) {
                    // Update visual indicator that file was changed
                    el.style.fontStyle = 'italic';
                    el.style.color = '#059669'; // Green to show it was updated
                    
                    // Reset style after 3 seconds
                    setTimeout(() => {
                        el.style.fontStyle = '';
                        el.style.color = '';
                    }, 3000);
                }
            });
        } else {
            throw new Error(data.error || 'Replace failed');
        }
    } catch (error) {
        console.error('Error replacing file:', error);
        showToast(`❌ Failed to replace file: ${error.message}`, 'error');
    }
}

async function deleteFile() {
    if (!AppState.selectedFile) {
        showToast('⚠️ Please select a file first', 'warning');
        return;
    }
    
    const fileName = AppState.selectedFile.path.split('/').pop();
    if (!confirm(`⚠️ Are you sure you want to delete "${fileName}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    const btn = document.getElementById('delete-file');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Deleting...';
    
    try {
        // Use consolidated delete endpoint with admin mode
        const response = await fetch(`${API_BASE}/api/delete-audio`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminMode: true,
                path: AppState.selectedFile.path
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            AppState.selectedFile = null;
            document.getElementById('no-file-selected').style.display = 'block';
            document.getElementById('editor-content').style.display = 'none';
            
            await loadFileTree();
            showToast(`🗑️ File "${fileName}" deleted successfully!`, 'success');
        } else {
            throw new Error(data.error || 'Delete failed');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        showToast(`❌ Failed to delete file: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function saveFile() {
    if (!AppState.selectedFile || !AppState.editedFiles.has(AppState.selectedFile.path)) {
        showToast('ℹ️ No changes to save', 'info');
        return;
    }
    
    AppState.editedFiles.delete(AppState.selectedFile.path);
    await loadFileTree();
    showToast('💾 File saved successfully!', 'success');
}

// Upload Functionality
function showUploadModal() {
    document.getElementById('upload-modal').style.display = 'flex';
}

function hideUploadModal() {
    document.getElementById('upload-modal').style.display = 'none';
    document.getElementById('file-input').value = '';
    resetDropZone();
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-400', 'bg-blue-50');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-blue-400', 'bg-blue-50');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-400', 'bg-blue-50');
        
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });
    
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    });
}

function handleFiles(files) {
    const audioFiles = files.filter(file => 
        AUDIO_EXTENSIONS.some(ext => 
            file.name.toLowerCase().endsWith(ext.toLowerCase())
        )
    );
    
    if (audioFiles.length === 0) {
        showToast('⚠️ Please select audio files only', 'warning');
        return;
    }
    
    const dropZone = document.getElementById('drop-zone');
    dropZone.innerHTML = `
        <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="mt-2 font-medium text-gray-900">${audioFiles.length} file(s) ready</p>
            <p class="text-sm text-gray-500">${audioFiles.map(f => f.name).join(', ')}</p>
        </div>
    `;
}

function resetDropZone() {
    const dropZone = document.getElementById('drop-zone');
    dropZone.innerHTML = `
        <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clip-rule="evenodd" />
            </svg>
            <div class="mt-4 flex text-sm leading-6 text-gray-600">
                <span class="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                    <span>Upload files</span>
                </span>
                <p class="pl-1">or drag and drop</p>
            </div>
            <p class="text-xs leading-5 text-gray-600">Audio files up to 100MB</p>
        </div>
    `;
}

async function startUpload() {
    const fileInput = document.getElementById('file-input');
    const files = Array.from(fileInput.files);
    const uploadPath = document.getElementById('upload-path-select').value;
    
    if (files.length === 0) {
        showToast('⚠️ Please select files to upload', 'warning');
        return;
    }
    
    const btn = document.getElementById('start-upload');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Uploading...
    `;
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of files) {
        try {
            const base64 = await fileToBase64(file);
            let fullPath = uploadPath + file.name;
            
            // Ensure path starts with "audio/" as required by API
            if (!fullPath.startsWith('audio/')) {
                fullPath = 'audio/' + fullPath;
            }
            
            const response = await fetch(`${API_BASE}/api/upload-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminMode: true,
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
                failCount++;
                console.error(`❌ Failed to upload ${file.name}: ${data.error}`);
            }
        } catch (error) {
            failCount++;
            console.error(`❌ Error uploading ${file.name}:`, error);
        }
    }
    
    hideUploadModal();
    await loadFileTree();
    
    if (failCount === 0) {
        showToast(`🎉 All ${successCount} files uploaded successfully!`, 'success');
    } else if (successCount > 0) {
        showToast(`⚠️ Uploaded ${successCount} files, ${failCount} failed`, 'warning');
    } else {
        showToast(`❌ All uploads failed`, 'error');
    }
    
    btn.disabled = false;
    btn.textContent = originalText;
}

// Utility Functions
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('status-toast');
    const messageEl = document.getElementById('status-message');
    
    // Update icon based on type
    const iconContainer = toast.querySelector('.flex-shrink-0');
    let iconSvg = '';
    
    switch (type) {
        case 'success':
            iconSvg = `<svg class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`;
            break;
        case 'error':
            iconSvg = `<svg class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>`;
            break;
        case 'warning':
            iconSvg = `<svg class="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>`;
            break;
        default:
            iconSvg = `<svg class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>`;
    }
    
    iconContainer.innerHTML = iconSvg;
    messageEl.textContent = message;
    toast.style.display = 'flex';
    
    console.log(`🔔 Toast: ${type.toUpperCase()} - ${message}`);
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

function exportAllChanges() {
    if (AppState.editedFiles.size === 0) {
        showToast('ℹ️ No changes to export', 'info');
        return;
    }
    
    const changes = Array.from(AppState.editedFiles);
    showToast(`📋 ${AppState.editedFiles.size} files have been edited. All changes are saved automatically.`, 'info');
    console.log('📋 Edited files:', changes);
}

// Keyboard Shortcuts
function handleKeyboard(e) {
    // Delete: delete file
    if (e.code === 'Delete' && AppState.selectedFile && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        deleteFile();
    }
    
    // Ctrl+S: save
    if (e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        saveFile();
    }
    
    // Escape: close modal
    if (e.code === 'Escape') {
        const modal = document.getElementById('upload-modal');
        if (modal.style.display !== 'none') {
            hideUploadModal();
        }
    }
    
    // R: replace file
    if (e.code === 'KeyR' && AppState.selectedFile && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        replaceFile();
    }
}