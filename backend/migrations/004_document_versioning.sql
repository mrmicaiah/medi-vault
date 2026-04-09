-- Migration: Add document versioning and metadata columns
-- Run this in Supabase SQL Editor

-- Add new columns to documents table for versioning and metadata
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS storage_path_back TEXT,
ADD COLUMN IF NOT EXISTS document_number TEXT,
ADD COLUMN IF NOT EXISTS check_result TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS expiration_date DATE,
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);

-- Add index for efficient querying of current documents
CREATE INDEX IF NOT EXISTS idx_documents_user_type_current 
ON documents(user_id, document_type, is_current) 
WHERE is_current = true;

-- Add index for expiring documents (for dashboard alerts)
CREATE INDEX IF NOT EXISTS idx_documents_expiration 
ON documents(expiration_date) 
WHERE expiration_date IS NOT NULL AND is_current = true;

-- Comment on new columns
COMMENT ON COLUMN documents.storage_path_back IS 'Storage path for back image (licenses, IDs)';
COMMENT ON COLUMN documents.document_number IS 'License or document number';
COMMENT ON COLUMN documents.check_result IS 'Result for compliance checks: clear, match_found, pending';
COMMENT ON COLUMN documents.notes IS 'Additional notes about the document';
COMMENT ON COLUMN documents.version IS 'Version number for document updates';
COMMENT ON COLUMN documents.is_current IS 'Whether this is the current/active version';
COMMENT ON COLUMN documents.expiration_date IS 'When the document expires';
COMMENT ON COLUMN documents.uploaded_by IS 'User ID of who uploaded the document';

-- Create storage bucket if it doesn't exist (run separately in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('documents', 'documents', false)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy for documents bucket (authenticated users can upload)
-- Run this in Supabase Dashboard > Storage > Policies if not already set
/*
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Staff can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'staff', 'super_admin')
  )
);
*/
