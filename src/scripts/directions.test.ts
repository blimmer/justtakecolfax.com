import { describe, expect, test, vi } from "vitest";
import Directions from "../components/Directions.astro";
import { createTestContext } from "../testHelpers/createTestContext";
import {
  FakeGoogleMaps,
  FakeMapsRequestError,
} from "../testHelpers/FakeGoogleMaps";
import { FakeTimers } from "../testHelpers/FakeTimers";
import { renderComponent } from "../testHelpers/renderComponent";
import { setUpDirections } from "./directions";
import { query } from "./dom";

async function setUp() {
  await renderComponent(Directions);
  const google = new FakeGoogleMaps();
  const timers = new FakeTimers();
  const logger = { warn: vi.fn(), error: vi.fn() };
  const ctx = await createTestContext({
    google: google.libraries,
    timers,
    logger,
  });
  setUpDirections(ctx, query(document, "colfax-directions", HTMLElement));

  const input = (name: string) =>
    query(document, `input[name=${name}]`, HTMLInputElement);
  return {
    google,
    timers,
    logger,
    start: input("start"),
    end: input("end"),
    form: query(document, "form", HTMLFormElement),
    submitButton: query(document, "button[type=submit]", HTMLButtonElement),
    status: query(document, "[role=status]", HTMLElement),
    summary: query(document, "[data-trip-summary]", HTMLElement),
    listbox: query(document, "#start-suggestions", HTMLUListElement),
  };
}

function type(input: HTMLInputElement, text: string) {
  input.value = text;
  input.dispatchEvent(new Event("input"));
}

function press(input: HTMLInputElement, key: string) {
  input.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true }));
}

const vias = ({
  intermediates = [],
}: google.maps.routes.ComputeRoutesRequest) =>
  [...intermediates].map(({ via }) => via);

const options = (listbox: HTMLElement) =>
  [...listbox.querySelectorAll("[role=option]")].map(
    (option) => option.textContent,
  );

