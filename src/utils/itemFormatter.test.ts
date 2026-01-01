import { describe, test, expect } from "bun:test";
import { formatItemText } from "./itemFormatter";
import type { TradeItem } from "@/types/tradeItem";

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

    // Check implicit mods with (implicit) suffix
    expect(result).toContain("+1 to Level of all Corrupted Skill Gems (implicit)");

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

  test("strips bracket notation from mods", async () => {
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

    expect(result).toContain("Rarity: Unique");
    expect(result).toContain("Polcirkeln");
    expect(result).toContain("Sapphire Ring");
    expect(result).toContain("+22% to Cold Resistance (implicit)");
    expect(result).toContain("I rule the north");
    expect(result).toContain("Sing Meginord's song!");
  });
});
