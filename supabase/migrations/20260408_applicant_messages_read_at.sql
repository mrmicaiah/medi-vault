-- Add read_at column to track when applicant acknowledged the message
ALTER TABLE applicant_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
