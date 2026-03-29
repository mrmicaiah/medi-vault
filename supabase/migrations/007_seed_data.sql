-- ============================================================================
-- 007_seed_data.sql
-- MediVault: Seed data for locations and reference documentation for the
-- 22 application step definitions.
-- ============================================================================

-- ==========================================================================
-- 1. Eveready HomeCare Virginia Locations (4 offices)
-- ==========================================================================
INSERT INTO locations (name, address, phone) VALUES
    ('Arlington',  '2200 Wilson Blvd, Arlington, VA 22201',           '(703) 528-1100'),
    ('Fairfax',    '10300 Eaton Pl, Fairfax, VA 22030',              '(703) 273-2200'),
    ('Manassas',   '9025 Church St, Manassas, VA 20110',             '(703) 361-3300'),
    ('Woodbridge', '2700 Potomac Mills Cir, Woodbridge, VA 22192',   '(703) 490-4400')
ON CONFLICT DO NOTHING;

-- ==========================================================================
-- 2. Admin Profile Placeholder
-- NOTE: The actual auth.users row must be created via the Supabase dashboard
-- or Auth API first. Once the admin user exists in auth.users, the
-- handle_new_user() trigger will auto-create the profile. Then update the
-- profile's role to 'admin' manually:
--
--   UPDATE profiles SET role = 'admin' WHERE email = 'admin@evereadyhomecare.com';
--
-- Do NOT insert directly into profiles without a matching auth.users row,
-- as the foreign key constraint will fail.
-- ==========================================================================

-- ==========================================================================
-- 3. Application Step Definitions Reference
-- The 22 steps of the onboarding journey. When a new application is created,
-- the application should insert these as application_steps rows.
--
-- Step  1: Application Basics           (form)      - Position, location, availability
-- Step  2: Personal Information         (form)      - Legal name, DOB, address, contact
-- Step  3: Emergency Contact            (form)      - Emergency contact details
-- Step  4: Education & Qualifications   (form)      - Education, certifications, languages
-- Step  5: References (Reference 1)     (form)      - First professional reference
-- Step  6: References (Reference 2)     (form)      - Second professional reference
-- Step  7: Employment History           (form)      - Previous employers, dates, positions
-- Step  8: Work Preferences             (form)      - Shift, transportation, geographic prefs
-- Step  9: Confidentiality Agreement    (agreement) - Patient/company confidentiality
-- Step 10: E-Signature Consent          (agreement) - Consent to use electronic signatures
-- Step 11: Work Authorization Document  (upload)    - Passport, visa, work authorization
-- Step 12: Identity Document (Front)    (upload)    - Front of government-issued photo ID
-- Step 13: Identity Document (Back)     (upload)    - Back of government-issued photo ID
-- Step 14: Social Security Card         (upload)    - SSN card for employment verification
-- Step 15: Professional Credentials     (upload)    - CNA, HHA, PCA, LPN, or RN certificate
-- Step 16: CPR Certification            (upload)    - Current CPR/BLS certification
-- Step 17: TB Test Results              (upload)    - Tuberculosis test results
-- Step 18: Orientation Training         (agreement) - Orientation training acknowledgment
-- Step 19: Criminal Background Attest.  (agreement) - Criminal background attestation
-- Step 20: Virginia Code Disclosure     (agreement) - VA Code Section 32.1-162.9:1
-- Step 21: Job Description Ack.         (agreement) - Job description acknowledgment
-- Step 22: Final Signature              (agreement) - Master onboarding consent form
-- ==========================================================================
