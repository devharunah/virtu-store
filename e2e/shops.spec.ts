import { expect, test } from "@playwright/test";

/** What each demo shop charges (src/data/demo-shops.ts), as the panel formats it. */
const KIKUUBO_PRICES: Record<string, string> = {
  "galaxy-s25-ultra": "UGX 4,550,000",
  "galaxy-a56": "UGX 1,290,000",
  "galaxy-a17": "UGX 650,000",
};

test("the directory lists the featured shops and links to selling", async ({ page }) => {
  await page.goto("/stores");
  await expect(page.getByRole("heading", { name: "Pick a shop and walk in" })).toBeVisible();
  const cards = page.getByTestId("shop-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.filter({ hasText: "Kikuubo Phone Hub" })).toHaveAttribute(
    "href",
    "/stores/kikuubo-phone-hub",
  );
  // CI runs without Firebase, so there is no sellers' section to load.
  await expect(page.getByRole("heading", { name: "Shops opened by sellers" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open your shop" })).toHaveAttribute("href", "/sell");
});

test("a seller's shop sells at its own prices and the bag remembers the shop", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/stores/kikuubo-phone-hub?debug");
  await expect(page.getByTestId("shop-name")).toHaveText("Kikuubo Phone Hub");
  await expect(page.getByTestId("scene-loader")).toBeHidden({ timeout: 90_000 });
  await page.waitForFunction(() => window.__virtuPlayer?.ready === true, null, { timeout: 30_000 });

  // Walk in until a phone is in reach.
  await page.keyboard.down("KeyW");
  await expect
    .poll(() => page.evaluate(() => window.__virtuUI?.getState().nearSlotId ?? null), {
      timeout: 120_000, // software WebGL under parallel load can walk slowly
    })
    .not.toBeNull();
  await page.keyboard.up("KeyW");

  const productId = await page.evaluate(
    () => (window.__virtuUI?.getState() as { nearProductId?: string } | undefined)?.nearProductId,
  );
  expect(productId && productId in KIKUUBO_PRICES).toBe(true);

  await page.keyboard.press("KeyE");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("inspect-price")).toHaveText(
    KIKUUBO_PRICES[productId ?? ""] ?? "",
  );

  await dialog.getByRole("button", { name: /^Add to bag/ }).click();
  await dialog.getByRole("button", { name: "View bag and check out" }).click();
  const bag = page.getByRole("dialog", { name: /Your bag/ });
  await expect(bag.getByText("from Kikuubo Phone Hub")).toBeVisible();
  expect(errors).toEqual([]);
});

test("an unknown shop link says so and points back to the directory", async ({ page }) => {
  await page.goto("/stores/no-such-shop");
  await expect(page.getByRole("heading", { name: "No shop here yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse shops" })).toHaveAttribute("href", "/stores");
});

test("selling explains itself when no Firebase project is connected", async ({ page }) => {
  await page.goto("/sell");
  await expect(page.getByRole("heading", { name: "Open your shop in 3D" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Seller accounts aren’t configured");
});

test("a seller's own phone opens as a display model and goes in the bag", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // The generic model goes on the counters alongside the iPhones.
  const generic = page.waitForResponse(
    (r) => r.url().endsWith("/models/phones/generic-phone.glb"),
    {
      timeout: 90_000,
    },
  );
  await page.goto("/stores/wandegeya-iworld?debug");
  expect((await generic).ok()).toBe(true);
  await expect(page.getByTestId("scene-loader")).toBeHidden({ timeout: 90_000 });

  await page.evaluate(() => window.__virtuUI?.getState().openInspect("custom-c1"));
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "K1 Lite" })).toBeVisible();
  await expect(dialog.getByText("Kabira · Seller's phone")).toBeVisible();
  await expect(dialog.getByTestId("inspect-price")).toHaveText("UGX 480,000");
  await dialog.getByRole("button", { name: /^128 GB/ }).click();
  await expect(dialog.getByTestId("inspect-price")).toHaveText("UGX 540,000");

  await dialog.getByRole("button", { name: /^Add to bag/ }).click();
  await dialog.getByRole("button", { name: "View bag and check out" }).click();
  const bag = page.getByRole("dialog", { name: /Your bag/ });
  await expect(bag.getByText("K1 Lite", { exact: true })).toBeVisible();
  await expect(bag.getByText("Lake Blue · 128 GB")).toBeVisible();
  await expect(bag.getByText("from Wandegeya iWorld")).toBeVisible();

  // The bag survives a reload (the phone's snapshot is stored with the line).
  await page.reload();
  await page.goto("/checkout");
  await expect(page.getByText(/K1 Lite/).first()).toBeVisible();
  expect(errors).toEqual([]);
});
