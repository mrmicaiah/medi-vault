-- Migration: 010_clients_employees_compliance.sql
-- Purpose: Create clients, employees, assignments, and compliance document tables
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Add agency_id and location_id to profiles table if missing
-- ============================================================================
DO $$ 
BEGIN
    -- Add agency_id to profiles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'agency_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;
    END IF;

    -- Add location_id to profiles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'location_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Set default agency for existing admin users (grab first agency)
UPDATE profiles 
SET agency_id = (SELECT id FROM agencies LIMIT 1)
WHERE role IN ('admin', 'superadmin', 'manager') 
AND agency_id IS NULL;

-- ============================================================================
-- STEP 2: CLIENTS TABLE
-- Care recipients who receive home care services
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    
    -- Basic identification (keeping it simple for now)
    nickname VARCHAR(100) NOT NULL,  -- e.g., "Mrs. Johnson", "Smith Family"
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discharged')),
    
    -- Future expansion fields (nullable for now)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    medicaid_id VARCHAR(50),
    medicare_id VARCHAR(50),
    
    -- Notes for internal use
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES profiles(id)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_clients_agency ON clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_nickname ON clients(nickname);

-- ============================================================================
-- STEP 3: Add agency_id to employees table if missing
-- ============================================================================
DO $$ 
BEGIN
    -- Add agency_id to employees if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'agency_id'
    ) THEN
        ALTER TABLE employees ADD COLUMN agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;
    END IF;

    -- Add location_id to employees if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'location_id'
    ) THEN
        ALTER TABLE employees ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Set default agency for existing employees (grab first agency)
UPDATE employees 
SET agency_id = (SELECT id FROM agencies LIMIT 1)
WHERE agency_id IS NULL;

-- ============================================================================
-- STEP 4: EMPLOYEE CLIENT ASSIGNMENTS
-- Junction table linking employees to clients they serve
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_client_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Assignment details
    assigned_by UUID REFERENCES profiles(id),
    start_date DATE NOT NULL,
    end_date DATE,  -- NULL means current/ongoing
    
    -- Schedule info (for reference, actual scheduling elsewhere)
    schedule JSONB,  -- e.g., {"days": ["Mon", "Wed", "Fri"], "shift": "morning"}
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Notes
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assignments_employee ON employee_client_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignments_client ON employee_client_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON employee_client_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_dates ON employee_client_assignments(start_date, end_date);

-- ============================================================================
-- STEP 5: EMPLOYEE COMPLIANCE DOCUMENTS
-- Track compliance documents that must be uploaded/renewed for employees
-- Background checks, OIG exclusion checks, licenses, etc.
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_compliance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Document classification
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'background_check',
        'oig_exclusion_check',
        'state_exclusion_check',
        'license',
        'certification',
        'tb_test',
        'cpr_certification',
        'first_aid',
        'training_record',
        'drug_screening',
        'physical_exam',
        'other'
    )),
    
    -- Document details
    document_name VARCHAR(255) NOT NULL,  -- e.g., "Background Check - January 2026"
    description TEXT,
    
    -- File storage (Supabase Storage)
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INTEGER,
    
    -- Validity tracking (critical for audits)
    effective_date DATE NOT NULL,  -- When the check/document was performed
    expiration_date DATE,          -- When it expires (NULL = never)
    
    -- Status
    status VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'expired', 'pending', 'rejected')),
    
    -- For OIG checks: track the check result
    check_result VARCHAR(50),  -- 'clear', 'match_found', 'pending'
    check_details JSONB,       -- Any additional structured data
    
    -- Who uploaded/verified
    uploaded_by UUID REFERENCES profiles(id),
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Notes
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_employee ON employee_compliance_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_compliance_type ON employee_compliance_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON employee_compliance_documents(status);
CREATE INDEX IF NOT EXISTS idx_compliance_expiration ON employee_compliance_documents(expiration_date);
CREATE INDEX IF NOT EXISTS idx_compliance_effective ON employee_compliance_documents(effective_date);

-- Composite index for finding latest of each type per employee
CREATE INDEX IF NOT EXISTS idx_compliance_employee_type_date 
    ON employee_compliance_documents(employee_id, document_type, effective_date DESC);

