import { describe, expect, test } from "bun:test";
import { getPriceLabel, formatPriceBadge } from "./priceLabel";
import bookmarksFixture from "../../tests/fixtures/bookmarks.json";

describe("getPriceLabel", () => {
  test("returns null when no queryPayload", () => {
    expect(getPriceLabel(undefined)).toBeNull();
  });

  test("returns null when no filters", () => {
    expect(getPriceLabel({ query: {} })).toBeNull();
  });

  test("returns null when no trade_filters", () => {
    expect(getPriceLabel({ query: { filters: {} } })).toBeNull();
  });

  test("returns null when no price filter", () => {
    expect(
      getPriceLabel({
        query: {
          filters: {
            trade_filters: { filters: {} },
          },
        },
      })
    ).toBeNull();
  });

  test("returns null when max is null (currency only, no value)", () => {
    // Real case: Expedition Logbook - has currency selected but no max value
    const logbook = bookmarksFixture.trades["z7aitoy01jmjvabm3j"][0];
    expect(getPriceLabel(logbook.queryPayload as any)).toBeNull();
  });

  test("returns exalted when option is null (Exalted Orb Equivalent)", () => {
    // Real case: Expedition Tablet - uses default "Exalted Orb Equivalent" (option: null)
    const tablet = bookmarksFixture.trades["z7aitoy01jmjvabm3j"][2];
    const result = getPriceLabel(tablet.queryPayload as any);
    expect(result).toEqual({ max: 20, currency: "exalted" });
  });

  test("returns chaos when option is chaos", () => {
    // Real case: T15 Maps - uses Chaos Orb
    const maps = bookmarksFixture.trades["z7aitoy01jmjvabm3j"][1];
    const result = getPriceLabel(maps.queryPayload as any);
    expect(result).toEqual({ max: 5, currency: "chaos" });
  });

  test("returns chaos for Precursor Tablet", () => {
    // Real case: Precursor Tablet - max 1 chaos
    const precursor = bookmarksFixture.trades["z7aitoy01jmjvabm3j"][3];
    const result = getPriceLabel(precursor.queryPayload as any);
    expect(result).toEqual({ max: 1, currency: "chaos" });
  });
});

describe("formatPriceBadge", () => {
  test("formats exalted as ex", () => {
    expect(formatPriceBadge({ max: 200, currency: "exalted" })).toBe("≤200ex");
  });

  test("formats chaos as c", () => {
    expect(formatPriceBadge({ max: 50, currency: "chaos" })).toBe("≤50c");
  });

  test("formats divine as div", () => {
    expect(formatPriceBadge({ max: 10, currency: "divine" })).toBe("≤10div");
  });

  test("truncates unknown currency to 3 chars", () => {
    expect(formatPriceBadge({ max: 5, currency: "unknown_currency" })).toBe("≤5unk");
  });

  test("formats real bookmark data correctly", () => {
    // Expedition Tablet: ≤20ex (Exalted Orb Equivalent)
    const tablet = bookmarksFixture.trades["z7aitoy01jmjvabm3j"][2];
    const tabletPrice = getPriceLabel(tablet.queryPayload as any);
    expect(formatPriceBadge(tabletPrice!)).toBe("≤20ex");

    // T15 Maps: ≤5c (Chaos)
    const maps = bookmarksFixture.trades["z7aitoy01jmjvabm3j"][1];
    const mapsPrice = getPriceLabel(maps.queryPayload as any);
    expect(formatPriceBadge(mapsPrice!)).toBe("≤5c");

    // Precursor Tablet: ≤1c (Chaos)
    const precursor = bookmarksFixture.trades["z7aitoy01jmjvabm3j"][3];
    const precursorPrice = getPriceLabel(precursor.queryPayload as any);
    expect(formatPriceBadge(precursorPrice!)).toBe("≤1c");
  });
});
