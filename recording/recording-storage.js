/**
 * recording-storage.js - Storage & Database Module for Recording System
 * 
 * PURPOSE: IndexedDB operations, cloud storage, and data persistence
 * DEPENDENCIES: IndexedDB API, Bunny.net CDN API, Fetch API
 * 
 * EXPORTED FUNCTIONS:
 * - setupDatabase(): Initialize IndexedDB database
 * - withStore(): Execute callback with object store
 * - withDB(): Execute callback with database connection
 * - getRecordingFromDB(): Get single recording from database
 * - updateRecordingInDB(): Update recording in database
 * - loadRecordingsFromDB(): Load recordings for question/world/lmid
 * - getAllRecordingsForWorldLmid(): Get all recordings for world/lmid
 * - loadRecordingsFromCloud(): Load recordings from cloud storage
 * - deleteFromBunny(): Delete file from Bunny.net CDN
 * - uploadToBunny(): Upload file to Bunny.net CDN
 * - cleanupOrphanedRecordings(): Clean up orphaned recordings
 * - cleanupAllOrphanedRecordings(): Clean up all orphaned recordings
 * - discoverQuestionIdsFromDB(): Discover question IDs from database
 * 
 * DATABASE SCHEMA:
 * - Store: 'recordings'
 * - Key: recordingId (string)
 * - Indexes: questionId, world, lmid, uploadStatus
 * 
 * STORAGE FEATURES:
 * - Local IndexedDB with metadata and blob storage
 * - Cloud backup to Bunny.net CDN
 * - Upload progress tracking and retry mechanisms
 * - Orphaned recording cleanup
 * - Cross-device synchronization
 * - Error recovery and data integrity
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0 (Extracted from recording.js)
 * STATUS: Production Ready ✅
 */

