from functools import lru_cache
from typing import Any

from supabase import create_client

from backend.config import get_settings


class DatabaseOperationError(RuntimeError):
    def __init__(self, operation: str, message: str):
        super().__init__(message)
        self.operation = operation
        self.message = message


@lru_cache
def get_supabase():
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )


def call_rpc(name: str, params: dict[str, Any]) -> Any:
    try:
        response = get_supabase().rpc(name, params).execute()
    except Exception as exc:
        message = str(getattr(exc, "message", None) or exc)
        raise DatabaseOperationError(name, message) from exc

    return response.data