-- ============================================================================
-- STEP 6: HELPER VIEW - Current compliance status per employee
-- Makes it easy to see who's compliant vs who needs attention
-- ============================================================================
CREATE OR REPLACE VIEW employee_compliance_status AS
WITH latest_docs AS (
    SELECT DISTINCT ON (employee_id, document_type)
        employee_id,
        document_type,
        status,
        effective_date,
        expiration_date,
        check_result
    FROM employee_compliance_documents
    ORDER BY employee_id, document_type, effective_date DESC
)
SELECT 
    e.id AS employee_id,
    e.employee_number,
    p.first_name,
    p.last_name,
    e.status AS employee_status,
    
    -- Background check status
    bg.status AS background_check_status,
    bg.effective_date AS background_check_date,
    bg.expiration_date AS background_check_expires,
    
    -- OIG check status (should be monthly)
    oig.status AS oig_check_status,
    oig.effective_date AS oig_check_date,
    oig.check_result AS oig_check_result,
    
    -- Overall compliance flag
    CASE 
        WHEN bg.status IS NULL THEN false
        WHEN bg.status != 'valid' THEN false
        WHEN oig.status IS NULL THEN false
        WHEN oig.status != 'valid' THEN false
        WHEN oig.effective_date < (CURRENT_DATE - INTERVAL '31 days') THEN false
        ELSE true
    END AS is_compliant
    
FROM employees e
JOIN profiles p ON e.user_id = p.id
LEFT JOIN latest_docs bg ON e.id = bg.employee_id AND bg.document_type = 'background_check'
LEFT JOIN latest_docs oig ON e.id = oig.employee_id AND oig.document_type = 'oig_exclusion_check'
WHERE e.status = 'active';

-- ============================================================================
-- STEP 7: RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_compliance_documents ENABLE ROW LEVEL SECURITY;

-- Clients: Admins can do everything within their agency
DROP POLICY IF EXISTS clients_admin_all ON clients;
CREATE POLICY clients_admin_all ON clients
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Assignments: Admins manage, employees view their own
DROP POLICY IF EXISTS assignments_admin_all ON employee_client_assignments;
CREATE POLICY assignments_admin_all ON employee_client_assignments
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS assignments_employee_view ON employee_client_assignments;
CREATE POLICY assignments_employee_view ON employee_client_assignments
    FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
        )
    );

-- Compliance docs: Admins manage all, employees view their own
DROP POLICY IF EXISTS compliance_admin_all ON employee_compliance_documents;
CREATE POLICY compliance_admin_all ON employee_compliance_documents
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS compliance_employee_view ON employee_compliance_documents;
CREATE POLICY compliance_employee_view ON employee_compliance_documents
    FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- STEP 8: UPDATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS assignments_updated_at ON employee_client_assignments;
CREATE TRIGGER assignments_updated_at
    BEFORE UPDATE ON employee_client_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS compliance_updated_at ON employee_compliance_documents;
CREATE TRIGGER compliance_updated_at
    BEFORE UPDATE ON employee_compliance_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 9: AUTO-EXPIRE COMPLIANCE DOCUMENTS
-- Function to mark expired documents (run via cron or scheduled job)
-- ============================================================================
CREATE OR REPLACE FUNCTION expire_compliance_documents()
RETURNS INTEGER AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE employee_compliance_documents
    SET 
        status = 'expired',
        updated_at = now()
    WHERE 
        status = 'valid'
        AND expiration_date IS NOT NULL
        AND expiration_date < CURRENT_DATE;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 10: COMMENTS
-- ============================================================================
COMMENT ON TABLE clients IS 'Care recipients who receive home care services from the agency';
COMMENT ON TABLE employee_client_assignments IS 'Links employees to clients they serve';
COMMENT ON TABLE employee_compliance_documents IS 'Tracks compliance documents required for Medicare/Medicaid audits';
COMMENT ON VIEW employee_compliance_status IS 'Dashboard view showing compliance status per employee';

COMMENT ON COLUMN employee_compliance_documents.document_type IS 'Type of compliance document: background_check, oig_exclusion_check, license, etc.';
COMMENT ON COLUMN employee_compliance_documents.effective_date IS 'Date the check was performed or document was issued';
COMMENT ON COLUMN employee_compliance_documents.expiration_date IS 'When the document expires (NULL for documents that do not expire)';
COMMENT ON COLUMN employee_compliance_documents.check_result IS 'For OIG/exclusion checks: clear, match_found, pending';
