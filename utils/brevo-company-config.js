/**
 * Brevo Company Attributes Configuration
 * 
 * Companies represent schools/organizations in the system.
 * Each company can be linked to multiple contacts (educators, therapists).
 * 
 * IMPORTANT: These attributes must be created in Brevo Dashboard under Companies
 * before using this integration.
 */

// Company attributes mapping for Brevo
export const BREVO_COMPANY_ATTRIBUTES = {
  // Basic Information
  name: 'string',                    // Company name (required by Brevo)
  
  // School Information
  SCHOOL_WEBSITE: 'string',          // School website URL
  SCHOOL_PHONE: 'string',            // School phone number (our custom field, ignore Brevo's default Phone Number)
  
  // Address Information
  SCHOOL_ADDRESS: 'string',          // Full address
  SCHOOL_STREET_ADDRESS: 'string',   // Street address
  SCHOOL_CITY: 'string',             // City
  SCHOOL_STATE_PROVINCE: 'string',   // State/Province
  SCHOOL_POSTAL_CODE: 'string',      // Postal/ZIP code
  SCHOOL_COUNTRY: 'string',          // Country
  
  // Location Data
  SCHOOL_LATITUDE: 'string',         // Latitude for mapping (stored as text)
  SCHOOL_LONGITUDE: 'string',        // Longitude for mapping (stored as text)
  
  // School Metrics
  TOTAL_STUDENTS: 'number',          // Total number of students
  TOTAL_EDUCATORS: 'number',         // Total number of educators
  TOTAL_CLASSES: 'number',           // Total number of classes
  
  // System Information
  SCHOOL_ID: 'string',               // Unique school identifier (critical for linking, stored as text)
  REGISTRATION_DATE: 'date'          // First registration date
};

// Company-Contact link configuration
export const COMPANY_CONTACT_LINK = {
  // Field in contact that links to company
  CONTACT_COMPANY_FIELD: 'SCHOOL_ID',
  
  // Field in company that serves as unique identifier
  COMPANY_ID_FIELD: 'SCHOOL_ID',
  
  // Deal/Link attributes (if using Brevo CRM features)
  LINK_ATTRIBUTES: {
    ROLE: 'string',                  // Role in school: Teacher, Principal, Admin
    DEPARTMENT: 'string',            // Department if applicable
    START_DATE: 'date',              // When joined the school
    IS_PRIMARY_CONTACT: 'boolean'    // Is this the primary contact
  }
};

// Helper to get company attributes for API calls
export function getCompanyAttributes(schoolData) {
  const attributes = {};
  
  // Map school data to Brevo company attributes
  Object.keys(BREVO_COMPANY_ATTRIBUTES).forEach(key => {
    if (key === 'name' && schoolData.SCHOOL_NAME) {
      attributes.name = schoolData.SCHOOL_NAME;
    } else if (schoolData[key] !== undefined) {
      attributes[key] = schoolData[key];
    }
  });
  
  return attributes;
}

// Helper to determine if a contact should be linked to a company
export function shouldLinkToCompany(memberData) {
  // Check if member has school data
  return !!(
    memberData.metaData?.schoolId || 
    memberData.customFields?.['school-id'] ||
    memberData.customFields?.schoolName ||
    memberData.metaData?.schoolName
  );
}

// Helper to extract school ID from member data
export function getSchoolIdFromMember(memberData) {
  // First try to use school-place-id from Memberstack
  const schoolPlaceId = memberData.customFields?.['school-place-id'] || 
                       memberData.metaData?.schoolPlaceId ||
                       memberData.customFields?.schoolPlaceId;
  
  if (schoolPlaceId) {
    return schoolPlaceId;
  }
  
  // Fallback to other IDs or generate from school name
  return (
    memberData.metaData?.schoolId || 
    memberData.customFields?.['school-id'] ||
    // Generate from school name if no ID exists
    (memberData.customFields?.schoolName || memberData.metaData?.schoolName) 
      ? generateSchoolId(memberData.customFields?.schoolName || memberData.metaData?.schoolName)
      : null
  );
}

// Generate consistent school ID from school name
function generateSchoolId(schoolName) {
  if (!schoolName) return null;
  
  // Create a consistent ID from school name
  // Remove special characters, lowercase, replace spaces with hyphens
  return schoolName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50); // Limit length
} 