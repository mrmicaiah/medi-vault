"""Application and application step models."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class ApplicationStatus(str, Enum):
    """Status of an application through the pipeline."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    HIRED = "hired"


class StepType(str, Enum):
    """Type of application step."""
    FORM = "form"
    UPLOAD = "upload"
    AGREEMENT = "agreement"


class ApplicationStepDefinition(BaseModel):
    """Definition of a step in the application process."""
    step_number: int
    name: str
    step_type: StepType
    required: bool = True


# The 22 application steps
APPLICATION_STEPS: List[ApplicationStepDefinition] = [
    ApplicationStepDefinition(step_number=1, name="Application Basics", step_type=StepType.FORM),
    ApplicationStepDefinition(step_number=2, name="Personal Information", step_type=StepType.FORM),
    ApplicationStepDefinition(step_number=3, name="Emergency Contact", step_type=StepType.FORM),
    ApplicationStepDefinition(step_number=4, name="Education & Qualifications", step_type=StepType.FORM),
    ApplicationStepDefinition(step_number=5, name="Reference 1", step_type=StepType.FORM),
    ApplicationStepDefinition(step_number=6, name="Reference 2", step_type=StepType.FORM),
    ApplicationStepDefinition(step_number=7, name="Employment History", step_type=StepType.FORM),
    ApplicationStepDefinition(step_number=8, name="Work Preferences", step_type=StepType.FORM),
    ApplicationStepDefinition(step_number=9, name="Confidentiality Agreement", step_type=StepType.AGREEMENT),
    ApplicationStepDefinition(step_number=10, name="E-Signature Agreement", step_type=StepType.AGREEMENT),
    ApplicationStepDefinition(step_number=11, name="Work Authorization", step_type=StepType.UPLOAD),
    ApplicationStepDefinition(step_number=12, name="ID Front", step_type=StepType.UPLOAD),
    ApplicationStepDefinition(step_number=13, name="ID Back", step_type=StepType.UPLOAD),
    ApplicationStepDefinition(step_number=14, name="Social Security Card", step_type=StepType.UPLOAD),
    ApplicationStepDefinition(step_number=15, name="Professional Credentials", step_type=StepType.UPLOAD),
    ApplicationStepDefinition(step_number=16, name="CPR Certification", step_type=StepType.UPLOAD),
    ApplicationStepDefinition(step_number=17, name="TB Test Results", step_type=StepType.UPLOAD),
    ApplicationStepDefinition(step_number=18, name="Orientation Training", step_type=StepType.AGREEMENT),
    ApplicationStepDefinition(step_number=19, name="Criminal Background", step_type=StepType.AGREEMENT),
    ApplicationStepDefinition(step_number=20, name="VA Code Disclosure", step_type=StepType.AGREEMENT),
    ApplicationStepDefinition(step_number=21, name="Job Description", step_type=StepType.AGREEMENT),
    ApplicationStepDefinition(step_number=22, name="Final Signature", step_type=StepType.AGREEMENT),
]


class ApplicationStep(BaseModel):
    """A single step within an application."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    application_id: str
    step_number: int
    step_name: str
    step_type: StepType
    status: str = "pending"  # pending, completed
    data: Optional[Dict[str, Any]] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class Application(BaseModel):
    """An applicant's application through the onboarding pipeline."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    user_id: str
    status: ApplicationStatus = ApplicationStatus.IN_PROGRESS
    current_step: int = 1
    completed_steps: int = 0
    total_steps: int = 22
    submitted_at: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    steps: Optional[List[ApplicationStep]] = None
