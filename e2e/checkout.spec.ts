import { type Page, expect, test } from "@playwright/test";

const CART_KEY = "virtu-cart-v1";

// Galaxy A17 Black 256 GB × 2 = 1,680,000; Galaxy A56 Graphite 128 GB × 1 = 1,390,000.
const SEEDED_CART = {
  state: {
    lines: [
      {
        key: "galaxy-a17:black:256",
        productId: "galaxy-a17",
        colourId: "black",
        variantId: "256",
        qty: 2,
      },
      {
        key: "galaxy-a56:awesome-graphite:128",
        productId: "galaxy-a56",
        colourId: "awesome-graphite",
        variantId: "128",
        qty: 1,
      },
    ],
  },
  version: 1,
};

/** Seeds the cart once per test: later reloads see whatever the app saved. */
async function seedCart(page: Page) {
  await page.addInitScript(
    ([key, value]) => {
      if (window.sessionStorage.getItem("e2e-seeded") !== null) return;
      window.localStorage.setItem(key, value);
      window.sessionStorage.setItem("e2e-seeded", "1");
    },
    [CART_KEY, JSON.stringify(SEEDED_CART)] as const,
  );
}

function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

test("pays with MTN MoMo and lands on the success screen with an empty bag", async ({ page }) => {
  const errors = collectPageErrors(page);
  await seedCart(page);
  await page.goto("/checkout");

  await expect(page).toHaveTitle("Checkout · VIRTU.STORE");
  await expect(page.getByText("Demo store: no real payment is taken")).toBeVisible();
  const summary = page.getByTestId("order-summary");
  await expect(summary.getByText("Galaxy A17 5G")).toBeVisible();
  await expect(summary.getByText("Galaxy A56 5G")).toBeVisible();
  await expect(page.getByTestId("order-total")).toHaveText("UGX 3,080,000");

  // An empty form shows every error.
  await page.getByRole("button", { name: /^Pay UGX/ }).click();
  await expect(page.getByText("Enter your full name.")).toBeVisible();
  await expect(page.getByText("Enter the phone number the rider should call.")).toBeVisible();
  await expect(page.getByText("Choose a delivery area.")).toBeVisible();
  await expect(page.getByText(/Add a landmark/)).toBeVisible();
  await expect(page.getByText("Choose how you'd like to pay.")).toBeVisible();

  await page.getByLabel("Full name").fill("Amina Nakato");
  await page.getByLabel("Phone number").fill("0700 123456");
  await page.getByLabel("Delivery area").selectOption("Nakawa");
  await page.getByLabel("Landmark or address notes").fill("Opposite Shell Kisementi");
  await page.getByRole("radio", { name: /MTN MoMo/ }).check();

  // An Airtel number can't pay with MoMo.
  await page.getByRole("button", { name: /^Pay UGX/ }).click();
  await expect(page.getByText(/MTN MoMo needs an MTN number/)).toBeVisible();

  await page.getByLabel("Phone number").fill("0772 123456");
  await expect(page.getByText("MTN number", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pay UGX 3,080,000" }).click();

  await expect(
    page.getByRole("heading", { name: "Approve the payment prompt on your phone" }),
  ).toBeVisible();
  await expect(page.getByText(/to \+256 772 123456/)).toBeVisible();

  await expect(page.getByRole("heading", { name: /Order placed/ })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("order-number")).toHaveText(/^VIRTU-[A-Z0-9]{6}$/);
  await expect(
    page.getByText(
      "A boda rider will call you on +256 772 123456. Estimated delivery: today, within 2–4 hours.",
    ),
  ).toBeVisible();
  await expect(page.getByTestId("order-total")).toHaveText("UGX 3,080,000");
  await expect(
    page.getByRole("main").getByRole("link", { name: "Back to the showroom" }).last(),
  ).toHaveAttribute("href", "/store");

  // The bag is empty, in the UI and in storage, and stays empty after a reload.
  await expect(page.getByRole("button", { name: "Open bag, empty" })).toBeVisible();
  const saved = await page.evaluate((key) => window.localStorage.getItem(key), CART_KEY);
  expect(JSON.parse(saved ?? "{}")).toMatchObject({ state: { lines: [] }, version: 1 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your bag is empty" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("cash on delivery outside Kampala skips the phone prompt", async ({ page }) => {
  await seedCart(page);
  await page.goto("/checkout");

  await page.getByLabel("Full name").fill("Okello James");
  await page.getByLabel("Phone number").fill("+256 712 345678");
  await page.getByLabel("Delivery area").selectOption("Outside Kampala");
  await page.getByLabel("Landmark or address notes").fill("Gulu, near the main market");
  await page.getByRole("radio", { name: /Cash on delivery/ }).check();
  await expect(page.getByTestId("order-total")).toHaveText("UGX 3,095,000");
  await page.getByRole("button", { name: "Place order · UGX 3,095,000" }).click();

  await expect(page.getByRole("heading", { name: /Order placed/ })).toBeVisible();
  await expect(page.getByText(/Estimated delivery: 1–2 days\./)).toBeVisible();
});

test("the bag drawer edits lines and the summary follows", async ({ page }) => {
  await seedCart(page);
  await page.goto("/checkout");
  await expect(page.getByTestId("order-total")).toHaveText("UGX 3,080,000");

  const bagButton = page.getByRole("button", { name: "Open bag, 3 items" });
  await bagButton.click();
  const drawer = page.getByRole("dialog", { name: /Your bag/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Close bag" })).toBeFocused();
  await expect(drawer.getByTestId("cart-line")).toHaveCount(2);
  await expect(drawer.getByTestId("cart-subtotal")).toHaveText("UGX 3,070,000");

  // Galaxy A17: 2 -> 3, then 256 GB -> 128 GB (720,000 × 3 = 2,160,000).
  await drawer.getByRole("button", { name: "Increase quantity of Galaxy A17 5G" }).click();
  await drawer.getByLabel("Storage for Galaxy A17 5G").selectOption("128");
  await expect(drawer.getByTestId("cart-subtotal")).toHaveText("UGX 3,550,000");

  await drawer.getByRole("button", { name: "Remove Galaxy A56 5G from bag" }).click();
  await expect(drawer.getByTestId("cart-line")).toHaveCount(1);
  await expect(drawer.getByTestId("cart-subtotal")).toHaveText("UGX 2,160,000");

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(page.getByRole("button", { name: "Open bag, 3 items" })).toBeFocused();
  await expect(page.getByTestId("order-total")).toHaveText("UGX 2,170,000");

  // Emptying the bag shows the empty state, and "Keep browsing" closes it.
  await page.getByRole("button", { name: "Open bag, 3 items" }).click();
  await drawer.getByRole("button", { name: "Remove Galaxy A17 5G from bag" }).click();
  await expect(drawer.getByText("Your bag is empty")).toBeVisible();
  await drawer.getByRole("button", { name: "Keep browsing" }).click();
  await expect(drawer).toBeHidden();
});

test("an empty bag gets a friendly message and a way back to the store", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/checkout");

  await expect(page.getByText("Demo store: no real payment is taken")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your bag is empty" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to the showroom" })).toHaveAttribute(
    "href",
    "/store",
  );
  await expect(page.getByRole("button", { name: /Pay/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});
