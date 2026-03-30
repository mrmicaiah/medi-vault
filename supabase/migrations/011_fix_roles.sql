-- ============================================================================
-- 011_fix_roles.sql
-- Fix role constraint on profiles table and is_admin function to support
-- all staff roles: admin, superadmin, manager
-- ============================================================================

-- Step 1: Drop the old constraint (must find the exact name first)
-- The constraint might be named 'profiles_role_check' or similar

-- Drop ALL role-related constraints on profiles
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT conname FROM pg_constraint 
        WHERE conrelid = 'profiles'::regclass 
        AND conname LIKE '%role%'
    LOOP
        EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

-- Step 2: Add new constraint with all roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('applicant', 'employee', 'manager', 'admin', 'superadmin'));

-- Step 3: Create is_staff function (more inclusive than is_admin)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN user_role IN ('manager', 'admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- Step 4: Update is_admin to also include superadmin (it already does, but ensure it)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN user_role IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 5: Create is_superadmin function for highest privilege checks
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN user_role = 'superadmin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;
