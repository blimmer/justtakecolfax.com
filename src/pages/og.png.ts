import { Resvg } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { experimental_getFontFileURL, fontData } from "astro:assets";

const glow = (id: string, color: string) => `
  <filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
    <feFlood flood-color="${color}" result="color"/>
    <feComposite in="color" in2="SourceAlpha" operator="in"/>
    <feMorphology operator="dilate" radius="2" result="tube"/>
    <feGaussianBlur in="tube" stdDeviation="5" result="near"/>
    <feGaussianBlur in="tube" stdDeviation="16" result="far"/>
    <feMerge>
      <feMergeNode in="far"/><feMergeNode in="far"/>
      <feMergeNode in="near"/><feMergeNode in="tube"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>`;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    ${glow("pink", "#ff2e88")}
    ${glow("cyan", "#2ee6ff")}
    <radialGradient id="haze" cx="0.1" cy="0" r="0.7">
      <stop offset="0" stop-color="#ff2e88" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#ff2e88" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0c0a10"/>
  <rect width="1200" height="630" fill="url(#haze)"/>
  <text x="600" y="205" text-anchor="middle" font-family="Monoton" font-size="96" fill="#d9fbff" filter="url(#cyan)">JUST TAKE</text>
  <g transform="rotate(-5 600 385)">
    <text x="600" y="450" text-anchor="middle" font-family="Yellowtail" font-size="260" fill="#ffd9ea" filter="url(#pink)">Colfax!</text>
  </g>
</svg>`;

const downloadTtf = async (
  cssVariable: keyof typeof fontData,
  requestUrl: URL,
  dir: string,
) => {
  const src = fontData[cssVariable]
    .flatMap((font) => font.src)
    .find((source) => source.format === "truetype");
  if (!src) throw new Error(`No TTF file for ${cssVariable}`);
  const response = await fetch(
    experimental_getFontFileURL(src.url, requestUrl),
  );
  const file = join(dir, `${cssVariable.slice(2)}.ttf`);
  await writeFile(file, new Uint8Array(await response.arrayBuffer()));
  return file;
};

export const GET: APIRoute = async ({ url }) => {
  const dir = await mkdtemp(join(tmpdir(), "og-fonts-"));
  try {
    const fontFiles = await Promise.all([
      downloadTtf("--font-og-yellowtail", url, dir),
      downloadTtf("--font-og-monoton", url, dir),
    ]);
    const png = new Resvg(svg, { font: { fontFiles, loadSystemFonts: false } })
      .render()
      .asPng();
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png" },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};
