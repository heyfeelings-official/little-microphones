/**
 * Simple Company creation test - without linking
 * Tests only Company creation to isolate the issue
 */

import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';
import { createOrUpdateSchoolCompany } from '../utils/brevo-company-manager.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🧪 Starting simple Company creation test...');

        // Test school data
        const testSchoolData = {
            name: 'Simple Test School ' + Date.now(),
            city: 'Warsaw',
            country: 'Poland',
            placeId: 'simple_test_place_id_' + Date.now()
        };

        console.log('📝 Test data prepared:', {
            school: testSchoolData.name,
            placeId: testSchoolData.placeId
        });

        // Step 1: Create Company only
        console.log('1️⃣ Creating Company...');
        const companyResult = await createOrUpdateSchoolCompany(testSchoolData);
        
        if (!companyResult.success) {
            throw new Error(`Company creation failed: ${companyResult.error}`);
        }
        
        console.log('✅ Company created successfully:', {
            id: companyResult.companyId,
            name: companyResult.companyName,
            action: companyResult.action
        });

        // Step 2: Verify Company exists
        console.log('2️⃣ Verifying Company...');
        const companies = await makeBrevoRequest('/companies?limit=10', 'GET');
        
        const ourCompany = companies.companies?.find(c => 
            c.id === companyResult.companyId || c.name === testSchoolData.name
        );

        const verification = {
            companyExists: !!ourCompany,
            companyId: ourCompany?.id,
            companyName: ourCompany?.name,
            totalCompanies: companies.companies?.length || 0
        };

        console.log('🔍 Verification results:', verification);

        // Return success response
        return res.status(200).json({
            success: true,
            message: 'Simple Company creation test completed successfully',
            results: {
                company: {
                    id: companyResult.companyId,
                    name: companyResult.companyName,
                    action: companyResult.action
                },
                verification
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Test failed:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
