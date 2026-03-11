import { SevenBagGenerator } from "./bag";
import {
  BACK_TO_BACK_MULTIPLIER,
  COMBO_BONUS,
  getGravityIntervalMs,
  NEXT_QUEUE_SIZE,
  PERFECT_CLEAR_BONUS,
  SCORE_BY_LINES
} from "./constants";
import {
  canPlacePiece,
  clearCompletedLines,
  createActivePiece,
  createBoard,
  getAbsoluteCells,
  lockPiece,
  tryMovePiece,
  tryRotatePiece
} from "./board";
import type {
  ActivePiece,
  GameOptions,
  GameSnapshot,
  QueueGenerator,
  RenderCell,
  RotationDirection,
  TetrominoType
} from "./types";

export class TetrisGame {
  private readonly generator: QueueGenerator;
  private board;
  private activePiece: ActivePiece | null = null;
  private mode;
  private nextQueue: TetrominoType[] = [];
  private holdPiece: TetrominoType | null = null;
  private canHold = true;
  private score = 0;
  private linesCleared = 0;
  private level = 1;
  private piecesLocked = 0;
  private lastClearCount = 0;
  private comboCount = -1;
  private backToBackActive = false;
  private lastPerfectClear = false;
  private status: GameSnapshot["status"] = "playing";
  private endedReason: GameSnapshot["endedReason"] = null;

  constructor(options: GameOptions = {}) {
    this.generator =
      options.queueGenerator ?? new SevenBagGenerator(options.randomSource);
    this.board = options.board ?? createBoard();
    this.mode = options.mode ?? "MARATHON";
    this.activePiece = this.spawnNextPiece();
  }

  getState(): GameSnapshot {
    return {
      mode: this.mode,
      status: this.status,
      board: this.board,
      activePiece: this.activePiece,
      ghostPiece: this.getGhostPiece(),
      nextQueue: [...this.nextQueue],
      holdPiece: this.holdPiece,
      canHold: this.canHold,
      score: this.score,
      linesCleared: this.linesCleared,
      level: this.level,
      piecesLocked: this.piecesLocked,
      lastClearCount: this.lastClearCount,
      comboCount: Math.max(this.comboCount, 0),
      backToBackActive: this.backToBackActive,
      lastPerfectClear: this.lastPerfectClear,
      endedReason: this.endedReason
    };
  }

  moveHorizontal(dx: -1 | 1) {
    if (!this.activePiece || this.status === "game_over") {
      return this.getState();
    }

    const moved = tryMovePiece(this.board, this.activePiece, dx, 0);

    if (moved) {
      this.activePiece = moved;
    }

    return this.getState();
  }

  rotate(direction: RotationDirection) {
    if (!this.activePiece || this.status === "game_over") {
      return this.getState();
    }

    const rotated = tryRotatePiece(this.board, this.activePiece, direction);

    if (rotated) {
      this.activePiece = rotated;
    }

    return this.getState();
  }

  softDrop() {
    if (this.status === "game_over") {
      return this.getState();
    }

    const moved = this.tryAdvance(1);

    if (moved) {
      this.score += 1;
      return this.getState();
    }

    this.lockActivePiece();
    return this.getState();
  }

  hardDrop() {
    if (!this.activePiece || this.status === "game_over") {
      return this.getState();
    }

    let distance = 0;

    while (this.tryAdvance(1)) {
      distance += 1;
    }

    this.score += distance * 2;
    this.lockActivePiece();
    return this.getState();
  }

  tick() {
    if (this.status === "game_over") {
      return this.getState();
    }

    if (this.tryAdvance(1)) {
      return this.getState();
    }

    this.lockActivePiece();
    return this.getState();
  }

  hold() {
    if (!this.activePiece || !this.canHold || this.status === "game_over") {
      return this.getState();
    }

    const currentType = this.activePiece.type;

    if (this.holdPiece === null) {
      this.holdPiece = currentType;
      this.activePiece = this.spawnNextPiece();
    } else {
      const swapType = this.holdPiece;
      this.holdPiece = currentType;
      this.activePiece = this.spawnSpecificPiece(swapType);
    }

    this.canHold = false;
    return this.getState();
  }

  endByPlayer() {
    if (this.status === "playing") {
      this.status = "game_over";
      this.endedReason = "PLAYER_EXIT";
    }

    return this.getState();
  }

