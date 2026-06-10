from copy import deepcopy
from grader import grade_puzzle
from validatePuzzle import is_valid, validate_puzzle
import random

def generate_full_board():
    """Generates a fully solved Sudoku board using backtracking."""
    grid = [[0 for _ in range(9)] for _ in range(9)]
    
    def find_empty_cell():
        for r in range(9):
            for c in range(9):
                if grid[r][c] == 0:
                    return r, c
        return None

    def solve():
        empty = find_empty_cell()

        if empty is None:
            return True

        row, col = empty

        numbers = list(range(1, 10))
        random.shuffle(numbers)

        for num in numbers:
            if is_valid(grid, row, col, num):
                grid[row][col] = num

                if solve():
                    return True

                grid[row][col] = 0

        return False

    solve()
    return grid

# print(generate_full_board())

def clue_range_for_rating(target_rating):
    if target_rating < 900:
        return 40, 50
    elif target_rating < 1400:
        return 28, 34
    elif target_rating < 2000:
        return 24, 30
    else:
        return 17, 25

def remove_cells_from_solution(grid, row, col):
    temp = grid[row][col]
    grid[row][col] = 0
    if not validate_puzzle(grid):
        grid[row][col] = temp
        return False
    return True

def generate_puzzle(full_board, target_rating, tolerance=100):
    puzzle = deepcopy(full_board)

    min_clues, max_clues = clue_range_for_rating(target_rating)
    target_clues = random.randint(min_clues, max_clues)
    clues_to_remove = 81 - target_clues

    cells = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(cells)

    removed = 0
    cell_index = 0

    while removed < clues_to_remove and cell_index < len(cells):
        row, col = cells[cell_index]
        cell_index += 1

        if remove_cells_from_solution(puzzle, row, col):
            removed += 1

    difference = abs(grade_puzzle(puzzle) - target_rating)
    while difference > tolerance and cell_index < len(cells):
        row, col = cells[cell_index]
        cell_index += 1

        if remove_cells_from_solution(puzzle, row, col):
            difference = abs(grade_puzzle(puzzle) - target_rating)

    return puzzle

def generate_puzzle_near_rating(target_rating, max_attempts=100, tolerance=100):
    best_grid = None
    best_rating = None
    best_difference = float("inf")
    full_board = generate_full_board()

    for attempt in range(max_attempts):
        candidate = generate_puzzle(full_board, target_rating, tolerance)

        rating = grade_puzzle(candidate)
        difference = abs(rating - target_rating)

        if difference < best_difference:
            best_grid = candidate
            best_rating = rating
            best_difference = difference

        if difference <= tolerance:
            break

    return {
        "grid": best_grid,
        "rating": best_rating,
        "difference": best_difference,
    }




test_puzzle = generate_puzzle_near_rating(900)
print(test_puzzle)
print(grade_puzzle(test_puzzle["grid"]))
