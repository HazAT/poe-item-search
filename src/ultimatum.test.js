import { describe, expect, test } from "bun:test";
import { buildTradeRequest } from "./search.js";
import { getSearchQuery } from "./item.js";
import stats from "../tests/fixtures/stats.json";

const ultimatum = await Bun.file("tests/fixtures/ultimatum.txt").text();

describe("Inscribed Ultimatum search", () => {
  test.each(["\n", "\r\n"])("copied item with %j line endings searches its category, area level and hint", async (lineEnding) => {
    const item = ultimatum.replace(/\r\n/g, "\n").replace(/\n/g, lineEnding);
    expect(await buildTradeRequest(item, { stats })).toEqual({
      query: {
        status: { option: "online" },
        stats: [],
        filters: {
          type_filters: { filters: { category: { option: "map.ultimatum" } } },
          misc_filters: { filters: { area_level: { min: 80 } } },
          map_filters: { filters: { ultimatum_hint: { option: "Deadly" } } },
        },
      },
      sort: { price: "asc" },
    });
  });

  test.each(["Victorious", "Cowardly", "Deadly"])("recognizes the %s hint without changing its case", (hint) => {
    expect(getSearchQuery(ultimatum.replace("Deadly", hint), stats).filters.map_filters)
      .toEqual({ filters: { ultimatum_hint: { option: hint } } });
  });

  test("uses Area Level independently of Item Level or Number of Trials", () => {
    const item = ultimatum.replace("Area Level: 80", "## Area Level: 76").replace("Item Level: 80", "Item Level: 82");
    expect(getSearchQuery(item, stats).filters.misc_filters)
      .toEqual({ filters: { area_level: { min: 76 } } });
  });

  test("an item without an area level or recognized hint still searches only Ultimatums", () => {
    const item = ultimatum.replace("Area Level: 80", "Area Level: unknown").replace("Deadly", "Unknown hint");
    expect(getSearchQuery(item, stats)).toEqual({
      stats: [],
      filters: { type_filters: { filters: { category: { option: "map.ultimatum" } } } },
    });
  });

  test("Ultimatum-like text on other item classes cannot add Ultimatum property filters", () => {
    const item = ultimatum.replace("Item Class: Inscribed Ultimatum", "Item Class: Amulets");
    expect(getSearchQuery(item, stats).filters)
      .toEqual({ type_filters: { filters: { category: { option: "accessory.amulet" } } } });
  });
});
