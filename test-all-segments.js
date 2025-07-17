/**
 * test-all-segments.js - Complete Brevo Segments Testing
 * 
 * PURPOSE: Test all user segments with realistic data
 * CREATES: Multiple users for each category with full attributes
 * 
 * SEGMENTS TESTED:
 * - Parents (3 users)
 * - Educators (6 users - different roles and schools)
 * - Therapists (4 users - different practices)
 * 
 * TOTAL: 13 realistic test users
 */

const WEBHOOK_ENDPOINT = 'https://little-microphones.vercel.app/api/memberstack-webhook';

// Helper function to generate unique timestamp-based IDs
function generateId(prefix = 'mem') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

// ===== PARENTS TEST DATA =====
const PARENTS_DATA = [
  {
    name: 'Katarzyna Nowak',
    email: 'katarzyna.nowak.parent@gmail.com',
    plan: 'pln_parents-y1ea03qk',
    city: 'Warsaw',
    country: 'Poland',
    phone: '+48 501 234 567',
    language: 'pl',
    children_ages: '6, 8',
    profession: 'Marketing Manager'
  },
  {
    name: 'James Wilson',
    email: 'james.wilson.parent@outlook.com',
    plan: 'pln_parents-y1ea03qk',
    city: 'London',
    country: 'United Kingdom',
    phone: '+44 7700 900123',
    language: 'en',
    children_ages: '5, 7, 9',
    profession: 'Software Engineer'
  },
  {
    name: 'Emma Schmidt',
    email: 'emma.schmidt.parent@yahoo.de',
    plan: 'pln_parents-y1ea03qk',
    city: 'Berlin',
    country: 'Germany',
    phone: '+49 170 1234567',
    language: 'en',
    children_ages: '4, 11',
    profession: 'Architect'
  }
];

// ===== EDUCATORS TEST DATA =====
const EDUCATORS_DATA = [
  {
    name: 'Anna Kowalczyk',
    email: 'anna.kowalczyk@sp15.edu.pl',
    plan: 'pln_free-plan-dhnb0ejd',
    role: 'Teacher',
    school: 'Primary School No. 15',
    city: 'Krakow',
    country: 'Poland',
    phone: '+48 600 111 222',
    language: 'pl',
    no_classes: 3,
    no_kids: 75,
    school_address: 'ul. Szkolna 15, 30-001 Kraków',
    school_type: 'Primary School',
    school_phone: '+48 12 123 45 67',
    school_website: 'https://sp15.krakow.pl',
    school_latitude: '50.0647',
    school_longitude: '19.9450',
    school_rating: '4.2',
    school_state: 'Lesser Poland',
    school_street_address: 'ul. Szkolna 15',
    school_zip: '30-001',
    school_place_id: 'ChIJBd1abcd4FkcR9jN3X1J2',
    school_place_name: 'SP 15 Krakow'
  },
  {
    name: 'Robert Johnson',
    email: 'r.johnson@stmarys.edu.uk',
    plan: 'pln_educators-school-bundle-monthly-jqo20xap',
    role: 'Principal',
    school: "St. Mary's Primary School",
    city: 'Manchester',
    country: 'United Kingdom',
    phone: '+44 161 234 5678',
    language: 'en',
    no_classes: 12,
    no_kids: 320,
    school_address: '45 Church Lane, Manchester M1 2AB',
    school_type: 'Primary School',
    school_phone: '+44 161 555 0123',
    school_website: 'https://stmarys.manchester.sch.uk',
    school_latitude: '53.4808',
    school_longitude: '-2.2426',
    school_rating: '4.7',
    school_state: 'Greater Manchester',
    school_street_address: '45 Church Lane',
    school_zip: 'M1 2AB',
    school_place_id: 'ChIJB9wQ_N9efdsRt1J3X8v2',
    school_place_name: "St Mary's School"
  },
  {
    name: 'Maria Rossi',
    email: 'maria.rossi@scuolaroma.it',
    plan: 'pln_educators-single-classroom-monthly-lkhq021n',
    role: 'Teacher',
    school: 'Scuola Elementare Roma Centro',
    city: 'Rome',
    country: 'Italy',
    phone: '+39 06 1234 5678',
    language: 'en',
    no_classes: 2,
    no_kids: 48,
    school_address: 'Via dei Bambini 12, 00100 Roma',
    school_type: 'Elementary School'
  },
  {
    name: 'Thomas Müller',
    email: 'thomas.mueller@grundschule.berlin.de',
    plan: 'pln_educators-free-promo-ebfw0xzj',
    role: 'Vice Principal',
    school: 'Grundschule Mitte Berlin',
    city: 'Berlin',
    country: 'Germany',
    phone: '+49 30 12345678',
    language: 'en',
    no_classes: 8,
    no_kids: 180,
    school_address: 'Schulstraße 23, 10115 Berlin',
    school_type: 'Primary School'
  },
  {
    name: 'Sarah O\'Connor',
    email: 'sarah.oconnor@dublin.school.ie',
    plan: 'pln_free-plan-dhnb0ejd',
    role: 'Teacher',
    school: 'Dublin Central Primary',
    city: 'Dublin',
    country: 'Ireland',
    phone: '+353 1 234 5678',
    language: 'en',
    no_classes: 1,
    no_kids: 28,
    school_address: '15 O\'Connell Street, Dublin 1',
    school_type: 'National School'
  },
  {
    name: 'Pierre Dubois',
    email: 'pierre.dubois@ecole-paris.fr',
    plan: 'pln_educators-school-bundle-monthly-jqo20xap',
    role: 'Director',
    school: 'École Primaire Saint-Antoine',
    city: 'Paris',
    country: 'France',
    phone: '+33 1 42 34 56 78',
    language: 'en',
    no_classes: 15,
    no_kids: 420,
    school_address: '8 Rue des Écoles, 75005 Paris',
    school_type: 'École Primaire'
  }
];

