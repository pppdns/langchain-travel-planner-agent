import { expect, test } from "@playwright/test";

test("off-scope requests stay on the trip", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Message")).toBeVisible();
  await page.getByLabel("Message").fill("Write me a Python web scraper");
  await page.getByRole("button", { name: /send/i }).click();
  await expect(page.getByText(/only plan trips/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /where should this trip begin/i })).toBeVisible();
});

test("non-travel how-tos stay on the trip", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Message").fill("how to brew beer");
  await page.getByRole("button", { name: /send/i }).click();
  await expect(page.getByText(/only plan trips/i)).toBeVisible({ timeout: 15_000 });
});

test("booking asks name the demo limit and keep a next step", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Message").fill("book me a hotel");
  await page.getByRole("button", { name: /send/i }).click();
  await expect(page.getByText(/hiring demo/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/fixed catalog/i)).toBeVisible();
  await expect(page.getByText(/only plan trips/i)).toHaveCount(0);
  await expect(page.getByRole("radio", { name: /beach/i })).toBeVisible();
});
