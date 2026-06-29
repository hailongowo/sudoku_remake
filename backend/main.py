from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import Settings, get_settings
from backend.database import get_supabase
from backend.routes.admin import router as admin_router
from backend.routes.casual import router as casual_router
from backend.routes.leaderboard import router as leaderboard_router
from backend.routes.players import router as players_router
from backend.routes.rated import router as rated_router
from backend.schemas import HealthResponse, MessageResponse


def create_app(settings: Settings | None = None, validate_services: bool = True) -> FastAPI:
    active_settings = settings or get_settings()

    if validate_services:
        get_supabase()

    application = FastAPI(title="Sudoku Platform API")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(active_settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(admin_router)
    application.include_router(rated_router)
    application.include_router(casual_router)
    application.include_router(players_router)
    application.include_router(leaderboard_router)

    @application.get("/", response_model=MessageResponse)
    def root():
        return {"message": "Sudoku backend is running"}

    @application.get("/health", response_model=HealthResponse)
    def health():
        return {
            "status": "ok",
            "environment": active_settings.environment,
        }

    return application


app = create_app()
