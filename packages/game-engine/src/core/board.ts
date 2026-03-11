import {
  BOARD_HIDDEN_ROWS,
  BOARD_VISIBLE_HEIGHT,
  BOARD_WIDTH,
  PIECE_CELLS,
  PIECE_SPAWNS,
  ROTATION_TRANSITIONS,
  WALL_KICKS
} from "./constants";
import type {
  ActivePiece,
  BoardCell,
  BoardState,
  CellPosition,
  LineClearResult,
  RotationDirection,
  RotationState,
  RotationTransition,
  TetrominoType
} from "./types";

function cloneCells(cells: BoardCell[][]): BoardCell[][] {
  return cells.map((row) => [...row]);
}

function toInternalRowIndex(board: BoardState, y: number): number {
  return y + board.hiddenRows;
}

export function createBoard(
  width = BOARD_WIDTH,
  visibleHeight = BOARD_VISIBLE_HEIGHT,
  hiddenRows = BOARD_HIDDEN_ROWS
): BoardState {
  return {
    width,
    visibleHeight,
    hiddenRows,
    cells: Array.from({ length: visibleHeight + hiddenRows }, () =>
      Array.from({ length: width }, () => null)
    )
  };
}

export function createActivePiece(type: TetrominoType): ActivePiece {
  const spawn = PIECE_SPAWNS[type];

  return {
    type,
    rotation: "0",
    x: spawn.x,
    y: spawn.y
  };
}

export function getAbsoluteCells(piece: ActivePiece): CellPosition[] {
  return PIECE_CELLS[piece.type][piece.rotation].map((cell) => ({
    x: piece.x + cell.x,
    y: piece.y + cell.y
  }));
}

export function isInsideBoard(board: BoardState, position: CellPosition): boolean {
  return (
    position.x >= 0 &&
    position.x < board.width &&
    position.y >= -board.hiddenRows &&
    position.y < board.visibleHeight
  );
}

export function canPlacePiece(board: BoardState, piece: ActivePiece): boolean {
  return getAbsoluteCells(piece).every((position) => {
    if (!isInsideBoard(board, position)) {
      return false;
    }

    const rowIndex = toInternalRowIndex(board, position.y);
    return board.cells[rowIndex][position.x] === null;
  });
}

export function tryMovePiece(
  board: BoardState,
  piece: ActivePiece,
  dx: number,
  dy: number
): ActivePiece | null {
  const nextPiece: ActivePiece = {
    ...piece,
    x: piece.x + dx,
    y: piece.y + dy
  };

  return canPlacePiece(board, nextPiece) ? nextPiece : null;
}

export function tryRotatePiece(
  board: BoardState,
  piece: ActivePiece,
  direction: RotationDirection
): ActivePiece | null {
  const nextRotation = ROTATION_TRANSITIONS[direction][piece.rotation];
  const kickTable = getWallKickTests(piece.type, piece.rotation, nextRotation);

  for (const kick of kickTable) {
    const candidate: ActivePiece = {
      ...piece,
      rotation: nextRotation,
      x: piece.x + kick.x,
      y: piece.y + kick.y
    };

    if (canPlacePiece(board, candidate)) {
      return candidate;
    }
  }

  return null;
}

export function getWallKickTests(
  type: TetrominoType,
  from: RotationState,
  to: RotationState
) {
  const transition = `${from}>${to}` as RotationTransition;

  if (type === "O") {
    return WALL_KICKS.O[transition];
  }

  if (type === "I") {
    return WALL_KICKS.I[transition];
  }

  return WALL_KICKS.normal[transition];
}

export function setBoardCell(
  board: BoardState,
  position: CellPosition,
  value: BoardCell
): BoardState {
  if (!isInsideBoard(board, position)) {
    throw new Error("Cell position is outside the board");
  }

  const nextBoard: BoardState = {
    ...board,
    cells: cloneCells(board.cells)
  };

  nextBoard.cells[toInternalRowIndex(board, position.y)][position.x] = value;

  return nextBoard;
}

export function lockPiece(board: BoardState, piece: ActivePiece): BoardState {
  return getAbsoluteCells(piece).reduce(
    (nextBoard, position) => setBoardCell(nextBoard, position, piece.type),
    board
  );
}

export function clearCompletedLines(board: BoardState): LineClearResult {
  const totalRows = board.cells.length;
  const clearedRowIndices: number[] = [];
  const remainingRows: BoardCell[][] = [];

  board.cells.forEach((row, index) => {
    if (row.every((cell) => cell !== null)) {
      clearedRowIndices.push(index - board.hiddenRows);
      return;
    }

    remainingRows.push([...row]);
  });

  const emptyRows = Array.from({ length: clearedRowIndices.length }, () =>
    Array.from({ length: board.width }, () => null)
  );

  const filledRows = [...emptyRows, ...remainingRows].slice(-totalRows);

  return {
    board: {
      ...board,
      cells: filledRows
    },
    clearedLineCount: clearedRowIndices.length,
    clearedRowIndices
  };
}

export function isSpawnBlocked(
  board: BoardState,
  type: TetrominoType
): boolean {
  return !canPlacePiece(board, createActivePiece(type));
}
