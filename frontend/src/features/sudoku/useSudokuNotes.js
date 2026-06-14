import { useReducer } from "react";
import { cellKey, clearPeerNotes } from "./sudoku";

const initialState = {
  selected: [0, 0],
  draftMode: false,
  notes: {},
};

function reducer(state, action) {
  if (action.type === "select") return { ...state, selected: [action.row, action.column] };
  if (action.type === "toggle-draft") return { ...state, draftMode: !state.draftMode };
  if (action.type === "set-notes") return { ...state, notes: action.notes || {} };
  if (action.type === "clear-notes") return { ...state, notes: {} };
  if (action.type === "toggle-note") {
    const key = cellKey(action.row, action.column);
    const current = state.notes[key] || [];
    const nextValues = current.includes(action.value)
      ? current.filter((value) => value !== action.value)
      : [...current, action.value].sort((a, b) => a - b);
    return { ...state, notes: { ...state.notes, [key]: nextValues } };
  }
  if (action.type === "commit-value") {
    return {
      ...state,
      notes: clearPeerNotes({ ...state.notes, [cellKey(action.row, action.column)]: [] }, action.row, action.column, action.value),
    };
  }
  return state;
}

export function useSudokuNotes(startNotes = {}) {
  return useReducer(reducer, { ...initialState, notes: startNotes });
}

export { reducer as sudokuNotesReducer, initialState as initialSudokuNotesState };
