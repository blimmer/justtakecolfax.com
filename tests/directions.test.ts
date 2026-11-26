import { expect, test } from "./fixtures";

test("loads the Maps libraries with an API key", async ({ page }) => {
  const mapsScript = page.waitForRequest(
    "https://maps.googleapis.com/maps/api/js?**",
  );
  await page.goto("/directions/");

  const params = new URL((await mapsScript).url()).searchParams;
  expect(params.get("key")).toBeTruthy();
  expect(params.get("libraries")?.split(",").sort()).toEqual([
    "core",
    "maps",
    "places",
    "routes",
  ]);
});

test("explains when Google Maps doesn't load", async ({ page }) => {
  await page.goto("/directions/");

  await expect(page.getByRole("status")).toHaveText(
    "Google Maps didn't load. Try refreshing the page.",
  );
  await expect(page.getByRole("button", { name: "Route" })).toBeDisabled();
});
