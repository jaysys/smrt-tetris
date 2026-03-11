CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  player_type TEXT NOT NULL,
  guest_token_hash TEXT UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_players_type_status
  ON players(player_type, status);

CREATE TABLE IF NOT EXISTS player_profiles (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  nickname TEXT,
  nickname_normalized TEXT,
  sound_enabled INTEGER NOT NULL DEFAULT 1,
  vibration_enabled INTEGER NOT NULL DEFAULT 1,
  effect_level TEXT NOT NULL DEFAULT 'normal',
  ghost_piece_enabled INTEGER NOT NULL DEFAULT 1,
  high_contrast_mode INTEGER NOT NULL DEFAULT 0,
  theme_id TEXT NOT NULL DEFAULT 'default',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_player_profiles_nickname_normalized
  ON player_profiles(nickname_normalized);

CREATE TABLE IF NOT EXISTS nickname_history (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  old_nickname TEXT,
  new_nickname TEXT NOT NULL,
  changed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_modes (
  mode_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ranking_metric TEXT NOT NULL,
  is_active INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS config_versions (
  id INTEGER PRIMARY KEY,
  config_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_by TEXT REFERENCES players(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  mode_code TEXT NOT NULL REFERENCES game_modes(mode_code),
  seed TEXT NOT NULL,
  config_version_id INTEGER REFERENCES config_versions(id),
  device_type TEXT NOT NULL,
  client_version TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_player_mode
  ON game_sessions(player_id, mode_code);
CREATE INDEX IF NOT EXISTS idx_game_sessions_started
  ON game_sessions(started_at DESC);

CREATE TABLE IF NOT EXISTS game_results (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES game_sessions(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  mode_code TEXT NOT NULL REFERENCES game_modes(mode_code),
  score INTEGER NOT NULL DEFAULT 0,
  lines_cleared INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  duration_ms INTEGER NOT NULL,
  result_metric_json TEXT NOT NULL,
  input_summary_json TEXT NOT NULL,
  checkpoint_hashes_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  validation_status TEXT NOT NULL,
  validation_reason_json TEXT,
  ended_reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_results_player_mode
  ON game_results(player_id, mode_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_results_validation_mode
  ON game_results(validation_status, mode_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_game_results_session_idem
  ON game_results(session_id, idempotency_key);

CREATE TABLE IF NOT EXISTS personal_bests (
  player_id TEXT NOT NULL REFERENCES players(id),
  mode_code TEXT NOT NULL REFERENCES game_modes(mode_code),
  best_result_id TEXT REFERENCES game_results(id),
  best_score INTEGER,
  best_time_ms INTEGER,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (player_id, mode_code)
);

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL UNIQUE REFERENCES game_results(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  mode_code TEXT NOT NULL REFERENCES game_modes(mode_code),
  period_type TEXT NOT NULL,
  period_key TEXT NOT NULL,
  ranking_value_num INTEGER NOT NULL,
  sort_direction TEXT NOT NULL,
  rank_cached INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_lookup
  ON leaderboard_entries(mode_code, period_type, period_key, ranking_value_num);

CREATE TABLE IF NOT EXISTS daily_challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  goal_value INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value INTEGER NOT NULL,
  config_version_id INTEGER REFERENCES config_versions(id),
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_challenge_progress (
  challenge_id TEXT NOT NULL REFERENCES daily_challenges(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  progress_value INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  claimed_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (challenge_id, player_id)
);

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  mission_type TEXT NOT NULL,
  title TEXT NOT NULL,
  goal_value INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value INTEGER NOT NULL,
  is_repeatable INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mission_progress (
  mission_id TEXT NOT NULL REFERENCES missions(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  progress_value INTEGER NOT NULL,
  completed_at TEXT,
  claimed_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (mission_id, player_id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  title TEXT NOT NULL,
  condition_json TEXT NOT NULL,
  reward_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS achievement_progress (
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  progress_value INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  claimed_at TEXT,
  PRIMARY KEY (achievement_id, player_id)
);

CREATE TABLE IF NOT EXISTS fraud_flags (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  result_id TEXT REFERENCES game_results(id),
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  reason_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  flag_id TEXT REFERENCES fraud_flags(id),
  action_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_by TEXT REFERENCES players(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  start_at TEXT NOT NULL,
  end_at TEXT,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT REFERENCES players(id),
  session_id TEXT REFERENCES game_sessions(id),
  event_name TEXT NOT NULL,
  properties_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blocked_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  created_at TEXT NOT NULL
);
