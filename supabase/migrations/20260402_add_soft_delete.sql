-- Add soft delete columns to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- Create index for faster trash queries
CREATE INDEX IF NOT EXISTS idx_applications_deleted_at ON applications(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update the pipeline query to exclude deleted by default (done in backend code)
COMMENT ON COLUMN applications.deleted_at IS 'Timestamp when application was soft-deleted';
COMMENT ON COLUMN applications.deleted_by IS 'User who deleted the application';
