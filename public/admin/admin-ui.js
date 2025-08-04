// Radio Admin UI - Main JavaScript
// Manages file tree, audio playback, and file operations

// Global state management
const AppState = {
    currentFile: null,
    audioManager: null,
    fileTree: {},
    trimStart: 0,
    trimEnd: 0,
    isDraggingTrim: false,
    dragTarget: null
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎵 Radio Admin UI initializing...');
    initializeUI();
    loadFileTree();
    setupEventListeners();
});

// UI Initialization
function initializeUI() {
    // Generate static waveform bars
    const waveform = document.getElementById('waveform');
    const barCount = 100;
    
    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        bar.className = 'bar';
        // Random height for visual effect
        const height = Math.random() * 60 + 20;
        bar.style.height = `${height}%`;
        waveform.appendChild(bar);
    }
}

// Safe event listener helper
function safeAddEventListener(selector, event, handler) {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (element) {
        element.addEventListener(event, handler);
    } else {
        console.warn(`Element not found for selector: ${selector}`);
    }
}

// Setup all event listeners
function setupEventListeners() {
    // File operations
    safeAddEventListener('#upload-btn', 'click', handleUploadClick);
    safeAddEventListener('#file-upload-input', 'change', handleFileUpload);
    safeAddEventListener('#replace-btn', 'click', handleReplaceClick);
    safeAddEventListener('#replace-file-input', 'change', handleFileReplace);
    safeAddEventListener('#delete-btn', 'click', handleDelete);
    safeAddEventListener('#trim-btn', 'click', handleTrim);
    
    // Audio controls
    safeAddEventListener('#play-pause-btn', 'click', togglePlayPause);
    safeAddEventListener('#stop-btn', 'click', stopAudio);
    safeAddEventListener('#volume-slider', 'input', handleVolumeChange);
    
    // Timeline interaction
    safeAddEventListener('#timeline', 'click', handleTimelineClick);
    
    // Trim marker dragging
    setupTrimMarkerDragging();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Drag and drop
    setupDragAndDrop();
}

