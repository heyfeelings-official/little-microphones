/**
 * clear-brevo-contacts.js - Clear all contacts from Brevo
 */

import { makeBrevoRequest } from './utils/brevo-contact-manager.js';

console.log('🗑️ Clearing all contacts from Brevo...');

try {
  // Get all contacts first
  console.log('📋 Fetching all contacts...');
  const contactsResponse = await makeBrevoRequest('/contacts?limit=500');
  
  if (!contactsResponse.contacts || contactsResponse.contacts.length === 0) {
    console.log('✅ No contacts found in Brevo');
    process.exit(0);
  }
  
  const contacts = contactsResponse.contacts;
  console.log(`📊 Found ${contacts.length} contacts to delete`);
  
  let deletedCount = 0;
  let errorCount = 0;
  
  console.log('\n🗑️ Deleting contacts...');
  
  for (const contact of contacts) {
    try {
      await makeBrevoRequest(`/contacts/${encodeURIComponent(contact.email)}`, 'DELETE');
      console.log(`✅ Deleted: ${contact.email}`);
      deletedCount++;
    } catch (error) {
      console.error(`❌ Failed to delete ${contact.email}: ${error.message}`);
      errorCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 DELETION SUMMARY:`);
  console.log(`✅ Deleted: ${deletedCount}/${contacts.length}`);
  console.log(`❌ Errors: ${errorCount}/${contacts.length}`);
  
  if (deletedCount === contacts.length) {
    console.log('\n🎉 All contacts successfully deleted from Brevo!');
    console.log('💡 Ready to create new comprehensive user dataset');
  }
  
} catch (error) {
  console.error('❌ Error clearing contacts:', error.message);
  process.exit(1);
} 