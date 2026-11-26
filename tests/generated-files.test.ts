import { expect, test } from "@playwright/test";

const SITE = "https://justtakecolfax.com";

test("the Open Graph image is a 1200x630 PNG", async ({ request }) => {
  const response = await request.get("/og.png");
  expect(response.headers()["content-type"]).toBe("image/png");

  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});

test("the sitemap lists every page except the 404", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    ([, url]) => url,
  );

  expect(urls.sort()).toEqual([`${SITE}/`, `${SITE}/directions/`]);
});
