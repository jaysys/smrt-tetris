"use client";

import { trackFunnelEvent } from "./analytics-client";
import {
  createRenderMatrix,
  getTickIntervalMs,
  SOFT_DROP_MULTIPLIER,
  TetrisGame,
  type GameMode,
  type GameSnapshot,
  type TetrominoType
} from "@tetris/game-engine";
import type {
  BootstrapData,
  CreateGameSessionData
} from "@tetris/shared-types";
import type { UserSettings } from "@tetris/shared-types";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type CSSProperties
} from "react";

const tutorialSteps = [
  {
    title: "1. 이동",
    body: "방향키 좌우 또는 하단 터치 버튼으로 블록을 움직입니다."
  },
  {
    title: "2. 회전과 Hold",
    body: "위쪽 방향키 또는 회전 버튼으로 회전하고 C/Shift 또는 Hold 버튼으로 보관합니다."
  },
  {
    title: "3. 드롭과 종료",
    body: "아래 방향키는 소프트 드롭, Space는 하드 드롭입니다. 상단 배치 불가 시 결과 화면으로 전환됩니다."
  }
] as const;

const modeOrder: GameMode[] = ["MARATHON", "SPRINT", "DAILY_CHALLENGE"];
const modeLabels: Record<GameMode, string> = {
  MARATHON: "Marathon",
  SPRINT: "Sprint",
  DAILY_CHALLENGE: "Daily Challenge"
};

const modeDescriptions: Record<
  GameMode,
  {
    title: string;
    summary: string;
    ending: string;
    ranking: string;
  }
> = {
  MARATHON: {
    title: "Marathon",
    summary: "오래 살아남아 고득점을 쌓는 기본 모드입니다.",
    ending: "종료 조건: 더 이상 새 블록을 배치할 수 없을 때",
    ranking: "랭킹 기준: 점수 우선, 이후 짧은 생존 시간"
  },
  SPRINT: {
    title: "Sprint",
    summary: "40라인을 가장 빠르게 지우는 속도 모드입니다.",
    ending: "종료 조건: 목표 라인 수 달성",
    ranking: "랭킹 기준: 기록 시간 우선, 이후 더 적은 입력 수"
  },
  DAILY_CHALLENGE: {
    title: "Daily Challenge",
    summary: "오늘의 목표와 보상을 노리는 일일 모드입니다.",
    ending: "종료 조건: 미션 성공 또는 실패 조건 도달",
    ranking: "랭킹 기준: 당일 점수와 목표 달성 상태"
  }
};

const landingHighlights = [
  {
    title: "오늘의 Daily Challenge",
    description: "한 판 흐름을 끊지 않는 보조 목표로 제공됩니다."
  },
  {
    title: "모바일 세로 우선",
    description: "390x844와 360x800에서 보드, HUD, 조작부가 동시에 보입니다."
  },
  {
    title: "빠른 재도전",
    description: "결과 확인보다 다시 시작이 더 눈에 띄도록 설계했습니다."
  }
] as const;

const landingRewardStamps = [
  { label: "HOT STREAK", copy: "최근 3판 중 최고 흐름" },
  { label: "DAILY BONUS", copy: "오늘의 보상 상자 대기 중" },
  { label: "FAST RETRY", copy: "결과 확인 뒤 바로 재도전" }
] as const;

const modePosterDetails: Record<
  GameMode,
  {
    tone: string;
    badge: string;
    pulse: string;
    emotion: string;
    tempo: string;
    focus: string;
    reward: string;
    rewardBadge: string;
  }
> = {
  MARATHON: {
    tone: "poster-marathon",
    badge: "ENDLESS RUN",
    pulse: "점수와 레벨이 계속 쌓이는 장기전",
    emotion: "끝까지 버티며 수치를 키우는 생존 런",
    tempo: "집중 템포: 길게 유지하며 누적",
    focus: "성장 포인트: 점수와 레벨이 끊기지 않고 오른다",
    reward: "경쟁 포인트: 오래 버틸수록 더 높은 점수 배지",
    rewardBadge: "High Score Medal"
  },
  SPRINT: {
    tone: "poster-sprint",
    badge: "TIME ATTACK",
    pulse: "짧은 시간 안에 손이 가장 빠르게 움직이는 모드",
    emotion: "짧고 빠르게 압박을 밀어붙이는 타임 어택",
    tempo: "집중 템포: 짧고 강하게 몰아치기",
    focus: "핵심 목표: 40라인을 가장 빠르게 정리",
    reward: "경쟁 포인트: 더 낮은 시간, 더 적은 입력",
    rewardBadge: "Speed Crown"
  },
  DAILY_CHALLENGE: {
    tone: "poster-daily",
    badge: "LIMITED DROP",
    pulse: "오늘만 열리는 보상 미션과 스탬프를 노리는 모드",
    emotion: "오늘만 열리는 보상 미션",
    tempo: "집중 템포: 조건을 읽고 안전하게 달성",
    focus: "핵심 목표: 일일 조건 달성과 진행도 채우기",
    reward: "보상 포인트: Daily 스탬프와 수집형 보상",
    rewardBadge: "Daily Stamp"
  }
};

const rankingPeriods = ["daily", "weekly", "all"] as const;
type RankingPeriod = (typeof rankingPeriods)[number];

const rankingPeriodLabels: Record<RankingPeriod, string> = {
  daily: "일간",
  weekly: "주간",
  all: "전체"
};

type Screen = "landing" | "modeSelect" | "ranking" | "playing" | "result";
type BottomSheet = "settings" | "nickname" | "daily" | null;

const defaultBootstrap: BootstrapData = {
  guestToken: "guest_local_fallback",
  defaultMode: "MARATHON",
  dailyChallenge: {
    challengeId: "daily-local",
    title: "12 lines in one run",
    ruleType: "line_target",
    goalValue: 12,
    reward: {
      rewardType: "badge",
      rewardValue: 1
    },
    validFrom: new Date().toISOString(),
    validTo: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    myProgress: {
      progressValue: 0,
      completed: false,
      completedAt: null
    },
    claimed: false
  },
  announcements: [
    {
      id: "ann-local",
      title: "D1 playtest",
      body: "공개 웹과 API를 함께 띄우면 게스트 세션 생성까지 실제 호출됩니다.",
      publishedAt: new Date().toISOString()
    }
  ],
  settings: {
    soundEnabled: true,
    vibrationEnabled: true,
    effectLevel: "normal",
    ghostPieceEnabled: true,
    highContrastMode: false,
    guideOverlayEnabled: true,
    themeId: "default"
  },
  featureFlags: {
    rankedEnabled: true,
    missionsEnabled: false,
    shareEnabled: true
  }
};

const defaultSessionData: CreateGameSessionData = {
  sessionId: "gs_local_session",
  mode: "MARATHON",
  seed: "fallback-seed",
  issuedAt: new Date().toISOString(),
  configVersion: 1,
  timeLimitSec: null,
  rules: {
    holdEnabled: true,
    ghostEnabledDefault: true,
    nextQueueSize: 5
  }
};

const touchActions = [
  { label: "왼쪽", action: "left" },
  { label: "오른쪽", action: "right" },
  { label: "회전", action: "rotate" },
  { label: "홀드", action: "hold" },
  { label: "소프트 드롭", action: "softDrop" },
  { label: "하드 드롭", action: "hardDrop" }
] as const;

