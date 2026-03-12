export type TetrominoType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
export type RotationState = "0" | "R" | "2" | "L";
export type RotationDirection = "CW" | "CCW";
export type RotationTransition =
  | "0>R"
  | "R>0"
  | "R>2"
  | "2>R"
  | "2>L"
  | "L>2"
  | "L>0"
  | "0>L";
export type BoardCell = TetrominoType | null;
export type GameMode = "MARATHON" | "SPRINT" | "DAILY_CHALLENGE";
export type GameStatus = "playing" | "game_over";
export type EndedReason =
  | "TOP_OUT"
  | "PLAYER_EXIT"
  | "GOAL_COMPLETE"
  | "TIME_LIMIT"
  | "RULE_VIOLATION"
  | null;

export type RandomSource = () => number;

export interface QueueGenerator {
  next(): TetrominoType;
  peek(size: number): TetrominoType[];
}

export interface CellPosition {
  x: number;
  y: number;
}

export interface ActivePiece {
  type: TetrominoType;
  rotation: RotationState;
  x: number;
  y: number;
}

export interface BoardState {
  width: number;
  visibleHeight: number;
  hiddenRows: number;
  cells: BoardCell[][];
}

export interface LineClearResult {
  board: BoardState;
  clearedLineCount: number;
  clearedRowIndices: number[];
}

export interface RenderCell {
  piece: BoardCell;
  tone: "empty" | "ghost" | "active" | "locked";
}

export interface GameSnapshot {
  mode: GameMode;
  status: GameStatus;
  board: BoardState;
  activePiece: ActivePiece | null;
  ghostPiece: ActivePiece | null;
  nextQueue: TetrominoType[];
  holdPiece: TetrominoType | null;
  canHold: boolean;
  score: number;
  linesCleared: number;
  level: number;
  durationMs: number;
  piecesLocked: number;
  lastClearCount: number;
  comboCount: number;
  backToBackActive: boolean;
  lastPerfectClear: boolean;
  targetValue: number | null;
  progressValue: number | null;
  challengeCompleted: boolean;
  endedReason: EndedReason;
}

export interface GameChallengeRule {
  ruleType: "score_target" | "line_target" | "no_hold" | "time_attack";
  goalValue: number;
}

export interface InitialGameStats {
  score?: number;
  linesCleared?: number;
  level?: number;
  durationMs?: number;
  piecesLocked?: number;
  comboCount?: number;
  backToBackActive?: boolean;
  lastPerfectClear?: boolean;
}

export interface GameOptions {
  mode?: GameMode;
  randomSource?: RandomSource;
  queueGenerator?: QueueGenerator;
  board?: BoardState;
  dailyChallenge?: GameChallengeRule | null;
  initialStats?: InitialGameStats;
}
