/**
 * Test script for Brevo Company creation
 * Tests the complete flow: create Company, create Contact, link them
 */

import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';
import { createOrUpdateSchoolCompany, linkContactToSchoolCompany } from '../utils/brevo-company-manager.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🧪 Starting Company creation test...');

        // Test school data with proper field mapping
        const testSchoolData = {
            name: 'Test School Warsaw ' + Date.now(),
            city: 'Warsaw',                              // → SCHOOL_CITY
            country: 'Poland',                           // → SCHOOL_COUNTRY
            addressResult: 'Complete address result',    // → SCHOOL_ADDRESS
            address: 'ul. Testowa 123',                  // → SCHOOL_STREET_ADDRESS
            state: 'Mazowieckie',                        // → SCHOOL_STATE_PROVINCE
            zip: '00-001',                               // → SCHOOL_POSTAL_CODE
            phone: '+48 22 123 4567',                    // → SCHOOL_PHONE
            website: 'https://testschool.edu.pl',        // → SCHOOL_WEBSITE
            latitude: '52.2297',                         // → SCHOOL_LATITUDE
            longitude: '21.0122',                        // → SCHOOL_LONGITUDE
            placeId: 'test_place_id_' + Date.now(),      // → SCHOOL_PLACE_ID (KEY)
            facilityType: 'Elementary School',
            rating: '4.5'
        };

        // Test contact data
        const testContactEmail = `test.educator.${Date.now()}@example.com`;
        const testContactData = {
            email: testContactEmail,
            attributes: {
                FIRSTNAME: 'Test',
                LASTNAME: 'Educator',
                TEACHER_NAME: 'Test Educator',
                USER_CATEGORY: 'educators',
                PLAN_TYPE: 'free',
                PLAN_NAME: 'Educators Free',
                EDUCATOR_ROLE: 'Teacher',
                SCHOOL_PLACE_ID: testSchoolData.placeId
            },
            listIds: [2] // Hey Feelings List
        };

        console.log('📝 Test data prepared:', {
            school: testSchoolData.name,
            contact: testContactEmail
        });

        // Step 1: Create Company
        console.log('1️⃣ Creating Company...');
        const companyResult = await createOrUpdateSchoolCompany(testSchoolData);
        
        if (!companyResult.success) {
            throw new Error(`Company creation failed: ${companyResult.error}`);
        }
        
        console.log('✅ Company created:', {
            id: companyResult.companyId,
            name: companyResult.companyName,
            action: companyResult.action
        });

        // Step 2: Create Contact
        console.log('2️⃣ Creating Contact...');
        const contactResult = await makeBrevoRequest('/contacts', 'POST', testContactData);
        console.log('✅ Contact created:', testContactEmail);

        // Step 3: Link Contact to Company
        console.log('3️⃣ Linking Contact to Company...');
        const linkResult = await linkContactToSchoolCompany(
            testContactEmail, 
            companyResult.companyId,
            companyResult.companyName
        );
        
        if (!linkResult.success) {
            throw new Error(`Linking failed: ${linkResult.error}`);
        }
        
        console.log('✅ Contact linked to Company');

        // Step 4: Verify the link
        console.log('4️⃣ Verifying link...');
        const verifyContact = await makeBrevoRequest(`/contacts/${encodeURIComponent(testContactEmail)}`, 'GET');
        
        const verification = {
            contactExists: !!verifyContact,
            hasCompany: verifyContact?.attributes?.COMPANY === companyResult.companyName,
            hasCompanyId: verifyContact?.attributes?.COMPANY_ID === companyResult.companyId,
            schoolPlaceId: verifyContact?.attributes?.SCHOOL_PLACE_ID
        };

        console.log('🔍 Verification results:', verification);

        // Return success response
        return res.status(200).json({
            success: true,
            message: 'Company creation test completed successfully',
            results: {
                company: {
                    id: companyResult.companyId,
                    name: companyResult.companyName,
                    action: companyResult.action
                },
                contact: {
                    email: testContactEmail,
                    linked: linkResult.success
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
