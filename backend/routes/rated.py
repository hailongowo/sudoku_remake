from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.auth import AuthenticatedUser, get_current_user
from backend.database import DatabaseOperationError, call_rpc
from backend.schemas import PoolCoverageResponse, RatedGameResponse, RatedHistoryEntry


router = APIRouter(prefix="/rated", tags=["Rated"])


class RatedMoveRequest(BaseModel):
    row: int = Field(ge=0, le=8)
    column: int = Field(ge=0, le=8)
    value: int = Field(ge=1, le=9)


RPC_ERRORS: tuple[tuple[str, int, str], ...] = (
    ("rated_profile_not_found", status.HTTP_404_NOT_FOUND, "User profile not found"),
    ("rated_game_not_found", status.HTTP_404_NOT_FOUND, "Rated game not found"),
    ("rated_no_puzzles", status.HTTP_503_SERVICE_UNAVAILABLE, "No rated puzzles available"),
    ("rated_game_incomplete", status.HTTP_409_CONFLICT, "The rated puzzle is not complete"),
    ("rated_game_not_active", status.HTTP_409_CONFLICT, "The rated game is not active"),
    ("rated_game_complete", status.HTTP_409_CONFLICT, "The rated puzzle is already complete"),
    ("rated_given_cell", status.HTTP_409_CONFLICT, "Given cells cannot be changed"),
    ("rated_rating_conflict", status.HTTP_409_CONFLICT, "Player rating changed during the game"),
    ("rated_invalid_move", 422, "Invalid Sudoku move"),
    ("rated_invalid_statistics", 422, "Invalid rated statistics"),
    ("rated_invalid_final_status", 422, "Invalid rated result"),
)


def _call_rated_rpc(name: str, params: dict[str, Any]) -> Any:
    try:
        return call_rpc(name, params)
    except DatabaseOperationError as exc:
        for marker, status_code, detail in RPC_ERRORS:
            if marker in exc.message:
                raise HTTPException(status_code=status_code, detail=detail) from exc

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Rated service is temporarily unavailable",
        ) from exc


@router.post("/start", response_model=RatedGameResponse, response_model_exclude_none=True)
def start_rated_game(user: AuthenticatedUser = Depends(get_current_user)):
    return _call_rated_rpc(
        "start_rated_game",
        {"p_user_id": user.id},
    )


@router.get("/active", response_model=RatedGameResponse | None, response_model_exclude_none=True)
def get_active_rated_game(user: AuthenticatedUser = Depends(get_current_user)):
    return _call_rated_rpc(
        "get_active_rated_game",
        {"p_user_id": user.id},
    )


@router.get("/history", response_model=list[RatedHistoryEntry])
def get_rated_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: AuthenticatedUser = Depends(get_current_user),
):
    return _call_rated_rpc(
        "get_rated_history",
        {"p_user_id": user.id, "p_limit": limit, "p_offset": offset},
    )


@router.post("/{game_id}/move", response_model=RatedGameResponse, response_model_exclude_none=True)
def move_rated_game(
    game_id: UUID,
    payload: RatedMoveRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    return _call_rated_rpc(
        "move_rated_game",
        {
            "p_user_id": user.id,
            "p_game_id": str(game_id),
            "p_row": payload.row,
            "p_column": payload.column,
            "p_value": payload.value,
        },
    )


@router.post("/{game_id}/hint", response_model=RatedGameResponse, response_model_exclude_none=True)
def hint_rated_game(
    game_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
):
    return _call_rated_rpc(
        "hint_rated_game",
        {"p_user_id": user.id, "p_game_id": str(game_id)},
    )


@router.post("/{game_id}/finish", response_model=RatedGameResponse, response_model_exclude_none=True)
def finish_rated_game(
    game_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
):
    return _call_rated_rpc(
        "finish_rated_game",
        {"p_user_id": user.id, "p_game_id": str(game_id)},
    )


@router.post("/{game_id}/abandon", response_model=RatedGameResponse, response_model_exclude_none=True)
def abandon_rated_game(
    game_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
):
    return _call_rated_rpc(
        "abandon_rated_game",
        {"p_user_id": user.id, "p_game_id": str(game_id)},
    )


@router.get("/pool-coverage", response_model=PoolCoverageResponse)
def rated_pool_coverage(
    minimum: int = Query(default=500, ge=0, le=5000),
    maximum: int = Query(default=2500, ge=0, le=5000),
    step: int = Query(default=100, ge=1, le=1000),
    _user: AuthenticatedUser = Depends(get_current_user),
):
    if minimum > maximum:
        raise HTTPException(
            status_code=422,
            detail="minimum cannot be greater than maximum",
        )

    return _call_rated_rpc(
        "rated_puzzle_pool_coverage",
        {
            "p_min_rating": minimum,
            "p_max_rating": maximum,
            "p_step": step,
        },
    )
