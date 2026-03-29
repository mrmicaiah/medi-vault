"""Encryption service for sensitive data like SSN."""

import os
import base64
from typing import Optional, Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class EncryptionService:
    """Handles encryption/decryption of sensitive data."""

    def __init__(self):
        # Get encryption key from environment
        self.master_key = os.getenv("ENCRYPTION_KEY")
        if not self.master_key:
            raise ValueError("ENCRYPTION_KEY environment variable is required")
        
        # Derive a Fernet key from the master key
        self.fernet = self._create_fernet()

    def _create_fernet(self) -> Fernet:
        """Create a Fernet instance from the master key."""
        # Use PBKDF2 to derive a proper key from the master key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"medivault_ssn_salt",  # Static salt (key is already secure)
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.master_key.encode()))
        return Fernet(key)

    def encrypt_ssn(self, ssn: str) -> Tuple[str, str]:
        """
        Encrypt an SSN and return (encrypted_value, last_four).
        
        Args:
            ssn: Full SSN (can be formatted or unformatted)
            
        Returns:
            Tuple of (encrypted_ssn, last_four_digits)
        """
        # Remove any formatting (dashes, spaces)
        clean_ssn = ''.join(filter(str.isdigit, ssn))
        
        if len(clean_ssn) != 9:
            raise ValueError("SSN must be exactly 9 digits")
        
        # Encrypt the full SSN
        encrypted = self.fernet.encrypt(clean_ssn.encode())
        encrypted_str = base64.urlsafe_b64encode(encrypted).decode()
        
        # Extract last 4 digits
        last_four = clean_ssn[-4:]
        
        return encrypted_str, last_four

    def decrypt_ssn(self, encrypted_ssn: str) -> str:
        """
        Decrypt an SSN.
        
        Args:
            encrypted_ssn: The encrypted SSN string
            
        Returns:
            Decrypted SSN (9 digits, no formatting)
        """
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_ssn.encode())
        decrypted = self.fernet.decrypt(encrypted_bytes)
        return decrypted.decode()

    def format_ssn(self, ssn: str) -> str:
        """Format a 9-digit SSN as XXX-XX-XXXX."""
        clean = ''.join(filter(str.isdigit, ssn))
        if len(clean) != 9:
            return ssn
        return f"{clean[:3]}-{clean[3:5]}-{clean[5:]}"

    def mask_ssn(self, last_four: str) -> str:
        """Return masked SSN display: ***-**-XXXX."""
        return f"***-**-{last_four}"


# Singleton instance
_encryption_service: Optional[EncryptionService] = None


def get_encryption_service() -> EncryptionService:
    """Get the encryption service singleton."""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service
