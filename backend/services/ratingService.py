from decimal import Decimal, ROUND_HALF_UP


FORMULA_VERSION = "elo-performance-v2"
K_FACTOR = 32
MIN_RATED_SOLVE_SECONDS = 60
MAX_RATED_SOLVE_SECONDS = 2 * 60 * 60
MAX_RATING_ELIGIBLE_MISTAKES = 2


def _round_half_away_from_zero(value: float) -> int:
    return int(Decimal(str(value)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def expected_score(player_rating: int, puzzle_rating: int) -> float:
    return 1 / (1 + 10 ** ((puzzle_rating - player_rating) / 400))


def calculate_rating_change(
    completed: bool,
    player_rating: int,
    puzzle_rating: int,
    elapsed_seconds: int,
    hints_used: int,
    mistakes_made: int,
) -> int:
    if elapsed_seconds < 0 or hints_used < 0 or mistakes_made < 0:
        raise ValueError("Performance statistics cannot be negative")

    result = 1 if completed else 0
    base_change = _round_half_away_from_zero(
        K_FACTOR * (result - expected_score(player_rating, puzzle_rating))
    )

    loss_change = _round_half_away_from_zero(
        K_FACTOR * (0 - expected_score(player_rating, puzzle_rating))
    )
    assisted_or_suspicious = (
        hints_used > 0
        or mistakes_made > MAX_RATING_ELIGIBLE_MISTAKES
        or elapsed_seconds < MIN_RATED_SOLVE_SECONDS
        or elapsed_seconds > MAX_RATED_SOLVE_SECONDS
    )

    if not completed or assisted_or_suspicious:
        return min(-1, loss_change)

    performance_adjustment = max(
        -8,
        min(
            4,
            4 - elapsed_seconds // 300 - hints_used * 3 - mistakes_made * 2,
        ),
    )
    return max(0, base_change + performance_adjustment)


def calculate_rating_after(player_rating: int, rating_change: int) -> int:
    return max(0, player_rating + rating_change)
