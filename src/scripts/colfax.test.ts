import { describe, expect, test } from "vitest";
import { colfaxWaypoints } from "./colfax";
import checkpoints from "./colfax-checkpoints.json";

const GOLDEN = { lat: 39.7555, lng: -105.2211 };
const BAKER = { lat: 39.7175, lng: -104.994 };
const WEST_HIGHLAND = { lat: 39.7631, lng: -105.0346 };
const CAPITOL = { lat: 39.7393, lng: -104.985 };
const CAPITOL_HILL = { lat: 39.7392, lng: -104.9779 };
const AURORA = { lat: 39.7294, lng: -104.8319 };
const BENNETT = { lat: 39.7586, lng: -104.4275 };

const KM_PER_DEGREE_LNG = 111.32 * Math.cos((39.74 * Math.PI) / 180);

describe("colfaxWaypoints", () => {
  test("uses one waypoint between nearby addresses", () => {
    const [waypoint, ...rest] = colfaxWaypoints(CAPITOL, CAPITOL_HILL);

    expect(rest).toEqual([]);
    expect(waypoint?.lng).toBeGreaterThanOrEqual(CAPITOL.lng);
    expect(waypoint?.lng).toBeLessThanOrEqual(CAPITOL_HILL.lng);
  });

  test("spans the trip's longitudes, west to east", () => {
    const waypoints = colfaxWaypoints(CAPITOL, AURORA);

    expect(waypoints.at(0)?.lng).toBeCloseTo(CAPITOL.lng, 2);
    expect(waypoints.at(-1)?.lng).toBeCloseTo(AURORA.lng, 2);
    for (const [i, waypoint] of waypoints.slice(1).entries()) {
      const gapKm = (waypoint.lng - waypoints[i]!.lng) * KM_PER_DEGREE_LNG;
      expect(gapKm).toBeGreaterThan(0);
      expect(gapKm).toBeLessThanOrEqual(3);
    }
  });

  test("keeps waypoints between the trip's longitudes", () => {
    for (const { lng } of colfaxWaypoints(BAKER, WEST_HIGHLAND)) {
      expect(lng).toBeGreaterThanOrEqual(WEST_HIGHLAND.lng);
      expect(lng).toBeLessThanOrEqual(BAKER.lng);
    }
  });

  test("uses eastbound checkpoints for eastbound trips", () => {
    for (const waypoint of colfaxWaypoints(CAPITOL, AURORA)) {
      expect(checkpoints.eastbound).toContainEqual(waypoint);
    }
  });

  test("uses westbound checkpoints, east to west, for westbound trips", () => {
    const waypoints = colfaxWaypoints(BAKER, WEST_HIGHLAND);

    for (const waypoint of waypoints) {
      expect(checkpoints.westbound).toContainEqual(waypoint);
    }
    expect(waypoints.map(({ lng }) => lng)).toEqual(
      waypoints.map(({ lng }) => lng).toSorted((a, b) => b - a),
    );
  });

  test("clamps addresses past either end of Colfax to that end", () => {
    const waypoints = colfaxWaypoints(GOLDEN, BENNETT);

    expect(waypoints.at(0)).toEqual(checkpoints.eastbound.at(0));
    expect(waypoints.at(-1)).toEqual(checkpoints.eastbound.at(-1));
  });

  test("caps a full-length trip at 10 waypoints", () => {
    expect(colfaxWaypoints(GOLDEN, BENNETT)).toHaveLength(10);
  });
});
