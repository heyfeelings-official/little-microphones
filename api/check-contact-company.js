/**
 * Simple endpoint to check contact-company relationships
 */
import { getBrevoContact } from '../utils/brevo-contact-manager.js';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ 
      error: 'Missing email parameter',
      usage: '/api/check-contact-company?email=user@example.com'
    });
  }

  try {
    const contact = await getBrevoContact(email);
    
    const result = {
      email: contact.email,
      id: contact.id,
      companyAttributes: {
        COMPANY: contact.attributes?.COMPANY,
        COMPANY_ID: contact.attributes?.COMPANY_ID,
        SCHOOL_PLACE_ID: contact.attributes?.SCHOOL_PLACE_ID,
        SCHOOL_NAME: contact.attributes?.SCHOOL_NAME
      },
      allAttributes: contact.attributes
    };
    
    return res.status(200).json(result);
    
  } catch (error) {
    return res.status(500).json({ 
      error: error.message
    });
  }
} 