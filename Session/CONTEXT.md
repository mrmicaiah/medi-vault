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
| File Storage | Supabase Storage | Supabase | `documents` bucket |

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
│   │   │   └── useApplication.ts   # Application wizard state + file uploads
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
│       ├── 006_storage.sql         # Documents & agreements buckets + RLS
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

3. **File Uploads to Supabase Storage** ✅ (Implemented March 29, 2026)
   - **Upload happens on "Next" click** - not on file selection
   - Files stored in local React state (`pendingFiles`) until user commits
   - `useApplication.ts` hook handles upload when `saveStep()` is called
   - Files organized by: `{user_id}/{step_folder}/{timestamp}_{filename}`
   - Step folders: work-authorization, id-front, id-back, ssn-card, credentials, cpr-certification, tb-test
   - Saves metadata: file_name, file_size, file_type, storage_path, storage_url, uploaded_at
   - Signed URLs generated with 1-year expiry
   - No orphaned files - upload only happens when user explicitly proceeds

4. **Application Lifecycle**
   - `in_progress` → Wizard is editable
   - `submitted` → Wizard shows read-only view, uploads via Dashboard modal
   - `under_review` → Same as submitted
   - `approved` → Same, but with congratulations message
   - `rejected` → Read-only, no upload buttons

5. **Dashboard**
   - Shows application progress
   - Documents table with status (Uploaded, Needed, Optional, Expired)
   - Yellow highlighting for required missing docs
   - Upload modal for submitted applications
   - Smart button: Start/Continue/View Application based on status

6. **Backend API**
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

2. **SSN Encryption**
   - Backend endpoints exist (`/api/sensitive/ssn`)
   - Frontend SSNInput component exists
   - Not fully integrated into the application flow

3. **Admin Panel**
   - Pages exist but are mostly placeholders
   - Pipeline, employee management, compliance views need work

---

## File Upload Architecture

### Flow (Wizard Steps 11-17)
```
1. User selects file
   └─> File stored in pendingFiles[stepNumber] (React state)
   └─> UI shows: "File will be uploaded when you click Next"

2. User clicks "Next" (or "Save & Exit")
   └─> ApplicationPage.handleNext() calls saveStep()
   └─> useApplication.saveStep() detects pending file
   └─> Upload to Supabase Storage: documents/{userId}/{folder}/{timestamp}_{filename}
   └─> Get signed URL (1-year expiry)
   └─> Save step data with file metadata to API
   └─> Clear pendingFile for that step
   └─> Move to next step

3. User changes mind before clicking Next
   └─> Select different file → replaces pendingFile (no upload wasted)
   └─> Check "I'll upload later" → clears pendingFile
```

### Flow (Dashboard Upload Modal - after submission)
```
1. User clicks "Upload" on dashboard
   └─> DocumentUploadModal opens

2. User selects file and fills form
   └─> File stored in local state

3. User clicks "Upload Document"
   └─> Upload to Supabase Storage
   └─> Save step data with metadata
   └─> Close modal, refresh dashboard
```

### Key Files
- `useApplication.ts` - `pendingFiles` state, `setPendingFile()`, `saveStep()` with upload logic
- `ApplicationPage.tsx` - `handleFileSelect()` calls `setPendingFile(currentStep, file)`
- `StepRenderer.tsx` - Passes `onFileSelect` and `pendingFile` to upload step components
- `WizardShell.tsx` - Displays pending file indicator, validates file presence
- `steps/*.tsx` (11-17) - Use `onFileSelect` prop, show "will upload on Next" message

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
data JSONB  -- Contains file metadata for upload steps
completed_at TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### Supabase Storage
- **Bucket:** `documents` (private)
- **Structure:** `{user_id}/{step_folder}/{timestamp}_{filename}`
- **RLS:** Users can only access their own files, admins can read all

### Key RLS Policies
- Users can only read/write their own profile, application, and steps
- `is_admin()` function (SECURITY DEFINER) checks admin role without recursion
- Migration 009 fixed the recursive RLS issue

---

## Application Steps (22 Total)

| # | Name | Type | Storage Folder |
|---|------|------|----------------|
| 1 | Application Basics | form | - |
| 2 | Personal Information | form | - |
| 3 | Emergency Contact | form | - |
| 4 | Education | form | - |
| 5 | Reference 1 | form | - |
| 6 | Reference 2 | form | - |
| 7 | Employment History | form | - |
| 8 | Work Preferences | form | - |
| 9 | Confidentiality Agreement | agreement | - |
| 10 | E-Signature Agreement | agreement | - |
| 11 | Work Authorization | upload | work-authorization |
| 12 | ID Front | upload | id-front |
| 13 | ID Back | upload | id-back |
| 14 | Social Security Card | upload | ssn-card |
| 15 | Credentials | upload | credentials |
| 16 | CPR Certification | upload | cpr-certification |
| 17 | TB Test | upload | tb-test |
| 18 | Orientation Training | agreement | - |
| 19 | Criminal Background | agreement | - |
| 20 | VA Code Disclosure | agreement | - |
| 21 | Job Description | agreement | - |
| 22 | Final Signature | agreement | - |

---

## Recent Changes (March 29, 2026)

### File Upload Implementation - Proper "Upload on Next" Flow
1. **`useApplication.ts`** - Added `pendingFiles` state
   - `setPendingFile(stepNumber, file)` - Store file locally
   - `getPendingFile(stepNumber)` - Get pending file for display
   - `saveStep()` - Uploads pending file before saving step data

2. **Upload step components** (WorkAuthorization, IDFront, IDBack, etc.)
   - Now accept `onFileSelect` and `pendingFile` props
   - Call `onFileSelect(file)` when user picks a file (no immediate upload)
   - Show "File will be uploaded when you click Next" message

3. **`WizardShell.tsx`** - Updated validation
   - Checks for either `pendingFile` OR existing `file_name` in step data
   - Shows pending file indicator in UI

4. **`ApplicationPage.tsx`** - Wires everything together
   - Passes `setPendingFile` as `onFileSelect` to wizard
   - Shows "File selected - click Next to upload" indicator

---

## Immediate TODOs for Next Session

1. **Verify RLS Fix** - Confirm migration 009 was run and auth works on hard refresh
2. ~~**Implement File Uploads**~~ ✅ Done - Files upload on "Next" click
3. **Test Full Flow** - Create account → Complete 22 steps → Submit → Upload missing docs
4. **Fix Any Build Errors** - Check Cloudflare/Render logs after deploy
5. **Admin Panel** - View uploaded documents, review applications

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

# Check uploaded files
# Supabase Dashboard → Storage → documents bucket
```

---

## Contact/Context

- **Developer:** Micaiah
- **Company:** Eveready HomeCare
- **QuickBase System:** systemsshark.quickbase.com (legacy system being replaced)
- **Locations:** Arlington, Dumfries, Sterling, Hampton (Virginia)
