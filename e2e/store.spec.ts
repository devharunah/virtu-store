import { type Page, expect, test } from "@playwright/test";

type Vec = { x: number; y: number; z: number };
declare global {
  interface Window {
    __virtuPlayer?: { ready: boolean; position: Vec };
    __virtuUI?: { getState: () => { nearSlotId: string | null; inspectingId: string | null } };
  }
}

async function openShowroom(page: Page, errors: string[]) {
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/store?debug");
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Opening the showroom/)).toBeHidden({ timeout: 90_000 });
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
      timeout: 15_000,
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
    await expect(page.getByText("Joystick to walk · drag to look")).toBeVisible();
    expect(errors).toEqual([]);
  });
});
