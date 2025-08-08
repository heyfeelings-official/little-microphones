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
 * Assign LMID to member with all ShareIDs and teacher data from Memberstack
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
        // Teacher data is now fetched directly from Memberstack via API, not stored in database
    };

    const { error } = await supabase
        .from('lmids')
        .update(updateData)
        .eq('lmid', lmid);

    if (error) {
        console.error('Error assigning LMID:', error);
        return false;
    }

    console.log(`✅ LMID ${lmid} assigned to member ${memberId} (${memberEmail})`);
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
        console.log(`🔍 [validateLmidOwnership] === STARTING VALIDATION ===`);
        console.log(`🔍 [validateLmidOwnership] memberId: ${memberId}`);
        console.log(`🔍 [validateLmidOwnership] lmidsToValidate: "${lmidsToValidate}"`);
        
        const supabase = getSupabaseClient();
        
        // Get actual owned LMIDs from database
        console.log(`🔍 [validateLmidOwnership] Querying Supabase for owned LMIDs...`);
        const { data: ownedRecords, error } = await supabase
            .from('lmids')
            .select('lmid')
            .eq('assigned_to_member_id', memberId)
            .eq('status', 'used')
            .order('lmid', { ascending: true });

        console.log(`🔍 [validateLmidOwnership] Supabase query result:`, { ownedRecords, error });

        if (error) {
            console.error('❌ [validateLmidOwnership] Error fetching member LMIDs for validation:', error);
            return { valid: false, error: 'Database validation failed' };
        }

        const validLmids = ownedRecords ? ownedRecords.map(record => record.lmid.toString()) : [];
        const lmidsArray = lmidsToValidate ? lmidsToValidate.split(',').map(id => id.trim()) : [];
        
        console.log(`🔍 [validateLmidOwnership] validLmids from DB: [${validLmids.join(', ')}]`);
        console.log(`🔍 [validateLmidOwnership] lmidsArray to validate: [${lmidsArray.join(', ')}]`);
        
        // Check which LMIDs are invalid
        const invalidLmids = lmidsArray.filter(lmid => !validLmids.includes(lmid));
        
        console.log(`🔍 [validateLmidOwnership] invalidLmids: [${invalidLmids.join(', ')}]`);
        
        const result = {
            valid: invalidLmids.length === 0,
            validLmids,
            invalidLmids,
            message: invalidLmids.length === 0 
                ? 'All LMIDs are valid' 
                : `Invalid LMIDs: ${invalidLmids.join(', ')}`
        };
        
        console.log(`🔍 [validateLmidOwnership] Final validation result:`, result);
        return result;
    } catch (error) {
        console.error('❌ [validateLmidOwnership] Error in validateLmidOwnership:', error);
        return { valid: false, error: 'Validation error' };
    }
}

/**
 * Update Memberstack member metadata using Admin API (with validation)
 * @param {string} memberId - Memberstack member ID
 * @param {string} newLmidString - New LMID string
 * @param {boolean} skipValidation - Skip LMID ownership validation (for parent sharing)
 * @returns {Promise<boolean>} Success status
 */
