import { describe, expect, test } from "bun:test";
import { buildTradeRequest } from "./search.js";
import { getSearchQuery } from "./item.js";
// Subset captured verbatim from /api/trade2/data/stats on 2026-09-11.
// Keep API aliases and duplicate Essence text to exercise filter selection.
import tabletStats from "../tests/fixtures/stats-tablet.json";

const advancedTablet = await Bun.file("tests/fixtures/tablet-advanced.txt").text();
const plainTablet = `Item Class: Tablet
Rarity: Rare
Ancient Mandate
Ritual Tablet
--------
Item Level: 79
--------
Adds Ritual Altars to a Map
10 uses remaining (implicit)
--------
Map contains an additional Essence
Deferring Favours at Ritual Altars in Map costs 26% reduced Tribute
Rerolling Favours at Ritual Altars in Map costs 21% reduced Tribute
--------
Can be used in a personal Map Device to add modifiers to a Map.`;

const expectedRequest = {
  query: {
    status: { option: "online" },
    filters: {
      type_filters: {
        filters: { category: { option: "map.tablet" } },
      },
    },
    stats: [{
      type: "and",
      filters: [
        { id: "explicit.stat_395808938" },
        { id: "explicit.stat_2282052746", value: { max: "-21" } },
        { id: "explicit.stat_1345835998", value: { max: "-26" } },
        { id: "implicit.stat_3166002380", value: { min: "10" } },
      ],
    }],
  },
  sort: { price: "asc" },
};

describe("Ritual Tablet search", () => {
  for (const [format, itemText] of [["advanced", advancedTablet], ["plain", plainTablet]]) {
    for (const [lineEnding, separator] of [["LF", "\n"], ["CRLF", "\r\n"]]) {
      test(`${format} copy with ${lineEnding} searches Essence, uses and at least the copied Tribute reductions`, async () => {
        const input = itemText.replace(/\r\n/g, "\n").replace(/\n/g, separator);
        const request = await buildTradeRequest(input, { stats: tabletStats });

        expect(request).toEqual(expectedRequest);
      });
    }
  }

  test("negative increased Tribute uses the same upper bounds as reduced Tribute", async () => {
    const input = plainTablet
      .replace("26% reduced Tribute", "-26% increased Tribute")
      .replace("21% reduced Tribute", "-21% increased Tribute");
    expect(await buildTradeRequest(input, { stats: tabletStats })).toEqual(expectedRequest);
  });

  test("Tribute cost bounds preserve zero and positive increases without affecting other reductions", () => {
    expect(getSearchQuery("Deferring Favours at Ritual Altars in Map costs 0% reduced Tribute", tabletStats).stats)
      .toEqual([{ type: "and", filters: [{ id: "explicit.stat_1345835998", value: { max: "0" } }] }]);
    expect(getSearchQuery("Deferring Favours at Ritual Altars in Map costs 12% increased Tribute", tabletStats).stats)
      .toEqual([{ type: "and", filters: [{ id: "explicit.stat_1345835998", value: { max: "12" } }] }]);
  });

  test("fixed modifiers omit a numeric bound and do not guess option values", () => {
    const stats = { result: [{ entries: [
      { id: "explicit.fixed", text: "Fixed modifier (Local)", type: "explicit" },
      { id: "explicit.choice", text: "Selectable modifier", type: "explicit", option: { options: [{ id: 1, text: "First" }] } },
    ] }] };
    expect(getSearchQuery("Fixed modifier (Local)\nSelectable modifier", stats).stats)
      .toEqual([{ type: "and", filters: [{ id: "explicit.fixed" }] }]);
  });
});
