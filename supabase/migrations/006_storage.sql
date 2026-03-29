-- ============================================================================
-- 006_storage.sql
-- MediVault: Supabase Storage bucket creation and access policies.
-- Two buckets: 'documents' for applicant/employee uploads,
-- 'agreements' for signed PDF agreements.
-- ============================================================================

-- ==========================================================================
-- Create storage buckets (private, not publicly accessible)
-- ==========================================================================

-- Documents bucket: stores uploaded files (ID scans, certifications, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Agreements bucket: stores generated signed PDF agreements
INSERT INTO storage.buckets (id, name, public)
VALUES ('agreements', 'agreements', false)
ON CONFLICT (id) DO NOTHING;

-- ==========================================================================
-- Documents bucket policies
-- Users can upload/read files scoped to their own folder: {user_id}/*
-- Admins can read all files.
-- ==========================================================================

-- Users can upload to their own folder
CREATE POLICY documents_upload_own ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'documents'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- Users can read their own files
CREATE POLICY documents_read_own ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'documents'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- Users can update their own files
CREATE POLICY documents_update_own ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'documents'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- Users can delete their own files
CREATE POLICY documents_delete_own ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'documents'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- Admins can read all files in the documents bucket
CREATE POLICY documents_read_admin ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'documents'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ==========================================================================
-- Agreements bucket policies
-- Service role uploads (bypasses RLS automatically).
-- Users can read their own agreements. Admins can read all.
-- ==========================================================================

-- Users can read their own signed agreements
CREATE POLICY agreements_read_own ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'agreements'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- Admins can read all agreements
CREATE POLICY agreements_read_admin ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'agreements'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
