import { expect, test } from "bun:test";
import { searchItem } from "./itemSearch";
import stats from "../../tests/fixtures/stats.json";

type PostedFilter = {
  id: string;
  value?: { min?: string | number; weight?: number };
  disabled?: boolean;
};

test.each([
  ["focus", "Behemoth Weaver", "armour.focus", 6],
  ["belt", "Anarchy Lash", "accessory.belt", 8],
])("pasting the advanced %s submits every item modifier to the trade API", async (fixture, title, category, count) => {
  const itemText = await Bun.file(`tests/fixtures/${fixture}-advanced.txt`).text();
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const values = new Map([["lscache-trade2state", JSON.stringify({ status: "online" })]]);
  const result = await searchItem(itemText, "https://www.pathofexile.com/trade2/search/poe2/Standard/old-search", {
    request: async (url, init) => {
      requests.push({ url, init });
      return init?.method === "POST"
        ? Response.json({ id: "advanced-search", total: 3 })
        : Response.json(stats);
    },
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: (key) => { values.delete(key); },
    },
  });

  expect(requests).toHaveLength(2);
  expect(requests[0].url).toBe("https://www.pathofexile.com/api/trade2/data/stats");
  expect(requests[1].url).toBe("https://www.pathofexile.com/api/trade2/search/poe2/Standard");
  expect(requests[1].init?.method).toBe("POST");
  const payload = JSON.parse(requests[1].init?.body as string);
  expect(payload).toEqual(result.queryPayload);
  expect(payload.query.filters.type_filters.filters.category.option).toBe(category);
  expect(payload.query.status).toEqual({ option: "online" });
  const postedGroups: Array<{ filters: PostedFilter[] }> = payload.query.stats;
  const enabledFilters = postedGroups.flatMap((group) => group.filters)
    .filter((filter) => !filter.disabled);
  expect(enabledFilters).toHaveLength(count);
  expect(enabledFilters.find(({ id }) => id === "explicit.stat_1050105434"))
    .toEqual({ id: "explicit.stat_1050105434", value: { min: fixture === "focus" ? "62" : "27" } });
  if (fixture === "belt") {
    expect(enabledFilters.find(({ id }) => id === "implicit.stat_1416292992"))
      .toEqual({ id: "implicit.stat_1416292992", value: { min: "2" } });
    expect(payload.query.stats[1].value).toEqual({ min: 46 });
  }
  expect(result.title).toBe(title);
  expect(result.total).toBe(3);
  expect(result.url).toBe("https://www.pathofexile.com/trade2/search/poe2/Standard/advanced-search");
});
