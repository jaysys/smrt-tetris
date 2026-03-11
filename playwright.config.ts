import { defineConfig, devices } from "@playwright/test";

const runDate = new Date().toISOString().slice(0, 10);
const artifactRoot = `artifacts/e2e/${runDate}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["line"],
    ["html", { outputFolder: `${artifactRoot}/report`, open: "never" }]
  ],
  outputDir: `${artifactRoot}/output`,
  use: {
    baseURL: "http://127.0.0.1:3110",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium-mobile",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 }
      }
    }
  ],
  webServer: {
    command: "pnpm --dir apps/web run build && pnpm --dir apps/web run start:e2e",
    url: "http://127.0.0.1:3110",
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
