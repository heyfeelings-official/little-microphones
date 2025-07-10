/**
 * Tymczasowe API do naprawy metadanych rodzica
 */

import { updateMemberstackMetadata, getSupabaseClient } from '../utils/lmid-utils.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const parentMemberId = 'mem_sb_cmcx4qdlb00nb0wp87vad69wt';
        const parentEmail = 'seb+209@heyfeelings.com';
        
        // Najpierw usuń LMID 107 z bazy całkowicie
        const supabase = getSupabaseClient();
        const { error: deleteError } = await supabase
            .from('lmids')
            .delete()
            .eq('lmid', 107);
            
        if (deleteError) {
            console.error('Failed to delete LMID 107:', deleteError);
        } else {
            console.log('✅ LMID 107 deleted from database');
        }
        
        // Zaktualizuj metadane rodzica - usuń LMID 107
        const newLmidString = '98,99,100,101'; // Bez 107
        const success = await updateMemberstackMetadata(parentMemberId, newLmidString, true);
        
        return res.json({
            success,
            parentMemberId,
            parentEmail,
            oldLmids: '98,99,100,101,107',
            newLmids: newLmidString,
            message: success ? 'Parent metadata fixed' : 'Failed to update parent metadata'
        });
        
    } catch (error) {
        console.error('Fix error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
} 