import type {
  Announcement,
  DailyChallenge,
  FeatureFlags,
  UserSettings
} from "@tetris/shared-types";

export const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  vibrationEnabled: false,
  effectLevel: "normal",
  ghostPieceEnabled: true,
  highContrastMode: false,
  themeId: "default"
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  rankedEnabled: true,
  missionsEnabled: true,
  shareEnabled: true
};

export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann_20260311_01",
    title: "MVP 개발 환경 초기화",
    body: "공개 웹, 운영 화면, API 기본 구조가 생성되었습니다.",
    publishedAt: "2026-03-11T00:00:00Z"
  }
];

export function createDailyChallenge(now: Date): DailyChallenge {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffsetMs);
  const startUtc = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate(),
    -9,
    0,
    0,
    0
  );
  const endUtc = startUtc + 24 * 60 * 60 * 1000;

  return {
    challengeId: "dc_kst_today",
    title: "오늘의 12라인 챌린지",
    ruleType: "line_target",
    goalValue: 12,
    reward: {
      rewardType: "badge",
      rewardValue: "daily_line_12"
    },
    validFrom: new Date(startUtc).toISOString(),
    validTo: new Date(endUtc).toISOString(),
    myProgress: {
      progressValue: 0,
      completed: false,
      completedAt: null
    },
    claimed: false
  };
}
