/**
 * recording.js - Multi-Question Audio Recording System (Refactored)
 * 
 * PURPOSE: Main controller for comprehensive audio recording system
 * DEPENDENCIES: Modular components for UI, Audio, Storage, and Radio Generation
 * DOCUMENTATION: See /documentation/recording.js.md for complete system overview
 * 
 * MODULAR ARCHITECTURE:
 * - recording-ui.js: UI/DOM components and interactions
 * - recording-audio.js: Audio recording and MediaRecorder management  
 * - recording-storage.js: IndexedDB and cloud storage operations
 * - recording-radio.js: Radio program generation and FFmpeg processing
 * 
 * CORE FEATURES:
 * - Multi-question independent recording instances with isolated state management
 * - Local IndexedDB storage with automatic cloud backup to Bunny.net CDN
 * - Upload progress tracking with retry mechanisms and error recovery
 * - Radio program generation from multiple recordings with professional audio processing
 * - Question ID normalization and organized file structure
 * - Orphaned recording cleanup and maintenance routines
 * - Real-time waveform visualization and audio feedback
 * - Cross-device synchronization via cloud storage
 * 
 * INTEGRATION POINTS:
 * - rp.js: Receives world/lmid parameters and handles page authorization
 * - lm.js: Provides user authentication and LMID management context
 * - API Endpoints: upload-audio.js, delete-audio.js, combine-audio.js, list-recordings.js
 * - External Services: Bunny.net CDN, Memberstack auth, Make.com webhooks
 * 
 * LAST UPDATED: January 2025
 * VERSION: 3.0.0 (Modular Refactor)
 * STATUS: Production Ready ✅
 */

// Import modular components
import { 
    formatTime,
    injectGlobalStyles,
    createRecordingElement,
    createRecordingPlaceholder,
    updateUploadStatusUI,
    showRadioProgramModal,
    updateRadioProgramProgress,
    hideRadioProgramModal,
    showRadioProgramSuccess,
    startFunStatusMessages,
    stopFunStatusMessages,
    setButtonText
} from './recording-ui.js';

import {
    initializeAudioRecorder,
    getSupportedMimeType,
    verifyCloudUrl,
    getAudioSource,
    blobToBase64,
    getAnswerNumber,
    startTimer,
    stopTimer,
    dispatchUploadStatusEvent
} from './recording-audio.js';

import {
    setupDatabase,
    withStore,
    withDB,
    getRecordingFromDB,
    updateRecordingInDB,
    loadRecordingsFromDB,
    saveRecordingToDB,
    deleteRecordingFromDB,
    getAllRecordingsForWorldLmid,
    discoverQuestionIdsFromDB,
    loadRecordingsFromCloud,
    uploadToBunny,
    deleteFromBunny,
    cleanupOrphanedRecordings,
    cleanupAllOrphanedRecordings,
    syncRecordingsWithCloud,
    getStorageStats
} from './recording-storage.js';

import {
    generateRadioProgram,
    collectRecordingsForRadioProgram,
    sortQuestionIdsByDOMOrder,
    validateRadioProgramRequirements,
    createAudioPlan,
    processRadioAudioPlan,
    getRadioGenerationStatus
} from './recording-radio.js';

// API Configuration - Use global config if available, fallback to hardcoded
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app';
}

// Global state management
const savingLocks = new Set();
const initializedWorlds = new Set();

// Simplified logging system
const LOG_CONFIG = {
    ENABLED: true,
    PRODUCTION_MODE: typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost',
    ICONS: { error: '❌', warn: '⚠️', info: '✅', debug: '🔍' }
};

function log(level, message, data = null) {
    if (!LOG_CONFIG.ENABLED) return;
    if (LOG_CONFIG.PRODUCTION_MODE && level === 'debug') return;
    const icon = LOG_CONFIG.ICONS[level] || '📝';
    if (data) {
        console.log(`${icon} ${message}`, data);
    } else {
        console.log(`${icon} ${message}`);
    }
}

/**
 * Normalize question ID to ensure consistency
 * @param {string} questionId - Raw question ID
 * @returns {string} Normalized question ID
 */
function normalizeQuestionId(questionId) {
    if (!questionId) return 'unknown';
    
    // Remove any existing prefixes
    let normalized = questionId.replace(/^(question[-_]?|q[-_]?)/i, '');
    
    // Ensure it's a valid identifier
    normalized = normalized.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Ensure it doesn't start with a number
    if (/^\d/.test(normalized)) {
        normalized = 'q_' + normalized;
    }
    
    // Ensure minimum length
    if (normalized.length === 0) {
        normalized = 'unknown';
    }
    
    return normalized.toLowerCase();
}

/**
 * Delete recording from both local and cloud storage
 * @param {string} recordingId - Recording ID to delete
 * @param {string} questionId - Question ID
 * @param {HTMLElement} elementToRemove - DOM element to remove
 */
