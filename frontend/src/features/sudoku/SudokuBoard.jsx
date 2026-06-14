import { useEffect } from "react";
import { cellKey } from "./sudoku";

function Notes({ values = [] }) {
  return (
    <span className="grid h-full w-full grid-cols-3 grid-rows-3 p-1 text-[10px] font-bold text-slate-500 sm:text-xs">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} className="grid place-items-center">
          {values.includes(index + 1) ? index + 1 : ""}
        </span>
      ))}
    </span>
  );
}

export function SudokuBoard({ board, puzzleBoard, selected, notes, onSelect, onInput, lockedBoard = puzzleBoard, hintCells = [], disabled = false }) {
  const [selectedRow, selectedColumn] = selected;
  const selectedValue = board[selectedRow]?.[selectedColumn];

  useEffect(() => {
    function handleKeyDown(event) {
      if (disabled) return;
      const move = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      }[event.key];

      if (move) {
        event.preventDefault();
        onSelect((selectedRow + move[0] + 9) % 9, (selectedColumn + move[1] + 9) % 9);
      } else if (/^[1-9]$/.test(event.key)) {
        onInput(Number(event.key));
      } else if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        onInput(0);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, onInput, onSelect, selectedColumn, selectedRow]);

  return (
    <div role="grid" aria-label="Sudoku board" className="grid aspect-square w-full max-w-[620px] grid-cols-9 overflow-hidden rounded-md border-[3px] border-slate-900 bg-slate-900">
      {board.map((row, rowIndex) =>
        row.map((value, columnIndex) => {
          const key = cellKey(rowIndex, columnIndex);
          const isGiven = puzzleBoard[rowIndex][columnIndex] !== 0;
          const isLocked = lockedBoard[rowIndex][columnIndex] !== 0;
          const isSelected = rowIndex === selectedRow && columnIndex === selectedColumn;
          const isRelated =
            rowIndex === selectedRow ||
            columnIndex === selectedColumn ||
            (Math.floor(rowIndex / 3) === Math.floor(selectedRow / 3) && Math.floor(columnIndex / 3) === Math.floor(selectedColumn / 3));
          const isMatching = selectedValue && value === selectedValue;
          const wasHinted = hintCells.includes(key);

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}${value ? `, value ${value}` : ""}`}
              aria-selected={isSelected}
              disabled={disabled}
              onClick={() => onSelect(rowIndex, columnIndex)}
              className={`grid aspect-square place-items-center border-slate-300 text-2xl font-bold sm:text-3xl
                ${columnIndex % 3 === 2 && columnIndex !== 8 ? "border-r-[3px] border-r-slate-900" : "border-r"}
                ${rowIndex % 3 === 2 && rowIndex !== 8 ? "border-b-[3px] border-b-slate-900" : "border-b"}
                ${isSelected ? "bg-blue-200" : isMatching ? "bg-blue-100" : isRelated ? "bg-slate-100" : "bg-white"}
                ${isGiven ? "text-slate-950" : wasHinted ? "text-emerald-700" : isLocked ? "text-brand" : "text-brand"}`}
            >
              {value || <Notes values={notes[key]} />}
            </button>
          );
        }),
      )}
    </div>
  );
}
