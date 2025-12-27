import { expect, test, describe } from "bun:test";
import {
  extractItemClass,
  getCategoryForItemClass,
  getCategoryFromItemText,
  buildTypeFilters,
  isItemClassSupported,
  ITEM_CLASS_TO_CATEGORY,
} from "./itemClass.js";

// Load all fixtures
const gloves1 = await Bun.file("tests/fixtures/gloves1.txt").text();
const gloves2 = await Bun.file("tests/fixtures/gloves2.txt").text();
const rings1 = await Bun.file("tests/fixtures/rings1.txt").text();
const belts1 = await Bun.file("tests/fixtures/belts1.txt").text();
const chest2 = await Bun.file("tests/fixtures/chest2.txt").text();
const chest3 = await Bun.file("tests/fixtures/chest3.txt").text();
const lifeFlask1 = await Bun.file("tests/fixtures/lifeflask1.txt").text();
const sceptre1 = await Bun.file("tests/fixtures/sceptre1.txt").text();
const talisman1 = await Bun.file("tests/fixtures/talisman1.txt").text();
const charm2 = await Bun.file("tests/fixtures/charm2.txt").text();
const quarterstaff1 = await Bun.file("tests/fixtures/quaterstaff1.txt").text();

describe("extractItemClass", () => {
  test("extracts item class from gloves", () => {
    expect(extractItemClass(gloves1)).toBe("Gloves");
    expect(extractItemClass(gloves2)).toBe("Gloves");
  });

  test("extracts item class from rings", () => {
    expect(extractItemClass(rings1)).toBe("Rings");
  });

  test("extracts item class from belts", () => {
    expect(extractItemClass(belts1)).toBe("Belts");
  });

  test("extracts item class from body armours", () => {
    expect(extractItemClass(chest2)).toBe("Body Armours");
    expect(extractItemClass(chest3)).toBe("Body Armours");
  });

  test("extracts item class from life flasks", () => {
    expect(extractItemClass(lifeFlask1)).toBe("Life Flasks");
  });

  test("extracts item class from sceptres", () => {
    expect(extractItemClass(sceptre1)).toBe("Sceptres");
  });

  test("extracts item class from talismans", () => {
    expect(extractItemClass(talisman1)).toBe("Talismans");
  });

  test("extracts item class from quarterstaves", () => {
    expect(extractItemClass(quarterstaff1)).toBe("Quarterstaves");
  });

  test("extracts item class from charms", () => {
    expect(extractItemClass(charm2)).toBe("Charms");
  });

  test("returns undefined for invalid input", () => {
    expect(extractItemClass("")).toBeUndefined();
    expect(extractItemClass(null)).toBeUndefined();
    expect(extractItemClass(undefined)).toBeUndefined();
    expect(extractItemClass("No item class here")).toBeUndefined();
  });
});

describe("getCategoryForItemClass", () => {
  test("maps gloves to armour.gloves", () => {
    expect(getCategoryForItemClass("Gloves")).toBe("armour.gloves");
  });

  test("maps rings to accessory.ring", () => {
    expect(getCategoryForItemClass("Rings")).toBe("accessory.ring");
  });

  test("maps belts to accessory.belt", () => {
    expect(getCategoryForItemClass("Belts")).toBe("accessory.belt");
  });

  test("maps body armours to armour.chest", () => {
    expect(getCategoryForItemClass("Body Armours")).toBe("armour.chest");
  });

  test("maps life flasks to flask.life", () => {
    expect(getCategoryForItemClass("Life Flasks")).toBe("flask.life");
  });

  test("maps sceptres to weapon.sceptre", () => {
    expect(getCategoryForItemClass("Sceptres")).toBe("weapon.sceptre");
  });

  test("maps talismans to weapon.talisman", () => {
    expect(getCategoryForItemClass("Talismans")).toBe("weapon.talisman");
  });

  test("maps quarterstaves to weapon.warstaff", () => {
    expect(getCategoryForItemClass("Quarterstaves")).toBe("weapon.warstaff");
  });

  test("returns undefined for unknown class", () => {
    expect(getCategoryForItemClass("Unknown")).toBeUndefined();
    expect(getCategoryForItemClass("Charms")).toBeUndefined(); // Not in PoE2 trade
    expect(getCategoryForItemClass(null)).toBeUndefined();
  });
});

