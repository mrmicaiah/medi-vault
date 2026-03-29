"""Agency and location management endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.dependencies import get_supabase, require_admin, get_current_user
from app.models.user import UserProfile

router = APIRouter(prefix="/agencies", tags=["Agencies"])


# ============================================
# SCHEMAS
# ============================================

class LocationResponse(BaseModel):
    id: str
    name: str
    slug: str
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: str
    state: str
    zip: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_hiring: bool = True


class AgencyResponse(BaseModel):
    id: str
    name: str
    slug: str
    tagline: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class AgencyWithLocationsResponse(AgencyResponse):
    locations: List[LocationResponse] = []


class AgenciesListResponse(BaseModel):
    agencies: List[AgencyResponse]
    total: int


# ============================================
# PUBLIC ENDPOINTS
# ============================================

@router.get("/by-slug/{slug}", response_model=AgencyWithLocationsResponse)
async def get_agency_by_slug(
    slug: str,
    supabase: Client = Depends(get_supabase),
):
    """
    Get agency details by slug (public endpoint for apply page).
    
    Returns agency info and all hiring locations.
    """
    # Get agency
    agency_result = (
        supabase.table("agencies")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", True)
        .single()
        .execute()
    )
    
    if not agency_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agency not found",
        )
    
    agency = agency_result.data
    
    # Get hiring locations
    locations_result = (
        supabase.table("locations")
        .select("*")
        .eq("agency_id", agency["id"])
        .eq("is_active", True)
        .eq("is_hiring", True)
        .order("name")
        .execute()
    )
    
    locations = [
        LocationResponse(
            id=loc["id"],
            name=loc["name"],
            slug=loc["slug"],
            address_line1=loc.get("address_line1"),
            address_line2=loc.get("address_line2"),
            city=loc["city"],
            state=loc["state"],
            zip=loc.get("zip"),
            phone=loc.get("phone"),
            email=loc.get("email"),
            is_hiring=loc.get("is_hiring", True),
        )
        for loc in locations_result.data or []
    ]
    
    return AgencyWithLocationsResponse(
        id=agency["id"],
        name=agency["name"],
        slug=agency["slug"],
        tagline=agency.get("tagline"),
        logo_url=agency.get("logo_url"),
        primary_color=agency.get("primary_color"),
        secondary_color=agency.get("secondary_color"),
        website=agency.get("website"),
        phone=agency.get("phone"),
        email=agency.get("email"),
        locations=locations,
    )


@router.get("/{agency_id}/locations", response_model=List[LocationResponse])
async def get_agency_locations(
    agency_id: str,
    hiring_only: bool = True,
    supabase: Client = Depends(get_supabase),
):
    """Get locations for an agency (public endpoint)."""
    query = (
        supabase.table("locations")
        .select("*")
        .eq("agency_id", agency_id)
        .eq("is_active", True)
        .order("name")
    )
    
    if hiring_only:
        query = query.eq("is_hiring", True)
    
    result = query.execute()
    
    return [
        LocationResponse(
            id=loc["id"],
            name=loc["name"],
            slug=loc["slug"],
            address_line1=loc.get("address_line1"),
            address_line2=loc.get("address_line2"),
            city=loc["city"],
            state=loc["state"],
            zip=loc.get("zip"),
            phone=loc.get("phone"),
            email=loc.get("email"),
            is_hiring=loc.get("is_hiring", True),
        )
        for loc in result.data or []
    ]


# ============================================
# ADMIN ENDPOINTS
# ============================================

@router.get("/me", response_model=AgencyWithLocationsResponse)
async def get_my_agency(
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Get the current user's agency (for staff members)."""
    # Get user's agency_id from profile
    profile_result = (
        supabase.table("profiles")
        .select("agency_id")
        .eq("id", user.id)
        .single()
        .execute()
    )
    
    agency_id = profile_result.data.get("agency_id") if profile_result.data else None
    
    if not agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not associated with any agency",
        )
    
    # Get agency
    agency_result = (
        supabase.table("agencies")
        .select("*")
        .eq("id", agency_id)
        .single()
        .execute()
    )
    
    if not agency_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agency not found",
        )
    
    agency = agency_result.data
    
    # Get all locations (not just hiring)
    locations_result = (
        supabase.table("locations")
        .select("*")
        .eq("agency_id", agency_id)
        .eq("is_active", True)
        .order("name")
        .execute()
    )
    
    locations = [
        LocationResponse(
            id=loc["id"],
            name=loc["name"],
            slug=loc["slug"],
            address_line1=loc.get("address_line1"),
            address_line2=loc.get("address_line2"),
            city=loc["city"],
            state=loc["state"],
            zip=loc.get("zip"),
            phone=loc.get("phone"),
            email=loc.get("email"),
            is_hiring=loc.get("is_hiring", True),
        )
        for loc in locations_result.data or []
    ]
    
    return AgencyWithLocationsResponse(
        id=agency["id"],
        name=agency["name"],
        slug=agency["slug"],
        tagline=agency.get("tagline"),
        logo_url=agency.get("logo_url"),
        primary_color=agency.get("primary_color"),
        secondary_color=agency.get("secondary_color"),
        website=agency.get("website"),
        phone=agency.get("phone"),
        email=agency.get("email"),
        locations=locations,
    )
