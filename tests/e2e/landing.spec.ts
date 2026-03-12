import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

test("P0-LANDING-001 landing baseline exposes stable CTA selectors", async ({
  page
}, testInfo) => {
  const consoleLines: string[] = [];

  page.on("console", (message) => {
    consoleLines.push(`[${message.type()}] ${message.text()}`);
  });

  await page.goto("/");

  await expect(page.getByTestId("daily-banner")).toContainText("오늘의 챌린지");
  await expect(page.getByTestId("start-button")).toHaveText("바로 시작");
  await expect(page.getByTestId("mode-button")).toHaveText("모드 선택");
  await expect(page.getByTestId("ranking-button")).toHaveText("랭킹 보기");
  await expect(page.getByTestId("analytics-last-event")).toContainText("landing_view");

  const consoleLogPath = testInfo.outputPath("console.log");
  mkdirSync(dirname(consoleLogPath), { recursive: true });
  writeFileSync(
    consoleLogPath,
    consoleLines.length > 0 ? consoleLines.join("\n") : "[info] no console output",
    "utf8"
  );
});

test("P0-ADMIN-001 embedded admin preview exposes stable selectors", async ({
  page
}) => {
  await page.goto("/admin");

  await expect(page.getByTestId("create-daily-button")).toHaveText("Daily 생성");
  await expect(page.getByTestId("announcement-create-button")).toHaveText("공지 생성");
  await expect(page.getByTestId("fraud-queue-table")).toContainText(
    "운영 자동화 선택자"
  );
});

test("P2-NAV-001 mode select and ranking shells stay reachable", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("settings-sheet-open").click();
  await expect(page.getByTestId("sheet-settings")).toBeVisible();
  await expect(page.getByTestId("sheet-ghost-toggle")).toBeVisible();
  await expect(page.getByTestId("sheet-guide-toggle")).toBeVisible();
  await page.getByTestId("sheet-close-button").click();

  await page.getByTestId("daily-detail-open").click();
  await expect(page.getByTestId("sheet-daily")).toBeVisible();
  await page.getByTestId("sheet-close-button").click();

  await page.getByTestId("mode-button").click();
  await expect(page.getByTestId("mode-screen")).toBeVisible();
  await expect(page.getByTestId("mode-card-MARATHON")).toContainText("Marathon");
  await expect(page.getByTestId("mode-card-SPRINT")).toContainText("Sprint");

  await page.getByTestId("mode-back-button").click();
  await expect(page.getByTestId("start-button")).toBeVisible();

  await page.getByTestId("ranking-button").click();
  await expect(page.getByTestId("ranking-screen")).toBeVisible();
  await expect(page.getByTestId("ranking-podium")).toBeVisible();
  await expect(page.getByTestId("ranking-tab-MARATHON")).toBeVisible();
  await expect(page.getByTestId("ranking-segment-daily")).toBeVisible();
  await expect(page.getByTestId("ranking-row-current")).toContainText("내 기록");
});