const touchActionMood: Record<
  (typeof touchActions)[number]["action"],
  { badge: string; hint: string; tone: string }
> = {
  left: {
    badge: "MOVE",
    hint: "안전하게 공간 확보",
    tone: "touch-tone-move"
  },
  right: {
    badge: "MOVE",
    hint: "빠르게 빈 칸 진입",
    tone: "touch-tone-move"
  },
  rotate: {
    badge: "SPIN",
    hint: "벽차기 타이밍 노리기",
    tone: "touch-tone-spin"
  },
  hold: {
    badge: "HOLD",
    hint: "다음 흐름 저장",
    tone: "touch-tone-hold"
  },
  softDrop: {
    badge: "PRESS",
    hint: "속도 조절하며 하강",
    tone: "touch-tone-drop"
  },
  hardDrop: {
    badge: "DROP",
    hint: "즉시 착지로 점수 압박",
    tone: "touch-tone-drop"
  }
};

type CtaVariant = "utility" | "start" | "retry" | "daily" | "rank";

const guestTokenStorageKey = "tetris.guestToken";
const tutorialSeenStorageKey = "tetris.tutorialSeen";

function ctaButtonClass(variant: CtaVariant) {
  return `cta-button cta-button--${variant}`;
}

function modeActionVariant(mode: GameMode): CtaVariant {
  if (mode === "SPRINT") {
    return "retry";
  }

  if (mode === "DAILY_CHALLENGE") {
    return "daily";
  }

  return "start";
}

function resolveApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:60040/v1";
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${resolveApiBaseUrl()}${path}`, init);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

async function loadBootstrap(existingGuestToken: string | null) {
  const headers: HeadersInit = {};

  if (existingGuestToken) {
    headers.authorization = `Bearer ${existingGuestToken}`;
  }

  try {
    const response = await fetchJson<{ data: BootstrapData }>("/bootstrap", {
      headers,
      cache: "no-store"
    });
    return response.data;
  } catch {
    return defaultBootstrap;
  }
}

async function createSession(mode: GameMode) {
  try {
    const response = await fetchJson<{ data: CreateGameSessionData }>(
      "/game-sessions",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          mode,
          deviceType: "desktop",
          clientVersion: "0.1.0",
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        })
      }
    );

    return response.data;
  } catch {
    return {
      ...defaultSessionData,
      mode,
      issuedAt: new Date().toISOString()
    };
  }
}

async function updateSettings(nextSettings: UserSettings, guestToken: string | null) {
  try {
    const response = await fetchJson<{ data: UserSettings }>("/settings", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        ...(guestToken ? { authorization: `Bearer ${guestToken}` } : {})
      },
      body: JSON.stringify(nextSettings)
    });

    return response.data;
  } catch {
    return nextSettings;
  }
}

function MiniPiece({
  piece,
  testId
}: {
  piece: TetrominoType | null;
  testId?: string;
}) {
  return (
    <div className="mini-piece" data-testid={testId}>
      {piece === null ? "EMPTY" : piece}
    </div>
  );
}

function formatPrimaryMetric(mode: GameMode, snapshot: GameSnapshot | null) {
  if (!snapshot) {
    return mode === "SPRINT" ? "40L 준비 중" : "0";
  }

  if (mode === "SPRINT") {
    return formatDurationMs(snapshot.durationMs);
  }

  if (mode === "DAILY_CHALLENGE" && snapshot.targetValue !== null) {
    return `${snapshot.progressValue ?? 0}/${snapshot.targetValue}`;
  }

  return snapshot.score.toLocaleString("ko-KR");
}

function formatDurationMs(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  const centiseconds = Math.floor((durationMs % 1000) / 10)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}.${centiseconds}`;
}

function formatEndedReason(snapshot: GameSnapshot) {
  switch (snapshot.endedReason) {
    case "TOP_OUT":
      return "배치 불가";
    case "GOAL_COMPLETE":
      return "목표 달성";
    case "TIME_LIMIT":
      return "시간 종료";
    case "RULE_VIOLATION":
      return "도전 규칙 실패";
    case "PLAYER_EXIT":
      return "직접 종료";
    default:
      return "종료";
  }
}

function buildRankingRows(mode: GameMode, latestResult: GameSnapshot | null) {
  const baseRows = {
    MARATHON: [
      { rank: 1, nickname: "SkyStack", metric: "42,800", achievedAt: "오늘 00:12" },
      { rank: 2, nickname: "LineRush", metric: "38,260", achievedAt: "오늘 00:41" },
      { rank: 3, nickname: "BlockMint", metric: "34,900", achievedAt: "어제 23:58" }
    ],
    SPRINT: [
      { rank: 1, nickname: "FortyDash", metric: "01:28.42", achievedAt: "오늘 00:07" },
      { rank: 2, nickname: "QuickDrop", metric: "01:34.11", achievedAt: "오늘 00:39" },
      { rank: 3, nickname: "SpinRail", metric: "01:40.25", achievedAt: "어제 21:18" }
    ],
    DAILY_CHALLENGE: [
      { rank: 1, nickname: "DailyAce", metric: "Goal + 12,400", achievedAt: "오늘 00:31" },
      { rank: 2, nickname: "ComboDay", metric: "Goal + 10,820", achievedAt: "오늘 00:43" },
      { rank: 3, nickname: "HoldLess", metric: "Goal + 9,760", achievedAt: "어제 22:11" }
    ]
  } satisfies Record<
    GameMode,
    { rank: number; nickname: string; metric: string; achievedAt: string }[]
  >;

  const currentMetric =
    mode === "SPRINT"
      ? formatDurationMs(latestResult?.durationMs ?? 0)
      : mode === "DAILY_CHALLENGE"
        ? `${latestResult?.progressValue ?? 0}/${latestResult?.targetValue ?? 0}`
      : `${latestResult?.score.toLocaleString("ko-KR") ?? "0"}`;

  return [
    {
      rank: "내 기록",
      nickname: "게스트",
      metric: currentMetric,
      achievedAt: latestResult ? "방금 전" : "기록 없음",
      highlighted: true
    },
    ...baseRows[mode].map((row) => ({ ...row, highlighted: false }))
  ];
}

function buildResultCelebration(mode: GameMode, snapshot: GameSnapshot) {
  if (mode === "SPRINT") {
    return {
      badge: snapshot.endedReason === "GOAL_COMPLETE" ? "SPRINT CLEAR" : "SPEED PUSH",
      title:
        snapshot.endedReason === "GOAL_COMPLETE"
          ? "40라인 완주를 마쳤습니다."
          : "기록을 더 줄일 준비가 됐습니다.",
      summary:
        snapshot.endedReason === "GOAL_COMPLETE"
          ? `완주 기록 ${formatDurationMs(snapshot.durationMs)}. 다음 러닝에서는 입력 수를 더 줄여 상위권에 도전할 수 있습니다.`
          : `현재 ${snapshot.linesCleared}/40 라인. 다음 러닝에서 입력을 더 다듬으면 상위권 진입이 가능합니다.`,
      accent: snapshot.endedReason === "GOAL_COMPLETE" ? "완주 메달 확보" : "속도 왕관 경쟁"
    };
  }

  if (mode === "DAILY_CHALLENGE") {
    return {
      badge: snapshot.challengeCompleted ? "DAILY CLEAR" : "DAILY REWARD",
      title: snapshot.challengeCompleted
        ? "오늘의 챌린지 목표를 달성했습니다."
        : "오늘의 보상 루프가 아직 열려 있습니다.",
      summary: snapshot.challengeCompleted
        ? `진행도 ${snapshot.progressValue ?? 0}/${snapshot.targetValue ?? 0}. 보상 수령과 기록 저장을 이어서 진행할 수 있습니다.`
        : `점수 ${snapshot.score.toLocaleString("ko-KR")}점. 데일리 목표를 다시 밀어 올리면 스탬프와 보상 카드가 강화됩니다.`,
      accent: snapshot.challengeCompleted ? "오늘의 보상 확정" : "오늘의 챌린지 경쟁"
    };
  }

  return {
    badge: "HIGH SCORE RUN",
    title: "점수 곡선을 더 위로 밀어 올릴 수 있습니다.",
    summary: `현재 ${snapshot.score.toLocaleString("ko-KR")}점. 다음 한 판에서 백투백과 퍼펙트 클리어를 이어가면 상위 배지권에 들어갑니다.`,
    accent: "장기전 점수 경쟁"
  };
}

