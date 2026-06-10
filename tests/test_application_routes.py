from uuid import uuid4

from fastapi.testclient import TestClient

from backend.auth import AuthenticatedUser, get_current_user
from backend.config import Settings
from backend.main import create_app
from backend.routes import casual, leaderboard, players, rated


def make_client(user_id: str = "authenticated-player") -> TestClient:
    settings = Settings(
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="test-service-role-key",
        cors_origins=("http://localhost:5173",),
        environment="test",
    )
    app = create_app(settings=settings, validate_services=False)
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=user_id)
    return TestClient(app)


def test_casual_new_returns_disposable_safe_puzzle(monkeypatch):
    calls = []
    monkeypatch.setattr(
        casual,
        "call_route_rpc",
        lambda name, params: calls.append((name, params))
        or [
            {
                "id": str(uuid4()),
                "puzzle_board": [[0] * 9 for _ in range(9)],
                "difficulty": "Easy",
                "puzzle_rating": 700,
                "given_count": 30,
            }
        ],
    )

    response = make_client().get("/casual/new?difficulty=Easy")

    assert response.status_code == 200
    assert calls == [("get_random_puzzle", {"p_difficulty": "Easy"})]
    assert "solution_board" not in response.json()
    assert "game_id" not in response.json()


def test_casual_new_validates_difficulty(monkeypatch):
    monkeypatch.setattr(
        casual,
        "call_route_rpc",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("RPC called")),
    )

    response = make_client().get("/casual/new?difficulty=Impossible")

    assert response.status_code == 422


def test_player_profile_routes_derive_identity_from_auth(monkeypatch):
    calls = []
    monkeypatch.setattr(
        players,
        "call_route_rpc",
        lambda name, params: calls.append((name, params))
        or {
            "id": str(uuid4()),
            "display_name": "New Name",
            "rating": 1000,
            "created_at": "2026-06-07T00:00:00Z",
            "updated_at": "2026-06-07T00:00:00Z",
        },
    )

    response = make_client().patch("/players/me", json={"display_name": "New Name"})

    assert response.status_code == 200
    assert calls == [
        (
            "update_player_profile",
            {"p_user_id": "authenticated-player", "p_display_name": "New Name"},
        )
    ]


def test_leaderboard_is_public_and_does_not_expose_user_ids(monkeypatch):
    monkeypatch.setattr(
        leaderboard,
        "call_route_rpc",
        lambda name, params: [
            {
                "rank": 1,
                "display_name": "Player-one",
                "rating": 1500,
                "rated_games": 10,
                "rated_wins": 7,
            }
        ],
    )
    settings = Settings(
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="test-service-role-key",
        cors_origins=("http://localhost:5173",),
        environment="test",
    )
    client = TestClient(create_app(settings=settings, validate_services=False))

    response = client.get("/leaderboard/rating")

    assert response.status_code == 200
    assert "id" not in response.json()[0]


def test_rated_active_and_history_use_authenticated_user(monkeypatch):
    calls = []
    monkeypatch.setattr(
        rated,
        "call_rpc",
        lambda name, params: calls.append((name, params))
        or (None if name == "get_active_rated_game" else []),
    )
    client = make_client()

    assert client.get("/rated/active").status_code == 200
    assert client.get("/rated/history?limit=10&offset=5").status_code == 200
    assert calls == [
        ("get_active_rated_game", {"p_user_id": "authenticated-player"}),
        (
            "get_rated_history",
            {"p_user_id": "authenticated-player", "p_limit": 10, "p_offset": 5},
        ),
    ]


def test_no_solution_or_standalone_validation_endpoint_is_exposed():
    client = make_client()
    paths = client.app.openapi()["paths"]

    assert "/puzzles/validate-move" not in paths
    assert "/casual/new" in paths
    assert all("{game_id}" not in path for path in paths if path.startswith("/casual/"))
    assert "/rated/{game_id}/move" in paths
