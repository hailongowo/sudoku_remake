export function makeEmptyBoard() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export function cellKey(row, column) {
  return `${row}:${column}`;
}

export function isBoardComplete(board) {
  return board.every((row) => row.every((value) => value !== 0));
}

export function isGivenCell(puzzleBoard, row, column) {
  return puzzleBoard[row][column] !== 0;
}

export function setBoardValue(board, row, column, value) {
  const next = cloneBoard(board);
  next[row][column] = value;
  return next;
}

export function isValidPlacement(board, row, column, value) {
  for (let index = 0; index < 9; index += 1) {
    if (index !== column && board[row][index] === value) return false;
    if (index !== row && board[index][column] === value) return false;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxColumn = Math.floor(column / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxColumn; c < boxColumn + 3; c += 1) {
      if ((r !== row || c !== column) && board[r][c] === value) return false;
    }
  }

  return true;
}

export function solveSudoku(inputBoard) {
  const board = cloneBoard(inputBoard);

  function findBestEmptyCell() {
    let best = null;
    let bestCandidates = null;
    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        if (board[row][column]) continue;
        const candidates = [];
        for (let value = 1; value <= 9; value += 1) {
          if (isValidPlacement(board, row, column, value)) candidates.push(value);
        }
        if (!candidates.length) return { row, column, candidates };
        if (!bestCandidates || candidates.length < bestCandidates.length) {
          best = { row, column };
          bestCandidates = candidates;
        }
      }
    }
    return best ? { ...best, candidates: bestCandidates } : null;
  }

  function solve() {
    const next = findBestEmptyCell();
    if (!next) return true;
    if (!next.candidates.length) return false;

    for (const value of next.candidates) {
      board[next.row][next.column] = value;
      if (solve()) return true;
    }
    board[next.row][next.column] = 0;
    return false;
  }

  return solve() ? board : null;
}

export function clearPeerNotes(notes, row, column, value) {
  const next = {};
  for (const [key, candidates] of Object.entries(notes)) {
    const [r, c] = key.split(":").map(Number);
    const peer =
      r === row ||
      c === column ||
      (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(column / 3));
    next[key] = peer ? candidates.filter((candidate) => candidate !== value) : candidates;
  }
  return next;
}
