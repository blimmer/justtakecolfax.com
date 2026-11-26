import { createContext, type Context } from "../scripts/context";
import { FakeGoogleMaps } from "./FakeGoogleMaps";
import { FakeTimers } from "./FakeTimers";

export async function createTestContext(overrides: Partial<Context> = {}) {
  return createContext({
    google: new FakeGoogleMaps().libraries,
    logger: { warn: () => {}, error: () => {} },
    timers: new FakeTimers(),
    ...overrides,
  });
}
