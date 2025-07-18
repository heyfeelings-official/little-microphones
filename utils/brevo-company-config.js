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
// IMPORTANT: These are the actual internal names from Brevo (lowercase!)
export const BREVO_COMPANY_ATTRIBUTES = {
  // Basic Information
  name: 'string',                    // Company name (required by Brevo)
  
  // School Information
  school_website: 'string',          // School website URL
  school_phone: 'string',            // School phone number
  
  // Address Information
  school_address: 'string',          // Full address
  school_street_address__memberdata_customfiel: 'string',   // Street address (truncated name in Brevo)
  school_city: 'string',             // City
  school_state_province: 'string',   // State/Province
  school_postal_code: 'string',      // Postal/ZIP code
  school_country: 'string',          // Country
  
  // Location Data
  school_latitude: 'string',         // Latitude for mapping (stored as text)
  school_longitude: 'string',        // Longitude for mapping (stored as text)
  
  // School Metrics
  total_students: 'number',          // Total number of students
  total_educators: 'number',         // Total number of educators
  total_classes: 'number',           // Total number of classes
  
  // System Information
  school_id: 'string',               // Google Places ID (internal name is school_id, not school_place_id!)
  registration_date: 'date'          // First registration date - not exists yet
};

// Mapping from our code's attribute names to Brevo's internal names
export const ATTRIBUTE_NAME_MAPPING = {
  SCHOOL_PLACE_ID: 'school_id',
  SCHOOL_NAME: 'school_name',
  SCHOOL_WEBSITE: 'school_website',
  SCHOOL_PHONE: 'school_phone',
  SCHOOL_ADDRESS: 'school_address',
  SCHOOL_STREET_ADDRESS: 'school_street_address__memberdata_customfiel',
  SCHOOL_CITY: 'school_city',
  SCHOOL_STATE_PROVINCE: 'school_state_province',
  SCHOOL_POSTAL_CODE: 'school_postal_code',
  SCHOOL_COUNTRY: 'school_country',
  SCHOOL_LATITUDE: 'school_latitude',
  SCHOOL_LONGITUDE: 'school_longitude',
  TOTAL_STUDENTS: 'total_students',
  TOTAL_EDUCATORS: 'total_educators',
  TOTAL_CLASSES: 'total_classes'
};

// Company-Contact link configuration
export const COMPANY_CONTACT_LINK = {
  // Field in contact that links to company
  CONTACT_COMPANY_FIELD: 'SCHOOL_PLACE_ID',
  
  // Field in company that serves as unique identifier
  COMPANY_ID_FIELD: 'SCHOOL_PLACE_ID',
  
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
  
  // Map school data to Brevo company attributes using proper internal names
  Object.entries(ATTRIBUTE_NAME_MAPPING).forEach(([ourName, brevoName]) => {
    if (schoolData[ourName] !== undefined) {
      attributes[brevoName] = schoolData[ourName];
    }
  });
  
  // Handle special case for company name
  if (schoolData.SCHOOL_NAME !== undefined) {
    attributes.name = schoolData.SCHOOL_NAME;
  }
  
  return attributes;
}

// Helper to determine if a contact should be linked to a company
export function shouldLinkToCompany(memberData) {
  // Check if member has school data - check all possible field variations
  const hasSchoolData = !!(
    memberData.metaData?.schoolId || 
    memberData.customFields?.['school-id'] ||
    memberData.customFields?.['school-place-id'] ||  // Google Places ID
    memberData.customFields?.['place-id'] ||  // Also check place-id
    memberData.customFields?.schoolName ||
    memberData.customFields?.['school-name'] ||  // Hyphenated version
    memberData.customFields?.['place-name'] ||  // Also check place-name
    memberData.metaData?.schoolName ||
    memberData.metaData?.schoolPlaceId
  );
  
  if (hasSchoolData) {
    console.log('✅ School data found in member:', {
      schoolPlaceId: memberData.customFields?.['school-place-id'] || memberData.customFields?.['place-id'],
      schoolName: memberData.customFields?.['school-name'] || memberData.customFields?.schoolName || memberData.customFields?.['place-name'],
      schoolCity: memberData.customFields?.['school-city'] || memberData.customFields?.city
    });
  }
  
  return hasSchoolData;
}

// Helper to extract school ID from member data
export function getSchoolIdFromMember(memberData) {
  // First try to use school-place-id or place-id from Memberstack
  const schoolPlaceId = memberData.customFields?.['school-place-id'] || 
                       memberData.customFields?.['place-id'] || // Also check place-id
                       memberData.metaData?.schoolPlaceId ||
                       memberData.customFields?.schoolPlaceId ||
                       memberData.customFields?.placeId;
  
  if (schoolPlaceId) {
    return schoolPlaceId;
  }
  
  // Fallback to other IDs or generate from school name
  return (
    memberData.metaData?.schoolId || 
    memberData.customFields?.['school-id'] ||
    // Generate from school name if no ID exists
    (memberData.customFields?.schoolName || memberData.customFields?.['school-name'] || memberData.metaData?.schoolName) 
      ? generateSchoolId(memberData.customFields?.schoolName || memberData.customFields?.['school-name'] || memberData.metaData?.schoolName)
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