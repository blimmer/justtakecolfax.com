import { describe, expect, test } from "vitest";
import { colfaxWaypoints } from "./colfax";

const GOLDEN = { lat: 39.7555, lng: -105.2211 };
const CAPITOL = { lat: 39.7393, lng: -104.985 };
const CAPITOL_HILL = { lat: 39.7392, lng: -104.9779 };
const AURORA = { lat: 39.7294, lng: -104.8319 };
const BENNETT = { lat: 39.7586, lng: -104.4275 };

const COLFAX_WEST_END = { lat: 39.7182, lng: -105.2064 };
const COLFAX_EAST_END = { lat: 39.7402, lng: -104.741 };

const KM_PER_DEGREE_LNG = 111.32 * Math.cos((39.74 * Math.PI) / 180);

describe("colfaxWaypoints", () => {
  test("uses one waypoint between nearby addresses", () => {
    const [waypoint, ...rest] = colfaxWaypoints(CAPITOL, CAPITOL_HILL);

    expect(rest).toEqual([]);
    expect(waypoint?.lng).toBeCloseTo((CAPITOL.lng + CAPITOL_HILL.lng) / 2);
    expect(waypoint?.lat).toBeCloseTo(39.7401, 3);
  });

  test("spans the trip's longitudes, west to east", () => {
    const waypoints = colfaxWaypoints(CAPITOL, AURORA);

    expect(waypoints.at(0)?.lng).toBeCloseTo(CAPITOL.lng);
    expect(waypoints.at(-1)?.lng).toBeCloseTo(AURORA.lng);
    for (const [i, waypoint] of waypoints.slice(1).entries()) {
      const gapKm = (waypoint.lng - waypoints[i]!.lng) * KM_PER_DEGREE_LNG;
      expect(gapKm).toBeGreaterThan(0);
      expect(gapKm).toBeLessThanOrEqual(3);
    }
  });

  test("orders waypoints east to west for westbound trips", () => {
    const eastbound = colfaxWaypoints(CAPITOL, AURORA);
    const westbound = colfaxWaypoints(AURORA, CAPITOL);

    expect(westbound).toEqual(eastbound.toReversed());
  });

  test("clamps addresses past either end of Colfax to that end", () => {
    const waypoints = colfaxWaypoints(GOLDEN, BENNETT);

    expect(waypoints.at(0)).toEqual(COLFAX_WEST_END);
    expect(waypoints.at(-1)).toEqual(COLFAX_EAST_END);
  });

  test("caps a full-length trip at 10 waypoints", () => {
    expect(colfaxWaypoints(GOLDEN, BENNETT)).toHaveLength(10);
  });

  test("keeps every waypoint on Colfax", () => {
    for (const { lat } of colfaxWaypoints(GOLDEN, BENNETT)) {
      expect(lat).toBeGreaterThanOrEqual(COLFAX_WEST_END.lat);
      expect(lat).toBeLessThanOrEqual(COLFAX_EAST_END.lat);
    }
  });
});
