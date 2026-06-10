from typing import Any

from fastapi import HTTPException, status

from backend.database import DatabaseOperationError, call_rpc


COMMON_RPC_ERRORS: tuple[tuple[str, int, str], ...] = (
    ("profile_not_found", status.HTTP_404_NOT_FOUND, "Player profile not found"),
    ("profile_invalid_display_name", 422, "Display name must be 3-24 letters, numbers, spaces, underscores, or hyphens"),
    ("profile_display_name_taken", status.HTTP_409_CONFLICT, "Display name is already taken"),
)


def call_route_rpc(
    name: str,
    params: dict[str, Any],
    errors: tuple[tuple[str, int, str], ...] = COMMON_RPC_ERRORS,
) -> Any:
    try:
        return call_rpc(name, params)
    except DatabaseOperationError as exc:
        for marker, status_code, detail in errors:
            if marker in exc.message:
                raise HTTPException(status_code=status_code, detail=detail) from exc

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service is temporarily unavailable",
        ) from exc
