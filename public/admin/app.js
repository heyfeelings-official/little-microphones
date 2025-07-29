/**
 * Radio Admin Application
 * Main JavaScript file for audio file management interface
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
    isPlaying: false,
    editedFiles: new Set(),
    isDraggingMarker: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('🎵 Radio Admin System initializing...');
    
    // Initialize components
    AppState.audioPlayer = document.getElementById('audio-player');
    AppState.waveformCanvas = document.getElementById('waveform-canvas');
    AppState.waveformCtx = AppState.waveformCanvas.getContext('2d');
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial file tree
    await loadFileTree();
    
    console.log('✅ Radio Admin System ready');
}

// Event Listeners Setup
function setupEventListeners() {
    // File tree controls
    document.getElementById('refresh-tree').addEventListener('click', loadFileTree);
    document.getElementById('upload-new').addEventListener('click', showUploadModal);
    
    // Audio player events
    AppState.audioPlayer.addEventListener('timeupdate', updatePlayhead);
    AppState.audioPlayer.addEventListener('loadedmetadata', initializeTimeline);
    AppState.audioPlayer.addEventListener('play', () => updatePlayPauseButton(true));
    AppState.audioPlayer.addEventListener('pause', () => updatePlayPauseButton(false));
    
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
            renderFileTree(treeContainer, AppState.fileTree);
            
            showToast(`✅ Loaded ${data.summary.totalFiles} files (${data.summary.totalSizeMB} MB)`, 'success');
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

function createFolderElement(name, folder, level) {
    const wrapper = document.createElement('div');
    
    const div = document.createElement('div');
    div.className = 'tree-item tree-folder';
    div.style.paddingLeft = `${level * 20}px`;
    div.textContent = name;
    
    const childrenDiv = document.createElement('div');
    childrenDiv.className = 'tree-children';
    
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
    const div = document.createElement('div');
    div.className = 'tree-item tree-file';
    div.style.paddingLeft = `${level * 20}px`;
    div.textContent = name;
    
    if (AppState.editedFiles.has(file.path)) {
        div.classList.add('file-edited');
    }
    
    div.addEventListener('click', () => selectFile(file, div));
    
    return div;
}

// File Selection and Loading
async function selectFile(file, element) {
    AppState.selectedFile = file;
    
    // Update UI
    document.getElementById('no-file-selected').style.display = 'none';
    document.getElementById('editor-content').style.display = 'block';
    
    // Update file info
    document.getElementById('file-name').textContent = file.path.split('/').pop();
    document.getElementById('file-size').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    document.getElementById('file-path').textContent = file.path;
    
    // Load audio with cache busting
    AppState.audioPlayer.src = `${file.url}?v=${Date.now()}`;
    
    // Mark selected in tree
    document.querySelectorAll('.tree-item').forEach(el => {
        el.classList.remove('selected');
    });
    element.classList.add('selected');
    
    // Reset trim markers
    resetTrim();
}

// Timeline Management
function initializeTimeline() {
    const duration = AppState.audioPlayer.duration;
    
    // Update duration display
    document.getElementById('file-duration').textContent = formatTime(duration);
    
    // Set initial trim markers
    AppState.trimStartMarker = 0;
    AppState.trimEndMarker = duration;
    
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

function drawWaveform() {
    const canvas = AppState.waveformCanvas;
    const ctx = AppState.waveformCtx;
    
    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform (placeholder visualization)
    ctx.fillStyle = '#999';
    const barWidth = 3;
    const barGap = 2;
    const barCount = Math.floor(width / (barWidth + barGap));
    
    for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + barGap);
        const barHeight = Math.random() * height * 0.7 + height * 0.15;
        const y = (height - barHeight) / 2;
        
        ctx.fillRect(x, y, barWidth, barHeight);
    }
    
    // Draw trim area overlay
    if (AppState.audioPlayer.duration) {
        const startX = (AppState.trimStartMarker / AppState.audioPlayer.duration) * width;
        const endX = (AppState.trimEndMarker / AppState.audioPlayer.duration) * width;
        
        // Dimmed areas outside trim
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, startX, height);
        ctx.fillRect(endX, 0, width - endX, height);
    }
}

function updatePlayhead() {
    const player = AppState.audioPlayer;
    const playhead = document.getElementById('playhead');
    const canvas = AppState.waveformCanvas;
    
    if (player.duration) {
        const position = (player.currentTime / player.duration) * canvas.offsetWidth;
        playhead.style.left = `${position}px`;
    }
}

function updateMarkerPositions() {
    const player = AppState.audioPlayer;
    const canvas = AppState.waveformCanvas;
    const startMarker = document.getElementById('trim-start');
    const endMarker = document.getElementById('trim-end');
    
    if (player.duration) {
        const startPos = (AppState.trimStartMarker / player.duration) * canvas.offsetWidth;
        const endPos = (AppState.trimEndMarker / player.duration) * canvas.offsetWidth;
        
        startMarker.style.left = `${startPos}px`;
        endMarker.style.left = `${endPos}px`;
        
        // Update time labels
        startMarker.querySelector('.marker-time').textContent = formatTime(AppState.trimStartMarker);
        endMarker.querySelector('.marker-time').textContent = formatTime(AppState.trimEndMarker);
        
        // Redraw waveform to show trim overlay
        drawWaveform();
    }
}

// Timeline Interaction
function seekToPosition(e) {
    const rect = AppState.waveformCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = (x / rect.width) * AppState.audioPlayer.duration;
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
    });
    
    endMarker.addEventListener('mousedown', (e) => {
        e.preventDefault();
        AppState.isDraggingMarker = 'end';
    });
    
    // Mouse move
    document.addEventListener('mousemove', (e) => {
        if (!AppState.isDraggingMarker) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const time = (x / rect.width) * AppState.audioPlayer.duration;
        
        if (AppState.isDraggingMarker === 'start') {
            AppState.trimStartMarker = Math.min(time, AppState.trimEndMarker - 0.1);
            document.getElementById('trim-start-input').value = AppState.trimStartMarker.toFixed(1);
        } else {
            AppState.trimEndMarker = Math.max(time, AppState.trimStartMarker + 0.1);
            document.getElementById('trim-end-input').value = AppState.trimEndMarker.toFixed(1);
        }
        
        updateMarkerPositions();
    });
    
    // Mouse up
    document.addEventListener('mouseup', () => {
        AppState.isDraggingMarker = null;
    });
}

// Audio Controls
function togglePlayPause() {
    if (AppState.audioPlayer.paused) {
        AppState.audioPlayer.play();
    } else {
        AppState.audioPlayer.pause();
    }
}

function updatePlayPauseButton(isPlaying) {
    const btn = document.getElementById('play-pause');
    if (isPlaying) {
        btn.innerHTML = '<span class="icon">⏸️</span> Pause';
    } else {
        btn.innerHTML = '<span class="icon">▶️</span> Play';
    }
}

async function detectSilence() {
    if (!AppState.selectedFile) return;
    
    const btn = document.getElementById('detect-silence');
    btn.disabled = true;
    btn.innerHTML = '<span class="icon">⏳</span> Detecting...';
    
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
            
            showToast(`Silence detected! Suggested trim: ${formatTime(AppState.trimStartMarker)} - ${formatTime(AppState.trimEndMarker)}`, 'success');
        }
    } catch (error) {
        console.error('Error detecting silence:', error);
        showToast('Failed to detect silence', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="icon">🔍</span> Detect Silence';
    }
}

function resetTrim() {
    if (AppState.audioPlayer.duration) {
        AppState.trimStartMarker = 0;
        AppState.trimEndMarker = AppState.audioPlayer.duration;
        
        document.getElementById('trim-start-input').value = 0;
        document.getElementById('trim-end-input').value = AppState.trimEndMarker.toFixed(1);
        
        updateMarkerPositions();
    }
}

function updateTrimFromInputs() {
    AppState.trimStartMarker = parseFloat(document.getElementById('trim-start-input').value) || 0;
    AppState.trimEndMarker = parseFloat(document.getElementById('trim-end-input').value) || 0;
    updateMarkerPositions();
}

async function applyTrim() {
    if (!AppState.selectedFile) return;
    
    const btn = document.getElementById('apply-trim');
    btn.disabled = true;
    btn.innerHTML = 'Trimming...';
    
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
            
            showToast('Audio trimmed successfully!', 'success');
        } else {
            showToast('No trimming needed - file unchanged', 'info');
        }
    } catch (error) {
        console.error('Error trimming audio:', error);
        showToast('Failed to trim audio', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Apply Trim';
    }
}

// File Operations
async function saveFile() {
    if (!AppState.selectedFile || !AppState.editedFiles.has(AppState.selectedFile.path)) {
        showToast('No changes to save', 'info');
        return;
    }
    
    AppState.editedFiles.delete(AppState.selectedFile.path);
    await loadFileTree();
    showToast('File saved successfully!', 'success');
}

async function deleteFile() {
    if (!AppState.selectedFile) return;
    
    if (!confirm(`Are you sure you want to delete ${AppState.selectedFile.path}?`)) {
        return;
    }
    
    const btn = document.getElementById('delete-file');
    btn.disabled = true;
    btn.innerHTML = '<span class="icon">⏳</span> Deleting...';
    
    try {
        // Extract metadata from path
        const pathParts = AppState.selectedFile.path.split('/');
        const filename = pathParts.pop();
        
        let world, lmid, questionId, lang;
        
        // Check if it's a static file or user recording
        if (AppState.selectedFile.path.startsWith('audio/')) {
            // Static file
            world = pathParts[pathParts.length - 1];
            lmid = '0'; // Static files don't have LMID
            questionId = '0';
            lang = 'en';
        } else {
            // User recording: {lang}/{lmid}/{world}/filename
            lang = pathParts[0] || 'en';
            lmid = pathParts[1] || '0';
            world = pathParts[2] || '';
        }
        
        // Extract question ID from filename
        const qidMatch = filename.match(/QID(\d+)|question_(\d+)/);
        questionId = qidMatch ? (qidMatch[1] || qidMatch[2]) : '0';
        
        const response = await fetch(`${API_BASE}/api/delete-audio`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: filename,
                world: world,
                lmid: lmid,
                questionId: questionId,
                lang: lang
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            AppState.selectedFile = null;
            document.getElementById('no-file-selected').style.display = 'block';
            document.getElementById('editor-content').style.display = 'none';
            
            await loadFileTree();
            showToast('File deleted successfully!', 'success');
        } else {
            throw new Error(data.error || 'Delete failed');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        showToast(`Failed to delete file: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="icon">🗑️</span> Delete File';
    }
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

function handleFiles(files) {
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length === 0) {
        showToast('Please select audio files only', 'error');
        return;
    }
    
    const dropZone = document.getElementById('drop-zone');
    dropZone.innerHTML = `
        <span class="icon">📤</span>
        <p>${audioFiles.length} file(s) selected</p>
        <p style="font-size: 12px; color: #666;">${audioFiles.map(f => f.name).join(', ')}</p>
    `;
}

function resetDropZone() {
    const dropZone = document.getElementById('drop-zone');
    dropZone.innerHTML = `
        <span class="icon">📤</span>
        <p>Drop audio files here or click to browse</p>
    `;
}

async function startUpload() {
    const fileInput = document.getElementById('file-input');
    const files = Array.from(fileInput.files);
    const uploadPath = document.getElementById('upload-path-select').value;
    
    if (files.length === 0) {
        showToast('Please select files to upload', 'error');
        return;
    }
    
    const btn = document.getElementById('start-upload');
    btn.disabled = true;
    btn.innerHTML = 'Uploading...';
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of files) {
        try {
            const base64 = await fileToBase64(file);
            const fullPath = uploadPath + file.name;
            
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
        showToast(`All ${successCount} files uploaded successfully!`, 'success');
    } else {
        showToast(`Uploaded ${successCount} files, ${failCount} failed`, 'warning');
    }
    
    btn.disabled = false;
    btn.innerHTML = 'Upload';
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
    }, 4000);
}

function exportAllChanges() {
    if (AppState.editedFiles.size === 0) {
        showToast('No changes to export', 'info');
        return;
    }
    
    const changes = Array.from(AppState.editedFiles).join('\n');
    showToast(`${AppState.editedFiles.size} files have been edited. All changes are saved automatically.`, 'info');
}

// Keyboard Shortcuts
function handleKeyboard(e) {
    // Spacebar: play/pause
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlayPause();
    }
    
    // Delete: delete file
    if (e.code === 'Delete' && AppState.selectedFile && e.target.tagName !== 'INPUT') {
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
} 