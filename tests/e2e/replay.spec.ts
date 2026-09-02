import { expect, test } from "@playwright/test";

test("replay deep link is labeled and playable", async ({ page }) => {
  await page.goto("/replay/family-beach-europe");
  await expect(page.locator("[data-ready='true']")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/recorded run\. the events are the same public protocol/i)).toBeVisible({
    timeout: 15_000,
  });
});
