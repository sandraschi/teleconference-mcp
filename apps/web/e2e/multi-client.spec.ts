import { expect, type Page, test } from "@playwright/test";

test.describe("Multi-client conferencing", () => {
  async function joinAs(page: Page, name: string) {
    await page.goto("/");
    await page.getByPlaceholder(/enter your name/i).fill(name);
    await page.getByRole("button", { name: /join room/i }).click();
    // Dev-server hydration race: an unhydrated SSR button swallows the first
    // click. If the form is still showing after 3s, click once more.
    await page.waitForTimeout(3000);
    if (await page.getByPlaceholder(/enter your name/i).isVisible()) {
      await page.getByRole("button", { name: /join room/i }).click();
    }
  }

  test("two users can join the same room and see each other", async ({ browser }) => {
    // Client 1
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await joinAs(page1, "Alice");
    // Name renders in tile + transcript echoes: first() pins the tile.
    await expect(page1.getByText(/Alice/i).first()).toBeVisible({ timeout: 15000 });

    // Client 2
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await joinAs(page2, "Bob");
    await expect(page2.getByText(/Bob/i).first()).toBeVisible({ timeout: 15000 });

    // Verify Alice sees Bob
    await expect(page1.getByText(/Bob/i).first()).toBeVisible({ timeout: 15000 });

    // Verify Bob sees Alice
    await expect(page2.getByText(/Alice/i).first()).toBeVisible({ timeout: 15000 });

    await context1.close();
    await context2.close();
  });
});
