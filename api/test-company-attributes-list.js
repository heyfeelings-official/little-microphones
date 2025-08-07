/**
 * Test endpoint to list all available Company attributes in Brevo
 * This will show us exactly what custom attributes exist
 */

import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🔍 Fetching Company attributes from Brevo...');
        
        // Get all Company attributes
        const attributes = await makeBrevoRequest('/crm/attributes/companies', 'GET');
        
        console.log('📋 Company attributes found:', JSON.stringify(attributes, null, 2));
        
        // Parse and format the attributes
        const formattedAttributes = attributes.map(attr => ({
            internalName: attr.internalName,
            label: attr.label,
            type: attr.attributeTypeName,
            required: attr.isRequired,
            options: attr.attributeOptions
        }));
        
        // Separate system and custom attributes
        const systemAttributes = formattedAttributes.filter(attr => 
            ['name', 'domain', 'phone_number', 'address', 'revenue', 'number_of_employees'].includes(attr.internalName)
        );
        
        const customAttributes = formattedAttributes.filter(attr => 
            !['name', 'domain', 'phone_number', 'address', 'revenue', 'number_of_employees'].includes(attr.internalName)
        );
        
        return res.status(200).json({
            success: true,
            totalAttributes: formattedAttributes.length,
            systemAttributes: {
                count: systemAttributes.length,
                attributes: systemAttributes
            },
            customAttributes: {
                count: customAttributes.length,
                attributes: customAttributes
            },
            rawResponse: attributes,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Failed to fetch Company attributes:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
