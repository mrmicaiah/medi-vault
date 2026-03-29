-- Run this AFTER 010b_add_agency_columns.sql

-- ============================================
-- SECTION 5: CREATE INVITATIONS TABLE
-- ============================================
DROP TABLE IF EXISTS invitations;

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager')),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    token TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES profiles(id),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_agency ON invitations(agency_id);

-- ============================================
-- SECTION 6: RLS POLICIES
-- ============================================
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Agencies: Public read for active agencies
DROP POLICY IF EXISTS "Anyone can view active agencies" ON agencies;
CREATE POLICY "Anyone can view active agencies"
    ON agencies FOR SELECT
    USING (is_active = TRUE);

-- Locations: Public read for active locations
DROP POLICY IF EXISTS "Anyone can view active locations" ON locations;
CREATE POLICY "Anyone can view active locations"
    ON locations FOR SELECT
    USING (
        is_active = TRUE 
        AND EXISTS (
            SELECT 1 FROM agencies 
            WHERE agencies.id = locations.agency_id 
            AND agencies.is_active = TRUE
        )
    );

-- Invitations: Staff at same agency can view
DROP POLICY IF EXISTS "Staff can view agency invitations" ON invitations;
CREATE POLICY "Staff can view agency invitations"
    ON invitations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
            AND (profiles.agency_id = invitations.agency_id OR profiles.role = 'superadmin')
        )
    );

-- ============================================
-- SECTION 7: UPDATE EXISTING DATA
-- ============================================
-- Set all existing applications to Eveready HomeCare
UPDATE applications 
SET agency_id = 'a0000000-0000-0000-0000-000000000001'
WHERE agency_id IS NULL;

-- Set all existing staff profiles to Eveready HomeCare
UPDATE profiles 
SET agency_id = 'a0000000-0000-0000-0000-000000000001'
WHERE role IN ('admin', 'superadmin', 'manager') AND agency_id IS NULL;
