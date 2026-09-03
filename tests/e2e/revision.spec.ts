import { expect, test } from "@playwright/test";

test("folio revision chips rebuild the plan", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /5 days in barcelona/i }).click();
  await expect(page.getByText(/day 1/i)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /slower pace/i }).click();
  await expect(page.getByText(/slowed the days/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/day 1/i)).toBeVisible();
});
