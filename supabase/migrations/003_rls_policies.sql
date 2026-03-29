-- ============================================================================
-- 003_rls_policies.sql
-- MediVault: Row Level Security policies for all tables.
-- Uses auth.uid() for user identification and a subquery on profiles.role
-- for admin checks.
-- ============================================================================

-- ==========================================================================
-- PROFILES
-- Users can read and update their own profile. Admins can read all.
-- ==========================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY profiles_select_own ON profiles
    FOR SELECT
    USING (id = auth.uid());

-- Users can update their own profile (non-admin fields)
CREATE POLICY profiles_update_own ON profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY profiles_select_admin ON profiles
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow insert during signup (trigger creates profile via SECURITY DEFINER,
-- but this covers direct inserts if needed)
CREATE POLICY profiles_insert ON profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- ==========================================================================
-- LOCATIONS
-- All authenticated users can read. Admins can manage.
-- ==========================================================================
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY locations_select_authenticated ON locations
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY locations_insert_admin ON locations
    FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY locations_update_admin ON locations
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY locations_delete_admin ON locations
    FOR DELETE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================================================
-- APPLICATIONS
-- Users CRUD their own. Admins can read all and update status.
-- ==========================================================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY applications_select_own ON applications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY applications_insert_own ON applications
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY applications_update_own ON applications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY applications_delete_own ON applications
    FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY applications_select_admin ON applications
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY applications_update_admin ON applications
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================================================
-- APPLICATION_STEPS
-- Users CRUD steps for their own applications. Admins can read all.
-- ==========================================================================
ALTER TABLE application_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_steps_select_own ON application_steps
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = application_steps.application_id
          AND applications.user_id = auth.uid()
    ));

CREATE POLICY app_steps_insert_own ON application_steps
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = application_steps.application_id
          AND applications.user_id = auth.uid()
    ));

CREATE POLICY app_steps_update_own ON application_steps
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = application_steps.application_id
          AND applications.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = application_steps.application_id
          AND applications.user_id = auth.uid()
    ));

CREATE POLICY app_steps_delete_own ON application_steps
    FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = application_steps.application_id
          AND applications.user_id = auth.uid()
    ));

CREATE POLICY app_steps_select_admin ON application_steps
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================================================
-- DOCUMENTS
-- Users CRUD their own documents. Admins can read all.
-- ==========================================================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_select_own ON documents
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY documents_insert_own ON documents
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY documents_update_own ON documents
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY documents_delete_own ON documents
    FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY documents_select_admin ON documents
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================================================
-- AGREEMENTS
-- Users can insert and read their own. Admins can read all.
-- ==========================================================================
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY agreements_select_own ON agreements
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY agreements_insert_own ON agreements
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY agreements_select_admin ON agreements
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================================================
-- EMPLOYEES
-- Admins CRUD. Employees can read their own record.
-- ==========================================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY employees_select_own ON employees
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY employees_select_admin ON employees
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY employees_insert_admin ON employees
    FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY employees_update_admin ON employees
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY employees_delete_admin ON employees
    FOR DELETE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================================================
-- CLIENTS
-- Admins CRUD only.
-- ==========================================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_select_admin ON clients
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY clients_insert_admin ON clients
    FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY clients_update_admin ON clients
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY clients_delete_admin ON clients
    FOR DELETE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================================================
-- EMPLOYEE_CLIENT_ASSIGNMENTS
-- Admins CRUD. Employees can read their own assignments.
-- ==========================================================================
ALTER TABLE employee_client_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY eca_select_own ON employee_client_assignments
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM employees
        WHERE employees.id = employee_client_assignments.employee_id
          AND employees.user_id = auth.uid()
    ));

CREATE POLICY eca_select_admin ON employee_client_assignments
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY eca_insert_admin ON employee_client_assignments
    FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY eca_update_admin ON employee_client_assignments
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY eca_delete_admin ON employee_client_assignments
    FOR DELETE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================================================
-- AUDIT_LOG
-- Admins can read. Authenticated users can insert.
-- ==========================================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_select_admin ON audit_log
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY audit_log_insert_authenticated ON audit_log
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
