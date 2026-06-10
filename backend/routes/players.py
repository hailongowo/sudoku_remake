from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.auth import AuthenticatedUser, get_current_user
from backend.routes.common import call_route_rpc
from backend.schemas import PlayerProfileResponse, PlayerSummaryResponse


router = APIRouter(prefix="/players", tags=["Players"])


class UpdatePlayerRequest(BaseModel):
    display_name: str = Field(min_length=3, max_length=24)


@router.get("/me", response_model=PlayerSummaryResponse)
def get_me(user: AuthenticatedUser = Depends(get_current_user)):
    return call_route_rpc(
        "get_player_summary",
        {"p_user_id": user.id},
    )


@router.patch("/me", response_model=PlayerProfileResponse)
def update_me(
    payload: UpdatePlayerRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    return call_route_rpc(
        "update_player_profile",
        {"p_user_id": user.id, "p_display_name": payload.display_name},
    )
