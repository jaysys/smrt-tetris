export type AppMode = "MARATHON" | "SPRINT" | "DAILY_CHALLENGE";
export type DeviceType = "mobile" | "desktop" | "tablet";
export type EffectLevel = "low" | "normal" | "high";

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: ApiError | null;
  meta: Record<string, string | number | boolean | null>;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}

export interface UserSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  effectLevel: EffectLevel;
  ghostPieceEnabled: boolean;
  highContrastMode: boolean;
  themeId: string;
}

export interface FeatureFlags {
  rankedEnabled: boolean;
  missionsEnabled: boolean;
  shareEnabled: boolean;
}

export interface ChallengeReward {
  rewardType: "badge" | "xp_boost" | "theme_unlock";
  rewardValue: string | number;
}

export interface DailyChallengeProgress {
  progressValue: number;
  completed: boolean;
  completedAt: string | null;
}

export interface DailyChallenge {
  challengeId: string;
  title: string;
  ruleType: "score_target" | "line_target" | "no_hold" | "time_attack";
  goalValue: number;
  reward: ChallengeReward;
  validFrom: string;
  validTo: string;
  myProgress: DailyChallengeProgress;
  claimed: boolean;
}

export interface BootstrapData {
  guestToken: string;
  defaultMode: AppMode;
  dailyChallenge: DailyChallenge | null;
  announcements: Announcement[];
  settings: UserSettings;
  featureFlags: FeatureFlags;
}

export interface HealthData {
  status: "ok";
  service: "api";
  timestamp: string;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface CreateGameSessionRequest {
  mode: AppMode;
  deviceType: DeviceType;
  clientVersion: string;
  viewport: Viewport;
}

export interface SessionRules {
  holdEnabled: boolean;
  ghostEnabledDefault: boolean;
  nextQueueSize: number;
}

export interface CreateGameSessionData {
  sessionId: string;
  mode: AppMode;
  seed: string;
  issuedAt: string;
  configVersion: number;
  timeLimitSec: number | null;
  rules: SessionRules;
}
