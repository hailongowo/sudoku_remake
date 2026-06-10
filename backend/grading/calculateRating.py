from constants import TECHNIQUE_WEIGHTS, HARDEST_TECHNIQUE_BONUS

def calculate_sudoku_rating(strategy_counts):
    """
    Returns a numeric Sudoku difficulty rating.

    strategy_counts example:
    Counter({
        "Single Candidate": 25,
        "Single Position": 12,
        "Candidate Lines": 3,
        "Naked Pairs": 1,
    })
    """

    if not strategy_counts:
        return 0

    known_strategies = {
        strategy: count
        for strategy, count in strategy_counts.items()
        if strategy in TECHNIQUE_WEIGHTS and count > 0
    }

    if not known_strategies:
        return 0

    base_rating = 500

    weighted_score = sum(
        TECHNIQUE_WEIGHTS[strategy] * count
        for strategy, count in strategy_counts.items()
    )

    hardest_strategy = max(
        known_strategies,
        key=lambda strategy: TECHNIQUE_WEIGHTS[strategy]
    )

    rating = base_rating + weighted_score

    return round(rating)

def label_sudoku_rating(rating):
    if rating < 900:
        return "Easy"
    elif rating < 1400:
        return "Medium"
    elif rating < 2000:
        return "Advanced"
    else:
        return "Master"