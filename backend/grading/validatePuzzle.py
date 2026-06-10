from copy import deepcopy


def is_valid(grid, row, col, num):
    # Check row
    for c in range(9):
        if grid[row][c] == num:
            return False

    # Check column
    for r in range(9):
        if grid[r][col] == num:
            return False

    # Check 3x3 box
    box_row = (row // 3) * 3
    box_col = (col // 3) * 3

    for r in range(box_row, box_row + 3):
        for c in range(box_col, box_col + 3):
            if grid[r][c] == num:
                return False

    return True

def validate_puzzle(grid, limit=2):
    """
    Returns True if the Sudoku puzzle has exactly one solution.
    Empty cells should be 0.
    """

    test_grid = deepcopy(grid)

    def find_best_empty_cell():
        best_cell = None
        best_candidates = None

        for r in range(9):
            for c in range(9):
                if test_grid[r][c] == 0:
                    candidates = [
                        num for num in range(1, 10)
                        if is_valid(test_grid, r, c, num)
                    ]

                    if len(candidates) == 0:
                        return (r, c), []

                    if best_candidates is None or len(candidates) < len(best_candidates):
                        best_cell = (r, c)
                        best_candidates = candidates

        return best_cell, best_candidates

    def backtrack():
        nonlocal solutions

        if solutions >= limit:
            return

        cell, candidates = find_best_empty_cell()

        if cell is None:
            solutions += 1
            return

        row, col = cell

        if not candidates:
            return

        for num in candidates:
            test_grid[row][col] = num
            backtrack()
            test_grid[row][col] = 0

            if solutions >= limit:
                return

    solutions = 0
    backtrack()

    return solutions == 1
