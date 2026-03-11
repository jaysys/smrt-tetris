import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const databasePath = resolve(
  process.cwd(),
  process.env.SQLITE_DB_PATH ?? "./data/app.db"
);

if (!existsSync(databasePath)) {
  throw new Error(
    `[db:seed] Database not found at ${databasePath}. Run pnpm db:migrate first.`
  );
}

const db = new DatabaseSync(databasePath);
const now = new Date().toISOString();
const periodDay = new Date().toISOString().slice(0, 10);
const weekKey = "2026-W11";

function json(value) {
  return JSON.stringify(value);
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function insert(sql, ...params) {
  db.prepare(sql).run(...params);
}

function insertPlayer({
  id,
  type,
  token,
  status = "active",
  nickname = null
}) {
  insert(
    `INSERT OR REPLACE INTO players (id, player_type, guest_token_hash, status, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    type,
    token ? hash(token) : null,
    status,
    now,
    now
  );

  insert(
    `INSERT OR REPLACE INTO player_profiles
     (player_id, nickname, nickname_normalized, sound_enabled, vibration_enabled, effect_level, ghost_piece_enabled, high_contrast_mode, theme_id, created_at, updated_at)
     VALUES (?, ?, ?, 1, 1, 'normal', 1, 0, 'default', ?, ?)`,
    id,
    nickname,
    nickname ? nickname.toLowerCase() : null,
    now,
    now
  );
}

function insertSessionWithResult({
  playerId,
  playerNickname,
  modeCode,
  score,
  linesCleared,
  durationMs,
  resultMetric,
  rankingValueNum
}) {
  const sessionId = randomUUID();
  const resultId = randomUUID();
  const createdAt = now;

  insertPlayer({
    id: playerId,
    type: "guest",
    token: `${playerId}-token`,
    nickname: playerNickname
  });

  insert(
    `INSERT OR REPLACE INTO game_sessions
     (id, player_id, mode_code, seed, config_version_id, device_type, client_version, status, started_at, ended_at)
     VALUES (?, ?, ?, ?, 1, 'desktop', '0.1.0', 'completed', ?, ?)`,
    sessionId,
    playerId,
    modeCode,
    `${playerId}-${modeCode}-seed`,
    createdAt,
    createdAt
  );

  insert(
    `INSERT OR REPLACE INTO game_results
     (id, session_id, player_id, mode_code, score, lines_cleared, level, duration_ms, result_metric_json, input_summary_json, checkpoint_hashes_json, idempotency_key, payload_hash, validation_status, validation_reason_json, ended_reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'accepted', NULL, 'GOAL_COMPLETE', ?)`,
    resultId,
    sessionId,
    playerId,
    modeCode,
    score,
    linesCleared,
    durationMs,
    json(resultMetric),
    json({ moveLeft: 10, moveRight: 10, rotate: 8, hardDrop: 20, hold: 1 }),
    json(["cp-01", "cp-02", "cp-03"]),
    `idem-${resultId}`,
    hash(`${resultId}:${score}:${durationMs}`),
    createdAt
  );

  insert(
    `INSERT OR REPLACE INTO leaderboard_entries
     (id, result_id, player_id, mode_code, period_type, period_key, ranking_value_num, sort_direction, rank_cached, created_at)
     VALUES (?, ?, ?, ?, 'daily', ?, ?, ?, NULL, ?)`,
    randomUUID(),
    resultId,
    playerId,
    modeCode,
    periodDay,
    rankingValueNum,
    modeCode === "SPRINT" ? "ASC" : "DESC",
    createdAt
  );

  insert(
    `INSERT OR REPLACE INTO leaderboard_entries
     (id, result_id, player_id, mode_code, period_type, period_key, ranking_value_num, sort_direction, rank_cached, created_at)
     VALUES (?, ?, ?, ?, 'weekly', ?, ?, ?, NULL, ?)`,
    randomUUID(),
    resultId,
    playerId,
    modeCode,
    weekKey,
    rankingValueNum,
    modeCode === "SPRINT" ? "ASC" : "DESC",
    createdAt
  );

  insert(
    `INSERT OR REPLACE INTO leaderboard_entries
     (id, result_id, player_id, mode_code, period_type, period_key, ranking_value_num, sort_direction, rank_cached, created_at)
     VALUES (?, ?, ?, ?, 'all_time', 'ALL', ?, ?, NULL, ?)`,
    randomUUID(),
    resultId,
    playerId,
    modeCode,
    rankingValueNum,
    modeCode === "SPRINT" ? "ASC" : "DESC",
    createdAt
  );

  insert(
    `INSERT OR REPLACE INTO personal_bests
     (player_id, mode_code, best_result_id, best_score, best_time_ms, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    playerId,
    modeCode,
    resultId,
    modeCode === "SPRINT" ? null : score,
    modeCode === "SPRINT" ? durationMs : null,
    createdAt
  );
}

function getTodayChallengeWindow() {
  const nowDate = new Date();
  const kstMs = nowDate.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const startUtc = Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate(),
    -9,
    0,
    0,
    0
  );

  return {
    startAt: new Date(startUtc).toISOString(),
    endAt: new Date(startUtc + 24 * 60 * 60 * 1000).toISOString()
  };
}

db.exec("BEGIN;");

try {
  insertPlayer({
    id: "player-admin-test",
    type: "admin",
    token: "admin_test",
    nickname: "admin_test"
  });
  insertPlayer({
    id: "player-guest-a",
    type: "guest",
    token: "guest-a-token"
  });
  insertPlayer({
    id: "player-guest-b",
    type: "guest",
    token: "guest-b-token"
  });

  insert(
    `INSERT OR REPLACE INTO game_modes (mode_code, name, ranking_metric, is_active)
     VALUES
     ('MARATHON', 'Marathon', 'score', 1),
     ('SPRINT', 'Sprint', 'time', 1),
     ('DAILY_CHALLENGE', 'Daily Challenge', 'score', 1)`
  );

  insert(
    `INSERT OR REPLACE INTO config_versions (id, config_type, payload_json, effective_from, effective_to, created_by, created_at)
     VALUES
     (1, 'game_rule', ?, ?, NULL, 'player-admin-test', ?),
     (2, 'daily', ?, ?, NULL, 'player-admin-test', ?),
     (3, 'reward', ?, ?, NULL, 'player-admin-test', ?)`,
    json({ nextQueueSize: 5, holdEnabled: true, ghostEnabledDefault: true }),
    now,
    now,
    json({ currentChallenge: "3분 내 20라인 제거" }),
    now,
    now,
    json({ dailyReward: { rewardType: "badge", rewardValue: 1 } }),
    now,
    now
  );

  const challengeWindow = getTodayChallengeWindow();

  insert(
    `INSERT OR REPLACE INTO daily_challenges
     (id, title, rule_type, goal_value, reward_type, reward_value, config_version_id, start_at, end_at, status)
     VALUES (?, ?, ?, ?, ?, ?, 2, ?, ?, 'active')`,
    "daily-challenge-today",
    "3분 내 20라인 제거",
    "line_target",
    20,
    "badge",
    1,
    challengeWindow.startAt,
    challengeWindow.endAt
  );

  insert(
    `INSERT OR REPLACE INTO daily_challenge_progress
     (challenge_id, player_id, progress_value, completed_at, claimed_at, updated_at)
     VALUES
     ('daily-challenge-today', 'player-guest-a', 10, NULL, NULL, ?),
     ('daily-challenge-today', 'player-guest-b', 20, ?, NULL, ?)`,
    now,
    now,
    now
  );

  insert(
    `INSERT OR REPLACE INTO missions
     (id, mission_type, title, goal_value, reward_type, reward_value, is_repeatable)
     VALUES
     ('mission-play-3', 'play_count', '오늘 3판 플레이', 3, 'xp_boost', 10, 1),
     ('mission-ranking-view', 'ranking_view', '랭킹 1회 조회', 1, 'theme_unlock', 1, 1),
     ('mission-pb-1', 'personal_best', '개인 최고 기록 1회 갱신', 1, 'badge', 1, 1)`
  );

  insert(
    `INSERT OR REPLACE INTO achievements
     (id, code, title, condition_json, reward_json)
     VALUES
     ('ach-001', 'FIRST_PLAY', '첫 플레이 완료', ?, ?),
     ('ach-002', 'SPRINT_CLEAR', 'Sprint 첫 완주', ?, ?),
     ('ach-003', 'MARATHON_10K', 'Marathon 10000점', ?, ?),
     ('ach-004', 'DAILY_CLEAR', 'Daily 첫 완료', ?, ?),
     ('ach-005', 'RANKING_VIEW', '랭킹 첫 조회', ?, ?)`,
    json({ type: "play_count", goal: 1 }),
    json({ rewardType: "badge", rewardValue: "first_play" }),
    json({ type: "mode_clear", mode: "SPRINT" }),
    json({ rewardType: "badge", rewardValue: "sprint_clear" }),
    json({ type: "score", mode: "MARATHON", goal: 10000 }),
    json({ rewardType: "badge", rewardValue: "marathon_10k" }),
    json({ type: "daily_complete", goal: 1 }),
    json({ rewardType: "badge", rewardValue: "daily_clear" }),
    json({ type: "ranking_view", goal: 1 }),
    json({ rewardType: "badge", rewardValue: "ranking_view" })
  );

  insert(
    `INSERT OR REPLACE INTO announcements
     (id, title, body, priority, start_at, end_at, status)
     VALUES
     ('ann-mvp-001', 'MVP 테스트 안내', '공개 웹, API, 자동화 기본 구조가 준비되었습니다.', 10, ?, NULL, 'published')`,
    now
  );

  const blockedWords = [
    ["badword01", "abuse"],
    ["badword02", "abuse"],
    ["badword03", "abuse"],
    ["badword04", "abuse"],
    ["badword05", "abuse"],
    ["spamlink", "advertising"],
    ["cheapgold", "advertising"],
    ["clickhere", "advertising"],
    ["fastcash", "advertising"],
    ["admin", "impersonation"],
    ["administrator", "impersonation"],
    ["mod", "impersonation"],
    ["official", "impersonation"],
    ["supportteam", "impersonation"],
    ["gm", "impersonation"],
    ["xxxsale", "advertising"],
    ["joinnow", "advertising"],
    ["hacktool", "abuse"],
    ["curseone", "abuse"],
    ["cursetwo", "abuse"]
  ];

  for (const [word, category] of blockedWords) {
    insert(
      `INSERT OR IGNORE INTO blocked_words (word, category, created_at) VALUES (?, ?, ?)`,
      word,
      category,
      now
    );
  }

  insertSessionWithResult({
    playerId: "player-marathon-01",
    playerNickname: "blocker",
    modeCode: "MARATHON",
    score: 41000,
    linesCleared: 48,
    durationMs: 620000,
    resultMetric: { score: 41000 },
    rankingValueNum: 41000
  });
  insertSessionWithResult({
    playerId: "player-marathon-02",
    playerNickname: "stacker",
    modeCode: "MARATHON",
    score: 32000,
    linesCleared: 36,
    durationMs: 580000,
    resultMetric: { score: 32000 },
    rankingValueNum: 32000
  });
  insertSessionWithResult({
    playerId: "player-marathon-03",
    playerNickname: "dropzone",
    modeCode: "MARATHON",
    score: 18000,
    linesCleared: 20,
    durationMs: 540000,
    resultMetric: { score: 18000 },
    rankingValueNum: 18000
  });

  insertSessionWithResult({
    playerId: "player-sprint-01",
    playerNickname: "lineclearer",
    modeCode: "SPRINT",
    score: 18400,
    linesCleared: 40,
    durationMs: 178250,
    resultMetric: { timeMs: 178250 },
    rankingValueNum: 178250
  });
  insertSessionWithResult({
    playerId: "player-sprint-02",
    playerNickname: "tspin",
    modeCode: "SPRINT",
    score: 16000,
    linesCleared: 40,
    durationMs: 201300,
    resultMetric: { timeMs: 201300 },
    rankingValueNum: 201300
  });
  insertSessionWithResult({
    playerId: "player-sprint-03",
    playerNickname: "holdmaster",
    modeCode: "SPRINT",
    score: 12000,
    linesCleared: 40,
    durationMs: 265100,
    resultMetric: { timeMs: 265100 },
    rankingValueNum: 265100
  });

  insertSessionWithResult({
    playerId: "player-daily-01",
    playerNickname: "challengeking",
    modeCode: "DAILY_CHALLENGE",
    score: 25000,
    linesCleared: 20,
    durationMs: 160000,
    resultMetric: { score: 25000 },
    rankingValueNum: 25000
  });
  insertSessionWithResult({
    playerId: "player-daily-02",
    playerNickname: "dailyace",
    modeCode: "DAILY_CHALLENGE",
    score: 19000,
    linesCleared: 20,
    durationMs: 175000,
    resultMetric: { score: 19000 },
    rankingValueNum: 19000
  });
  insertSessionWithResult({
    playerId: "player-daily-03",
    playerNickname: "runnerup",
    modeCode: "DAILY_CHALLENGE",
    score: 12000,
    linesCleared: 20,
    durationMs: 210000,
    resultMetric: { score: 12000 },
    rankingValueNum: 12000
  });

  db.exec("COMMIT;");
} catch (error) {
  db.exec("ROLLBACK;");
  throw error;
}

db.close();
console.log(`[db:seed] Seed completed for ${databasePath}`);
