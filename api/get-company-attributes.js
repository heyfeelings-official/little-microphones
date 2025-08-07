/**
 * Test endpoint to list all available Company attributes in Brevo.
 * This will show us exactly what custom attributes exist, their internal names, labels, and types.
 */
import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🔍 Fetching Company attributes from Brevo...');
        
        // Endpoint from documentation: /crm/attributes/companies
        const attributes = await makeBrevoRequest('/crm/attributes/companies', 'GET');
        
        console.log(`✅ Found ${attributes.length} Company attributes.`);
        
        // Format the attributes for better readability
        const formattedAttributes = attributes.map(attr => ({
            internalName: attr.internalName,
            label: attr.label,
            type: attr.attributeTypeName,
            required: attr.isRequired,
        }));
        
        return res.status(200).json({
            success: true,
            totalAttributes: formattedAttributes.length,
            attributes: formattedAttributes,
            rawResponse: attributes,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Failed to fetch Company attributes:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

