from uuid import uuid4

from fastapi.testclient import TestClient

from backend.auth import AuthenticatedUser, get_current_user
from backend.config import Settings
from backend.database import DatabaseOperationError
from backend.main import create_app
from backend.routes import admin, rated


def make_client(user_id: str = "admin-user") -> TestClient:
    settings = Settings(
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="test-service-role-key",
        cors_origins=("http://localhost:5173",),
        environment="test",
    )
    app = create_app(settings=settings, validate_services=False)
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=user_id)
    return TestClient(app)


def admin_user_payload(**extra):
    payload = {
        "id": str(uuid4()),
        "display_name": "Player One",
        "rating": 1000,
        "rating_rank": 1,
        "rated_games": 5,
        "rated_wins": 3,
        "rated_losses": 2,
        "peak_rating": 1050,
        "suspended_at": None,
        "suspended_by": None,
        "suspension_reason": None,
        "created_at": "2026-06-07T00:00:00Z",
        "updated_at": "2026-06-07T00:00:00Z",
    }
    payload.update(extra)
    return payload


def test_non_admin_receives_403(monkeypatch):
    monkeypatch.setattr(
        admin,
        "call_rpc",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            DatabaseOperationError("admin_get_me", "admin_forbidden")
        ),
    )

    response = make_client("regular-user").get("/admin/me")

    assert response.status_code == 403
    assert response.json() == {"detail": "Admin access required"}


def test_admin_me_uses_authenticated_user(monkeypatch):
    calls = []
    monkeypatch.setattr(
        admin,
        "call_rpc",
        lambda name, params: calls.append((name, params))
        or {
            "id": str(uuid4()),
            "display_name": "Admin",
            "rating": 1000,
            "created_at": "2026-06-07T00:00:00Z",
            "updated_at": "2026-06-07T00:00:00Z",
        },
    )

    response = make_client("admin-from-token").get("/admin/me")

    assert response.status_code == 200
    assert calls == [("admin_get_me", {"p_admin_user_id": "admin-from-token"})]


def test_admin_lists_searches_and_mutates_users(monkeypatch):
    calls = []
    target_id = uuid4()

    def fake_rpc(name, params):
        calls.append((name, params))
        if name == "admin_list_users":
            return [admin_user_payload(id=str(target_id))]
        return admin_user_payload(id=str(target_id), display_name="Updated Name")

    monkeypatch.setattr(admin, "call_rpc", fake_rpc)
    client = make_client()

    assert client.get("/admin/users?search=Player&limit=10&offset=5").status_code == 200
    assert client.patch(f"/admin/users/{target_id}", json={"display_name": "Updated Name"}).status_code == 200
    assert client.post(f"/admin/users/{target_id}/suspend", json={"reason": "Toxic play"}).status_code == 200
    assert client.post(f"/admin/users/{target_id}/reactivate").status_code == 200
    assert calls == [
        (
            "admin_list_users",
            {
                "p_admin_user_id": "admin-user",
                "p_search": "Player",
                "p_limit": 10,
                "p_offset": 5,
            },
        ),
        (
            "admin_update_user_profile",
            {
                "p_admin_user_id": "admin-user",
                "p_target_user_id": str(target_id),
                "p_display_name": "Updated Name",
            },
        ),
        (
            "admin_suspend_user",
            {
                "p_admin_user_id": "admin-user",
                "p_target_user_id": str(target_id),
                "p_reason": "Toxic play",
            },
        ),
        (
            "admin_reactivate_user",
            {
                "p_admin_user_id": "admin-user",
                "p_target_user_id": str(target_id),
            },
        ),
    ]


def test_suspended_users_cannot_start_rated_games(monkeypatch):
    monkeypatch.setattr(
        rated,
        "call_rpc",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            DatabaseOperationError("start_rated_game", "admin_user_suspended")
        ),
    )

    response = make_client("suspended-user").post("/rated/start")

    assert response.status_code == 403
    assert response.json() == {"detail": "This account is suspended from rated play"}
