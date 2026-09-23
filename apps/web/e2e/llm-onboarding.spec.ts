import { expect, test } from "@playwright/test";

// Weak-GPU / fresh-box path: no local engine detected, no cloud keys.
// The dashboard must show the red setup CTA, never a dead end.
test.describe("LLM onboarding cue", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/llm/providers", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          providers: [
            {
              id: "ollama",
              label: "Ollama",
              kind: "local",
              base_url: "http://127.0.0.1:11434",
              needs_key: false,
              key_env: null,
              configured: true,
              detected: false,
              models: [],
            },
            {
              id: "meta",
              label: "Meta",
              kind: "cloud",
              base_url: "https://api.meta.com",
              needs_key: true,
              key_env: "META_API_KEY",
              configured: false,
            },
          ],
        }),
      }),
    );
    await page.route("**/api/llm/onboarding", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          locals: [{ id: "ollama", label: "Ollama", port: 11434 }],
          clouds_configured: [],
          recommendation: { path: "cloud:meta", reason: "Cheapest instant path." },
        }),
      }),
    );
  });

  test("dashboard shows setup CTA when no AI is configured", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("onboarding-cue")).toBeVisible({ timeout: 15000 });
  });

  test("cue expands setup paths", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("onboarding-cue").click();
    await expect(page.getByTestId("onboarding-paths")).toBeVisible();
  });
});
