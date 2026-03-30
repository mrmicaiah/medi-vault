# MediVault Development Context

**Last Updated:** March 30, 2026
**Repository:** `mrmicaiah/medi-vault`
**Status:** Active Development - Applicants Page Issue

---

## Current Issue (NEEDS FIX)

**Problem:** Applicants page shows applicants in the table, but clicking on them shows "Applicant not found" in the sliding panel.

**Root Cause:** The frontend is calling `/admin/applicants/{id}` but getting a 404. Need to verify:
1. The backend endpoint `/admin/applicants/{application_id}` is deployed on Render
2. The application ID being passed matches what's in the database

**Debug Steps:**
1. Check browser Network tab when clicking an applicant - see what URL is being called and what response comes back
2. Check Render logs for any errors
3. Verify the application IDs in the database match what's being sent

**Files Changed This Session:**
- `frontend/src/pages/admin/PipelinePage.tsx` - Redesigned with table view + sliding panel, calls `/admin/applicants/{id}`
- `backend/app/routers/admin.py` - Added `/admin/applicants/{id}` endpoint (plural), kept `/admin/applicant/{id}` for backward compat
- `frontend/src/components/layout/Sidebar.tsx` - Renamed Pipeline to Applicants, dark navy theme
- `frontend/src/router/index.tsx` - Changed routes from /admin/pipeline to /admin/applicants
- `frontend/src/components/layout/Header.tsx` - Added fallback to email if profile name missing
- `frontend/src/pages/admin/DashboardPage.tsx` - Simplified dashboard layout

---

## Architecture

### Tech Stack

| Layer | Technology | Hosting | URL |
|-------|------------|---------|-----|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS | Cloudflare Pages | https://medisvault.com |
| Backend | Python 3.11 + FastAPI | Render | https://medi-vault-api.onrender.com |
| Database | PostgreSQL | Supabase | (Supabase Dashboard) |
| Auth | Supabase Auth | Supabase | Integrated |
| File Storage | Supabase Storage | Supabase | `documents` bucket |

### Key URLs
- **Frontend:** https://medisvault.com
- **Backend API:** https://medi-vault-api.onrender.com/api
- **Apply Page:** https://medisvault.com/apply/eveready

---

## Database State

**Applications table has 2 records:**
```
| id                                   | status      | email                |
| 49412d3c-df37-47f8-a0ff-398cb1e475a3 | in_progress | mrmicaiah@gmail.com  |
| 000b22ec-5c7f-4a29-a3d9-8ba6bc299723 | submitted   | mrmicaiah@icloud.com |
```

**Profiles:**
- mrmicaiah@gmail.com - Micaiah Bussey - superadmin
- mrmicaiah@icloud.com - Test Applicant - applicant

---

## RLS Fix Applied

Migration 009 was run to fix RLS recursion. The `is_admin()` function now exists and checks for both 'admin' and 'superadmin' roles.

---

## Render Auto-Deploy

Render is NOT set up for auto-deploy. Must manually deploy:
1. Go to https://dashboard.render.com
2. Find `medi-vault-api` service
3. Click "Manual Deploy" → "Deploy latest commit"

---

## Application Wizard (22 Steps)

Steps 1-10: Form data (basics, personal info, emergency contact, education, references, work history, preferences, agreements)
Steps 11-17: Document uploads (work auth, ID front/back, SSN card, credentials, CPR, TB test)
Steps 18-22: Final agreements and signature

---

## Key Backend Endpoints

- `GET /api/admin/pipeline` - Get all applicants (working)
- `GET /api/admin/applicants/{id}` - Get applicant detail (NOT WORKING - 404)
- `GET /api/admin/applicant/{id}` - Old endpoint (kept for backward compat)
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/training-leads` - Certification interest leads

---

## Frontend Routes

- `/admin` - Dashboard
- `/admin/applicants` - Applicants table with sliding panel (was /admin/pipeline)
- `/admin/applicant/{id}` - Full applicant detail page
- `/admin/employees` - Employees list
- `/admin/documents` - Document compliance (was /admin/compliance)
- `/admin/training-leads` - HHA/CPR certification leads

---

## Next Steps

1. **FIX:** Debug why `/admin/applicants/{id}` returns 404
   - Check if Render deployed the latest backend code
   - Check if the endpoint is registered correctly
   - Verify the application ID format

2. **THEN:** Test the full applicant detail sliding panel

3. **THEN:** Continue with remaining features (document upload, onboarding flow)