// Load file tree from API
async function loadFileTree() {
    const fileTreeElement = document.getElementById('file-tree');
    
    try {
        showLoadingState(fileTreeElement);
        
        const response = await fetch('/api/admin/list-all-files');
        if (!response.ok) {
            throw new Error(`Failed to load files: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📁 Files loaded:', data);
        
        // Filter and organize files
        AppState.fileTree = filterAudioFiles(data.files || []);
        
        // Render the tree
        renderFileTree(fileTreeElement, AppState.fileTree);
        
    } catch (error) {
        console.error('Error loading files:', error);
        showErrorState(fileTreeElement, 'Failed to load files. Please try again.');
        showToast('error', 'Failed to load audio files');
    }
}

// Filter to show only audio files and organize by folder
function filterAudioFiles(files) {
    const audioExtensions = ['.mp3', '.wav', '.webm', '.ogg', '.m4a', '.aac'];
    const tree = {};
    
    files.forEach(file => {
        // Check if it's an audio file
        const isAudio = audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        if (!isAudio) return;
        
        // Parse path
        const parts = file.path.split('/').filter(p => p);
        let current = tree;
        
        // Build tree structure
        for (let i = 0; i < parts.length - 1; i++) {
            const folder = parts[i];
            if (!current[folder]) {
                current[folder] = {
                    type: 'folder',
                    name: folder,
                    children: {}
                };
            }
            current = current[folder].children;
        }
        
        // Add file
        const fileName = parts[parts.length - 1];
        current[fileName] = {
            type: 'file',
            name: fileName,
            path: file.path,
            size: file.size,
            lastModified: file.lastModified
        };
    });
    
    return tree;
}

// Render file tree UI
function renderFileTree(container, tree, level = 0) {
    container.innerHTML = '';
    
    if (Object.keys(tree).length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                </svg>
                No audio files found
            </div>
        `;
        return;
    }
    
    Object.entries(tree).forEach(([name, item]) => {
        if (item.type === 'folder') {
            const folderEl = createFolderElement(name, item, level);
            container.appendChild(folderEl);
        } else {
            const fileEl = createFileElement(name, item, level);
            container.appendChild(fileEl);
        }
    });
}

// Create folder element
function createFolderElement(name, folder, level) {
    const div = document.createElement('div');
    div.className = 'mb-1';
    
    const header = document.createElement('div');
    header.className = 'tree-item tree-folder';
    header.style.paddingLeft = `${level * 1.25}rem`;
    
    // Folder icon
    const icon = document.createElement('svg');
    icon.className = 'folder-icon';
    icon.innerHTML = `
        <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
    `;
    
    // Folder name
    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    
    // Upload button (shows on hover)
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'ml-auto opacity-0 hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200';
    uploadBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
    `;
    uploadBtn.title = 'Upload to this folder';
    uploadBtn.onclick = (e) => {
        e.stopPropagation();
        handleFolderUpload(folder, name);
    };
    
    header.appendChild(icon);
    header.appendChild(nameSpan);
    header.appendChild(uploadBtn);
    
    // Children container
    const childrenDiv = document.createElement('div');
    childrenDiv.className = 'tree-children hidden';
    
    // Toggle expansion
    header.onclick = () => {
        header.classList.toggle('expanded');
        childrenDiv.classList.toggle('hidden');
        
        // Lazy load children if needed
        if (childrenDiv.children.length === 0 && Object.keys(folder.children).length > 0) {
            renderFileTree(childrenDiv, folder.children, level + 1);
        }
    };
    
    // Show upload button on hover
    header.onmouseenter = () => uploadBtn.style.opacity = '1';
    header.onmouseleave = () => uploadBtn.style.opacity = '0';
    
    div.appendChild(header);
    div.appendChild(childrenDiv);
    
    return div;
}

// Create file element
function createFileElement(name, file, level) {
    const div = document.createElement('div');
    div.className = 'tree-item';
    div.style.paddingLeft = `${level * 1.25 + 1.5}rem`;
    div.setAttribute('data-file-path', file.path);
    
    // File icon
    const icon = document.createElement('svg');
    icon.className = 'w-4 h-4 text-gray-400';
    icon.innerHTML = `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
        </svg>
    `;
    
    // File name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'flex-1 truncate';
    nameSpan.textContent = name;
    nameSpan.title = name;
    
    // File size
    const sizeSpan = document.createElement('span');
    sizeSpan.className = 'text-xs text-gray-500';
    sizeSpan.textContent = formatFileSize(file.size);
    
    div.appendChild(icon);
    div.appendChild(nameSpan);
    div.appendChild(sizeSpan);
    
    // Click to select file
    div.onclick = (event) => selectFile(file, event);
    
    return div;
}

// Select a file for playback/editing
async function selectFile(file, event) {
    console.log('📄 Selecting file:', file);
    
    // Update UI
    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('selected'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }
    
    // Update state
    AppState.currentFile = file;
    
    // Show player controls
    document.getElementById('no-file-selected').classList.add('hidden');
    document.getElementById('player-controls').classList.remove('hidden');
    
    // Update file name display
    document.getElementById('current-file-name').textContent = file.name;
    
    // Load audio
    await loadAudio(file);
    
    // Reset trim markers
    resetTrimMarkers();
}

// Load audio file using Howler.js
async function loadAudio(file) {
    try {
        // Show loading state
        showToast('info', 'Loading audio file...');
        
        // Stop current audio if playing
        if (AppState.audioManager) {
            AppState.audioManager.destroy();
        }
        
        // Create new Howler instance
        const audioUrl = `https://little-microphones.b-cdn.net${file.path}`;
        console.log('🎵 Loading audio from:', audioUrl);
        
        AppState.audioManager = new HowlerAudioManager(audioUrl, {
            onload: () => {
                console.log('✅ Audio loaded successfully');
                initializeTimeline();
                showToast('success', 'Audio loaded');
            },
            onloaderror: (error) => {
                console.error('❌ Audio load error:', error);
                showToast('error', 'Failed to load audio file');
            }
        });
        
    } catch (error) {
        console.error('Error loading audio:', error);
        showToast('error', 'Failed to load audio file');
    }
}

// Howler.js wrapper class
class HowlerAudioManager {
    constructor(url, callbacks = {}) {
        this.sound = new Howl({
            src: [url],
            html5: true,
            preload: true,
            onload: callbacks.onload,
            onloaderror: callbacks.onloaderror,
            onplay: () => this.startProgressTracking(),
            onpause: () => this.stopProgressTracking(),
            onstop: () => {
                this.stopProgressTracking();
                this.updateProgress(0);
            }
        });
        
        this.progressInterval = null;
    }
    
    play() {
        this.sound.play();
    }
    
    pause() {
        this.sound.pause();
    }
    
    stop() {
        this.sound.stop();
    }
    
    seek(time) {
        if (time !== undefined) {
            this.sound.seek(time);
        } else {
            return this.sound.seek();
        }
    }
    
    volume(level) {
        if (level !== undefined) {
            this.sound.volume(level / 100);
        } else {
            return this.sound.volume() * 100;
        }
    }
    
    duration() {
        return this.sound.duration();
    }
    
    playing() {
        return this.sound.playing();
    }
    
    destroy() {
        this.stopProgressTracking();
        this.sound.unload();
    }
    
    startProgressTracking() {
        this.progressInterval = setInterval(() => {
            const current = this.seek();
            const duration = this.duration();
            if (duration > 0) {
                this.updateProgress(current / duration);
                updateTimeDisplay(current, duration);
            }
        }, 50);
    }
    
    stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
    
    updateProgress(progress) {
        const playhead = document.getElementById('playhead');
        if (playhead) {
            playhead.style.left = `${progress * 100}%`;
        }
        
        // Update active waveform bars
        const bars = document.querySelectorAll('#waveform .bar');
        const activeIndex = Math.floor(progress * bars.length);
        bars.forEach((bar, i) => {
            bar.classList.toggle('active', i <= activeIndex);
        });
    }
}

// Initialize timeline after audio loads
function initializeTimeline() {
    if (!AppState.audioManager) return;
    
    const duration = AppState.audioManager.duration();
    
    // Validate duration
    if (!isFinite(duration) || duration <= 0) {
        console.warn('Invalid audio duration:', duration);
        showToast('warning', 'Audio duration unavailable');
        return;
    }
    
    // Update total time display
    document.getElementById('total-time').textContent = formatTime(duration);
    
    // Set initial trim end to full duration
    AppState.trimEnd = duration;
    updateTrimInputs();
    updateMarkerPositions();
}

// Timeline interaction handlers
function handleTimelineClick(event) {
    if (!AppState.audioManager || AppState.isDraggingTrim) return;
    
    const timeline = event.currentTarget;
    const rect = timeline.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const progress = x / rect.width;
    
    const duration = AppState.audioManager.duration();
    const time = progress * duration;
    
    AppState.audioManager.seek(time);
}

// Trim marker dragging setup
function setupTrimMarkerDragging() {
    const trimStart = document.getElementById('trim-start');
    const trimEnd = document.getElementById('trim-end');
    
    if (trimStart) {
        trimStart.addEventListener('mousedown', (e) => startTrimDrag(e, 'start'));
    }
    
    if (trimEnd) {
        trimEnd.addEventListener('mousedown', (e) => startTrimDrag(e, 'end'));
    }
    
    document.addEventListener('mousemove', handleTrimDrag);
    document.addEventListener('mouseup', endTrimDrag);
}

// Trim drag handlers
function startTrimDrag(event, type) {
    event.preventDefault();
    AppState.isDraggingTrim = true;
    AppState.dragTarget = type;
    
    // Add visual feedback
    const marker = event.currentTarget;
    marker.classList.add('dragging');
    
    console.log(`🎯 Started dragging ${type} marker`);
}

function handleTrimDrag(event) {
    if (!AppState.isDraggingTrim || !AppState.audioManager) return;
    
    const timeline = document.getElementById('timeline');
    const rect = timeline.getBoundingClientRect();
    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const progress = x / rect.width;
    
    const duration = AppState.audioManager.duration();
    const time = progress * duration;
    
    if (AppState.dragTarget === 'start') {
        AppState.trimStart = Math.min(time, AppState.trimEnd - 0.1);
    } else {
        AppState.trimEnd = Math.max(time, AppState.trimStart + 0.1);
    }
    
    updateTrimInputs();
    updateMarkerPositions();
}

function endTrimDrag() {
    if (AppState.isDraggingTrim) {
        console.log(`🎯 Finished dragging ${AppState.dragTarget} marker`);
        
        // Remove visual feedback
        const markers = document.querySelectorAll('.trim-marker');
        markers.forEach(marker => marker.classList.remove('dragging'));
    }
    
    AppState.isDraggingTrim = false;
    AppState.dragTarget = null;
}

// Update trim marker positions and visual feedback
function updateMarkerPositions() {
    if (!AppState.audioManager) return;
    
    const duration = AppState.audioManager.duration();
    if (!duration || duration <= 0) return;
    
    const startPercent = (AppState.trimStart / duration) * 100;
    const endPercent = (AppState.trimEnd / duration) * 100;
    
    // Update trim markers
    const trimStartEl = document.getElementById('trim-start');
    const trimEndEl = document.getElementById('trim-end');
    
    if (trimStartEl) {
        trimStartEl.style.left = `${startPercent}%`;
        trimStartEl.querySelector('.trim-time').textContent = formatTime(AppState.trimStart);
    }
    
    if (trimEndEl) {
        trimEndEl.style.right = `${100 - endPercent}%`;
        trimEndEl.style.left = 'auto';
        trimEndEl.querySelector('.trim-time').textContent = formatTime(AppState.trimEnd);
    }
    
    // Update trim selection area
    const trimSelection = document.getElementById('trim-selection');
    if (trimSelection) {
        trimSelection.style.left = `${startPercent}%`;
        trimSelection.style.right = `${100 - endPercent}%`;
    }
    
    // Update outside areas (dimmed areas)
    const trimAreaLeft = document.getElementById('trim-area-left');
    const trimAreaRight = document.getElementById('trim-area-right');
    
    if (trimAreaLeft) {
        trimAreaLeft.style.width = `${startPercent}%`;
    }
    
    if (trimAreaRight) {
        trimAreaRight.style.width = `${100 - endPercent}%`;
    }
}

// Update trim input fields
function updateTrimInputs() {
    document.getElementById('trim-start-input').value = formatTime(AppState.trimStart);
    document.getElementById('trim-end-input').value = formatTime(AppState.trimEnd);
}

// Reset trim markers
function resetTrimMarkers() {
    AppState.trimStart = 0;
    AppState.trimEnd = AppState.audioManager ? AppState.audioManager.duration() : 0;
    updateTrimInputs();
    updateMarkerPositions();
}

// Audio control handlers
function togglePlayPause() {
    if (!AppState.audioManager) return;
    
    if (AppState.audioManager.playing()) {
        AppState.audioManager.pause();
        updatePlayPauseButton(false);
    } else {
        AppState.audioManager.play();
        updatePlayPauseButton(true);
    }
}

function stopAudio() {
    if (!AppState.audioManager) return;
    
    AppState.audioManager.stop();
    updatePlayPauseButton(false);
}

function handleVolumeChange(event) {
    if (!AppState.audioManager) return;
    
    const volume = event.target.value;
    AppState.audioManager.volume(volume);
}

// Update play/pause button UI
function updatePlayPauseButton(isPlaying) {
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    
    if (isPlaying) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    }
}

