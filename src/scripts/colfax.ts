type LatLng = google.maps.LatLngLiteral;

/**
 * Colfax Ave (US-40) from Golden to E-470, west to east. Simplified from
 * OpenStreetMap data, © OpenStreetMap contributors (ODbL).
 */
const COLFAX: [LatLng, ...LatLng[]] = [
  { lat: 39.7182, lng: -105.2064 },
  { lat: 39.7266, lng: -105.186 },
  { lat: 39.7333, lng: -105.1621 },
  { lat: 39.7382, lng: -105.1541 },
  { lat: 39.7401, lng: -105.138 },
  { lat: 39.7402, lng: -104.741 },
];

// Closer than this, one waypoint is enough.
const MIN_COLFAX_STRETCH_KM = 1.5;
// Waypoints this far apart keep the route on Colfax instead of crossing it.
const WAYPOINT_SPACING_KM = 3;
// Routes API bills more than 10 intermediate waypoints at a higher tier.
const MAX_WAYPOINTS = 10;

const KM_PER_DEGREE_LNG = 111.32 * Math.cos((39.74 * Math.PI) / 180);

/** The point on Colfax at `lng`, or the nearest end of Colfax. */
function colfaxAt(lng: number): LatLng {
  let west = COLFAX[0];
  if (lng <= west.lng) return west;
  for (const east of COLFAX.slice(1)) {
    if (lng <= east.lng) {
      const t = (lng - west.lng) / (east.lng - west.lng);
      return { lat: west.lat + (east.lat - west.lat) * t, lng };
    }
    west = east;
  }
  return west;
}

/**
 * Returns waypoints that keep a trip on Colfax: evenly spaced along Colfax
 * between the start's and the end's longitudes.
 */
export function colfaxWaypoints(start: LatLng, end: LatLng): LatLng[] {
  const enter = colfaxAt(start.lng).lng;
  const exit = colfaxAt(end.lng).lng;
  const stretchKm = Math.abs(exit - enter) * KM_PER_DEGREE_LNG;

  if (stretchKm < MIN_COLFAX_STRETCH_KM) {
    return [colfaxAt((enter + exit) / 2)];
  }

  const count = Math.min(
    Math.ceil(stretchKm / WAYPOINT_SPACING_KM) + 1,
    MAX_WAYPOINTS,
  );
  return Array.from({ length: count }, (_, i) =>
    colfaxAt(enter + ((exit - enter) * i) / (count - 1)),
  );
}
