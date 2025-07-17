/**
 * check-all-brevo-attributes.js - Check all attributes after manual addition
 */

import { makeBrevoRequest } from './utils/brevo-contact-manager.js';

console.log('🔍 Checking all attributes in Brevo after manual addition...');

try {
  const response = await makeBrevoRequest('/contacts/attributes');
  const existingAttributes = response.attributes || [];
  
  console.log(`📋 Total attributes in Brevo: ${existingAttributes.length}`);
  
  // All attributes we expect
  const expectedAttributes = [
    'FIRSTNAME', 'LASTNAME', 'PHONE',
    'MEMBERSTACK_ID', 'REGISTRATION_DATE', 'LAST_SYNC', 'LANGUAGE_PREF',
    'USER_CATEGORY', 'PLAN_TYPE', 'PLAN_NAME', 'PLAN_ID',
    'TEACHER_NAME', 'SCHOOL_NAME', 'LMIDS',
    'SCHOOL_SEARCH_INPUT', 'SCHOOL_ADDRESS', 'SCHOOL_CITY', 'SCHOOL_COUNTRY',
    'SCHOOL_FACILITY_TYPE', 'SCHOOL_LATITUDE', 'SCHOOL_LONGITUDE',
    'SCHOOL_PHONE', 'SCHOOL_PLACE_ID', 'SCHOOL_PLACE_NAME',
    'SCHOOL_RATING', 'SCHOOL_STATE', 'SCHOOL_STREET_ADDRESS',
    'SCHOOL_WEBSITE', 'SCHOOL_ZIP',
    'EDUCATOR_ROLE', 'EDUCATOR_NO_CLASSES', 'EDUCATOR_NO_KIDS'
  ];
  
  const existingNames = existingAttributes.map(attr => attr.name);
  const missing = expectedAttributes.filter(name => !existingNames.includes(name));
  const present = expectedAttributes.filter(name => existingNames.includes(name));
  
  console.log(`\n✅ PRESENT: ${present.length}/${expectedAttributes.length}`);
  console.log(`❌ MISSING: ${missing.length}/${expectedAttributes.length}`);
  
  if (missing.length > 0) {
    console.log('\n❌ Still missing:');
    missing.forEach(name => console.log(`   - ${name}`));
  } else {
    console.log('\n🎉 ALL EXPECTED ATTRIBUTES ARE NOW IN BREVO!');
  }
  
  // Check LATITUDE/LONGITUDE types
  const latAttr = existingAttributes.find(attr => attr.name === 'SCHOOL_LATITUDE');
  const lonAttr = existingAttributes.find(attr => attr.name === 'SCHOOL_LONGITUDE');
  
  if (latAttr && lonAttr) {
    console.log(`\n📍 GPS Coordinates:`);
    console.log(`   SCHOOL_LATITUDE: ${latAttr.type}`);
    console.log(`   SCHOOL_LONGITUDE: ${lonAttr.type}`);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} 