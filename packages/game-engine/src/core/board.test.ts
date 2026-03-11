import { describe, expect, it } from "vitest";
import {
  canPlacePiece,
  clearCompletedLines,
  createActivePiece,
  createBoard,
  getWallKickTests,
  getAbsoluteCells,
  isSpawnBlocked,
  lockPiece,
  setBoardCell,
  tryMovePiece,
  tryRotatePiece
} from "./board";

describe("board and piece rules", () => {
  it("spawns pieces at the documented coordinates", () => {
    const piece = createActivePiece("T");

    expect(piece).toEqual({
      type: "T",
      rotation: "0",
      x: 3,
      y: -1
    });

    expect(getAbsoluteCells(piece)).toEqual([
      { x: 4, y: -1 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
      { x: 5, y: 0 }
    ]);
  });

  it("blocks movement into occupied cells", () => {
    const board = setBoardCell(createBoard(), { x: 4, y: 0 }, "O");
    const piece = createActivePiece("T");

    expect(canPlacePiece(board, piece)).toBe(false);
    expect(tryMovePiece(board, piece, 0, 1)).toBeNull();
  });

  it("applies wall kicks when rotating from an out-of-bounds position", () => {
    const board = createBoard();
    const piece = {
      ...createActivePiece("T"),
      x: 8,
      y: 0
    };

    const rotated = tryRotatePiece(board, piece, "CW");

    expect(rotated).not.toBeNull();
    expect(rotated?.rotation).toBe("R");
    expect(rotated?.x).toBe(7);
  });

  it("uses transition-specific SRS wall kick tables", () => {
    expect(getWallKickTests("T", "0", "R")).toEqual([
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: -1, y: -1 },
      { x: 0, y: 2 },
      { x: -1, y: 2 }
    ]);

    expect(getWallKickTests("T", "R", "0")).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: -2 },
      { x: 1, y: -2 }
    ]);

    expect(getWallKickTests("I", "0", "L")).toEqual([
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 2, y: 0 },
      { x: -1, y: -2 },
      { x: 2, y: 1 }
    ]);
  });

  it("detects blocked spawn using hidden rows", () => {
    let board = createBoard();
    board = setBoardCell(board, { x: 5, y: -1 }, "O");
    board = setBoardCell(board, { x: 6, y: -1 }, "O");
    board = setBoardCell(board, { x: 5, y: 0 }, "O");
    board = setBoardCell(board, { x: 6, y: 0 }, "O");

    expect(isSpawnBlocked(board, "O")).toBe(true);
  });

  it("locks a piece and clears a completed line", () => {
    let board = createBoard();

    for (let x = 0; x < 6; x += 1) {
      board = setBoardCell(board, { x, y: 19 }, "I");
    }

    const piece = {
      ...createActivePiece("I"),
      rotation: "0" as const,
      x: 6,
      y: 18
    };

    const lockedBoard = lockPiece(board, piece);
    const result = clearCompletedLines(lockedBoard);

    expect(result.clearedLineCount).toBe(1);
    expect(result.clearedRowIndices).toEqual([19]);
  });
});
