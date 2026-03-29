# MediVault Development Context

**Last Updated:** March 29, 2026  
**Repository:** `mrmicaiah/medi-vault`  
**Status:** Active Development - Phase 1 (Applicant Intake System)

---

## Project Overview

MediVault is a proprietary software platform for home care agency management, being built for Eveready HomeCare (Virginia-based, 4 locations). The platform will eventually be sold as SaaS to other agencies (~$200-300/agency/month).

**Phase 1 (Current):** Applicant intake system - employment applications, document uploads, hiring workflow  
**Phase 2 (Future):** Client records, clock-in/out, Medicare audit prep, billing - requires HIPAA compliance

---

## Architecture

### Tech Stack

| Layer | Technology | Hosting | URL |
|-------|------------|---------|-----|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS | Cloudflare Pages | https://medi-vault.pages.dev |
| Backend | Python 3.11 + FastAPI | Render | https://medi-vault-api.onrender.com |
| Database | PostgreSQL | Supabase | (Supabase Dashboard) |
| Auth | Supabase Auth | Supabase | Integrated |
| File Storage | Supabase Storage | Supabase | (Not fully implemented yet) |

### Repository Structure

```
medi-vault/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── application/        # Wizard steps, shell, read-only view
│   │   │   ├── applicant/          # DocumentUploadModal
│   │   │   ├── layout/             # Sidebar, Header, AppLayout, AuthLayout
│   │   │   └── ui/                 # Button, Card, Badge, Alert, Input, etc.
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx     # Supabase auth state management
│   │   ├── hooks/
│   │   │   ├── useAuth.ts          # Auth hook
│   │   │   └── useApplication.ts   # Application wizard state
│   │   ├── lib/
│   │   │   ├── api.ts              # API client (fetch wrapper)
│   │   │   ├── supabase.ts         # Supabase client
│   │   │   └── utils.ts            # Helpers (cn, formatDate, etc.)
│   │   ├── pages/
│   │   │   ├── applicant/          # DashboardPage, ApplicationPage, DocumentsPage
│   │   │   ├── admin/              # Admin pages (Dashboard, Pipeline, etc.)
│   │   │   └── auth/               # Login, Signup, ResetPassword
│   │   ├── router/
│   │   │   └── index.tsx           # Route definitions
│   │   └── types/
│   │       └── index.ts            # TypeScript types, STEP_NAMES, TOTAL_STEPS
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, routers
│   │   ├── dependencies.py         # get_supabase, get_current_user
│   │   ├── routers/
│   │   │   ├── applications.py     # /api/applications endpoints
│   │   │   └── sensitive_data.py   # /api/sensitive (SSN encryption)
│   │   ├── services/
│   │   │   ├── application_service.py  # Application CRUD, step management
│   │   │   ├── encryption_service.py   # Fernet encryption for SSN
│   │   │   └── sensitive_data_service.py
│   │   ├── models/
│   │   │   └── application.py      # APPLICATION_STEPS definitions
│   │   └── schemas/
│   │       └── application.py      # Pydantic schemas
│   ├── requirements.txt
│   └── runtime.txt                 # python-3.11.8
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_indexes.sql
│       ├── 003_rls_policies.sql
│       ├── 004_functions.sql
│       ├── 005_triggers.sql
│       ├── 006_storage.sql
│       ├── 007_seed_data.sql
│       ├── 008_sensitive_data.sql
│       └── 009_fix_rls_recursion.sql  # IMPORTANT: Fixes auth spinning issue
└── Session/
    └── CONTEXT.md                  # This file
```

---

## Environment Variables

### Cloudflare Pages
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_API_URL=https://medi-vault-api.onrender.com/api
```

### Render (Backend)
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
SUPABASE_ANON_KEY=eyJhbGci...
CORS_ORIGINS=https://medi-vault.pages.dev
ENCRYPTION_KEY=<generated-fernet-key>
```

---

## Current State (March 29, 2026)

### What's Working

1. **Authentication**
   - Signup with email confirmation
   - Login/logout
   - Profile auto-creation via database trigger
   - Session persistence (with some caveats - see Known Issues)

2. **Application Wizard (22 Steps)**
   - Steps 1-10: Personal info, emergency contact, education, references, work history, preferences, agreements
   - Steps 11-17: Document uploads (can be skipped with "I'll upload later")
   - Steps 18-22: Final agreements and signature
   - Progress tracking, step navigation, save & exit

3. **Application Lifecycle**
   - `in_progress` → Wizard is editable
   - `submitted` → Wizard shows read-only view, uploads via Dashboard modal
   - `under_review` → Same as submitted
   - `approved` → Same, but with congratulations message
   - `rejected` → Read-only, no upload buttons

4. **Dashboard**
   - Shows application progress
   - Documents table with status (Uploaded, Needed, Optional, Expired)
   - Yellow highlighting for required missing docs
   - Upload modal for submitted applications
   - Smart button: Start/Continue/View Application based on status

5. **Backend API**
   - `GET /api/applications/me` - Get or create user's application
   - `POST /api/applications/{id}/steps` - Save step data
   - `POST /api/applications/{id}/submit` - Submit application
   - Steps 11-17 can be updated even after submission (for document uploads)