export async function updateMemberstackMetadata(memberId, newLmidString, skipValidation = false) {
    const MEMBERSTACK_SECRET_KEY = process.env.MEMBERSTACK_SECRET_KEY;
    
    console.log(`🔧 [updateMemberstackMetadata] === STARTING METADATA UPDATE ===`);
    console.log(`🔧 [updateMemberstackMetadata] Called for memberId: ${memberId} with lmids: "${newLmidString}"`);
    console.log(`🔧 [updateMemberstackMetadata] Timestamp: ${new Date().toISOString()}`);

    if (!MEMBERSTACK_SECRET_KEY) {
        console.warn('❌ MEMBERSTACK_SECRET_KEY not configured. Skipping metadata update.');
        return false;
    }
    console.log('🔑 MEMBERSTACK_SECRET_KEY is configured.');

    // 🔒 SECURITY: Validate LMID ownership before updating metadata (unless skipped for parent sharing)
    if (!skipValidation) {
        console.log(`🔍 [updateMemberstackMetadata] Starting LMID ownership validation...`);
        const validation = await validateLmidOwnership(memberId, newLmidString);
        console.log(`🔍 [updateMemberstackMetadata] Validation result:`, JSON.stringify(validation, null, 2));
        
        if (!validation.valid) {
            console.error(`❌ [updateMemberstackMetadata] SECURITY VIOLATION: Member ${memberId} attempted to set invalid LMIDs: ${validation.invalidLmids?.join(', ')}`);
            console.error(`❌ [updateMemberstackMetadata] Actual owned LMIDs: ${validation.validLmids?.join(', ')}`);
            console.error(`❌ [updateMemberstackMetadata] Validation error: ${validation.error || 'Unknown error'}`);
            return false;
        }
        console.log('🔒 [updateMemberstackMetadata] LMID ownership validated successfully.');
    } else {
        console.log('🔓 [updateMemberstackMetadata] Skipping LMID ownership validation (parent sharing mode).');
    }

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

        console.log(`📥 [updateMemberstackMetadata] Response status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const responseData = await response.json();
            console.log('✅ [updateMemberstackMetadata] Memberstack metadata updated successfully:', responseData);
            console.log('✅ [updateMemberstackMetadata] === METADATA UPDATE COMPLETED SUCCESSFULLY ===');
            return true;
        } else {
            const errorText = await response.text();
            console.error(`❌ [updateMemberstackMetadata] Memberstack API error (${response.status}):`, errorText);
            console.error(`❌ [updateMemberstackMetadata] === METADATA UPDATE FAILED ===`);
            return false;
        }

    } catch (error) {
        console.error('❌ [updateMemberstackMetadata] Network error during Memberstack metadata update:', error);
        console.error('❌ [updateMemberstackMetadata] === METADATA UPDATE FAILED WITH EXCEPTION ===');
        return false;
    }
} 

/**
 * Get teacher data from Memberstack API
 * @param {string} memberId - Memberstack member ID
 * @returns {Promise<Object|null>} Teacher data or null
 */
async function getTeacherDataFromMemberstack(memberId) {
    const MEMBERSTACK_SECRET_KEY = process.env.MEMBERSTACK_SECRET_KEY;
    
    if (!MEMBERSTACK_SECRET_KEY) {
        console.warn('MEMBERSTACK_SECRET_KEY not configured - cannot fetch teacher data');
        return null;
    }
    
    try {
        const response = await fetch(`${MEMBERSTACK_API_URL}/members/${memberId}`, {
            method: 'GET',
            headers: {
                'x-api-key': MEMBERSTACK_SECRET_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn(`Memberstack API error: ${response.status} ${response.statusText}`);
            return null;
        }
        
        const memberData = await response.json();
        console.log('👨‍🏫 Raw Memberstack data:', JSON.stringify(memberData, null, 2));
        
        // Extract teacher data from custom fields
        const firstName = memberData.customFields?.['First Name'] || 
                         memberData.customFields?.firstName || 
                         memberData.metaData?.firstName || 
                         memberData.metaData?.first_name || null;
                         
        const lastName = memberData.customFields?.['Last Name'] || 
                        memberData.customFields?.lastName || 
                        memberData.metaData?.lastName || 
                        memberData.metaData?.last_name || null;
                        
        const schoolName = memberData.customFields?.['place-name'] ||        // Primary field you mentioned
                          memberData.customFields?.['school-place-name'] || // Alternative field
                          memberData.customFields?.['school-name'] ||       // Another alternative
                          memberData.customFields?.school ||                // Simple field
                          memberData.metaData?.school || 
                          memberData.metaData?.schoolName || null;
        
        return {
            firstName,
            lastName,
            schoolName
        };
        
    } catch (error) {
        console.error('Error fetching teacher data from Memberstack:', error);
        return null;
    }
} 