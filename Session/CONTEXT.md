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
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS | Cloudflare Pages | https://medisvault.com |
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
│   │   │   ├── admin/              # ApplicantDetailPanel (slide-out)
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
│   │   │   ├── auth/               # Login, Signup, ResetPassword
│   │   │   └── public/             # ApplyPage (multi-step signup)
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
│   │   │   ├── admin.py            # /api/admin/dashboard, /api/admin/pipeline
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
│       ├── ...
│       └── 010c_invitations_rls.sql
└── Session/
    ├── CONTEXT.md                  # This file
    └── LOG.md                      # Development log
```

---

## Current State (March 29, 2026)

### What's Working

1. **Authentication**
   - Signup with email confirmation
   - Login/logout
   - Profile auto-creation via database trigger
   - Multi-step apply page with location selection

2. **Application Wizard (22 Steps) - UPDATED**
   - All form fields now match QuickBase application form
   - Steps 1-10: Personal info, emergency contact, education, references, work history, preferences, agreements
   - Steps 11-17: Document uploads (can be skipped with "I'll upload later")
   - Steps 18-22: Final agreements and signature
   - Progress tracking, step navigation, save & exit

3. **Admin Panel - UPDATED**
   - Pipeline page with slide-out detail panel (like QuickBase mockup)
   - Stats cards: New Today, Awaiting Docs, Ready for Review, This Week
   - Applicant table with clickable rows
   - Detail panel shows: quick info grid, action buttons, onboarding status

4. **File Uploads to Supabase Storage**
   - Upload happens on "Next" click
   - Files stored in local React state until user commits
   - Signed URLs generated with 1-year expiry

5. **Backend API**
   - CORS fixed to allow medisvault.com
   - Admin dashboard/pipeline endpoints working
   - Global error handler with CORS headers

---

## Application Form Fields (Updated March 29, 2026)

### Step 1: Application Basics
- Position applied for (PCA/HHA/CNA/LPN/RN)
- Employment type (Full-time/Part-time/Fill-in/Live-in)
- Desired hourly rate
- Desired start date
- **Legal Requirements:**
  - Are you 18 or older? (with validation)
  - Convicted of violent crime?
  - Background check consent (required)
- **Citizenship:**
  - Citizenship status (for I-9)
  - Eligible to work in US?
- **Languages:**
  - Primary language
  - Other languages (multi-select)
- How heard about us
- Worked for Eveready before?

### Step 2: Personal Information
- First name, Middle name, Last name
- Other names used (with "I have no other names" checkbox) - **required for I-9**
- Date of birth (with **18+ age validation**)
- SSN (encrypted)
- Gender
- Address (street, city, state dropdown, zip)
- Phone, Alt phone, Email

### Step 3: Emergency Contact
- Name, Relationship, Phone, Alt phone, Email, Address

### Step 4: Education
- High school graduate?
- Highest education level
- School name, Year graduated
- **Certifications** (multi-checkbox: HHA/CNA/PCA/LPN/RN/None)
- CPR certification?
- TB test in past year?
- Licensed driver?
- Eligible to work in US?
- **Skills:**
  - Will travel 30 min?
  - Catheter care?
  - Vital signs?
  - Bed bound patients? (Yes/No/Conditional)
  - Additional skills (textarea)

### Steps 5-6: References
- Reference 1: Name, Relationship, Phone, Email, Years known
- Reference 2: Same fields
- **Optional Reference 3** (checkbox to add)
- **Consent to contact references** (required radio)

### Step 7: Employment History
- **Currently employed?** (Yes/No with conditional fields)
  - Current employer, supervisor, phone, start date
  - May we contact current employer?
- Previous Employer 1 (required)
- Previous Employer 2 (with "I don't have a 2nd employer" checkbox)
- Can add up to 3 previous employers

### Step 8: Work Preferences
- Available days (multi-select chips)
- Shift preferences (multi-checkbox: Morning/Afternoon/Evening/Overnight)
- **Work every other weekend?** (required)
- Hours per week preference (dropdown)
- Has reliable transportation?
- Maximum travel distance
- **Comfortable with pets?** (dropdown with detailed options)
- **Comfortable with smokers?** (dropdown)
- **Conditions NOT willing to work with** (required textarea)

### Steps 9-10: Agreements
- Confidentiality Agreement
- E-Signature Agreement

### Steps 11-17: Document Uploads
- Work Authorization, ID Front/Back, SSN Card, Credentials, CPR Cert, TB Test

### Steps 18-22: Final Agreements
- Orientation Training, Criminal Background, VA Code Disclosure, Job Description, Final Signature

---

## Recent Changes (March 29, 2026)

### Application Form Fields Overhaul
1. **ApplicationBasics.tsx** - Added all legal/citizenship/language fields
2. **PersonalInfo.tsx** - Added "other names" logic with checkbox, age validation
3. **Education.tsx** - Added certifications multi-checkbox, skills section
4. **Reference1.tsx** - Simplified layout
5. **Reference2.tsx** - Added optional 3rd reference, consent to contact
6. **WorkPreferences.tsx** - Added pets, smokers, weekend, conditions fields
7. **EmploymentHistory.tsx** - Added "currently employed" section, restructured

### Admin Panel
- Added ApplicantDetailPanel.tsx (slide-out panel)
- Updated PipelinePage.tsx with stats cards and table layout

### Bug Fixes
- CORS fixed for medisvault.com domain
- Admin dashboard column name fixes (expiration_date vs expires_at)

---

## Immediate TODOs

1. **Test full application flow** - Create test applicant, go through all 22 steps
2. **Google Places autocomplete** - For address fields
3. **Verify all form validations** - Age check, required fields
4. **Admin detail view** - Full applicant review page

---

## Useful Commands

```bash
# Make user admin in Supabase
UPDATE profiles SET role = 'superadmin' WHERE email = 'your@email.com';

# Check uploaded files
# Supabase Dashboard → Storage → documents bucket

# Wipe test data (keep your account)
DELETE FROM application_steps;
DELETE FROM applications;
DELETE FROM profiles WHERE email != 'your@email.com';
```

---

## Contact/Context

- **Developer:** Micaiah
- **Company:** Eveready HomeCare
- **QuickBase System:** systemsshark.quickbase.com (legacy system being replaced)
- **Locations:** Arlington, Dumfries, Sterling, Hampton (Virginia)
