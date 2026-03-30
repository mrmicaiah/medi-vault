"""Agency and location management endpoints."""

from typing import List, Optional
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from supabase import Client

from app.dependencies import get_supabase, require_admin, require_superadmin, get_current_user
from app.models.user import UserProfile

router = APIRouter(prefix="/agencies", tags=["Agencies"])


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
    is_active: bool = True


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_hiring: Optional[bool] = None
    is_active: Optional[bool] = None


class LocationCreate(BaseModel):
    name: str
    city: str
    state: str
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
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


class AgencyUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
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


def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from a name."""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')


@router.get("/by-slug/{slug}", response_model=AgencyWithLocationsResponse)
async def get_agency_by_slug(slug: str, supabase: Client = Depends(get_supabase)):
    """Get agency details by slug (public endpoint for apply page)."""
    agency_result = supabase.table("agencies").select("*").eq("slug", slug).eq("is_active", True).single().execute()
    
    if not agency_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agency not found")
    
    agency = agency_result.data
    locations_result = supabase.table("locations").select("*").eq("agency_id", agency["id"]).eq("is_active", True).eq("is_hiring", True).order("name").execute()
    
    locations = [
        LocationResponse(
            id=loc["id"], name=loc["name"], slug=loc["slug"],
            address_line1=loc.get("address_line1"), address_line2=loc.get("address_line2"),
            city=loc["city"], state=loc["state"], zip=loc.get("zip"),
            phone=loc.get("phone"), email=loc.get("email"), is_hiring=loc.get("is_hiring", True)
        )
        for loc in locations_result.data or []
    ]
    
    return AgencyWithLocationsResponse(
        id=agency["id"], name=agency["name"], slug=agency["slug"],
        tagline=agency.get("tagline"), logo_url=agency.get("logo_url"),
        primary_color=agency.get("primary_color"), secondary_color=agency.get("secondary_color"),
        website=agency.get("website"), phone=agency.get("phone"), email=agency.get("email"),
        locations=locations
    )


@router.get("/{agency_id}/locations", response_model=List[LocationResponse])
async def get_agency_locations(agency_id: str, hiring_only: bool = True, supabase: Client = Depends(get_supabase)):
    """Get locations for an agency (public endpoint)."""
    query = supabase.table("locations").select("*").eq("agency_id", agency_id).eq("is_active", True).order("name")
    if hiring_only:
        query = query.eq("is_hiring", True)
    result = query.execute()
    
    return [
        LocationResponse(
            id=loc["id"], name=loc["name"], slug=loc["slug"],
            address_line1=loc.get("address_line1"), address_line2=loc.get("address_line2"),
            city=loc["city"], state=loc["state"], zip=loc.get("zip"),
            phone=loc.get("phone"), email=loc.get("email"), is_hiring=loc.get("is_hiring", True)
        )
        for loc in result.data or []
    ]


@router.get("/me", response_model=AgencyWithLocationsResponse)
async def get_my_agency(user: UserProfile = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    """Get the current user's agency (for staff members)."""
    profile_result = supabase.table("profiles").select("agency_id").eq("id", user.id).single().execute()
    agency_id = profile_result.data.get("agency_id") if profile_result.data else None
    
    if not agency_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You are not associated with any agency")
    
    agency_result = supabase.table("agencies").select("*").eq("id", agency_id).single().execute()
    if not agency_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agency not found")
    
    agency = agency_result.data
    locations_result = supabase.table("locations").select("*").eq("agency_id", agency_id).eq("is_active", True).order("name").execute()
    
    locations = [
        LocationResponse(
            id=loc["id"], name=loc["name"], slug=loc["slug"],
            address_line1=loc.get("address_line1"), address_line2=loc.get("address_line2"),
            city=loc["city"], state=loc["state"], zip=loc.get("zip"),
            phone=loc.get("phone"), email=loc.get("email"), is_hiring=loc.get("is_hiring", True)
        )
        for loc in locations_result.data or []
    ]
    
    return AgencyWithLocationsResponse(
        id=agency["id"], name=agency["name"], slug=agency["slug"],
        tagline=agency.get("tagline"), logo_url=agency.get("logo_url"),
        primary_color=agency.get("primary_color"), secondary_color=agency.get("secondary_color"),
        website=agency.get("website"), phone=agency.get("phone"), email=agency.get("email"),
        locations=locations
    )


async def get_user_agency_id(user: UserProfile, supabase: Client) -> str:
    """Helper to get and validate user's agency_id."""
    profile_result = supabase.table("profiles").select("agency_id").eq("id", user.id).single().execute()
    agency_id = profile_result.data.get("agency_id") if profile_result.data else None
    if not agency_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You are not associated with any agency")
    return agency_id