// Update time display
function updateTimeDisplay(current, total) {
    document.getElementById('current-time').textContent = formatTime(current);
    document.getElementById('total-time').textContent = formatTime(total);
}

// File operation handlers
function handleUploadClick() {
    document.getElementById('file-upload-input').click();
}

async function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    console.log('📤 Uploading files:', files);
    
    // Default path for main upload button
    const uploadPath = '/audio';
    
    await uploadFilesToPath(files, uploadPath);
    
    // Clear input for next upload
    event.target.value = '';
}

function handleReplaceClick() {
    if (!AppState.currentFile) {
        showToast('warning', 'Please select a file to replace');
        return;
    }
    
    document.getElementById('replace-file-input').click();
}

async function handleFileReplace(event) {
    const file = event.target.files[0];
    if (!file || !AppState.currentFile) return;
    
    console.log('🔄 Replacing file:', AppState.currentFile.name, 'with:', file.name);
    
    try {
        showToast('info', 'Replacing file...');
        
        // First delete the old file
        const deleteResponse = await fetch('/api/delete-audio', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                adminMode: true,
                filePath: AppState.currentFile.path
            })
        });
        
        if (!deleteResponse.ok) {
            const error = await deleteResponse.json();
            throw new Error(error.error || 'Failed to delete old file');
        }
        
        // Convert file to base64
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64Audio = e.target.result.split(',')[1];
                
                // Upload new file to the same location
                const folderPath = AppState.currentFile.path.substring(0, AppState.currentFile.path.lastIndexOf('/'));
                
                const uploadResponse = await fetch('/api/upload-audio', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        adminMode: true,
                        audioData: base64Audio,
                        fileName: file.name,
                        filePath: folderPath
                    })
                });
                
                if (!uploadResponse.ok) {
                    const error = await uploadResponse.json();
                    throw new Error(error.error || 'Failed to upload new file');
                }
                
                showToast('success', 'File replaced successfully');
                
                // Reload file tree
                await loadFileTree();
                
            } catch (error) {
                console.error('Upload error:', error);
                showToast('error', `Failed to upload replacement: ${error.message}`);
            }
        };
        
        reader.onerror = () => {
            showToast('error', 'Failed to read file');
        };
        
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error('Replace error:', error);
        showToast('error', `Failed to replace file: ${error.message}`);
    }
    
    // Clear input
    event.target.value = '';
}

