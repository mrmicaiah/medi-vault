"""MediVault API - FastAPI Backend"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from .routers import (
    auth,
    applications,
    documents,
    agreements,
    admin,
    admin_delete,  # Soft delete endpoints
    employees,
    clients,
    compliance,
    employee_compliance,
    employee_portal,  # Employee self-service portal
    sensitive_data,
    users,
    invitations,
    agencies,
    assignments,
    transfers,
    superadmin,
    applicant_messages,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="MediVault API",
    description="Healthcare applicant tracking and compliance management",
    version="1.0.10",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://medisvault.com",
        "https://www.medisvault.com",
        "https://medi-vault.pages.dev",
        "https://*.medi-vault.pages.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(documents.router)
app.include_router(agreements.router)
app.include_router(admin.router)
# admin_delete adds to admin.router, no separate include needed
app.include_router(employees.router)
app.include_router(clients.router)
app.include_router(compliance.router)
app.include_router(employee_compliance.router)
app.include_router(employee_portal.router)  # Employee self-service
app.include_router(sensitive_data.router)
app.include_router(users.router)
app.include_router(invitations.router)
app.include_router(agencies.router)
app.include_router(assignments.router)
app.include_router(transfers.router)
app.include_router(superadmin.router)
app.include_router(applicant_messages.router)


@app.get("/")
async def root():
    return {
        "name": "MediVault API",
        "version": "1.0.10",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.10"}
