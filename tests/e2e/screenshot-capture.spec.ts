import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const outputDir = path.resolve(process.cwd(), "3.개발자/screenshots");

async function capture(page: Parameters<typeof test>[0]["page"], name: string) {
  mkdirSync(outputDir, { recursive: true });
  await page.screenshot({
    path: path.join(outputDir, name),
    fullPage: true
  });
}

test("CAPTURE-001 major screens", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("game-canvas")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("start-button")).toBeVisible();
  await capture(page, "01-landing.png");

  await page.getByTestId("settings-sheet-open").click();
  await expect(page.getByTestId("sheet-settings")).toBeVisible();
  await capture(page, "02-settings-sheet.png");
  await page.getByTestId("sheet-close-button").click();

  await page.getByTestId("daily-detail-open").click();
  await expect(page.getByTestId("sheet-daily")).toBeVisible();
  await capture(page, "03-daily-sheet.png");
  await page.getByTestId("sheet-close-button").click();

  await page.getByTestId("mode-button").click();
  await expect(page.getByTestId("mode-screen")).toBeVisible();
  await capture(page, "04-mode-select.png");

  await page.getByRole("button", { name: "뒤로가기" }).click();
  await expect(page.getByTestId("start-button")).toBeVisible();
  await page.getByTestId("ranking-button").click();
  await expect(page.getByTestId("ranking-screen")).toBeVisible();
  await capture(page, "05-ranking.png");

  await page.getByRole("button", { name: "뒤로가기" }).click();
  await page.getByTestId("start-button").click();
  await expect(page.getByTestId("game-canvas")).toBeVisible();
  await capture(page, "06-playing.png");

  await page.keyboard.press("q");
  await expect(page.getByTestId("retry-button")).toBeVisible();
  await capture(page, "07-result.png");

  await page.getByTestId("save-record-button").click();
  await expect(page.getByTestId("sheet-nickname")).toBeVisible();
  await capture(page, "08-nickname-sheet.png");
});
