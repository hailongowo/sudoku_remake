import json
import glob
from copy import deepcopy


MAIN_FILE = "pregenerated_puzzles_formatted.json"

# Put your new unformatted files in the same folder.
# Example names:
# new_puzzles_1500.json
# new_puzzles_1800.json
NEW_FILES_PATTERN = "pregenerated_puzzles_1700.json"


def is_valid(grid, row, col, num):
    for c in range(9):
        if grid[row][c] == num:
            return False

    for r in range(9):
        if grid[r][col] == num:
            return False

    box_row = (row // 3) * 3
    box_col = (col // 3) * 3

    for r in range(box_row, box_row + 3):
        for c in range(box_col, box_col + 3):
            if grid[r][c] == num:
                return False

    return True


def solve_grid(grid):
    solution = deepcopy(grid)

    def find_empty_cell():
        for r in range(9):
            for c in range(9):
                if solution[r][c] == 0:
                    return r, c
        return None

    def backtrack():
        empty = find_empty_cell()

        if empty is None:
            return True

        row, col = empty

        for num in range(1, 10):
            if is_valid(solution, row, col, num):
                solution[row][col] = num

                if backtrack():
                    return True

                solution[row][col] = 0

        return False

    if not backtrack():
        return None

    return solution


def load_json_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def format_grid(grid, indent_level=4):
    indent = " " * indent_level
    row_indent = " " * (indent_level + 2)

    rows = []
    for row in grid:
        rows.append(row_indent + json.dumps(row))

    return "[\n" + ",\n".join(rows) + "\n" + indent + "]"


def format_puzzle(puzzle, indent_level=2):
    indent = " " * indent_level
    inner_indent = " " * (indent_level + 2)

    grid_text = format_grid(puzzle["grid"], indent_level + 2)
    solution_text = format_grid(puzzle["solution"], indent_level + 2)

    return (
        indent + "{\n"
        + inner_indent + '"grid": ' + grid_text + ",\n"
        + inner_indent + '"solution": ' + solution_text + ",\n"
        + inner_indent + f'"rating": {puzzle["rating"]}\n'
        + indent + "}"
    )


def normalize_puzzle(puzzle):
    """
    Convert any puzzle object into:
    {
      "grid": ...,
      "solution": ...,
      "rating": ...
    }
    """

    if "grid" not in puzzle or "rating" not in puzzle:
        return None

    grid = puzzle["grid"]
    rating = puzzle["rating"]

    # If solution already exists, keep it.
    # If not, solve the grid to create solution.
    solution = puzzle.get("solution")

    if solution is None:
        solution = solve_grid(grid)

    if solution is None:
        return None

    return {
        "grid": grid,
        "solution": solution,
        "rating": rating,
    }


def remove_duplicates(puzzles):
    """
    Optional: remove duplicate grids.
    """
    seen = set()
    unique_puzzles = []

    for puzzle in puzzles:
        key = json.dumps(puzzle["grid"], sort_keys=True)

        if key in seen:
            continue

        seen.add(key)
        unique_puzzles.append(puzzle)

    return unique_puzzles


def main():
    all_puzzles = []

    # 1. Load existing formatted puzzles
    try:
        existing_puzzles = load_json_file(MAIN_FILE)
        print(f"Loaded {len(existing_puzzles)} existing puzzles.")
    except FileNotFoundError:
        existing_puzzles = []
        print("No existing formatted file found. Creating a new one.")

    for puzzle in existing_puzzles:
        normalized = normalize_puzzle(puzzle)

        if normalized is not None:
            all_puzzles.append(normalized)

    # 2. Load new puzzles
    new_files = glob.glob(NEW_FILES_PATTERN)

    print(f"Found {len(new_files)} new puzzle files.")

    for file_path in new_files:
        new_puzzles = load_json_file(file_path)
        print(f"Loaded {len(new_puzzles)} puzzles from {file_path}.")

        for puzzle in new_puzzles:
            normalized = normalize_puzzle(puzzle)

            if normalized is not None:
                all_puzzles.append(normalized)
            else:
                print(f"Skipped invalid puzzle from {file_path}")

    # 3. Remove duplicate grids
    all_puzzles = remove_duplicates(all_puzzles)

    # 4. Sort by rating
    all_puzzles.sort(key=lambda puzzle: puzzle["rating"])

    # 5. Write formatted output
    output_text = "[\n"
    output_text += ",\n".join(format_puzzle(puzzle) for puzzle in all_puzzles)
    output_text += "\n]\n"

    with open(MAIN_FILE, "w", encoding="utf-8") as f:
        f.write(output_text)

    print(f"Saved {len(all_puzzles)} total puzzles to {MAIN_FILE}.")


if __name__ == "__main__":
    main()