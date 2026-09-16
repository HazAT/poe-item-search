import { describe, expect, test } from "bun:test";
import { searchItem } from "./itemSearch";

const ITEM = `Item Class: Rings
Rarity: Rare
Doom Circle
Gold Ring
--------
+80 to maximum Life`;
const STATS = {
  result: [{ entries: [{ id: "explicit.stat_3299347043", text: "+# to maximum Life", type: "explicit" }] }],
};
const POE2_URL = "https://www.pathofexile.com/trade2/search/poe2/Standard/old-search";
const SEARCH_KEY = "poe-search-extension-initiated";

function setup(responses: Response[], preferences: Record<string, string> = {}) {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const values = new Map(Object.entries(preferences));
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const request = async (url: string, init?: RequestInit) => {
    requests.push({ url, init });
    const response = responses.shift();
    if (!response) throw new Error("Unexpected request");
    return response;
  };
  return { request, storage, requests, values };
}

describe("searchItem", () => {
  test.each([
    ["https://www.pathofexile.com/trade/search/Standard", "trade/search/Standard"],
    ["https://www.pathofexile.com/trade/search/Standard/old-search", "trade/search/Standard"],
    ["https://www.pathofexile.com/trade/search/Keepers%20of%20the%20Flame/old-search", "trade/search/Keepers%20of%20the%20Flame"],
    ["https://www.pathofexile.com/trade/search/xbox/Standard/old-search", "trade/search/xbox/Standard"],
    [POE2_URL, "trade2/search/poe2/Standard"],
    ["https://www.pathofexile.com/trade2/search/poe2/Standard/old-search/live?x=1", "trade2/search/poe2/Standard"],
    ["https://www.pathofexile.com/trade2", "trade2/search/poe2/Standard"],
    ["https://www.pathofexile.com/trade", "trade/search/Standard"],
  ])("posts to the league endpoint for %s", async (url, expectedPath) => {
    const dependencies = setup([Response.json(STATS), Response.json({ id: "new-search", total: 5 })]);
    const result = await searchItem(ITEM, url, dependencies);
    expect(dependencies.requests[1].url).toBe(`https://www.pathofexile.com/api/${expectedPath}`);
    expect(result.url).toBe(`https://www.pathofexile.com/${expectedPath}/new-search`);
    expect(result.location.slug).toBe("new-search");
    expect(result.title).toBe("Doom Circle");
  });

  test.each([
    [POE2_URL, "trade2", "securable"],
    ["https://www.pathofexile.com/trade/search/Standard", "trade", "online"],
  ])("preserves item filters and the selected status on %s", async (url, version, status) => {
    const dependencies = setup(
      [Response.json(STATS), Response.json({ id: "new-search", total: 0 })],
      { [`lscache-${version}state`]: JSON.stringify({ status }) },
    );
    const result = await searchItem(ITEM, url, dependencies);
    expect(dependencies.requests[0].url).toBe(`https://www.pathofexile.com/api/${version}/data/stats`);
    expect(result.queryPayload.query).toMatchObject({
      status: { option: status },
      filters: { type_filters: { filters: { category: { option: "accessory.ring" } } } },
      stats: [{ type: "and", filters: [{ id: "explicit.stat_3299347043", value: { min: "80" } }] }],
    });
    expect(JSON.parse(dependencies.requests[1].init?.body as string)).toEqual(result.queryPayload);
    expect(dependencies.requests[1].init?.method).toBe("POST");
    expect(dependencies.values.has(SEARCH_KEY)).toBe(true);
    expect(result.total).toBe(0);
  });

  test.each(["null", '{"status":42}', '{"status":""}']) (
    "ignores an invalid stored status: %s", async (status) => {
      const dependencies = setup(
        [Response.json(STATS), Response.json({ id: "new-search" })],
        { "lscache-trade2state": status },
      );
      const result = await searchItem(ITEM, POE2_URL, dependencies);
      expect(result.queryPayload.query.status).toBeUndefined();
    },
  );

  test("posts Ultimatum property filters even when there are no modifier stats", async () => {
    const item = await Bun.file("tests/fixtures/ultimatum.txt").text();
    const dependencies = setup(
      [Response.json({ result: [] }), Response.json({ id: "ultimatum-search", total: 12 })],
      { "lscache-trade2state": JSON.stringify({ status: "securable" }) },
    );
    const result = await searchItem(item, POE2_URL, dependencies);
    expect(JSON.parse(dependencies.requests[1].init?.body as string)).toEqual({
      query: {
        stats: [],
        status: { option: "securable" },
        filters: {
          type_filters: { filters: { category: { option: "map.ultimatum" } } },
          misc_filters: { filters: { area_level: { min: 80 } } },
          map_filters: { filters: { ultimatum_hint: { option: "Deadly" } } },
        },
      },
    });
    expect(result.title).toBe("Inscribed Ultimatum");
    expect(result.url).toBe("https://www.pathofexile.com/trade2/search/poe2/Standard/ultimatum-search");
  });

  test.each([
    [POE2_URL, "type_filters"],
    ["https://www.pathofexile.com/trade/search/Standard", "misc_filters"],
  ])("normal bases retain their type, rarity and item level when posted to %s", async (url, levelGroup) => {
    const item = await Bun.file("tests/fixtures/tiara-normal.txt").text();
    const dependencies = setup([Response.json({ result: [] }), Response.json({ id: "base-search", total: 3 })]);
    const result = await searchItem(item, url, dependencies);
    const payload = JSON.parse(dependencies.requests[1].init?.body as string);
    expect(payload).toEqual(result.queryPayload);
    expect(payload.query.type).toBe("Ancestral Tiara");
    expect(payload.query.filters.type_filters.filters).toMatchObject({
      category: { option: "armour.helmet" }, rarity: { option: "normal" },
    });
    expect(payload.query.filters[levelGroup].filters.ilvl).toEqual({ min: 82 });
    const otherGroup = levelGroup === "type_filters" ? "misc_filters" : "type_filters";
    expect(payload.query.filters[otherGroup]?.filters.ilvl).toBeUndefined();
    expect(payload.query.stats).toEqual([]);
  });

  test("reports stats rate limiting without posting a search", async () => {
    const dependencies = setup([new Response("", { status: 429 })]);
    await expect(searchItem(ITEM, POE2_URL, dependencies)).rejects.toThrow("Too many requests. Please wait and try again.");
    expect(dependencies.requests).toHaveLength(1);
    expect(dependencies.values.has(SEARCH_KEY)).toBe(false);
  });

  test("reports search rate limiting and clears the history suppression marker", async () => {
    const dependencies = setup([
      Response.json(STATS),
      Response.json({ error: { message: "Rate limit exceeded" } }, { status: 429, headers: { "Retry-After": "60" } }),
    ]);
    await expect(searchItem(ITEM, POE2_URL, dependencies)).rejects.toThrow("Try again in 60 seconds.");
    expect(dependencies.values.has(SEARCH_KEY)).toBe(false);
  });

  test("surfaces the API error message", async () => {
    const dependencies = setup([
      Response.json(STATS),
      Response.json({ error: { message: "Invalid query" } }, { status: 400 }),
    ]);
    await expect(searchItem(ITEM, POE2_URL, dependencies)).rejects.toThrow("Search failed: Invalid query");
  });

  test("reports non-JSON HTTP errors with their status", async () => {
    const dependencies = setup([new Response("Service unavailable", { status: 503 })]);
    await expect(searchItem(ITEM, POE2_URL, dependencies)).rejects.toThrow("Could not load trade stats (HTTP 503).");
  });

  test("does not treat a response without a search ID as zero matches", async () => {
    const dependencies = setup([Response.json(STATS), Response.json({ total: 0 })]);
    await expect(searchItem(ITEM, POE2_URL, dependencies)).rejects.toThrow("did not return a search ID");
    expect(dependencies.values.has(SEARCH_KEY)).toBe(false);
  });

  test("clears the history marker when the request fails to reach the API", async () => {
    const dependencies = setup([Response.json(STATS)]);
    await expect(searchItem(ITEM, POE2_URL, dependencies)).rejects.toThrow("Unexpected request");
    expect(dependencies.values.has(SEARCH_KEY)).toBe(false);
  });
});
