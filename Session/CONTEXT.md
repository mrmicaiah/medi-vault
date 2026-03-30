# MediVault Development Context

**Last Updated:** March 30, 2026
**Repository:** `mrmicaiah/medi-vault`
**Status:** Settings Page Added - Ready for Deploy

---

## Latest Changes (This Session)

**Added Settings Page for Superadmins:**
- Settings gear icon in header dropdown (only visible to superadmin role)
- `/admin/settings` route with two tabs:
  - **Company Tab:** Edit name, tagline, phone, email, website, brand colors, upload logo
  - **Locations Tab:** Full CRUD for locations, toggle is_hiring status

**Backend Endpoints Added:**
- `PUT /api/agencies/me` - Update agency info (superadmin only)
- `POST /api/agencies/me/logo` - Upload agency logo (superadmin only)
- `POST /api/agencies/me/locations` - Create location (superadmin only)
- `PUT /api/agencies/me/locations/{id}` - Update location (superadmin only)
- `DELETE /api/agencies/me/locations/{id}` - Soft delete location (superadmin only)

**Database Migrations Run:**
- Added `location_id` column to `profiles` table
- Created `agency-assets` storage bucket (public, for logos)
- Added storage policies for agency assets

**Files Changed:**
- `backend/app/dependencies.py` - Added `require_superadmin` dependency
- `backend/app/routers/agencies.py` - Added superadmin CRUD endpoints
- `frontend/src/components/layout/Header.tsx` - Added Settings button for superadmin
- `frontend/src/lib/api.ts` - Added `postFormData` method
- `frontend/src/pages/admin/SettingsPage.tsx` - New settings page
- `frontend/src/router/index.tsx` - Added `/admin/settings` route

---

## Role Hierarchy (Clarified)

**Agency Level:**
- **Superadmin** → Can edit agency settings (logo, name, colors) + manage all locations

**Location Level:**
- **Admin** → Manages their specific location
- **Manager** → Works within their location

Profiles now have both `agency_id` and `location_id` columns for this hierarchy.

---

## To Deploy

1. **Push to GitHub:** Done!

2. **Deploy Backend on Render:**
   - Go to https://dashboard.render.com
   - Find `medi-vault-api` service
   - Click "Manual Deploy" → "Deploy latest commit"

3. **Frontend auto-deploys** via Cloudflare Pages on push

---

## Architecture

### Tech Stack

| Layer | Technology | Hosting | URL |
|-------|------------|---------|-----|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS | Cloudflare Pages | https://medisvault.com |
| Backend | Python 3.11 + FastAPI | Render | https://medi-vault-api.onrender.com |
| Database | PostgreSQL | Supabase | (Supabase Dashboard) |
| Auth | Supabase Auth | Supabase | Integrated |
| File Storage | Supabase Storage | Supabase | `documents`, `agreements`, `agency-assets` buckets |

### Key URLs
- **Frontend:** https://medisvault.com
- **Backend API:** https://medi-vault-api.onrender.com/api
- **Apply Page:** https://medisvault.com/apply/eveready
- **Settings Page:** https://medisvault.com/admin/settings (superadmin only)
