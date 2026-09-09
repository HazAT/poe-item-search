import { describe, expect, test } from "bun:test";
import { getSearchQuery, matchStatsOnItem } from "./item.js";
import { addRegexToStats } from "./stat.js";
import stats from "../tests/fixtures/stats.json";

const focus = await Bun.file("tests/fixtures/focus-advanced.txt").text();
const belt = await Bun.file("tests/fixtures/belt-advanced.txt").text();

const plainFocus = `Item Class: Foci
Rarity: Rare
Behemoth Weaver
Leyline Focus
--------
Energy Shield: 143 (augmented)
--------
Requires: Level 70, 99 Int
--------
Sockets: S
--------
Item Level: 79
--------
+18% to Lightning Resistance (rune)
--------
+62 to maximum Mana
49% increased Energy Shield
+25 to maximum Energy Shield (desecrated)
27% increased Cast Speed
47% increased Mana Regeneration Rate
+2 to Level of all Spell Skills`;

const plainBelt = `Item Class: Belts
Rarity: Rare
Anarchy Lash
Utility Belt
--------
Requires: Level 55
--------
Item Level: 80
--------
20% of Flask Recovery applied Instantly (implicit)
Has 2 Charm Slots (implicit)
--------
+38 to maximum Life
+27 to maximum Mana
9% increased Charm Effect Duration
19% reduced Charm Charges used
+32% to Lightning Resistance
+14% to Chaos Resistance`;

function valuesById(filters) {
  return Object.fromEntries(filters.map(({ id, value }) => [id, value]));
}

describe("advanced copied items", () => {
  test.each([
    ["focus", focus, plainFocus],
    ["belt", belt, plainBelt],
  ])("%s has the same search with plain or advanced text and LF or CRLF", (_name, advanced, plain) => {
    const expected = getSearchQuery(plain, stats);
    for (const item of [plain, advanced]) {
      const lf = item.replace(/\r\n/g, "\n");
      expect(getSearchQuery(lf, stats)).toEqual(expected);
      expect(getSearchQuery(lf.replace(/\n/g, "\r\n"), stats)).toEqual(expected);
    }
  });

  test("focus retains all six explicit rolls without treating bounds, tiers, or the rune as rolls", () => {
    const query = getSearchQuery(focus, stats);
    expect(query.filters).toEqual({
      type_filters: { filters: { category: { option: "armour.focus" } } },
    });
    expect(query.stats).toHaveLength(1);
    expect(query.stats[0].type).toBe("and");
    expect(query.stats[0].filters).toHaveLength(6);
    expect(valuesById(query.stats[0].filters)).toEqual({
      "explicit.stat_1050105434": { min: "62" },
      "explicit.stat_4015621042": { min: "49" },
      "explicit.stat_3489782002": { min: "25" },
      "explicit.stat_2891184298": { min: "27" },
      "explicit.stat_789117908": { min: "47" },
      "explicit.stat_124131830": { min: "2" },
    });
  });

  test("belt keeps both implicit rolls and uses actual resistance rolls for the weighted total", () => {
    const query = getSearchQuery(belt, stats);
    expect(query.filters).toEqual({
      type_filters: { filters: { category: { option: "accessory.belt" } } },
    });
    expect(query.stats).toHaveLength(2);
    expect(query.stats[0].type).toBe("and");
    expect(query.stats[0].filters).toHaveLength(6);
    expect(valuesById(query.stats[0].filters)).toEqual({
      "implicit.stat_462041840": { min: "20" },
      "implicit.stat_1416292992": { min: "2" },
      "explicit.stat_3299347043": { min: "38" },
      "explicit.stat_1050105434": { min: "27" },
      "explicit.stat_1389754388": { min: "9" },
      "explicit.stat_1570770415": { min: "19" },
    });
    expect(query.stats[1]).toEqual({
      type: "weight",
      filters: [
        { id: "explicit.stat_1671376347", value: { weight: 1, min: 32 }, disabled: false },
        { id: "explicit.stat_2923486259", value: { weight: 1, min: 14 }, disabled: false },
        { id: "explicit.stat_3372524247", value: { weight: 1 }, disabled: true },
        { id: "explicit.stat_4220027924", value: { weight: 1 }, disabled: true },
      ],
      value: { min: 46 },
    });

    const matched = matchStatsOnItem(belt, addRegexToStats(stats));
    expect(matched).toHaveLength(8);
    expect(matched.filter(({ type }) => type === "implicit")).toHaveLength(2);
    expect(matched.filter(({ type }) => type === "explicit")).toHaveLength(6);
  });

  test("annotated damage ranges average the two rolls without including either roll's bounds", () => {
    const query = getSearchQuery(`{ Prefix Modifier "Test" (Tier: 2) — Physical, Attack }
Adds 12(10-15) to 24(20-30) Physical Damage to Attacks`, stats);
    expect(query.stats).toEqual([
      { type: "and", filters: [{ id: "explicit.stat_3032590688", value: { min: 18 } }] },
    ]);
  });
});
