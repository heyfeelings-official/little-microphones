/**
 * api/webflow-webhook.js - Webflow CMS Webhook Handler
 * 
 * PURPOSE: Receive real-time updates from Webflow CMS and invalidate cache
 * EVENTS: collection_item_created, collection_item_changed, collection_item_deleted
 * 
 * WORKFLOW:
 * 1. Validate webhook signature for security
 * 2. Process CMS changes (create/update/delete)
 * 3. Invalidate relevant cache entries
 * 4. Optionally sync to Supabase for backup
 * 
 * ENVIRONMENT VARIABLES REQUIRED:
 * - WEBFLOW_WEBHOOK_SECRET: For signature validation (from webhook response)
 *   - Supports a single secret string OR multiple secrets separated by commas
 * - Optional per-trigger secrets (override/augment global):
 *   - WEBFLOW_WEBHOOK_CREATED_SECRET
 *   - WEBFLOW_WEBHOOK_CHANGED_SECRET
 *   - WEBFLOW_WEBHOOK_DELETED_SECRET
 *   - WEBFLOW_WEBHOOK_UNPUBLISHED_SECRET
 * 
 * VERSION: 1.0.1
 * LAST UPDATED: January 2025
 */

import crypto from 'crypto';
import { setCorsHeaders } from '../utils/api-utils.js';

// In-memory cache for Webflow items (will be replaced with Redis in production)
let webflowCache = new Map();

/**
 * Validate Webflow webhook signature
 * Based on: https://developers.webflow.com/data/docs/working-with-webhooks.md#validating-request-signatures
 */
function verifyWebflowSignature(webhookSecret, timestamp, requestBody, providedSignature) {
    try {
        // Convert timestamp to integer
        const requestTimestamp = parseInt(timestamp, 10);
        
        // Generate HMAC hash
        const data = `${requestTimestamp}:${requestBody}`;
        const hash = crypto.createHmac('sha256', webhookSecret)
                          .update(data)
                          .digest('hex');
        
        // Compare signatures (timing-safe)
        if (!crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(providedSignature, 'hex'))) {
            throw new Error('Invalid signature');
        }
        
        // Validate timestamp (within 5 minutes to prevent replay attacks)
        const currentTime = Date.now();
        if (currentTime - requestTimestamp > 300000) { // 5 minutes in milliseconds
            throw new Error('Request is older than 5 minutes');
        }
        
        return true;
        
    } catch (err) {
        console.error(`❌ Webhook signature verification failed: ${err.message}`);
        return false;
    }
}

/**
 * Resolve list of candidate secrets for a given trigger
 * - Supports per-trigger env vars and a global CSV env var as fallback
 */
