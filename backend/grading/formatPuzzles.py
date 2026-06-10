import json


PUZZLE_FILE = "pregenerated_puzzles_formatted.json"

BUCKETS = {
    "700": (600, 800),
    "900": (800, 1000),
    "1100": (1000, 1200),
    "1300": (1200, 1400),
    "1500": (1400, 1600),
    "1700": (1600, 1800),
    "1900": (1800, 2000),
    "2200": (2000, 2400),
    "2500": (2300, 2700),
}


def load_puzzles(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def count_puzzles_by_bucket(puzzles, buckets):
    counts = {}

    for bucket_name, (min_rating, max_rating) in buckets.items():
        count = 0

        for puzzle in puzzles:
            rating = puzzle["rating"]

            if min_rating <= rating <= max_rating:
                count += 1

        counts[bucket_name] = count

    return counts


def main():
    puzzles = load_puzzles(PUZZLE_FILE)

    counts = count_puzzles_by_bucket(puzzles, BUCKETS)

    print(f"Total puzzles: {len(puzzles)}")
    print()

    for bucket_name, count in counts.items():
        min_rating, max_rating = BUCKETS[bucket_name]
        print(f"{bucket_name}: {count} puzzles  ({min_rating} - {max_rating})")


if __name__ == "__main__":
    main()