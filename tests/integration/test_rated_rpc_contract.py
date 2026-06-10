import os
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from supabase import create_client


pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def supabase_client():
    if os.getenv("RUN_SUPABASE_INTEGRATION") != "1":
        pytest.skip("Set RUN_SUPABASE_INTEGRATION=1 for Supabase integration tests")

    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


@pytest.fixture
def rated_user(supabase_client):
    suffix = uuid4().hex
    auth_response = supabase_client.auth.admin.create_user(
        {
            "email": f"rated-integration-{suffix}@example.com",
            "password": f"Rated-{suffix}",
            "email_confirm": True,
        }
    )
    user_id = str(auth_response.user.id)

    try:
        yield user_id
    finally:
        supabase_client.auth.admin.delete_user(user_id)


def test_concurrent_rated_lifecycle_is_consistent_and_idempotent(
    supabase_client,
    rated_user,
):
    user_id = rated_user

    def start_game():
        return supabase_client.rpc(
            "start_rated_game",
            {"p_user_id": user_id},
        ).execute().data

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _index: start_game(), range(2)))

    assert results[0]["game_id"] == results[1]["game_id"]
    game_id = results[0]["game_id"]
    active = (
        supabase_client.table("games")
        .select("id, puzzle_id, current_board, rating_before")
        .eq("user_id", user_id)
        .in_("status", ["started", "in_progress"])
        .execute()
        .data
    )
    assert len(active) == 1

    with pytest.raises(Exception):
        supabase_client.rpc(
            "finish_rated_game",
            {"p_user_id": user_id, "p_game_id": game_id},
        ).execute()

    unchanged_game = (
        supabase_client.table("games")
        .select("status, rating_applied_at")
        .eq("id", game_id)
        .single()
        .execute()
        .data
    )
    assert unchanged_game == {"status": "in_progress", "rating_applied_at": None}

    solution = (
        supabase_client.table("puzzles")
        .select("solution_board")
        .eq("id", active[0]["puzzle_id"])
        .single()
        .execute()
        .data["solution_board"]
    )
    current_board = active[0]["current_board"]
    for row in range(9):
        for column in range(9):
            if current_board[row][column] == 0:
                supabase_client.rpc(
                    "move_rated_game",
                    {
                        "p_user_id": user_id,
                        "p_game_id": game_id,
                        "p_row": row,
                        "p_column": column,
                        "p_value": solution[row][column],
                    },
                ).execute()

    def finish_game():
        return supabase_client.rpc(
            "finish_rated_game",
            {"p_user_id": user_id, "p_game_id": game_id},
        ).execute().data

    with ThreadPoolExecutor(max_workers=2) as executor:
        finishes = list(executor.map(lambda _index: finish_game(), range(2)))

    assert finishes[0]["rating_after"] == finishes[1]["rating_after"]
    history = (
        supabase_client.table("rating_history")
        .select("rating_before, rating_after, rating_change")
        .eq("game_id", game_id)
        .execute()
        .data
    )
    assert len(history) == 1
    assert history[0]["rating_after"] - history[0]["rating_before"] == history[0]["rating_change"]

    profile_rating = (
        supabase_client.table("profiles")
        .select("rating")
        .eq("id", user_id)
        .single()
        .execute()
        .data["rating"]
    )
    assert profile_rating == history[0]["rating_after"]


