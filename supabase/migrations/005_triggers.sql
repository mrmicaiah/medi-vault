-- ============================================================================
-- 005_triggers.sql
-- MediVault: Triggers for automatic profile creation on signup and
-- automatic updated_at timestamp management on all relevant tables.
-- ============================================================================

-- ==========================================================================
-- 1. Auto-create profile when a new auth user signs up
-- ==========================================================================
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ==========================================================================
-- 2. Auto-update updated_at on row modifications for all tables that have it
-- ==========================================================================

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_application_steps_updated_at
    BEFORE UPDATE ON application_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_employee_client_assignments_updated_at
    BEFORE UPDATE ON employee_client_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
