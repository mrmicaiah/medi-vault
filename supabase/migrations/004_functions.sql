-- ============================================================================
-- 004_functions.sql
-- MediVault: Database functions for automated profile creation, timestamp
-- management, and compliance/audit queries.
-- ============================================================================

-- ==========================================================================
-- 1. handle_new_user()
-- Trigger function: automatically creates a profiles row when a new user
-- signs up via Supabase Auth. Pulls first_name and last_name from the
-- raw_user_meta_data if provided during signup.
-- ==========================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================================
-- 2. update_updated_at()
-- Trigger function: automatically sets updated_at to now() on row UPDATE.
-- Attach to any table that has an updated_at column.
-- ==========================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- 3. get_employee_credentials_at_date(p_employee_id, p_check_date)
-- Returns all documents that were effective on a given date for an employee.
-- Used for point-in-time audit queries, e.g.:
--   "Was this employee credentialed on the date they provided care?"
-- ==========================================================================
CREATE OR REPLACE FUNCTION get_employee_credentials_at_date(
    p_employee_id UUID,
    p_check_date DATE
)
RETURNS TABLE (
    document_id UUID,
    category TEXT,
    document_type TEXT,
    expiration_date DATE,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.category,
        d.document_type,
        d.expiration_date,
        d.effective_from,
        d.effective_to,
        CASE
            WHEN d.expiration_date IS NULL THEN true
            WHEN d.expiration_date >= p_check_date THEN true
            ELSE false
        END as is_valid
    FROM documents d
    JOIN employees e ON e.user_id = d.user_id
    WHERE e.id = p_employee_id
      AND d.effective_from <= p_check_date::timestamptz
      AND (d.effective_to IS NULL OR d.effective_to >= p_check_date::timestamptz)
    ORDER BY d.category, d.document_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================================
-- 4. get_compliance_summary()
-- Returns compliance dashboard counts for the admin view:
--   - expiring_30_days: current documents expiring within 30 days
--   - expired: current documents already past expiration
--   - missing_required: active employees with no current credentials
--   - compliant: active employees with valid current credentials
-- ==========================================================================
CREATE OR REPLACE FUNCTION get_compliance_summary()
RETURNS TABLE (
    expiring_30_days BIGINT,
    expired BIGINT,
    missing_required BIGINT,
    compliant BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM documents WHERE is_current = true AND expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'),
        (SELECT COUNT(*) FROM documents WHERE is_current = true AND expiration_date < CURRENT_DATE),
        (SELECT COUNT(DISTINCT e.id) FROM employees e WHERE e.status = 'active' AND NOT EXISTS (
            SELECT 1 FROM documents d WHERE d.user_id = e.user_id AND d.is_current = true AND d.category = 'credentials'
        )),
        (SELECT COUNT(DISTINCT e.id) FROM employees e WHERE e.status = 'active' AND EXISTS (
            SELECT 1 FROM documents d WHERE d.user_id = e.user_id AND d.is_current = true AND d.category = 'credentials'
            AND (d.expiration_date IS NULL OR d.expiration_date >= CURRENT_DATE)
        ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
