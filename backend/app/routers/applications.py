"""Application management endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.dependencies import get_supabase, get_current_user
from app.models.user import UserProfile
from app.schemas.application import (
    ApplicationResponse,
    ApplicationStepResponse,
    StepData,
)
from app.services.application_service import ApplicationService

router = APIRouter(prefix="/applications", tags=["Applications"])


class StepSubmission(BaseModel):
    step_number: int
    data: dict = {}
    status: str = "in_progress"


class ApplicationWithSteps(BaseModel):
    application: ApplicationResponse
    steps: List[ApplicationStepResponse]


@router.get("/me", response_model=ApplicationWithSteps)
async def get_my_application(
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Get or create the current user's application with all steps."""
    service = ApplicationService(supabase)
    
    # Try to get existing application
    applications = service.get_user_applications(user.id)
    
    if applications:
        # Return the most recent application
        app = applications[0]
        steps = service.get_steps(app.id, user.id)
        return {"application": app, "steps": steps}
    else:
        # Create a new application
        app = service.create_application(user.id)
        steps = service.get_steps(app.id, user.id)
        return {"application": app, "steps": steps}


@router.post("", response_model=ApplicationResponse, status_code=201)
@router.post("/", response_model=ApplicationResponse, status_code=201)
async def create_application(
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Create a new application for the current user."""
    service = ApplicationService(supabase)
    return service.create_application(user.id)


@router.get("", response_model=List[ApplicationResponse])
@router.get("/", response_model=List[ApplicationResponse])
async def list_applications(
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """List all applications for the current user."""
    service = ApplicationService(supabase)
    return service.get_user_applications(user.id)


@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(
    app_id: str,
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Get a specific application with all steps."""
    service = ApplicationService(supabase)
    return service.get_application(app_id, user.id)


@router.post("/{app_id}/steps", response_model=ApplicationStepResponse)
async def save_step(
    app_id: str,
    step_data: StepSubmission,
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Save data for a specific application step."""
    service = ApplicationService(supabase)
    return service.save_step(
        app_id, 
        step_data.step_number, 
        step_data.data, 
        step_data.status,
        user.id
    )


@router.put("/{app_id}/steps/{step_number}", response_model=ApplicationStepResponse)
async def update_step(
    app_id: str,
    step_number: int,
    step_data: StepData,
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Update data for a specific application step."""
    service = ApplicationService(supabase)
    return service.update_step(app_id, step_number, step_data, user.id)


@router.get("/{app_id}/steps", response_model=List[ApplicationStepResponse])
async def get_steps(
    app_id: str,
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Get all steps for an application."""
    service = ApplicationService(supabase)
    return service.get_steps(app_id, user.id)


@router.post("/{app_id}/submit", response_model=ApplicationResponse)
async def submit_application(
    app_id: str,
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Submit a completed application for review."""
    service = ApplicationService(supabase)
    return service.submit_application(app_id, user.id)
