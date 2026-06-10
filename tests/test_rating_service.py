import pytest

from backend.services.ratingService import (
    FORMULA_VERSION,
    calculate_rating_after,
    calculate_rating_change,
    expected_score,
)


def test_formula_version_is_recordable():
    assert FORMULA_VERSION == "elo-performance-v1"


def test_equal_rating_fast_clean_win_is_about_twenty_points():
    assert calculate_rating_change(True, 1200, 1200, 0, 0, 0) == 20


def test_harder_puzzle_rewards_more_and_hurts_less():
    hard_win = calculate_rating_change(True, 1200, 1600, 600, 0, 0)
    easy_win = calculate_rating_change(True, 1200, 800, 600, 0, 0)
    hard_loss = calculate_rating_change(False, 1200, 1600, 600, 0, 0)
    easy_loss = calculate_rating_change(False, 1200, 800, 600, 0, 0)

    assert hard_win > easy_win
    assert hard_loss > easy_loss


def test_performance_adjustment_is_bounded():
    clean = calculate_rating_change(True, 1200, 1200, 0, 0, 0)
    very_penalized = calculate_rating_change(True, 1200, 1200, 99999, 99, 99)

    assert clean == 20
    assert very_penalized == 8


def test_success_always_gains_and_failure_always_loses():
    assert calculate_rating_change(True, 3000, 500, 99999, 99, 99) >= 1
    assert calculate_rating_change(False, 500, 3000, 0, 0, 0) <= -1


def test_rating_floor_is_zero():
    assert calculate_rating_after(3, -20) == 0


def test_negative_statistics_are_rejected():
    with pytest.raises(ValueError):
        calculate_rating_change(True, 1200, 1200, -1, 0, 0)


def test_expected_score_is_monotonic():
    assert expected_score(1200, 800) > expected_score(1200, 1200)
    assert expected_score(1200, 1200) > expected_score(1200, 1600)
