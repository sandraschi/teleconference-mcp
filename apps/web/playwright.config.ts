import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:10886",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Fake camera/mic so join flows reach "connected" headlessly.
        launchOptions: {
          args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
        },
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: [
    {
      // Python backend MUST be up: specs navigate tools/health pages that call
      // :10887 (MCP + /health) and :10891 (diagnostics). Frontend-only webServer
      // left those specs hitting a dead backend (assfix 2026-09-23).
      command: "uv run --project ../.. python -m teleconference_mcp --serve",
      url: "http://localhost:10887/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:10886",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      // E2E runs as dev-bypass auth (same flag as local dev): specs assert the
      // product UI, not the Authentik sign-in wall.
      env: { AUTH_DISABLED: "true" },
    },
  ],
});
