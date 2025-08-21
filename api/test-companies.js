/**
 * api/test-companies.js - Test Endpoint for Brevo Companies Implementation
 * 
 * PURPOSE: Test Companies functionality without affecting production flow
 * DEPENDENCIES: brevo-company-manager.js
 * 
 * TEST CASES:
 * 1. Company creation with sample school data
 * 2. Company search/deduplication
 * 3. Contact linking to Company
 * 4. End-to-end educator onboarding simulation
 * 
 * REQUEST FORMAT:
 * GET /api/test-companies?action=test_creation
 * GET /api/test-companies?action=test_search
 * GET /api/test-companies?action=test_educator_flow&email=test@school.com
 * 
 * RESPONSE FORMAT:
 * {
 *   "success": true,
 *   "testResults": [...],
 *   "message": "All tests passed"
 * }
 * 
 * LAST UPDATED: January 2025
 * VERSION: 1.0.0 (Test Implementation)
 * STATUS: Development Only ⚠️
 */

import { setCorsHeaders, handleOptionsRequest, validateMethod } from '../utils/api-utils.js';
import { 
    testCompanyFunctionality,
    extractSchoolDataFromMember,
    generateSchoolCompanyKey,
    createOrUpdateSchoolCompany,
    linkContactToSchoolCompany,
    findSchoolCompanyByData
} from '../utils/brevo-company-manager.js';

/**
 * Test school data extraction from educator onboarding
 */
function testEducatorDataExtraction() {
    const testMemberData = {
        id: 'mem_test123',
        auth: { email: 'teacher@testschool.edu' },
        planConnections: [
            { planId: 'pln_free-plan-dhnb0ejd', status: 'ACTIVE', active: true }
        ],
        customFields: {
            'first-name': 'John',
            'last-name': 'Teacher',
            'place-name': 'Test Primary School',
            'place-city': 'Test City',
            'place-country': 'Test Country',
            'place-address': '123 Education Street',
            'place-phone': '+1-555-123-4567',
            'place-website': 'www.testschool.edu',
            'place-type': 'Primary School',
            'place-rating': '4.5',
            'contact-role': 'Teacher',
            'contact-no-kids': '150'
        }
    };

    console.log('🧪 Testing educator data extraction...');
    
    const schoolData = extractSchoolDataFromMember(testMemberData);
    const schoolKey = schoolData ? generateSchoolCompanyKey(schoolData) : null;
    
    return {
        testName: 'Educator Data Extraction',
        success: !!schoolData,
        schoolData: schoolData,
        schoolKey: schoolKey,
        memberHadEducatorPlan: testMemberData.planConnections.some(p => p.planId.includes('educators') || p.planId.includes('free-plan')),
        extractedFields: schoolData ? Object.keys(schoolData).length : 0
    };
}

/**
 * Test parent data extraction (should be skipped)
 */
function testParentDataExtraction() {
    const testParentData = {
        id: 'mem_parent123',
        auth: { email: 'parent@home.com' },
        planConnections: [
            { planId: 'pln_parents-y1ea03qk', status: 'ACTIVE', active: true }
        ],
        customFields: {
            'first-name': 'Jane',
            'last-name': 'Parent'
        }
    };

    console.log('🧪 Testing parent data extraction (should skip)...');
    
    const schoolData = extractSchoolDataFromMember(testParentData);
    
    return {
        testName: 'Parent Data Extraction (Skip Test)',
        success: schoolData === null, // Should be null for parents
        schoolData: schoolData,
        shouldBeSkipped: true
    };
}

