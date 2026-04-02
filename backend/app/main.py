"""MediVault API - FastAPI application entry point."""

import os
import traceback
import logging
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
from app.routers.clients import router as clients_router
from app.routers.employee_compliance import router as employee_compliance_router
from app.routers.employee_compliance import compliance_router as compliance_dashboard_router
from app.routers.assignments import router as assignments_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

# Debug: Print CORS origins on startup
logger.info(f"[CORS] Raw CORS_ORIGINS env: {os.getenv('CORS_ORIGINS', 'NOT SET')}")
logger.info(f"[CORS] Parsed origins list: {settings.cors_origin_list}")

app = FastAPI(
    title="MediVault API",
    description="Home care agency applicant-to-employee management platform",
    version="1.0.3",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Allowed origins - include all possible domains for local dev and production
ALLOWED_ORIGINS = [
    "https://medisvault.com",
    "https://www.medisvault.com",
    "https://medi-vault.pages.dev",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
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
    logger.error(f"Unhandled exception on {request.url.path}: {error_detail}")
    logger.error(f"Traceback:\n{error_traceback}")
    
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
        "version": "1.0.3",
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

# New routers for clients, employee compliance, and assignments
app.include_router(clients_router, prefix="/api")
app.include_router(employee_compliance_router, prefix="/api")
app.include_router(compliance_dashboard_router, prefix="/api")
app.include_router(assignments_router, prefix="/api")
