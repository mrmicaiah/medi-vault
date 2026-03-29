# mediVault Applicant Journey
## Complete Application & Onboarding Experience

---

## Overview

The applicant experience is a **single fluid, guided, resumable journey**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        APPLICANT JOURNEY                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐    ┌──────────────────────────────┐    ┌──────────────┐   │
│  │ CREATE   │───▶│      SINGLE FLUID APP        │───▶│  APPLICANT   │   │
│  │ ACCOUNT  │    │  (20 steps, save as you go)  │    │  DASHBOARD   │   │
│  └──────────┘    └──────────────────────────────┘    └──────────────┘   │
│                              │                                           │
│                              ▼                                           │
│                  ┌──────────────────────────────┐                       │
│                  │   CAN QUIT & RESUME ANYTIME  │                       │
│                  └──────────────────────────────┘                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Design Principles

### 1. Constant Communication
- Every screen explains what's happening and why
- Upload progress shown in real-time
- Success confirmations with "what's next" preview
- Help links throughout ("Need help?", "Why do we need this?")

### 2. Chunked Processing
- Upload 1-2 documents at a time maximum
- Backend processes while user reads next instructions
- Never batch uploads at the end

### 3. Resumable at Any Point
- Progress saved after every step
- Dashboard shows completion status
- Clear "Continue where you left off" experience

### 4. Individual Signed PDFs
- Each legal agreement generates its own PDF
- Timestamped with signature
- Automatically stored for audits

---

## Applicant Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  EVEREADY HOMECARE                           [Profile] [Logout] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Welcome back, Maria!                                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ YOUR APPLICATION                                           │ │
│  │                                                             │ │
│  │  ████████████████████████████░░░░  85% Complete            │ │
│  │                                                             │ │
│  │  Status: Submitted - Under Review                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ⚠️  DOCUMENTS EXPIRING SOON                                │ │
│  │                                                             │ │
│  │  CPR Certification          Expires: Apr 15, 2026          │ │
│  │  [Upload New CPR Certificate]                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ YOUR DOCUMENTS                                       ✓     │ │
│  │                                                             │ │
│  │  IDENTITY                                                   │ │
│  │  ✓ Driver's License (Front)         Exp: 2028-06-15       │ │
│  │  ✓ Driver's License (Back)                                 │ │
│  │  ✓ Social Security Card                                    │ │
│  │  ✓ Birth Certificate                                       │ │
│  │                                                             │ │
│  │  CREDENTIALS                                                │ │
│  │  ✓ CNA License                       Exp: 2027-03-15       │ │
│  │                                                             │ │
│  │  HEALTH                                                     │ │
│  │  ⚠ CPR Certification                 Exp: 2026-04-15       │ │
│  │  ✓ TB Test                           Exp: 2026-12-01       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Application Flow (20 Steps)

### Step Overview

```
ACCOUNT CREATION
     ↓
APPLICATION FORM (Steps 1-8)
├── Step 1: Application Basics
├── Step 2: Personal Information
├── Step 3: Emergency Contact
├── Step 4: Education & Qualifications
├── Step 5: References (Reference 1)
├── Step 6: References (Reference 2)
├── Step 7: Employment History
└── Step 8: Work Preferences
     ↓
AGREEMENTS (Steps 9-10)
├── Step 9: Confidentiality Agreement → [GENERATES SIGNED PDF]
└── Step 10: Electronic Signatures Agreement → [GENERATES SIGNED PDF]
     ↓
DOCUMENT UPLOADS (Steps 11-17)
├── Step 11: Work Authorization Document → [UPLOAD]
├── Step 12: Identity Document (Front) → [UPLOAD]
├── Step 13: Identity Document (Back) → [UPLOAD]
├── Step 14: Social Security Card → [UPLOAD]
├── Step 15: Professional Credentials → [UPLOAD or "Not Yet"]
├── Step 16: CPR Certification → [UPLOAD or "Not Yet"]
└── Step 17: TB Test Results → [UPLOAD or "Not Yet"]
     ↓
FINAL AGREEMENTS (Steps 18-20)
├── Step 18: Orientation Training → [GENERATES SIGNED PDF]
├── Step 19: Criminal Background Attestation → [GENERATES SIGNED PDF]
├── Step 20: Virginia Code Disclosure → [GENERATES SIGNED PDF]
├── Step 21: Job Description Acknowledgment → [GENERATES SIGNED PDF]
└── Step 22: Final Signature → [GENERATES MASTER SIGNED PDF]
     ↓
COMPLETE! → APPLICANT DASHBOARD
```

