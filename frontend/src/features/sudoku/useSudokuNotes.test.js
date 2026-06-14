import { describe, expect, it } from "vitest";
import { initialSudokuNotesState, sudokuNotesReducer } from "./useSudokuNotes";

describe("sudoku notes reducer", () => {
  it("toggles and sorts draft notes", () => {
    let state = sudokuNotesReducer(initialSudokuNotesState, { type: "toggle-note", row: 2, column: 3, value: 8 });
    state = sudokuNotesReducer(state, { type: "toggle-note", row: 2, column: 3, value: 2 });
    expect(state.notes["2:3"]).toEqual([2, 8]);
    state = sudokuNotesReducer(state, { type: "toggle-note", row: 2, column: 3, value: 8 });
    expect(state.notes["2:3"]).toEqual([2]);
  });
});
