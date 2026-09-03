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

test("mobile atlas preview opens a top overlay", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-atlas='preview']")).toBeVisible();
  await page.getByRole("button", { name: /open orchestration atlas/i }).click();
  await expect(page.getByRole("dialog", { name: /orchestration atlas/i })).toBeVisible();
  await expect(page.locator("[data-atlas='overlay']")).toBeVisible();
  await page.getByRole("button", { name: /^close$/i }).click();
  await expect(page.getByRole("dialog", { name: /orchestration atlas/i })).toHaveCount(0);
});

test("unknown facts name the gap and keep destination cards", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /warm family beach in europe/i }).click();
  await expect(page.getByRole("heading", { name: /choose a destination/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.locator("#composer").fill("do they have wifi in Faro?");
  await page.getByRole("button", { name: /^send$/i }).click();
  await expect(page.getByText(/don't have an answer/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/wifi/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /choose a destination/i })).toBeVisible();
  await page.getByRole("option", { name: /faro/i }).click();
  await expect(page.getByText(/day 1/i)).toBeVisible({ timeout: 20_000 });
});

test("a USA destination ask names the catalog limit", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /warm family beach in europe/i }).click();
  await expect(page.getByRole("heading", { name: /choose a destination/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.locator("#composer").fill("any destination in the USA?");
  await page.getByRole("button", { name: /^send$/i }).click();
  await expect(page.getByText(/no destinations in the USA/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/demo catalog|hiring demo|fixed set/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /choose a destination/i })).toBeVisible();
  await page.getByRole("option", { name: /faro/i }).click();
  await expect(page.getByText(/day 1/i)).toBeVisible({ timeout: 20_000 });
});

test("other options names the fixed catalog", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /warm family beach in europe/i }).click();
  await expect(page.getByRole("heading", { name: /choose a destination/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.locator("#composer").fill("Are there other options?");
  await page.getByRole("button", { name: /^send$/i }).click();
  await expect(page.getByText(/fixed demo catalog/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /choose a destination/i })).toBeVisible();
  await page.getByRole("option", { name: /faro/i }).click();
  await expect(page.getByText(/day 1/i)).toBeVisible({ timeout: 20_000 });
});

test("atlas stays pinned while the thread scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /warm family beach in europe/i }).click();
  await expect(page.getByRole("heading", { name: /choose a destination/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.locator("#conversation .desk-field").evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  const atlas = page.getByRole("region", { name: /orchestration atlas/i });
  await expect(atlas).toBeInViewport();
  const box = await atlas.boundingBox();
  expect(box?.y).toBeLessThan(120);
});
