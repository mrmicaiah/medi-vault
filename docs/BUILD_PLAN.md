# mediVault Build Plan v3
## Home Care Agency Management Platform — Final Architecture

---

## Executive Summary

mediVault is a comprehensive applicant-to-employee management platform for home care agencies. Starting with Eveready HomeCare's four Virginia locations as the pilot, with plans to sell to other agencies as SaaS.

**Core Philosophy:**
- One fluid, beautiful application experience (not two phases)
- Applicants are real users with accounts and dashboards
- Documents stored in YOUR database (Supabase Storage, not OneDrive)
- Upload documents one at a time with real-time feedback
- Each legal agreement generates its own signed PDF
- Audit-ready from day one with document versioning
- Client assignment tracking for billing audit compliance

---

## Tech Stack (Final)

| Layer | Technology | Purpose |
|-------|------------|----------|
| **Frontend** | React 18 + TypeScript + Vite | Type-safe UI |
| **Styling** | Tailwind CSS | Utility-first, matches design system |
| **Fonts** | Outfit (display) + Inter (body) | Premium typography |
| **Backend API** | Python 3.11 + FastAPI | Business logic, PDF generation |
| **Database** | Supabase (PostgreSQL) | Managed Postgres with RLS |
| **Auth** | Supabase Auth | JWT, secure sessions, password reset |
| **File Storage** | Supabase Storage | All documents stored here |
| **PDF Generation** | WeasyPrint + Jinja2 | Signed agreements, exports |
| **Hosting (API)** | Render | Python service |
| **Hosting (Frontend)** | Cloudflare Pages | Global edge network, 300+ locations |
| **Email** | SendGrid or Resend | Notifications, reminders |
| **Code Repository** | GitHub (`medi-vault`) | Version control |
| **Frontend CI/CD** | Cloudflare native GitHub integration | Auto-deploy on push (not GitHub Actions) |
| **Backend CI/CD** | Render native GitHub integration | Auto-deploy on push |

---

## Deployment Architecture

```
GitHub Repository: medi-vault
│
├── /frontend          ──→  Cloudflare Pages (native integration)
│                            • Auto-builds on push to main
│                            • Preview deployments on PRs
│                            • Global edge distribution
│
├── /backend           ──→  Render (native integration)
│                            • Auto-deploys on push to main
│                            • Python/FastAPI service
│
└── /supabase          ──→  Manual SQL execution
                             • Claude Code provides SQL
                             • You run in Supabase Dashboard
                             • Migrations tracked in repo
```

### Why This Setup?

1. **Cloudflare Pages** — 300+ edge locations, enterprise security, predictable costs, you already have it
2. **Native integrations** — No GitHub Actions complexity; both Cloudflare and Render connect directly to GitHub
3. **SQL delegation** — Claude Code cannot execute SQL in Supabase directly; it will provide migration files for you to run

### SQL Workflow During Build

Since Claude Code cannot connect to Supabase directly:

```
1. Claude Code creates:     /supabase/migrations/001_initial_schema.sql
2. Claude Code says:        "Run this SQL in Supabase Dashboard → SQL Editor"
3. You copy/paste and run
4. You confirm:             "Done"
5. Claude Code continues building
```

This keeps migrations version-controlled in the repo while giving you full control over database changes.

---

## Design System

### Colors
```css
:root {
  /* Primary */
  --navy: #0f172a;
  --navy-light: #1e293b;
  
  /* Accent */
  --maroon: #6b1c35;
  --maroon-light: #8a2846;
  --maroon-subtle: #fdf2f4;
  
  /* Neutrals */
  --slate: #334155;
  --gray: #64748b;
  --gray-light: #94a3b8;
  --border: #e2e8f0;
  --bg: #f8fafc;
  --white: #ffffff;
  
  /* Status */
  --success: #059669;
  --success-bg: #ecfdf5;
  --warning: #d97706;
  --warning-bg: #fffbeb;
  --error: #dc2626;
  --error-bg: #fef2f2;
  --info: #0284c7;
  --info-bg: #f0f9ff;
}
```

### Typography
```css
/* Display (headers, titles) */
font-family: 'Outfit', sans-serif;
font-weight: 700 | 600 | 500;

/* Body (text, labels, inputs) */
font-family: 'Inter', sans-serif;
font-weight: 600 | 500 | 400;
```

---

## Infrastructure Costs

### Phase 1
| Service | Tier | Monthly Cost |
|---------|------|---------------|
| Supabase | Pro | $25 |
| Render (API) | Starter | $7 |
| Cloudflare Pages | Free | $0 |
| SendGrid | Free tier | $0 |
| **Total** | | **~$32/mo** |

### Phase 2 (HIPAA Required)
| Service | Tier | Monthly Cost |
|---------|------|---------------|
| Supabase Team + HIPAA | | ~$950 |
| Render Pro | | $25 |
| Cloudflare Pages | Free/Pro | $0-20 |
| **Total** | | **~$975-995/mo** |

---

## Build Phases

### Phase 1: Complete Applicant System (8-10 weeks)

**Sprint 1-2: Foundation**
- [ ] Create GitHub repo `medi-vault`
- [ ] Set up Supabase project
- [ ] Claude Code provides SQL migrations → You run in Supabase Dashboard
- [ ] FastAPI backend scaffold
- [ ] Auth system (Supabase Auth)
- [ ] Connect Render to GitHub (backend auto-deploy)
- [ ] Connect Cloudflare Pages to GitHub (frontend auto-deploy)

**SQL Delegation Workflow:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Code creates: /supabase/migrations/001_schema.sql      │
│                                                                 │
│  Claude Code says:                                              │
│  "Please run this SQL in Supabase Dashboard → SQL Editor.       │
│   Let me know when complete."                                   │
│                                                                 │
│  You: [Copy SQL] → [Paste in Supabase] → [Run] → "Done"        │
│                                                                 │
│  Claude Code continues building...                              │
└─────────────────────────────────────────────────────────────────┘
```

**Sprint 3-4: Applicant Portal**
- [ ] Account creation / login / password reset
- [ ] Application wizard (all 20 steps)
- [ ] Progress saving
- [ ] Applicant dashboard

**Sprint 5-6: Document System**
- [ ] Document upload with real-time feedback
- [ ] Supabase Storage integration
- [ ] Document versioning
- [ ] Expiration tracking

**Sprint 7-8: Agreements & PDFs**
- [ ] Agreement templates (need full text from you)
- [ ] PDF generation (signed agreements)
- [ ] Email notifications

**Sprint 9-10: Admin Portal**
- [ ] Applicant pipeline view
- [ ] Employee file view
- [ ] Hire flow with client assignment
- [ ] Compliance dashboard
- [ ] Export functionality

### Phase 2: Client Management & EVV (Future)

- Full client records (beyond nickname)
- Visit tracking / scheduling
- EVV integration (Virginia Sandata)
- Billing preparation

---

## Documents Summary

### Uploaded by Applicant (8 files)
1. Work Authorization (Birth Cert / Passport / Naturalization / Work Auth)
2. ID Front (Driver's License or State ID)
3. ID Back
4. Social Security Card
5. Credentials Certificate (or skip if not yet)
6. CPR Certification (or skip if not yet)
7. TB Test Results (or skip if not yet)

### Generated Signed PDFs (7 files)
1. Confidentiality Agreement
2. Electronic Signatures Attestation
3. Orientation Training Acknowledgment
4. Criminal Background Attestation
5. Virginia Code Disclosure
6. Job Description Acknowledgment
7. Master Onboarding Consent