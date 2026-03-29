-- Run this AFTER 010a_agencies_locations.sql

-- ============================================
-- SECTION 4: ADD COLUMNS TO EXISTING TABLES
-- ============================================

-- Add agency_id to profiles (for staff members)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'agency_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_agency ON profiles(agency_id);

-- Add agency_id to applications
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'agency_id'
    ) THEN
        ALTER TABLE applications ADD COLUMN agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add location_id to applications
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'location_id'
    ) THEN
        ALTER TABLE applications ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_applications_agency ON applications(agency_id);
CREATE INDEX IF NOT EXISTS idx_applications_location ON applications(location_id);