async function handleDelete() {
    if (!AppState.currentFile) {
        showToast('warning', 'Please select a file to delete');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete "${AppState.currentFile.name}"?`)) {
        return;
    }
    
    console.log('🗑️ Deleting file:', AppState.currentFile);
    
    try {
        showToast('info', 'Deleting file...');
        
        const response = await fetch('/api/delete-audio', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                adminMode: true,
                filePath: AppState.currentFile.path
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete file');
        }
        
        showToast('success', 'File deleted successfully');
        
        // Clear current selection
        AppState.currentFile = null;
        document.getElementById('no-file-selected').classList.remove('hidden');
        document.getElementById('player-controls').classList.add('hidden');
        
        // Stop audio if playing
        if (AppState.audioManager) {
            AppState.audioManager.stop();
        }
        
        // Reload file tree
        await loadFileTree();
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast('error', `Failed to delete file: ${error.message}`);
    }
}

async function handleTrim() {
    if (!AppState.currentFile || !AppState.audioManager) {
        showToast('warning', 'Please select a file to trim');
        return;
    }
    
    const duration = AppState.audioManager.duration();
    
    // Validate trim range
    if (AppState.trimStart >= AppState.trimEnd) {
        showToast('error', 'Invalid trim range');
        return;
    }
    
    if (AppState.trimStart === 0 && AppState.trimEnd === duration) {
        showToast('info', 'No trimming needed - full file selected');
        return;
    }
    
    console.log('✂️ Trimming audio:', {
        file: AppState.currentFile.name,
        start: AppState.trimStart,
        end: AppState.trimEnd
    });
    
    try {
        // Show loading state
        showToast('info', 'Processing audio trim...');
        
        // Initialize audio processor
        const processor = new ClientAudioProcessor();
        
        if (!processor.isSupported()) {
            throw new Error('Your browser does not support audio processing');
        }
        
        // Get audio URL
        const audioUrl = `https://little-microphones.b-cdn.net${AppState.currentFile.path}`;
        
        // Trim the audio
        const trimmedBlob = await processor.trimAudioFile(
            audioUrl,
            AppState.trimStart,
            AppState.trimEnd
        );
        
        // Convert to base64 for upload
        console.log('🔄 Converting blob to base64...', trimmedBlob.size, 'bytes');
        const base64Audio = await processor.blobToBase64(trimmedBlob);
        console.log('✅ Base64 conversion complete, length:', base64Audio.length);
        
        // Determine file extension based on blob type
        let newExtension = '.webm'; // default
        if (trimmedBlob.type.includes('mp3')) {
            newExtension = '.mp3';
        } else if (trimmedBlob.type.includes('webm')) {
            newExtension = '.webm';
        } else if (trimmedBlob.type.includes('wav')) {
            newExtension = '.wav';
        }
        
        // Replace original file with trimmed version
        const baseName = AppState.currentFile.name.replace(/\.[^/.]+$/, '');
        const finalFileName = `${baseName}${newExtension}`;
        
        console.log('📝 Replacing original file:', finalFileName);
        console.log('📁 Original file path:', AppState.currentFile.path);
        
        const targetFolderPath = AppState.currentFile.path.substring(0, AppState.currentFile.path.lastIndexOf('/'));
        console.log('📁 Target folder path:', targetFolderPath);
        
        // Upload trimmed file to replace original
        showToast('info', 'Uploading trimmed audio...');
        
        const uploadPayload = {
            adminMode: true,
            audioData: base64Audio,
            fileName: finalFileName,
            filePath: targetFolderPath
        };
        
        console.log('📤 Upload payload:', {
            fileName: uploadPayload.fileName,
            filePath: uploadPayload.filePath,
            audioDataSize: uploadPayload.audioData.length
        });
        
        try {
            const uploadResponse = await fetch('/api/upload-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(uploadPayload)
            });
            
            console.log('📡 Upload response status:', uploadResponse.status);
            
            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('❌ Upload failed:', uploadResponse.status, errorText);
                throw new Error(`Upload failed (${uploadResponse.status}): ${errorText}`);
            }
            
            const uploadResult = await uploadResponse.json();
            console.log('✅ Upload successful:', uploadResult);
            
        } catch (uploadError) {
            console.error('❌ Upload error:', uploadError);
            throw uploadError;
        }
        
        showToast('success', 'Audio trimmed and replaced successfully!');
        
        // Update current file info and reload audio without refreshing file tree
        AppState.currentFile.name = finalFileName;
        AppState.currentFile.path = `${targetFolderPath}/${finalFileName}`;
        
        // Update file info display
        updateFileInfoDisplay();
        
        // Reload audio with the new trimmed version
        await loadAudio(AppState.currentFile);
        
        // Reset trim markers to full duration
        resetTrimMarkers();
        
    } catch (error) {
        console.error('Trim error:', error);
        
        // Show specific error messages for WebM encoding issues
        if (error.message.includes('WebM encoding not supported')) {
            showToast('error', 'WebM encoding not supported in this browser. Please use Chrome or Firefox.');
        } else if (error.message.includes('timeout')) {
            showToast('error', 'Audio processing took too long. Try with a shorter audio file.');
        } else {
            showToast('error', `Trim failed: ${error.message}`);
        }
    }
}

