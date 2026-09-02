import { expect, test } from "@playwright/test";

test("90-second discovery starter reaches a destination interrupt", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /where should this trip begin/i })).toBeVisible();
  await page.getByRole("button", { name: /warm family beach in europe/i }).click();
  await expect(page.getByRole("heading", { name: /choose a destination/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: /faro/i }).click();
  await expect(page.getByText(/day 1/i)).toBeVisible({ timeout: 20_000 });
});