async function deleteRecording(recordingId, questionId, elementToRemove) {
    try {
        log('info', `Starting deletion of recording: ${recordingId}`);
        
        // Get recording data first
        const recordingData = await getRecordingFromDB(recordingId);
        if (!recordingData) {
            log('warn', `Recording ${recordingId} not found in database`);
            if (elementToRemove && elementToRemove.parentNode) {
                elementToRemove.parentNode.removeChild(elementToRemove);
            }
            return;
        }
        
        // Extract world and lmid from recording data or ID
        const world = recordingData.world;
        const lmid = recordingData.lmid;
        
        if (!world || !lmid) {
            log('error', `Missing world or lmid for recording ${recordingId}`);
            alert('Cannot delete recording: missing required information');
            return;
        }
        
        // Delete from cloud storage if exists
        if (recordingData.cloudUrl) {
            try {
                await deleteFromBunny(recordingData, world, lmid, questionId);
                log('info', `Cloud file deleted: ${recordingData.cloudUrl}`);
            } catch (error) {
                log('warn', `Failed to delete cloud file: ${error.message}`);
                // Continue with local deletion even if cloud deletion fails
            }
        }
        
        // Delete from local database
        await deleteRecordingFromDB(recordingId);
        log('info', `Recording deleted from database: ${recordingId}`);
        
        // Remove from UI with animation
        if (elementToRemove && elementToRemove.parentNode) {
            elementToRemove.classList.add('fade-out');
            setTimeout(() => {
                if (elementToRemove.parentNode) {
                    elementToRemove.parentNode.removeChild(elementToRemove);
                }
            }, 300);
        }
        
        log('info', `Recording deletion completed: ${recordingId}`);
        
    } catch (error) {
        log('error', `Failed to delete recording ${recordingId}:`, error);
        alert('Failed to delete recording. Please try again.');
    }
}

/**
 * Initialize recorders for a specific world
 * @param {string} world - World name to initialize
 */
function initializeRecordersForWorld(world) {
    if (initializedWorlds.has(world)) {
        log('debug', `Recorders already initialized for world: ${world}`);
        return;
    }
    
    log('info', `Initializing recorders for world: ${world}`);
    
    // Inject global styles once
    injectGlobalStyles();
    
    // Initialize database
    setupDatabase().then(() => {
        log('info', 'Database initialized successfully');
    }).catch(error => {
        log('error', 'Database initialization failed:', error);
    });
    
    // Get world and lmid from global scope or URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const lmid = window.currentLmid || urlParams.get('lmid') || 'default';
    
    // Find all recorder wrappers in the current world
    const recorderWrappers = document.querySelectorAll(`[data-world="${world}"] .recorder-wrapper, .recorder-wrapper[data-world="${world}"]`);
    
    if (recorderWrappers.length === 0) {
        log('warn', `No recorder wrappers found for world: ${world}`);
        return;
    }
    
    log('info', `Found ${recorderWrappers.length} recorder wrappers for world: ${world}`);
    
    // Initialize each recorder
    recorderWrappers.forEach((wrapper, index) => {
        try {
            const questionId = normalizeQuestionId(
                wrapper.dataset.questionId || 
                wrapper.dataset.question || 
                wrapper.id || 
                `question_${index + 1}`
            );
            
            log('debug', `Initializing recorder for question: ${questionId}`);
            
            // Create dependencies object for the recorder
            const dependencies = {
                world,
                lmid,
                questionId,
                createRecordingPlaceholder,
                saveRecordingToDB,
                loadRecordingsFromDB,
                updateRecordingInDB,
                renderRecordingsList: () => renderRecordingsList(wrapper, questionId, world, lmid),
                setButtonText,
                formatTime,
                log
            };
            
            // Initialize the audio recorder
            const recorder = initializeAudioRecorder(wrapper, dependencies);
            
            if (recorder) {
                wrapper._recorderInstance = recorder;
                log('debug', `Recorder initialized successfully for question: ${questionId}`);
            } else {
                log('error', `Failed to initialize recorder for question: ${questionId}`);
            }
            
            // Load existing recordings
            renderRecordingsList(wrapper, questionId, world, lmid);
            
        } catch (error) {
            log('error', `Failed to initialize recorder ${index}:`, error);
        }
    });
    
    // Mark world as initialized
    initializedWorlds.add(world);
    
    // Setup cleanup for orphaned recordings (run once per world)
    setTimeout(() => {
        cleanupAllOrphanedRecordings(world, lmid).then(cleanedCount => {
            if (cleanedCount > 0) {
                log('info', `Cleaned up ${cleanedCount} orphaned recordings for world: ${world}`);
            }
        }).catch(error => {
            log('error', 'Orphaned recording cleanup failed:', error);
        });
    }, 5000);
    
    log('info', `World initialization completed: ${world}`);
}