def test_server_authoritative_events_resume_abandon_expiry_and_fallback(
    supabase_client,
    rated_user,
):
    user_id = rated_user
    supabase_client.table("profiles").update({"rating": 2500}).eq("id", user_id).execute()

    started = supabase_client.rpc(
        "start_rated_game",
        {"p_user_id": user_id},
    ).execute().data
    resumed = supabase_client.rpc(
        "start_rated_game",
        {"p_user_id": user_id},
    ).execute().data
    assert resumed["game_id"] == started["game_id"]
    assert resumed["active_game_exists"] is True

    game_id = started["game_id"]
    puzzle_board = started["puzzle_board"]
    solution = (
        supabase_client.table("puzzles")
        .select("solution_board")
        .eq("id", started["puzzle_id"])
        .single()
        .execute()
        .data["solution_board"]
    )
    given = next(
        (row, column)
        for row in range(9)
        for column in range(9)
        if puzzle_board[row][column] != 0
    )
    empty = next(
        (row, column)
        for row in range(9)
        for column in range(9)
        if puzzle_board[row][column] == 0
    )

    wrong_value = solution[empty[0]][empty[1]] % 9 + 1
    wrong = supabase_client.rpc(
        "move_rated_game",
        {
            "p_user_id": user_id,
            "p_game_id": game_id,
            "p_row": empty[0],
            "p_column": empty[1],
            "p_value": wrong_value,
        },
    ).execute().data
    assert wrong["correct"] is False
    assert wrong["mistakes_made"] == 1
    assert wrong["current_board"][empty[0]][empty[1]] == 0

    with pytest.raises(Exception):
        supabase_client.rpc(
            "move_rated_game",
            {
                "p_user_id": user_id,
                "p_game_id": game_id,
                "p_row": given[0],
                "p_column": given[1],
                "p_value": puzzle_board[given[0]][given[1]],
            },
        ).execute()

    hint = supabase_client.rpc(
        "hint_rated_game",
        {"p_user_id": user_id, "p_game_id": game_id},
    ).execute().data
    assert hint["accepted"] is True
    assert hint["hints_used"] == 1

    abandoned = supabase_client.rpc(
        "abandon_rated_game",
        {"p_user_id": user_id, "p_game_id": game_id},
    ).execute().data
    repeated = supabase_client.rpc(
        "abandon_rated_game",
        {"p_user_id": user_id, "p_game_id": game_id},
    ).execute().data
    assert abandoned["status"] == "abandoned"
    assert repeated["rating_after"] == abandoned["rating_after"]

    next_game = supabase_client.rpc(
        "start_rated_game",
        {"p_user_id": user_id},
    ).execute().data
    supabase_client.table("games").update(
        {"started_at": "2000-01-01T00:00:00Z"}
    ).eq("id", next_game["game_id"]).execute()

    active_after_expiry = supabase_client.rpc(
        "get_active_rated_game",
        {"p_user_id": user_id},
    ).execute().data
    assert active_after_expiry is None

    replacement = supabase_client.rpc(
        "start_rated_game",
        {"p_user_id": user_id},
    ).execute().data
    expired = (
        supabase_client.table("games")
        .select("status")
        .eq("id", next_game["game_id"])
        .single()
        .execute()
        .data
    )
    assert expired["status"] == "expired"
    assert replacement["game_id"] != next_game["game_id"]


def test_disposable_casual_puzzle_profile_and_leaderboard(
    supabase_client,
    rated_user,
):
    user_id = rated_user
    profile = supabase_client.rpc(
        "update_player_profile",
        {"p_user_id": user_id, "p_display_name": f"Test-{uuid4().hex[:8]}"},
    ).execute().data

    games_before = (
        supabase_client.table("games")
        .select("id")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    puzzle = supabase_client.rpc(
        "get_random_puzzle",
        {"p_difficulty": "Easy"},
    ).execute().data[0]
    games_after = (
        supabase_client.table("games")
        .select("id")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    assert "solution_board" not in puzzle
    assert games_after == games_before

    summary = supabase_client.rpc(
        "get_player_summary",
        {"p_user_id": user_id},
    ).execute().data
    assert summary["display_name"] == profile["display_name"]
    assert summary["rating_rank"] >= 1

    leaderboard = supabase_client.rpc(
        "get_rating_leaderboard",
        {"p_limit": 100, "p_offset": 0},
    ).execute().data
    assert any(row["display_name"] == profile["display_name"] for row in leaderboard)
