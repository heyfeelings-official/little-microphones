/**
 * api/test-firstname-mapping.js - Debug FIRSTNAME mapping from Memberstack to Brevo
 * 
 * PURPOSE: Test endpoint to diagnose why FIRSTNAME is not populating in Brevo
 * USAGE: GET /api/test-firstname-mapping?email=user@example.com
 */

import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';

export default async function handler(req, res) {
    // CORS headers for development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.query;
        const requestId = Math.random().toString(36).substring(2, 15);
        
        if (!email) {
            return res.status(400).json({ error: 'Missing email parameter' });
        }
        
        console.log(`🧪 [${requestId}] Testing FIRSTNAME mapping for: ${email}`);
        
        // Step 1: Get contact from Brevo
        let brevoContact = null;
        try {
            brevoContact = await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`);
            console.log(`✅ [${requestId}] Contact found in Brevo`);
        } catch (error) {
            console.warn(`⚠️ [${requestId}] Contact not found in Brevo: ${error.message}`);
            return res.status(404).json({ 
                error: 'Contact not found in Brevo',
                details: error.message,
                troubleshooting: [
                    'Make sure the contact exists in Brevo',
                    'Check if the email is correctly encoded',
                    'Verify the contact was synced via Memberstack webhook'
                ]
            });
        }
        
        // Step 2: Analyze FIRSTNAME data
        const attributes = brevoContact.attributes || {};
        const firstNameValue = attributes.FIRSTNAME;
        
        console.log(`🔍 [${requestId}] FIRSTNAME analysis:`, {
            value: firstNameValue,
            type: typeof firstNameValue,
            isEmpty: firstNameValue === '',
            isNull: firstNameValue === null,
            isUndefined: firstNameValue === undefined
        });
        
        // Step 3: Check all name-related attributes
        const nameAttributes = {
            FIRSTNAME: attributes.FIRSTNAME,
            LASTNAME: attributes.LASTNAME,
            TEACHER_NAME: attributes.TEACHER_NAME,
            MEMBERSTACK_ID: attributes.MEMBERSTACK_ID
        };
        
        console.log(`📋 [${requestId}] Name-related attributes:`, nameAttributes);
        
        // Step 4: Get raw Memberstack data if we can find the member ID
        let memberstackData = null;
        if (attributes.MEMBERSTACK_ID) {
            try {
                // Simulate what would happen during webhook processing
                console.log(`🔗 [${requestId}] Would need to fetch Memberstack data for: ${attributes.MEMBERSTACK_ID}`);
                // Note: We can't directly call Memberstack API from here without Admin API key
            } catch (error) {
                console.warn(`⚠️ [${requestId}] Could not fetch Memberstack data: ${error.message}`);
            }
        }
        
        // Step 5: Generate debug report
        const debugReport = {
            success: true,
            requestId: requestId,
            email: email,
            brevoContact: {
                found: true,
                id: brevoContact.id,
                attributes: nameAttributes,
                totalAttributes: Object.keys(attributes).length
            },
            firstNameAnalysis: {
                exists: 'FIRSTNAME' in attributes,
                value: firstNameValue,
                valueType: typeof firstNameValue,
                isEmpty: firstNameValue === '',
                isEmptyString: firstNameValue === '',
                length: typeof firstNameValue === 'string' ? firstNameValue.length : null
            },
            possibleIssues: [],
            recommendations: []
        };
        
        // Diagnose issues
        if (!('FIRSTNAME' in attributes)) {
            debugReport.possibleIssues.push('FIRSTNAME attribute missing entirely from Brevo contact');
            debugReport.recommendations.push('Check if Memberstack webhook is sending customFields[\'first-name\'] data');
        } else if (firstNameValue === '') {
            debugReport.possibleIssues.push('FIRSTNAME is empty string in Brevo');
            debugReport.recommendations.push('Check Memberstack data - user may not have filled first name field');
        } else if (firstNameValue === null || firstNameValue === undefined) {
            debugReport.possibleIssues.push('FIRSTNAME is null/undefined in Brevo');
            debugReport.recommendations.push('Check handleEmptyValue() function and Memberstack field mapping');
        } else {
            debugReport.possibleIssues.push('FIRSTNAME seems to have data - issue may be in email template');
            debugReport.recommendations.push('Check if {{contact.FIRSTNAME}} is used correctly in Brevo email template');
        }
        
        // Add troubleshooting steps
        debugReport.troubleshooting = {
            step1: 'Check Memberstack user profile for first-name field',
            step2: 'Verify webhook logs show correct customFields data',
            step3: 'Test email template with {{contact.FIRSTNAME}} parameter',
            step4: 'Check if handleEmptyValue() is clearing the field',
            step5: 'Verify Brevo template uses {{contact.FIRSTNAME}} not {{params.firstName}}'
        };
        
        return res.status(200).json(debugReport);
        
    } catch (error) {
        console.error(`❌ Error testing FIRSTNAME mapping:`, error);
        return res.status(500).json({
            success: false,
            error: 'Failed to test FIRSTNAME mapping', 
            details: error.message
        });
    }
} 