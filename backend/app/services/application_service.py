"""Application management service."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from supabase import Client

from app.models.application import (
    APPLICATION_STEPS,
    Application,
    ApplicationStatus,
    ApplicationStep,
)
from app.schemas.application import (
    ApplicationResponse,
    ApplicationStepResponse,
    StepData,
)


class ApplicationService:
    """Handles application CRUD and step management."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    def create_application(self, user_id: str) -> ApplicationResponse:
        """Create a new application for a user."""
        # Check if user already has an active application
        existing = (
            self.supabase.table("applications")
            .select("id")
            .eq("user_id", user_id)
            .in_("status", ["in_progress", "submitted", "under_review"])
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already has an active application",
            )

        now = datetime.now(timezone.utc).isoformat()

        # Create the application
        app_result = (
            self.supabase.table("applications")
            .insert(
                {
                    "user_id": user_id,
                    "status": ApplicationStatus.IN_PROGRESS.value,
                    "current_step": 1,
                    "total_steps": 22,
                    "created_at": now,
                    "updated_at": now,
                }
            )
            .execute()
        )

        if not app_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create application",
            )

        app_data = app_result.data[0]
        app_id = app_data["id"]

        # Create all 22 steps
        steps_to_insert = []
        for step_def in APPLICATION_STEPS:
            steps_to_insert.append(
                {
                    "application_id": app_id,
                    "step_number": step_def.step_number,
                    "step_name": step_def.name,
                    "step_type": step_def.step_type.value,
                    "is_completed": False,
                    "data": {},
                    "created_at": now,
                    "updated_at": now,
                }
            )

        self.supabase.table("application_steps").insert(steps_to_insert).execute()

        return ApplicationResponse(
            id=app_id,
            user_id=user_id,
            status=ApplicationStatus.IN_PROGRESS,
            current_step=1,
            total_steps=22,
            created_at=app_data.get("created_at"),
            updated_at=app_data.get("updated_at"),
        )

    def get_application(self, app_id: str, user_id: Optional[str] = None) -> ApplicationResponse:
        """Get an application by ID, optionally filtering by user."""
        query = self.supabase.table("applications").select("*").eq("id", app_id)
        if user_id:
            query = query.eq("user_id", user_id)

        result = query.single().execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found",
            )

        data = result.data

        return ApplicationResponse(
            id=data["id"],
            user_id=data["user_id"],
            status=ApplicationStatus(data["status"]),
            current_step=data.get("current_step", 1),
            total_steps=data.get("total_steps", 22),
            submitted_at=data.get("submitted_at"),
            reviewed_at=data.get("reviewed_at"),
            reviewed_by=data.get("reviewed_by"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )

    def get_user_applications(self, user_id: str) -> List[ApplicationResponse]:
        """Get all applications for a user."""
        result = (
            self.supabase.table("applications")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        return [
            ApplicationResponse(
                id=d["id"],
                user_id=d["user_id"],
                status=ApplicationStatus(d["status"]),
                current_step=d.get("current_step", 1),
                total_steps=d.get("total_steps", 22),
                submitted_at=d.get("submitted_at"),
                reviewed_at=d.get("reviewed_at"),
                created_at=d.get("created_at"),
                updated_at=d.get("updated_at"),
            )
            for d in (result.data or [])
        ]

    def save_step(
        self, app_id: str, step_number: int, data: dict, step_status: str, user_id: str
    ) -> ApplicationStepResponse:
        """Save data for a specific step."""
        # Verify ownership
        app = self.get_application(app_id, user_id)

        if app.status not in (ApplicationStatus.IN_PROGRESS,):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application is not in a modifiable state",
            )

        if step_number < 1 or step_number > 22:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Step number must be between 1 and 22",
            )

        now = datetime.now(timezone.utc).isoformat()
        is_completed = step_status == "completed"

        # Update the step
        update_data = {
            "data": data,
            "is_completed": is_completed,
            "updated_at": now,
        }
        
        if is_completed:
            update_data["completed_at"] = now

        step_result = (
            self.supabase.table("application_steps")
            .update(update_data)
            .eq("application_id", app_id)
            .eq("step_number", step_number)
            .execute()
        )

        if not step_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Step {step_number} not found",
            )

        # Update application's current step if moving forward
        if is_completed and step_number >= app.current_step:
            next_step = min(step_number + 1, 22)
            self.supabase.table("applications").update(
                {
                    "current_step": next_step,
                    "updated_at": now,
                }
            ).eq("id", app_id).execute()

        s = step_result.data[0]
        return ApplicationStepResponse(
            id=s.get("id"),
            application_id=s["application_id"],
            step_number=s["step_number"],
            step_name=s["step_name"],
            step_type=s["step_type"],
            status="completed" if s.get("is_completed") else "in_progress",
            data=s.get("data"),
            completed_at=s.get("completed_at"),
        )

    def update_step(
        self, app_id: str, step_number: int, step_data: StepData, user_id: str
    ) -> ApplicationStepResponse:
        """Update a specific step with form data and mark completed."""
        return self.save_step(app_id, step_number, step_data.data, "completed", user_id)

    def get_steps(self, app_id: str, user_id: Optional[str] = None) -> List[ApplicationStepResponse]:
        """Get all steps for an application."""
        # Verify access
        self.get_application(app_id, user_id)

        result = (
            self.supabase.table("application_steps")
            .select("*")
            .eq("application_id", app_id)
            .order("step_number")
            .execute()
        )

        return [
            ApplicationStepResponse(
                id=s.get("id"),
                application_id=s["application_id"],
                step_number=s["step_number"],
                step_name=s["step_name"],
                step_type=s["step_type"],
                status="completed" if s.get("is_completed") else "pending",
                data=s.get("data"),
                completed_at=s.get("completed_at"),
            )
            for s in (result.data or [])
        ]

    def submit_application(self, app_id: str, user_id: str) -> ApplicationResponse:
        """Submit a completed application for review."""
        app = self.get_application(app_id, user_id)

        if app.status != ApplicationStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application is not in progress",
            )

        # Check all required steps are completed
        incomplete = (
            self.supabase.table("application_steps")
            .select("step_number, step_name", count="exact")
            .eq("application_id", app_id)
            .eq("is_completed", False)
            .execute()
        )

        if incomplete.count and incomplete.count > 0:
            names = [s["step_name"] for s in (incomplete.data or [])]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incomplete steps: {', '.join(names)}",
            )

        now = datetime.now(timezone.utc).isoformat()

        self.supabase.table("applications").update(
            {
                "status": ApplicationStatus.SUBMITTED.value,
                "submitted_at": now,
                "updated_at": now,
            }
        ).eq("id", app_id).execute()

        return self.get_application(app_id, user_id)
