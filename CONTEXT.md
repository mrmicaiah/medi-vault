# MediVault Development Context

## Project Overview
MediVault: Multi-tenant home care agency management platform for applicant intake and employee management.
- **Frontend**: React 18 + TypeScript + Vite + Tailwind → Cloudflare Pages (medisvault.com)
- **Backend**: Python 3.11 + FastAPI → Render (medi-vault-api.onrender.com)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Repo**: github.com/mrmicaiah/medi-vault

## Current Session Work (March 30, 2026)

### Bug Fix: Column Name Mismatch
**Issue:** `compliance_service.py` was querying non-existent columns:
- `expires_at` → should be `expiration_date`
- `file_name` → should be `original_filename`

**Fixed:** Updated all references in `backend/app/services/compliance_service.py` to use correct column names matching the schema in `001_initial_schema.sql`.

### Previous Session (March 29-30, 2026)

#### Multi-Tenant Architecture Implemented
Created full multi-agency support:

**Database Tables Created:**
- `agencies` - Stores agency info (name, slug, branding, contact)
- `locations` - Locations per agency (linked via agency_id)
- `invitations` - Staff invitation system

**Columns Added:**
- `profiles.agency_id` - Links staff to their agency
- `applications.agency_id` - Links applications to agency
- `applications.location_id` - Links applications to specific location

**Seed Data:**
- Eveready HomeCare (id: a0000000-0000-0000-0000-000000000001)
- 4 locations: Dumfries, Arlington, Sterling, Hampton

#### Frontend Changes
1. **ApplyPage** (`/apply/:agencySlug`) - Public application page with agency branding
2. **InvitePage** (`/invite/:token`) - Staff invitation acceptance
3. **Header** - Added Admin/Applicant view toggle for staff
4. **Types** - Updated UserRole to include: applicant, employee, manager, admin, superadmin
5. **Router** - Updated to support agency slug routes

#### Backend Changes
1. **agencies.py** router - Public endpoints for fetching agency/locations
2. **invitations.py** router - Staff invitation CRUD
3. **admin.py** - Filters by agency_id
4. **application_service.py** - Stores agency_id and location_id
5. **encryption_service.py** - Fixed singleton export
6. **requirements.txt** - Added email-validator

#### Database Migrations Run
All migrations applied manually step-by-step:
- agencies table ✅
- locations table ✅
- Eveready seed data ✅
- profiles.agency_id column ✅
- applications.agency_id and location_id columns ✅
- invitations table ✅
- RLS policies ✅
- Updated profiles_role_check constraint to include manager/superadmin ✅
- Disabled RLS on agencies/locations (for public access) ✅

---

## CURRENT STATUS

### ✅ Fixed Issues
1. **Column name mismatch** - compliance_service.py now uses correct column names
2. **CORS** - Already hardcoded to specific origins in main.py (not "*")

### Database Schema - Documents Table
The `documents` table uses these column names (per `001_initial_schema.sql`):
- `expiration_date` (DATE) - NOT `expires_at`
- `original_filename` (TEXT) - NOT `file_name`
- `is_current` (BOOLEAN DEFAULT true) - Already exists

### Current Superadmin
- Email: mrmicaiah@gmail.com
- Role: superadmin
- Agency: Eveready HomeCare

---

## Environment Variables (Render)

**CORS_ORIGINS:**
```
https://medi-vault.pages.dev,https://medisvault.com,https://www.medisvault.com
```

**Other required:**
- SUPABASE_URL
- SUPABASE_KEY (service role)
- SUPABASE_ANON_KEY
- ENCRYPTION_KEY (for SSN encryption)

---

## Key File Paths

**Backend:**
- `backend/app/main.py` - FastAPI app entry, CORS config
- `backend/app/routers/admin.py` - Dashboard/pipeline endpoints
- `backend/app/routers/agencies.py` - Agency/location endpoints
- `backend/app/routers/invitations.py` - Staff invitation system
- `backend/app/routers/compliance.py` - Compliance endpoints
- `backend/app/services/application_service.py` - Application CRUD
- `backend/app/services/compliance_service.py` - Compliance queries (FIXED)
- `backend/app/services/encryption_service.py` - SSN encryption

**Frontend:**
- `frontend/src/pages/public/ApplyPage.tsx` - Public application flow
- `frontend/src/pages/auth/InvitePage.tsx` - Staff invitation acceptance
- `frontend/src/pages/admin/DashboardPage.tsx` - Admin dashboard
- `frontend/src/pages/admin/CompliancePage.tsx` - Compliance tracker (uses mock data)
- `frontend/src/pages/admin/UsersPage.tsx` - User management with invitations tab
- `frontend/src/components/layout/Header.tsx` - Admin/Applicant toggle
- `frontend/src/router/index.tsx` - Route definitions
- `frontend/src/types/index.ts` - TypeScript types

**Migrations:**
- `supabase/migrations/001_initial_schema.sql` - Core schema (documents table defined here)
- `supabase/migrations/010a_agencies_locations.sql`
- `supabase/migrations/010b_add_agency_columns.sql`
- `supabase/migrations/010c_invitations_rls.sql`

---

## URLs

- **Production Frontend:** https://medisvault.com
- **Production API:** https://medi-vault-api.onrender.com
- **Apply Page:** https://medisvault.com/apply/eveready-homecare
- **API Health:** https://medi-vault-api.onrender.com/api/health
- **API Docs:** https://medi-vault-api.onrender.com/api/docs

---

## Next Steps

1. Test compliance endpoints after deploy
2. Connect CompliancePage frontend to actual API (currently using mock data)
3. Test full applicant flow with new email
4. Test staff invitation flow
5. Add location reassignment feature for admins
6. Consider faster deployment option (Railway/Fly.io)
