# Quickbase to MediVault Data Migration Guide

## Overview

This document maps Quickbase fields to MediVault database tables and identifies what data needs to be migrated vs. what will be entered fresh by users.

---

## Migration Strategy Summary

| Data Type | Action | Notes |
|-----------|--------|-------|
| **User accounts** | CREATE in Supabase Auth | Use migration script with password reset |
| **Profile data** | INSERT into `profiles` | Basic info only |
| **Employee records** | INSERT into `employees` | For hired staff |
| **Application data** | SKIP or MINIMAL | Users will re-enter in new format |
| **Documents** | UPLOAD to Storage | Map to new structure |

---

## Table: profiles

Maps Quickbase person records to MediVault profiles.

| MediVault Field | Quickbase Field | Type | Required | Notes |
|-----------------|-----------------|------|----------|-------|
| `id` | (generated) | UUID | Yes | Auto-generated, links to auth.users |
| `email` | Email | text | Yes | Must be unique |
| `first_name` | First Name | text | Yes | |
| `last_name` | Last Name | text | Yes | |
| `phone` | Phone / Cell Phone | text | No | |
| `role` | Status | enum | Yes | See mapping below |
| `agency_id` | (constant) | UUID | Yes | Always Eveready: `a0000000-0000-0000-0000-000000000001` |
| `avatar_url` | (none) | text | No | Leave null |
| `created_at` | Date Created | timestamp | Auto | Use Quickbase date or now() |

### Role Mapping

| Quickbase Status | MediVault Role |
|------------------|----------------|
| Applicant, Pending, In Progress | `applicant` |
| Active, Hired, Current | `employee` |
| Admin, Administrator, Staff | `admin` |
| Inactive, Terminated, Former | `employee` (with employee.status = 'terminated') |

---

## Table: employees

Only for people who have been hired.

| MediVault Field | Quickbase Field | Type | Required | Notes |
|-----------------|-----------------|------|----------|-------|
| `id` | (generated) | UUID | Auto | |
| `user_id` | (from profiles) | UUID | Yes | FK to profiles |
| `application_id` | (none) | UUID | No | Leave null for migrated users |
| `employee_number` | Employee ID / Badge # | text | No | If you have one |
| `position` | Position / Title | text | Yes | Default: "Caregiver" |
| `location_id` | Office / Location | UUID | No | Map to locations table |
| `hire_date` | Hire Date / Start Date | date | Yes | |
| `termination_date` | Term Date | date | No | If terminated |
| `status` | Status | enum | Yes | active, inactive, terminated, on_leave |
| `pay_rate` | Pay Rate | decimal | No | |
| `notes` | Notes | text | No | |

### Location Mapping

| Quickbase Location | MediVault location_id |
|--------------------|----------------------|
| Dumfries | (lookup from locations where slug='dumfries') |
| Arlington | (lookup from locations where slug='arlington') |
| Sterling | (lookup from locations where slug='sterling') |
| Hampton | (lookup from locations where slug='hampton') |

---

## Table: applications

**Recommendation: DO NOT migrate full applications.**

Why:
1. Quickbase likely has different data structure than 22-step wizard
2. Signed agreements need proper audit trails
3. Users can complete fresh applications quickly
4. Cleaner data in new system

### Alternative: Create "completed" applications for employees

For hired employees, create a minimal application record:

```sql
INSERT INTO applications (user_id, status, current_step, total_steps, submitted_at)
VALUES ('{user_id}', 'hired', 22, 22, '{hire_date}');
```

---

## Table: documents

Documents need to be:
1. Uploaded to Supabase Storage
2. Records created in `documents` table

| MediVault Field | Source | Notes |
|-----------------|--------|-------|
| `id` | (generated) | UUID |
| `user_id` | (from profiles) | FK |
| `application_id` | (optional) | Can be null for migrated docs |
| `category` | OneDrive folder | identity, credentials, health, etc. |
| `document_type` | File name / folder | cna_license, drivers_license, etc. |
| `original_filename` | OneDrive file name | |
| `storage_path` | New path | `{user_id}/{category}/{filename}` |
| `expiration_date` | Quickbase if tracked | For licenses/certifications |
| `is_current` | true | |
| `version` | 1 | |

### Category Mapping (OneDrive → MediVault)

| OneDrive Folder | MediVault Category | document_type examples |
|-----------------|-------------------|------------------------|
| Identity | `identity` | drivers_license, passport, ssn_card |
| Credentials | `credentials` | cna_license, cpr_cert, first_aid |
| Application | `background` | background_check, reference_letter |
| Health / Medical | `health` | tb_test, physical_exam |
| Training | `training` | orientation_cert, hipaa_cert |

---

## Table: application_steps

**DO NOT migrate.** These are created automatically when a user starts a new application.

---

## Table: agreements

**DO NOT migrate.** Signed agreements need proper e-signature audit trail. Migrated users will sign fresh agreements if needed.

---

## What Users Will Need to Do After Migration

### For Employees (already hired):
- Set their password via email link
- Log in and verify their profile info
- Upload any missing/expired documents

### For Applicants (not yet hired):
- Set their password via email link
- Complete a fresh application in the new system
- Upload required documents

---

## Sample Export Format

Your Quickbase CSV should have these columns:

```csv
Email,First Name,Last Name,Phone,Status,Position,Location,Hire Date,Employee ID
john.doe@email.com,John,Doe,703-555-1234,Active,CNA,Dumfries,2024-03-15,EMP001
jane.smith@email.com,Jane,Smith,703-555-5678,Applicant,,,
```

---

## Pre-Migration Checklist

- [ ] Export Quickbase data to CSV
- [ ] Verify all emails are unique and valid
- [ ] Map Quickbase statuses to MediVault roles
- [ ] Configure Supabase email templates
- [ ] Test password reset flow
- [ ] Download OneDrive documents folder
- [ ] Create user mapping file
- [ ] Test migration script with 5 users first
- [ ] Full migration
- [ ] Verify all accounts can log in
- [ ] Upload documents to Supabase Storage
- [ ] Run document INSERT statements
