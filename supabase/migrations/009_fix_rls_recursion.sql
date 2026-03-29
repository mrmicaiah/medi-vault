-- ============================================================================
-- 009_fix_rls_recursion.sql
-- Fix the infinite recursion in RLS policies by using a SECURITY DEFINER
-- function to check admin status.
-- ============================================================================

-- Create is_admin function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN user_role = 'admin' OR user_role = 'superadmin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Drop the problematic admin policies that cause recursion
DROP POLICY IF EXISTS profiles_select_admin ON profiles;

-- Recreate admin policy using the function
CREATE POLICY profiles_select_admin ON profiles
    FOR SELECT
    USING (public.is_admin());

-- Also fix admin policies on other tables that reference profiles directly
-- (These don't cause recursion but should use the function for consistency)

-- Locations
DROP POLICY IF EXISTS locations_insert_admin ON locations;
DROP POLICY IF EXISTS locations_update_admin ON locations;
DROP POLICY IF EXISTS locations_delete_admin ON locations;

CREATE POLICY locations_insert_admin ON locations
    FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY locations_update_admin ON locations
    FOR UPDATE
    USING (public.is_admin());

CREATE POLICY locations_delete_admin ON locations
    FOR DELETE
    USING (public.is_admin());

-- Applications
DROP POLICY IF EXISTS applications_select_admin ON applications;
DROP POLICY IF EXISTS applications_update_admin ON applications;

CREATE POLICY applications_select_admin ON applications
    FOR SELECT
    USING (public.is_admin());

CREATE POLICY applications_update_admin ON applications
    FOR UPDATE
    USING (public.is_admin());

-- Application Steps
DROP POLICY IF EXISTS app_steps_select_admin ON application_steps;

CREATE POLICY app_steps_select_admin ON application_steps
    FOR SELECT
    USING (public.is_admin());

-- Documents
DROP POLICY IF EXISTS documents_select_admin ON documents;

CREATE POLICY documents_select_admin ON documents
    FOR SELECT
    USING (public.is_admin());

-- Agreements
DROP POLICY IF EXISTS agreements_select_admin ON agreements;

CREATE POLICY agreements_select_admin ON agreements
    FOR SELECT
    USING (public.is_admin());

-- Employees
DROP POLICY IF EXISTS employees_select_admin ON employees;
DROP POLICY IF EXISTS employees_insert_admin ON employees;
DROP POLICY IF EXISTS employees_update_admin ON employees;
DROP POLICY IF EXISTS employees_delete_admin ON employees;

CREATE POLICY employees_select_admin ON employees
    FOR SELECT
    USING (public.is_admin());

CREATE POLICY employees_insert_admin ON employees
    FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY employees_update_admin ON employees
    FOR UPDATE
    USING (public.is_admin());

CREATE POLICY employees_delete_admin ON employees
    FOR DELETE
    USING (public.is_admin());

-- Clients
DROP POLICY IF EXISTS clients_select_admin ON clients;
DROP POLICY IF EXISTS clients_insert_admin ON clients;
DROP POLICY IF EXISTS clients_update_admin ON clients;
DROP POLICY IF EXISTS clients_delete_admin ON clients;

CREATE POLICY clients_select_admin ON clients
    FOR SELECT
    USING (public.is_admin());

CREATE POLICY clients_insert_admin ON clients
    FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY clients_update_admin ON clients
    FOR UPDATE
    USING (public.is_admin());

CREATE POLICY clients_delete_admin ON clients
    FOR DELETE
    USING (public.is_admin());

-- Employee Client Assignments
DROP POLICY IF EXISTS eca_select_admin ON employee_client_assignments;
DROP POLICY IF EXISTS eca_insert_admin ON employee_client_assignments;
DROP POLICY IF EXISTS eca_update_admin ON employee_client_assignments;
DROP POLICY IF EXISTS eca_delete_admin ON employee_client_assignments;

CREATE POLICY eca_select_admin ON employee_client_assignments
    FOR SELECT
    USING (public.is_admin());

CREATE POLICY eca_insert_admin ON employee_client_assignments
    FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY eca_update_admin ON employee_client_assignments
    FOR UPDATE
    USING (public.is_admin());

CREATE POLICY eca_delete_admin ON employee_client_assignments
    FOR DELETE
    USING (public.is_admin());

-- Audit Log
DROP POLICY IF EXISTS audit_log_select_admin ON audit_log;

CREATE POLICY audit_log_select_admin ON audit_log
    FOR SELECT
    USING (public.is_admin());
