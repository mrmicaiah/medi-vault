# mediVault

**Home Care Agency Management Platform**

A comprehensive applicant-to-employee management system for home care agencies, starting with Eveready HomeCare's four Virginia locations.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend** | Python 3.11 + FastAPI |
| **Database** | Supabase (PostgreSQL + Auth + Storage) |
| **Frontend Hosting** | Cloudflare Pages |
| **Backend Hosting** | Render |

---

## Repository Structure

```
medi-vault/
├── frontend/           # React app → Cloudflare Pages
├── backend/            # FastAPI → Render
├── supabase/           # SQL migrations (run manually)
└── docs/               # Documentation
    ├── BUILD_PLAN.md
    ├── APPLICANT_JOURNEY.md
    └── AUDIT_REQUIREMENTS.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account
- Cloudflare account
- Render account

### Development Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/medi-vault.git
cd medi-vault

# Frontend
cd frontend
npm install
npm run dev

# Backend (separate terminal)
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Database Setup

SQL migrations are in `/supabase/migrations/`. Run them manually in Supabase Dashboard → SQL Editor.

---

## Documentation

| Document | Description |
|----------|-------------|
| [BUILD_PLAN.md](docs/BUILD_PLAN.md) | Complete technical architecture and build phases |
| [APPLICANT_JOURNEY.md](docs/APPLICANT_JOURNEY.md) | User flow, UI wireframes, step-by-step application |
| [AUDIT_REQUIREMENTS.md](docs/AUDIT_REQUIREMENTS.md) | Virginia/Medicare audit compliance research |

---

## Deployment

### Frontend (Cloudflare Pages)
- Connected via native GitHub integration
- Auto-deploys on push to `main`
- Build command: `cd frontend && npm run build`
- Output directory: `frontend/dist`

### Backend (Render)
- Connected via native GitHub integration  
- Auto-deploys on push to `main`
- Uses `backend/render.yaml` for configuration

---

## License

Proprietary - Eveready HomeCare / mediVault