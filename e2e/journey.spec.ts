import { expect, test } from "@playwright/test";

/**
 * The definition of success from the brief, end to end: open the site, enter the store, walk to a
 * phone, inspect it, pick storage and colour, add it to the bag, and finish a simulated checkout.
 */
test("a visitor walks in, picks a phone and completes a simulated checkout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // 1–2. Open the site and enter the store
  await page.goto("/");
  await page.getByRole("link", { name: "Enter the store" }).click();
  await expect(page).toHaveURL(/\/store$/);
  await expect(page.getByTestId("scene-loader")).toBeHidden({ timeout: 90_000 });

  // 3–4. Walk to a phone (debug hooks only exist with ?debug, so reload with it)
  await page.goto("/store?debug");
  await expect(page.getByTestId("scene-loader")).toBeHidden({ timeout: 90_000 });
  await page.waitForFunction(() => window.__virtuPlayer?.ready === true, null, { timeout: 30_000 });
  await page.keyboard.down("KeyW");
  await expect
    .poll(() => page.evaluate(() => window.__virtuUI?.getState().nearSlotId ?? null), {
      timeout: 120_000, // software WebGL under parallel load can walk slowly
    })
    .not.toBeNull();
  await page.keyboard.up("KeyW");

  // 5–6. Inspect it, choose the largest storage and the last colour
  await page.keyboard.press("KeyE");
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await sheet.getByRole("group").filter({ hasText: "Storage" }).getByRole("button").last().click();
  await sheet.getByRole("group").filter({ hasText: "Colour" }).getByRole("button").last().click();
  const price = await sheet.getByTestId("inspect-price").innerText();

  // 7. Add to bag and open it
  await sheet.getByRole("button", { name: /^Add to bag/ }).click();
  await sheet.getByRole("button", { name: "View bag and check out" }).click();
  const bag = page.getByRole("dialog", { name: /Your bag/ });
  await expect(bag).toBeVisible();
  await expect(bag.getByText(price).first()).toBeVisible();
  await bag.getByRole("link", { name: "Checkout" }).click();

  // 8. Simulated checkout with MTN MoMo
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByLabel("Full name").fill("Amina Nakato");
  await page.getByLabel("Phone number").fill("0772 123456");
  await page.getByLabel("Delivery area").selectOption("Kampala Central");
  await page.getByLabel("Landmark or address notes").fill("Opposite the Kisementi roundabout");
  await page.getByRole("radio", { name: /MTN MoMo/ }).check();
  await page.getByRole("button", { name: /^Pay UGX/ }).click();
  await expect(page.getByRole("heading", { name: /Order placed/ })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("order-number")).toHaveText(/^VIRTU-[A-Z0-9]{6}$/);

  expect(errors).toEqual([]);
});