### What's NOT Working / Known Issues

1. **Auth Spinning on Hard Refresh**
   - Sometimes the app spins indefinitely on page reload
   - Root cause was RLS policy recursion (migration 009 fixes this)
   - **MUST RUN migration 009_fix_rls_recursion.sql in Supabase SQL Editor**
   - Added 5-second timeout as fallback, but the RLS fix is required

2. **File Uploads Not Actually Uploading**
   - The UI captures file metadata (name, size)
   - But files are NOT being uploaded to Supabase Storage yet
   - DocumentUploadModal saves metadata only
   - **TODO:** Implement actual file upload to Supabase Storage

3. **SSN Encryption**
   - Backend endpoints exist (`/api/sensitive/ssn`)
   - Frontend SSNInput component exists
   - Not fully integrated into the application flow

4. **Admin Panel**
   - Pages exist but are mostly placeholders
   - Pipeline, employee management, compliance views need work

---

## Database Schema (Key Tables)

### profiles
```sql
id UUID PRIMARY KEY (matches auth.users.id)
email TEXT
first_name TEXT
last_name TEXT
phone TEXT
role TEXT ('applicant', 'admin', 'superadmin')
avatar_url TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### applications
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
status TEXT ('in_progress', 'submitted', 'under_review', 'approved', 'rejected')
current_step INTEGER
total_steps INTEGER (22)
submitted_at TIMESTAMPTZ
reviewed_at TIMESTAMPTZ
reviewed_by UUID
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### application_steps
```sql
id UUID PRIMARY KEY
application_id UUID REFERENCES applications(id)
step_number INTEGER (1-22)
step_name TEXT
step_type TEXT ('form', 'agreement', 'upload')
is_completed BOOLEAN
data JSONB
completed_at TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### Key RLS Policies
- Users can only read/write their own profile, application, and steps
- `is_admin()` function (SECURITY DEFINER) checks admin role without recursion
- Migration 009 fixed the recursive RLS issue

---

## Application Steps (22 Total)

| # | Name | Type | Notes |
|---|------|------|-------|
| 1 | Application Basics | form | |
| 2 | Personal Information | form | Includes SSN input |
| 3 | Emergency Contact | form | |
| 4 | Education | form | |
| 5 | Reference 1 | form | |
| 6 | Reference 2 | form | |
| 7 | Employment History | form | |
| 8 | Work Preferences | form | |
| 9 | Confidentiality Agreement | agreement | |
| 10 | E-Signature Agreement | agreement | |
| 11 | Work Authorization | upload | Required, can skip |
| 12 | ID Front | upload | Required, can skip |
| 13 | ID Back | upload | Required, can skip |
| 14 | Social Security Card | upload | Required, can skip |
| 15 | Credentials | upload | Optional, can skip |
| 16 | CPR Certification | upload | Optional, can skip |
| 17 | TB Test | upload | Optional, can skip |
| 18 | Orientation Training | agreement | |
| 19 | Criminal Background | agreement | |
| 20 | VA Code Disclosure | agreement | |
| 21 | Job Description | agreement | |
| 22 | Final Signature | agreement | |

---

## Key Files to Know

### Frontend
- `frontend/src/contexts/AuthContext.tsx` - Auth state, login/logout, profile fetching
- `frontend/src/hooks/useApplication.ts` - Application wizard state management
- `frontend/src/pages/applicant/DashboardPage.tsx` - Main applicant dashboard
- `frontend/src/pages/applicant/ApplicationPage.tsx` - Wizard or read-only view
- `frontend/src/components/application/WizardShell.tsx` - Wizard UI wrapper
- `frontend/src/components/application/StepRenderer.tsx` - Renders correct step component
- `frontend/src/components/application/steps/*.tsx` - Individual step components
- `frontend/src/components/applicant/DocumentUploadModal.tsx` - Upload modal for dashboard

### Backend
- `backend/app/main.py` - FastAPI app setup
- `backend/app/routers/applications.py` - Application endpoints
- `backend/app/services/application_service.py` - Business logic

### Database
- `supabase/migrations/009_fix_rls_recursion.sql` - MUST BE RUN to fix auth issues

---

## Immediate TODOs for Next Session

1. **Verify RLS Fix** - Confirm migration 009 was run and auth works on hard refresh
2. **Implement File Uploads** - Actually upload files to Supabase Storage
3. **Test Full Flow** - Create account → Complete 22 steps → Submit → Upload missing docs
4. **Fix Any Build Errors** - Check Cloudflare/Render logs

---

## Useful Commands

```bash
# Local development (if needed)
cd frontend && npm install && npm run dev
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Check Supabase
# Go to Supabase Dashboard → SQL Editor
# Run: SELECT * FROM profiles WHERE email = 'your@email.com';

# Make user admin
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Contact/Context

- **Developer:** Micaiah
- **Company:** Eveready HomeCare
- **QuickBase System:** systemsshark.quickbase.com (legacy system being replaced)
- **Locations:** Arlington, Dumfries, Sterling, Hampton (Virginia)
