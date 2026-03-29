"""MediVault API - FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, applications, documents, agreements, admin, employees, compliance, sensitive_data, users

settings = get_settings()

app = FastAPI(
    title="MediVault API",
    description="Home care agency applicant-to-employee management platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "medivault-api", "version": "1.0.0"}


# Include all routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(agreements.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(compliance.router, prefix="/api")
app.include_router(sensitive_data.router, prefix="/api")
app.include_router(users.router, prefix="/api")
