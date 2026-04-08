-- Add new fields for manager first name and location
ALTER TABLE applicant_messages 
ADD COLUMN IF NOT EXISTS posted_by_first_name TEXT,
ADD COLUMN IF NOT EXISTS location_name TEXT;
