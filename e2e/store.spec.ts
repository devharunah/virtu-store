import { type Page, expect, test } from "@playwright/test";

async function openShowroom(page: Page, errors: string[]) {
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/store?debug");
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("scene-loader")).toBeHidden({ timeout: 90_000 });
  await page.waitForFunction(() => window.__virtuPlayer?.ready === true, null, { timeout: 30_000 });
}

const playerZ = (page: Page) => page.evaluate(() => window.__virtuPlayer?.position.z ?? 0);

test("the showroom loads its 3D scene without page errors", async ({ page }) => {
  const errors: string[] = [];
  await openShowroom(page, errors);
  expect(errors).toEqual([]);
});

test("the visitor walks with the keyboard and can inspect a phone", async ({ page }) => {
  const errors: string[] = [];
  await openShowroom(page, errors);

  const startZ = await playerZ(page);
  // Walk forward (into the store) until the colour-bar table stops us and a phone is in reach.
  await page.keyboard.down("KeyW");
  await expect
    .poll(() => page.evaluate(() => window.__virtuUI?.getState().nearSlotId ?? null), {
      timeout: 120_000, // software WebGL under parallel load can walk slowly
    })
    .not.toBeNull();
  await page.keyboard.up("KeyW");
  expect(await playerZ(page)).toBeLessThan(startZ - 0.2);

  await page.keyboard.press("KeyE");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Choosing a bigger storage tier raises the price shown.
  const price = dialog.getByTestId("inspect-price");
  const before = await price.innerText();
  const tiers = dialog.getByRole("group").filter({ hasText: "Storage" }).getByRole("button");
  await tiers.last().click();
  await expect(price).not.toHaveText(before);
  await expect(tiers.last()).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});

test("clicking the floor walks the visitor there", async ({ page }) => {
  const errors: string[] = [];
  await openShowroom(page, errors);

  const start = await page.evaluate(() => window.__virtuPlayer?.position.z ?? 0);
  // A clear spot inside the shop's front, ahead and to the right of the spawn point.
  const target = { x: 1.2, z: 2.0 };
  const screen = await page.evaluate(
    ({ x, z }) => window.__virtuProject?.(x, 0, z) ?? null,
    target,
  );
  if (!screen) throw new Error("debug projection missing");
  await page.mouse.click(screen.x, screen.y);
  await expect.poll(() => page.evaluate(() => window.__virtuMove?.point ?? null)).not.toBeNull();

  // The visitor walks in, and the target clears on arrival.
  await expect
    .poll(() => page.evaluate(() => window.__virtuMove?.point ?? null), { timeout: 120_000 })
    .toBeNull();
  expect(await page.evaluate(() => window.__virtuMove?.ended ?? null)).toBe("arrived");
  const end = await page.evaluate(() => window.__virtuPlayer?.position ?? null);
  expect(end).not.toBeNull();
  expect(end?.z ?? 0).toBeLessThan(start - 1);
  expect(Math.abs((end?.z ?? 0) - target.z)).toBeLessThan(0.6);
  expect(errors).toEqual([]);
});

test.describe("on a touch phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("shows the joystick and jump button on screen", async ({ page }) => {
    const errors: string[] = [];
    await openShowroom(page, errors);

    const viewport = page.viewportSize();
    const onScreen = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('div[style*="position: fixed"]')].map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      }),
    );
    expect(onScreen.length).toBeGreaterThanOrEqual(2); // joystick + jump
    for (const r of onScreen) {
      expect(r.top).toBeGreaterThanOrEqual(0);
      expect(r.bottom).toBeLessThanOrEqual(viewport?.height ?? 0);
      expect(r.left).toBeGreaterThanOrEqual(0);
      expect(r.right).toBeLessThanOrEqual(viewport?.width ?? 0);
    }
    await expect(page.getByRole("button", { name: /^Open bag/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
