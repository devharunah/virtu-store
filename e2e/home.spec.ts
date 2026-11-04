import { expect, test } from "@playwright/test";

test("landing page shows the pitch and links into the store", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Walk in");
  await expect(page.getByText(/UGX 349,000/)).toBeVisible();

  await page.getByRole("link", { name: "Enter the store" }).click();
  await expect(page).toHaveURL(/\/store$/);
});
