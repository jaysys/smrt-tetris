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
import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";

const launchCards = [
  {
    title: "Guest Bootstrap",
    body: "랜딩 진입 시 게스트 토큰과 Daily Challenge 요약을 먼저 로드합니다."
  },
  {
    title: "Game Surface",
    body: "HUD, hold, next queue, ghost piece를 같은 화면에서 바로 검증할 수 있습니다."
  },
  {
    title: "Result Loop",
    body: "게임 종료 후 재도전과 후속 CTA를 한 화면에서 이어서 검증할 수 있습니다."
  }
];

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

const guestTokenStorageKey = "tetris.guestToken";
const tutorialSeenStorageKey = "tetris.tutorialSeen";

function resolveApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/v1";
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

function GameBoard({ state }: { state: GameSnapshot }) {
  const rows = createRenderMatrix(state);

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
  const [screen, setScreen] = useState<"landing" | "playing" | "result">(
    "landing"
  );
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
  const engineRef = useRef<TetrisGame | null>(null);
  const hasTrackedLandingView = useRef(false);
  const hasTrackedGameFinish = useRef(false);
  const deferredGame = useDeferredValue(game);
  const selectedMode = modeOrder[modeIndex];

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
    setModeIndex(modeOrder.indexOf(bootstrap.defaultMode));
    setStatusNotice(
      bootstrap.guestToken === defaultBootstrap.guestToken
        ? "API 미기동 상태라 로컬 fallback으로 플레이합니다."
        : "게스트 bootstrap과 Daily Challenge를 API에서 불러왔습니다."
    );

    if (!hasTrackedLandingView.current) {
      hasTrackedLandingView.current = true;
      pushAnalyticsEvent("landing_view", {
        mode: bootstrap.defaultMode,
        api_connected: bootstrap.guestToken !== defaultBootstrap.guestToken
      });
    }
  }

  useEffect(() => {
    void bootstrapLanding();
  }, []);

  async function startGame(mode: GameMode) {
    const session = await createSession(mode);

    engineRef.current = new TetrisGame({ mode });
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
      typeof window !== "undefined" &&
      window.localStorage.getItem(tutorialSeenStorageKey) !== "true"
    ) {
      setTutorialStepIndex(0);
      setTutorialOpen(true);
    }
  }

  function closeTutorial() {
    setTutorialOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(tutorialSeenStorageKey, "true");
    }
  }

  async function toggleHighContrastMode() {
    const nextSettings = {
      ...appSettings,
      highContrastMode: !appSettings.highContrastMode
    };
    const savedSettings = await updateSettings(nextSettings, readGuestToken());

    setAppSettings(savedSettings);
    setBootstrapData((current) => ({
      ...current,
      settings: savedSettings
    }));
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
      applyAction("softDrop");
    }, delay);

    return () => window.clearInterval(intervalId);
  }, [deferredGame?.level, deferredGame?.status, screen, softDropActive, tutorialOpen]);

  const currentTutorialStep = tutorialSteps[tutorialStepIndex];

  return (
    <main
      className={`page-shell${appSettings.highContrastMode ? " theme-high-contrast" : ""}`}
      data-testid="page-shell"
      data-contrast-mode={appSettings.highContrastMode ? "high" : "default"}
    >
      {screen === "landing" && (
        <>
          <section className="hero-panel">
            <p className="eyebrow">D1 Core Play Loop</p>
            <div className="daily-banner" data-testid="daily-banner">
              Daily Challenge preview: {bootstrapData.dailyChallenge?.title ?? "준비 중"}
            </div>
            <h1>게스트 즉시 플레이와 결과 재도전 루프를 연결했습니다.</h1>
            <p className="lead">
              현재 모드는 <strong>{modeLabels[selectedMode]}</strong> 입니다.{" "}
              {announcementSummary}
            </p>
            <div className="cta-row">
              <button
                type="button"
                className="cta-button primary"
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
                className="cta-button"
                data-testid="mode-button"
                onClick={() =>
                  setModeIndex((currentIndex) => (currentIndex + 1) % modeOrder.length)
                }
              >
                모드 선택
              </button>
              <button
                type="button"
                className="cta-button"
                data-testid="ranking-button"
              >
                랭킹 보기
              </button>
            </div>
            <p className="mode-caption">현재 선택: {modeLabels[selectedMode]}</p>
            <p className="api-chip" data-testid="bootstrap-status">
              {statusNotice}
            </p>
            <p className="api-chip" data-testid="analytics-last-event" aria-live="polite">
              Latest analytics event: {lastTrackedEvent}
            </p>
            <div className="settings-row" data-testid="settings-row">
              <button
                type="button"
                className="cta-button"
                data-testid="contrast-toggle"
                aria-pressed={appSettings.highContrastMode}
                onClick={() => void toggleHighContrastMode()}
              >
                고대비 {appSettings.highContrastMode ? "끔" : "켬"}
              </button>
            </div>
          </section>

          <section className="card-grid" aria-label="development baseline">
            {launchCards.map((card) => (
              <article key={card.title} className="info-card">
                <h2>{card.title}</h2>
                <p>{card.body}</p>
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

      {screen === "playing" && deferredGame && (
        <section className="game-shell">
          <div className="play-panel">
            <div className="play-header">
              <div>
                <p className="eyebrow">Now Playing</p>
                <h1>{modeLabels[deferredGame.mode]}</h1>
                <p className="session-meta" data-testid="session-id">
                  Session: {sessionData?.sessionId ?? "로컬 세션"}
                </p>
              </div>
              <button
                type="button"
                className="cta-button"
                data-testid="session-end-button"
                onClick={() => applyAction("end")}
              >
                세션 종료
              </button>
            </div>

            {tutorialOpen && (
              <div className="tutorial-overlay" data-testid="tutorial-overlay">
                <div className="tutorial-card">
                  <p className="eyebrow">Tutorial</p>
                  <h2 data-testid="tutorial-title">{currentTutorialStep.title}</h2>
                  <p>{currentTutorialStep.body}</p>
                  <div className="cta-row">
                    {tutorialStepIndex < tutorialSteps.length - 1 && (
                      <button
                        type="button"
                        className="cta-button primary"
                        data-testid="tutorial-next-button"
                        onClick={() => setTutorialStepIndex((index) => index + 1)}
                      >
                        다음
                      </button>
                    )}
                    {tutorialStepIndex === tutorialSteps.length - 1 && (
                      <button
                        type="button"
                        className="cta-button primary"
                        data-testid="tutorial-finish-button"
                        onClick={closeTutorial}
                      >
                        시작
                      </button>
                    )}
                    <button
                      type="button"
                      className="cta-button"
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
                <div className="hud-card">
                  <span className="hud-label">Score</span>
                  <strong data-testid="score-value">{deferredGame.score}</strong>
                </div>
                <div className="hud-card">
                  <span className="hud-label">Lines</span>
                  <strong data-testid="lines-value">{deferredGame.linesCleared}</strong>
                </div>
                <div className="hud-card">
                  <span className="hud-label">Level</span>
                  <strong data-testid="level-value">{deferredGame.level}</strong>
                </div>
                <div className="hud-card">
                  <span className="hud-label">Hold</span>
                  <MiniPiece piece={deferredGame.holdPiece} testId="hold-slot" />
                  <small>{deferredGame.canHold ? "사용 가능" : "잠김"}</small>
                </div>
              </aside>

              <div className="board-stack">
                <GameBoard state={deferredGame} />
                <div className="status-strip" aria-live="polite">
                  <span className="status-chip compact" data-testid="combo-status">
                    Combo {deferredGame.comboCount}
                  </span>
                  <span className="status-chip compact" data-testid="b2b-status">
                    B2B {deferredGame.backToBackActive ? "ON" : "OFF"}
                  </span>
                  <span className="status-chip compact" data-testid="contrast-status">
                    Contrast {appSettings.highContrastMode ? "HIGH" : "DEFAULT"}
                  </span>
                </div>
              </div>

              <aside className="side-panel side-panel-secondary">
                <div className="hud-card">
                  <span className="hud-label">Next Queue</span>
                  <div className="next-queue" data-testid="next-queue">
                    {deferredGame.nextQueue.map((piece, index) => (
                      <MiniPiece key={`${piece}-${index}`} piece={piece} />
                    ))}
                  </div>
                </div>
                <div className="hud-card">
                  <span className="hud-label">Run Info</span>
                  <p>Config Version: {sessionData?.configVersion ?? 1}</p>
                  <p>Seed: {sessionData?.seed ?? "fallback-seed"}</p>
                  <p>API: {apiReady ? "connected" : "fallback"}</p>
                </div>
                <div className="hud-card">
                  <span className="hud-label">Accessibility</span>
                  <button
                    type="button"
                    className="cta-button"
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

            <div className="touch-controls" data-testid="touch-controls" aria-label="touch controls">
              {touchActions.map((item) => (
                <button
                  key={item.action}
                  type="button"
                  className="touch-button"
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
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {screen === "result" && deferredGame && (
        <section className="result-shell">
          <div className="hero-panel result-panel">
            <p className="eyebrow">Run Result</p>
            <h1>한 판이 종료되었습니다.</h1>
            <p className="lead">
              종료 사유:{" "}
              {deferredGame.endedReason === "TOP_OUT"
                ? "TOP OUT"
                : "PLAYER EXIT"}
            </p>

            <div className="result-grid">
              <article className="info-card">
                <h2>Final Score</h2>
                <p>{deferredGame.score}</p>
              </article>
              <article className="info-card">
                <h2>Lines Cleared</h2>
                <p>{deferredGame.linesCleared}</p>
              </article>
              <article className="info-card">
                <h2>Pieces Locked</h2>
                <p>{deferredGame.piecesLocked}</p>
              </article>
            </div>

            <div className="cta-row">
              <button
                type="button"
                className="cta-button primary"
                data-testid="retry-button"
                onClick={() => {
                  pushAnalyticsEvent("retry_click", {
                    mode: deferredGame.mode
                  });
                  void startGame(deferredGame.mode);
                }}
              >
                다시 시작
              </button>
              <button type="button" className="cta-button" data-testid="result-ranking-button">
                랭킹
              </button>
              <button type="button" className="cta-button" data-testid="share-button">
                공유
              </button>
              <button
                type="button"
                className="cta-button"
                data-testid="save-record-button"
              >
                기록 저장
              </button>
            </div>

            <div className="status-chip" data-testid="rank-status" aria-live="polite">
              공식 기록 제출과 랭킹 연결은 D3에서 이어집니다.
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
