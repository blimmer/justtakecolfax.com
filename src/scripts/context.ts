import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { GOOGLE_MAPS_API_KEY } from "astro:env/client";

export interface GoogleMaps {
  readonly core: google.maps.CoreLibrary;
  readonly maps: google.maps.MapsLibrary;
  readonly routes: google.maps.RoutesLibrary;
  readonly places: google.maps.PlacesLibrary;
}

export interface Timers {
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(id: number | undefined): void;
}

export interface Context {
  readonly google: GoogleMaps;
  readonly logger: Pick<Console, "warn" | "error">;
  readonly timers: Timers;
}

async function loadGoogleMaps(key: string): Promise<GoogleMaps> {
  setOptions({ key, v: "weekly" });
  const [core, maps, routes, places] = await Promise.all([
    importLibrary("core"),
    importLibrary("maps"),
    importLibrary("routes"),
    importLibrary("places"),
  ]);
  return { core, maps, routes, places };
}

/** Rejects when the Google Maps libraries don't load. */
export async function createContext(
  overrides: Partial<Context> = {},
): Promise<Context> {
  const {
    google = await loadGoogleMaps(GOOGLE_MAPS_API_KEY),
    logger = console,
    timers = {
      setTimeout: (callback, ms) => window.setTimeout(callback, ms),
      clearTimeout: (id) => window.clearTimeout(id),
    },
  } = overrides;
  return { google, logger, timers };
}
