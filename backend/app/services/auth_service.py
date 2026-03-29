"""Authentication service using Supabase Auth."""

from fastapi import HTTPException, status
from supabase import Client

from app.models.user import UserRole
from app.schemas.auth import SignUpRequest, LoginRequest, TokenResponse


class AuthService:
    """Handles all authentication operations via Supabase Auth."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    def sign_up(self, request: SignUpRequest) -> TokenResponse:
        """Register a new user and create their profile."""
        try:
            auth_response = self.supabase.auth.sign_up(
                {
                    "email": request.email,
                    "password": request.password,
                    "options": {
                        "data": {
                            "first_name": request.first_name,
                            "last_name": request.last_name,
                        }
                    },
                }
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sign up failed: {str(exc)}",
            )

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sign up failed: no user returned",
            )

        user = auth_response.user
        session = auth_response.session

        # Create profile record
        try:
            self.supabase.table("profiles").insert(
                {
                    "id": str(user.id),
                    "email": request.email,
                    "first_name": request.first_name,
                    "last_name": request.last_name,
                    "phone": request.phone,
                    "role": UserRole.APPLICANT.value,
                }
            ).execute()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Profile creation failed: {str(exc)}",
            )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account created but session not established. Check email for confirmation.",
            )

        return TokenResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            expires_in=session.expires_in,
            user_id=str(user.id),
            email=request.email,
            role=UserRole.APPLICANT.value,
        )

    def login(self, request: LoginRequest) -> TokenResponse:
        """Authenticate user and return tokens."""
        try:
            auth_response = self.supabase.auth.sign_in_with_password(
                {"email": request.email, "password": request.password}
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Login failed: {str(exc)}",
            )

        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        user = auth_response.user
        session = auth_response.session

        # Fetch role from profile
        profile = (
            self.supabase.table("profiles")
            .select("role")
            .eq("id", str(user.id))
            .single()
            .execute()
        )
        role = profile.data.get("role", UserRole.APPLICANT.value) if profile.data else UserRole.APPLICANT.value

        return TokenResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            expires_in=session.expires_in,
            user_id=str(user.id),
            email=user.email or request.email,
            role=role,
        )

    def logout(self, token: str) -> None:
        """Sign out the user."""
        try:
            self.supabase.auth.sign_out()
        except Exception:
            pass  # Sign out is best-effort

    def reset_password(self, email: str) -> None:
        """Send a password reset email."""
        try:
            self.supabase.auth.reset_password_email(email)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Password reset failed: {str(exc)}",
            )
