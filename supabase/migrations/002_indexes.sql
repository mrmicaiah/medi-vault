-- ============================================================================
-- 002_indexes.sql
-- MediVault: Performance indexes for frequently queried columns.
-- Covers foreign key lookups, status filters, compliance queries, and audit.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_applications_user_id
    ON applications(user_id);

CREATE INDEX IF NOT EXISTS idx_applications_status
    ON applications(status);

-- ---------------------------------------------------------------------------
-- application_steps
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_application_steps_application_id
    ON application_steps(application_id);

-- Composite index for the common lookup: get a specific step for an application
CREATE INDEX IF NOT EXISTS idx_application_steps_app_step
    ON application_steps(application_id, step_number);

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_documents_user_id
    ON documents(user_id);

CREATE INDEX IF NOT EXISTS idx_documents_user_category
    ON documents(user_id, category);

CREATE INDEX IF NOT EXISTS idx_documents_is_current
    ON documents(is_current);

CREATE INDEX IF NOT EXISTS idx_documents_expiration_date
    ON documents(expiration_date);

-- ---------------------------------------------------------------------------
-- agreements
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_agreements_user_id
    ON agreements(user_id);

CREATE INDEX IF NOT EXISTS idx_agreements_user_type
    ON agreements(user_id, agreement_type);

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_employees_user_id
    ON employees(user_id);

CREATE INDEX IF NOT EXISTS idx_employees_location_id
    ON employees(location_id);

CREATE INDEX IF NOT EXISTS idx_employees_status
    ON employees(status);

-- ---------------------------------------------------------------------------
-- employee_client_assignments
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_eca_employee_id
    ON employee_client_assignments(employee_id);

CREATE INDEX IF NOT EXISTS idx_eca_client_id
    ON employee_client_assignments(client_id);

CREATE INDEX IF NOT EXISTS idx_eca_is_active
    ON employee_client_assignments(is_active);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
    ON audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
    ON audit_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
    ON audit_log(created_at);
