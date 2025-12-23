import { expect, test, describe } from "bun:test";
import { buildSearchQuery, buildTradeRequest, getUniqueItemName, clearStatsCache } from "./search.js";
import stats from "../tests/fixtures/stats.json";

const gloves1 = await Bun.file("tests/fixtures/gloves1.txt").text();
const rings1 = await Bun.file("tests/fixtures/rings1.txt").text();
const charm2 = await Bun.file("tests/fixtures/charm2.txt").text();

describe("buildSearchQuery", () => {
  test("builds query from item text with provided stats", async () => {
    const query = await buildSearchQuery(gloves1, { stats });

    expect(query).toHaveProperty("stats");
    expect(query.stats).toBeInstanceOf(Array);
    expect(query.stats.length).toBeGreaterThan(0);
  });

  test("includes pseudo resistance stats", async () => {
    const query = await buildSearchQuery(gloves1, { stats });

    // Should have resistance stats as pseudo
    const hasResistances = query.stats.some(group =>
      group.filters.some(f => f.id.startsWith("pseudo.pseudo_total_"))
    );
    expect(hasResistances).toBe(true);
  });

  test("throws on invalid input", async () => {
    await expect(buildSearchQuery("")).rejects.toThrow();
    await expect(buildSearchQuery(null)).rejects.toThrow();
    await expect(buildSearchQuery(123)).rejects.toThrow();
  });
});

describe("getUniqueItemName", () => {
  test("returns unique item name", () => {
    expect(getUniqueItemName(rings1)).toBe("Polcirkeln");
    expect(getUniqueItemName(charm2)).toBe("Nascent Hope");
  });

  test("returns undefined for non-unique", () => {
    expect(getUniqueItemName(gloves1)).toBeUndefined();
  });
});

describe("buildTradeRequest", () => {
  test("builds complete trade API request", async () => {
    const request = await buildTradeRequest(gloves1, { stats });

    expect(request).toHaveProperty("query");
    expect(request).toHaveProperty("sort");
    expect(request.query).toHaveProperty("status");
    expect(request.query).toHaveProperty("stats");
    expect(request.sort).toEqual({ price: "asc" });
  });

  test("includes term for unique items", async () => {
    const request = await buildTradeRequest(rings1, { stats });

    expect(request.query.term).toBe("Polcirkeln");
  });
});
