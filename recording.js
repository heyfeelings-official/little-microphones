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

(function() {
    'use strict';
    
    // Use global modules instead of imports
    const RecordingUI = window.RecordingUI;
    const RecordingAudio = window.RecordingAudio;
    const RecordingStorage = window.RecordingStorage;
    const RecordingRadio = window.RecordingRadio;
    
    // Check if modules are loaded
    if (!RecordingUI || !RecordingAudio || !RecordingStorage || !RecordingRadio) {
        console.error('❌ Recording modules not loaded. Please ensure all module scripts are loaded first.');
        return;
    }

    // Extract functions from modules
    const {
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
    } = RecordingUI;

    const {
        initializeAudioRecorder,
        getSupportedMimeType,
        verifyCloudUrl,
        getAudioSource,
        blobToBase64,
        getAnswerNumber,
        startTimer,
        stopTimer,
        dispatchUploadStatusEvent
    } = RecordingAudio;

    const {
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
    } = RecordingStorage;

    const {
        generateRadioProgram,
        collectRecordingsForRadioProgram,
        sortQuestionIdsByDOMOrder,
        validateRadioProgramRequirements,
        createAudioPlan,
        processRadioAudioPlan,
        getRadioGenerationStatus
    } = RecordingRadio;

    // API Configuration - Use global config if available, fallback to hardcoded
    const API_BASE_URL = window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app';

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
        
        // Get world and lmid from global scope or URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const lmid = window.currentLmid || urlParams.get('lmid') || 'default';
        
        // Initialize database FIRST and wait for completion
        log('info', 'Initializing database...');
        const databasePromise = setupDatabase().then(async () => {
            log('info', 'Database initialized successfully');
            
            // Check if this is a fresh LMID (no recordings in cloud)
            try {
                const cloudRecordings = await loadRecordingsFromCloud(null, world, lmid);
                if (cloudRecordings.length === 0) {
                    log('info', `LMID ${lmid} appears to be new (no cloud recordings), cleaning local database...`);
                    
                    // Get all local recordings for this world/lmid
                    const localRecordings = await getAllRecordingsForWorldLmid(world, lmid);
                    
                    if (localRecordings.length > 0) {
                        log('info', `Found ${localRecordings.length} stale local recordings for new LMID ${lmid}, removing...`);
                        
                        // Delete all local recordings for this world/lmid
                        for (const recording of localRecordings) {
                            try {
                                await deleteRecordingFromDB(recording.id);
                                log('debug', `Deleted stale recording: ${recording.id}`);
                            } catch (error) {
                                log('error', `Failed to delete stale recording ${recording.id}:`, error);
                            }
                        }
                        
                        log('info', `Cleaned ${localRecordings.length} stale recordings for new LMID ${lmid}`);
                    }
                }
            } catch (error) {
                log('warn', `Could not check cloud status for LMID ${lmid}:`, error);
                // Continue anyway - don't block initialization
            }
            
            return true;
        }).catch(error => {
            log('error', 'Database initialization failed:', error);
            throw error;
        });
        
        // Find all recorder elements in the current world
        // First try the collection-based approach used by rp.js
        const targetCollectionId = `collection-${world}`;
        const targetCollection = document.getElementById(targetCollectionId);
        let recorderWrappers = [];
        
        if (targetCollection) {
            // Look for FAQ accordion elements with .lm class (Webflow structure)
            recorderWrappers = targetCollection.querySelectorAll('.faq1_accordion.lm');
            log('debug', `Found ${recorderWrappers.length} FAQ accordion elements in collection-${world}`);
        }
        
        // Fallback: look for traditional recorder-wrapper elements
        if (recorderWrappers.length === 0) {
            recorderWrappers = document.querySelectorAll(`[data-world="${world}"] .recorder-wrapper, .recorder-wrapper[data-world="${world}"]`);
            log('debug', `Found ${recorderWrappers.length} traditional recorder-wrapper elements`);
        }
        
        // Final fallback: look for any elements with record buttons
        if (recorderWrappers.length === 0) {
            recorderWrappers = document.querySelectorAll('.record-button, [data-element="record-button"]');
            if (recorderWrappers.length > 0) {
                // Convert to parent elements
                recorderWrappers = Array.from(recorderWrappers).map(btn => btn.closest('.faq1_accordion') || btn.parentElement);
                recorderWrappers = recorderWrappers.filter(el => el); // Remove nulls
                log('debug', `Found ${recorderWrappers.length} elements via record button discovery`);
            }
        }
        
        if (recorderWrappers.length === 0) {
            log('warn', `No recorder elements found for world: ${world}. Checked:
            - #collection-${world} .faq1_accordion.lm
            - [data-world="${world}"] .recorder-wrapper
            - .record-button parent elements`);
            return;
        }
        
        log('info', `Found ${recorderWrappers.length} recorder wrappers for world: ${world}`);
        
        // Wait for database initialization, THEN initialize recorders
        databasePromise.then(() => {
            log('info', `Database ready, initializing ${recorderWrappers.length} recorders...`);
            
            // Initialize each recorder
            recorderWrappers.forEach((wrapper, index) => {
            try {
                // Get question ID from various possible sources
                let questionId = wrapper.dataset.questionId || 
                               wrapper.dataset.question || 
                               wrapper.id;
                
                // If no question ID found, try to extract from text content or other attributes
                if (!questionId) {
                    const questionText = wrapper.querySelector('h3, h2, .question-text, [data-element="question"]');
                    if (questionText) {
                        // Try to extract number from question text
                        const match = questionText.textContent.match(/(\d+)/);
                        if (match) {
                            questionId = match[1];
                        }
                    }
                }
                
                // Final fallback
                if (!questionId) {
                    questionId = `question_${index + 1}`;
                }
                
                questionId = normalizeQuestionId(questionId);
                
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
                
                // Load existing recordings immediately (database is already ready)
                setTimeout(() => {
                    renderRecordingsList(wrapper, questionId, world, lmid);
                }, 100);
                
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
        
        }).catch(error => {
            log('error', `Database initialization failed for world ${world}:`, error);
        });
    }

    /**
     * Render recordings list for a specific question
     * @param {HTMLElement} wrapper - Recorder wrapper element
     * @param {string} questionId - Question ID
     * @param {string} world - World name
     * @param {string} lmid - LMID
     */
    async function renderRecordingsList(wrapper, questionId, world, lmid) {
        // Look for existing recording list with more flexible selectors
        let recordingsList = wrapper.querySelector('.recording-list, .recordings-list, [data-element="recordings-list"], [data-element="recording-list"]');
        
        // If still not found, look in the parent structure (FAQ accordion)
        if (!recordingsList && wrapper.classList.contains('faq1_accordion')) {
            // Look for the recording list in the accordion content area
            const accordionContent = wrapper.querySelector('.faq1_content, .accordion-content, [data-element="accordion-content"]');
            if (accordionContent) {
                recordingsList = accordionContent.querySelector('.recording-list, .recordings-list');
            }
        }
        
        // If no recordings list found, create one
        if (!recordingsList) {
            log('warn', `No existing recording list found for question: ${questionId}, creating new one`);
            
            recordingsList = document.createElement('ul');
            recordingsList.className = 'recording-list'; // Use singular form to match Webflow
            recordingsList.style.cssText = `
                list-style: none;
                margin: 10px 0 0 0;
                padding: 0;
                max-height: 300px;
                overflow-y: auto;
            `;
            
            // Try to find the best place to insert it
            const accordionContent = wrapper.querySelector('.faq1_content, .accordion-content, [data-element="accordion-content"]');
            if (accordionContent) {
                // Insert at the end of accordion content
                accordionContent.appendChild(recordingsList);
            } else {
                // Fallback: find record button and insert after it
                const recordButton = wrapper.querySelector('.record-button, [data-element="record-button"]');
                if (recordButton && recordButton.parentNode) {
                    recordButton.parentNode.insertBefore(recordingsList, recordButton.nextSibling);
                } else {
                    // Last resort: append to wrapper
                    wrapper.appendChild(recordingsList);
                }
            }
            
            log('debug', `Recording list created and inserted for question: ${questionId}`);
        } else {
            log('debug', `Found existing recording list for question: ${questionId}`);
        }
        
        try {
            // Load recordings from database
            let recordings = await loadRecordingsFromDB(questionId, world, lmid);
            
            // Skip cloud sync for initial render - it will be done once globally
            // This prevents multiple failed requests for new LMIDs
            
            // Clear existing list
            recordingsList.innerHTML = '';
            
            if (recordings.length === 0) {
                log('debug', `No local recordings found for question: ${questionId}`);
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
            log('info', `Cloud sync completed: ${result.message || 'success'}`);
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

    console.log('✅ Recording system loaded and available globally');

})();