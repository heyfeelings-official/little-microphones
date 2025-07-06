/**
 * utils/bunny-utils.js - Bunny.net Storage Utilities
 * 
 * PURPOSE: Centralized utilities for Bunny.net storage operations
 * DEPENDENCIES: Node.js built-in modules (https, fs)
 * 
 * EXPORTED FUNCTIONS:
 * - validateBunnyConfig(): Validate Bunny.net environment variables
 * - getBunnyConfig(): Get Bunny.net configuration
 * - uploadFileToBunny(): Upload file buffer to Bunny.net storage
 * - deleteFileFromBunny(): Delete file from Bunny.net storage
 * - listBunnyDirectory(): List files in Bunny.net directory
 * - generateBunnyCdnUrl(): Generate CDN URL for file
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Production Ready ✅
 */

import https from 'https';

/**
 * Validate Bunny.net environment variables
 * @returns {Object} Validation result with { valid: boolean, missing: Array<string> }
 */
export function validateBunnyConfig() {
    const required = ['BUNNY_API_KEY', 'BUNNY_STORAGE_ZONE', 'BUNNY_CDN_URL'];
    const missing = [];
    
    for (const envVar of required) {
        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    }
    
    return {
        valid: missing.length === 0,
        missing: missing
    };
}

/**
 * Get Bunny.net configuration from environment variables
 * @returns {Object} Configuration object
 */
export function getBunnyConfig() {
    return {
        apiKey: process.env.BUNNY_API_KEY,
        storageZone: process.env.BUNNY_STORAGE_ZONE,
        cdnUrl: process.env.BUNNY_CDN_URL
    };
}

/**
 * Upload file buffer to Bunny.net storage
 * @param {Buffer} fileBuffer - File data to upload
 * @param {string} filePath - Remote file path (e.g., "lmid/world/filename.mp3")
 * @param {string} contentType - MIME type (default: 'audio/mpeg')
 * @returns {Promise<string>} CDN URL of uploaded file
 */
export function uploadFileToBunny(fileBuffer, filePath, contentType = 'audio/mpeg') {
    const config = getBunnyConfig();
    const uploadUrl = `https://storage.bunnycdn.com/${config.storageZone}/${filePath}`;
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'storage.bunnycdn.com',
            port: 443,
            path: `/${config.storageZone}/${filePath}`,
            method: 'PUT',
            headers: {
                'AccessKey': config.apiKey,
                'Content-Type': contentType,
                'Content-Length': fileBuffer.length
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 201) {
                const cdnUrl = `${config.cdnUrl}/${filePath}`;
                console.log(`✅ Upload successful: ${cdnUrl}`);
                resolve(cdnUrl);
            } else {
                reject(new Error(`Upload failed with status: ${res.statusCode}`));
            }
        });
        
        req.on('error', reject);
        req.write(fileBuffer);
        req.end();
    });
}

/**
 * Delete file from Bunny.net storage
 * @param {string} filePath - Remote file path to delete
 * @returns {Promise<boolean>} Success status
 */
export function deleteFileFromBunny(filePath) {
    const config = getBunnyConfig();
    const deleteUrl = `https://storage.bunnycdn.com/${config.storageZone}/${filePath}`;
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'storage.bunnycdn.com',
            port: 443,
            path: `/${config.storageZone}/${filePath}`,
            method: 'DELETE',
            headers: {
                'AccessKey': config.apiKey
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 404) {
                console.log(`✅ Delete successful: ${filePath}`);
                resolve(true);
            } else {
                console.error(`❌ Delete failed: ${res.statusCode}`);
                reject(new Error(`Delete failed with status: ${res.statusCode}`));
            }
        });
        
        req.on('error', reject);
        req.end();
    });
}

/**
 * List files in Bunny.net directory
 * @param {string} directoryPath - Directory path to list
 * @returns {Promise<Array>} Array of file objects
 */
export function listBunnyDirectory(directoryPath) {
    const config = getBunnyConfig();
    const listUrl = `https://storage.bunnycdn.com/${config.storageZone}/${directoryPath}`;
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'storage.bunnycdn.com',
            port: 443,
            path: `/${config.storageZone}/${directoryPath}`,
            method: 'GET',
            headers: {
                'AccessKey': config.apiKey,
                'Accept': 'application/json'
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200) {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const fileList = JSON.parse(data);
                        resolve(fileList);
                    } catch (parseError) {
                        reject(new Error('Failed to parse directory listing'));
                    }
                });
            } else if (res.statusCode === 404) {
                resolve([]); // Directory doesn't exist, return empty array
            } else {
                reject(new Error(`List failed with status: ${res.statusCode}`));
            }
        });
        
        req.on('error', reject);
        req.end();
    });
}

/**
 * Generate CDN URL for file
 * @param {string} filePath - File path
 * @param {boolean} cacheBusting - Add cache-busting parameters (default: false)
 * @returns {string} Complete CDN URL
 */
export function generateBunnyCdnUrl(filePath, cacheBusting = false) {
    const config = getBunnyConfig();
    let url = `${config.cdnUrl}/${filePath}`;
    
    if (cacheBusting) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        url += `?v=${timestamp}&cb=${random}`;
    }
    
    return url;
}

/**
 * Check if file exists in Bunny.net storage
 * @param {string} filePath - File path to check
 * @returns {Promise<boolean>} True if file exists
 */
export function checkBunnyFileExists(filePath) {
    const config = getBunnyConfig();
    
    return new Promise((resolve) => {
        const options = {
            hostname: 'storage.bunnycdn.com',
            port: 443,
            path: `/${config.storageZone}/${filePath}`,
            method: 'HEAD',
            headers: {
                'AccessKey': config.apiKey
            }
        };
        
        const req = https.request(options, (res) => {
            resolve(res.statusCode === 200);
        });
        
        req.on('error', () => resolve(false));
        req.end();
    });
} 