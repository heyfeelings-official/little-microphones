/**
 * utils/lmid-utils.js - Shared LMID Management Utilities
 * 
 * PURPOSE: Centralized utilities for LMID operations, ShareID generation, and database interactions
 * DEPENDENCIES: Supabase client
 * 
 * EXPORTED FUNCTIONS:
 * - generateShareId(): Generate random 8-character ShareID
 * - isShareIdUsed(): Check if ShareID exists in database
 * - generateAllShareIds(): Generate unique ShareIDs for all worlds
 * - findNextAvailableLmid(): Find next available LMID in database
 * - assignLmidToMember(): Assign LMID with ShareIDs to member
 * - getSupabaseClient(): Get configured Supabase client
 * - validateMemberId(): Validate Memberstack member ID format
 * - getWorldColumn(): Convert world name to database column name
 * 
 * SHARED CONSTANTS:
 * - WORLDS: Array of valid world names
 * - MEMBERSTACK_API_URL: Memberstack Admin API base URL
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0
 * STATUS: Production Ready ✅
 */

import { createClient } from '@supabase/supabase-js';

// Shared constants
export const WORLDS = ['spookyland', 'waterpark', 'shopping-spree', 'amusement-park', 'big-city', 'neighborhood'];
export const MEMBERSTACK_API_URL = 'https://admin.memberstack.com';

/**
 * Get configured Supabase client
 * @returns {Object} Supabase client instance
 */
export function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    return createClient(supabaseUrl, supabaseKey);
}

/**
 * Generate a random, URL-safe ShareID
 * @returns {string} 8-character random string
 */
export function generateShareId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Check if a ShareID is already used in any world column
 * @param {string} shareId - ShareID to check
 * @returns {Promise<boolean>} True if already used
 */
export async function isShareIdUsed(shareId) {
    const supabase = getSupabaseClient();
    const { data } = await supabase
        .from('lmids')
        .select('lmid')
        .or(`share_id_spookyland.eq.${shareId},share_id_waterpark.eq.${shareId},share_id_shopping_spree.eq.${shareId},share_id_amusement_park.eq.${shareId},share_id_big_city.eq.${shareId},share_id_neighborhood.eq.${shareId}`)
        .limit(1);
    
    return data && data.length > 0;
}

/**
 * Generate unique ShareIDs for all worlds
 * @returns {Promise<Object>} Object with world names as keys and ShareIDs as values
 */
export async function generateAllShareIds() {
    const shareIds = {};
    
    for (const world of WORLDS) {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const shareId = generateShareId();
            const isUsed = await isShareIdUsed(shareId);
            
            if (!isUsed) {
                shareIds[world] = shareId;
                break;
            }
            
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            throw new Error(`Failed to generate unique ShareID for world: ${world}`);
        }
    }
    
    return shareIds;
}

/**
 * Find the next available LMID
 * @returns {Promise<number|null>} Next available LMID or null if none available
 */
export async function findNextAvailableLmid() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('lmids')
        .select('lmid')
        .eq('status', 'available')
        .order('lmid', { ascending: true })
        .limit(1);

    if (error) {
        console.error('Error finding available LMID:', error);
        return null;
    }

    return data.length > 0 ? data[0].lmid : null;
}

/**
 * Assign LMID to member with all ShareIDs
 * @param {number} lmid - LMID to assign
 * @param {string} memberId - Memberstack member ID
 * @param {string} memberEmail - Member email
 * @param {Object} shareIds - Generated ShareIDs for all worlds
 * @returns {Promise<boolean>} Success status
 */
export async function assignLmidToMember(lmid, memberId, memberEmail, shareIds) {
    const supabase = getSupabaseClient();
    
    const updateData = {
        status: 'used',
        assigned_to_member_id: memberId,
        assigned_to_member_email: memberEmail,
        assigned_at: new Date().toISOString(),
        share_id_spookyland: shareIds.spookyland,
        share_id_waterpark: shareIds.waterpark,
        share_id_shopping_spree: shareIds['shopping-spree'],
        share_id_amusement_park: shareIds['amusement-park'],
        share_id_big_city: shareIds['big-city'],
        share_id_neighborhood: shareIds.neighborhood
    };

    const { error } = await supabase
        .from('lmids')
        .update(updateData)
        .eq('lmid', lmid);

    if (error) {
        console.error('Error assigning LMID:', error);
        return false;
    }

    return true;
}

