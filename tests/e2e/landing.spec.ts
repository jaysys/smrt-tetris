import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

async function reachInitialGame(page: Page) {
  await expect(page.getByTestId("game-canvas")).toBeVisible();
}

async function openLandingFromGame(page: Page) {
  await reachInitialGame(page);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("start-button")).toBeVisible();
}

test("P0-HOME-001 home boots directly into marathon play", async ({ page }, testInfo) => {
  const consoleLines: string[] = [];

  page.on("console", (message) => {
    consoleLines.push(`[${message.type()}] ${message.text()}`);
  });

  await page.goto("/");
  await reachInitialGame(page);

  await expect(page.getByTestId("play-viewport").locator("button")).toHaveCount(0);

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
  await openLandingFromGame(page);

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
  await openLandingFromGame(page);

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
  await page.keyboard.press("q");

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

test("P1-PLAY-001 game board stays centered and within one mobile viewport", async ({
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
    await reachInitialGame(page);

    const required = [page.getByTestId("game-canvas")];

    for (const locator of required) {
      await expect(locator).toBeVisible();
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(viewport.width - (box!.x + box!.width)).toBeGreaterThanOrEqual(0);
    }

    const boardBox = await page.getByTestId("game-canvas").boundingBox();
    expect(boardBox).not.toBeNull();
    const leftGap = boardBox!.x;
    const rightGap = viewport.width - (boardBox!.x + boardBox!.width);
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(6);
  }
});

test("P1-GAME-001 start, finish, and retry loops stay interactive", async ({
  page
}) => {
  await page.goto("/");
  const gameCanvas = page.getByTestId("game-canvas");

  await expect(gameCanvas).toBeVisible();
  await expect(page.getByTestId("play-viewport").locator("button")).toHaveCount(0);

  await page.keyboard.press("q");

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
  await expect(page.getByTestId("game-canvas")).toBeVisible();

  const trackedEvents = await page.evaluate(() =>
    (window as Window & { __tetrisAnalyticsEvents?: { name: string }[] })
      .__tetrisAnalyticsEvents?.map((event) => event.name) ?? []
  );

  expect(trackedEvents).toEqual(
    expect.arrayContaining([
      "landing_view",
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
  await openLandingFromGame(page);

  await page.getByTestId("mode-button").click();
  await page.getByTestId("mode-start-button-SPRINT").click();
  await expect(page.getByTestId("game-canvas")).toBeVisible();
  await page.keyboard.press("q");
  await expect(page.getByTestId("result-hero-primary")).toContainText("완주 기록");

  await page.goto("/");
  await openLandingFromGame(page);
  await page.getByTestId("mode-button").click();
  await page.getByTestId("mode-start-button-DAILY_CHALLENGE").click();
  await expect(page.getByTestId("game-canvas")).toBeVisible();
  await page.keyboard.press("q");
  await expect(page.getByTestId("result-hero-primary")).toContainText("도전 진행도");
});
