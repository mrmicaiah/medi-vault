-- ============================================================================
-- 001_initial_schema.sql
-- MediVault: Initial database schema for the applicant-to-employee
-- management platform. Creates all core tables with constraints and
-- foreign keys.
-- ============================================================================

-- profiles: extends Supabase auth.users with application-specific fields
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'applicant' CHECK (role IN ('applicant', 'employee', 'admin')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- locations: Eveready HomeCare Virginia office locations
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- applications: tracks each applicant's 22-step onboarding application
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'hired')),
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER DEFAULT 22,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- application_steps: individual steps within an application (22 steps per application)
CREATE TABLE IF NOT EXISTS application_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN ('form', 'agreement', 'upload')),
    data JSONB DEFAULT '{}',
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(application_id, step_number)
);

-- documents: uploaded files with versioning and expiration tracking
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id),
    category TEXT NOT NULL CHECK (category IN ('identity', 'credentials', 'health', 'background', 'agreements', 'training')),
    document_type TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    expiration_date DATE,
    effective_from TIMESTAMPTZ DEFAULT now(),
    effective_to TIMESTAMPTZ,
    is_current BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    uploaded_by UUID REFERENCES profiles(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- agreements: signed legal documents with e-signature audit trail
CREATE TABLE IF NOT EXISTS agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id),
    agreement_type TEXT NOT NULL CHECK (agreement_type IN ('confidentiality', 'esignature_consent', 'orientation', 'criminal_attestation', 'va_code_disclosure', 'job_description', 'master_onboarding')),
    signed_name TEXT NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT,
    pdf_storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- employees: hired applicants promoted to employee status
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id),
    employee_number TEXT UNIQUE,
    position TEXT NOT NULL,
    location_id UUID REFERENCES locations(id),
    hire_date DATE NOT NULL,
    termination_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated', 'on_leave')),
    pay_rate DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- clients: care recipients (Phase 1: minimal info with nickname only)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_code TEXT UNIQUE,
    nickname TEXT NOT NULL,
    location_id UUID REFERENCES locations(id),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- employee_client_assignments: maps employees to their assigned clients
CREATE TABLE IF NOT EXISTS employee_client_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    assignment_start DATE NOT NULL,
    assignment_end DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- audit_log: immutable record of all significant actions for compliance
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
