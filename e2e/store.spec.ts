import { expect, test } from "@playwright/test";

test("the showroom loads its 3D scene without page errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/store");

  // The WebGL canvas mounts, and the loading overlay goes away once every model has loaded.
  await expect(page.locator("canvas")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Opening the showroom/)).toBeHidden({ timeout: 90_000 });

  expect(errors).toEqual([]);
});
