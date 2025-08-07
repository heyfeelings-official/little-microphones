/**
 * Test endpoint for iteratively testing Brevo Company attributes.
 * Allows sending a list of attributes to test in the request body.
 */
import { createOrUpdateSchoolCompany } from '../utils/brevo-company-manager.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { attributesToTest } = req.body;

    if (!attributesToTest || typeof attributesToTest !== 'object') {
        return res.status(400).json({ error: 'Request body must contain an "attributesToTest" object.' });
    }

    try {
        const timestamp = Date.now();
        const schoolName = `Iterative Test ${timestamp}`;
        
        // Base school data, including the mandatory 'name'
        const testSchoolData = {
            name: schoolName,
            city: 'Test City',
            country: 'Test Country',
            placeId: `test_place_id_${timestamp}`,
            // Add other static fields if needed for context
        };

        // Add the dynamic attributes to be tested
        Object.assign(testSchoolData, attributesToTest);
        
        console.log(`🧪 Iteratively testing Company creation with attributes:`, attributesToTest);

        const companyResult = await createOrUpdateSchoolCompany(testSchoolData);

        if (!companyResult.success) {
            throw new Error(companyResult.error);
        }

        return res.status(200).json({
            success: true,
            message: 'Company created successfully with tested attributes.',
            companyId: companyResult.companyId,
            companyName: companyResult.companyName,
            testedAttributes: attributesToTest,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('❌ Iterative attribute test failed:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message,
            testedAttributes: attributesToTest,
        });
    }
}