// ===== THERAPISTS TEST DATA =====
const THERAPISTS_DATA = [
  {
    name: 'Dr. Magdalena Wiśniewska',
    email: 'dr.wisniewska@terapia-dzieci.pl',
    plan: 'pln_therapists-single-practice-juk60iii',
    specialty: 'Child Psychology',
    practice: 'Centrum Terapii Dziecięcej',
    city: 'Warsaw',
    country: 'Poland',
    phone: '+48 22 123 45 67',
    language: 'pl',
    experience_years: 12,
    practice_address: 'ul. Mokotowska 45/12, 00-551 Warszawa'
  },
  {
    name: 'Dr. Michael Thompson',
    email: 'mike.thompson@childtherapy.uk',
    plan: 'pln_therapists-free-t7k40ii1',
    specialty: 'Speech Therapy',
    practice: 'Thompson Speech Clinic',
    city: 'Edinburgh',
    country: 'United Kingdom',
    phone: '+44 131 456 7890',
    language: 'en',
    experience_years: 8,
    practice_address: '25 Royal Mile, Edinburgh EH1 2PB'
  },
  {
    name: 'Dr. Lisa Weber',
    email: 'lisa.weber@kindertherapie.de',
    plan: 'pln_therapists-free-promo-i2kz0huu',
    specialty: 'Behavioral Therapy',
    practice: 'Kindertherapiezentrum München',
    city: 'Munich',
    country: 'Germany',
    phone: '+49 89 987 65 43',
    language: 'en',
    experience_years: 15,
    practice_address: 'Maximilianstraße 12, 80539 München'
  },
  {
    name: 'Dr. Sophie Laurent',
    email: 'sophie.laurent@therapie-enfants.fr',
    plan: 'pln_therapists-single-practice-juk60iii',
    specialty: 'Occupational Therapy',
    practice: 'Cabinet de Thérapie Enfantine',
    city: 'Lyon',
    country: 'France',
    phone: '+33 4 78 90 12 34',
    language: 'en',
    experience_years: 10,
    practice_address: '34 Rue de la République, 69002 Lyon'
  }
];

/**
 * Create realistic memberstack webhook payload
 */
function createMemberWebhook(userData, category) {
  const memberId = generateId('mem');
  const timestamp = new Date().toISOString();
  
  let customFields = {
    'first-name': userData.name.split(' ')[0],
    'last-name': userData.name.split(' ').slice(1).join(' '),
    'phone': userData.phone
  };

  // Add category-specific fields
  if (category === 'educators') {
    customFields = {
      ...customFields,
      'role': userData.role,
      'school-place-name': userData.school,
      'school-city': userData.city,
      'school-country': userData.country,
      'school-address-result': userData.school_address,
      'school-facility-type': userData.school_type,
      'educator-no-classes': userData.no_classes?.toString(),
      'educator-no-kids': userData.no_kids?.toString(),
      'search-input': userData.school,
      // Extended school data
      'school-phone': userData.school_phone || '',
      'school-website': userData.school_website || '',
      'school-latitude': userData.school_latitude || '',
      'school-longitude': userData.school_longitude || '',
      'school-rating': userData.school_rating || '',
      'school-state': userData.school_state || '',
      'school-street-address': userData.school_street_address || '',
      'school-zip': userData.school_zip || '',
      'school-place-id': userData.school_place_id || '',
      'school-place-name-short': userData.school_place_name || ''
    };
  } else if (category === 'therapists') {
    customFields = {
      ...customFields,
      'specialty': userData.specialty,
      'practice-name': userData.practice,
      'practice-city': userData.city,
      'practice-country': userData.country,
      'practice-address': userData.practice_address,
      'experience-years': userData.experience_years?.toString()
    };
  } else if (category === 'parents') {
    customFields = {
      ...customFields,
      'city': userData.city,
      'country': userData.country,
      'profession': userData.profession,
      'children-ages': userData.children_ages
    };
  }

  return {
    type: 'member.created',
    data: {
      member: {
        id: memberId,
        auth: {
          email: userData.email
        },
        planConnections: [{
          id: `conn_${Date.now()}`,
          planId: userData.plan,
          active: true,
          status: 'ACTIVE'
        }],
        customFields: customFields,
        metaData: {
          language: userData.language,
          registrationDate: timestamp
        },
        createdAt: timestamp,
        updatedAt: timestamp
      }
    }
  };
}

