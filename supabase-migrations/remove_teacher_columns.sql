-- Migration: Remove teacher data columns from lmids table
-- Reason: Teacher data is now fetched directly from Memberstack API for better reliability
-- Date: January 2025

-- Remove teacher data columns that are no longer needed
ALTER TABLE lmids 
DROP COLUMN IF EXISTS teacher_first_name,
DROP COLUMN IF EXISTS teacher_last_name,
DROP COLUMN IF EXISTS teacher_school_name;

-- Add comment explaining the change
COMMENT ON TABLE lmids IS 'LMID assignments table. Teacher data is fetched from Memberstack API via get-teacher-data endpoint.';
