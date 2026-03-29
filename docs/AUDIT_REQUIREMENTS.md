# mediVault Audit-Ready Document System
## Research Summary: What Auditors Actually Need

---

## Key Findings from Research

### Virginia Home Care Licensure Requirements (12VAC5-381)

**Personnel files must contain:**
1. Application
2. License/certification verification (with expiration dates)
3. Competency evaluation
4. Reference checks / verification of previous employment
5. Criminal record check (from Virginia State Police)
6. Sworn disclosure statement
7. Job description (signed and dated)
8. Orientation checklist
9. Annual training documentation (minimum 12 hours)

### DMAS (Virginia Medicaid) Requirements

**Record Retention:**
- Keep records for **6 years minimum** after services
- If audit initiated, retain until audit complete + all exceptions resolved
- Records of minors: 6 years after they turn 18
- Records must remain in Virginia (or accessible from Virginia)

**Audit Access:**
- DMAS, Attorney General, federal personnel, and Medicaid Fraud Control Unit can request records
- Must "furnish information on request and in the form requested"
- Records must be "easily retrievable"

### Medicare/CMS Audit Triggers

1. No documentation provided when requested
2. Insufficient documentation to support claims
3. Missing signatures
4. Incorrect coding
5. Missing or untimely face-to-face documentation

---

## Two Types of Audits

### 1. Personnel File Audits (Licensure/Compliance)

When an auditor asks: *"Show me the personnel file for Maria Santos"*

They expect to see **everything in one place**, organized by category:

```
Maria Santos
├── Identity & Work Authorization
│   ├── Driver's License (front/back)
│   ├── Social Security Card
│   └── Birth Certificate OR Work Authorization
│
├── Credentials & Certifications
│   ├── CNA License (exp: 2027-03-15)
│   ├── CPR Certification (exp: 2026-08-01)
│   └── TB Test (exp: 2026-12-01)
│
├── Background & Compliance
│   ├── Virginia Criminal Record Check
│   ├── Criminal Background Attestation (signed PDF)
│   ├── VA Code Disclosure - Section 32.1-162.9:1 (signed PDF)
│   └── Sworn Statement
│
├── Employment Documents
│   ├── Application (original submission)
│   ├── Job Description (signed, dated)
│   ├── Confidentiality Agreement (signed PDF)
│   ├── Electronic Signatures Attestation (signed PDF)
│   └── Orientation Acknowledgment (signed PDF)
│
├── Training Records (Future Phase)
│   ├── Annual Training Log
│   └── Competency Evaluations
│
└── Employment History
    ├── Hire Date: 2026-01-15
    ├── Position: CNA
    ├── Location: Arlington
    └── Status: Active
```

### 2. Patient-Centered Audits (Medicare/Medicaid Billing)

When auditors review a **patient claim**, they need to see:
- Did this patient qualify for services?
- Were services medically necessary?
- Who provided the care?
- Was the caregiver qualified at the time they provided care?

**This requires linking patients to caregivers with credential verification:**

```
Patient: Mrs. Johnson
├── Service Period: Jan 1 - Mar 15, 2026
│   └── Caregivers Assigned:
│       ├── Maria Santos (CNA)
│       │   ├── Shifts: 47 visits
│       │   ├── Credentials at time: ✓ CNA (valid), ✓ CPR (valid), ✓ Background (valid)
│       │   └── [View Personnel File as of Jan 2026]
│       │
│       └── James Wilson (HHA)
│           ├── Shifts: 12 visits
│           ├── Credentials at time: ✓ HHA (valid), ✓ CPR (valid), ✓ Background (valid)
│           └── [View Personnel File as of Jan 2026]
```

---

## The "Point-in-Time" Problem

If an auditor asks: *"Was Maria Santos qualified to provide care to Mrs. Johnson on February 15, 2026?"*

You need to prove:
- Maria's CNA was valid on Feb 15, 2026
- Maria's CPR was valid on Feb 15, 2026
- Maria's background check was clear as of Feb 15, 2026

**This means document history matters.** You can't just show current credentials — you need to show what was valid DURING the service period.

---

## Document Categories

| Category | Documents | Expiration Tracked? |
|----------|-----------|---------------------|
| **Identity** | Driver's License, State ID, SSN Card, Birth Certificate, Passport, Work Authorization | Yes (DL, Work Auth) |
| **Credentials** | CNA License, HHA Certificate, PCA Certificate, LPN License, RN License | Yes |
| **Health** | CPR Certification, TB Test, Physical Exam (if required) | Yes |
| **Background** | Criminal Record Check, VA Barrier Crimes Attestation, Sworn Statement, VA Code Disclosure | Background check may need renewal |
| **Agreements** | Confidentiality, E-Signature Attestation, Job Description, Orientation Acknowledgment | No (one-time) |
| **Training** | Annual Training Logs, Competency Evaluations, Specialized Training | Annual requirement |

---

## Audit-Ready Features for mediVault

### 1. One-Click Personnel File Export

**"Export Complete File"** button generates:
- PDF with all documents compiled
- Table of contents with page numbers
- Cover sheet with employee info and document checklist
- All signed agreements included
- Expiration dates highlighted

### 2. Compliance Dashboard (Admin View)

```
┌─────────────────────────────────────────────────────────────────┐
│  COMPLIANCE OVERVIEW                          [Export Report]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │     12      │ │      3      │ │      8      │ │    47     │ │
│  │  Expiring   │ │   Expired   │ │  Missing    │ │   OK      │ │
│  │  (30 days)  │ │   Docs      │ │   Docs      │ │           │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│                                                                 │
│  EXPIRING SOON                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  Maria Santos      CPR Certification     Expires: Apr 15, 2026  │
│  James Wilson      Driver's License      Expires: Apr 22, 2026  │
│  Aisha Johnson     TB Test               Expires: May 01, 2026  │
│  [View All 12...]                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Point-in-Time Queries

```sql
-- Get documents that were effective on a specific date
SELECT 
    d.category,
    d.document_type,
    d.expiration_date,
    CASE 
        WHEN d.expiration_date < '2026-02-15' THEN 'EXPIRED'
        ELSE 'VALID'
    END as validity_on_date
FROM documents d
WHERE d.employee_id = 'maria_employee_id'
  AND d.effective_from <= '2026-02-15'
  AND (d.effective_to IS NULL OR d.effective_to >= '2026-02-15');
```

### 4. Client Audit View

```sql
-- Get all caregivers assigned to a client with their credentials
SELECT 
    e.first_name,
    e.last_name,
    e.position,
    eca.assignment_start,
    eca.assignment_end,
    d.document_type,
    d.expiration_date,
    d.status
FROM employee_client_assignments eca
JOIN employees e ON e.id = eca.employee_id
LEFT JOIN documents d ON d.employee_id = e.id 
    AND d.is_current = true
    AND d.category IN ('credentials', 'health', 'background')
WHERE eca.client_id = 'mrs_johnson_client_id'
ORDER BY eca.assignment_start, e.last_name, d.category;
```

---

## Summary

**For audits, the system must:**

1. ✅ Retrieve a complete personnel file instantly
2. ✅ Show documents organized by category
3. ✅ Track all expiration dates
4. ✅ Alert when documents are expiring (30 days)
5. ✅ Generate compliance reports (bulk)
6. ✅ Maintain version history (don't delete, archive)
7. ✅ Export to PDF for submission
8. ✅ Include signed agreements with timestamps
9. ✅ Link employees to clients with assignment dates
10. ✅ Support point-in-time credential verification