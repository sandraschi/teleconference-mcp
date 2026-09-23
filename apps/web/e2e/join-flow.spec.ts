import { expect, test } from "@playwright/test";

test.describe("Join flow", () => {
  test("entering name and clicking join attempts connection", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/enter your name/i).fill("E2E User");
    await page.getByRole("button", { name: /join room/i }).click();
    // Either we connect (LiveKit available) or we see an error
    await expect(page.getByText(/connecting|error|failed|invalid/i)).toBeVisible({ timeout: 15000 });
  });

  test("empty name shows validation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /join room/i }).click();
    await expect(page.getByText(/please enter your name/i)).toBeVisible();
  });
});
