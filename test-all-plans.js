/**
 * test-all-plans.js - Test Script for Memberstack Plan Role Detection
 * 
 * PURPOSE: Verify role detection works correctly for all defined Memberstack plans
 * USAGE: Run in browser console or as standalone script
 */

// Import configuration (if running in browser with config.js loaded)
const MEMBERSTACK_PLANS = window.LM_CONFIG?.MEMBERSTACK_PLANS || {
    PARENTS: {
        PARENTS_FREE: 'pln_parents-y1ea03qk'
    },
    EDUCATORS: {
        EDUCATORS_FREE: 'pln_free-plan-dhnb0ejd',
        EDUCATORS_FREE_PROMO: 'pln_educators-free-promo-ebfw0xzj',
        EDUCATORS_SCHOOL_BUNDLE: 'pln_educators-school-bundle-monthly-jqo20xap',
        EDUCATORS_SINGLE_CLASSROOM: 'pln_educators-single-classroom-monthly-lkhq021n'
    },
    THERAPISTS: {
        THERAPISTS_FREE: 'pln_therapists-free-t7k40ii1',
        THERAPISTS_FREE_PROMO: 'pln_therapists-free-promo-i2kz0huu',
        THERAPISTS_SINGLE_PRACTICE: 'pln_therapists-single-practice-juk60iii'
    }
};

const PLAN_HELPERS = window.LM_CONFIG?.PLAN_HELPERS || {
    isParentPlan: (planId) => Object.values(MEMBERSTACK_PLANS.PARENTS).includes(planId),
    isEducatorPlan: (planId) => Object.values(MEMBERSTACK_PLANS.EDUCATORS).includes(planId),
    isTherapistPlan: (planId) => Object.values(MEMBERSTACK_PLANS.THERAPISTS).includes(planId),
    isTeacherPlan: (planId) => PLAN_HELPERS.isEducatorPlan(planId) || PLAN_HELPERS.isTherapistPlan(planId)
};

/**
 * Test role detection for a given plan
 */
function testPlanRoleDetection(planId, expectedRole) {
    const isParent = PLAN_HELPERS.isParentPlan(planId);
    const isTherapist = PLAN_HELPERS.isTherapistPlan(planId);
    const isEducator = PLAN_HELPERS.isEducatorPlan(planId);
    
    let detectedRole;
    if (isParent) {
        detectedRole = 'parent';
    } else if (isTherapist) {
        detectedRole = 'therapist';
    } else if (isEducator) {
        detectedRole = 'teacher';
    } else {
        detectedRole = 'unknown';
    }
    
    const passed = detectedRole === expectedRole;
    
    return {
        planId,
        expectedRole,
        detectedRole,
        passed,
        status: passed ? '✅ PASS' : '❌ FAIL'
    };
}

/**
 * Run comprehensive tests for all plans
 */
function runAllPlanTests() {
    console.log('🧪 Testing Memberstack Plan Role Detection...\n');
    
    const testCases = [
        // Parent Plans
        { planId: MEMBERSTACK_PLANS.PARENTS.PARENTS_FREE, expectedRole: 'parent' },
        
        // Educator Plans
        { planId: MEMBERSTACK_PLANS.EDUCATORS.EDUCATORS_FREE, expectedRole: 'teacher' },
        { planId: MEMBERSTACK_PLANS.EDUCATORS.EDUCATORS_FREE_PROMO, expectedRole: 'teacher' },
        { planId: MEMBERSTACK_PLANS.EDUCATORS.EDUCATORS_SCHOOL_BUNDLE, expectedRole: 'teacher' },
        { planId: MEMBERSTACK_PLANS.EDUCATORS.EDUCATORS_SINGLE_CLASSROOM, expectedRole: 'teacher' },
        
        // Therapist Plans
        { planId: MEMBERSTACK_PLANS.THERAPISTS.THERAPISTS_FREE, expectedRole: 'therapist' },
        { planId: MEMBERSTACK_PLANS.THERAPISTS.THERAPISTS_FREE_PROMO, expectedRole: 'therapist' },
        { planId: MEMBERSTACK_PLANS.THERAPISTS.THERAPISTS_SINGLE_PRACTICE, expectedRole: 'therapist' },
        
        // Test unknown plan
        { planId: 'pln_unknown-plan-xyz', expectedRole: 'unknown' }
    ];
    
    const results = testCases.map(testCase => 
        testPlanRoleDetection(testCase.planId, testCase.expectedRole)
    );
    
    // Display results
    console.table(results);
    
    // Summary
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    console.log(`\n📊 Test Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All tests passed! Role detection is working correctly.');
    } else {
        console.error('❌ Some tests failed. Please check the configuration.');
    }
    
    return results;
}

/**
 * Test filename generation for different roles
 */
function testFilenameGeneration() {
    console.log('\n🎯 Testing Filename Generation...\n');
    
    const testData = {
        world: 'spookyland',
        lmid: '117',
        questionId: '1',
        timestamp: Date.now(),
        memberId: 'mem_sb_cmc5172o7000d0wsa0ng2hgkb'
    };
    
    // Teacher filename
    const teacherFilename = `kids-world_${testData.world}-lmid_${testData.lmid}-question_${testData.questionId}-tm_${testData.timestamp}.mp3`;
    
    // Parent filename
    const parentFilename = `parent_${testData.memberId}-world_${testData.world}-lmid_${testData.lmid}-question_${testData.questionId}-tm_${testData.timestamp}.mp3`;
    
    console.log('Teacher filename:', teacherFilename);
    console.log('Parent filename:', parentFilename);
    
    // Test regex patterns (from API validation)
    const teacherPattern = teacherFilename.includes(`kids-world_${testData.world}-lmid_${testData.lmid}-question_${testData.questionId}`);
    const parentPattern = parentFilename.match(new RegExp(`^parent_[^-]+-world_${testData.world}-lmid_${testData.lmid}-question_${testData.questionId}-tm_\\d+\\.mp3$`));
    
    console.log('\nValidation Results:');
    console.log('Teacher pattern match:', teacherPattern ? '✅ PASS' : '❌ FAIL');
    console.log('Parent pattern match:', parentPattern ? '✅ PASS' : '❌ FAIL');
    
    return {
        teacherFilename,
        parentFilename,
        teacherValid: teacherPattern,
        parentValid: !!parentPattern
    };
}

// Run tests if in browser environment
if (typeof window !== 'undefined') {
    window.testAllPlans = runAllPlanTests;
    window.testFilenames = testFilenameGeneration;
    
    // Auto-run if config is available
    if (window.LM_CONFIG) {
        console.log('🚀 Auto-running plan tests...');
        runAllPlanTests();
        testFilenameGeneration();
    } else {
        console.log('⚠️ LM_CONFIG not found. Load config.js first, then run: testAllPlans()');
    }
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MEMBERSTACK_PLANS,
        PLAN_HELPERS,
        runAllPlanTests,
        testFilenameGeneration
    };
} 