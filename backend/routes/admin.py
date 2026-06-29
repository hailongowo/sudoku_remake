from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.auth import AuthenticatedUser, get_current_user
from backend.database import DatabaseOperationError, call_rpc
from backend.schemas import AdminMeResponse, AdminUserEntry


router = APIRouter(prefix="/admin", tags=["Admin"])


class AdminUpdateUserRequest(BaseModel):
    display_name: str = Field(min_length=3, max_length=24)


class AdminSuspendUserRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=300)


ADMIN_RPC_ERRORS: tuple[tuple[str, int, str], ...] = (
    ("admin_forbidden", status.HTTP_403_FORBIDDEN, "Admin access required"),
    ("admin_user_not_found", status.HTTP_404_NOT_FOUND, "User not found"),
    ("admin_invalid_suspension_reason", 422, "Suspension reason must be at least 3 characters"),
    ("profile_invalid_display_name", 422, "Display name must be 3-24 letters, numbers, spaces, underscores, or hyphens"),
    ("profile_display_name_taken", status.HTTP_409_CONFLICT, "Display name is already taken"),
    ("admin_user_suspended", status.HTTP_403_FORBIDDEN, "This account is suspended from rated play"),
)


def _call_admin_rpc(name: str, params: dict[str, Any]) -> Any:
    try:
        return call_rpc(name, params)
    except DatabaseOperationError as exc:
        for marker, status_code, detail in ADMIN_RPC_ERRORS:
            if marker in exc.message:
                raise HTTPException(status_code=status_code, detail=detail) from exc

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin service is temporarily unavailable",
        ) from exc


@router.get("/me", response_model=AdminMeResponse)
def get_admin_me(user: AuthenticatedUser = Depends(get_current_user)):
    return _call_admin_rpc("admin_get_me", {"p_admin_user_id": user.id})


@router.get("/users", response_model=list[AdminUserEntry])
def list_admin_users(
    search: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: AuthenticatedUser = Depends(get_current_user),
):
    return _call_admin_rpc(
        "admin_list_users",
        {
            "p_admin_user_id": user.id,
            "p_search": search,
            "p_limit": limit,
            "p_offset": offset,
        },
    )


@router.patch("/users/{target_user_id}", response_model=AdminUserEntry)
def update_admin_user(
    target_user_id: UUID,
    payload: AdminUpdateUserRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    return _call_admin_rpc(
        "admin_update_user_profile",
        {
            "p_admin_user_id": user.id,
            "p_target_user_id": str(target_user_id),
            "p_display_name": payload.display_name,
        },
    )


@router.post("/users/{target_user_id}/suspend", response_model=AdminUserEntry)
def suspend_admin_user(
    target_user_id: UUID,
    payload: AdminSuspendUserRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    return _call_admin_rpc(
        "admin_suspend_user",
        {
            "p_admin_user_id": user.id,
            "p_target_user_id": str(target_user_id),
            "p_reason": payload.reason,
        },
    )


@router.post("/users/{target_user_id}/reactivate", response_model=AdminUserEntry)
def reactivate_admin_user(
    target_user_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
):
    return _call_admin_rpc(
        "admin_reactivate_user",
        {
            "p_admin_user_id": user.id,
            "p_target_user_id": str(target_user_id),
        },
    )