function GameBoard({
  state,
  showGhostPiece
}: {
  state: GameSnapshot;
  showGhostPiece: boolean;
}) {
  const rows = createRenderMatrix(
    showGhostPiece ? state : { ...state, ghostPiece: null }
  );

  return (
    <div className="board-frame">
      <div className="board-grid" data-testid="game-canvas">
        {rows.flatMap((row, rowIndex) =>
          row.map((cell, columnIndex) => (
            <div
              key={`${rowIndex}-${columnIndex}`}
              className="board-cell"
              data-piece={cell.piece ?? "empty"}
              data-tone={cell.tone}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function GameClient() {
  const [modeIndex, setModeIndex] = useState(0);
  const [screen, setScreen] = useState<Screen>("landing");
  const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>("daily");
  const [activeSheet, setActiveSheet] = useState<BottomSheet>(null);
  const [nicknameValue, setNicknameValue] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [bootstrapData, setBootstrapData] = useState<BootstrapData>(defaultBootstrap);
  const [appSettings, setAppSettings] = useState<UserSettings>(defaultBootstrap.settings);
  const [sessionData, setSessionData] = useState<CreateGameSessionData | null>(null);
  const [announcementSummary, setAnnouncementSummary] = useState("");
  const [statusNotice, setStatusNotice] = useState("게스트 토큰과 Daily 요약을 준비 중입니다.");
  const [game, setGame] = useState<GameSnapshot | null>(null);
  const [softDropActive, setSoftDropActive] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [lastTrackedEvent, setLastTrackedEvent] = useState("none");
  const [bootstrapResolved, setBootstrapResolved] = useState(false);
  const [playScale, setPlayScale] = useState(1);
  const [playViewportHeight, setPlayViewportHeight] = useState<number | null>(null);
  const engineRef = useRef<TetrisGame | null>(null);
  const hasTrackedLandingView = useRef(false);
  const hasTrackedGameFinish = useRef(false);
  const hasAutoStartedInitialGame = useRef(false);
  const playViewportRef = useRef<HTMLDivElement | null>(null);
  const playScaleFrameRef = useRef<HTMLDivElement | null>(null);
  const deferredGame = useDeferredValue(game);
  const selectedMode = modeOrder[modeIndex];
  const selectedModePoster = modePosterDetails[selectedMode];

  function readGuestToken() {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(guestTokenStorageKey);
  }

  function pushAnalyticsEvent(
    name:
      | "landing_view"
      | "quick_start_click"
      | "game_start"
      | "game_finish"
      | "retry_click",
    attributes?: Record<string, string | number | boolean | null>
  ) {
    trackFunnelEvent(name, attributes);
    setLastTrackedEvent(name);
  }

  function syncGame() {
    const snapshot = engineRef.current?.getState() ?? null;

    setGame(snapshot);

    if (snapshot?.status === "game_over" && !hasTrackedGameFinish.current) {
      hasTrackedGameFinish.current = true;
      pushAnalyticsEvent("game_finish", {
        mode: snapshot.mode,
        ended_reason: snapshot.endedReason ?? "unknown",
        score: snapshot.score,
        duration_ms: snapshot.durationMs,
        lines_cleared: snapshot.linesCleared,
        pieces_locked: snapshot.piecesLocked
      });
    }

    if (snapshot?.status === "game_over") {
      startTransition(() => {
        setScreen("result");
      });
    }
  }

  async function bootstrapLanding() {
    const existingGuestToken =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(guestTokenStorageKey);
    const bootstrap = await loadBootstrap(existingGuestToken);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(guestTokenStorageKey, bootstrap.guestToken);
    }

    setBootstrapData(bootstrap);
    setAppSettings(bootstrap.settings);
    setApiReady(bootstrap.guestToken !== defaultBootstrap.guestToken);
    setAnnouncementSummary(
      bootstrap.announcements[0]?.title ?? "공지 요약은 D3에서 확장됩니다."
    );
    setModeIndex(modeOrder.indexOf("MARATHON"));
    setStatusNotice(
      bootstrap.guestToken === defaultBootstrap.guestToken
        ? "API 미기동 상태라 로컬 fallback으로 플레이합니다."
        : "게스트 bootstrap과 Daily Challenge를 API에서 불러왔습니다."
    );

    if (!hasTrackedLandingView.current) {
      hasTrackedLandingView.current = true;
      pushAnalyticsEvent("landing_view", {
        mode: "MARATHON",
        api_connected: bootstrap.guestToken !== defaultBootstrap.guestToken
      });
    }

    setBootstrapResolved(true);
  }

  useEffect(() => {
    void bootstrapLanding();
  }, []);

  useEffect(() => {
    if (!bootstrapResolved || hasAutoStartedInitialGame.current) {
      return;
    }

    hasAutoStartedInitialGame.current = true;
    void startGame("MARATHON");
  }, [bootstrapResolved]);

  async function updateAppSettings(patch: Partial<UserSettings>) {
    const nextSettings = {
      ...appSettings,
      ...patch
    };
    const savedSettings = await updateSettings(nextSettings, readGuestToken());

    setAppSettings(savedSettings);
    setBootstrapData((current) => ({
      ...current,
      settings: savedSettings
    }));
  }

  async function startGame(mode: GameMode) {
    const session = await createSession(mode);

    engineRef.current = new TetrisGame({
      mode,
      dailyChallenge:
        mode === "DAILY_CHALLENGE" && bootstrapData.dailyChallenge
          ? {
              ruleType: bootstrapData.dailyChallenge.ruleType,
              goalValue: bootstrapData.dailyChallenge.goalValue
            }
          : null
    });
    setSessionData(session);
    setGame(engineRef.current.getState());
    setSoftDropActive(false);
    hasTrackedGameFinish.current = false;
    pushAnalyticsEvent("game_start", {
      mode,
      session_id: session.sessionId,
      api_connected: session.sessionId !== defaultSessionData.sessionId
    });
    startTransition(() => {
      setScreen("playing");
    });

    if (
      appSettings.guideOverlayEnabled &&
      typeof window !== "undefined" &&
      window.localStorage.getItem(tutorialSeenStorageKey) !== "true"
    ) {
      setTutorialStepIndex(0);
      setTutorialOpen(true);
    }
  }

  function openLandingMenu() {
    setTutorialOpen(false);
    setScreen("landing");
  }

  function closeTutorial() {
    setTutorialOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(tutorialSeenStorageKey, "true");
    }
  }

  async function toggleHighContrastMode() {
    await updateAppSettings({
      highContrastMode: !appSettings.highContrastMode
    });
  }

  function applyAction(
    action:
      | "left"
      | "right"
      | "rotate"
      | "rotateCcw"
      | "hold"
      | "softDrop"
      | "hardDrop"
      | "end"
  ) {
    const engine = engineRef.current;

    if (!engine || tutorialOpen) {
      return;
    }

    switch (action) {
      case "left":
        engine.moveHorizontal(-1);
        break;
      case "right":
        engine.moveHorizontal(1);
        break;
      case "rotate":
        engine.rotate("CW");
        break;
      case "rotateCcw":
        engine.rotate("CCW");
        break;
      case "hold":
        engine.hold();
        break;
      case "softDrop":
        engine.softDrop();
        break;
      case "hardDrop":
        engine.hardDrop();
        break;
      case "end":
        engine.endByPlayer();
        break;
    }

    syncGame();
  }

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (screen !== "playing") {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          applyAction("left");
          break;
        case "ArrowRight":
          event.preventDefault();
          applyAction("right");
          break;
        case "ArrowUp":
        case "x":
        case "X":
          event.preventDefault();
          applyAction("rotate");
          break;
        case "z":
        case "Z":
          event.preventDefault();
          applyAction("rotateCcw");
          break;
        case "ArrowDown":
          event.preventDefault();
          setSoftDropActive(true);
          break;
        case " ":
          event.preventDefault();
          applyAction("hardDrop");
          break;
        case "Shift":
        case "c":
        case "C":
          event.preventDefault();
          applyAction("hold");
          break;
        case "Escape":
        case "p":
        case "P":
          event.preventDefault();
          applyAction("end");
          break;
      }
    };

    const releaseListener = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        setSoftDropActive(false);
      }
    };

    window.addEventListener("keydown", listener);
    window.addEventListener("keyup", releaseListener);
    return () => {
      window.removeEventListener("keydown", listener);
      window.removeEventListener("keyup", releaseListener);
    };
  }, [screen, tutorialOpen]);

  useEffect(() => {
    if (screen !== "playing" || deferredGame?.status !== "playing" || tutorialOpen) {
      return;
    }

    const delay = softDropActive
      ? Math.max(1, Math.floor(getTickIntervalMs(deferredGame) / SOFT_DROP_MULTIPLIER))
      : getTickIntervalMs(deferredGame);

    const intervalId = window.setInterval(() => {
      if (softDropActive) {
        engineRef.current?.softDrop(delay);
      } else {
        engineRef.current?.tick(delay);
      }

      syncGame();
    }, delay);

    return () => window.clearInterval(intervalId);
  }, [deferredGame?.level, deferredGame?.status, screen, softDropActive, tutorialOpen]);

  useEffect(() => {
    if (screen !== "playing") {
      setPlayScale(1);
      setPlayViewportHeight(null);
      return;
    }

    let frameId = 0;
    const viewport = playViewportRef.current;
    const scaleFrame = playScaleFrameRef.current;

    if (!viewport || !scaleFrame) {
      return;
    }

    const syncViewportFit = () => {
      const visualViewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportTop = viewport.getBoundingClientRect().top;
      const availableHeight = Math.max(320, Math.floor(visualViewportHeight - viewportTop - 8));
      const naturalHeight = scaleFrame.offsetHeight;
      const availableWidth = viewport.clientWidth;
      const naturalWidth = scaleFrame.offsetWidth;
      const heightScale = naturalHeight > 0 ? availableHeight / naturalHeight : 1;
      const widthScale =
        naturalWidth > availableWidth && naturalWidth > 0 ? availableWidth / naturalWidth : 1;
      const nextScale = Math.min(1, heightScale, widthScale);

      setPlayViewportHeight(availableHeight);
      setPlayScale(Number(nextScale.toFixed(4)));
    };

    const scheduleViewportFit = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(syncViewportFit);
    };

    scheduleViewportFit();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            scheduleViewportFit();
          });

    resizeObserver?.observe(viewport);
    resizeObserver?.observe(scaleFrame);
    window.addEventListener("resize", scheduleViewportFit);
    window.visualViewport?.addEventListener("resize", scheduleViewportFit);
    window.visualViewport?.addEventListener("scroll", scheduleViewportFit);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleViewportFit);
      window.visualViewport?.removeEventListener("resize", scheduleViewportFit);
      window.visualViewport?.removeEventListener("scroll", scheduleViewportFit);
    };
  }, [
    appSettings.ghostPieceEnabled,
    appSettings.guideOverlayEnabled,
    appSettings.highContrastMode,
    screen,
    tutorialOpen
  ]);

  const currentTutorialStep = tutorialSteps[tutorialStepIndex];
  const rankingRows = buildRankingRows(selectedMode, deferredGame);
  const rankingPodiumRows = rankingRows.filter((row) => row.rank !== "내 기록").slice(0, 3);
  const currentRankingRow = rankingRows.find((row) => row.rank === "내 기록") ?? rankingRows[0];
  const resultCelebration =
    deferredGame === null ? null : buildResultCelebration(deferredGame.mode, deferredGame);
  const playViewportStyle =
    screen === "playing"
      ? ({
          "--play-scale": `${playScale}`,
          "--play-viewport-height": playViewportHeight
            ? `${playViewportHeight}px`
            : undefined
        } as CSSProperties)
      : undefined;

  return (
    <main
      className={`page-shell screen-${screen}${appSettings.highContrastMode ? " theme-high-contrast" : ""}`}
      data-testid="page-shell"
      data-contrast-mode={appSettings.highContrastMode ? "high" : "default"}
    >
      {screen === "landing" && (
        <>
          <section className="hero-panel landing-hero">
            <div className="landing-copy">
              <p className="eyebrow">빠른 플레이</p>
              <div className="daily-banner" data-testid="daily-banner">
                오늘의 챌린지: {bootstrapData.dailyChallenge?.title ?? "준비 중"}
              </div>
              <h1>지금 바로 한 판 시작하고, 기록을 남기고, 보상을 챙기세요.</h1>
              <p className="lead">
                로그인 없이 <strong>{modeLabels[selectedMode]}</strong> 모드로 진입합니다.
                첫 화면에서 `바로 시작`, 오늘의 챌린지, 최근 성과를 가장 먼저 인식하게
                만드는 Hero 구조로 정리했습니다.
              </p>

              <div className="cta-row landing-cta-row">
                <button
                  type="button"
                  className={ctaButtonClass("start")}
                  data-testid="start-button"
                  onClick={() => {
                    pushAnalyticsEvent("quick_start_click", {
                      mode: selectedMode
                    });
                    void startGame(selectedMode);
                  }}
                >
                  바로 시작
                </button>
                <button
                  type="button"
                  className={ctaButtonClass("utility")}
                  data-testid="mode-button"
                  onClick={() => setScreen("modeSelect")}
                >
                  모드 선택
                </button>
                <button
                  type="button"
                  className={ctaButtonClass("rank")}
                  data-testid="ranking-button"
                  onClick={() => setScreen("ranking")}
                >
                  랭킹 보기
                </button>
              </div>

              <div className="reward-strip" aria-label="reward language">
                {landingRewardStamps.map((stamp) => (
                  <article key={stamp.label} className="reward-stamp">
                    <strong>{stamp.label}</strong>
                    <span>{stamp.copy}</span>
                  </article>
                ))}
              </div>

              <div className="landing-meta">
                <p className="mode-caption">
                  현재 빠른 시작 모드: <strong>{modeLabels[selectedMode]}</strong>
                </p>
                <p className="mode-caption">오늘 공지: {announcementSummary}</p>
                <p className="api-chip" data-testid="analytics-last-event" aria-live="polite">
                  최근 활동: {lastTrackedEvent}
                </p>
              </div>

              <div className="settings-row" data-testid="settings-row">
                <button
                  type="button"
                  className={ctaButtonClass("utility")}
                  data-testid="settings-sheet-open"
                  onClick={() => setActiveSheet("settings")}
                >
                  설정
                </button>
                <button
                  type="button"
                  className={ctaButtonClass("utility")}
                  data-testid="contrast-toggle"
                  aria-pressed={appSettings.highContrastMode}
                  onClick={() => void toggleHighContrastMode()}
                >
                  고대비 {appSettings.highContrastMode ? "끔" : "켬"}
                </button>
                <a className={ctaButtonClass("utility")} href="/credits">
                  크레딧
                </a>
              </div>
            </div>

            <div className="landing-showcase">
              <div className="hero-mascot" aria-hidden="true">
                <div className="mascot-core" />
                <div className="mascot-eye eye-left" />
                <div className="mascot-eye eye-right" />
                <div className="mascot-ring ring-outer" />
                <div className="mascot-ring ring-inner" />
                <div className="mascot-spark spark-top" />
                <div className="mascot-spark spark-right" />
                <div className="mascot-spark spark-bottom" />
              </div>
              <article className="showcase-card" data-testid="personal-best-card">
                <p className="eyebrow">최근 보상</p>
                <h2>기록 스탬프를 모아 연속 플레이 흐름을 이어가세요.</h2>
                <p>
                  최근 성과는 단순 수치가 아니라 스탬프, 불꽃, 챌린지 완료 감각으로
                  표현합니다.
                </p>
              </article>
              <article className="showcase-card challenge-card" data-testid="daily-preview-card">
                <p className="eyebrow">오늘의 보상</p>
                <h2>오늘의 목표</h2>
                <p>
                  {bootstrapData.dailyChallenge?.ruleType === "line_target"
                    ? `${bootstrapData.dailyChallenge.goalValue}라인을 제거하고 Daily 보상 스탬프를 획득하세요.`
                    : "오늘의 미션은 곧 공개됩니다."}
                </p>
                <div className="cta-row compact-row">
                  <button
                    type="button"
                    className={ctaButtonClass("daily")}
                    data-testid="daily-detail-open"
                    onClick={() => setActiveSheet("daily")}
                  >
                    자세히 보기
                  </button>
                </div>
              </article>
            </div>
          </section>

          <section className="card-grid" aria-label="landing highlights">
            {landingHighlights.map((card) => (
              <article key={card.title} className="info-card highlight-card">
                <h2>{card.title}</h2>
                <p>{card.description}</p>
              </article>
            ))}
          </section>

          <section className="info-card accessibility-panel" data-testid="accessibility-guide">
            <h2>접근성 및 조작 가이드</h2>
            <p>
              키보드: 좌우 이동, 위/X 회전, Z 반시계 회전, Shift/C Hold, 아래 소프트 드롭,
              Space 하드 드롭, Esc 종료.
            </p>
            <p>
              모바일: 하단 조작 버튼으로 동일한 조작을 수행할 수 있습니다. 고대비 토글은
              랜딩에서 즉시 적용됩니다.
            </p>
          </section>
        </>
      )}

      {screen === "modeSelect" && (
        <section className="mode-shell" data-testid="mode-screen">
          <div className="hero-panel compact-hero mode-hero">
            <div className="section-header">
              <button
                type="button"
                className={ctaButtonClass("utility")}
                data-testid="mode-back-button"
                onClick={() => setScreen("landing")}
              >
                뒤로가기
              </button>
              <div>
                <p className="eyebrow">모드 선택</p>
                <h1>지금 플레이할 모드를 고르세요.</h1>
              </div>
            </div>
            <p className="lead">
              기록을 확인한 뒤 어떤 템포로 놀지 바로 고를 수 있게, 세 모드를 포스터형 선택지로
              다시 정리했습니다.
            </p>
            <div className="reward-strip mode-hero-strip">
              <article className="reward-stamp">
                <strong>TONIGHT&apos;S PICK</strong>
                <span>{selectedModePoster.pulse}</span>
              </article>
              <article className="reward-stamp">
                <strong>REWARD LOOP</strong>
                <span>{selectedModePoster.rewardBadge}</span>
              </article>
              <article className="reward-stamp">
                <strong>PLAY TEMPO</strong>
                <span>{selectedModePoster.tempo}</span>
              </article>
            </div>
          </div>

          <section className="mode-grid">
            {modeOrder.map((mode) => (
              <article
                key={mode}
                className={`info-card mode-card ${modePosterDetails[mode].tone}${selectedMode === mode ? " active" : ""}`}
                data-testid={`mode-card-${mode}`}
              >
                <div className="mode-card-layout">
                  <div className="mode-poster-visual" aria-hidden="true">
                    <div className="poster-grid-lines" />
                    <div className="poster-orb" />
                    <div className="poster-glow" />
                    <div className="poster-badge">{modePosterDetails[mode].badge}</div>
                    <div className="poster-pulse">{modePosterDetails[mode].pulse}</div>
                    <div className="poster-meter">
                      <span>{modeLabels[mode]}</span>
                      <strong>{modePosterDetails[mode].rewardBadge}</strong>
                    </div>
                  </div>
                  <div className="mode-card-copy">
                    <p className="eyebrow">{modeLabels[mode]}</p>
                    <h2>{modeDescriptions[mode].title}</h2>
                    <p className="mode-emotion">{modePosterDetails[mode].emotion}</p>
                    <div className="mode-tag-row">
                      <span className="status-chip compact">{modePosterDetails[mode].tempo}</span>
                    </div>
                    <div className="mode-meta">
                      <p>{modePosterDetails[mode].focus}</p>
                      <p>{modePosterDetails[mode].reward}</p>
                      <p>{modeDescriptions[mode].ending}</p>
                    </div>
                    <div className="cta-row">
                      <button
                        type="button"
                        className={ctaButtonClass("utility")}
                        onClick={() => setModeIndex(modeOrder.indexOf(mode))}
                      >
                        선택
                      </button>
                      <button
                        type="button"
                        className={ctaButtonClass(modeActionVariant(mode))}
                        data-testid={`mode-start-button-${mode}`}
                        onClick={() => {
                          setModeIndex(modeOrder.indexOf(mode));
                          void startGame(mode);
                        }}
                      >
                        이 모드 시작
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="info-card mode-spotlight" data-testid="mode-spotlight">
            <div className="section-header">
              <div>
                <p className="eyebrow">선택된 포스터</p>
                <h2>{modeLabels[selectedMode]} 플레이 가이드</h2>
              </div>
              <span className="status-chip">{selectedModePoster.rewardBadge}</span>
            </div>
            <p className="lead mode-spotlight-copy">{selectedModePoster.pulse}</p>
            <div className="card-grid secondary-grid mode-spotlight-grid">
              <article className="info-card highlight-card">
                <h2>집중 포인트</h2>
                <p>{selectedModePoster.focus}</p>
              </article>
              <article className="info-card highlight-card">
                <h2>보상 포인트</h2>
                <p>{selectedModePoster.reward}</p>
              </article>
            </div>
          </section>

          <section className="info-card daily-spotlight">
            <h2>데일리 챌린지</h2>
            <p>
              오늘 목표: {bootstrapData.dailyChallenge?.title ?? "준비 중"}.
              진행도 {bootstrapData.dailyChallenge?.myProgress.progressValue ?? 0} /
              {bootstrapData.dailyChallenge?.goalValue ?? 0}
            </p>
            <div className="cta-row compact-row">
              <button
                type="button"
                className={ctaButtonClass("daily")}
                onClick={() => setActiveSheet("daily")}
              >
                상세 보기
              </button>
            </div>
          </section>
        </section>
      )}

      {screen === "ranking" && (
        <section className="ranking-shell" data-testid="ranking-screen">
          <div className="hero-panel compact-hero ranking-hero">
            <div className="section-header">
              <button
                type="button"
                className={ctaButtonClass("utility")}
                onClick={() => setScreen("landing")}
              >
                뒤로가기
              </button>
              <div>
                <p className="eyebrow">랭킹</p>
                <h1>모드별 기록 흐름을 한눈에 확인합니다.</h1>
              </div>
            </div>
            <p className="lead">
              상위권은 단순 리스트가 아니라 시상대처럼 보이게, 내 기록은 별도 경쟁 카드로
              분리해 비교 흐름이 바로 읽히도록 구성합니다.
            </p>
            <div className="filter-row" role="tablist" aria-label="mode ranking tabs">
              {modeOrder.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`chip-button${selectedMode === mode ? " active" : ""}`}
                  data-testid={`ranking-tab-${mode}`}
                  onClick={() => setModeIndex(modeOrder.indexOf(mode))}
                >
                  {modeLabels[mode]}
                </button>
              ))}
            </div>
            <div className="filter-row" role="tablist" aria-label="period tabs">
              {rankingPeriods.map((period) => (
                <button
                  key={period}
                  type="button"
                  className={`chip-button${rankingPeriod === period ? " active" : ""}`}
                  data-testid={`ranking-segment-${period}`}
                  onClick={() => setRankingPeriod(period)}
                >
                  {rankingPeriodLabels[period]}
                </button>
              ))}
            </div>
          </div>

          <section className="ranking-podium" data-testid="ranking-podium">
            {rankingPodiumRows.map((row, index) => (
              <article
                key={`${row.rank}-${row.nickname}`}
                className={`info-card podium-card podium-rank-${index + 1}`}
                data-testid={`ranking-podium-${index + 1}`}
              >
                <span className="podium-medal">#{row.rank}</span>
                <h2>{row.nickname}</h2>
                <p className="podium-metric">{row.metric}</p>
                <span className="podium-time">{row.achievedAt}</span>
              </article>
            ))}
          </section>

          <section className="card-grid secondary-grid ranking-summary-grid">
            <article className="info-card ranking-current-card" data-testid="ranking-row-current">
              <h2>내 기록</h2>
              <p>
                현재 모드 {modeLabels[selectedMode]} 기준 대표 값:{" "}
                {formatPrimaryMetric(selectedMode, deferredGame)}. 범위:{" "}
                {rankingPeriodLabels[rankingPeriod]}
              </p>
              <p>
                비교 기준: {currentRankingRow?.metric ?? "0"} / 내 순위는 다음 공식 기록 반영 후
                갱신됩니다.
              </p>
            </article>
            <article className="info-card ranking-current-card">
              <h2>경쟁 포인트</h2>
              <p>{modeDescriptions[selectedMode].ranking}</p>
              <p>
                상위 3명과의 차이를 바로 읽을 수 있게 시상대와 리스트를 분리했습니다.
              </p>
            </article>
          </section>

          <section className="ranking-list">
            {rankingRows.map((row) => (
              <article
                key={`${row.rank}-${row.nickname}`}
                className={`info-card ranking-row${row.highlighted ? " highlighted" : ""}`}
              >
                <strong>{row.rank}</strong>
                <div>
                  <h2>{row.nickname}</h2>
                  <p>{row.metric}</p>
                </div>
                <span>{row.achievedAt}</span>
              </article>
            ))}
          </section>
        </section>
      )}

      {screen === "playing" && deferredGame && (
        <section className="game-shell">
          <div
            ref={playViewportRef}
            className="play-viewport"
            style={playViewportStyle}
            data-testid="play-viewport"
          >
            <div ref={playScaleFrameRef} className="play-scale-frame">
              <div className="play-panel">
                <div className="play-header">
                  <div>
                    <p className="eyebrow">현재 플레이</p>
                    <h1>{modeLabels[deferredGame.mode]}</h1>
                    <p className="session-meta" data-testid="session-id">
                      목표 요약: {modeDescriptions[deferredGame.mode].ending}
                    </p>
                  </div>
                  <div className="play-header-actions">
                    <button
                      type="button"
                      className={ctaButtonClass("utility")}
                      data-testid="play-menu-button"
                      onClick={openLandingMenu}
                    >
                      메뉴
                    </button>
                    <button
                      type="button"
                      className={ctaButtonClass("utility")}
                      data-testid="session-end-button"
                      onClick={() => applyAction("end")}
                    >
                      나가기
                    </button>
                  </div>
                </div>

                {tutorialOpen && (
                  <div className="tutorial-overlay" data-testid="tutorial-overlay">
                    <div className="tutorial-card">
                      <p className="eyebrow">튜토리얼</p>
                      <h2 data-testid="tutorial-title">{currentTutorialStep.title}</h2>
                      <p>{currentTutorialStep.body}</p>
                      <div className="cta-row">
                        {tutorialStepIndex < tutorialSteps.length - 1 && (
                          <button
                            type="button"
                            className={ctaButtonClass("start")}
                            data-testid="tutorial-next-button"
                            onClick={() => setTutorialStepIndex((index) => index + 1)}
                          >
                            다음
                          </button>
                        )}
                        {tutorialStepIndex === tutorialSteps.length - 1 && (
                          <button
                            type="button"
                            className={ctaButtonClass("start")}
                            data-testid="tutorial-finish-button"
                            onClick={closeTutorial}
                          >
                            시작
                          </button>
                        )}
                        <button
                          type="button"
                          className={ctaButtonClass("utility")}
                          data-testid="tutorial-skip-button"
                          onClick={closeTutorial}
                        >
                          스킵
                        </button>
                      </div>
                    </div>
                  </div>
                )}

            <div className="game-layout">
              <aside className="side-panel side-panel-primary">
                <div className="hud-card hud-card--compact">
                  <span className="hud-label">점수</span>
                  <strong data-testid="score-value">{deferredGame.score}</strong>
                </div>
                <div className="hud-card hud-card--compact">
                  <span className="hud-label">라인</span>
                  <strong data-testid="lines-value">{deferredGame.linesCleared}</strong>
                </div>
                <div className="hud-card hud-card--compact">
                  <span className="hud-label">레벨</span>
                  <strong data-testid="level-value">{deferredGame.level}</strong>
                </div>
                <div className="hud-card hud-card--compact">
                  <span className="hud-label">
                    {deferredGame.mode === "SPRINT" ? "기록" : "플레이 시간"}
                  </span>
                  <strong data-testid="duration-value">
                    {formatDurationMs(deferredGame.durationMs)}
                  </strong>
                </div>
                <div className="hud-card hud-card--compact hud-card--hold">
                  <span className="hud-label">보관</span>
                  <MiniPiece piece={deferredGame.holdPiece} testId="hold-slot" />
                  <small>{deferredGame.canHold ? "사용 가능" : "잠김"}</small>
                </div>
              </aside>

              <div className="board-stack">
                <GameBoard
                  state={deferredGame}
                  showGhostPiece={appSettings.ghostPieceEnabled}
                />
                <div className="status-strip" aria-live="polite">
                  <span className="status-chip compact" data-testid="combo-status">
                    콤보 {deferredGame.comboCount}
                  </span>
                  <span className="status-chip compact" data-testid="b2b-status">
                    백투백 {deferredGame.backToBackActive ? "ON" : "OFF"}
                  </span>
                  <span className="status-chip compact" data-testid="contrast-status">
                    고대비 {appSettings.highContrastMode ? "ON" : "OFF"}
                  </span>
                </div>
              </div>

              <aside className="side-panel side-panel-secondary">
                <div className="hud-card hud-card--queue">
                  <span className="hud-label">다음 블록</span>
                  <div className="next-queue" data-testid="next-queue">
                    {deferredGame.nextQueue.map((piece, index) => (
                      <MiniPiece key={`${piece}-${index}`} piece={piece} />
                    ))}
                  </div>
                </div>
                <div className="hud-card hud-card--goal">
                  <span className="hud-label">목표</span>
                  <p>{modeDescriptions[deferredGame.mode].summary}</p>
                  <p>{modeDescriptions[deferredGame.mode].ranking}</p>
                  {deferredGame.targetValue !== null && (
                    <p data-testid="goal-progress">
                      진행도 {deferredGame.progressValue ?? 0}/{deferredGame.targetValue}
                    </p>
                  )}
                  <p>{apiReady ? "온라인 기록 준비 완료" : "로컬 플레이로 진행 중"}</p>
                </div>
                <div className="hud-card hud-card--assist">
                  <span className="hud-label">조작 보조</span>
                  <button
                    type="button"
                    className={ctaButtonClass("utility")}
                    data-testid="playing-contrast-toggle"
                    aria-pressed={appSettings.highContrastMode}
                    onClick={() => void toggleHighContrastMode()}
                  >
                    고대비 {appSettings.highContrastMode ? "끔" : "켬"}
                  </button>
                  <small data-testid="touch-help">
                    터치 버튼과 키보드 조작을 동시에 지원합니다.
                  </small>
                </div>
              </aside>
            </div>

                <section className="control-deck" data-testid="touch-controls">
                  <div className="control-deck-header">
                    <div>
                      <p className="eyebrow">플레이 패드</p>
                      <h2>손끝 감각으로 바로 이어지는 조작 도크</h2>
                    </div>
                    <span className="status-chip compact">연속 입력 대응</span>
                  </div>
                  <div className="touch-controls" aria-label="touch controls">
                    {touchActions.map((item) => (
                      <button
                        key={item.action}
                        type="button"
                        className={`touch-button ${touchActionMood[item.action].tone}`}
                        aria-label={`${item.label} 조작`}
                        onMouseDown={() =>
                          item.action === "softDrop"
                            ? setSoftDropActive(true)
                            : applyAction(item.action)
                        }
                        onMouseUp={() =>
                          item.action === "softDrop" ? setSoftDropActive(false) : undefined
                        }
                        onMouseLeave={() =>
                          item.action === "softDrop" ? setSoftDropActive(false) : undefined
                        }
                        onTouchStart={() =>
                          item.action === "softDrop"
                            ? setSoftDropActive(true)
                            : applyAction(item.action)
                        }
                        onTouchEnd={() =>
                          item.action === "softDrop" ? setSoftDropActive(false) : undefined
                        }
                      >
                        <span className="touch-badge">{touchActionMood[item.action].badge}</span>
                        <strong>{item.label}</strong>
                        <small>{touchActionMood[item.action].hint}</small>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === "result" && deferredGame && (
        <section className="result-shell">
          <div className="hero-panel result-panel">
            <p className="eyebrow">플레이 결과</p>
            <h1>결과를 확인하고 바로 다시 도전하세요.</h1>
            <p className="lead">
              모드 {modeLabels[deferredGame.mode]} 종료. 종료 사유:{" "}
              {formatEndedReason(deferredGame)}
            </p>

            <div className="daily-banner result-hero-metric" data-testid="result-hero-primary">
              {deferredGame.mode === "SPRINT"
                ? "완주 기록"
                : deferredGame.mode === "DAILY_CHALLENGE"
                  ? "도전 진행도"
                  : "최종 점수"}
              :{" "}
              {formatPrimaryMetric(deferredGame.mode, deferredGame)}
            </div>

            <section className="result-celebration" data-testid="result-celebration">
              <div className="result-celebration-copy">
                <span className="status-chip">{resultCelebration?.badge}</span>
                <h2>{resultCelebration?.title}</h2>
                <p>{resultCelebration?.summary}</p>
              </div>
              <div className="result-celebration-burst" aria-hidden="true">
                <div className="burst-core" />
                <div className="burst-ring burst-ring-large" />
                <div className="burst-ring burst-ring-small" />
                <div className="burst-medal">{resultCelebration?.accent}</div>
              </div>
            </section>

            <div className="cta-grid result-cta-grid">
              <button
                type="button"
                className={ctaButtonClass("retry")}
                data-testid="retry-button"
                onClick={() => {
                  pushAnalyticsEvent("retry_click", {
                    mode: deferredGame.mode
                  });
                  void startGame(deferredGame.mode);
                }}
              >
                재도전
              </button>
              <button
                type="button"
                className={ctaButtonClass("rank")}
                data-testid="result-ranking-button"
                onClick={() => setScreen("ranking")}
              >
                랭킹
              </button>
              <button
                type="button"
                className={ctaButtonClass("utility")}
                data-testid="share-button"
              >
                공유
              </button>
              <button
                type="button"
                className={ctaButtonClass("utility")}
                data-testid="save-record-button"
                onClick={() => setActiveSheet("nickname")}
              >
                기록 저장
              </button>
            </div>

            <div className="result-grid result-summary-grid">
              <article className="info-card">
                <h2>{deferredGame.mode === "SPRINT" ? "완주 기록" : "최종 점수"}</h2>
                <p>
                  {deferredGame.mode === "SPRINT"
                    ? formatDurationMs(deferredGame.durationMs)
                    : deferredGame.score}
                </p>
              </article>
              <article className="info-card">
                <h2>{deferredGame.mode === "DAILY_CHALLENGE" ? "도전 진행도" : "제거 라인"}</h2>
                <p>
                  {deferredGame.mode === "DAILY_CHALLENGE" && deferredGame.targetValue !== null
                    ? `${deferredGame.progressValue ?? 0}/${deferredGame.targetValue}`
                    : deferredGame.linesCleared}
                </p>
              </article>
              <article className="info-card">
                <h2>{deferredGame.mode === "SPRINT" ? "플레이 시간" : "최대 상태"}</h2>
                <p>
                  {deferredGame.mode === "SPRINT"
                    ? formatDurationMs(deferredGame.durationMs)
                    : deferredGame.lastPerfectClear
                      ? "퍼펙트 클리어"
                      : `콤보 ${deferredGame.comboCount}`}
                </p>
              </article>
            </div>

            <div className="badge-row">
              <span className="status-chip">랭킹 반영 대기</span>
              {deferredGame.backToBackActive && <span className="status-chip">백투백</span>}
              {deferredGame.lastPerfectClear && <span className="status-chip">퍼펙트 클리어</span>}
            </div>

            <div className="status-chip" data-testid="rank-status" aria-live="polite">
              공식 기록 제출과 랭킹 연결은 현재 모드 흐름에 맞춰 이어집니다.
            </div>
          </div>
        </section>
      )}

      {activeSheet && (
        <div className="bottom-sheet-overlay" data-testid="bottom-sheet-overlay">
          <section className="bottom-sheet" data-testid={`sheet-${activeSheet}`}>
            <div className="section-header">
              <div>
                <p className="eyebrow">
                  {activeSheet === "settings"
                    ? "설정"
                    : activeSheet === "nickname"
                      ? "닉네임"
                      : "데일리 챌린지"}
                </p>
                <h2>
                  {activeSheet === "settings"
                    ? "설정"
                    : activeSheet === "nickname"
                      ? "닉네임 등록"
                      : "오늘의 데일리 챌린지"}
                </h2>
              </div>
              <button
                type="button"
                className={ctaButtonClass("utility")}
                data-testid="sheet-close-button"
                onClick={() => setActiveSheet(null)}
              >
                닫기
              </button>
            </div>

            {activeSheet === "settings" && (
              <div className="sheet-body">
                <label className="sheet-field">
                  <span>고대비 모드</span>
                  <button
                    type="button"
                    className={ctaButtonClass("utility")}
                    data-testid="sheet-contrast-toggle"
                    aria-pressed={appSettings.highContrastMode}
                    onClick={() => void toggleHighContrastMode()}
                  >
                    {appSettings.highContrastMode ? "끔" : "켬"}
                  </button>
                </label>
                <label className="sheet-field">
                  <span>고스트 피스</span>
                  <button
                    type="button"
                    className={ctaButtonClass("utility")}
                    data-testid="sheet-ghost-toggle"
                    aria-pressed={appSettings.ghostPieceEnabled}
                    onClick={() =>
                      void updateAppSettings({
                        ghostPieceEnabled: !appSettings.ghostPieceEnabled
                      })
                    }
                  >
                    {appSettings.ghostPieceEnabled ? "표시" : "숨김"}
                  </button>
                </label>
                <label className="sheet-field">
                  <span>가이드 오버레이</span>
                  <button
                    type="button"
                    className={ctaButtonClass("utility")}
                    data-testid="sheet-guide-toggle"
                    aria-pressed={appSettings.guideOverlayEnabled}
                    onClick={() =>
                      void updateAppSettings({
                        guideOverlayEnabled: !appSettings.guideOverlayEnabled
                      })
                    }
                  >
                    {appSettings.guideOverlayEnabled ? "켬" : "끔"}
                  </button>
                </label>
                <label className="sheet-field">
                  <span>사운드</span>
                  <span>{appSettings.soundEnabled ? "활성" : "비활성"}</span>
                </label>
                <label className="sheet-field">
                  <span>고스트 피스</span>
                  <span>{appSettings.ghostPieceEnabled ? "실시간 표시 중" : "표시 안 함"}</span>
                </label>
                <label className="sheet-field">
                  <span>튜토리얼 가이드</span>
                  <span>{appSettings.guideOverlayEnabled ? "첫 진입 시 노출" : "항상 숨김"}</span>
                </label>
              </div>
            )}

            {activeSheet === "nickname" && (
              <div className="sheet-body">
                <section className="sheet-hero sheet-hero-rank">
                  <span className="status-chip">OFFICIAL TAG</span>
                  <h3>공식 기록판에 남길 이름을 새기세요.</h3>
                  <p className="sheet-copy">
                    저장한 닉네임은 랭킹과 공유 흐름에서 반복 노출됩니다. 짧고 강한 이름이
                    더 잘 보입니다.
                  </p>
                </section>
                <label className="sheet-field text-field">
                  <span>닉네임</span>
                  <input
                    value={nicknameValue}
                    data-testid="nickname-input"
                    placeholder="2자 이상 12자 이하"
                    onChange={(event) => setNicknameValue(event.target.value)}
                  />
                </label>
                <p className="sheet-copy">
                  공식 기록 저장 시 사용할 닉네임입니다. 한글, 영문, 숫자, 밑줄을 권장합니다.
                </p>
                <div className="sheet-badge-row">
                  <span className="status-chip compact">랭킹 카드 노출</span>
                  <span className="status-chip compact">공유 화면 사용</span>
                </div>
                <div className="cta-row compact-row">
                  <button
                    type="button"
                    className={ctaButtonClass("rank")}
                    data-testid="nickname-save-button"
                    onClick={() => setActiveSheet(null)}
                  >
                    저장
                  </button>
                </div>
              </div>
            )}

            {activeSheet === "daily" && (
              <div className="sheet-body">
                <section className="sheet-hero sheet-hero-daily">
                  <span className="status-chip">TODAY REWARD</span>
                  <h3>{bootstrapData.dailyChallenge?.title ?? "오늘의 목표 준비 중"}</h3>
                  <p className="sheet-copy">
                    오늘 안에 미션을 달성하면 보상 카드와 스탬프 흐름이 바로 이어집니다.
                  </p>
                </section>
                <article className="daily-reward-card">
                  <strong>보상 미리보기</strong>
                  <p>
                    {bootstrapData.dailyChallenge?.reward.rewardType ?? "badge"}{" "}
                    {bootstrapData.dailyChallenge?.reward.rewardValue ?? 0}
                  </p>
                  <span>
                    진행도 {bootstrapData.dailyChallenge?.myProgress.progressValue ?? 0} /
                    {bootstrapData.dailyChallenge?.goalValue ?? 0}
                  </span>
                </article>
                <p className="sheet-copy">
                  목표: {bootstrapData.dailyChallenge?.title ?? "오늘의 목표 준비 중"}
                </p>
                <p className="sheet-copy">
                  진행도 {bootstrapData.dailyChallenge?.myProgress.progressValue ?? 0} /
                  {bootstrapData.dailyChallenge?.goalValue ?? 0}
                </p>
                <p className="sheet-copy">
                  보상: {bootstrapData.dailyChallenge?.reward.rewardType ?? "badge"}{" "}
                  {bootstrapData.dailyChallenge?.reward.rewardValue ?? 0}
                </p>
                <div className="sheet-badge-row">
                  <span className="status-chip compact">오늘 안에 완료</span>
                  <span className="status-chip compact">스탬프 보상 연결</span>
                </div>
                <div className="cta-row compact-row">
                  <button
                    type="button"
                    className={ctaButtonClass("daily")}
                    data-testid="daily-sheet-start-button"
                    onClick={() => {
                      setActiveSheet(null);
                      setModeIndex(modeOrder.indexOf("DAILY_CHALLENGE"));
                      void startGame("DAILY_CHALLENGE");
                    }}
                  >
                    도전 시작
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
