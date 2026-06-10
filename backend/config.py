import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent


class ConfigurationError(RuntimeError):
    pass


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    cors_origins: tuple[str, ...]
    environment: str


def _load_environment() -> None:
    load_dotenv(PROJECT_DIR / ".env", override=False)
    load_dotenv(BACKEND_DIR / ".env", override=False)


@lru_cache
def get_settings() -> Settings:
    _load_environment()

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    missing = [
        name
        for name, value in (
            ("SUPABASE_URL", supabase_url),
            ("SUPABASE_SERVICE_ROLE_KEY", service_role_key),
        )
        if not value
    ]
    if missing:
        raise ConfigurationError(
            f"Missing required environment variables: {', '.join(missing)}"
        )

    origins = tuple(
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    )
    if not origins:
        raise ConfigurationError("CORS_ORIGINS must contain at least one origin")
    if "*" in origins:
        raise ConfigurationError(
            "CORS_ORIGINS cannot use '*' while credentialed requests are enabled"
        )

    return Settings(
        supabase_url=supabase_url,
        supabase_service_role_key=service_role_key,
        cors_origins=origins,
        environment=os.getenv("APP_ENV", "development").strip() or "development",
    )
