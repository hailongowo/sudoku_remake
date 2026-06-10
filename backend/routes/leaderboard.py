from fastapi import APIRouter, Query

from backend.routes.common import call_route_rpc
from backend.schemas import LeaderboardEntry


router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


@router.get("/rating", response_model=list[LeaderboardEntry])
def rating_leaderboard(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return call_route_rpc(
        "get_rating_leaderboard",
        {"p_limit": limit, "p_offset": offset},
    )
