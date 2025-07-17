// manual-sync-tool.js - Tool for manual user synchronization
import { getMemberDetails } from './utils/memberstack-utils.js';
import { syncMemberToBrevo, makeBrevoRequest } from './utils/brevo-contact-manager.js';

/**
 * Manual sync tool for when webhook doesn't trigger
 * Usage: node manual-sync-tool.js <member-email>
 */

async function manualSync() {
    const email = process.argv[2];
    
    if (!email) {
        console.log('❌ Usage: node manual-sync-tool.js <member-email>');
        console.log('📧 Example: node manual-sync-tool.js seb+e500@heyfeelings.com');
        process.exit(1);
    }
    
    console.log(`🔄 Manual sync for: ${email}`);
    
    try {
        // Find member by email in Brevo first to get Memberstack ID
        console.log('🔍 Looking up member in Brevo...');
        const brevoContact = await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`);
        
        if (!brevoContact || !brevoContact.attributes?.MEMBERSTACK_ID) {
            console.log('❌ Member not found in Brevo or missing Memberstack ID');
            return;
        }
        
        const memberId = brevoContact.attributes.MEMBERSTACK_ID;
        console.log(`👤 Found member ID: ${memberId}`);
        
        // Get latest data from Memberstack
        console.log('📡 Fetching latest data from Memberstack...');
        const memberData = await getMemberDetails(memberId, false);
        
        if (!memberData) {
            console.log('❌ Could not fetch member data from Memberstack');
            return;
        }
        
        console.log('✅ Member data fetched from Memberstack');
        console.log('📋 Custom fields:', Object.keys(memberData.customFields || {}).length);
        
        // Sync to Brevo
        console.log('🔄 Syncing to Brevo...');
        const brevoResult = await syncMemberToBrevo(memberData);
        
        if (brevoResult.success) {
            console.log('✅ Manual sync successful!');
            
            // Show updated data
            console.log('\n🔍 Updated data in Brevo:');
            const updatedContact = await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`);
            
            console.log('👤 Name:', updatedContact.attributes.FIRSTNAME, updatedContact.attributes.LASTNAME);
            console.log('🏫 School Search:', updatedContact.attributes.SCHOOL_SEARCH_INPUT || 'Not set');
            console.log('👨‍🏫 Role:', updatedContact.attributes.EDUCATOR_ROLE || 'Not set'); 
            console.log('👶 Kids:', updatedContact.attributes.EDUCATOR_NO_KIDS || 'Not set');
            console.log('🏫 School Name:', updatedContact.attributes.SCHOOL_NAME || 'Not set');
            console.log('📞 School Phone:', updatedContact.attributes.SCHOOL_PHONE || 'Not set');
            console.log('📅 Last Sync:', updatedContact.attributes.LAST_SYNC);
            
        } else {
            console.log('❌ Sync failed:', brevoResult.error);
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

manualSync(); 