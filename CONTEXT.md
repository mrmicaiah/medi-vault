# MediVault Development Context

## Project Overview
MediVault: Multi-tenant home care agency management platform for applicant intake and employee management.
- **Frontend**: React 18 + TypeScript + Vite + Tailwind → Cloudflare Pages (medisvault.com)
- **Backend**: Python 3.11 + FastAPI → Render (medi-vault-api.onrender.com)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Repo**: github.com/mrmicaiah/medi-vault

---

## 🚨 CRITICAL: RUN THESE IN SUPABASE SQL EDITOR

Your profile role constraint is broken. Run each of these ONE AT A TIME:

### Step 1: Drop old role constraint
```sql
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
```

### Step 2: Add new constraint with all roles
```sql
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('applicant', 'employee', 'manager', 'admin', 'superadmin'));
```

### Step 3: Create is_staff function
```sql
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
```

### Step 4: Ensure is_admin includes superadmin
```sql
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
```

### Step 5: Update your profile to superadmin (replace YOUR_USER_ID)
```sql
UPDATE profiles 
SET role = 'superadmin' 
WHERE email = 'mrmicaiah@gmail.com';
```

### Step 6: Verify
```sql
SELECT id, email, role FROM profiles WHERE email = 'mrmicaiah@gmail.com';
```

---

## Current Session Work (March 30, 2026)

### Bug Fixes Applied

1. **compliance_service.py** - Fixed column name mismatches:
   - `expires_at` → `expiration_date`
   - `file_name` → `original_filename`

2. **011_fix_roles.sql** - Created migration to fix role constraint:
   - Original constraint only allowed `('applicant', 'employee', 'admin')`
   - New constraint allows `('applicant', 'employee', 'manager', 'admin', 'superadmin')`
   - Added `is_staff()` function for checking any staff role
   - Updated `is_admin()` to include superadmin

### Root Cause of "Always shows applicant dashboard"
The database `profiles` table has a CHECK constraint that only allows:
- `applicant`
- `employee`
- `admin`

It does NOT allow `superadmin` or `manager`. When you try to set `role = 'superadmin'`, it silently fails or reverts, so your role defaults to `applicant`.

---

## Previous Session (March 29-30, 2026)

### Multi-Tenant Architecture Implemented
- `agencies` table with Eveready seed data
- `locations` table with 4 Eveready locations
- `invitations` table for staff invites
- Added `agency_id` to profiles and applications
- Public apply pages at `/apply/:agencySlug`

---

## Key File Paths

**Backend:**
- `backend/app/main.py` - FastAPI app, CORS config
- `backend/app/routers/admin.py` - Dashboard/pipeline endpoints
- `backend/app/services/compliance_service.py` - Compliance queries (FIXED)

**Frontend:**
- `frontend/src/router/index.tsx` - Route definitions (checks STAFF_ROLES)
- `frontend/src/contexts/AuthContext.tsx` - Fetches profile, sets role
- `frontend/src/pages/admin/PipelinePage.tsx` - Applicants table with slide-out panel

**Migrations:**
- `supabase/migrations/001_initial_schema.sql` - Original schema (buggy role constraint)
- `supabase/migrations/011_fix_roles.sql` - Fix for role constraint (RUN THIS!)

---

## URLs

- **Production Frontend:** https://medisvault.com
- **Production API:** https://medi-vault-api.onrender.com
- **Apply Page:** https://medisvault.com/apply/eveready-homecare
- **API Docs:** https://medi-vault-api.onrender.com/api/docs

---

## Next Steps After Running Migrations

1. ✅ Run the SQL migrations above in Supabase
2. Log out and log back in to medisvault.com
3. You should now land on `/admin` dashboard
4. Navigate to `/admin/applicants` to see the pipeline with slide-out panel
5. Test compliance endpoints