test("P1-MOBILE-001 landing and result keep critical CTAs above the fold at 360x800", async ({
  page
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");

  const landingButtons = [
    page.getByTestId("start-button"),
    page.getByTestId("mode-button"),
    page.getByTestId("ranking-button")
  ];

  for (const button of landingButtons) {
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(800);
  }

  await page.getByTestId("start-button").click();

  await expect
    .poll(async () => {
      if ((await page.getByTestId("tutorial-overlay").count()) > 0) {
        return "tutorial";
      }

      if ((await page.getByTestId("session-end-button").count()) > 0) {
        return "game";
      }

      return "none";
    })
    .not.toBe("none");

  if ((await page.getByTestId("tutorial-overlay").count()) > 0) {
    await page.getByTestId("tutorial-skip-button").click();
  }

  await page.getByTestId("session-end-button").click();

  const resultButtons = [
    page.getByTestId("retry-button"),
    page.getByTestId("result-ranking-button"),
    page.getByTestId("share-button"),
    page.getByTestId("save-record-button")
  ];

  const positions: number[] = [];

  for (const button of resultButtons) {
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(800);
    positions.push(Math.round(box!.y / 10) * 10);
  }

  expect(new Set(positions).size).toBe(2);
});

test("P1-PLAY-001 game HUD, board, and touch dock stay within one mobile viewport", async ({
  page
}) => {
  const viewports = [
    { width: 360, height: 800 },
    { width: 360, height: 720 },
    { width: 360, height: 680 },
    { width: 540, height: 680 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByTestId("start-button").click();

    await expect
      .poll(async () => {
        if ((await page.getByTestId("tutorial-overlay").count()) > 0) {
          return "tutorial";
        }

        if ((await page.getByTestId("touch-controls").count()) > 0) {
          return "game";
        }

        return "none";
      })
      .not.toBe("none");

    if ((await page.getByTestId("tutorial-overlay").count()) > 0) {
      await page.getByTestId("tutorial-skip-button").click();
    }

    const required = [
      page.getByTestId("score-value"),
      page.getByTestId("game-canvas"),
      page.getByTestId("touch-controls"),
      page.getByTestId("play-viewport")
    ];

    for (const locator of required) {
      await expect(locator).toBeVisible();
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
  }
});

test("P1-GAME-001 start, finish, and retry loops stay interactive", async ({
  page
}) => {
  await page.goto("/");

  await page.getByTestId("start-button").click();

  const tutorialOverlay = page.getByTestId("tutorial-overlay");
  const gameCanvas = page.getByTestId("game-canvas");

  await expect
    .poll(async () => {
      if ((await tutorialOverlay.count()) > 0) {
        return "tutorial";
      }

      if ((await gameCanvas.count()) > 0) {
        return "game";
      }

      return "none";
    })
    .not.toBe("none");

  if ((await tutorialOverlay.count()) > 0) {
    await expect(tutorialOverlay).toBeVisible();
    await page.getByTestId("tutorial-skip-button").click();
  }

  await expect(gameCanvas).toBeVisible();
  await expect(page.getByTestId("score-value")).toBeVisible();
  await expect(page.getByTestId("hold-slot")).toBeVisible();
  await expect(page.getByTestId("next-queue")).toBeVisible();

  await page.getByTestId("session-end-button").click();

  await expect(page.getByTestId("retry-button")).toBeVisible();
  await expect(page.getByTestId("result-celebration")).toBeVisible();
  await expect(page.getByTestId("result-ranking-button")).toBeVisible();
  await expect(page.getByTestId("share-button")).toBeVisible();
  await expect(page.getByTestId("save-record-button")).toBeVisible();
  await expect(page.getByTestId("rank-status")).toContainText("랭킹");

  await page.getByTestId("save-record-button").click();
  await expect(page.getByTestId("sheet-nickname")).toBeVisible();
  await page.getByTestId("nickname-input").fill("guest_runner");
  await page.getByTestId("nickname-save-button").click();

  await page.getByTestId("retry-button").click();
  await expect(page.getByTestId("tutorial-overlay")).toHaveCount(0);

  await expect(page.getByTestId("game-canvas")).toBeVisible();

  const trackedEvents = await page.evaluate(() =>
    (window as Window & { __tetrisAnalyticsEvents?: { name: string }[] })
      .__tetrisAnalyticsEvents?.map((event) => event.name) ?? []
  );

  expect(trackedEvents).toEqual(
    expect.arrayContaining([
      "landing_view",
      "quick_start_click",
      "game_finish",
      "retry_click"
    ])
  );
  expect(trackedEvents.filter((event) => event === "game_start")).toHaveLength(2);
});

test("P2-MODE-001 sprint and daily runs expose mode-specific HUD metrics", async ({
  page
}) => {
  await page.goto("/");

  await page.getByTestId("mode-button").click();
  await page.getByTestId("mode-start-button-SPRINT").click();

  await expect
    .poll(async () => {
      if ((await page.getByTestId("tutorial-overlay").count()) > 0) {
        return "tutorial";
      }

      if ((await page.getByTestId("duration-value").count()) > 0) {
        return "game";
      }

      return "none";
    })
    .not.toBe("none");

  if ((await page.getByTestId("tutorial-overlay").count()) > 0) {
    await page.getByTestId("tutorial-skip-button").click();
  }

  await expect(page.getByTestId("duration-value")).toBeVisible();
  await expect(page.getByTestId("goal-progress")).toContainText("40");
  await page.getByTestId("session-end-button").click();
  await expect(page.getByTestId("result-hero-primary")).toContainText("완주 기록");

  await page.goto("/");
  await page.getByTestId("mode-button").click();
  await page.getByTestId("mode-start-button-DAILY_CHALLENGE").click();

  await expect
    .poll(async () => {
      if ((await page.getByTestId("tutorial-overlay").count()) > 0) {
        return "tutorial";
      }

      if ((await page.getByTestId("goal-progress").count()) > 0) {
        return "game";
      }

      return "none";
    })
    .not.toBe("none");

  if ((await page.getByTestId("tutorial-overlay").count()) > 0) {
    await page.getByTestId("tutorial-skip-button").click();
  }

  await expect(page.getByTestId("goal-progress")).toContainText("/");
  await page.getByTestId("session-end-button").click();
  await expect(page.getByTestId("result-hero-primary")).toContainText("도전 진행도");
});
