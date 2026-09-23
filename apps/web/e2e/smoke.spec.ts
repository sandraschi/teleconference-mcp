import { expect, test } from "@playwright/test";

test.describe("AG-Visio smoke", () => {
  test("home page loads and shows join form", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /join conference/i })).toBeVisible();
    await expect(page.getByPlaceholder(/enter your name/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /join room/i })).toBeVisible();
  });

  test("test page link is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /test camera & audio/i })).toBeVisible();
  });

  test("navigating to test page shows video test UI", async ({ page }) => {
    await page.goto("/test");
    await expect(page.getByRole("heading", { name: /video & audio test/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to dashboard/i })).toBeVisible();
  });

  test("settings page loads all sections", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();
    await expect(page.getByText(/livekit configuration/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /ollama \(ai agent\)/i })).toBeVisible();
    await expect(page.getByText(/audio & video devices/i)).toBeVisible();
    await expect(page.getByText(/appearance/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /^privacy$/i })).toBeVisible();
  });

  test("theme selector works", async ({ page }) => {
    await page.goto("/settings");
    const dark = page.getByRole("button", { name: /dark/i });
    const light = page.getByRole("button", { name: /^light$/i });
    const system = page.getByRole("button", { name: /system/i });

    await expect(dark).toBeVisible();
    await expect(light).toBeVisible();
    await expect(system).toBeVisible();

    // Click light theme
    await light.click();
    await expect(light).toHaveClass(/bg-blue-600/);
  });

  test("health page loads and shows status sections", async ({ page }) => {
    await page.goto("/health");
    await expect(page.getByRole("heading", { name: /health dashboard/i })).toBeVisible();
    await expect(page.getByText(/overall status/i)).toBeVisible();
    await expect(page.getByText(/livekit server/i)).toBeVisible();
  });

  test("sidebar navigation is present", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByTestId("sidebar-nav");
    await expect(nav.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /meetings/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /health/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /settings/i })).toBeVisible();
  });

  test("meetings page loads", async ({ page }) => {
    await page.goto("/meetings");
    await expect(page.getByRole("heading", { name: /meetings/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /schedule/i })).toBeVisible();
  });

  test("meetings page can open create form", async ({ page }) => {
    await page.goto("/meetings");
    await page.getByRole("button", { name: /schedule/i }).click();
    await expect(page.getByText(/new meeting/i)).toBeVisible();
    await expect(page.getByPlaceholder(/sprint review/i)).toBeVisible();
  });

  test("keyboard shortcut ? opens help", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("?");
    // Help modal should appear (may be a dialog or section)
    await expect(page.getByText(/getting started|help|shortcuts/i).first()).toBeVisible({ timeout: 3000 });
  });

  test("device test page loads camera/mic sections", async ({ page }) => {
    await page.goto("/test");
    await expect(page.getByText("Camera", { exact: true })).toBeVisible();
    await expect(page.getByText("Microphone", { exact: true })).toBeVisible();
    await expect(page.getByText("Speakers", { exact: true })).toBeVisible();
  });

  test("reset to defaults button exists in settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("button", { name: /reset/i })).toBeVisible();
  });

  test("settings LLM section shows active pair and provider cards", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("llm-provider-select")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("llm-model-select")).toBeVisible();
    await expect(page.getByTestId("llm-provider-card-ollama")).toBeVisible();
  });
});
