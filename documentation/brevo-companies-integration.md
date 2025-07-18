# Brevo Companies Integration

## Overview

This document describes the integration between Little Microphones and Brevo using Companies feature for better organization of school data.

## Architecture Changes

### Before (Everything in Contacts)
- All data (user + school) stored in Contact attributes
- Difficult to manage school-level data
- Duplicate school information across educators
- No way to see all educators from one school

### After (Contacts + Companies)
- **Contacts**: Store user-specific data (name, email, role)
- **Companies**: Store school-specific data (address, metrics, plan)
- Contacts linked to Companies via SCHOOL_ID
- Single source of truth for school data

## Company Attributes

The following attributes need to be created in Brevo Dashboard under Companies:

### Basic Information
- `name` (string) - Company/School name (required by Brevo)
- `SCHOOL_WEBSITE` (string) - School website URL
- `SCHOOL_PHONE` (string) - School phone number (custom field, ignore Brevo's default Phone Number)

### Address Information
- `SCHOOL_ADDRESS` (string) - Full address
- `SCHOOL_STREET_ADDRESS` (string) - Street address
- `SCHOOL_CITY` (string) - City
- `SCHOOL_STATE_PROVINCE` (string) - State/Province
- `SCHOOL_POSTAL_CODE` (string) - Postal/ZIP code
- `SCHOOL_COUNTRY` (string) - Country

### Location Data
- `SCHOOL_LATITUDE` (text/string) - Latitude for mapping
- `SCHOOL_LONGITUDE` (text/string) - Longitude for mapping

### School Metrics
- `TOTAL_STUDENTS` (number) - Total number of students
- `TOTAL_EDUCATORS` (number) - Total number of educators
- `TOTAL_CLASSES` (number) - Total number of classes

### System Information
- `SCHOOL_ID` (text/string) - Unique school identifier (critical for linking)
- `REGISTRATION_DATE` (date) - First registration date

## Contact-Company Linking

Contacts are linked to Companies using the `SCHOOL_ID` field:
- Each Contact has a `SCHOOL_ID` attribute
- Each Company has a unique `SCHOOL_ID` 
- Multiple contacts can share the same `SCHOOL_ID`

## Segmentation Strategy

### User Segments (Contacts)
Continue using existing segments:
- **Parents** - All parents (no company link)
- **Educators Free** - Individual educators with free plans
- **Educators Paid** - Individual educators with paid plans
- **Therapists** - All therapists

Note: School segmentation is not needed - Companies are used only for data organization and relationship management.

## Implementation Flow

1. **Member Registration/Update**
   - Contact created/updated in Brevo
   - If member has school data:
     - Generate/retrieve SCHOOL_ID
     - Create/update Company with school data
     - Link Contact to Company via SCHOOL_ID

2. **School Identification**
   - Use existing `schoolId` if available
   - Otherwise generate from school name (normalized)
   - Consistent across all educators from same school

3. **Data Synchronization**
   - User data → Contact attributes
   - School data → Company attributes
   - Plan information → Both Contact and Company

## Benefits

1. **Better Organization**
   - Clear separation of user vs school data
   - Single source of truth for schools

2. **Improved Targeting**
   - Target all educators from specific schools
   - School-level campaigns and analytics

3. **Scalability**
   - Easier to manage school relationships
   - Better performance with less duplicate data

4. **Analytics**
   - School-level metrics and reporting
   - Track school growth and engagement

## Setup Instructions

1. **Create Company Attributes in Brevo**
   - Go to Brevo Dashboard → Companies → Settings
   - Add all attributes listed above with correct types

2. **Update Segmentation**
   - Create new Company segments for schools
   - Keep existing Contact segments

3. **Deploy Code Changes**
   - Deploy updated integration code
   - Monitor logs for successful Company creation

4. **Migration (if needed)**
   - Run migration script to create Companies for existing schools
   - Link existing contacts to their Companies

## Monitoring

- Check Brevo Companies dashboard for new schools
- Monitor logs for Company creation/linking errors
- Verify contacts are properly linked to Companies 