describe("getCategoryFromItemText", () => {
  test("gets category from gloves item text", () => {
    expect(getCategoryFromItemText(gloves1)).toBe("armour.gloves");
  });

  test("gets category from quarterstaff item text", () => {
    expect(getCategoryFromItemText(quarterstaff1)).toBe("weapon.warstaff");
  });

  test("gets category from sceptre item text", () => {
    expect(getCategoryFromItemText(sceptre1)).toBe("weapon.sceptre");
  });

  test("returns undefined for unsupported item class", () => {
    expect(getCategoryFromItemText(charm2)).toBeUndefined();
  });
});

describe("buildTypeFilters", () => {
  test("builds filter object for quarterstaves", () => {
    expect(buildTypeFilters(quarterstaff1)).toEqual({
      type_filters: {
        filters: {
          category: {
            option: "weapon.warstaff"
          }
        }
      }
    });
  });

  test("builds filter object for gloves", () => {
    expect(buildTypeFilters(gloves1)).toEqual({
      type_filters: {
        filters: {
          category: {
            option: "armour.gloves"
          }
        }
      }
    });
  });

  test("builds filter object for rings", () => {
    expect(buildTypeFilters(rings1)).toEqual({
      type_filters: {
        filters: {
          category: {
            option: "accessory.ring"
          }
        }
      }
    });
  });

  test("builds filter object for body armours", () => {
    expect(buildTypeFilters(chest2)).toEqual({
      type_filters: {
        filters: {
          category: {
            option: "armour.chest"
          }
        }
      }
    });
  });

  test("returns undefined for unsupported item class", () => {
    expect(buildTypeFilters(charm2)).toBeUndefined();
  });
});

describe("isItemClassSupported", () => {
  test("returns true for supported classes", () => {
    expect(isItemClassSupported("Gloves")).toBe(true);
    expect(isItemClassSupported("Quarterstaves")).toBe(true);
    expect(isItemClassSupported("Body Armours")).toBe(true);
  });

  test("returns false for unsupported classes", () => {
    expect(isItemClassSupported("Charms")).toBe(false);
    expect(isItemClassSupported("Unknown")).toBe(false);
  });
});

describe("ITEM_CLASS_TO_CATEGORY mapping", () => {
  test("has all weapon types", () => {
    expect(ITEM_CLASS_TO_CATEGORY["Claws"]).toBe("weapon.claw");
    expect(ITEM_CLASS_TO_CATEGORY["Daggers"]).toBe("weapon.dagger");
    expect(ITEM_CLASS_TO_CATEGORY["Bows"]).toBe("weapon.bow");
    expect(ITEM_CLASS_TO_CATEGORY["Crossbows"]).toBe("weapon.crossbow");
    expect(ITEM_CLASS_TO_CATEGORY["Wands"]).toBe("weapon.wand");
    expect(ITEM_CLASS_TO_CATEGORY["Staves"]).toBe("weapon.staff");
  });

  test("has all armour types", () => {
    expect(ITEM_CLASS_TO_CATEGORY["Helmets"]).toBe("armour.helmet");
    expect(ITEM_CLASS_TO_CATEGORY["Boots"]).toBe("armour.boots");
    expect(ITEM_CLASS_TO_CATEGORY["Shields"]).toBe("armour.shield");
    expect(ITEM_CLASS_TO_CATEGORY["Quivers"]).toBe("armour.quiver");
  });

  test("has all accessory types", () => {
    expect(ITEM_CLASS_TO_CATEGORY["Amulets"]).toBe("accessory.amulet");
  });
});
