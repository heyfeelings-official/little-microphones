/**
 * Create Company for Contact
 * This endpoint manually creates a company for a contact with school data
 */
import { 
  getBrevoContact, 
  createOrUpdateBrevoCompany, 
  linkContactToCompany,
  handleEmptyValue 
} from '../utils/brevo-contact-manager.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ 
      error: 'Missing required parameter',
      required: { email: 'Contact email address' }
    });
  }

  try {
    console.log(`🏢 Creating company for contact: ${email}`);
    
    // Step 1: Get contact data from Brevo
    const contact = await getBrevoContact(email);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found in Brevo' });
    }
    
    console.log('📋 Contact attributes:', JSON.stringify(contact.attributes, null, 2));
    
    // Step 2: Check if contact has school data
    const schoolPlaceId = contact.attributes?.SCHOOL_PLACE_ID;
    const schoolName = contact.attributes?.SCHOOL_NAME || contact.attributes?.SCHOOL_PLACE_NAME;
    
    if (!schoolPlaceId && !schoolName) {
      return res.status(400).json({ 
        error: 'Contact has no school data',
        details: 'SCHOOL_PLACE_ID and SCHOOL_NAME are both empty'
      });
    }
    
    // Step 3: Prepare school data for company creation
    const schoolData = {
      SCHOOL_PLACE_ID: schoolPlaceId || `generated-${Date.now()}`,
      SCHOOL_NAME: schoolName || 'Unknown School',
      SCHOOL_CITY: contact.attributes?.SCHOOL_CITY,
      SCHOOL_COUNTRY: contact.attributes?.SCHOOL_COUNTRY,
      SCHOOL_PHONE: contact.attributes?.SCHOOL_PHONE,
      SCHOOL_WEBSITE: contact.attributes?.SCHOOL_WEBSITE,
      SCHOOL_STREET_ADDRESS: contact.attributes?.SCHOOL_STREET_ADDRESS,
      SCHOOL_STATE_PROVINCE: contact.attributes?.SCHOOL_STATE_PROVINCE,
      SCHOOL_POSTAL_CODE: contact.attributes?.SCHOOL_POSTAL_CODE,
      SCHOOL_LATITUDE: contact.attributes?.SCHOOL_LATITUDE,
      SCHOOL_LONGITUDE: contact.attributes?.SCHOOL_LONGITUDE
    };
    
    console.log('🏫 School data for company:', JSON.stringify(schoolData, null, 2));
    
    // Step 4: Create or update company
    const companyResult = await createOrUpdateBrevoCompany(schoolData);
    
    if (!companyResult.success) {
      return res.status(500).json({
        error: 'Failed to create company',
        details: companyResult.error
      });
    }
    
    console.log('✅ Company created/updated:', companyResult);
    
    // Step 5: Link contact to company
    const linkData = {
      EDUCATOR_ROLE: contact.attributes?.EDUCATOR_ROLE,
      IS_PRIMARY_CONTACT: contact.attributes?.EDUCATOR_ROLE?.toLowerCase().includes('principal') || false
    };
    
    const linkResult = await linkContactToCompany(email, companyResult.companyId, linkData);
    
    if (!linkResult.success) {
      console.warn('⚠️ Company created but linking failed:', linkResult.error);
    }
    
    res.status(200).json({
      success: true,
      message: 'Company created and contact linked successfully',
      contact: {
        email: contact.email,
        id: contact.id,
        schoolPlaceId: schoolPlaceId,
        schoolName: schoolName
      },
      company: {
        id: companyResult.companyId,
        schoolPlaceId: companyResult.schoolPlaceId,
        action: companyResult.action
      },
      linked: linkResult.success
    });
    
  } catch (error) {
    console.error('❌ Error creating company:', error);
    res.status(500).json({ 
      error: 'Failed to create company', 
      details: error.message 
    });
  }
} 