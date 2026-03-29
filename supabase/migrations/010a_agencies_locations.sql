-- Multi-tenant architecture: Agencies and Locations
-- Run this migration in Supabase SQL Editor
-- 
-- If you get errors, run each section separately (copy one section at a time)

-- ============================================
-- SECTION 1: CREATE AGENCIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    tagline TEXT,
    primary_color TEXT DEFAULT '#6B1D2E',
    secondary_color TEXT DEFAULT '#1A2B4A',
    website TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_slug ON agencies(slug);

-- ============================================
-- SECTION 2: CREATE LOCATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_hiring BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agency_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_locations_agency ON locations(agency_id);

-- ============================================
-- SECTION 3: SEED EVEREADY HOMECARE
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

INSERT INTO locations (agency_id, name, slug, city, state, address_line1, is_hiring)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Dumfries', 'dumfries', 'Dumfries', 'VA', NULL, TRUE),
    ('a0000000-0000-0000-0000-000000000001', 'Arlington', 'arlington', 'Arlington', 'VA', '2700 S. Quincy Street Suite #220', TRUE),
    ('a0000000-0000-0000-0000-000000000001', 'Sterling', 'sterling', 'Sterling', 'VA', NULL, TRUE),
    ('a0000000-0000-0000-0000-000000000001', 'Hampton', 'hampton', 'Hampton', 'VA', NULL, TRUE)
ON CONFLICT (agency_id, slug) DO NOTHING;
