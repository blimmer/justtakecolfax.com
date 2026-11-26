import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { GOOGLE_MAPS_API_KEY } from "astro:env/client";
import { colfaxWaypoints } from "./colfax";
import { query } from "./dom";

const DENVER = { lat: 39.737818, lng: -104.984665 };

declare global {
  interface Window {
    /** Called by Google Maps when the API key is rejected. */
    gm_authFailure?: () => void;
  }
}

const formatMinutes = (millis: number) => `${Math.round(millis / 60_000)} min`;

/**
 * Wraps the directions page markup and routes every trip down Colfax.
 */
export class ColfaxDirections extends HTMLElement {
  connectedCallback() {
    void this.init();
  }

  private async init() {
    const form = query(this, "form", HTMLFormElement);
    const submitButton = query(form, "button[type=submit]", HTMLButtonElement);
    const status = query(this, "[role=status]", HTMLElement);
    const mapElement = query(this, "[data-map]", HTMLElement);
    const summary = query(this, "[data-trip-summary]", HTMLElement);
    const driveTime = query(summary, "[data-drive-time]", HTMLElement);

    const styles = getComputedStyle(this);
    const cssColor = (name: string) => styles.getPropertyValue(name).trim();

    window.gm_authFailure = () => {
      submitButton.disabled = true;
      status.textContent =
        "Google Maps rejected this site's key, so directions are unavailable.";
    };

    setOptions({ key: GOOGLE_MAPS_API_KEY, v: "weekly" });

    let core: google.maps.CoreLibrary;
    let maps: google.maps.MapsLibrary;
    let routes: google.maps.RoutesLibrary;
    try {
      [core, maps, routes] = await Promise.all([
        importLibrary("core"),
        importLibrary("maps"),
        importLibrary("routes"),
      ]);
    } catch {
      status.textContent = "Google Maps didn't load. Try refreshing the page.";
      return;
    }

    const map = new maps.Map(mapElement, {
      center: DENVER,
      zoom: 10,
      colorScheme: "DARK",
      backgroundColor: cssColor("--color-map"),
      mapTypeControl: false,
      streetViewControl: false,
    });
    let polylines: google.maps.Polyline[] = [];

    const computeRoute = async (
      request: Omit<google.maps.routes.ComputeRoutesRequest, "travelMode">,
    ) => {
      const { routes: results } = await routes.Route.computeRoutes({
        ...request,
        travelMode: "DRIVING",
      });
      return results?.[0];
    };

    const addressReader = (name: string) => {
      const input = query(form, `input[name=${name}]`, HTMLInputElement);
      return () => input.value.trim();
    };
    const readStart = addressReader("start");
    const readEnd = addressReader("end");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const origin = readStart();
      const destination = readEnd();
      if (!origin || !destination) {
        status.textContent = "Enter both addresses.";
        return;
      }

      submitButton.disabled = true;
      status.textContent = "Finding your route…";
      summary.hidden = true;
      polylines.forEach((polyline) => polyline.setMap(null));
      polylines = [];
      try {
        // Only used to find where the trip starts and ends; never shown.
        const direct = await computeRoute({
          origin,
          destination,
          fields: ["path"],
        });
        const start = direct?.path?.at(0);
        const end = direct?.path?.at(-1);
        if (!start || !end) {
          status.textContent =
            "No route found. Even Colfax can't get you there.";
          return;
        }

        const waypoints = colfaxWaypoints(start, end);
        const routeViaColfax = (via: boolean) =>
          computeRoute({
            origin,
            destination,
            intermediates: waypoints.map((location) => ({ location, via })),
            fields: ["path", "viewport", "durationMillis"],
          });
        // Pass-through waypoints return no route where Colfax can't be driven
        // straight through (e.g. near the Speer interchange); stops can.
        const colfax =
          (await routeViaColfax(true)) ?? (await routeViaColfax(false));
        if (!colfax) {
          status.textContent = "Somehow, Colfax couldn't get you there.";
          return;
        }

        polylines = [
          { strokeColor: cssColor("--color-pink"), strokeWeight: 9, zIndex: 1 },
          {
            strokeColor: cssColor("--color-pink-core"),
            strokeWeight: 2.5,
            zIndex: 2,
          },
        ].flatMap((polylineOptions) =>
          colfax.createPolylines({ polylineOptions }),
        );
        polylines.forEach((polyline) => polyline.setMap(map));

        if (colfax.viewport) map.fitBounds(colfax.viewport);

        status.textContent =
          "We found the best route. It's Colfax. It was always going to be Colfax.";
        driveTime.textContent = formatMinutes(colfax.durationMillis ?? 0);
        summary.hidden = false;
      } catch (error) {
        console.error(error);
        const addressNotFound =
          error instanceof core.MapsRequestError &&
          (error.code === "NOT_FOUND" || error.code === "INVALID_ARGUMENT");
        status.textContent = addressNotFound
          ? "We couldn't find that address. Check both addresses and try again."
          : "We can't reach Google Maps right now. Try again in a minute.";
      } finally {
        submitButton.disabled = false;
      }
    });

    submitButton.disabled = false;
  }
}
