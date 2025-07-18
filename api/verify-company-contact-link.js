/**
 * Endpoint to verify Company-Contact linking
 */
import { makeBrevoRequest, getBrevoContact } from '../utils/brevo-contact-manager.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, companyId } = req.body;

  if (!email && !companyId) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      required: { 
        email: 'Contact email to check (optional)',
        companyId: 'Company ID to check (optional)'
      }
    });
  }

  try {
    const results = {
      timestamp: new Date().toISOString()
    };
    
    // Check contact side
    if (email) {
      console.log(`🔍 Checking contact: ${email}`);
      
      try {
        const contact = await getBrevoContact(email);
        results.contact = {
          id: contact.id,
          email: contact.email,
          attributes: {
            COMPANY_ID: contact.attributes?.COMPANY_ID,
            SCHOOL_PLACE_ID: contact.attributes?.SCHOOL_PLACE_ID,
            SCHOOL_NAME: contact.attributes?.SCHOOL_NAME
          },
          linkedCompanies: contact.linkedCompaniesIds || contact.linked_companies_ids || []
        };
      } catch (error) {
        results.contact = { error: error.message };
      }
    }
    
    // Check company side
    if (companyId) {
      console.log(`🔍 Checking company: ${companyId}`);
      
      try {
        const company = await makeBrevoRequest(`/companies/${companyId}`);
        results.company = {
          id: company.id,
          name: company.attributes?.name || company.name,
          school_id: company.attributes?.school_id,
          linkedContactsIds: company.linkedContactsIds || company.linked_contacts_ids || [],
          linkedContactsCount: (company.linkedContactsIds || company.linked_contacts_ids || []).length,
          attributes: company.attributes
        };
      } catch (error) {
        results.company = { error: error.message };
      }
    }
    
    // Test different link formats
    if (email && companyId) {
      console.log(`🧪 Testing link operations...`);
      
      // Get contact ID first
      const contact = await getBrevoContact(email);
      const contactId = contact.id;
      
      results.linkTests = [];
      
      // Test 1: snake_case
      try {
        await makeBrevoRequest(`/companies/${companyId}/link-unlink`, 'PATCH', {
          link_contact_ids: [contactId]
        });
        results.linkTests.push({ format: 'snake_case', status: 'success' });
      } catch (error) {
        results.linkTests.push({ format: 'snake_case', status: 'failed', error: error.message });
      }
      
      // Test 2: camelCase
      try {
        await makeBrevoRequest(`/companies/${companyId}/link-unlink`, 'PATCH', {
          linkContactIds: [contactId]
        });
        results.linkTests.push({ format: 'camelCase', status: 'success' });
      } catch (error) {
        results.linkTests.push({ format: 'camelCase', status: 'failed', error: error.message });
      }
      
      // Wait a bit and check result
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if link worked
      const updatedCompany = await makeBrevoRequest(`/companies/${companyId}`);
      results.afterLinkCompany = {
        linkedContactsIds: updatedCompany.linkedContactsIds || updatedCompany.linked_contacts_ids || [],
        linkedContactsCount: (updatedCompany.linkedContactsIds || updatedCompany.linked_contacts_ids || []).length
      };
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