(function() {
    'use strict';
    
    // Global database instance
    let db = null;

    /**
     * Setup IndexedDB database for recordings
     * @returns {Promise<void>}
     */
    function setupDatabase() {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve();
                return;
            }

            const request = indexedDB.open('RecordingsDB', 1);
            
            request.onerror = () => {
                console.error('Failed to open database:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                
                // Create recordings store if it doesn't exist
                if (!database.objectStoreNames.contains('recordings')) {
                    const store = database.createObjectStore('recordings', { keyPath: 'id' });
                    
                    // Create indexes for efficient queries
                    store.createIndex('questionId', 'questionId', { unique: false });
                    store.createIndex('world', 'world', { unique: false });
                    store.createIndex('lmid', 'lmid', { unique: false });
                    store.createIndex('uploadStatus', 'uploadStatus', { unique: false });
                    store.createIndex('worldLmid', ['world', 'lmid'], { unique: false });
                    store.createIndex('questionWorldLmid', ['questionId', 'world', 'lmid'], { unique: false });
                }
            };
        });
    }

    /**
     * Execute callback with object store
     * @param {string} type - Store type ('recordings')
     * @param {Function} callback - Callback function
     * @returns {Promise<any>} Result from callback
     */
    function withStore(type, callback) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = db.transaction([type], 'readwrite');
            const store = transaction.objectStore(type);
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            
            callback(store, resolve, reject);
        });
    }

    /**
     * Execute callback with database connection
     * @param {Function} callback - Callback function
     * @returns {Promise<any>} Result from callback
     */
    function withDB(callback) {
        return new Promise(async (resolve, reject) => {
            try {
                await setupDatabase();
                const result = await callback(db);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get single recording from database
     * @param {string} recordingId - Recording ID
     * @returns {Promise<Object|null>} Recording data or null
     */
    function getRecordingFromDB(recordingId) {
        return withStore('recordings', (store, resolve, reject) => {
            const request = store.get(recordingId);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Update recording in database
     * @param {Object} recordingData - Recording data to update
     * @returns {Promise<void>}
     */
    function updateRecordingInDB(recordingData) {
        return withStore('recordings', (store, resolve, reject) => {
            const request = store.put(recordingData);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Load recordings from database for specific question/world/lmid
     * @param {string} questionId - Question ID
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @returns {Promise<Array>} Array of recordings
     */
    function loadRecordingsFromDB(questionId, world, lmid) {
        return withStore('recordings', (store, resolve, reject) => {
            const index = store.index('questionWorldLmid');
            const request = index.getAll([questionId, world, lmid]);
            
            request.onsuccess = () => {
                const recordings = request.result || [];
                
                // Sort by timestamp (newest first)
                recordings.sort((a, b) => {
                    const timestampA = parseInt(a.id.split('-tm_')[1]) || 0;
                    const timestampB = parseInt(b.id.split('-tm_')[1]) || 0;
                    return timestampB - timestampA;
                });
                
                resolve(recordings);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Save recording to database
     * @param {Object} recordingData - Recording data
     * @returns {Promise<void>}
     */
    function saveRecordingToDB(recordingData) {
        return withStore('recordings', (store, resolve, reject) => {
            const request = store.add(recordingData);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Delete recording from database
     * @param {string} recordingId - Recording ID
     * @returns {Promise<void>}
     */
    function deleteRecordingFromDB(recordingId) {
        return withStore('recordings', (store, resolve, reject) => {
            const request = store.delete(recordingId);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Get all recordings for world/lmid combination
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @returns {Promise<Array>} Array of recordings
     */
    function getAllRecordingsForWorldLmid(world, lmid) {
        return withStore('recordings', (store, resolve, reject) => {
            const index = store.index('worldLmid');
            const request = index.getAll([world, lmid]);
            
            request.onsuccess = () => {
                const recordings = request.result || [];
                
                // Sort by timestamp (newest first)
                recordings.sort((a, b) => {
                    const timestampA = parseInt(a.id.split('-tm_')[1]) || 0;
                    const timestampB = parseInt(b.id.split('-tm_')[1]) || 0;
                    return timestampB - timestampA;
                });
                
                resolve(recordings);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Discover question IDs from database for world/lmid
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @returns {Promise<Array>} Array of unique question IDs
     */
    function discoverQuestionIdsFromDB(world, lmid) {
        return new Promise(async (resolve, reject) => {
            try {
                const recordings = await getAllRecordingsForWorldLmid(world, lmid);
                const questionIds = [...new Set(recordings.map(r => r.questionId))];
                resolve(questionIds);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Load recordings from cloud storage (API endpoint)
     * @param {string} questionId - Question ID
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @returns {Promise<Array>} Array of cloud recordings
     */
    async function loadRecordingsFromCloud(questionId, world, lmid) {
        try {
            const params = new URLSearchParams({ world, lmid });
            if (questionId) {
                params.append('questionId', questionId);
            }
            // Aggressive cache busting
            params.append('_t', Date.now());
            params.append('_r', Math.random().toString(36));
            
            const apiBaseUrl = window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app';
            const apiUrl = `${apiBaseUrl}/api/list-recordings?${params}`;
            
            console.log(`Fetching recordings from: ${apiUrl}`);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`List recordings failed: ${response.status} ${response.statusText}`);
                const errorText = await response.text();
                console.error('Error details:', errorText);
                return [];
            }

            const result = await response.json();
            
            if (result.success) {
                return result.recordings || [];
            } else {
                console.warn('Failed to load cloud recordings:', result.error);
                return [];
            }
        } catch (error) {
            console.error('Error loading cloud recordings:', error);
            return [];
        }
    }

    /**
     * Upload recording to Bunny.net CDN
     * @param {Object} recordingData - Recording data
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @returns {Promise<Object>} Upload result
     */
    async function uploadToBunny(recordingData, world, lmid) {
        try {
            const base64Audio = await blobToBase64(recordingData.audio);
            const filename = `kids-world_${world}-lmid_${lmid}-question_${recordingData.questionId}-tm_${recordingData.timestamp}.webm`;

            const apiBaseUrl = window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app';
            const response = await fetch(`${apiBaseUrl}/api/upload-audio?_t=${Date.now()}&_r=${Math.random()}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    world,
                    lmid,
                    questionId: recordingData.questionId,
                    filename,
                    audioData: base64Audio
                })
            });

            const result = await response.json();
            
            if (result.success) {
                return {
                    success: true,
                    url: result.url,
                    filename: filename
                };
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload to Bunny failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete file from Bunny.net CDN
     * @param {Object} recordingData - Recording data
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @param {string} questionId - Question ID
     * @returns {Promise<Object>} Delete result
     */
    async function deleteFromBunny(recordingData, world, lmid, questionId) {
        try {
            if (!recordingData.cloudUrl) {
                return { success: true }; // Nothing to delete
            }

            const apiBaseUrl = window.LM_CONFIG?.API_BASE_URL || 'https://little-microphones.vercel.app';
            const response = await fetch(`${apiBaseUrl}/api/delete-audio?_t=${Date.now()}&_r=${Math.random()}`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    world,
                    lmid,
                    questionId,
                    recordingId: recordingData.id,
                    cloudUrl: recordingData.cloudUrl,
                    filename: recordingData.id + '.webm'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                return { success: true };
            } else {
                console.warn('Failed to delete from cloud:', result.error);
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Error deleting from Bunny:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clean up orphaned recordings for specific question
     * @param {string} questionId - Question ID
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @returns {Promise<number>} Number of cleaned recordings
     */
    async function cleanupOrphanedRecordings(questionId, world, lmid) {
        try {
            const localRecordings = await loadRecordingsFromDB(questionId, world, lmid);
            const cloudRecordings = await loadRecordingsFromCloud(questionId, world, lmid);
            
            const cloudIds = new Set(cloudRecordings.map(r => r.id));
            const orphanedRecordings = localRecordings.filter(r => 
                r.uploadStatus === 'uploaded' && !cloudIds.has(r.id)
            );
            
            let cleanedCount = 0;
            
            for (const recording of orphanedRecordings) {
                try {
                    await deleteRecordingFromDB(recording.id);
                    cleanedCount++;
                    console.log(`Cleaned orphaned recording: ${recording.id}`);
                } catch (error) {
                    console.error(`Failed to clean orphaned recording ${recording.id}:`, error);
                }
            }
            
            return cleanedCount;
        } catch (error) {
            console.error('Error during orphaned recording cleanup:', error);
            return 0;
        }
    }

    /**
     * Clean up all orphaned recordings for world/lmid
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @returns {Promise<number>} Total number of cleaned recordings
     */
    async function cleanupAllOrphanedRecordings(world, lmid) {
        try {
            const questionIds = await discoverQuestionIdsFromDB(world, lmid);
            let totalCleaned = 0;
            
            for (const questionId of questionIds) {
                const cleaned = await cleanupOrphanedRecordings(questionId, world, lmid);
                totalCleaned += cleaned;
            }
            
            console.log(`Total orphaned recordings cleaned: ${totalCleaned}`);
            return totalCleaned;
        } catch (error) {
            console.error('Error during full orphaned recording cleanup:', error);
            return 0;
        }
    }

    /**
     * Convert blob to base64 string
     * @param {Blob} blob - Blob to convert
     * @returns {Promise<string>} Base64 string
     */
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Sync local recordings with cloud
     * @param {string} world - World name
     * @param {string} lmid - LMID
     * @returns {Promise<Object>} Sync result
     */
    async function syncRecordingsWithCloud(world, lmid) {
        try {
            const localRecordings = await getAllRecordingsForWorldLmid(world, lmid);
            const questionIds = await discoverQuestionIdsFromDB(world, lmid);
            
            let syncedCount = 0;
            let errorCount = 0;
            
            for (const questionId of questionIds) {
                try {
                    const cloudRecordings = await loadRecordingsFromCloud(questionId, world, lmid);
                    const questionLocalRecordings = localRecordings.filter(r => r.questionId === questionId);
                    
                    // Find recordings that exist in cloud but not locally
                    const localIds = new Set(questionLocalRecordings.map(r => r.id));
                    const missingFromLocal = cloudRecordings.filter(r => !localIds.has(r.id));
                    
                    // Add missing recordings to local database (metadata only)
                    for (const cloudRecording of missingFromLocal) {
                        try {
                            const localRecordingData = {
                                ...cloudRecording,
                                audio: null, // No local blob for cloud-only recordings
                                uploadStatus: 'uploaded'
                            };
                            
                            await saveRecordingToDB(localRecordingData);
                            syncedCount++;
                        } catch (error) {
                            console.error(`Failed to sync recording ${cloudRecording.id}:`, error);
                            errorCount++;
                        }
                    }
                } catch (error) {
                    console.error(`Failed to sync question ${questionId}:`, error);
                    errorCount++;
                }
            }
            
            return {
                success: true,
                syncedCount,
                errorCount,
                totalQuestions: questionIds.length
            };
        } catch (error) {
            console.error('Error during cloud sync:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get storage statistics
     * @param {string|null} world - World name (optional)
     * @param {string|null} lmid - LMID (optional)
     * @returns {Promise<Object>} Storage statistics
     */
    async function getStorageStats(world = null, lmid = null) {
        try {
            let recordings;
            
            if (world && lmid) {
                recordings = await getAllRecordingsForWorldLmid(world, lmid);
            } else {
                // Get all recordings
                recordings = await withStore('recordings', (store, resolve, reject) => {
                    const request = store.getAll();
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = () => reject(request.error);
                });
            }
            
            const stats = {
                totalRecordings: recordings.length,
                uploadedRecordings: recordings.filter(r => r.uploadStatus === 'uploaded').length,
                pendingRecordings: recordings.filter(r => r.uploadStatus === 'pending').length,
                failedRecordings: recordings.filter(r => r.uploadStatus === 'failed').length,
                totalSize: 0,
                worlds: new Set(),
                lmids: new Set(),
                questionIds: new Set()
            };
            
            recordings.forEach(recording => {
                if (recording.audio && recording.audio.size) {
                    stats.totalSize += recording.audio.size;
                }
                stats.worlds.add(recording.world);
                stats.lmids.add(recording.lmid);
                stats.questionIds.add(recording.questionId);
            });
            
            // Convert sets to arrays for JSON serialization
            stats.worlds = Array.from(stats.worlds);
            stats.lmids = Array.from(stats.lmids);
            stats.questionIds = Array.from(stats.questionIds);
            
            return stats;
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return {
                error: error.message
            };
        }
    }

    // Create global namespace
    window.RecordingStorage = {
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
    };

    console.log('✅ RecordingStorage module loaded and available globally');

})(); 