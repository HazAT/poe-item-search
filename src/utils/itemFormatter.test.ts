import { describe, test, expect } from "bun:test";
import { formatItemText } from "./itemFormatter";
import { getCategoryFromItemText } from "@/itemClass.js";
import { getSearchQuery } from "@/item.js";
import type { TradeItem, TradeItemStructuredMod } from "@/types/tradeItem";
import stats from "../../tests/fixtures/stats.json";

const gloves = (await Bun.file("tests/fixtures/gloves.json").json()).result[0].item as TradeItem;
const liveModifiers = await Bun.file("tests/fixtures/api-structured-modifiers.json").json() as Pick<TradeItem, "implicitMods" | "explicitMods">;

describe("itemFormatter", () => {
  test("formats rare corrupted chest armour correctly", async () => {
    const itemJson = await Bun.file("tests/fixtures/api-chest-rare.json").json();
    const item = itemJson as TradeItem;

    const result = formatItemText(item);

    // Check key sections are present
    expect(result).toContain("Item Class: Body Armours");
    expect(result).toContain("Rarity: Rare");
    expect(result).toContain("Dragon Shelter");
    expect(result).toContain("Sacrificial Regalia");

    // Check properties with augmented values
    expect(result).toContain("Quality: +20% (augmented)");
    expect(result).toContain("Armour: 552 (augmented)");
    expect(result).toContain("Evasion Rating: 503 (augmented)");
    expect(result).toContain("Energy Shield: 191 (augmented)");

    // Check requirements
    expect(result).toContain("Requires: Level 65, 54 Str, 54 Dex, 54 Int");

    // Check sockets
    expect(result).toContain("Sockets: S S S");

    // Check item level
    expect(result).toContain("Item Level: 83");

    // Even responses without modifier metadata use the new header format.
    expect(result).toContain("{ Implicit Modifier }\n+1 to Level of all Corrupted Skill Gems");
    expect(result).toContain("## Item Level: 83");
    expect(result).not.toContain("Tier:");

    // Check explicit mods (bracket notation should be stripped)
    expect(result).toContain("71% increased Armour, Evasion and Energy Shield");
    expect(result).toContain("+83 to maximum Life");
    expect(result).toContain("25% reduced Attribute Requirements");
    expect(result).toContain("+23% to Cold Resistance");
    expect(result).toContain("+249 to Stun Threshold");
    expect(result).toContain("115 to 154 Physical Thorns damage");

    // Check corrupted status
    expect(result).toContain("Corrupted");

    // Check note (price)
    expect(result).toContain("Note: ~b/o 1 exalted");

    // Should NOT contain bracket notation
    expect(result).not.toContain("[Armour|");
    expect(result).not.toContain("[Evasion|");
    expect(result).not.toContain("[EnergyShield|");
    expect(result).not.toContain("[Corrupted]");
  });

  test.each([
    ["Ring", "Rings", "accessory.ring"],
    ["Rings", "Rings", "accessory.ring"],
    ["Gloves", "Gloves", "armour.gloves"],
    ["Boots", "Boots", "armour.boots"],
    ["Wands", "Wands", "weapon.wand"],
    ["Staff", "Staves", "weapon.staff"],
    ["Quarterstaff", "Quarterstaves", "weapon.warstaff"],
    ["Focus", "Foci", "armour.focus"],
    ["Foci", "Foci", "armour.focus"],
    ["Body Armour", "Body Armours", "armour.chest"],
  ])("preserves the category when copying %s items", async (propertyName, itemClass, category) => {
    const item = await Bun.file("tests/fixtures/api-chest-rare.json").json() as TradeItem;
    item.properties = [{ name: propertyName, values: [], displayMode: 0 }];

    const result = formatItemText(item);

    expect(result.split("\n")[0]).toBe(`Item Class: ${itemClass}`);
    expect(getCategoryFromItemText(result)).toBe(category);
  });

  test("strips bracket notation from mods", () => {
    const item: TradeItem = {
      id: "test",
      realm: "poe2",
      verified: true,
      w: 1,
      h: 1,
      icon: "",
      league: "Test",
      name: "",
      typeLine: "Test Item",
      baseType: "Test Item",
      rarity: "Normal",
      frameType: 0,
      ilvl: 1,
      identified: true,
      explicitMods: [
        "+10% to [Resistances|Fire Resistance]",
        "Adds 5 to 10 [Physical|Physical] Damage",
        "[SingleKey] bonus",
      ],
    };

    const result = formatItemText(item);

    expect(result).toContain("+10% to Fire Resistance");
    expect(result).toContain("Adds 5 to 10 Physical Damage");
    expect(result).toContain("SingleKey bonus");
    expect(result).not.toContain("[Resistances|");
    expect(result).not.toContain("[Physical|");
    expect(result).not.toContain("[SingleKey]");
  });

  test("handles items without optional fields", () => {
    const item: TradeItem = {
      id: "test",
      realm: "poe2",
      verified: true,
      w: 1,
      h: 1,
      icon: "",
      league: "Test",
      name: "",
      typeLine: "Simple Wand",
      baseType: "Simple Wand",
      rarity: "Normal",
      frameType: 0,
      ilvl: 1,
      identified: true,
    };

    const result = formatItemText(item);

    expect(result).toContain("Rarity: Normal");
    expect(result).toContain("Simple Wand");
    expect(result).toContain("Item Level: 1");
    // Should not have corrupted line
    expect(result).not.toContain("Corrupted");
  });

  test("formats unique items with flavour text", () => {
    const item: TradeItem = {
      id: "test",
      realm: "poe2",
      verified: true,
      w: 1,
      h: 1,
      icon: "",
      league: "Test",
      name: "Polcirkeln",
      typeLine: "Sapphire Ring",
      baseType: "Sapphire Ring",
      rarity: "Unique",
      frameType: 3,
      ilvl: 66,
      identified: true,
      properties: [{ name: "Rings", values: [], displayMode: 0 }],
      implicitMods: ["+22% to [Resistances|Cold Resistance]"],
      explicitMods: [
        "24% increased Cold Damage",
        "+53 to maximum Mana",
      ],
      flavourText: [
        "I rule the north",
        "A legacy earned",
        "Time and time again",
        "Sing Meginord's song!",
      ],
    };

    const result = formatItemText(item);

    expect(result).toContain("Item Class: Rings\n");
    expect(result).toContain("Rarity: Unique");
    expect(result).toContain("Polcirkeln");
    expect(result).toContain("Sapphire Ring");
    expect(result).toContain("{ Implicit Modifier }\n+22% to Cold Resistance");
    expect(result).toContain("I rule the north");
    expect(result).toContain("Sing Meginord's song!");
  });

  test("copies advanced modifiers using hash mappings, preserving ranges and modifier types", () => {
    const result = formatItemText(gloves);

    expect(result).toContain("## Quality: +27% (augmented)");
    expect(result).toContain("## Requires: Level 80, 55 Dex, 55 Int");
    expect(result).toContain("## Sockets: S");
    expect(result).toContain("## Item Level: 82");
    expect(result).toContain("## 8% increased Attack Speed (rune)");
    // Displayed physical/fire stats refer to metadata indices 1/0 respectively.
    expect(result).toContain('{ Prefix Modifier "Flaring" (Tier: 1) }\nAdds 13(12-19) to 31(22-32) Physical Damage to Attacks');
    expect(result).toContain('{ Prefix Modifier "Cremating" (Tier: 1) }\nAdds 27(25-29) to 45(37-45) Fire damage to Attacks');
    expect(result).toContain('{ Suffix Modifier "of the Arid" (Tier: 3) }\nLeech 6.36(6-6.9)% of Physical Attack Damage as Mana');
    expect(result).toContain('{ Fractured Suffix Modifier "of Dueling" (Tier: 1) }\n+2 to Level of all Melee Skills');
    expect(result).toContain('{ Desecrated Suffix Modifier "of the Lightning" (Tier: 2) }\n+36(36-40)% to Lightning Resistance');
    expect(result).not.toContain("+2(2-2)");
    expect(result).not.toContain("[Physical");
  });

  test("advanced copies round-trip to the same search filters and actual rolls as plain copies", () => {
    const advanced = formatItemText(gloves);
    const plain = formatItemText(gloves, { format: "plain" });
    expect(plain).not.toContain("{ Prefix Modifier");
    expect(plain).toContain("+36% to Lightning Resistance (desecrated)");
    const expected = getSearchQuery(plain, stats);
    expect(expected.stats.flatMap(group => group.filters)).toContainEqual({
      id: "explicit.stat_3032590688", value: { min: 22 },
    });
    expect(getSearchQuery(advanced, stats)).toEqual(expected);
    expect(getSearchQuery(advanced.replace(/\n/g, "\r\n"), stats)).toEqual(expected);
  });

  test("groups hybrid modifier lines under one header without borrowing another stat's bounds", () => {
    const item: TradeItem = {
      ...gloves,
      explicitMods: ["+60 to maximum Mana", "+20 to maximum Energy Shield"],
      extended: {
        mods: { explicit: [{
          name: "Hybrid", tier: "P2", level: 1,
          magnitudes: [
            { hash: "explicit.mana", min: "50", max: "70" },
            { hash: "explicit.es", min: "10", max: "30" },
          ],
        }] },
        hashes: { explicit: [["explicit.mana", [0]], ["explicit.es", [0]]] },
      },
    };
    const result = formatItemText(item);
    expect(result).toContain('{ Prefix Modifier "Hybrid" (Tier: 2) }\n+60(50-70) to maximum Mana\n+20(10-30) to maximum Energy Shield');
    expect(result.match(/Modifier "Hybrid"/g)).toHaveLength(1);
    expect(getSearchQuery(result, stats)).toEqual(getSearchQuery(formatItemText(item, { format: "plain" }), stats));
  });

  test.each([null, [], [0, 1], [99]].map(indices => ({ indices })))("does not invent affixes or bounds for ambiguous metadata %j", ({ indices }) => {
    const item = structuredClone(gloves);
    item.explicitMods = ["+60 to maximum Mana"];
    item.extended!.hashes!.explicit = [["explicit.stat_1050105434", indices]];
    const result = formatItemText(item);
    expect(result).toContain("{ Explicit Modifier }\n+60 to maximum Mana");
    expect(result).not.toContain('Modifier "Flaring"');
    expect(result).not.toContain('Modifier "Cremating"');
  });

  test("uses generic headers when hashes are missing, while retaining implicit and enchantment types", () => {
    const item: TradeItem = {
      ...gloves,
      implicitMods: ["+22% to Cold Resistance"],
      enchantMods: ["Allocates Exploit the Elements"],
      extended: { mods: gloves.extended!.mods },
    };
    const result = formatItemText(item);
    expect(result).toContain("{ Implicit Modifier }\n+22% to Cold Resistance");
    expect(result).toContain("{ Enhancement }\nAllocates Exploit the Elements");
    expect(result).toContain("{ Explicit Modifier }\nAdds 13 to 31 Physical Damage to Attacks");
    expect(result).not.toContain("Tier:");
    expect(getSearchQuery(result, stats)).toEqual(getSearchQuery(formatItemText(item, { format: "plain" }), stats));
  });

  test("retains reversed bounds when negative API increases are displayed as reductions", () => {
    const item: TradeItem = {
      ...gloves,
      explicitMods: ["Deferring Favours at Ritual Altars in Map costs 26% reduced Tribute"],
      extended: {
        mods: { explicit: [{
          name: "of Devotion", tier: "S1", level: 1,
          magnitudes: [{ hash: "explicit.tribute", min: "-30", max: "-20" }],
        }] },
        hashes: { explicit: [["explicit.tribute", [0]]] },
      },
    };
    expect(formatItemText(item)).toContain("costs 26(30-20)% reduced Tribute");
  });

  test.each([
    [{ hash: "explicit.mana", min: "bad", max: "70" }],
    [{ hash: "explicit.mana", min: "1", max: "2" }],
    [{ hash: "explicit.different", min: "50", max: "70" }],
    [{ hash: "explicit.mana", min: "50", max: "70" }, { hash: "explicit.mana", min: "50", max: "70" }],
  ].map(magnitudes => ({ magnitudes })))("omits uncertain bounds instead of corrupting the copied stat %j", ({ magnitudes }) => {
    const item: TradeItem = {
      ...gloves,
      explicitMods: ["+60 to maximum Mana"],
      extended: {
        mods: { explicit: [{ name: "Test", tier: "P1", level: 1, magnitudes }] },
        hashes: { explicit: [["explicit.mana", [0]]] },
      },
    };
    expect(formatItemText(item)).toContain('Modifier "Test" (Tier: 1) }\n+60 to maximum Mana');
  });

  test("retains plain PoE1 copies and allows explicitly requesting plain text", () => {
    const item = { ...gloves, realm: "pc", implicitMods: ["+22% to Cold Resistance"] };
    const result = formatItemText(item);
    expect(result).toContain("+22% to Cold Resistance (implicit)");
    expect(result).toContain("+36% to Lightning Resistance (desecrated)");
    expect(result).not.toContain("##");
    expect(result).not.toContain("{ Prefix Modifier");
    expect(formatItemText({ ...item, realm: "poe2" }, { format: "plain" })).toBe(result);
  });

  test("keeps every multiline rune stat separate from searchable explicit modifiers", () => {
    const result = formatItemText({ ...gloves, explicitMods: [], runeMods: ["+60 to maximum Mana\n+20 to maximum Energy Shield"] });
    expect(result).toContain("## +60 to maximum Mana (rune)\n## +20 to maximum Energy Shield (rune)");
    expect(getSearchQuery(result, stats).stats.flatMap(group => group.filters).map(filter => filter.id))
      .not.toContain("explicit.stat_3489782002");
  });

  test("copies current API description objects, including desecrated entries inside explicitMods", () => {
    const item: TradeItem = { ...gloves, ...liveModifiers, extended: undefined };
    const result = formatItemText(item);
    expect(result).toContain("{ Implicit Modifier }\n+20% to Maximum Quality");
    expect(result).toContain('{ Prefix Modifier "Blue" (Tier: 2) }\n+161(150-164) to maximum Mana');
    expect(result).toContain('{ Suffix Modifier "of the Kaleidoscope" (Tier: 3) }\n+10(9-11)% to all Elemental Resistances');
    expect(result).toContain('{ Desecrated Prefix Modifier "Soul Stealer\'s" (Tier: 0) }\nSpells Gain 10(8-12)% of Damage as extra Chaos Damage');
    // Quality boosts these rolls beyond the base ranges supplied by the API.
    expect(result).toContain("22% increased Critical Hit Chance for Spells");
    expect(result).toContain("29% increased Critical Spell Damage Bonus");
    expect(result).toContain("29% increased Mana Cost Efficiency of Spells");
    expect(result).not.toContain("22(16-18)");
    expect(result).not.toContain("29(18-21)");
    expect(result).not.toContain("29(19-22)");
    expect(result).not.toContain("[object Object]");
    expect(result).not.toContain("undefined");
    const expected = getSearchQuery(formatItemText(item, { format: "plain" }), stats);
    expect(getSearchQuery(result, stats)).toEqual(expected);
    expect(expected.stats.flatMap(group => group.filters)).toContainEqual({
      id: "explicit.stat_1050105434", value: { min: "161" },
    });
  });

  test("structured domains and flags preserve modifier distinctions with optional metadata absent", () => {
    const structured: TradeItemStructuredMod[] = [
      { description: "+25 to maximum Energy Shield", flags: { desecrated: true }, domain: "explicit" },
      { description: "+60 to maximum Mana", domain: "explicit", mods: [{}] },
      { description: "+2 to Level of all Melee Skills", flags: { fractured: true }, domain: "explicit" },
    ];
    const item: TradeItem = {
      ...gloves, explicitMods: structured, extended: undefined,
      runeMods: [{ description: "+20 to maximum Life", domain: "rune" }],
    };
    const result = formatItemText(item);
    expect(result).toContain("{ Desecrated Modifier }\n+25 to maximum Energy Shield");
    expect(result).toContain("{ Explicit Modifier }\n+60 to maximum Mana");
    expect(result).toContain("{ Fractured Modifier }\n+2 to Level of all Melee Skills");
    expect(result).toContain("## +20 to maximum Life (rune)");
    const plain = formatItemText(item, { format: "plain" });
    expect(plain).toContain("+25 to maximum Energy Shield (desecrated)");
    expect(plain).toContain("+2 to Level of all Melee Skills (fractured)");
    expect(getSearchQuery(result, stats)).toEqual(getSearchQuery(plain, stats));
  });
});
