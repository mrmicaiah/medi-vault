-- Migration: Add exclusion_checks table for OIG/SAM monthly compliance
-- Run this in Supabase SQL Editor

-- Create the exclusion_checks table
CREATE TABLE IF NOT EXISTS exclusion_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  check_type VARCHAR(20) NOT NULL CHECK (check_type IN ('oig', 'sam')),
  check_date DATE NOT NULL,
  result VARCHAR(20) NOT NULL CHECK (result IN ('clear', 'match_found', 'error', 'pending')),
  checked_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups by employee and date
CREATE INDEX IF NOT EXISTS idx_exclusion_checks_employee_date 
ON exclusion_checks(employee_id, check_date DESC);

-- Index for finding employees due for checks
CREATE INDEX IF NOT EXISTS idx_exclusion_checks_type_date 
ON exclusion_checks(check_type, check_date DESC);

-- Add RLS policies
ALTER TABLE exclusion_checks ENABLE ROW LEVEL SECURITY;

-- Staff can view all exclusion checks
CREATE POLICY "Staff can view exclusion checks"
ON exclusion_checks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('manager', 'admin', 'superadmin')
  )
);

-- Staff can insert exclusion checks
CREATE POLICY "Staff can insert exclusion checks"
ON exclusion_checks FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('manager', 'admin', 'superadmin')
  )
);

-- Staff can update exclusion checks
CREATE POLICY "Staff can update exclusion checks"
ON exclusion_checks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('manager', 'admin', 'superadmin')
  )
);

-- Comment for documentation
COMMENT ON TABLE exclusion_checks IS 'Monthly OIG/SAM exclusion check logs for employee compliance';
COMMENT ON COLUMN exclusion_checks.check_type IS 'Type of check: oig (OIG LEIE) or sam (SAM.gov)';
COMMENT ON COLUMN exclusion_checks.result IS 'Result: clear (no match), match_found (excluded), error (check failed), pending (awaiting results)';
