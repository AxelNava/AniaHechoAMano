import { expect, test } from "./helpers/realTest";

test.describe("Real auth session restoration", () => {
  test("recognizes the admin session on first entry, in a new tab, and after reload", async ({ page }) => {
    const adminLink = page.getByRole("link", { name: "Admin" }).first();
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(adminLink).toBeVisible();

    const userStorageBeforeReload = await page.evaluate(() =>
      Object.entries(window.localStorage)
        .filter(([name]) => name.startsWith("oidc.user:"))
        .sort(([left], [right]) => left.localeCompare(right)),
    );

    const newPage = await page.context().newPage();
    try {
      await newPage.goto("/");
      await expect(newPage).toHaveURL("/");
      await expect(newPage.getByRole("link", { name: "Admin" }).first()).toBeVisible();
    } finally {
      await newPage.close();
    }

    await page.reload();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("link", { name: "Admin" }).first()).toBeVisible();
    await expect(
      page.evaluate(() =>
        Object.entries(window.localStorage)
          .filter(([name]) => name.startsWith("oidc.user:"))
          .sort(([left], [right]) => left.localeCompare(right)),
      ),
    ).resolves.toEqual(userStorageBeforeReload);
  });
});
