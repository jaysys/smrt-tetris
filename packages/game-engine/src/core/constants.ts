import type {
  CellPosition,
  GameMode,
  RotationTransition,
  RotationState,
  TetrominoType
} from "./types";

export const TETROMINO_SEQUENCE: TetrominoType[] = [
  "I",
  "J",
  "L",
  "O",
  "S",
  "T",
  "Z"
];

export const BOARD_WIDTH = 10;
export const BOARD_VISIBLE_HEIGHT = 20;
export const BOARD_HIDDEN_ROWS = 2;
export const NEXT_QUEUE_SIZE = 5;
export const SCORE_BY_LINES = {
  0: 0,
  1: 100,
  2: 300,
  3: 500,
  4: 800
} as const;
export const PERFECT_CLEAR_BONUS = 2000;
export const COMBO_BONUS = 50;
export const BACK_TO_BACK_MULTIPLIER = 1.5;
export const SOFT_DROP_MULTIPLIER = 15;
export const MIN_GRAVITY_MS = 80;

export const ROTATION_ORDER: RotationState[] = ["0", "R", "2", "L"];

export const ROTATION_TRANSITIONS = {
  CW: {
    "0": "R",
    R: "2",
    "2": "L",
    L: "0"
  },
  CCW: {
    "0": "L",
    L: "2",
    "2": "R",
    R: "0"
  }
} as const;

export const ROTATION_TRANSITION_KEYS: RotationTransition[] = [
  "0>R",
  "R>0",
  "R>2",
  "2>R",
  "2>L",
  "L>2",
  "L>0",
  "0>L"
];

export const PIECE_SPAWNS: Record<TetrominoType, CellPosition> = {
  I: { x: 3, y: -1 },
  O: { x: 4, y: -1 },
  T: { x: 3, y: -1 },
  S: { x: 3, y: -1 },
  Z: { x: 3, y: -1 },
  J: { x: 3, y: -1 },
  L: { x: 3, y: -1 }
};

export const PIECE_CELLS: Record<
  TetrominoType,
  Record<RotationState, readonly CellPosition[]>
> = {
  I: {
    "0": [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 }
    ],
    R: [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 }
    ],
    "2": [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 }
    ],
    L: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 }
    ]
  },
  O: {
    "0": [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    R: [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    "2": [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    L: [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ]
  },
  T: {
    "0": [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    R: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 }
    ],
    "2": [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 }
    ],
    L: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 }
    ]
  },
  S: {
    "0": [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 }
    ],
    R: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 }
    ],
    "2": [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 }
    ],
    L: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 }
    ]
  },
  Z: {
    "0": [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    R: [
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 }
    ],
    "2": [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 }
    ],
    L: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 0, y: 2 }
    ]
  },
  J: {
    "0": [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    R: [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 }
    ],
    "2": [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 }
    ],
    L: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 }
    ]
  },
  L: {
    "0": [
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ],
    R: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 }
    ],
    "2": [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 }
    ],
    L: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 }
    ]
  }
};

export const WALL_KICKS = {
  normal: {
    "0>R": [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: -1, y: -1 },
      { x: 0, y: 2 },
      { x: -1, y: 2 }
    ],
    "R>0": [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: -2 },
      { x: 1, y: -2 }
    ],
    "R>2": [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: -2 },
      { x: 1, y: -2 }
    ],
    "2>R": [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: -1, y: -1 },
      { x: 0, y: 2 },
      { x: -1, y: 2 }
    ],
    "2>L": [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: -1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 }
    ],
    "L>2": [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: -2 },
      { x: -1, y: -2 }
    ],
    "L>0": [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: -2 },
      { x: -1, y: -2 }
    ],
    "0>L": [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: -1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 }
    ]
  },
  I: {
    "0>R": [
      { x: 0, y: 0 },
      { x: -2, y: 0 },
      { x: 1, y: 0 },
      { x: -2, y: 1 },
      { x: 1, y: -2 }
    ],
    "R>0": [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: -1, y: 0 },
      { x: 2, y: -1 },
      { x: -1, y: 2 }
    ],
    "R>2": [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 2, y: 0 },
      { x: -1, y: -2 },
      { x: 2, y: 1 }
    ],
    "2>R": [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -2, y: 0 },
      { x: 1, y: 2 },
      { x: -2, y: -1 }
    ],
    "2>L": [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: -1, y: 0 },
      { x: 2, y: -1 },
      { x: -1, y: 2 }
    ],
    "L>2": [
      { x: 0, y: 0 },
      { x: -2, y: 0 },
      { x: 1, y: 0 },
      { x: -2, y: 1 },
      { x: 1, y: -2 }
    ],
    "L>0": [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -2, y: 0 },
      { x: 1, y: 2 },
      { x: -2, y: -1 }
    ],
    "0>L": [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 2, y: 0 },
      { x: -1, y: -2 },
      { x: 2, y: 1 }
    ]
  },
  O: {
    "0>R": [{ x: 0, y: 0 }],
    "R>0": [{ x: 0, y: 0 }],
    "R>2": [{ x: 0, y: 0 }],
    "2>R": [{ x: 0, y: 0 }],
    "2>L": [{ x: 0, y: 0 }],
    "L>2": [{ x: 0, y: 0 }],
    "L>0": [{ x: 0, y: 0 }],
    "0>L": [{ x: 0, y: 0 }]
  }
} as const;

const GRAVITY_BY_LEVEL: Record<number, number> = {
  1: 1000,
  2: 850,
  3: 700,
  4: 600,
  5: 500,
  6: 420,
  7: 350,
  8: 280,
  9: 220,
  10: 170
};

export function getGravityIntervalMs(mode: GameMode, level: number): number {
  if (mode === "SPRINT") {
    return GRAVITY_BY_LEVEL[1];
  }

  if (level <= 10) {
    return GRAVITY_BY_LEVEL[level];
  }

  return Math.max(MIN_GRAVITY_MS, GRAVITY_BY_LEVEL[10] - (level - 10) * 10);
}
