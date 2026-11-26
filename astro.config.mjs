// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig, envField, fontProviders } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://justtakecolfax.com",
  trailingSlash: "always",
  env: {
    schema: {
      GOOGLE_MAPS_API_KEY: envField.string({
        context: "client",
        access: "public",
      }),
    },
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Barlow Condensed",
      cssVariable: "--font-barlow-condensed",
      weights: [400, 600, 700],
      styles: ["normal"],
      fallbacks: ["Arial Narrow", "sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "Yellowtail",
      cssVariable: "--font-yellowtail",
      styles: ["normal"],
      fallbacks: ["cursive"],
    },
    {
      provider: fontProviders.google(),
      name: "Monoton",
      cssVariable: "--font-monoton",
      styles: ["normal"],
      fallbacks: ["sans-serif"],
    },
  ],

  integrations: [sitemap()],
});
