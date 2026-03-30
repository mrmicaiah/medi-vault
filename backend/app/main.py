"""MediVault API - FastAPI application entry point."""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    auth,
    applications,
    documents,
    agreements,
    admin,
    employees,
    compliance,
    sensitive_data,
    users,
    invitations,
    agencies,
)

settings = get_settings()

# Debug: Print CORS origins on startup
print(f"[CORS] Raw CORS_ORIGINS env: {os.getenv('CORS_ORIGINS', 'NOT SET')}")
print(f"[CORS] Parsed origins list: {settings.cors_origin_list}")

app = FastAPI(
    title="MediVault API",
    description="Home care agency applicant-to-employee management platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS middleware - use parsed list from settings
cors_origins = settings.cors_origin_list
print(f"[CORS] Adding middleware with origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check - also returns CORS config for debugging
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy", 
        "service": "medivault-api", 
        "version": "1.0.0",
        "cors_origins": settings.cors_origin_list,
    }


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
app.include_router(invitations.router, prefix="/api")
app.include_router(agencies.router, prefix="/api")
