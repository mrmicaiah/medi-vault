"""Authentication endpoints."""

from fastapi import APIRouter, Depends, Header, Request
from supabase import Client

from app.dependencies import get_supabase, get_current_user
from app.models.user import UserProfile
from app.schemas.auth import (
    LoginRequest,
    PasswordResetRequest,
    SignUpRequest,
    TokenResponse,
)
from app.schemas.common import SuccessResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=TokenResponse, status_code=201)
async def sign_up(
    request: SignUpRequest,
    supabase: Client = Depends(get_supabase),
):
    """Register a new applicant account."""
    service = AuthService(supabase)
    return service.sign_up(request)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    supabase: Client = Depends(get_supabase),
):
    """Authenticate and receive access tokens."""
    service = AuthService(supabase)
    return service.login(request)


@router.post("/logout", response_model=SuccessResponse)
async def logout(
    authorization: str = Header(...),
    supabase: Client = Depends(get_supabase),
):
    """Sign out the current user."""
    token = authorization.replace("Bearer ", "")
    service = AuthService(supabase)
    service.logout(token)
    return SuccessResponse(message="Logged out successfully")


@router.post("/reset-password", response_model=SuccessResponse)
async def reset_password(
    request: PasswordResetRequest,
    supabase: Client = Depends(get_supabase),
):
    """Send a password reset email."""
    service = AuthService(supabase)
    service.reset_password(request.email)
    return SuccessResponse(message="Password reset email sent if account exists")


@router.get("/me", response_model=UserProfile)
async def get_me(
    user: UserProfile = Depends(get_current_user),
):
    """Get the current authenticated user's profile."""
    return user
