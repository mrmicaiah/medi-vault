-- Multi-tenant architecture: Agencies and Locations

-- ============================================
-- AGENCIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,  -- URL-friendly identifier (e.g., 'eveready-homecare')
    
    -- Branding
    logo_url TEXT,
    tagline TEXT,
    primary_color TEXT DEFAULT '#6B1D2E',  -- Default maroon
    secondary_color TEXT DEFAULT '#1A2B4A', -- Default navy
    
    -- Contact
    website TEXT,
    phone TEXT,
    email TEXT,
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_slug ON agencies(slug);

-- ============================================
-- LOCATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    
    -- Identity
    name TEXT NOT NULL,  -- e.g., 'Dumfries', 'Arlington'
    slug TEXT NOT NULL,  -- URL-friendly (unique within agency)
    
    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT,
    
    -- Contact (can override agency defaults)
    phone TEXT,
    email TEXT,
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    is_hiring BOOLEAN DEFAULT TRUE,  -- Show on public apply page
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique slug per agency
    UNIQUE(agency_id, slug)
);

-- Index for agency lookups
CREATE INDEX IF NOT EXISTS idx_locations_agency ON locations(agency_id);

-- ============================================
-- UPDATE PROFILES TABLE
-- ============================================
-- Add agency association for staff
ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_agency ON profiles(agency_id);

-- ============================================
-- UPDATE APPLICATIONS TABLE
-- ============================================
-- Add agency and location association
ALTER TABLE applications 
    ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_applications_agency ON applications(agency_id);
CREATE INDEX IF NOT EXISTS idx_applications_location ON applications(location_id);

-- ============================================
-- INVITATIONS TABLE (create fresh with agency support)
-- ============================================
DROP TABLE IF EXISTS invitations;

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who is being invited
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager')),
    
    -- Where they're being invited to
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    
    -- Invitation token
    token TEXT NOT NULL UNIQUE,
    
    -- Tracking
    invited_by UUID NOT NULL REFERENCES profiles(id),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES profiles(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_agency ON invitations(agency_id);

-- ============================================
-- SEED DATA: Eveready HomeCare
-- ============================================
INSERT INTO agencies (id, name, slug, tagline, website, phone, email)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Eveready HomeCare',
    'eveready-homecare',
    'Always Ready to Meet Your Needs',
    'https://evereadyhomecare.com',
    '(703) 555-1234',
    'info@evereadyhomecare.com'
) ON CONFLICT (slug) DO NOTHING;

-- Seed locations for Eveready
INSERT INTO locations (agency_id, name, slug, city, state, address_line1, is_hiring)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Dumfries', 'dumfries', 'Dumfries', 'VA', NULL, TRUE),
    ('a0000000-0000-0000-0000-000000000001', 'Arlington', 'arlington', 'Arlington', 'VA', '2700 S. Quincy Street Suite #220', TRUE),
    ('a0000000-0000-0000-0000-000000000001', 'Sterling', 'sterling', 'Sterling', 'VA', NULL, TRUE),
    ('a0000000-0000-0000-0000-000000000001', 'Hampton', 'hampton', 'Hampton', 'VA', NULL, TRUE)
ON CONFLICT (agency_id, slug) DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Agencies: Public read for active agencies
CREATE POLICY "Anyone can view active agencies"
    ON agencies FOR SELECT
    USING (is_active = TRUE);

-- Agencies: Only platform admins can modify (handled by service key)

-- Locations: Public read for active locations at active agencies
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
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

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
