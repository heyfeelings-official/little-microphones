/**
 * api/test-lmid-139.js - Quick test for LMID 139 debugging
 * 
 * PURPOSE: Debug why LMID 139 is not found in email notifications
 * USAGE: GET /api/test-lmid-139
 */

import { getSupabaseClient } from '../utils/lmid-utils.js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const supabase = getSupabaseClient();
        const lmid = 139;
        
        console.log(`🔍 Testing LMID ${lmid} in database...`);
        
        // Check if LMID exists with any status
        const { data: allStatuses, error: allError } = await supabase
            .from('lmids')
            .select('lmid, status, assigned_to_member_email, teacher_first_name, teacher_last_name')
            .eq('lmid', lmid);
            
        if (allError) {
            console.error('❌ Database error:', allError);
            return res.status(500).json({ 
                error: 'Database error',
                details: allError.message 
            });
        }
        
        console.log(`📊 All records for LMID ${lmid}:`, allStatuses);
        
        // Check specifically for 'used' status
        const { data: usedData, error: usedError } = await supabase
            .from('lmids')
            .select('*')
            .eq('lmid', lmid)
            .eq('status', 'used')
            .single();
            
        if (usedError) {
            console.log(`⚠️ LMID ${lmid} with status 'used' not found:`, usedError.message);
        } else {
            console.log(`✅ LMID ${lmid} found with status 'used':`, usedData);
        }
        
        // Test the actual function used in email notifications
        const { data: emailData, error: emailError } = await supabase
            .from('lmids')
            .select(`
                lmid,
                assigned_to_member_email,
                teacher_first_name,
                teacher_last_name,
                teacher_school_name,
                associated_parent_member_ids,
                associated_parent_emails,
                share_id_spookyland,
                share_id_waterpark,
                share_id_shopping_spree,
                share_id_amusement_park,
                share_id_big_city,
                share_id_neighborhood
            `)
            .eq('lmid', lmid)
            .eq('status', 'used')
            .single();
            
        return res.status(200).json({
            success: true,
            lmid: lmid,
            allRecords: allStatuses,
            usedRecord: usedData || null,
            emailQueryResult: emailData || null,
            errors: {
                allError: allError?.message || null,
                usedError: usedError?.message || null,
                emailError: emailError?.message || null
            }
        });
        
    } catch (error) {
        console.error('❌ Test error:', error);
        return res.status(500).json({ 
            error: 'Test failed',
            details: error.message 
        });
    }
} 