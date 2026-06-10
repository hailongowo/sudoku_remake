from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status

from backend.routes.common import call_route_rpc
from backend.schemas import CasualPuzzleResponse


router = APIRouter(prefix="/casual", tags=["Casual"])
Difficulty = Literal["Easy", "Medium", "Hard", "Expert", "Master"]


@router.get("/new", response_model=CasualPuzzleResponse)
def new_casual_puzzle(difficulty: Difficulty | None = Query(default=None)):
    puzzles = call_route_rpc(
        "get_random_puzzle",
        {"p_difficulty": difficulty},
    )
    if not puzzles:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No casual puzzles available",
        )
    return puzzles[0]
