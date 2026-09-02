import { expect, test } from "@playwright/test";

test("off-scope requests stay on the trip", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /send/i })).toBeEnabled({ timeout: 15_000 });
  await page.getByLabel("Message").fill("Write me a Python web scraper");
  await page.getByRole("button", { name: /send/i }).click();
  await expect(page.getByText(/only plan trips/i)).toBeVisible({ timeout: 15_000 });
});
