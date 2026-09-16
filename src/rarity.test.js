import { describe, expect, test } from "bun:test";
import { getSearchQuery } from "./item.js";
import { buildTradeRequest } from "./search.js";
import stats from "../tests/fixtures/stats.json";

const tiara = await Bun.file("tests/fixtures/tiara-normal.txt").text();
const bow = await Bun.file("tests/fixtures/bow-normal.txt").text();
const magicFlask = await Bun.file("tests/fixtures/lifeflask1.txt").text();
const rareFocus = await Bun.file("tests/fixtures/focus-advanced.txt").text();

describe("rarity-aware item searches", () => {
  for (const [base, category, copy, expectedStats] of [
    ["Ancestral Tiara", "armour.helmet", tiara, []],
    ["Gemini Bow", "weapon.bow", bow, [{
      type: "and", filters: [{ id: "implicit.stat_2463230181", value: { min: "50" } }],
    }]],
  ]) {
    for (const [format, item] of [["advanced", copy], ["plain", copy.replace(/^## /gm, "").replace("{ Implicit Modifier — Attack }\n", "").replace("+50% Surpassing chance to fire an additional Arrow", "+50% Surpassing chance to fire an additional Arrow (implicit)")]]) {
      test.each(["\n", "\r\n"])(`${format} ${base} copy with %j searches its specific normal base and minimum item level`, async (lineEnding) => {
        const input = item.replace(/\r\n/g, "\n").replace(/\n/g, lineEnding);
        expect(await buildTradeRequest(input, { stats })).toEqual({
          query: {
            status: { option: "online" },
            type: base,
            filters: { type_filters: { filters: {
              category: { option: category },
              rarity: { option: "normal" },
              ilvl: { min: 82 },
            } } },
            stats: expectedStats,
          },
          sort: { price: "asc" },
        });
      });
    }
  }

  test("magic items keep their modifiers and category with magic rarity and item level", () => {
    const query = getSearchQuery(magicFlask, stats);
    expect(query.filters).toEqual({ type_filters: { filters: {
      category: { option: "flask.life" }, rarity: { option: "magic" }, ilvl: { min: 48 },
    } } });
    expect(query.type).toBeUndefined();
    expect(query.term).toBeUndefined();
    expect(query.stats).toEqual([{ type: "and", filters: [
      { id: "explicit.stat_700317374", value: { min: "50" } },
      { id: "explicit.stat_1873752457", value: { min: "0.25" } },
    ] }]);
  });

  test.each(["Superior", "Exceptional"])("normal %s quality names still search the recognized base type", (qualityPrefix) => {
    expect(getSearchQuery(tiara.replace("Ancestral Tiara", `${qualityPrefix} Ancestral Tiara`), stats))
      .toEqual(getSearchQuery(tiara, stats));
  });

  test("meaningful base prefixes are kept when removing a quality prefix", () => {
    const item = tiara.replace("Ancestral Tiara", "Exceptional Runeforged Ancestral Tiara");
    expect(getSearchQuery(item, stats).type).toBe("Runeforged Ancestral Tiara");
  });

  test.each([true, false])("rare searches ignore item level and keep their six modifiers (poe2=%s)", (poe2) => {
    const query = getSearchQuery(rareFocus, stats, { poe2 });
    expect(query).toEqual(getSearchQuery(rareFocus.replace("Item Level: 79", "Item Level: 86"), stats, { poe2 }));
    expect(query.filters).toEqual({ type_filters: { filters: { category: { option: "armour.focus" } } } });
    expect(query.type).toBeUndefined();
    expect(query.stats[0].filters).toHaveLength(6);
  });

  test.each(["Normal", "Magic"])("PoE1 puts %s item level in Miscellaneous without losing rarity or category", async (rarity) => {
    const request = await buildTradeRequest(tiara.replace("Rarity: Normal", `Rarity: ${rarity}`), { stats, poe2: false });
    expect(request.query.filters).toEqual({
      type_filters: { filters: { category: { option: "armour.helmet" }, rarity: { option: rarity.toLowerCase() } } },
      misc_filters: { filters: { ilvl: { min: 82 } } },
    });
    expect(request.query.type).toBe(rarity === "Normal" ? "Ancestral Tiara" : undefined);
  });

  test("missing item level does not turn the requirement level or price into a filter", () => {
    const query = getSearchQuery(tiara.replace("## Item Level: 82", ""), stats);
    expect(query.filters).toEqual({ type_filters: { filters: {
      category: { option: "armour.helmet" }, rarity: { option: "normal" },
    } } });
    expect(query.type).toBe("Ancestral Tiara");
  });

  test("rarity and item level still work when there is no category mapping", () => {
    const query = getSearchQuery(tiara.replace("Item Class: Helmets\n", ""), stats);
    expect(query.filters).toEqual({ type_filters: { filters: { rarity: { option: "normal" }, ilvl: { min: 82 } } } });
    expect(query.type).toBe("Ancestral Tiara");
  });
});
