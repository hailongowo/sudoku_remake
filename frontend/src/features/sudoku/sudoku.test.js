import { describe, expect, it } from "vitest";
import { clearPeerNotes, isBoardComplete, isValidPlacement, solveSudoku } from "./sudoku";

const puzzle = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

describe("sudoku engine", () => {
  it("solves a puzzle without mutating the source", () => {
    const solved = solveSudoku(puzzle);
    expect(isBoardComplete(solved)).toBe(true);
    expect(solved[0]).toEqual([5, 3, 4, 6, 7, 8, 9, 1, 2]);
    expect(puzzle[0][2]).toBe(0);
  });

  it("validates row, column, and box placement", () => {
    expect(isValidPlacement(puzzle, 0, 2, 4)).toBe(true);
    expect(isValidPlacement(puzzle, 0, 2, 5)).toBe(false);
    expect(isValidPlacement(puzzle, 0, 2, 6)).toBe(false);
    expect(isValidPlacement(puzzle, 0, 2, 9)).toBe(false);
  });

  it("clears peer notes when a value is committed", () => {
    const notes = { "0:1": [2, 4], "1:0": [4], "1:1": [4], "4:4": [4] };
    expect(clearPeerNotes(notes, 0, 0, 4)).toEqual({ "0:1": [2], "1:0": [], "1:1": [], "4:4": [4] });
  });
});
