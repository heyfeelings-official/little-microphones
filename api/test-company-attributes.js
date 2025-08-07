/**
 * Test all possible Company attribute formats
 * Tests which attribute names work with Brevo API
 */

import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🧪 Starting Company attributes test...');
        
        const timestamp = Date.now();
        const results = [];

        // Test different attribute name formats
        const testCases = [
            {
                name: 'No attributes',
                company: {
                    name: `Test No Attrs ${timestamp}`,
                    // No attributes field at all
                }
            },
            {
                name: 'Empty attributes',
                company: {
                    name: `Test Empty Attrs ${timestamp}`,
                    attributes: {}
                }
            },
            {
                name: 'Standard attributes only',
                company: {
                    name: `Test Standard ${timestamp}`,
                    attributes: {
                        domain: 'test.com',
                        phone_number: '+48123456789',
                        address: 'Test Street 123'
                    }
                }
            },
            {
                name: 'UPPERCASE with underscore',
                company: {
                    name: `Test UPPER_CASE ${timestamp}`,
                    attributes: {
                        SCHOOL_CITY: 'Warsaw'
                    }
                }
            },
            {
                name: 'lowercase with underscore',
                company: {
                    name: `Test lower_case ${timestamp}`,
                    attributes: {
                        school_city: 'Warsaw'
                    }
                }
            },
            {
                name: 'UPPERCASE no underscore',
                company: {
                    name: `Test UPPERCASE ${timestamp}`,
                    attributes: {
                        SCHOOLCITY: 'Warsaw'
                    }
                }
            },
            {
                name: 'lowercase no underscore',
                company: {
                    name: `Test lowercase ${timestamp}`,
                    attributes: {
                        schoolcity: 'Warsaw'
                    }
                }
            },
            {
                name: 'CamelCase',
                company: {
                    name: `Test CamelCase ${timestamp}`,
                    attributes: {
                        SchoolCity: 'Warsaw'
                    }
                }
            },
            {
                name: 'With hyphen',
                company: {
                    name: `Test Hyphen ${timestamp}`,
                    attributes: {
                        'school-city': 'Warsaw'
                    }
                }
            },
            {
                name: 'Without prefix UPPERCASE',
                company: {
                    name: `Test No Prefix UPPER ${timestamp}`,
                    attributes: {
                        CITY: 'Warsaw'
                    }
                }
            },
            {
                name: 'Without prefix lowercase',
                company: {
                    name: `Test No Prefix lower ${timestamp}`,
                    attributes: {
                        city: 'Warsaw'
                    }
                }
            }
        ];

        // Test each case
        for (const testCase of testCases) {
            console.log(`\n📝 Testing: ${testCase.name}`);
            console.log(`Company data:`, JSON.stringify(testCase.company, null, 2));
            
            try {
                const result = await makeBrevoRequest('/companies', 'POST', testCase.company);
                
                console.log(`✅ SUCCESS: ${testCase.name}`);
                results.push({
                    test: testCase.name,
                    success: true,
                    companyId: result.id,
                    attributes: testCase.company.attributes
                });
                
                // Clean up - delete the test company
                try {
                    await makeBrevoRequest(`/companies/${result.id}`, 'DELETE');
                    console.log(`🗑️ Cleaned up company ${result.id}`);
                } catch (e) {
                    console.log(`⚠️ Could not clean up company ${result.id}`);
                }
                
            } catch (error) {
                console.log(`❌ FAILED: ${testCase.name} - ${error.message}`);
                results.push({
                    test: testCase.name,
                    success: false,
                    error: error.message,
                    attributes: testCase.company.attributes
                });
            }
        }

        // Summary
        const summary = {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        };

        console.log('\n📊 SUMMARY:', summary);
        console.log('Successful formats:', results.filter(r => r.success).map(r => r.test));
        console.log('Failed formats:', results.filter(r => !r.success).map(r => r.test));

        return res.status(200).json({
            success: true,
            summary,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Test failed:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
