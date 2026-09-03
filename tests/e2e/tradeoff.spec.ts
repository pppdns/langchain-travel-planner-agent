import { expect, test } from "@playwright/test";

test("city-break starter reaches a tradeoff interrupt", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /city break, food and culture/i }).click();
  await expect(page.getByRole("heading", { name: /choose a destination/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("option").first().click();
  await expect(page.getByRole("radiogroup", { name: /packed pace and a strict budget/i })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("radio", { name: /protect the budget/i }).click();
  await expect(page.getByText(/day 1/i)).toBeVisible({ timeout: 20_000 });
});