describe("address suggestions", () => {
  test("waits for a pause in typing before searching", async () => {
    const { google, timers, start, listbox } = await setUp();
    google.suggestions = [{ main: "1437 Bannock St", secondary: "Denver, CO" }];

    type(start, "1437 Ban");
    type(start, "1437 Bann");
    expect(google.suggestionRequests).toEqual([]);
    expect(timers.pendingCount).toBe(1);

    timers.runAll();
    await vi.waitFor(() =>
      expect(options(listbox)).toEqual(["1437 Bannock StDenver, CO"]),
    );
    expect(google.suggestionRequests).toMatchObject([{ input: "1437 Bann" }]);
    expect(start.ariaExpanded).toBe("true");
  });

  test("doesn't search for fewer than three characters", async () => {
    const { timers, start } = await setUp();

    type(start, "14");

    expect(timers.pendingCount).toBe(0);
  });

  test("picks a suggestion with the keyboard and routes from that place", async () => {
    const { google, timers, start, end, form, listbox } = await setUp();
    google.suggestions = [
      { main: "1437 Bannock St", secondary: "Denver, CO" },
      { main: "1437 Bannock Ave", secondary: "Aurora, CO" },
    ];
    type(start, "1437 Bannock");
    timers.runAll();
    await vi.waitFor(() => expect(options(listbox)).toHaveLength(2));

    press(start, "ArrowDown");
    press(start, "ArrowDown");
    expect(start.getAttribute("aria-activedescendant")).toBe(
      "start-suggestions-1",
    );
    press(start, "Enter");

    expect(start.value).toBe("1437 Bannock Ave, Aurora, CO");
    expect(start.ariaExpanded).toBe("false");

    type(end, "Aurora");
    timers.runAll();
    form.requestSubmit();
    await vi.waitFor(() => expect(google.routeRequests).not.toEqual([]));
    expect(google.routeRequests[0]).toMatchObject({
      origin: { id: "place:1437 Bannock Ave" },
      destination: "Aurora",
    });
  });

  test("closes the suggestions on Escape", async () => {
    const { google, timers, start, listbox } = await setUp();
    google.suggestions = [{ main: "1437 Bannock St", secondary: "Denver, CO" }];
    type(start, "1437 Bannock");
    timers.runAll();
    await vi.waitFor(() => expect(start.ariaExpanded).toBe("true"));

    press(start, "Escape");

    expect(start.ariaExpanded).toBe("false");
    expect(listbox.parentElement?.hidden).toBe(true);
  });

  test("still routes the typed text when suggestions fail", async () => {
    const { google, timers, logger, start, end, form, status } = await setUp();
    google.suggestionsError = new Error("OVER_QUERY_LIMIT");
    type(start, "1437 Bannock St");
    timers.runAll();
    await vi.waitFor(() =>
      expect(logger.warn).toHaveBeenCalledWith(google.suggestionsError),
    );

    type(end, "Aurora");
    form.requestSubmit();

    await vi.waitFor(() => expect(status.textContent).toMatch(/It's Colfax/));
    expect(google.routeRequests[0]).toMatchObject({
      origin: "1437 Bannock St",
    });
  });
});

describe("routing", () => {
  async function route(start: string, end: string) {
    const page = await setUp();
    type(page.start, start);
    type(page.end, end);
    page.form.requestSubmit();
    return page;
  }

  test("enables the Route button once Google Maps is ready", async () => {
    const { submitButton } = await setUp();

    expect(submitButton.disabled).toBe(false);
  });

  test("asks for both addresses", async () => {
    const { google, status } = await route("Capitol", "   ");

    expect(status.textContent).toBe("Enter both addresses.");
    expect(google.routeRequests).toEqual([]);
  });

  test("routes down Colfax and shows the drive time", async () => {
    const { google, status, summary } = await route("Capitol", "Aurora");

    await vi.waitFor(() => expect(summary.hidden).toBe(false));
    expect(status.textContent).toBe(
      "We found the best route. It's Colfax. It was always going to be Colfax.",
    );
    expect(summary.querySelector("[data-drive-time]")?.textContent).toBe(
      "25 min",
    );
    expect(google.routeRequests.map(vias)).toEqual([[], Array(6).fill(true)]);
    expect(google.polylines.filter(({ map }) => map)).toHaveLength(2);
    expect(google.fittedBounds).toHaveLength(1);
  });

  test("falls back to stops where Colfax can't be driven straight through", async () => {
    const page = await setUp();
    const { route } = page.google;
    page.google.route = (request) =>
      vias(request)[0] ? undefined : route(request);
    type(page.start, "Capitol");
    type(page.end, "Aurora");
    page.form.requestSubmit();

    await vi.waitFor(() => expect(page.summary.hidden).toBe(false));
    expect(
      page.google.routeRequests.map((request) => vias(request)[0]),
    ).toEqual([undefined, true, false]);
  });

  test("clears the previous route before drawing a new one", async () => {
    const page = await route("Capitol", "Aurora");
    await vi.waitFor(() => expect(page.submitButton.disabled).toBe(false));

    page.form.requestSubmit();

    await vi.waitFor(() => expect(page.google.polylines).toHaveLength(4));
    expect(page.google.polylines.map(({ map }) => !!map)).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });

  test("reports when no route exists", async () => {
    const page = await setUp();
    page.google.route = () => undefined;
    type(page.start, "Capitol");
    type(page.end, "Honolulu");
    page.form.requestSubmit();

    await vi.waitFor(() =>
      expect(page.status.textContent).toBe(
        "No route found. Even Colfax can't get you there.",
      ),
    );
  });

  test.each([
    [
      new FakeMapsRequestError("NOT_FOUND"),
      "We couldn't find that address. Check both addresses and try again.",
    ],
    [
      new Error("Failed to fetch"),
      "We can't reach Google Maps right now. Try again in a minute.",
    ],
  ])("reports %s", async (error, message) => {
    const page = await setUp();
    page.google.route = () => {
      throw error;
    };
    type(page.start, "Capitol");
    type(page.end, "Nowhere");
    page.form.requestSubmit();

    await vi.waitFor(() => expect(page.status.textContent).toBe(message));
    expect(page.logger.error).toHaveBeenCalledWith(error);
    expect(page.submitButton.disabled).toBe(false);
  });
});