@router.put("/me", response_model=AgencyResponse)
async def update_my_agency(updates: AgencyUpdate, user: UserProfile = Depends(require_superadmin), supabase: Client = Depends(get_supabase)):
    """Update agency settings (superadmin only)."""
    agency_id = await get_user_agency_id(user, supabase)
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    result = supabase.table("agencies").update(update_data).eq("id", agency_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agency not found")
    
    agency = result.data[0]
    return AgencyResponse(
        id=agency["id"], name=agency["name"], slug=agency["slug"],
        tagline=agency.get("tagline"), logo_url=agency.get("logo_url"),
        primary_color=agency.get("primary_color"), secondary_color=agency.get("secondary_color"),
        website=agency.get("website"), phone=agency.get("phone"), email=agency.get("email")
    )


@router.post("/me/logo", response_model=AgencyResponse)
async def upload_agency_logo(file: UploadFile = File(...), user: UserProfile = Depends(require_superadmin), supabase: Client = Depends(get_supabase)):
    """Upload agency logo (superadmin only)."""
    agency_id = await get_user_agency_id(user, supabase)
    
    allowed_types = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}")
    
    ext = file.filename.split(".")[-1] if file.filename else "png"
    filename = f"{agency_id}/logo-{uuid.uuid4().hex[:8]}.{ext}"
    content = await file.read()
    
    try:
        supabase.storage.from_("agency-assets").upload(filename, content, {"content-type": file.content_type})
    except Exception as e:
        if "Duplicate" in str(e) or "already exists" in str(e).lower():
            supabase.storage.from_("agency-assets").remove([filename])
            supabase.storage.from_("agency-assets").upload(filename, content, {"content-type": file.content_type})
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to upload logo: {str(e)}")
    
    logo_url = supabase.storage.from_("agency-assets").get_public_url(filename)
    result = supabase.table("agencies").update({"logo_url": logo_url}).eq("id", agency_id).execute()
    agency = result.data[0]
    
    return AgencyResponse(
        id=agency["id"], name=agency["name"], slug=agency["slug"],
        tagline=agency.get("tagline"), logo_url=agency.get("logo_url"),
        primary_color=agency.get("primary_color"), secondary_color=agency.get("secondary_color"),
        website=agency.get("website"), phone=agency.get("phone"), email=agency.get("email")
    )


@router.post("/me/locations", response_model=LocationResponse)
async def create_location(location: LocationCreate, user: UserProfile = Depends(require_superadmin), supabase: Client = Depends(get_supabase)):
    """Create a new location (superadmin only)."""
    agency_id = await get_user_agency_id(user, supabase)
    slug = generate_slug(location.name)
    
    existing = supabase.table("locations").select("id").eq("agency_id", agency_id).eq("slug", slug).execute()
    if existing.data:
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"
    
    result = supabase.table("locations").insert({
        "agency_id": agency_id, "name": location.name, "slug": slug,
        "address_line1": location.address_line1, "address_line2": location.address_line2,
        "city": location.city, "state": location.state, "zip": location.zip,
        "phone": location.phone, "email": location.email,
        "is_hiring": location.is_hiring, "is_active": True
    }).execute()
    
    loc = result.data[0]
    return LocationResponse(
        id=loc["id"], name=loc["name"], slug=loc["slug"],
        address_line1=loc.get("address_line1"), address_line2=loc.get("address_line2"),
        city=loc["city"], state=loc["state"], zip=loc.get("zip"),
        phone=loc.get("phone"), email=loc.get("email"),
        is_hiring=loc.get("is_hiring", True), is_active=loc.get("is_active", True)
    )


@router.put("/me/locations/{location_id}", response_model=LocationResponse)
async def update_location(location_id: str, updates: LocationUpdate, user: UserProfile = Depends(require_superadmin), supabase: Client = Depends(get_supabase)):
    """Update a location (superadmin only)."""
    agency_id = await get_user_agency_id(user, supabase)
    
    existing = supabase.table("locations").select("id").eq("id", location_id).eq("agency_id", agency_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    result = supabase.table("locations").update(update_data).eq("id", location_id).execute()
    loc = result.data[0]
    
    return LocationResponse(
        id=loc["id"], name=loc["name"], slug=loc["slug"],
        address_line1=loc.get("address_line1"), address_line2=loc.get("address_line2"),
        city=loc["city"], state=loc["state"], zip=loc.get("zip"),
        phone=loc.get("phone"), email=loc.get("email"),
        is_hiring=loc.get("is_hiring", True), is_active=loc.get("is_active", True)
    )


@router.delete("/me/locations/{location_id}")
async def delete_location(location_id: str, user: UserProfile = Depends(require_superadmin), supabase: Client = Depends(get_supabase)):
    """Delete a location (superadmin only). Sets is_active to false."""
    agency_id = await get_user_agency_id(user, supabase)
    
    existing = supabase.table("locations").select("id").eq("id", location_id).eq("agency_id", agency_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    supabase.table("locations").update({"is_active": False}).eq("id", location_id).execute()
    return {"message": "Location deleted"}
