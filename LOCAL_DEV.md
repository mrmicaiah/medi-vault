# MediVault Local Development Setup

Run the app locally for faster debugging. Still connects to Supabase.

## Prerequisites

- Python 3.11+
- Node.js 18+
- Your Supabase credentials (from Supabase Dashboard > Settings > API)

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/mrmicaiah/medi-vault.git
cd medi-vault
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your Supabase keys

# Run the server
uvicorn app.main:app --reload --port 8000
```

Backend will be at: http://localhost:8000
API docs at: http://localhost:8000/api/docs

### 3. Frontend Setup (new terminal)

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and add your Supabase anon key

# Run dev server
npm run dev
```

Frontend will be at: http://localhost:5173

## Environment Variables

### Backend (.env)

| Variable | Description | Where to find |
|----------|-------------|---------------|
| SUPABASE_URL | Your Supabase project URL | Supabase > Settings > API |
| SUPABASE_KEY | Public anon key | Supabase > Settings > API > anon public |
| SUPABASE_SERVICE_KEY | Service role key (secret) | Supabase > Settings > API > service_role |

### Frontend (.env)

| Variable | Description | Where to find |
|----------|-------------|---------------|
| VITE_API_URL | Backend URL | `http://localhost:8000` for local dev |
| VITE_SUPABASE_URL | Your Supabase project URL | Supabase > Settings > API |
| VITE_SUPABASE_ANON_KEY | Public anon key | Supabase > Settings > API > anon public |

## Debugging Tips

- Backend errors show directly in terminal with full tracebacks
- Use `print()` statements for quick debugging
- FastAPI auto-reloads on file changes (--reload flag)
- React/Vite also hot-reloads on changes

## Common Issues

### WeasyPrint errors on Mac/Windows

WeasyPrint needs system libraries. If PDF generation fails:

**Mac:**
```bash
brew install pango cairo
```

**Windows:**
See https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows

Or just comment out the PDF imports if you don't need PDF generation for now.

### CORS errors

Make sure your backend CORS_ORIGINS includes `http://localhost:5173`

### "Column does not exist" errors

The code might reference a column name that doesn't match the DB. Check the Supabase table schema and update the code to match.