  private tryAdvance(dy: number) {
    if (!this.activePiece) {
      return false;
    }

    const moved = tryMovePiece(this.board, this.activePiece, 0, dy);

    if (!moved) {
      return false;
    }

    this.activePiece = moved;
    return true;
  }

  private lockActivePiece() {
    if (!this.activePiece) {
      return;
    }

    this.board = lockPiece(this.board, this.activePiece);
    const clearResult = clearCompletedLines(this.board);
    this.board = clearResult.board;
    this.lastClearCount = clearResult.clearedLineCount;
    this.piecesLocked += 1;
    this.canHold = true;
    this.applyClearOutcome(clearResult.clearedLineCount);
    this.activePiece = this.spawnNextPiece();
  }

  private spawnNextPiece() {
    const type = this.generator.next();
    this.nextQueue = this.generator.peek(NEXT_QUEUE_SIZE);
    return this.spawnSpecificPiece(type);
  }

  private spawnSpecificPiece(type: TetrominoType) {
    const piece = createActivePiece(type);

    if (!canPlacePiece(this.board, piece)) {
      this.status = "game_over";
      this.endedReason = "TOP_OUT";
      return null;
    }

    return piece;
  }

  private getGhostPiece() {
    if (!this.activePiece || this.status === "game_over") {
      return null;
    }

    let ghost = this.activePiece;

    for (;;) {
      const moved = tryMovePiece(this.board, ghost, 0, 1);

      if (!moved) {
        return ghost;
      }

      ghost = moved;
    }
  }

  private applyClearOutcome(clearedLineCount: number) {
    this.linesCleared += clearedLineCount;
    this.level = this.resolveLevel();
    const isPerfectClear = clearedLineCount > 0 && isBoardEmpty(this.board);
    const isBackToBackTarget = clearedLineCount === 4 || isPerfectClear;
    const baseLineScore =
      SCORE_BY_LINES[Math.min(clearedLineCount, 4) as keyof typeof SCORE_BY_LINES] *
      this.level;
    let actionScore = baseLineScore;

    if (isPerfectClear) {
      actionScore += PERFECT_CLEAR_BONUS * this.level;
    }

    if (isBackToBackTarget && this.backToBackActive) {
      actionScore = Math.round(actionScore * BACK_TO_BACK_MULTIPLIER);
    }

    if (clearedLineCount > 0) {
      this.comboCount += 1;

      if (this.comboCount > 0) {
        actionScore += COMBO_BONUS * this.comboCount * this.level;
      }
    } else {
      this.comboCount = -1;
    }

    if (clearedLineCount > 0) {
      this.score += actionScore;
    }

    if (clearedLineCount > 0 && !isBackToBackTarget) {
      this.backToBackActive = false;
    }

    if (isBackToBackTarget) {
      this.backToBackActive = true;
    }

    this.lastPerfectClear = isPerfectClear;
  }

  private resolveLevel() {
    if (this.mode === "SPRINT") {
      return 1;
    }

    return Math.floor(this.linesCleared / 10) + 1;
  }
}

function isBoardEmpty(board: GameSnapshot["board"]) {
  return board.cells.every((row) => row.every((cell) => cell === null));
}

export function getTickIntervalMs(state: Pick<GameSnapshot, "mode" | "level">) {
  return getGravityIntervalMs(state.mode, state.level);
}

function isVisibleRow(y: number) {
  return y >= 0;
}

export function createRenderMatrix(state: GameSnapshot): RenderCell[][] {
  const rows: RenderCell[][] = state.board.cells
    .slice(state.board.hiddenRows)
    .map((row) =>
      row.map((cell) => ({
        piece: cell,
        tone: cell === null ? "empty" : "locked"
      }))
    );

  const ghostCells =
    state.ghostPiece === null ? [] : getAbsoluteCells(state.ghostPiece);
  const activeCells =
    state.activePiece === null ? [] : getAbsoluteCells(state.activePiece);

  for (const position of ghostCells) {
    if (!isVisibleRow(position.y)) {
      continue;
    }

    const row = rows[position.y];

    if (row[position.x].piece === null) {
      row[position.x] = {
        piece: state.ghostPiece?.type ?? null,
        tone: "ghost"
      };
    }
  }

  for (const position of activeCells) {
    if (!isVisibleRow(position.y)) {
      continue;
    }

    rows[position.y][position.x] = {
      piece: state.activePiece?.type ?? null,
      tone: "active"
    };
  }

  return rows;
}
