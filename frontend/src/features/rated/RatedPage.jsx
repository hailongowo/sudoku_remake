import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../shared/api/client";
import { readStored, removeStored, writeStored } from "../../shared/hooks/useLocalStorage";
import { useTimer } from "../../shared/hooks/useTimer";
import { formatRatingChange } from "../../shared/utils/format";
import { Alert } from "../../shared/ui/Alert";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Loading } from "../../shared/ui/Loading";
import { useAuth } from "../auth/AuthProvider";
import { GameControls } from "../sudoku/GameControls";
import { GameStats } from "../sudoku/GameStats";
import { SudokuBoard } from "../sudoku/SudokuBoard";
import { cellKey, isBoardComplete } from "../sudoku/sudoku";
import { useSudokuNotes } from "../sudoku/useSudokuNotes";

const noteKey = (gameId) => `rated-notes:${gameId}`;

export function RatedPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [game, setGame] = useState(null);
  const [activePrompt, setActivePrompt] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [message, setMessage] = useState(null);
  const [notesState, notesDispatch] = useSudokuNotes();
  const activeGame = game && ["started", "in_progress"].includes(game.status);
  const liveTime = useTimer(game?.started_at, !activeGame);
  const shownTime = activeGame ? liveTime : game?.time_spent || liveTime;

  const activeQuery = useQuery({
    queryKey: ["rated", "active"],
    queryFn: ({ signal }) => apiRequest("/rated/active", { token, signal }),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (activeQuery.data && !game) setActivePrompt(activeQuery.data);
  }, [activeQuery.data, game]);

  useEffect(() => {
    if (game?.game_id) writeStored(noteKey(game.game_id), notesState.notes);
  }, [game?.game_id, notesState.notes]);

  function loadGame(nextGame) {
    setGame(nextGame);
    setActivePrompt(null);
    setMessage(null);
    notesDispatch({ type: "set-notes", notes: readStored(noteKey(nextGame.game_id), {}) });
  }

  function syncGame(nextGame, nextMessage = null) {
    setGame(nextGame);
    setMessage(nextMessage);
    if (nextGame.hint) notesDispatch({ type: "commit-value", ...nextGame.hint });
    if (!["started", "in_progress"].includes(nextGame.status)) {
      removeStored(noteKey(nextGame.game_id));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    }
  }

  const startGame = useMutation({
    mutationFn: () => apiRequest("/rated/start", { method: "POST", token }),
    onSuccess: (nextGame) => {
      if (nextGame.active_game_exists) setActivePrompt(nextGame);
      else loadGame(nextGame);
    },
    onError: (error) => setMessage({ tone: "error", text: error.message }),
  });

  const move = useMutation({
    mutationFn: ({ row, column, value }) => apiRequest(`/rated/${game.game_id}/move`, { method: "POST", token, body: { row, column, value } }),
    onSuccess: (nextGame) => {
      syncGame(nextGame, nextGame.correct ? null : { tone: "error", text: "Incorrect move. A mistake was recorded." });
    },
    onError: (error) => setMessage({ tone: "error", text: error.message }),
  });

  const hint = useMutation({
    mutationFn: () => apiRequest(`/rated/${game.game_id}/hint`, { method: "POST", token }),
    onSuccess: (nextGame) => {
      setConfirm(null);
      syncGame(nextGame, { tone: "warning", text: "Hint used. This rated solve is no longer rating-eligible." });
    },
    onError: (error) => setMessage({ tone: "error", text: error.message }),
  });

  const finish = useMutation({
    mutationFn: () => apiRequest(`/rated/${game.game_id}/finish`, { method: "POST", token }),
    onSuccess: (nextGame) => {
      syncGame(nextGame, { tone: nextGame.rating_change >= 0 ? "success" : "warning", text: `Game finished: ${formatRatingChange(nextGame.rating_change)} rating.` });
    },
    onError: (error) => setMessage({ tone: "error", text: error.message }),
  });

  const abandon = useMutation({
    mutationFn: (targetGame) => apiRequest(`/rated/${targetGame.game_id}/abandon`, { method: "POST", token }),
    onSuccess: (nextGame) => {
      setConfirm(null);
      setActivePrompt(null);
      syncGame(nextGame, { tone: "warning", text: `Game abandoned: ${formatRatingChange(nextGame.rating_change)} rating.` });
    },
    onError: (error) => setMessage({ tone: "error", text: error.message }),
  });

  const selectCell = useCallback((row, column) => notesDispatch({ type: "select", row, column }), [notesDispatch]);

  const inputValue = useCallback(
    (value) => {
      if (!game || !activeGame || move.isPending) return;
      const [row, column] = notesState.selected;
      if (game.current_board[row][column]) return;

      if (notesState.draftMode && value) {
        notesDispatch({ type: "toggle-note", row, column, value });
        return;
      }

      if (!value) {
        notesDispatch({ type: "set-notes", notes: { ...notesState.notes, [cellKey(row, column)]: [] } });
        return;
      }

      notesDispatch({ type: "commit-value", row, column, value });
      move.mutate({ row, column, value });
    },
    [activeGame, game, move, notesDispatch, notesState.draftMode, notesState.notes, notesState.selected],
  );

  if (activeQuery.isLoading) return <Loading label="Checking rated game" />;
  if (activeQuery.isError) return <main className="page py-8"><Alert tone="error">{activeQuery.error.message}</Alert></main>;

  return (
    <main className="page py-8">
      <div className="mb-6">
        <p className="eyebrow">Rated</p>
        <h1 className="mt-1 text-3xl font-black">Rated play</h1>
        <p className="mt-2 text-slate-600">Rated moves are checked by the server. Wrong answers are counted as mistakes and not stored.</p>
      </div>
      {message ? <div className="mb-5"><Alert tone={message.tone}>{message.text}</Alert></div> : null}
      {!game ? (
        <EmptyState
          title="Start a rated game"
          text="You will receive a puzzle matched to your current rating. One active rated game is allowed at a time."
          action={<button type="button" className="btn btn-primary" disabled={startGame.isPending} onClick={() => startGame.mutate()}>{startGame.isPending ? "Starting..." : "Start rated game"}</button>}
        />
      ) : (
        <div className="space-y-5">
          <GameStats
            difficulty={game.difficulty}
            puzzleRating={game.puzzle_rating}
            time={shownTime}
            mistakes={game.mistakes_made}
            hints={game.hints_used}
            ratingBefore={game.rating_before}
            ratingAfter={game.rating_after}
            ratingChange={game.rating_change}
          />
          {game.rating_eligible === false ? <Alert tone="warning">This game is rating-ineligible and will be scored as a loss.</Alert> : null}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,620px)_1fr]">
            <SudokuBoard
              board={game.current_board}
              lockedBoard={game.current_board}
              puzzleBoard={game.puzzle_board}
              selected={notesState.selected}
              notes={notesState.notes}
              onSelect={selectCell}
              onInput={inputValue}
              disabled={!activeGame || move.isPending}
            />
            <aside className="card space-y-5 p-5">
              <h2 className="text-xl font-black">{activeGame ? "Controls" : "Game statistics"}</h2>
              {activeGame ? (
                <>
                  <GameControls
                    onNumber={inputValue}
                    onErase={() => inputValue(0)}
                    onHint={() => setConfirm("hint")}
                    onReset={() => setConfirm("abandon")}
                    draftMode={notesState.draftMode}
                    onToggleDraft={() => notesDispatch({ type: "toggle-draft" })}
                    disabled={move.isPending}
                    resetLabel="Abandon"
                  />
                  <button type="button" className="btn btn-primary w-full" disabled={!isBoardComplete(game.current_board) || finish.isPending} onClick={() => finish.mutate()}>
                    {finish.isPending ? "Finishing..." : "Finish game"}
                  </button>
                </>
              ) : (
                <div className="space-y-3 text-sm text-slate-600">
                  <p>Status: <strong>{game.status}</strong></p>
                  <p>Rating change: <strong>{formatRatingChange(game.rating_change)}</strong></p>
                  <button type="button" className="btn btn-primary w-full" onClick={() => { setGame(null); activeQuery.refetch(); }}>Back to rated lobby</button>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
      {activePrompt && !confirm ? (
        <ConfirmModal
          title="Active game found"
          confirmLabel="Continue game"
          cancelLabel="Abandon game"
          danger={false}
          onConfirm={() => loadGame(activePrompt)}
          onCancel={() => setConfirm("abandon-active")}
        >
          You already have an active rated game. Continue it, or abandon it and record a rated loss.
        </ConfirmModal>
      ) : null}
      {confirm === "hint" ? (
        <ConfirmModal title="Use rated hint?" confirmLabel="Use hint" onConfirm={() => hint.mutate()} onCancel={() => setConfirm(null)} busy={hint.isPending}>
          A rated hint fills one correct cell, but this game will be scored as a loss.
        </ConfirmModal>
      ) : null}
      {confirm === "abandon" ? (
        <ConfirmModal title="Abandon rated game?" confirmLabel="Abandon" danger onConfirm={() => abandon.mutate(game)} onCancel={() => setConfirm(null)} busy={abandon.isPending}>
          This records a rated loss and cannot be undone.
        </ConfirmModal>
      ) : null}
      {confirm === "abandon-active" ? (
        <ConfirmModal title="Abandon active game?" confirmLabel="Abandon" danger onConfirm={() => abandon.mutate(activePrompt)} onCancel={() => setConfirm(null)} busy={abandon.isPending}>
          This records a rated loss and cannot be undone.
        </ConfirmModal>
      ) : null}
    </main>
  );
}
