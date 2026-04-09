-- Migration: Add status column to documents table for review workflow
-- Run this in Supabase SQL Editor

-- Add status column if not exists
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

-- Add approved_by and approved_at for audit trail
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add index for pending documents (for manager dashboard)
CREATE INDEX IF NOT EXISTS idx_documents_pending_review 
ON documents(status) 
WHERE status = 'pending_review';

-- Comment on columns
COMMENT ON COLUMN documents.status IS 'Document status: pending_review, approved, rejected';
COMMENT ON COLUMN documents.approved_by IS 'Manager who approved the document';
COMMENT ON COLUMN documents.approved_at IS 'When the document was approved';
