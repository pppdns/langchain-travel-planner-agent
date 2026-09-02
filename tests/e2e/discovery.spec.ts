import { expect, test } from "@playwright/test";

test("90-second discovery starter reaches a destination interrupt", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /where should this trip begin/i })).toBeVisible();
  await page.getByRole("button", { name: /warm family beach in europe/i }).click();
  await expect(page.getByRole("heading", { name: /choose a destination/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("option", { name: /faro/i }).click();
  await expect(page.getByText(/day 1/i)).toBeVisible({ timeout: 20_000 });
});

test("atlas stays inspectable in the margin", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("region", { name: /orchestration atlas/i })).toBeVisible();
});

test("conversation stays usable at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /where should this trip begin/i })).toBeVisible();
  await page.getByRole("button", { name: /warm family beach in europe/i }).click();
  await expect(page.getByRole("heading", { name: /choose a destination/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("option", { name: /faro/i }).click();
  await expect(page.getByText(/day 1/i)).toBeVisible({ timeout: 20_000 });
});
