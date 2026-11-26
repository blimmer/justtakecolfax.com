import { expect, test } from "./fixtures";

const SITE = "https://justtakecolfax.com";

for (const path of ["/", "/directions/"]) {
  test(`${path} has a canonical URL and Open Graph tags`, async ({ page }) => {
    await page.goto(path);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${SITE}${path}`,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      `${SITE}${path}`,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${SITE}/og.png`,
    );
  });
}
