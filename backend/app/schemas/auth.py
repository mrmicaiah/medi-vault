"""Authentication request/response schemas."""

from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class SignUpRequest(BaseModel):
    """Request body for user registration."""
    email: str
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email format")
        return v.lower().strip()


class LoginRequest(BaseModel):
    """Request body for user login."""
    email: str
    password: str


class TokenResponse(BaseModel):
    """Response containing auth tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    email: str
    role: str


class PasswordResetRequest(BaseModel):
    """Request body for password reset."""
    email: str
