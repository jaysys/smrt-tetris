import { describe, expect, it } from "vitest";
import { createBoard, setBoardCell } from "./board";
import { createRenderMatrix, TetrisGame } from "./session";
import type { QueueGenerator, TetrominoType } from "./types";

class StaticQueueGenerator implements QueueGenerator {
  private readonly queue: TetrominoType[];

  constructor(queue: TetrominoType[]) {
    this.queue = [...queue];
  }

  next() {
    const piece = this.queue.shift();

    if (!piece) {
      throw new Error("Queue exhausted");
    }

    return piece;
  }

  peek(size: number) {
    return this.queue.slice(0, size);
  }
}

function lockPieceByGravity(game: TetrisGame) {
  const beforeLocked = game.getState().piecesLocked;

  while (game.getState().piecesLocked === beforeLocked) {
    game.tick();
  }

  return game.getState();
}

function createWellBoard(rowStart: number, rowEndExclusive: number, gapX: number) {
  let board = createBoard();

  for (let y = rowStart; y < rowEndExclusive; y += 1) {
    for (let x = 0; x < 10; x += 1) {
      if (x === gapX) {
        continue;
      }

      board = setBoardCell(board, { x, y }, "O");
    }
  }

  return board;
}

describe("tetris game session", () => {
  it("creates a playable snapshot with hold and next queue", () => {
    const game = new TetrisGame();
    const state = game.getState();

    expect(state.status).toBe("playing");
    expect(state.activePiece).not.toBeNull();
    expect(state.nextQueue).toHaveLength(5);
    expect(state.holdPiece).toBeNull();
    expect(state.canHold).toBe(true);
  });

  it("locks a piece on hard drop and spawns the next piece", () => {
    const game = new TetrisGame();
    const firstType = game.getState().activePiece?.type;

    const state = game.hardDrop();

    expect(state.piecesLocked).toBe(1);
    expect(state.activePiece).not.toBeNull();
    expect(state.activePiece?.type).not.toBe(firstType);
    expect(state.score).toBeGreaterThan(0);
  });

  it("supports hold swap and prevents double hold before lock", () => {
    const game = new TetrisGame();
    const firstType = game.getState().activePiece?.type;

    const afterHold = game.hold();

    expect(afterHold.holdPiece).toBe(firstType);
    expect(afterHold.canHold).toBe(false);

    const secondHold = game.hold();

    expect(secondHold.holdPiece).toBe(firstType);

    const afterDrop = game.hardDrop();
    const afterSwap = game.hold();

    expect(afterDrop.canHold).toBe(true);
    expect(afterSwap.holdPiece).toBe(afterDrop.activePiece?.type);
    expect(afterSwap.activePiece?.rotation).toBe("0");
  });

  it("ends the run when a new piece cannot spawn", () => {
    let board = createBoard();

    for (let y = -1; y < 20; y += 1) {
      for (let x = 0; x < 10; x += 1) {
        board = setBoardCell(board, { x, y }, "I");
      }
    }

    const game = new TetrisGame({ board });
    const state = game.getState();

    expect(state.status).toBe("game_over");
    expect(state.endedReason).toBe("TOP_OUT");
  });

  it("creates a render matrix with active and ghost cells", () => {
    const game = new TetrisGame();
    const rows = createRenderMatrix(game.getState());
    const tones = rows.flat().map((cell) => cell.tone);

    expect(rows).toHaveLength(20);
    expect(tones.includes("active")).toBe(true);
    expect(tones.includes("ghost")).toBe(true);
  });

  it("applies perfect clear scoring when a line clear empties the board", () => {
    let board = createBoard();

    for (const x of [0, 1, 2, 7, 8, 9]) {
      board = setBoardCell(board, { x, y: 19 }, "O");
    }

    const game = new TetrisGame({
      board,
      queueGenerator: new StaticQueueGenerator(["I", "O", "T", "S", "Z", "J", "L"])
    });

    const afterFirstClear = lockPieceByGravity(game);

    expect(afterFirstClear.lastClearCount).toBe(1);
    expect(afterFirstClear.lastPerfectClear).toBe(true);
    expect(afterFirstClear.backToBackActive).toBe(true);
    expect(afterFirstClear.comboCount).toBe(0);
    expect(afterFirstClear.score).toBe(2100);
  });

  it("applies combo and back-to-back bonuses across consecutive quads", () => {
    let board = createBoard();

    for (let y = 12; y < 20; y += 1) {
      for (let x = 0; x < 10; x += 1) {
        if (x === 4) {
          continue;
        }

        board = setBoardCell(board, { x, y }, "O");
      }
    }

    const game = new TetrisGame({
      board,
      queueGenerator: new StaticQueueGenerator(["I", "I", "T", "S", "Z", "J", "L"])
    });

    game.rotate("CW");
    game.moveHorizontal(-1);
    const afterFirstQuad = lockPieceByGravity(game);

    expect(afterFirstQuad.lastClearCount).toBe(4);
    expect(afterFirstQuad.backToBackActive).toBe(true);
    expect(afterFirstQuad.comboCount).toBe(0);
    expect(afterFirstQuad.score).toBe(800);

    game.rotate("CW");
    game.moveHorizontal(-1);
    const afterSecondQuad = lockPieceByGravity(game);

    expect(afterSecondQuad.lastClearCount).toBe(4);
    expect(afterSecondQuad.comboCount).toBe(1);
    expect(afterSecondQuad.backToBackActive).toBe(true);
    expect(afterSecondQuad.lastPerfectClear).toBe(true);
    expect(afterSecondQuad.score).toBe(5050);
  });

  it("keeps sprint gravity level fixed at 1", () => {
    const sprintRun = new TetrisGame({ mode: "SPRINT" });

    expect(sprintRun.getState().level).toBe(1);
  });

  it("does not award soft drop score for gravity ticks", () => {
    const game = new TetrisGame();
    const before = game.getState();

    const afterTick = game.tick(800);

    expect(afterTick.score).toBe(before.score);
    expect(afterTick.durationMs).toBe(800);
  });

  it("completes sprint when the 40th line is cleared", () => {
    const board = createWellBoard(16, 20, 4);
    const sprintRun = new TetrisGame({
      mode: "SPRINT",
      board,
      initialStats: {
        linesCleared: 36,
        durationMs: 90_000
      },
      queueGenerator: new StaticQueueGenerator(["I", "O", "T", "S", "Z", "J", "L"])
    });

    sprintRun.rotate("CW");
    sprintRun.moveHorizontal(-1);
    const result = lockPieceByGravity(sprintRun);

    expect(result.linesCleared).toBe(40);
    expect(result.status).toBe("game_over");
    expect(result.endedReason).toBe("GOAL_COMPLETE");
    expect(result.progressValue).toBe(40);
    expect(result.targetValue).toBe(40);
  });

  it("completes daily challenge when the line target is reached", () => {
    let board = createBoard();

    for (const x of [0, 1, 2, 7, 8, 9]) {
      board = setBoardCell(board, { x, y: 19 }, "O");
    }

    const dailyRun = new TetrisGame({
      mode: "DAILY_CHALLENGE",
      board,
      dailyChallenge: {
        ruleType: "line_target",
        goalValue: 12
      },
      initialStats: {
        linesCleared: 11
      },
      queueGenerator: new StaticQueueGenerator(["I", "O", "T", "S", "Z", "J", "L"])
    });

    const result = lockPieceByGravity(dailyRun);

    expect(result.linesCleared).toBe(12);
    expect(result.status).toBe("game_over");
    expect(result.endedReason).toBe("GOAL_COMPLETE");
    expect(result.challengeCompleted).toBe(true);
    expect(result.progressValue).toBe(12);
    expect(result.targetValue).toBe(12);
  });
});