/**
 * Validate member ID format (basic validation)
 * @param {string} memberId - Memberstack member ID
 * @returns {boolean} True if format looks valid
 */
export function validateMemberId(memberId) {
    // Memberstack member IDs typically start with 'mem_' and contain alphanumeric characters
    return typeof memberId === 'string' && 
           memberId.startsWith('mem_') && 
           memberId.length > 10;
}

/**
 * Get the database column name for a world
 * @param {string} world - World name
 * @returns {string} Column name
 */
export function getWorldColumn(world) {
    return `share_id_${world.replace('-', '_')}`;
}

/**
 * Validate LMID ownership against database
 * @param {string} memberId - Memberstack member ID
 * @param {string} lmidsToValidate - Comma-separated LMIDs to validate
 * @returns {Promise<Object>} Validation result
 */
export async function validateLmidOwnership(memberId, lmidsToValidate) {
    try {
        const supabase = getSupabaseClient();
        
        // Get actual owned LMIDs from database
        const { data: ownedRecords, error } = await supabase
            .from('lmids')
            .select('lmid')
            .eq('assigned_to_member_id', memberId)
            .eq('status', 'used')
            .order('lmid', { ascending: true });

        if (error) {
            console.error('Error fetching member LMIDs for validation:', error);
            return { valid: false, error: 'Database validation failed' };
        }

        const validLmids = ownedRecords ? ownedRecords.map(record => record.lmid.toString()) : [];
        const lmidsArray = lmidsToValidate ? lmidsToValidate.split(',').map(id => id.trim()) : [];
        
        // Check which LMIDs are invalid
        const invalidLmids = lmidsArray.filter(lmid => !validLmids.includes(lmid));
        
        return {
            valid: invalidLmids.length === 0,
            validLmids,
            invalidLmids,
            message: invalidLmids.length === 0 
                ? 'All LMIDs are valid' 
                : `Invalid LMIDs: ${invalidLmids.join(', ')}`
        };
    } catch (error) {
        console.error('Error in validateLmidOwnership:', error);
        return { valid: false, error: 'Validation error' };
    }
}

/**
 * Update Memberstack member metadata using Admin API (with validation)
 * @param {string} memberId - Memberstack member ID
 * @param {string} newLmidString - New LMID string
 * @returns {Promise<boolean>} Success status
 */
export async function updateMemberstackMetadata(memberId, newLmidString) {
    const MEMBERSTACK_SECRET_KEY = process.env.MEMBERSTACK_SECRET_KEY;
    
    console.log(`🔧 [updateMemberstackMetadata] Called for memberId: ${memberId} with lmids: "${newLmidString}"`);

    if (!MEMBERSTACK_SECRET_KEY) {
        console.warn('MEMBERSTACK_SECRET_KEY not configured. Skipping metadata update.');
        return false;
    }
    console.log('🔑 MEMBERSTACK_SECRET_KEY is configured.');

    // 🔒 SECURITY: Validate LMID ownership before updating metadata
    const validation = await validateLmidOwnership(memberId, newLmidString);
    if (!validation.valid) {
        console.error(`❌ SECURITY VIOLATION: Member ${memberId} attempted to set invalid LMIDs: ${validation.invalidLmids?.join(', ')}`);
        console.error(`  > Actual owned LMIDs: ${validation.validLmids?.join(', ')}`);
        return false;
    }
    console.log('🔒 LMID ownership validated successfully.');

    const requestBody = {
        metaData: {
            lmids: newLmidString || ""
        }
    };
    
    const requestUrl = `${MEMBERSTACK_API_URL}/members/${memberId}`;
    console.log(`📤 Making PATCH request to: ${requestUrl}`);
    console.log(`📤 Request body:`, JSON.stringify(requestBody, null, 2));

    try {
        const response = await fetch(requestUrl, {
            method: 'PATCH',
            headers: {
                'x-api-key': MEMBERSTACK_SECRET_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log(`📥 Response status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const responseData = await response.json();
            console.log('✅ Memberstack metadata updated successfully:', responseData);
            return true;
        } else {
            const errorText = await response.text();
            console.error(`❌ Memberstack API error (${response.status}):`, errorText);
            return false;
        }

    } catch (error) {
        console.error('❌ Network error during Memberstack metadata update:', error);
        return false;
    }
} 