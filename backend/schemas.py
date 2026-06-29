from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


Difficulty = Literal["Easy", "Medium", "Hard", "Expert", "Master"]
GameStatus = Literal[
    "started",
    "in_progress",
    "completed",
    "failed",
    "abandoned",
    "expired",
]
Board = list[list[int]]


class MessageResponse(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
    environment: str


class CasualPuzzleResponse(BaseModel):
    id: UUID
    puzzle_board: Board
    difficulty: Difficulty
    puzzle_rating: int
    given_count: int


class HintResponse(BaseModel):
    row: int
    column: int
    value: int


class RatedGameResponse(BaseModel):
    game_id: UUID
    puzzle_id: UUID
    mode: Literal["rated"]
    status: GameStatus
    puzzle_board: Board
    current_board: Board
    difficulty: Difficulty
    puzzle_rating: int
    rating_before: int
    rating_after: int | None = None
    rating_change: int | None = None
    formula_version: str | None = None
    rating_eligible: bool | None = None
    rating_ineligibility_reason: Literal["hint_used", "too_many_mistakes"] | None = None
    hints_used: int
    mistakes_made: int
    time_spent: int
    started_at: datetime
    last_activity_at: datetime
    completed_at: datetime | None = None
    active_game_exists: bool | None = None
    accepted: bool | None = None
    correct: bool | None = None
    reason: str | None = None
    hint: HintResponse | None = None
    already_finalized: bool | None = None


class RatedHistoryEntry(BaseModel):
    game_id: UUID
    puzzle_id: UUID
    difficulty: Difficulty
    puzzle_rating: int
    status: GameStatus
    rating_before: int
    rating_after: int | None = None
    rating_change: int | None = None
    formula_version: str | None = None
    time_spent: int | None = None
    hints_used: int
    mistakes_made: int
    started_at: datetime
    completed_at: datetime | None = None


class PlayerProfileResponse(BaseModel):
    id: UUID
    display_name: str
    rating: int
    created_at: datetime
    updated_at: datetime


class PlayerSummaryResponse(PlayerProfileResponse):
    rating_rank: int
    rated_games: int
    rated_wins: int
    rated_losses: int
    peak_rating: int
    suspended_at: datetime | None = None
    suspended_by: UUID | None = None
    suspension_reason: str | None = None


class LeaderboardEntry(BaseModel):
    rank: int
    display_name: str
    rating: int
    rated_games: int
    rated_wins: int


class PoolCoverageEntry(BaseModel):
    target_rating: int
    eligible_count: int


class PoolCoverageResponse(BaseModel):
    puzzle_count: int
    min_rating: int | None
    max_rating: int | None
    healthy: bool
    coverage: list[PoolCoverageEntry]


class AdminMeResponse(BaseModel):
    id: UUID
    display_name: str
    rating: int
    created_at: datetime
    updated_at: datetime


class AdminUserEntry(BaseModel):
    id: UUID
    display_name: str
    rating: int
    rating_rank: int
    rated_games: int
    rated_wins: int
    rated_losses: int
    peak_rating: int
    suspended_at: datetime | None = None
    suspended_by: UUID | None = None
    suspension_reason: str | None = None
    created_at: datetime
    updated_at: datetime
