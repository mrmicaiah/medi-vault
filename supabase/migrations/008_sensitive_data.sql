-- ============================================================================
-- 008_sensitive_data.sql
-- MediVault: Secure storage for sensitive PII (SSN, etc.)
-- Uses pgcrypto for encryption and separate table with strict RLS.
-- ============================================================================

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Sensitive data table - stores encrypted SSN and other PII
CREATE TABLE IF NOT EXISTS sensitive_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- SSN: encrypted full value + plaintext last 4 for display
    ssn_encrypted TEXT,           -- Full SSN encrypted with pgp_sym_encrypt
    ssn_last_four TEXT,           -- Last 4 digits for display (e.g., '5678')
    ssn_provided_at TIMESTAMPTZ,  -- When SSN was first provided
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id)
);

-- SSN access log - tracks every time someone views full SSN
CREATE TABLE IF NOT EXISTS ssn_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),      -- Whose SSN was accessed
    accessed_by UUID NOT NULL REFERENCES profiles(id),  -- Who accessed it
    access_type TEXT NOT NULL CHECK (access_type IN ('reveal', 'export', 'print')),
    ip_address TEXT,
    user_agent TEXT,
    reason TEXT,                                        -- Optional reason for access
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_sensitive_data_user_id ON sensitive_data(user_id);
CREATE INDEX IF NOT EXISTS idx_ssn_access_log_user_id ON ssn_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ssn_access_log_accessed_by ON ssn_access_log(accessed_by);
CREATE INDEX IF NOT EXISTS idx_ssn_access_log_created_at ON ssn_access_log(created_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssn_access_log ENABLE ROW LEVEL SECURITY;

-- Sensitive data: Users can insert/update their own, admins can read
CREATE POLICY sensitive_data_select_own ON sensitive_data
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY sensitive_data_insert_own ON sensitive_data
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY sensitive_data_update_own ON sensitive_data
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins can read sensitive data (but full SSN requires decryption via backend)
CREATE POLICY sensitive_data_select_admin ON sensitive_data
    FOR SELECT
    USING (is_admin());

-- SSN access log: Only admins can read, system inserts via backend
CREATE POLICY ssn_access_log_select_admin ON ssn_access_log
    FOR SELECT
    USING (is_admin());

-- Allow authenticated users to insert (backend will handle this)
CREATE POLICY ssn_access_log_insert ON ssn_access_log
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- Updated_at trigger
-- ============================================================================

CREATE TRIGGER update_sensitive_data_updated_at
    BEFORE UPDATE ON sensitive_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