// Update file info display after changes
function updateFileInfoDisplay() {
    if (AppState.currentFile) {
        document.getElementById('current-file-name').textContent = AppState.currentFile.name;
        console.log('📄 Updated file display:', AppState.currentFile.name);
    }
}

// Refresh current file after modifications
async function refreshCurrentFile() {
    if (!AppState.currentFile) return;
    
    try {
        console.log('🔄 Refreshing current file:', AppState.currentFile.name);
        
        // Reload audio with new file
        await loadAudio(AppState.currentFile);
        
        // Update the file tree to reflect changes
        const response = await fetch('/api/admin/list-all-files');
        if (response.ok) {
            const data = await response.json();
            AppState.fileTree = filterAudioFiles(data.files || []);
            
            // Re-render only the affected part of the tree
            const fileTreeElement = document.getElementById('file-tree');
            renderFileTree(fileTreeElement, AppState.fileTree);
            
            // Re-select the current file in the tree
            const currentTreeItem = document.querySelector(`[data-file-path="${AppState.currentFile.path}"]`);
            if (currentTreeItem) {
                currentTreeItem.classList.add('selected');
            }
        }
        
        showToast('success', 'File refreshed successfully');
        
    } catch (error) {
        console.error('Error refreshing file:', error);
        showToast('warning', 'File updated but refresh failed');
    }
}

