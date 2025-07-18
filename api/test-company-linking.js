import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';

export default async function handler(req, res) {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(400).json({ error: 'Email parameter required' });
        }

        console.log(`\n🔍 Testing company linking for: ${email}`);
        
        // 1. Get contact details
        let contact;
        try {
            contact = await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`, 'GET');
            console.log('✅ Contact found:', {
                id: contact.id,
                email: contact.email,
                company: contact.attributes?.COMPANY,
                companyId: contact.attributes?.COMPANY_ID,
                schoolId: contact.attributes?.school_id
            });
        } catch (error) {
            return res.status(404).json({ error: 'Contact not found', details: error.message });
        }

        // 2. Get company by school ID
        const schoolId = contact.attributes?.school_id;
        if (!schoolId) {
            return res.status(400).json({ error: 'Contact has no school_id attribute' });
        }

        let company;
        try {
            // Search for company by school ID
            const companies = await makeBrevoRequest('/companies', 'GET', null, {
                filters: `school_id:${schoolId}`,
                limit: 1
            });
            
            if (!companies.items || companies.items.length === 0) {
                return res.status(404).json({ error: 'No company found with this school_id' });
            }
            
            company = companies.items[0];
            console.log('✅ Company found:', {
                id: company.id,
                name: company.name,
                linkedContactsIds: company.linkedContactsIds,
                linkedContactsCount: company.linkedContactsIds?.length || 0
            });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to get company', details: error.message });
        }

        // 3. Perform linking with correct API
        try {
            console.log('🔗 Linking contact to company...');
            
            const linkBody = {
                linkContactIds: [contact.id]  // Correct parameter name from documentation
            };
            
            const linkResult = await makeBrevoRequest(
                `/companies/link-unlink/${company.id}`,  // Correct endpoint path
                'PATCH',
                linkBody
            );
            
            console.log('✅ Link operation completed');
        } catch (error) {
            console.error('❌ Link operation failed:', error);
            return res.status(500).json({ 
                error: 'Failed to link contact to company', 
                details: error.message,
                response: error.response?.data 
            });
        }

        // 4. Verify the link by checking both contact and company
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for API to process

        try {
            // Check contact again
            const updatedContact = await makeBrevoRequest(`/contacts/${encodeURIComponent(email)}`, 'GET');
            
            // Check company again
            const updatedCompany = await makeBrevoRequest(`/companies/${company.id}`, 'GET');
            
            const result = {
                success: true,
                contact: {
                    id: updatedContact.id,
                    email: updatedContact.email,
                    company: updatedContact.attributes?.COMPANY,
                    companyId: updatedContact.attributes?.COMPANY_ID
                },
                company: {
                    id: updatedCompany.id,
                    name: updatedCompany.name,
                    linkedContactsIds: updatedCompany.linkedContactsIds,
                    linkedContactsCount: updatedCompany.linkedContactsIds?.length || 0,
                    isContactLinked: updatedCompany.linkedContactsIds?.includes(contact.id) || false
                }
            };
            
            console.log('\n📊 Final verification:', JSON.stringify(result, null, 2));
            
            return res.status(200).json(result);
            
        } catch (error) {
            console.error('❌ Verification failed:', error);
            return res.status(500).json({ 
                error: 'Failed to verify link', 
                details: error.message 
            });
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
} 