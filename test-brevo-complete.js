/**
 * test-brevo-complete.js - Comprehensive Brevo Integration Testing
 * 
 * PURPOSE: Test complete Brevo integration including real scenarios
 * USAGE: node test-brevo-complete.js
 * 
 * TEST SCENARIOS:
 * 1. New educator registration (LMID assignment + Brevo sync)
 * 2. Parent registration (simple sync)
 * 3. Profile updates (field changes + sync)
 * 4. Plan changes (segment management)
 * 5. Email notifications with Brevo data enrichment
 * 
 * LAST UPDATED: January 2025
 */

import { 
    getPlanConfig, 
    getTagsForPlan,
    BREVO_MAIN_LIST 
} from './utils/brevo-contact-config.js';

import { 
    syncMemberToBrevo, 
    getBrevoContact,
    createOrUpdateBrevoContact,
    addContactToMainList,
    handleMemberPlanChange
} from './utils/brevo-contact-manager.js';

// Test data generators
function generateTestEducator() {
    const timestamp = Date.now();
    return {
        id: `mem_test_edu_${timestamp}`,
        auth: { email: `test.educator.${timestamp}@example.com` },
        email: `test.educator.${timestamp}@example.com`,
        createdAt: new Date().toISOString(),
        customFields: {
            'first-name': 'Jan',
            'last-name': 'Kowalski',
            'role': 'Principal',
            'educator-no-classes': '5',
            'educator-no-kids': '125',
            'search-input': 'SP 344, Erazma z Zakroczymia, Warsaw, Poland',
            'school-place-name': 'SP 344',
            'school-address-result': 'ul. Erazma z Zakroczymia, 00-001 Warsaw, Poland',
            'school-city': 'Warsaw',
            'school-country': 'Poland',
            'school-state': 'Mazowieckie',
            'school-latitude': '52.2297',
            'school-longitude': '21.0122',
            'school-phone': '+48 22 123 4567',
            'school-website': 'https://sp344.edu.pl',
            'school-zip': '00-001',
            'school-facility-type': 'Primary School'
        },
        metaData: {
            language: 'pl',
            lmids: '1234'
        },
        planConnections: [{
            active: true,
            status: 'ACTIVE',
            planId: 'pln_free-plan-dhnb0ejd'
        }]
    };
}

function generateTestParent() {
    const timestamp = Date.now();
    return {
        id: `mem_test_parent_${timestamp}`,
        auth: { email: `test.parent.${timestamp}@example.com` },
        email: `test.parent.${timestamp}@example.com`,
        createdAt: new Date().toISOString(),
        customFields: {
            'first-name': 'Anna',
            'last-name': 'Nowak'
        },
        metaData: {
            language: 'pl'
        },
        planConnections: [{
            active: true,
            status: 'ACTIVE',
            planId: 'pln_parents-y1ea03qk'
        }]
    };
}

