"""Service for managing sensitive data like SSN."""

from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from supabase import Client

from app.services.encryption_service import get_encryption_service


class SensitiveDataService:
    """Handles storage and retrieval of sensitive PII."""

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.encryption = get_encryption_service()

    def store_ssn(self, user_id: str, ssn: str) -> dict:
        """
        Store an encrypted SSN for a user.
        
        Args:
            user_id: The user's ID
            ssn: The full SSN (will be encrypted)
            
        Returns:
            Dict with masked SSN for display
        """
        # Encrypt the SSN
        encrypted_ssn, last_four = self.encryption.encrypt_ssn(ssn)
        now = datetime.now(timezone.utc).isoformat()

        # Check if record exists
        existing = (
            self.supabase.table("sensitive_data")
            .select("id")
            .eq("user_id", user_id)
            .execute()
        )

        if existing.data:
            # Update existing record
            result = (
                self.supabase.table("sensitive_data")
                .update({
                    "ssn_encrypted": encrypted_ssn,
                    "ssn_last_four": last_four,
                    "ssn_provided_at": now,
                    "updated_at": now,
                })
                .eq("user_id", user_id)
                .execute()
            )
        else:
            # Insert new record
            result = (
                self.supabase.table("sensitive_data")
                .insert({
                    "user_id": user_id,
                    "ssn_encrypted": encrypted_ssn,
                    "ssn_last_four": last_four,
                    "ssn_provided_at": now,
                    "created_at": now,
                    "updated_at": now,
                })
                .execute()
            )

        return {
            "ssn_masked": self.encryption.mask_ssn(last_four),
            "ssn_last_four": last_four,
            "ssn_provided": True,
        }

    def get_ssn_display(self, user_id: str) -> dict:
        """
        Get masked SSN for display (no decryption).
        
        Returns:
            Dict with masked SSN or indication that SSN not provided
        """
        result = (
            self.supabase.table("sensitive_data")
            .select("ssn_last_four, ssn_provided_at")
            .eq("user_id", user_id)
            .execute()
        )

        if not result.data or not result.data[0].get("ssn_last_four"):
            return {
                "ssn_masked": None,
                "ssn_last_four": None,
                "ssn_provided": False,
            }

        data = result.data[0]
        return {
            "ssn_masked": self.encryption.mask_ssn(data["ssn_last_four"]),
            "ssn_last_four": data["ssn_last_four"],
            "ssn_provided": True,
            "ssn_provided_at": data.get("ssn_provided_at"),
        }

    def reveal_ssn(
        self,
        user_id: str,
        accessed_by: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> dict:
        """
        Decrypt and reveal full SSN (admin only). Logs the access.
        
        Args:
            user_id: Whose SSN to reveal
            accessed_by: Who is requesting access (must be admin)
            ip_address: Requester's IP
            user_agent: Requester's user agent
            reason: Optional reason for access
            
        Returns:
            Dict with full formatted SSN
        """
        # Get the encrypted SSN
        result = (
            self.supabase.table("sensitive_data")
            .select("ssn_encrypted, ssn_last_four")
            .eq("user_id", user_id)
            .execute()
        )

        if not result.data or not result.data[0].get("ssn_encrypted"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SSN not found for this user",
            )

        encrypted_ssn = result.data[0]["ssn_encrypted"]

        # Log the access
        self.supabase.table("ssn_access_log").insert({
            "user_id": user_id,
            "accessed_by": accessed_by,
            "access_type": "reveal",
            "ip_address": ip_address,
            "user_agent": user_agent,
            "reason": reason,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

        # Decrypt the SSN
        decrypted_ssn = self.encryption.decrypt_ssn(encrypted_ssn)
        formatted_ssn = self.encryption.format_ssn(decrypted_ssn)

        return {
            "ssn_full": formatted_ssn,
            "ssn_last_four": result.data[0]["ssn_last_four"],
        }

    def get_ssn_access_log(self, user_id: str) -> list:
        """
        Get access log for a user's SSN.
        
        Args:
            user_id: Whose SSN access log to retrieve
            
        Returns:
            List of access log entries
        """
        result = (
            self.supabase.table("ssn_access_log")
            .select("*, accessed_by_profile:profiles!ssn_access_log_accessed_by_fkey(first_name, last_name, email)")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )

        return result.data or []
