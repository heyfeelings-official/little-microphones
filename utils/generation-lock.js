/**
 * utils/generation-lock.js - Generation Lock System
 * 
 * PURPOSE: Prevents multiple concurrent generations for the same world/lmid/type
 * APPROACH: Uses Bunny.net storage as distributed lock mechanism
 * 
 * LOGIC:
 * 1. Before generation: Create lock file with timestamp and recording snapshot
 * 2. During generation: Check if lock exists and is recent
 * 3. After generation: Remove lock file
 * 4. Timeout handling: Auto-expire locks after 5 minutes
 * 5. Smart queuing: Compare snapshots to detect new recordings during generation
 */

import https from 'https';

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const LOCK_CHECK_INTERVAL_MS = 2000; // 2 seconds
const MAX_WAIT_TIME_MS = 8 * 60 * 1000; // 8 minutes max wait

/**
 * Create a generation lock for specific world/lmid/type
 * @param {string} world - World identifier
 * @param {string} lmid - LMID number
 * @param {string} type - Program type ('kids' or 'parent')
 * @param {Array} recordingSnapshot - Current recordings snapshot
 * @returns {Promise<boolean>} True if lock acquired, false if already locked
 */
export async function acquireGenerationLock(world, lmid, type, recordingSnapshot = []) {
    const lockKey = `${world}-${lmid}-${type}`;
    const lockPath = `/${lmid}/${world}/generation-lock-${type}.json`;
    
    console.log(`🔒 Attempting to acquire lock for ${lockKey}`);
    
    // Check if lock already exists
    const existingLock = await checkLockStatus(world, lmid, type);
    if (existingLock) {
        console.log(`🔒 Lock already exists for ${lockKey}, created at ${existingLock.createdAt}`);
        
        // Check if lock is expired
        const lockAge = Date.now() - new Date(existingLock.createdAt).getTime();
        if (lockAge > LOCK_TIMEOUT_MS) {
            console.log(`🔒 Lock expired for ${lockKey}, removing old lock`);
            await releaseLock(world, lmid, type);
        } else {
            console.log(`🔒 Lock is still active for ${lockKey}, remaining: ${Math.round((LOCK_TIMEOUT_MS - lockAge) / 1000)}s`);
            return false;
        }
    }
    
    // Create new lock with recording snapshot
    const lockData = {
        world,
        lmid,
        type,
        createdAt: new Date().toISOString(),
        status: 'generating',
        lockKey,
        recordingSnapshot: recordingSnapshot.map(r => r.filename || r),
        recordingCount: recordingSnapshot.length,
        requestId: `gen_${Date.now()}_${Math.random().toString(36).substring(2)}`
    };
    
    try {
        await saveLockFile(lockData, lockPath);
        console.log(`✅ Lock acquired for ${lockKey} with ${recordingSnapshot.length} recordings`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to acquire lock for ${lockKey}:`, error);
        return false;
    }
}

/**
 * Release a generation lock
 * @param {string} world - World identifier
 * @param {string} lmid - LMID number
 * @param {string} type - Program type ('kids' or 'parent')
 */
export async function releaseLock(world, lmid, type) {
    const lockKey = `${world}-${lmid}-${type}`;
    const lockPath = `/${lmid}/${world}/generation-lock-${type}.json`;
    
    console.log(`🔓 Releasing lock for ${lockKey}`);
    
    try {
        await deleteLockFile(lockPath);
        console.log(`✅ Lock released for ${lockKey}`);
    } catch (error) {
        console.warn(`⚠️ Failed to release lock for ${lockKey}:`, error);
    }
}

/**
 * Check if generation is currently in progress
 * @param {string} world - World identifier
 * @param {string} lmid - LMID number
 * @param {string} type - Program type ('kids' or 'parent')
 * @returns {Promise<Object|null>} Lock data if exists, null otherwise
 */
export async function checkLockStatus(world, lmid, type) {
    return new Promise((resolve) => {
        const lockUrl = `https://little-microphones.b-cdn.net/${lmid}/${world}/generation-lock-${type}.json?v=${Date.now()}`;
        
        https.get(lockUrl, (response) => {
            if (response.statusCode === 200) {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    try {
                        const lockData = JSON.parse(data);
                        resolve(lockData);
                    } catch (parseError) {
                        console.warn('Failed to parse lock JSON:', parseError);
                        resolve(null);
                    }
                });
            } else {
                // 404 means no lock exists
                resolve(null);
            }
        }).on('error', (error) => {
            console.warn('Error checking lock status:', error);
            resolve(null);
        });
    });
}

/**
 * Check if current recordings differ from lock snapshot
 * @param {Array} currentRecordings - Current recordings
 * @param {Object} lockData - Lock data with snapshot
 * @param {string} type - Program type to filter recordings
 * @returns {boolean} True if recordings have changed
 */
