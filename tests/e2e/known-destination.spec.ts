import { expect, test } from "@playwright/test";

test("known destination starter reaches an itinerary", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /5 days in barcelona/i }).click();
  await expect(page.getByText(/barcelona/i).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/day 1/i)).toBeVisible({ timeout: 20_000 });
});