function getSecretsForTrigger(triggerType) {
    const globalRaw = process.env.WEBFLOW_WEBHOOK_SECRET || '';
    const perTriggerEnvMap = {
        'collection_item_created': process.env.WEBFLOW_WEBHOOK_CREATED_SECRET || '',
        'collection_item_changed': process.env.WEBFLOW_WEBHOOK_CHANGED_SECRET || '',
        'collection_item_deleted': process.env.WEBFLOW_WEBHOOK_DELETED_SECRET || '',
        'collection_item_unpublished': process.env.WEBFLOW_WEBHOOK_UNPUBLISHED_SECRET || ''
    };

    const perTriggerRaw = perTriggerEnvMap[triggerType] || '';

    // Combine per-trigger and global, comma-separated, then normalize to list
    const combined = [perTriggerRaw, globalRaw]
        .filter(Boolean)
        .join(',');

    return combined
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

/**
 * Invalidate cache entries based on CMS changes
 */
function invalidateCache(triggerType, payload) {
    const { siteId, collectionId, itemId } = payload;
    
    console.log(`🗑️ Cache invalidation triggered by: ${triggerType}`);
    console.log(`   Site ID: ${siteId}`);
    console.log(`   Collection ID: ${collectionId}`);
    console.log(`   Item ID: ${itemId}`);
    
    // Invalidate specific item cache
    const itemCacheKey = `item_${itemId}`;
    if (webflowCache.has(itemCacheKey)) {
        webflowCache.delete(itemCacheKey);
        console.log(`   ✅ Deleted cache for item: ${itemId}`);
    }
    
    // Invalidate collection cache (affects batch loading)
    const collectionCacheKey = `collection_${collectionId}`;
    if (webflowCache.has(collectionCacheKey)) {
        webflowCache.delete(collectionCacheKey);
        console.log(`   ✅ Deleted cache for collection: ${collectionId}`);
    }
    
    // Invalidate locale-specific caches
    ['en', 'pl'].forEach(lang => {
        const localeItemKey = `item_${itemId}_${lang}`;
        const localeCollectionKey = `collection_${collectionId}_${lang}`;
        
        if (webflowCache.has(localeItemKey)) {
            webflowCache.delete(localeItemKey);
            console.log(`   ✅ Deleted ${lang} cache for item: ${itemId}`);
        }
        
        if (webflowCache.has(localeCollectionKey)) {
            webflowCache.delete(localeCollectionKey);
            console.log(`   ✅ Deleted ${lang} cache for collection: ${collectionId}`);
        }
    });
    
    console.log(`📊 Cache status: ${webflowCache.size} entries remaining`);
}

/**
 * Main webhook handler
 */
export default async function handler(req, res) {
    // Set CORS headers
    setCorsHeaders(res);
    
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        console.log('📨 Webhook received from Webflow');
        
        // Extract headers and body
        const requestBody = JSON.stringify(req.body);
        const timestamp = req.headers['x-webflow-timestamp'];
        const providedSignature = req.headers['x-webflow-signature'];
        
        // Resolve candidate secrets based on trigger (per-trigger overrides + global)
        const triggerType = req.body?.triggerType || '';
        const webhookSecrets = getSecretsForTrigger(triggerType);

        // Validate signature if we have headers and at least one secret
        if (webhookSecrets.length > 0 && timestamp && providedSignature) {
            const anyValid = webhookSecrets.some(secret =>
                verifyWebflowSignature(secret, timestamp, requestBody, providedSignature)
            );

            if (!anyValid) {
                console.error('❌ Invalid webhook signature with provided secrets - possible security threat');
                return res.status(400).json({ error: 'Invalid signature' });
            }
            console.log(`✅ Webhook signature validated (matched 1 of ${webhookSecrets.length} secret(s))`);
        } else {
            console.log('⚠️ Webhook signature validation skipped (no secret configured)');
        }
        
        // Process webhook payload
        const { payload } = req.body;
        
        console.log(`🎯 Processing webhook: ${triggerType}`);
        
        // Handle CMS collection events
        if (triggerType.startsWith('collection_item_')) {
            // Validate that it's our workbooks collection
            const WORKBOOKS_COLLECTION_ID = '689a16dd10cb6df7ff0094a0';
            
            if (payload.collectionId === WORKBOOKS_COLLECTION_ID) {
                console.log('📚 Workbooks collection event detected');
                
                // Invalidate cache for this item/collection
                invalidateCache(triggerType, payload);
                
                // Log the specific change
                switch (triggerType) {
                    case 'collection_item_created':
                        console.log(`🆕 New workbook created: ${payload.itemId}`);
                        break;
                    case 'collection_item_changed':
                        console.log(`✏️ Workbook updated: ${payload.itemId}`);
                        break;
                    case 'collection_item_deleted':
                        console.log(`🗑️ Workbook deleted: ${payload.itemId}`);
                        break;
                    case 'collection_item_unpublished':
                        console.log(`📤 Workbook unpublished: ${payload.itemId}`);
                        break;
                }
            } else {
                console.log(`ℹ️ Ignoring event for different collection: ${payload.collectionId}`);
            }
        } else {
            console.log(`ℹ️ Ignoring non-collection event: ${triggerType}`);
        }
        
        // Respond with 200 to acknowledge receipt
        res.status(200).json({ 
            received: true, 
            triggerType,
            processed: triggerType.startsWith('collection_item_'),
            timestamp: new Date().toISOString()
        });
        
        console.log('✅ Webhook processed successfully');
        
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Export cache for use by other modules
 */
export { webflowCache };
