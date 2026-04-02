-- Migration: Location Transfers Audit Table
-- Tracks all transfers of applicants and employees between locations

CREATE TABLE IF NOT EXISTS location_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was transferred
  entity_type TEXT NOT NULL CHECK (entity_type IN ('applicant', 'employee')),
  application_id UUID REFERENCES applications(id),  -- For applicants
  employee_id UUID REFERENCES employees(id),        -- For employees
  user_id UUID NOT NULL REFERENCES profiles(id),    -- The actual person being transferred
  
  -- Transfer details
  from_location_id UUID REFERENCES locations(id),
  to_location_id UUID REFERENCES locations(id) NOT NULL,
  transferred_by UUID NOT NULL REFERENCES profiles(id),
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  
  -- Denormalized for easier querying of audit history
  from_location_name TEXT,
  to_location_name TEXT,
  transferred_by_name TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by entity
CREATE INDEX idx_location_transfers_application ON location_transfers(application_id) WHERE application_id IS NOT NULL;
CREATE INDEX idx_location_transfers_employee ON location_transfers(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_location_transfers_user ON location_transfers(user_id);
CREATE INDEX idx_location_transfers_from_location ON location_transfers(from_location_id);
CREATE INDEX idx_location_transfers_to_location ON location_transfers(to_location_id);

-- RLS Policies
ALTER TABLE location_transfers ENABLE ROW LEVEL SECURITY;

-- Staff can view transfer history for their location (either from or to)
CREATE POLICY "Staff can view transfers involving their location" ON location_transfers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'manager', 'superadmin')
      AND (
        p.role = 'superadmin'
        OR p.location_id = from_location_id
        OR p.location_id = to_location_id
      )
    )
  );

-- Staff can create transfers from their location
CREATE POLICY "Staff can create transfers from their location" ON location_transfers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'manager', 'superadmin')
      AND (
        p.role = 'superadmin'
        OR p.location_id = from_location_id
      )
    )
  );

COMMENT ON TABLE location_transfers IS 'Audit trail for applicant and employee transfers between locations';
