import type { GoogleMaps } from "../scripts/context";

type LatLng = google.maps.LatLngLiteral;

export interface FakeSuggestion {
  main: string;
  secondary: string;
}

export interface FakeRoute {
  path: LatLng[];
  durationMillis?: number;
}

export class FakeMapsRequestError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export class FakePolyline {
  map: unknown = null;
  readonly options: google.maps.PolylineOptions;

  constructor(options: google.maps.PolylineOptions) {
    this.options = options;
  }

  setMap(map: unknown) {
    this.map = map;
  }
}

/** Scripted stand-ins for the Google Maps libraries that record each request. */
export class FakeGoogleMaps {
  suggestions: FakeSuggestion[] = [];
  suggestionsError: Error | undefined;
  /** Answers each computeRoutes request; `undefined` means no route. */
  route: (
    request: google.maps.routes.ComputeRoutesRequest,
  ) => FakeRoute | undefined = () => ({
    path: [
      { lat: 39.7393, lng: -104.985 },
      { lat: 39.7294, lng: -104.8319 },
    ],
    durationMillis: 25 * 60_000,
  });

  readonly suggestionRequests: google.maps.places.AutocompleteRequest[] = [];
  readonly routeRequests: google.maps.routes.ComputeRoutesRequest[] = [];
  readonly polylines: FakePolyline[] = [];
  readonly fittedBounds: unknown[] = [];

  get libraries(): GoogleMaps {
    const fake = this;

    const core = { MapsRequestError: FakeMapsRequestError };

    const maps = {
      Map: class {
        fitBounds(bounds: unknown) {
          fake.fittedBounds.push(bounds);
        }
      },
    };

    const routes = {
      Route: {
        async computeRoutes(request: google.maps.routes.ComputeRoutesRequest) {
          fake.routeRequests.push(request);
          const route = fake.route(request);
          if (!route) return { routes: [] };
          return {
            routes: [
              {
                path: route.path,
                durationMillis: route.durationMillis,
                viewport: { north: 1, south: 0, east: 1, west: 0 },
                createPolylines({
                  polylineOptions = {},
                }: {
                  polylineOptions?: google.maps.PolylineOptions;
                }) {
                  const polyline = new FakePolyline(polylineOptions);
                  fake.polylines.push(polyline);
                  return [polyline];
                },
              },
            ],
          };
        },
      },
    };

    const places = {
      AutocompleteSessionToken: class {},
      PlaceAttributionElement: class {
        constructor() {
          return document.createElement("gmp-place-attribution");
        }
      },
      AutocompleteSuggestion: {
        async fetchAutocompleteSuggestions(
          request: google.maps.places.AutocompleteRequest,
        ) {
          fake.suggestionRequests.push(request);
          if (fake.suggestionsError) throw fake.suggestionsError;
          return {
            suggestions: fake.suggestions.map(({ main, secondary }) => ({
              placePrediction: {
                text: { text: `${main}, ${secondary}` },
                mainText: { text: main },
                secondaryText: { text: secondary },
                toPlace: () => ({ id: `place:${main}` }),
              },
            })),
          };
        },
      },
    };

    return {
      core: core as unknown as google.maps.CoreLibrary,
      maps: maps as unknown as google.maps.MapsLibrary,
      routes: routes as unknown as google.maps.RoutesLibrary,
      places: places as unknown as google.maps.PlacesLibrary,
    };
  }
}
