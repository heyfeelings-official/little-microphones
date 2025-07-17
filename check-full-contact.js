/**
 * check-full-contact.js - Check contact with full attributes
 */

import { getBrevoContact } from './utils/brevo-contact-manager.js';

const contact = await getBrevoContact('test.full@example.com');

if (!contact) {
  console.log('❌ Contact not found');
  process.exit(1);
}

console.log('📋 CONTACT WITH FULL ATTRIBUTES:');
console.log('Email:', contact.email);
console.log('ID:', contact.id);

console.log('\n🏷️ ALL ATTRIBUTES:');
const attributes = contact.attributes;
Object.keys(attributes).sort().forEach(key => {
  console.log(`   ${key}: ${attributes[key]}`);
});

// Count how many of our expected attributes are present
const expectedKeys = [
  'USER_CATEGORY', 'PLAN_TYPE', 'PLAN_NAME', 'PLAN_ID',
  'SCHOOL_NAME', 'SCHOOL_CITY', 'SCHOOL_COUNTRY', 'SCHOOL_ADDRESS',
  'EDUCATOR_ROLE', 'EDUCATOR_NO_KIDS', 'EDUCATOR_NO_CLASSES',
  'SCHOOL_PHONE', 'SCHOOL_WEBSITE', 'SCHOOL_LATITUDE', 'SCHOOL_LONGITUDE'
];

const presentKeys = expectedKeys.filter(key => attributes.hasOwnProperty(key));

console.log(`\n📊 ATTRIBUTE MAPPING SUCCESS: ${presentKeys.length}/${expectedKeys.length}`);

if (presentKeys.length === expectedKeys.length) {
  console.log('🎉 ALL EXPECTED ATTRIBUTES ARE PRESENT!');
} else {
  const missing = expectedKeys.filter(key => !attributes.hasOwnProperty(key));
  console.log('❌ Missing:', missing);
} 