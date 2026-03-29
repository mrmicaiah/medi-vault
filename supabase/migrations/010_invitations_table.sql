-- Invitations table for staff account creation

CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager')),
    token TEXT NOT NULL UNIQUE,
    
    -- Optional: link to specific location
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    location_name TEXT,
    
    -- Tracking
    invited_by UUID NOT NULL REFERENCES profiles(id),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES profiles(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Index for token lookups (used by invitation acceptance)
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- Index for email lookups (check for existing invitations)
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- Index for listing pending invitations
CREATE INDEX IF NOT EXISTS idx_invitations_pending ON invitations(used, created_at DESC) WHERE NOT used;

-- RLS Policies
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Admins can see all invitations
CREATE POLICY "Admins can view all invitations"
    ON invitations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
    ON invitations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Admins can update invitations
CREATE POLICY "Admins can update invitations"
    ON invitations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
    ON invitations FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Public access for token validation (during signup)
-- This is handled by the service role key in the API
