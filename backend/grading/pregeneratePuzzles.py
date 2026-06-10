import json
from generator import generate_puzzle_near_rating


RATING_BUCKETS = [
    1700,
    1900,
]

def pregenerate_puzzles(puzzles_per_bucket=50):
    for target_rating in RATING_BUCKETS:
        print(f"Generating puzzles around rating {target_rating}...")
        puzzles = []
        for i in range(puzzles_per_bucket):
            result = generate_puzzle_near_rating(
                target_rating=target_rating,
                max_attempts=50,
                tolerance=100
            )

            if result["difference"] > 100:
                continue

            puzzles.append({
                "grid": result["grid"],
                "rating": result["rating"],
                "difference": result["difference"],
            })

            print(
                f"  Generated {i + 1}/{puzzles_per_bucket} "
                f"rating={result['rating']}"
            )

        with open(f"pregenerated_puzzles_{target_rating}.json", "w") as f:
            json.dump(puzzles, f)

        print(f"Saved {len(puzzles)} puzzles.")


pregenerate_puzzles()