"""MediVault API - FastAPI application entry point."""

import os
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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

# Allowed origins - include all possible domains
ALLOWED_ORIGINS = [
    "https://medisvault.com",
    "https://www.medisvault.com",
    "https://medi-vault.pages.dev",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Global exception handler that includes CORS headers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions with proper CORS headers."""
    error_detail = str(exc)
    error_traceback = traceback.format_exc()
    
    # Log the full error
    print(f"[ERROR] Unhandled exception: {error_detail}")
    print(f"[ERROR] Traceback:\n{error_traceback}")
    
    # Get origin from request
    origin = request.headers.get("origin", "")
    
    # Build response with CORS headers
    response = JSONResponse(
        status_code=500,
        content={
            "detail": f"Internal server error: {error_detail}",
            "path": str(request.url.path),
        },
    )
    
    # Add CORS headers manually for error responses
    if origin in ALLOWED_ORIGINS or origin.endswith(".pages.dev"):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response


# Health check - also returns CORS config for debugging
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy", 
        "service": "medivault-api", 
        "version": "1.0.0",
        "cors_origins": ALLOWED_ORIGINS,
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