function handleFolderUpload(folder, folderName) {
    console.log('📁 Upload to folder:', folderName);
    
    // Create hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.multiple = true;
    
    input.onchange = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        // Build folder path
        let path = '/audio';
        const buildPath = (item, currentPath) => {
            if (item.type === 'folder') {
                currentPath += '/' + item.name;
                // Check if this is our target folder
                if (item === folder) {
                    path = currentPath;
                    return true;
                }
                // Search children
                for (const child of Object.values(item.children)) {
                    if (buildPath(child, currentPath)) {
                        return true;
                    }
                }
            }
            return false;
        };
        
        // Find the folder path
        for (const item of Object.values(AppState.fileTree)) {
            if (buildPath(item, '/audio')) {
                break;
            }
        }
        
        await uploadFilesToPath(files, path);
    };
    
    // Trigger file selection
    input.click();
}

// Helper function to upload files to a specific path
async function uploadFilesToPath(files, folderPath) {
    let successCount = 0;
    let errorCount = 0;
    
    showToast('info', `Uploading ${files.length} file(s)...`);
    
    for (const file of files) {
        try {
            console.log(`📤 Uploading ${file.name} to ${folderPath}`);
            
            // Convert to base64
            const reader = new FileReader();
            const base64Promise = new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            const base64Audio = await base64Promise;
            
            // Upload file
            const response = await fetch('/api/upload-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminMode: true,
                    audioData: base64Audio,
                    fileName: file.name,
                    filePath: folderPath
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload failed');
            }
            
            successCount++;
            
        } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            errorCount++;
        }
    }
    
    // Show results
    if (successCount > 0 && errorCount === 0) {
        showToast('success', `Successfully uploaded ${successCount} file(s)`);
    } else if (successCount > 0 && errorCount > 0) {
        showToast('warning', `Uploaded ${successCount} file(s), ${errorCount} failed`);
    } else {
        showToast('error', `Failed to upload all ${errorCount} file(s)`);
    }
    
    // Reload file tree if any uploads succeeded
    if (successCount > 0) {
        await loadFileTree();
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(event) {
    // Space bar - play/pause
    if (event.code === 'Space' && event.target.tagName !== 'INPUT') {
        event.preventDefault();
        togglePlayPause();
    }
    
    // Delete key - delete file
    if (event.code === 'Delete' && AppState.currentFile) {
        handleDelete();
    }
}

// Drag and drop setup
function setupDragAndDrop() {
    const fileTree = document.getElementById('file-tree');
    
    fileTree.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileTree.classList.add('drag-over');
    });
    
    fileTree.addEventListener('dragleave', (e) => {
        if (e.target === fileTree) {
            fileTree.classList.remove('drag-over');
        }
    });
    
    fileTree.addEventListener('drop', async (e) => {
        e.preventDefault();
        fileTree.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            console.log('📥 Files dropped:', files);
            
            // Filter only audio files
            const audioFiles = files.filter(file => {
                const ext = '.' + file.name.split('.').pop().toLowerCase();
                return ['.mp3', '.wav', '.webm', '.ogg', '.m4a', '.aac'].includes(ext);
            });
            
            if (audioFiles.length === 0) {
                showToast('warning', 'Please drop only audio files');
                return;
            }
            
            // Upload to root audio folder
            await uploadFilesToPath(audioFiles, '/audio');
        }
    });
}

// Utility functions
function formatTime(seconds) {
    if (!isFinite(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// UI Helper functions
function showLoadingState(element) {
    element.innerHTML = `
        <div class="flex items-center justify-center py-8">
            <div class="spinner"></div>
            <span class="ml-3 text-gray-600">Loading...</span>
        </div>
    `;
}

function showErrorState(element, message) {
    element.innerHTML = `
        <div class="text-center py-8">
            <svg class="w-12 h-12 mx-auto mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-gray-600">${message}</p>
            <button onclick="loadFileTree()" class="mt-3 text-primary hover:underline">
                Try again
            </button>
        </div>
    `;
}

// Toast notification system
function showToast(type, message) {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    const icons = {
        success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
        error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
        warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
        info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    };
    
    toast.innerHTML = `
        ${icons[type] || icons.info}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Export for debugging
window.AppState = AppState;