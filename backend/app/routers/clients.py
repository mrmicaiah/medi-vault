"""Client management endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.dependencies import get_supabase, require_admin
from app.models.user import UserProfile
from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientDetailResponse,
    ClientListResponse,
)
from app.services.client_service import ClientService

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.post("/", response_model=ClientResponse, status_code=201)
async def create_client(
    request: ClientCreate,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Create a new client (admin only)."""
    service = ClientService(supabase)
    return service.create_client(request, admin.agency_id, admin.id)


@router.get("/", response_model=ClientListResponse)
async def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status (active, inactive, discharged)"),
    location_id: Optional[str] = Query(None, description="Filter by location"),
    search: Optional[str] = Query(None, description="Search by name/nickname"),
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """List all clients with optional filtering (admin only)."""
    service = ClientService(supabase)
    clients, total = service.get_clients(
        agency_id=admin.agency_id,
        page=page,
        page_size=page_size,
        status_filter=status,
        search=search,
        location_id=location_id,
    )
    return ClientListResponse(
        items=clients,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{client_id}", response_model=ClientDetailResponse)
async def get_client(
    client_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get a specific client's details with assignments."""
    service = ClientService(supabase)
    return service.get_client(client_id, admin.agency_id)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    update: ClientUpdate,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Update client information."""
    service = ClientService(supabase)
    return service.update_client(client_id, admin.agency_id, update)


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Discharge a client (soft delete)."""
    service = ClientService(supabase)
    service.delete_client(client_id, admin.agency_id)
