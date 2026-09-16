import { describe, expect, test } from "bun:test";
import { buildTradeRequest } from "./search.js";
import { getSearchQuery } from "./item.js";
// Subset captured verbatim from /api/trade2/data/stats on 2026-09-11.
// Includes same-text explicit/crafted entries and the longer Exploit name.
import amuletStats from "../tests/fixtures/stats-amulet.json";

const advancedAmulet = await Bun.file("tests/fixtures/amulet-advanced.txt").text();
const plainAmulet = `Item Class: Amulets
Rarity: Normal
Distorted Amulet
--------
Item Level: 78
--------
Allocates Quick Fingers (enchant)
Allocates Exploit (enchant)
--------
-1 Suffix Modifier allowed (implicit)`;

const expectedFilters = [
  { id: "implicit.stat_718638445", value: { min: "-1" } },
  { id: "enchant.stat_2954116742|39050" },
  { id: "enchant.stat_2954116742|33542" },
];

describe("Distorted Amulet search", () => {
  for (const [format, itemText] of [["advanced", advancedAmulet], ["plain", plainAmulet]]) {
    for (const [lineEnding, separator] of [["LF", "\n"], ["CRLF", "\r\n"]]) {
      test(`${format} copy with ${lineEnding} searches both allocations and the negative implicit`, async () => {
        const input = itemText.replace(/\r\n/g, "\n").replace(/\n/g, separator);
        expect(await buildTradeRequest(input, { stats: amuletStats })).toEqual({
          query: {
            status: { option: "online" },
            type: "Distorted Amulet",
            filters: { type_filters: { filters: {
              category: { option: "accessory.amulet" },
              rarity: { option: "normal" },
              ilvl: { min: 78 },
            } } },
            stats: [{ type: "and", filters: expectedFilters }],
          },
          sort: { price: "asc" },
        });
      });
    }
  }

  test("an allocation uses its own modifier type and complete passive name", () => {
    expect(getSearchQuery("{ Prefix Modifier }\nAllocates Exploit — Unscalable Value", amuletStats).stats)
      .toEqual([{ type: "and", filters: [{ id: "explicit.stat_2954116742|39050" }] }]);
    expect(getSearchQuery("{ Enhancement }\nAllocates Exploit the Elements — Unscalable Value", amuletStats).stats)
      .toEqual([{ type: "and", filters: [{ id: "enchant.stat_2954116742|48581" }] }]);
  });

  test("repeated allocation text does not duplicate the same filter", () => {
    expect(getSearchQuery(`${advancedAmulet}\n{ Enhancement }\nAllocates Exploit — Unscalable Value`, amuletStats).stats)
      .toEqual([{ type: "and", filters: expectedFilters }]);
  });
});