/**
 * Send webhook to test endpoint
 */
async function sendTestWebhook(webhookData, testId) {
  const email = webhookData.data.member.auth.email;
  
  try {
    console.log(`📤 [${testId}] Sending: ${email}`);
    
    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Brevo-Segments-Test/1.0'
      },
      body: JSON.stringify({ 
        type: 'member.created',
        data: { member: webhookData.data.member }
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      const brevoStatus = result.data.brevoResult?.success ? '✅ SUCCESS' : '❌ FAILED';
      const lmidStatus = result.data.lmidResult ? `LMID: ${result.data.lmidResult.assignedLmid}` : 'No LMID';
      
      console.log(`✅ [${testId}] ${email} → Brevo: ${brevoStatus}, ${lmidStatus}`);
      return { success: true, result };
    } else {
      console.log(`❌ [${testId}] ${email} → Failed: ${result.error || 'Unknown error'}`);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.log(`❌ [${testId}] ${email} → Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test a category of users
 */
async function testCategory(categoryData, categoryName) {
  console.log(`\n📝 === TESTING ${categoryName.toUpperCase()} (${categoryData.length} users) ===`);
  
  const results = [];
  
  for (let i = 0; i < categoryData.length; i++) {
    const userData = categoryData[i];
    const testId = `${categoryName.substring(0,3)}${i+1}`;
    
    console.log(`\n🔄 [${testId}] ${userData.name} (${userData.city}, ${userData.country})`);
    
    const webhookData = createMemberWebhook(userData, categoryName);
    const result = await sendTestWebhook(webhookData, testId);
    
    results.push({
      name: userData.name,
      email: userData.email,
      plan: userData.plan,
      ...result
    });
    
    // Small delay between requests
    if (i < categoryData.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  return results;
}

/**
 * Main test function
 */
async function runAllSegmentsTest() {
  console.log('🚀 === BREVO ALL SEGMENTS TESTING ===');
  console.log(`📅 Test run: ${new Date().toISOString()}`);
  console.log(`🔗 Testing endpoint: ${WEBHOOK_ENDPOINT}`);
  console.log(`👥 Total users to create: ${PARENTS_DATA.length + EDUCATORS_DATA.length + THERAPISTS_DATA.length}`);
  
  const allResults = {};
  
  try {
    // Test Parents
    allResults.parents = await testCategory(PARENTS_DATA, 'parents');
    
    // Test Educators  
    allResults.educators = await testCategory(EDUCATORS_DATA, 'educators');
    
    // Test Therapists
    allResults.therapists = await testCategory(THERAPISTS_DATA, 'therapists');
    
    // Summary
    console.log('\n📊 === FINAL SUMMARY ===');
    
    Object.entries(allResults).forEach(([category, results]) => {
      const successful = results.filter(r => r.success).length;
      const total = results.length;
      console.log(`${category.toUpperCase()}: ${successful}/${total} successful`);
    });
    
    const totalSuccessful = Object.values(allResults).flat().filter(r => r.success).length;
    const totalUsers = Object.values(allResults).flat().length;
    
    console.log(`\n🎯 OVERALL: ${totalSuccessful}/${totalUsers} users created successfully`);
    
    if (totalSuccessful === totalUsers) {
      console.log('🎉 ALL SEGMENTS TESTED SUCCESSFULLY!');
      console.log('\n📋 Next steps:');
      console.log('1. Check Brevo Dashboard → Contacts → Hey Feelings List #2');
      console.log('2. Create dynamic segments using attributes:');
      console.log('   - Parents: USER_CATEGORY equals "parents"');
      console.log('   - Educators by city: USER_CATEGORY equals "educators" AND SCHOOL_CITY equals "Warsaw"');
      console.log('   - Large schools: EDUCATOR_NO_KIDS greater than 100');
      console.log('   - Paid plans: PLAN_TYPE equals "paid"');
      console.log('   - Therapists by specialty: USER_CATEGORY equals "therapists" AND specialty contains "Psychology"');
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run the test
runAllSegmentsTest().catch(console.error); 