---

## Document Upload UX Pattern

### Upload Screen
```
┌─────────────────────────────────────────────────────────────────┐
│  Step 14 of 22                             [Save & Exit]        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░  64%                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SOCIAL SECURITY CARD                                           │
│                                                                 │
│  We need a clear photo of the front of your Social Security     │
│  card to verify your identity and work authorization.           │
│                                                                 │
│  [? Why do we need this?]                                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │           📄                                             │   │
│  │                                                          │   │
│  │     Drag and drop your file here                        │   │
│  │              or                                          │   │
│  │     [  Choose File  ]                                   │   │
│  │                                                          │   │
│  │     Accepted: JPG, PNG, PDF (max 10MB)                  │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💡 TIPS FOR A GOOD PHOTO:                                      │
│  • Use good lighting (no shadows)                               │
│  • Keep the card flat and straight                              │
│  • Make sure all text is readable                               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│    [← Back]                         [Upload & Continue →]       │
└─────────────────────────────────────────────────────────────────┘
```

### Upload Complete
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │     ✓ Upload Complete!                                   │   │
│  │                                                          │   │
│  │     Your Social Security Card has been                   │   │
│  │     securely uploaded and saved.                         │   │
│  │                                                          │   │
│  │     ┌──────────────┐                                    │   │
│  │     │  [thumbnail] │  SSN_Card_Front.jpg                │   │
│  │     │              │  Uploaded just now                  │   │
│  │     └──────────────┘                                    │   │
│  │                                                          │   │
│  │     [Replace Document]                                   │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💡 COMING UP NEXT:                                             │
│  You'll upload your professional credentials                    │
│  (HHA, CNA, PCA, LPN, or RN certificate)                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│    [← Back]                              [Continue →]           │
└─────────────────────────────────────────────────────────────────┘
```

---

## PDFs Generated (7 Total)

| PDF | Step | Filename Pattern |
|-----|------|------------------|
| Confidentiality Agreement | 9 | `{Last}_{First}_Confidentiality_YYYY-MM-DD.pdf` |
| Electronic Signature Consent | 10 | `{Last}_{First}_ESignatureConsent_YYYY-MM-DD.pdf` |
| Orientation Acknowledgment | 18 | `{Last}_{First}_Orientation_YYYY-MM-DD.pdf` |
| Criminal Background Attestation | 19 | `{Last}_{First}_CriminalAttestation_YYYY-MM-DD.pdf` |
| VA Code Disclosure | 20 | `{Last}_{First}_VACodeDisclosure_YYYY-MM-DD.pdf` |
| Job Description Acknowledgment | 21 | `{Last}_{First}_JobDescription_YYYY-MM-DD.pdf` |
| Master Onboarding Consent | 22 | `{Last}_{First}_OnboardingConsent_YYYY-MM-DD.pdf` |

---

## Documents Uploaded (7-8 Total)

| Document | Step | Can Skip? |
|----------|------|-----------|
| Work Authorization | 11 | No |
| ID Front | 12 | No |
| ID Back | 13 | No |
| Social Security Card | 14 | No |
| Credentials | 15 | Yes ("Not yet") |
| CPR Certification | 16 | Yes ("Not yet") |
| TB Test | 17 | Yes ("Not yet") |