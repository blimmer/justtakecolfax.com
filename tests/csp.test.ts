import { expect, test } from "./fixtures";

for (const path of ["/", "/directions/", "/no-such-page/"]) {
  test(`${path} loads without Content Security Policy violations`, async ({
    page,
    cspViolations,
  }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    expect(cspViolations).toEqual([]);
  });
}