export function hasRecordingsChanged(currentRecordings, lockData, type, world, lmid) {
    if (!lockData || !lockData.recordingSnapshot) {
        return true; // No snapshot means we need to check
    }
    
    // Filter current recordings by type
    const pattern = type === 'kids' 
        ? new RegExp(`^kids-world_${world}-lmid_${lmid}-question_\\d+-tm_\\d+\\.mp3$`)
        : new RegExp(`^parent_[^-]+-world_${world}-lmid_${lmid}-question_\\d+-tm_\\d+\\.mp3$`);
    
    const currentFiltered = currentRecordings
        .filter(file => file.filename && file.filename.endsWith('.mp3') && !file.filename.includes('.json'))
        .filter(file => pattern.test(file.filename))
        .map(file => file.filename)
        .sort();
    
    const snapshotFiltered = lockData.recordingSnapshot.sort();
    
    console.log(`📊 Comparing recordings for ${type}:`);
    console.log(`📊 Current: [${currentFiltered.join(', ')}]`);
    console.log(`📊 Snapshot: [${snapshotFiltered.join(', ')}]`);
    
    // Compare arrays
    if (currentFiltered.length !== snapshotFiltered.length) {
        console.log(`📊 Length differs: ${currentFiltered.length} vs ${snapshotFiltered.length}`);
        return true;
    }
    
    for (let i = 0; i < currentFiltered.length; i++) {
        if (currentFiltered[i] !== snapshotFiltered[i]) {
            console.log(`📊 File differs at index ${i}: ${currentFiltered[i]} vs ${snapshotFiltered[i]}`);
            return true;
        }
    }
    
    console.log(`📊 Recordings unchanged for ${type}`);
    return false;
}

/**
 * Wait for generation to complete (with timeout)
 * @param {string} world - World identifier
 * @param {string} lmid - LMID number
 * @param {string} type - Program type ('kids' or 'parent')
 * @param {number} maxWaitMs - Maximum wait time in milliseconds
 * @returns {Promise<Object>} Result object with status and data
 */
export async function waitForGenerationComplete(world, lmid, type, maxWaitMs = MAX_WAIT_TIME_MS) {
    const lockKey = `${world}-${lmid}-${type}`;
    const startTime = Date.now();
    
    console.log(`⏳ Waiting for generation to complete for ${lockKey}`);
    
    while (Date.now() - startTime < maxWaitMs) {
        const lockStatus = await checkLockStatus(world, lmid, type);
        
        if (!lockStatus) {
            console.log(`✅ Generation completed for ${lockKey}`);
            return { completed: true, timedOut: false };
        }
        
        // Check if lock is expired
        const lockAge = Date.now() - new Date(lockStatus.createdAt).getTime();
        if (lockAge > LOCK_TIMEOUT_MS) {
            console.log(`🔒 Lock expired for ${lockKey}, assuming generation failed`);
            await releaseLock(world, lmid, type);
            return { completed: false, timedOut: true, expired: true };
        }
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const remaining = Math.round((LOCK_TIMEOUT_MS - lockAge) / 1000);
        console.log(`⏳ Still waiting for ${lockKey}, elapsed: ${elapsed}s, estimated remaining: ${remaining}s`);
        
        await sleep(LOCK_CHECK_INTERVAL_MS);
    }
    
    console.log(`⏰ Timeout waiting for generation to complete for ${lockKey}`);
    return { completed: false, timedOut: true, expired: false };
}

/**
 * Get generation status for display
 * @param {string} world - World identifier
 * @param {string} lmid - LMID number
 * @param {string} type - Program type ('kids' or 'parent')
 * @returns {Promise<Object>} Status object
 */
export async function getGenerationStatus(world, lmid, type) {
    const lockData = await checkLockStatus(world, lmid, type);
    
    if (!lockData) {
        return { status: 'ready', isGenerating: false };
    }
    
    const lockAge = Date.now() - new Date(lockData.createdAt).getTime();
    if (lockAge > LOCK_TIMEOUT_MS) {
        return { status: 'expired', isGenerating: false, expired: true };
    }
    
    const estimatedRemaining = Math.max(0, Math.round((LOCK_TIMEOUT_MS - lockAge) / 1000));
    
    return {
        status: 'generating',
        isGenerating: true,
        estimatedRemaining,
        lockData
    };
}

/**
 * Save lock file to Bunny.net
 * @param {Object} lockData - Lock data to save
 * @param {string} lockPath - Path to save lock file
 */
async function saveLockFile(lockData, lockPath) {
    const lockJson = JSON.stringify(lockData, null, 2);
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'storage.bunnycdn.com',
            port: 443,
            path: `/${process.env.BUNNY_STORAGE_ZONE}${lockPath}`,
            method: 'PUT',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(lockJson, 'utf8'),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 201) {
                resolve();
            } else {
                reject(new Error(`Failed to save lock file: ${res.statusCode}`));
            }
        });
        
        req.on('error', reject);
        req.write(lockJson);
        req.end();
    });
}

/**
 * Delete lock file from Bunny.net
 * @param {string} lockPath - Path to lock file
 */
async function deleteLockFile(lockPath) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'storage.bunnycdn.com',
            port: 443,
            path: `/${process.env.BUNNY_STORAGE_ZONE}${lockPath}`,
            method: 'DELETE',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 204 || res.statusCode === 404) {
                // 404 is OK - file already deleted
                resolve();
            } else {
                reject(new Error(`Failed to delete lock file: ${res.statusCode}`));
            }
        });
        
        req.on('error', reject);
        req.end();
    });
}

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
} 