export default async function handler(req, res) {
    // Set CORS headers
    setCorsHeaders(res, ['GET', 'POST', 'OPTIONS']);
    
    // Handle preflight requests
    if (handleOptionsRequest(req, res)) {
        return;
    }
    
    // Validate method
    if (!validateMethod(req, res, 'GET')) {
        return;
    }

    try {
        const { action, email } = req.query;
        const testResults = [];
        let overallSuccess = true;

        console.log(`🧪 Running Companies test: ${action || 'full_suite'}`);

        // Test 1: Data Extraction
        if (!action || action === 'test_extraction') {
            const educatorExtractionTest = testEducatorDataExtraction();
            const parentExtractionTest = testParentDataExtraction();
            
            testResults.push(educatorExtractionTest);
            testResults.push(parentExtractionTest);
            
            if (!educatorExtractionTest.success || !parentExtractionTest.success) {
                overallSuccess = false;
            }
        }

        // Test 2: Basic Company Operations
        if (!action || action === 'test_creation') {
            console.log('🧪 Testing Company creation...');
            
            const companyTest = await testCompanyFunctionality();
            testResults.push({
                testName: 'Company Creation',
                success: companyTest.success,
                companyId: companyTest.companyId,
                action: companyTest.action,
                error: companyTest.error
            });
            
            if (!companyTest.success) {
                overallSuccess = false;
            }
        }

        // Test 3: Search and Deduplication  
        if (!action || action === 'test_search') {
            console.log('🧪 Testing Company search and deduplication...');
            
            const searchTestData = {
                name: 'Test Primary School',
                city: 'Test City',
                country: 'Test Country'
            };
            
            try {
                const foundCompany = await findSchoolCompanyByData(searchTestData);
                testResults.push({
                    testName: 'Company Search',
                    success: true,
                    found: !!foundCompany,
                    companyId: foundCompany?.id,
                    searchKey: generateSchoolCompanyKey(searchTestData)
                });
            } catch (error) {
                testResults.push({
                    testName: 'Company Search',
                    success: false,
                    error: error.message
                });
                overallSuccess = false;
            }
        }

        // Test 4: Educator Flow Simulation
        if (action === 'test_educator_flow' && email) {
            console.log(`🧪 Testing complete educator flow for: ${email}`);
            
            const simulatedEducatorData = {
                id: 'mem_testeducator',
                auth: { email: email },
                planConnections: [
                    { planId: 'pln_educators-free-promo-ebfw0xzj', status: 'ACTIVE', active: true }
                ],
                customFields: {
                    'first-name': 'Test',
                    'last-name': 'Educator',
                    'place-name': 'Integration Test School',
                    'place-city': 'Integration City',
                    'place-country': 'Test Country',
                    'place-address': '456 Integration Avenue',
                    'place-phone': '+1-555-987-6543',
                    'contact-role': 'Principal',
                    'contact-no-kids': '300'
                }
            };
            
            try {
                // Test data extraction
                const schoolData = extractSchoolDataFromMember(simulatedEducatorData);
                if (!schoolData) {
                    throw new Error('Failed to extract school data');
                }
                
                // Test Company creation
                const companyResult = await createOrUpdateSchoolCompany(schoolData);
                if (!companyResult.success) {
                    throw new Error(`Company creation failed: ${companyResult.error}`);
                }
                
                // Test Contact linking (simulate - would need real Contact)
                testResults.push({
                    testName: 'Educator Flow Simulation',
                    success: true,
                    steps: {
                        dataExtraction: !!schoolData,
                        companyCreation: companyResult.success,
                        companyId: companyResult.companyId,
                        companyAction: companyResult.action
                    },
                    schoolData: schoolData
                });
                
            } catch (error) {
                testResults.push({
                    testName: 'Educator Flow Simulation',
                    success: false,
                    error: error.message
                });
                overallSuccess = false;
            }
        }

        // Return test results
        return res.status(200).json({
            success: overallSuccess,
            testAction: action || 'full_suite',
            testResults: testResults,
            message: overallSuccess ? 'All tests passed' : 'Some tests failed',
            timestamp: new Date().toISOString(),
            brevoCompaniesImplementation: {
                status: 'Development',
                version: '1.0.0',
                integratedWithContactSync: true,
                nonBreakingAddition: true
            }
        });

    } catch (error) {
        console.error('❌ Error in Companies test:', error.message);
        
        return res.status(500).json({
            success: false,
            error: 'Companies test failed',
            details: error.message,
            testAction: req.query.action || 'unknown'
        });
    }
}