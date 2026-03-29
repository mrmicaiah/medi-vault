"""Common response schemas used across the API."""

from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ErrorResponse(BaseModel):
    """Standard error response."""
    detail: str
    status_code: int = 400


class SuccessResponse(BaseModel):
    """Standard success response."""
    message: str
    data: Optional[Any] = None


class PaginatedResponse(BaseModel):
    """Paginated list response."""
    items: List[Any]
    total: int
    page: int = 1
    page_size: int = 25
    total_pages: int = 1

    @classmethod
    def create(cls, items: List[Any], total: int, page: int = 1, page_size: int = 25):
        total_pages = max(1, (total + page_size - 1) // page_size)
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
