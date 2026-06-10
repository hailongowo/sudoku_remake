from uuid import uuid4

from fastapi.testclient import TestClient

from backend.auth import AuthenticatedUser, get_current_user
from backend.config import Settings
from backend.database import DatabaseOperationError
from backend.main import create_app
from backend.routes import rated


def rated_game_payload(**extra):
    payload = {
        "game_id": str(uuid4()),
        "puzzle_id": str(uuid4()),
        "mode": "rated",
        "status": "in_progress",
        "puzzle_board": [[0] * 9 for _ in range(9)],
        "current_board": [[0] * 9 for _ in range(9)],
        "difficulty": "Easy",
        "puzzle_rating": 700,
        "rating_before": 1000,
        "rating_after": None,
        "rating_change": None,
        "formula_version": None,
        "hints_used": 0,
        "mistakes_made": 0,
        "time_spent": 0,
        "started_at": "2026-06-07T00:00:00Z",
        "last_activity_at": "2026-06-07T00:00:00Z",
        "completed_at": None,
    }
    payload.update(extra)
    return payload


def make_client(user_id: str = "user-from-token") -> TestClient:
    settings = Settings(
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="test-service-role-key",
        cors_origins=("http://localhost:5173",),
        environment="test",
    )
    app = create_app(settings=settings, validate_services=False)
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=user_id)
    return TestClient(app)


def test_rated_endpoint_requires_authentication():
    settings = Settings(
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="test-service-role-key",
        cors_origins=("http://localhost:5173",),
        environment="test",
    )
    client = TestClient(create_app(settings=settings, validate_services=False))

    response = client.post("/rated/start")

    assert response.status_code == 401


def test_start_uses_authenticated_user_not_request_identity(monkeypatch):
    calls = []
    monkeypatch.setattr(
        rated,
        "call_rpc",
        lambda name, params: calls.append((name, params)) or rated_game_payload(),
    )

    response = make_client().post("/rated/start", json={"user_id": "attacker-choice"})

    assert response.status_code == 200
    assert calls == [("start_rated_game", {"p_user_id": "user-from-token"})]


def test_move_sends_only_bounded_move_and_authenticated_user(monkeypatch):
    calls = []
    monkeypatch.setattr(
        rated,
        "call_rpc",
        lambda name, params: calls.append((name, params)) or rated_game_payload(correct=True),
    )
    game_id = uuid4()

    response = make_client().post(
        f"/rated/{game_id}/move",
        json={"row": 2, "column": 3, "value": 7, "mistakes_made": -100},
    )

    assert response.status_code == 200
    assert calls == [
        (
            "move_rated_game",
            {
                "p_user_id": "user-from-token",
                "p_game_id": str(game_id),
                "p_row": 2,
                "p_column": 3,
                "p_value": 7,
            },
        )
    ]


def test_invalid_move_is_rejected_before_rpc(monkeypatch):
    monkeypatch.setattr(
        rated,
        "call_rpc",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("RPC called")),
    )

    response = make_client().post(
        f"/rated/{uuid4()}/move",
        json={"row": 9, "column": 0, "value": 1},
    )

    assert response.status_code == 422


def test_finish_has_no_client_board_or_statistics(monkeypatch):
    calls = []
    monkeypatch.setattr(
        rated,
        "call_rpc",
        lambda name, params: calls.append((name, params))
        or rated_game_payload(
            status="completed",
            rating_after=1020,
            rating_change=20,
            formula_version="elo-performance-v1",
            completed_at="2026-06-07T00:10:00Z",
        ),
    )
    game_id = uuid4()

    response = make_client().post(
        f"/rated/{game_id}/finish",
        json={"current_board": [], "time_spent": -999, "hints_used": -999},
    )

    assert response.status_code == 200
    assert calls == [
        (
            "finish_rated_game",
            {"p_user_id": "user-from-token", "p_game_id": str(game_id)},
        )
    ]


def test_known_rpc_errors_are_mapped_without_leaking_database_details(monkeypatch):
    monkeypatch.setattr(
        rated,
        "call_rpc",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            DatabaseOperationError("finish_rated_game", "rated_game_incomplete: secret")
        ),
    )

    response = make_client().post(f"/rated/{uuid4()}/finish")

    assert response.status_code == 409
    assert response.json() == {"detail": "The rated puzzle is not complete"}
