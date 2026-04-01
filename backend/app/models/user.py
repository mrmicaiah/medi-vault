"""User profile and role models."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserRole(str, Enum):
    """User role within the MediVault system."""
    APPLICANT = "applicant"
    EMPLOYEE = "employee"
    MANAGER = "manager"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"


class UserProfile(BaseModel):
    """User profile stored in the profiles table."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    first_name: str
    last_name: str
    role: UserRole = UserRole.APPLICANT
    phone: Optional[str] = None
    
    # Agency/location assignment
    agency_id: Optional[str] = None
    location_id: Optional[str] = None
    
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
