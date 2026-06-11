import pytest

from backend.services.ratingService import (
    FORMULA_VERSION,
    calculate_rating_after,
    calculate_rating_change,
    expected_score,
)


def test_formula_version_is_recordable():
    assert FORMULA_VERSION == "elo-performance-v2"


def test_equal_rating_fast_clean_win_is_about_twenty_points():
    assert calculate_rating_change(True, 1200, 1200, 300, 0, 0) == 19


def test_harder_puzzle_rewards_more_and_hurts_less():
    hard_win = calculate_rating_change(True, 1200, 1600, 600, 0, 0)
    easy_win = calculate_rating_change(True, 1200, 800, 600, 0, 0)
    hard_loss = calculate_rating_change(False, 1200, 1600, 600, 0, 0)
    easy_loss = calculate_rating_change(False, 1200, 800, 600, 0, 0)

    assert hard_win > easy_win
    assert hard_loss > easy_loss


def test_performance_adjustment_is_bounded():
    clean = calculate_rating_change(True, 1200, 1200, 300, 0, 0)
    very_penalized = calculate_rating_change(True, 1200, 1200, 7000, 0, 2)

    assert clean == 19
    assert very_penalized == 8


def test_valid_success_never_loses_and_failure_always_loses():
    assert calculate_rating_change(True, 3000, 500, 300, 0, 0) >= 0
    assert calculate_rating_change(False, 500, 3000, 0, 0, 0) <= -1


def test_hinted_solve_is_scored_as_loss():
    assert calculate_rating_change(True, 1200, 1200, 600, 1, 0) == -16


def test_guess_heavy_solve_is_scored_as_loss():
    assert calculate_rating_change(True, 1200, 1200, 600, 0, 3) == -16


def test_suspiciously_fast_or_extremely_slow_solve_is_scored_as_loss():
    assert calculate_rating_change(True, 1200, 1200, 59, 0, 0) == -16
    assert calculate_rating_change(True, 1200, 1200, 7201, 0, 0) == -16


def test_boundary_solve_times_remain_rating_eligible():
    assert calculate_rating_change(True, 1200, 1200, 60, 0, 0) > 0
    assert calculate_rating_change(True, 1200, 1200, 7200, 0, 0) >= 0


def test_rating_floor_is_zero():
    assert calculate_rating_after(3, -20) == 0


def test_negative_statistics_are_rejected():
    with pytest.raises(ValueError):
        calculate_rating_change(True, 1200, 1200, -1, 0, 0)


def test_expected_score_is_monotonic():
    assert expected_score(1200, 800) > expected_score(1200, 1200)
    assert expected_score(1200, 1200) > expected_score(1200, 1600)
