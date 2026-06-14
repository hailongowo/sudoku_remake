import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../shared/api/client";
import { readStored, writeStored } from "../../shared/hooks/useLocalStorage";
import { useTimer } from "../../shared/hooks/useTimer";
import { Alert } from "../../shared/ui/Alert";
import { EmptyState } from "../../shared/ui/EmptyState";
import { DifficultySelect } from "../sudoku/DifficultySelect";
import { GameControls } from "../sudoku/GameControls";
import { GameStats } from "../sudoku/GameStats";
import { SudokuBoard } from "../sudoku/SudokuBoard";
import { cellKey, cloneBoard, isBoardComplete, isGivenCell, setBoardValue, solveSudoku } from "../sudoku/sudoku";
import { useSudokuNotes } from "../sudoku/useSudokuNotes";

const STORAGE_KEY = "casual-game";

export function CasualPage() {
  const stored = useMemo(() => readStored(STORAGE_KEY), []);
  const [difficulty, setDifficulty] = useState(stored?.difficulty || "Easy");
  const [game, setGame] = useState(stored);
  const [message, setMessage] = useState(null);
  const [notesState, notesDispatch] = useSudokuNotes(stored?.notes || {});
  const elapsed = useTimer(game?.startedAt, game?.completed);
  const solution = useMemo(() => (game ? solveSudoku(game.puzzle_board) : null), [game]);

  const newGame = useMutation({
    mutationFn: () => apiRequest(`/casual/new?difficulty=${difficulty}`),
    onSuccess: (puzzle) => {
      const next = {
        ...puzzle,
        board: cloneBoard(puzzle.puzzle_board),
        startedAt: new Date().toISOString(),
        mistakes: 0,
        hints: 0,
        hintCells: [],
        completed: false,
      };
      setGame(next);
      notesDispatch({ type: "clear-notes" });
      setMessage(null);
    },
    onError: (error) => setMessage({ tone: "error", text: error.message }),
  });

  useEffect(() => {
    if (game) writeStored(STORAGE_KEY, { ...game, notes: notesState.notes });
  }, [game, notesState.notes]);

  const selectCell = useCallback((row, column) => notesDispatch({ type: "select", row, column }), [notesDispatch]);

  const inputValue = useCallback(
    (value) => {
      if (!game || game.completed) return;
      const [row, column] = notesState.selected;
      if (isGivenCell(game.puzzle_board, row, column)) return;

      if (notesState.draftMode && value) {
        notesDispatch({ type: "toggle-note", row, column, value });
        return;
      }

      if (value && solution?.[row][column] !== value) {
        setGame((current) => ({ ...current, mistakes: current.mistakes + 1 }));
        setMessage({ tone: "error", text: "That number does not fit there." });
        return;
      }

      const board = setBoardValue(game.board, row, column, value);
      const complete = isBoardComplete(board);
      notesDispatch({ type: "commit-value", row, column, value });
      setGame((current) => ({ ...current, board, completed: complete }));
      setMessage(complete ? { tone: "success", text: "Puzzle complete." } : null);
    },
    [game, notesDispatch, notesState.draftMode, notesState.selected, solution],
  );

  function useHint() {
    if (!game || !solution || game.completed) return;
    const open = [];
    game.board.forEach((row, r) => row.forEach((value, c) => {
      if (!value) open.push([r, c]);
    }));
    if (!open.length) return;

    const [row, column] = open[Math.floor(Math.random() * open.length)];
    const value = solution[row][column];
    const board = setBoardValue(game.board, row, column, value);
    const complete = isBoardComplete(board);
    notesDispatch({ type: "commit-value", row, column, value });
    setGame((current) => ({
      ...current,
      board,
      hints: current.hints + 1,
      hintCells: [...current.hintCells, cellKey(row, column)],
      completed: complete,
    }));
    setMessage(complete ? { tone: "success", text: "Puzzle complete." } : null);
  }

  function resetGame() {
    if (!game || !window.confirm("Reset this puzzle and clear notes?")) return;
    notesDispatch({ type: "clear-notes" });
    setGame((current) => ({
      ...current,
      board: cloneBoard(current.puzzle_board),
      startedAt: new Date().toISOString(),
      mistakes: 0,
      hints: 0,
      hintCells: [],
      completed: false,
    }));
    setMessage(null);
  }

  return (
    <main className="page py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Casual</p>
          <h1 className="mt-1 text-3xl font-black">Casual play</h1>
        </div>
        <div className="flex gap-2">
          <DifficultySelect value={difficulty} onChange={setDifficulty} />
          <button type="button" className="btn btn-primary" disabled={newGame.isPending} onClick={() => (!game || window.confirm("Start a new casual puzzle?")) && newGame.mutate()}>
            {newGame.isPending ? "Loading..." : "New game"}
          </button>
        </div>
      </div>
      {message ? <div className="mb-5"><Alert tone={message.tone}>{message.text}</Alert></div> : null}
      {!game ? (
        <EmptyState title="Start a casual puzzle" text="Pick a difficulty and play without login." action={<button type="button" className="btn btn-primary" onClick={() => newGame.mutate()}>Start game</button>} />
      ) : (
        <div className="space-y-5">
          <GameStats difficulty={game.difficulty} puzzleRating={game.puzzle_rating} time={elapsed} mistakes={game.mistakes} hints={game.hints} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,620px)_1fr]">
            <SudokuBoard board={game.board} puzzleBoard={game.puzzle_board} selected={notesState.selected} notes={notesState.notes} onSelect={selectCell} onInput={inputValue} hintCells={game.hintCells} disabled={game.completed} />
            <aside className="card space-y-5 p-5">
              <h2 className="text-xl font-black">Controls</h2>
              <GameControls onNumber={inputValue} onErase={() => inputValue(0)} onHint={useHint} onReset={resetGame} draftMode={notesState.draftMode} onToggleDraft={() => notesDispatch({ type: "toggle-draft" })} disabled={game.completed} />
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}