/**
 * Render recordings list for a specific question
 * @param {HTMLElement} wrapper - Recorder wrapper element
 * @param {string} questionId - Question ID
 * @param {string} world - World name
 * @param {string} lmid - LMID
 */
async function renderRecordingsList(wrapper, questionId, world, lmid) {
    const recordingsList = wrapper.querySelector('.recordings-list, [data-element="recordings-list"]');
    if (!recordingsList) {
        log('warn', `Recordings list not found for question: ${questionId}`);
        return;
    }
    
    try {
        // Load recordings from database
        const recordings = await loadRecordingsFromDB(questionId, world, lmid);
        
        // Clear existing list
        recordingsList.innerHTML = '';
        
        if (recordings.length === 0) {
            log('debug', `No recordings found for question: ${questionId}`);
            return;
        }
        
        log('debug', `Rendering ${recordings.length} recordings for question: ${questionId}`);
        
        // Create elements for each recording
        for (const recording of recordings) {
            try {
                const recordingElement = await createRecordingElement(
                    recording,
                    questionId,
                    (recordingData) => getAudioSource(recordingData, updateRecordingInDB),
                    deleteRecording,
                    dispatchUploadStatusEvent
                );
                
                if (recordingElement) {
                    recordingElement.classList.add('new-recording-fade-in');
                    recordingsList.appendChild(recordingElement);
                }
            } catch (error) {
                log('error', `Failed to create element for recording ${recording.id}:`, error);
            }
        }
        
    } catch (error) {
        log('error', `Failed to render recordings list for question ${questionId}:`, error);
    }
}

/**
 * Generate radio program for current world/lmid
 * @param {string} world - World name
 * @param {string} lmid - LMID
 */
async function generateRadioProgramForWorld(world, lmid) {
    log('info', `Starting radio program generation for world: ${world}, lmid: ${lmid}`);
    
    const dependencies = {
        getAllRecordingsForWorldLmid,
        discoverQuestionIdsFromDB,
        showRadioProgramModal,
        updateRadioProgramProgress,
        showRadioProgramSuccess,
        hideRadioProgramModal,
        startFunStatusMessages,
        stopFunStatusMessages,
        log
    };
    
    try {
        const result = await generateRadioProgram(world, lmid, dependencies);
        return result;
    } catch (error) {
        log('error', 'Radio program generation failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get system status for current world/lmid
 * @param {string} world - World name
 * @param {string} lmid - LMID
 * @returns {Promise<Object>} System status
 */
async function getSystemStatus(world, lmid) {
    try {
        const stats = await getStorageStats(world, lmid);
        const radioStatus = await getRadioGenerationStatus(world, lmid, {
            getAllRecordingsForWorldLmid,
            discoverQuestionIdsFromDB
        });
        
        return {
            storage: stats,
            radio: radioStatus,
            initialized: initializedWorlds.has(world)
        };
    } catch (error) {
        log('error', 'Failed to get system status:', error);
        return null;
    }
}

/**
 * Sync recordings with cloud for current world/lmid
 * @param {string} world - World name
 * @param {string} lmid - LMID
 * @returns {Promise<Object>} Sync result
 */
async function syncWithCloud(world, lmid) {
    try {
        log('info', `Starting cloud sync for world: ${world}, lmid: ${lmid}`);
        const result = await syncRecordingsWithCloud(world, lmid);
        log('info', `Cloud sync completed: ${result.message}`);
        return result;
    } catch (error) {
        log('error', 'Cloud sync failed:', error);
        return { success: false, error: error.message };
    }
}

// Global API for external access
window.RecordingSystem = {
    initializeRecordersForWorld,
    generateRadioProgramForWorld,
    getSystemStatus,
    syncWithCloud,
    deleteRecording,
    normalizeQuestionId,
    
    // Utility functions
    log,
    formatTime,
    
    // Module access (for debugging)
    modules: {
        ui: { 
            createRecordingElement,
            showRadioProgramModal,
            updateRadioProgramProgress,
            hideRadioProgramModal
        },
        audio: {
            initializeAudioRecorder,
            getSupportedMimeType,
            getAudioSource
        },
        storage: {
            setupDatabase,
            loadRecordingsFromDB,
            saveRecordingToDB,
            getAllRecordingsForWorldLmid
        },
        radio: {
            generateRadioProgram,
            collectRecordingsForRadioProgram
        }
    }
};

// Auto-initialize if world parameter is available
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const world = urlParams.get('world') || window.currentWorld;
    
    if (world) {
        log('info', `Auto-initializing recording system for world: ${world}`);
        initializeRecordersForWorld(world);
    } else {
        log('debug', 'No world parameter found, waiting for manual initialization');
    }
});

// Export for module usage
export {
    initializeRecordersForWorld,
    generateRadioProgramForWorld,
    getSystemStatus,
    syncWithCloud,
    deleteRecording,
    normalizeQuestionId,
    log
};