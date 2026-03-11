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

  await expect(page.getByTestId("daily-banner")).toContainText("Daily Challenge");
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

test("P1-GAME-001 start, finish, and retry loops stay interactive", async ({
  page
}) => {
  await page.goto("/");

  await page.getByTestId("start-button").click();

  await expect(page.getByTestId("tutorial-overlay")).toBeVisible();
  await page.getByTestId("tutorial-skip-button").click();

  await expect(page.getByTestId("game-canvas")).toBeVisible();
  await expect(page.getByTestId("score-value")).toBeVisible();
  await expect(page.getByTestId("hold-slot")).toBeVisible();
  await expect(page.getByTestId("next-queue")).toBeVisible();

  await page.getByTestId("session-end-button").click();

  await expect(page.getByTestId("retry-button")).toBeVisible();
  await expect(page.getByTestId("result-ranking-button")).toBeVisible();
  await expect(page.getByTestId("share-button")).toBeVisible();
  await expect(page.getByTestId("save-record-button")).toBeVisible();
  await expect(page.getByTestId("rank-status")).toContainText("D3");

  await page.getByTestId("retry-button").click();
  await expect(page.getByTestId("tutorial-overlay")).toHaveCount(0);

  await expect(page.getByTestId("game-canvas")).toBeVisible();

  const trackedEvents = await page.evaluate(() =>
    (window as Window & { __tetrisAnalyticsEvents?: { name: string }[] })
      .__tetrisAnalyticsEvents?.map((event) => event.name) ?? []
  );

  expect(trackedEvents).toEqual([
    "landing_view",
    "quick_start_click",
    "game_start",
    "game_finish",
    "retry_click",
    "game_start"
  ]);
});
