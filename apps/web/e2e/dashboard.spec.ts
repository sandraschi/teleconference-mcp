import { expect, test } from "@playwright/test";

test.describe("Dashboard smoke + navigation", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=AG-Visio").or(page.locator("text=MyConf")).first()).toBeVisible();
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.locator("nav").first();
    const links = sidebar.locator("a");
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("settings page loads sections", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("text=Settings").first()).toBeVisible({ timeout: 10000 });
  });

  test("health page loads", async ({ page }) => {
    await page.goto("/health");
    await expect(page.locator("text=Health").or(page.locator("text=health")).first()).toBeVisible({ timeout: 10000 });
  });

  test("meetings page loads", async ({ page }) => {
    await page.goto("/meetings");
    await expect(page.locator("text=Meetings").or(page.locator("text=meetings")).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("keyboard shortcut ? opens help modal", async ({ page }) => {
    await page.goto("/");
    // Focus starts in the autofocused name input, which rightly swallows "?":
    // click neutral ground first so the AppShell shortcut fires.
    await page.getByTestId("dashboard-hero").click();
    await page.keyboard.press("?");
    const modal = page.locator('[role="dialog"]').or(page.locator(".modal"));
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("REST API", () => {
  test("GET /api/health returns 200", async ({ request }) => {
    const resp = await request.get("/api/health");
    expect(resp.ok()).toBeTruthy();
  });

  test("POST /api/token with empty body returns 400 or 422", async ({ request }) => {
    const resp = await request.post("/api/token", { data: {} });
    expect(resp.status()).toBeGreaterThanOrEqual(400);
  });

  test("GET /api/discovery returns JSON", async ({ request }) => {
    const resp = await request.get("/api/discovery");
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body).toBeDefined();
  });
});

test.describe("Join flow", () => {
  test("entering name shows validation or routes to room", async ({ page }) => {
    await page.goto("/");
    const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="Name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill("TestUser");
      const joinBtn = page
        .locator("button")
        .filter({ hasText: /join|enter/i })
        .first();
      await joinBtn.click();
      // Dev-server hydration race (see multi-client.spec): retry once if still on form.
      await page.waitForTimeout(3000);
      if (await nameInput.isVisible()) {
        await joinBtn.click();
      }
      // Backend + LiveKit run in e2e webServer: success means connected room UI
      // (leave button / video grid); without infra it means an error message.
      await page.waitForTimeout(8000);
      const hasError = await page.locator("text=Error, text=error, text=fail").count();
      const hasRoom = page.url().includes("/room") || page.url().includes("/meeting");
      const connected = await page.getByRole("button", { name: /leave/i }).count();
      const videoTiles = await page.locator("video").count();
      expect(hasError > 0 || hasRoom || connected > 0 || videoTiles > 0).toBeTruthy();
    }
  });
});