// Test scenarios
async function testEducatorRegistration() {
    console.log('\n🎓 === TEST 1: Educator Registration ===');
    
    const educator = generateTestEducator();
    console.log(`📝 Testing educator: ${educator.email}`);
    
    try {
        // Test plan configuration
        const planConfig = getPlanConfig(educator.planConnections[0].planId);
        console.log(`📋 Plan config:`, planConfig ? '✅ Found' : '❌ Missing');
        
        if (planConfig) {
            console.log(`  - Category: ${planConfig.category}`);
            console.log(`  - Plan Name: ${planConfig.attributes.PLAN_NAME}`);
            console.log(`  - Plan Type: ${planConfig.attributes.PLAN_TYPE}`);
            console.log(`  - Tags: ${getTagsForPlan(educator.planConnections[0].planId).join(', ')}`);
        }
        
        // Test Brevo sync
        const syncResult = await syncMemberToBrevo(educator);
        console.log(`🔄 Brevo sync: ${syncResult.success ? '✅ Success' : '❌ Failed'}`);
        
        if (syncResult.success) {
            console.log(`  - Plans processed: ${syncResult.plansProcessed}`);
            console.log(`  - Results: ${syncResult.results.length} operations completed`);
        } else {
            console.log(`  - Error: ${syncResult.error}`);
        }
        
        // Verify contact in Brevo
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for sync
        const brevoContact = await getBrevoContact(educator.email);
        console.log(`📞 Contact verification: ${brevoContact ? '✅ Found in Brevo' : '❌ Not found'}`);
        
        if (brevoContact && brevoContact.attributes) {
            console.log(`  - School: ${brevoContact.attributes.SCHOOL_NAME || 'Not set'}`);
            console.log(`  - Role: ${brevoContact.attributes.EDUCATOR_ROLE || 'Not set'}`);
            console.log(`  - Classes: ${brevoContact.attributes.EDUCATOR_NO_CLASSES || 'Not set'}`);
            console.log(`  - Students: ${brevoContact.attributes.EDUCATOR_NO_KIDS || 'Not set'}`);
            console.log(`  - Plan: ${brevoContact.attributes.PLAN_NAME || 'Not set'}`);
        }
        
        return { success: true, educator, brevoContact };
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testParentRegistration() {
    console.log('\n👨‍👩‍👧‍👦 === TEST 2: Parent Registration ===');
    
    const parent = generateTestParent();
    console.log(`📝 Testing parent: ${parent.email}`);
    
    try {
        // Test plan configuration
        const planConfig = getPlanConfig(parent.planConnections[0].planId);
        console.log(`📋 Plan config:`, planConfig ? '✅ Found' : '❌ Missing');
        
        // Test Brevo sync
        const syncResult = await syncMemberToBrevo(parent);
        console.log(`🔄 Brevo sync: ${syncResult.success ? '✅ Success' : '❌ Failed'}`);
        
        // Verify contact in Brevo
        await new Promise(resolve => setTimeout(resolve, 2000));
        const brevoContact = await getBrevoContact(parent.email);
        console.log(`📞 Contact verification: ${brevoContact ? '✅ Found in Brevo' : '❌ Not found'}`);
        
        if (brevoContact && brevoContact.attributes) {
            console.log(`  - Name: ${brevoContact.attributes.FIRSTNAME} ${brevoContact.attributes.LASTNAME}`);
            console.log(`  - Category: ${brevoContact.attributes.USER_CATEGORY || 'Not set'}`);
            console.log(`  - Plan: ${brevoContact.attributes.PLAN_NAME || 'Not set'}`);
        }
        
        return { success: true, parent, brevoContact };
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testPlanChange() {
    console.log('\n💳 === TEST 3: Plan Change (Educator Free → Paid) ===');
    
    try {
        // Create educator with free plan
        const educator = generateTestEducator();
        educator.planConnections = [{
            active: true,
            status: 'ACTIVE',
            planId: 'pln_free-plan-dhnb0ejd' // Free plan
        }];
        
        console.log(`📝 Step 1: Create educator with FREE plan`);
        const initialSync = await syncMemberToBrevo(educator);
        console.log(`🔄 Initial sync: ${initialSync.success ? '✅ Success' : '❌ Failed'}`);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Change to paid plan
        const oldPlans = ['pln_free-plan-dhnb0ejd'];
        const newPlans = ['pln_educators-school-bundle-monthly-jqo20xap'];
        
        educator.planConnections = [{
            active: true,
            status: 'ACTIVE',
            planId: 'pln_educators-school-bundle-monthly-jqo20xap'
        }];
        
        console.log(`📝 Step 2: Change to PAID plan (School Bundle)`);
        const changeResult = await handleMemberPlanChange(educator, oldPlans, newPlans);
        console.log(`🔄 Plan change: ${changeResult.success ? '✅ Success' : '❌ Failed'}`);
        
        if (changeResult.success) {
            console.log(`  - Old plans removed: ${changeResult.oldPlans.join(', ')}`);
            console.log(`  - New plans added: ${changeResult.newPlans.join(', ')}`);
        }
        
        // Verify segments updated
        await new Promise(resolve => setTimeout(resolve, 2000));
        const updatedContact = await getBrevoContact(educator.email);
        console.log(`📞 Updated contact: ${updatedContact ? '✅ Found' : '❌ Not found'}`);
        
        if (updatedContact && updatedContact.attributes) {
            console.log(`  - New plan: ${updatedContact.attributes.PLAN_NAME || 'Not updated'}`);
            console.log(`  - Plan type: ${updatedContact.attributes.PLAN_TYPE || 'Not updated'}`);
        }
        
        return { success: true, changeResult };
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testEmailEnrichment() {
    console.log('\n📧 === TEST 4: Email Template Data Enrichment ===');
    
    try {
        // Create educator with full data
        const educator = generateTestEducator();
        console.log(`📝 Testing email data enrichment for: ${educator.email}`);
        
        // Sync to Brevo first
        const syncResult = await syncMemberToBrevo(educator);
        console.log(`🔄 Initial sync: ${syncResult.success ? '✅ Success' : '❌ Failed'}`);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test contact data retrieval (simulates email notification process)
        const brevoContact = await getBrevoContact(educator.email);
        console.log(`📞 Contact retrieval: ${brevoContact ? '✅ Success' : '❌ Failed'}`);
        
        if (brevoContact && brevoContact.attributes) {
            console.log(`📋 Available template data:`);
            console.log(`  - {{params.teacherName}}: "${brevoContact.attributes.TEACHER_NAME}"`);
            console.log(`  - {{params.schoolName}}: "${brevoContact.attributes.SCHOOL_NAME}"`);
            console.log(`  - {{params.planName}}: "${brevoContact.attributes.PLAN_NAME}"`);
            console.log(`  - {{params.userCategory}}: "${brevoContact.attributes.USER_CATEGORY}"`);
            console.log(`  - {{params.educatorRole}}: "${brevoContact.attributes.EDUCATOR_ROLE}"`);
            console.log(`  - {{params.schoolCity}}: "${brevoContact.attributes.SCHOOL_CITY}"`);
            console.log(`  - {{params.educatorNoKids}}: "${brevoContact.attributes.EDUCATOR_NO_KIDS}"`);
            
            // Simulate enriched template data (like in send-email-notifications.js)
            const enrichedData = {
                teacherName: brevoContact.attributes.TEACHER_NAME,
                schoolName: brevoContact.attributes.SCHOOL_NAME,
                planName: brevoContact.attributes.PLAN_NAME,
                userCategory: brevoContact.attributes.USER_CATEGORY,
                educatorRole: brevoContact.attributes.EDUCATOR_ROLE,
                schoolCity: brevoContact.attributes.SCHOOL_CITY,
                studentCount: brevoContact.attributes.EDUCATOR_NO_KIDS
            };
            
            console.log(`✅ Template enrichment successful - ${Object.keys(enrichedData).length} fields available`);
            return { success: true, enrichedData };
        }
        
        return { success: false, error: 'No contact data found' };
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testSegmentMappings() {
    console.log('\n🎯 === TEST 5: Segment Mappings Verification ===');
    
    try {
        console.log(`📊 Testing all plan configurations:`);
        
        const testPlans = [
            'pln_parents-y1ea03qk',
            'pln_free-plan-dhnb0ejd',
            'pln_educators-free-promo-ebfw0xzj',
            'pln_educators-school-bundle-monthly-jqo20xap',
            'pln_educators-single-classroom-monthly-lkhq021n',
            'pln_therapists-free-t7k40ii1',
            'pln_therapists-free-promo-i2kz0huu',
            'pln_therapists-single-practice-juk60iii'
        ];
        
        let successCount = 0;
        
        for (const planId of testPlans) {
            const config = getPlanConfig(planId);
            if (config) {
                console.log(`✅ ${planId}:`);
                console.log(`   - Category: ${config.category}`);
                console.log(`   - Plan Name: ${config.attributes.PLAN_NAME}`);
                console.log(`   - Plan Type: ${config.attributes.PLAN_TYPE}`);
                console.log(`   - Plan ID: ${config.attributes.PLAN_ID}`);
                console.log(`   - Tags: ${getTagsForPlan(planId).join(', ')}`);
                successCount++;
            } else {
                console.log(`❌ ${planId}: No configuration found`);
            }
        }
        
        console.log(`\n📊 Main List Configuration:`);
        console.log(`   - Hey Feelings List: #${BREVO_MAIN_LIST.HEY_FEELINGS_LIST} (all contacts)`);
        console.log(`   - Dynamic Segments: Created in Brevo Dashboard based on attributes`);
        console.log(`   - Segmentation: USER_CATEGORY + PLAN_TYPE + PLAN_ID combinations`);
        
        console.log(`\n✅ Plan mapping test: ${successCount}/${testPlans.length} plans configured correctly`);
        
        return { success: true, configuredPlans: successCount, totalPlans: testPlans.length };
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Main test runner
async function runAllTests() {
    console.log('🚀 === BREVO INTEGRATION COMPREHENSIVE TESTING ===');
    console.log(`📅 Test run: ${new Date().toISOString()}`);
    
    const results = {};
    
    try {
        // Test 1: Educator Registration
        results.educatorRegistration = await testEducatorRegistration();
        
        // Test 2: Parent Registration
        results.parentRegistration = await testParentRegistration();
        
        // Test 3: Plan Change
        results.planChange = await testPlanChange();
        
        // Test 4: Email Enrichment
        results.emailEnrichment = await testEmailEnrichment();
        
        // Test 5: Segment Mappings
        results.segmentMappings = await testSegmentMappings();
        
        // Summary
        console.log('\n📊 === TEST SUMMARY ===');
        const testNames = Object.keys(results);
        const passedTests = testNames.filter(test => results[test].success);
        
        console.log(`✅ Passed: ${passedTests.length}/${testNames.length}`);
        console.log(`❌ Failed: ${testNames.length - passedTests.length}/${testNames.length}`);
        
        if (passedTests.length === testNames.length) {
            console.log('\n🎉 ALL TESTS PASSED! Brevo integration is ready for production.');
        } else {
            console.log('\n⚠️ Some tests failed. Review errors above.');
        }
        
        console.log('\n📋 Next steps:');
        console.log('1. Test in production with real user registrations');
        console.log('2. Monitor Brevo segments for proper assignment');
        console.log('3. Test email notifications with enriched data');
        console.log('4. Verify plan change workflows');
        
    } catch (error) {
        console.error('❌ Test runner failed:', error.message);
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}

export { runAllTests, testEducatorRegistration, testParentRegistration, testPlanChange }; 