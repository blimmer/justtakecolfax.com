import { expect, test } from "./fixtures";

test("the home page sends visitors to directions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /just take Colfax!/,
  );

  await page.getByRole("link", { name: "Let's Drive" }).click();

  await expect(page).toHaveURL("/directions/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Directions",
  );
});

for (const [path, current] of [
  ["/", "Home"],
  ["/directions/", "Directions"],
]) {
  test(`the header marks ${current} as the current page`, async ({ page }) => {
    await page.goto(path!);

    await expect(page.locator('header [aria-current="page"]')).toHaveText(
      current!,
    );
  });
}

test("unknown pages get the 404 page", async ({ page }) => {
  const response = await page.goto("/no-such-page/");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Room 404 doesn't exist.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
