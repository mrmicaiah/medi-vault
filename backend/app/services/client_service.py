"""Client management service."""

from datetime import datetime, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from supabase import Client

from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientDetailResponse,
    ClientAssignmentInfo,
)


class ClientService:
    """Handles client CRUD operations and assignments."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    def create_client(
        self, 
        request: ClientCreate, 
        agency_id: str, 
        created_by: str
    ) -> ClientResponse:
        """Create a new client."""
        now = datetime.now(timezone.utc).isoformat()

        data = {
            "agency_id": agency_id,
            "nickname": request.nickname,
            "location_id": request.location_id,
            "notes": request.notes,
            "first_name": request.first_name,
            "last_name": request.last_name,
            "date_of_birth": request.date_of_birth,
            "medicaid_id": request.medicaid_id,
            "medicare_id": request.medicare_id,
            "status": "active",
            "created_by": created_by,
            "created_at": now,
            "updated_at": now,
        }

        # Remove None values
        data = {k: v for k, v in data.items() if v is not None}

        result = self.supabase.table("clients").insert(data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create client",
            )

        return self._to_response(result.data[0])

    def get_clients(
        self,
        agency_id: str,
        page: int = 1,
        page_size: int = 25,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        location_id: Optional[str] = None,
    ) -> Tuple[List[ClientResponse], int]:
        """List clients with optional filtering."""
        query = (
            self.supabase.table("clients")
            .select("*, locations(name)", count="exact")
            .eq("agency_id", agency_id)
        )

        if status_filter:
            query = query.eq("status", status_filter)
        
        if location_id:
            query = query.eq("location_id", location_id)

        if search:
            # Search by nickname (and name if expanded)
            query = query.or_(
                f"nickname.ilike.%{search}%,"
                f"first_name.ilike.%{search}%,"
                f"last_name.ilike.%{search}%"
            )

        offset = (page - 1) * page_size
        result = (
            query
            .order("nickname")
            .range(offset, offset + page_size - 1)
            .execute()
        )

        clients = [self._to_response(c) for c in result.data or []]
        return clients, result.count or len(clients)

    def get_client(self, client_id: str, agency_id: str) -> ClientDetailResponse:
        """Get a single client with their assignments."""
        result = (
            self.supabase.table("clients")
            .select("*, locations(name)")
            .eq("id", client_id)
            .eq("agency_id", agency_id)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found",
            )

        # Get assignments
        assignments = self._get_client_assignments(client_id)

        client = self._to_response(result.data)
        return ClientDetailResponse(
            **client.model_dump(),
            assignments=assignments,
        )

    def update_client(
        self, 
        client_id: str, 
        agency_id: str, 
        update: ClientUpdate
    ) -> ClientResponse:
        """Update client details."""
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {
            k: v for k, v in update.model_dump(exclude_none=True).items()
        }
        update_data["updated_at"] = now

        result = (
            self.supabase.table("clients")
            .update(update_data)
            .eq("id", client_id)
            .eq("agency_id", agency_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found",
            )

        # Refetch with location
        return self.get_client(client_id, agency_id)

    def delete_client(self, client_id: str, agency_id: str) -> bool:
        """Soft delete a client by setting status to 'discharged'."""
        now = datetime.now(timezone.utc).isoformat()

        result = (
            self.supabase.table("clients")
            .update({"status": "discharged", "updated_at": now})
            .eq("id", client_id)
            .eq("agency_id", agency_id)
            .execute()
        )

        return bool(result.data)

    def _get_client_assignments(self, client_id: str) -> List[ClientAssignmentInfo]:
        """Get all employee assignments for a client."""
        result = (
            self.supabase.table("employee_client_assignments")
            .select(
                "*, employees(id, employee_number, profiles(first_name, last_name))"
            )
            .eq("client_id", client_id)
            .order("start_date", desc=True)
            .execute()
        )

        assignments = []
        for a in result.data or []:
            emp = a.get("employees", {}) or {}
            profile = emp.get("profiles", {}) or {}
            
            name_parts = [
                profile.get("first_name", ""),
                profile.get("last_name", ""),
            ]
            employee_name = " ".join(p for p in name_parts if p).strip() or "Unknown"

            assignments.append(
                ClientAssignmentInfo(
                    assignment_id=a["id"],
                    employee_id=a["employee_id"],
                    employee_name=employee_name,
                    employee_number=emp.get("employee_number"),
                    start_date=a["start_date"],
                    end_date=a.get("end_date"),
                    schedule=a.get("schedule"),
                    is_active=a.get("is_active", True),
                    notes=a.get("notes"),
                )
            )

        return assignments

    def _to_response(self, data: dict) -> ClientResponse:
        """Convert database row to response model."""
        location = data.get("locations", {}) or {}
        
        # Count active assignments
        assignment_result = (
            self.supabase.table("employee_client_assignments")
            .select("id", count="exact")
            .eq("client_id", data["id"])
            .eq("is_active", True)
            .execute()
        )
        active_count = assignment_result.count or 0

        return ClientResponse(
            id=data["id"],
            agency_id=data["agency_id"],
            location_id=data.get("location_id"),
            nickname=data["nickname"],
            status=data.get("status", "active"),
            notes=data.get("notes"),
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            date_of_birth=data.get("date_of_birth"),
            medicaid_id=data.get("medicaid_id"),
            medicare_id=data.get("medicare_id"),
            location_name=location.get("name"),
            active_assignments=active_count,
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )
