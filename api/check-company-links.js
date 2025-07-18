/**
 * Test endpoint to check if Companies have linked contacts
 */
import { makeBrevoRequest } from '../utils/brevo-contact-manager.js';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Checking Companies with linked contacts...');
    
    // Get list of companies
    const companiesResult = await makeBrevoRequest('/companies?limit=5');
    
    const results = {
      totalCompanies: companiesResult.pager?.total || 0,
      companies: []
    };
    
    if (companiesResult.items && companiesResult.items.length > 0) {
      for (const company of companiesResult.items) {
        const companyInfo = {
          id: company.id,
          name: company.attributes?.name || company.name,
          school_id: company.attributes?.school_id,
          linkedContactsCount: company.linked_contacts_ids?.length || 0,
          linkedContactsIds: company.linked_contacts_ids || []
        };
        
        // Get detailed company info
        try {
          const detailedCompany = await makeBrevoRequest(`/companies/${company.id}`);
          companyInfo.detailed = {
            linkedContacts: detailedCompany.linked_contacts_ids || [],
            attributes: detailedCompany.attributes
          };
        } catch (error) {
          companyInfo.detailError = error.message;
        }
        
        results.companies.push(companyInfo);
      }
    }
    
    return res.status(200).json(results);
    
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
} 