/**
 * Regenerates src/scripts/colfax-checkpoints.json: points every 200 m along
 * each side of Colfax that Google routes straight along Colfax.
 *
 * Reads GOOGLE_MAPS_API_KEY from .env and makes about 350 Routes API
 * requests. Run with `node scripts/colfax-checkpoints.ts`.
 */
import { loadEnvFile } from "node:process";
import { writeFileSync } from "node:fs";

type LatLng = { lat: number; lng: number };
type Direction = "eastbound" | "westbound";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const OUTPUT = new URL(
  "../src/scripts/colfax-checkpoints.json",
  import.meta.url,
);

const WEST_LNG = -105.206;
const EAST_LNG = -104.742;
const SPACING_KM = 0.2;
// Each check drives from this many checkpoints before to as many after.
const CHECK_SPAN = 4;
const MAX_DETOUR_RATIO = 1.1;
const MAX_DETOUR_M = 50;
const CONCURRENCY = 8;

const KM_PER_DEGREE_LNG = 111.32 * Math.cos((39.74 * Math.PI) / 180);

loadEnvFile(".env");
const apiKey = process.env["GOOGLE_MAPS_API_KEY"];
if (!apiKey) throw new Error("Set GOOGLE_MAPS_API_KEY in .env.");

/** Colfax's one-way segments in each direction, from OpenStreetMap. */
async function fetchSegments(): Promise<Record<Direction, [LatLng, LatLng][]>> {
  const query = `[out:json][timeout:90];
    way["highway"="primary"]["name"~"Colfax Avenue$"](39.70,-105.23,39.77,-104.72);
    out geom tags;`;
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    body: new URLSearchParams({ data: query }),
  });
  if (!response.ok) throw new Error(`Overpass: ${response.status}`);
  const { elements } = (await response.json()) as {
    elements: {
      tags: Record<string, string>;
      geometry: { lat: number; lon: number }[];
    }[];
  };

  const segments: Record<Direction, [LatLng, LatLng][]> = {
    eastbound: [],
    westbound: [],
  };
  for (const { tags, geometry } of elements) {
    const points = geometry.map(({ lat, lon }) => ({ lat, lng: lon }));
    for (const [i, a] of points.slice(0, -1).entries()) {
      const b = points[i + 1]!;
      if (a.lng === b.lng) continue;
      const eastward = b.lng > a.lng;
      segments[eastward ? "eastbound" : "westbound"].push([a, b]);
      if (tags["oneway"] !== "yes") {
        segments[eastward ? "westbound" : "eastbound"].push([b, a]);
      }
    }
  }
  return segments;
}

/** Points every SPACING_KM along one direction's carriageway, west to east. */
function sample(segments: [LatLng, LatLng][]): LatLng[] {
  const step = SPACING_KM / KM_PER_DEGREE_LNG;
  const points: LatLng[] = [];
  for (let lng = WEST_LNG; lng < EAST_LNG; lng += step) {
    const segment = segments.find(
      ([a, b]) =>
        Math.min(a.lng, b.lng) <= lng && lng <= Math.max(a.lng, b.lng),
    );
    if (!segment) continue;
    const [a, b] = segment;
    const t = (lng - a.lng) / (b.lng - a.lng);
    points.push({
      lat: +(a.lat + (b.lat - a.lat) * t).toFixed(6),
      lng: +lng.toFixed(5),
    });
  }
  return points;
}

function distanceM(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

async function routeDistanceM(
  origin: LatLng,
  via: LatLng,
  destination: LatLng,
): Promise<number | undefined> {
  const location = ({ lat, lng }: LatLng) => ({
    location: { latLng: { latitude: lat, longitude: lng } },
  });
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey!,
        "X-Goog-FieldMask": "routes.distanceMeters",
        // The dev key only allows this referrer.
        Referer: "http://localhost:4321/",
      },
      body: JSON.stringify({
        travelMode: "DRIVE",
        origin: location(origin),
        destination: location(destination),
        intermediates: [{ via: true, ...location(via) }],
      }),
    });
    if (response.status === 429 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
      continue;
    }
    if (!response.ok) {
      throw new Error(
        `Routes API: ${response.status} ${await response.text()}`,
      );
    }
    const { routes } = (await response.json()) as {
      routes?: { distanceMeters?: number }[];
    };
    return routes?.[0]?.distanceMeters;
  }
}

/** The points Google routes through without leaving Colfax, west to east. */
async function checkpoints(points: LatLng[], direction: Direction) {
  const ordered = direction === "eastbound" ? points : points.toReversed();
  const checks = ordered
    .slice(CHECK_SPAN, -CHECK_SPAN)
    .map((point, i) => async () => {
      const stretch = ordered.slice(i, i + 2 * CHECK_SPAN + 1);
      const alongM = stretch
        .slice(1)
        .reduce((sum, b, k) => sum + distanceM(stretch[k]!, b), 0);
      const routeM = await routeDistanceM(stretch[0]!, point, stretch.at(-1)!);
      const ok =
        routeM !== undefined &&
        routeM <= alongM * MAX_DETOUR_RATIO + MAX_DETOUR_M;
      return ok ? point : undefined;
    });

  const results: (LatLng | undefined)[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < checks.length) {
        const i = next++;
        results[i] = await checks[i]!();
      }
    }),
  );
  const passed = results.filter((point) => point !== undefined);
  return passed.sort((a, b) => a.lng - b.lng);
}

const segments = await fetchSegments();
const output: Record<Direction, LatLng[]> = {
  eastbound: await checkpoints(sample(segments.eastbound), "eastbound"),
  westbound: await checkpoints(sample(segments.westbound), "westbound"),
};
const json = (points: LatLng[]) =>
  points
    .map(({ lat, lng }) => `    { "lat": ${lat}, "lng": ${lng} }`)
    .join(",\n");
writeFileSync(
  OUTPUT,
  `{\n  "eastbound": [\n${json(output.eastbound)}\n  ],\n  "westbound": [\n${json(output.westbound)}\n  ]\n}\n`,
);
console.log(
  `Wrote ${output.eastbound.length} eastbound and ${output.westbound.length} westbound checkpoints.`,
);
