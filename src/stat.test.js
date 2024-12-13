import { expect, test } from "vitest";
import { addRegexToStat } from "./stat.js";

test("convertStatTextToItemText", () => {
  expect(
    addRegexToStat({
      id: "explicit.stat_700317374",
      text: "#% increased Amount Recovered",
      type: "explicit",
    })
  ).toStrictEqual({
    id: "explicit.stat_700317374",
    regex: /(?:\+|-)?(\d+(?:.\d+)?)?% increased Amount Recovered/,
    type: "explicit",
    text: "#% increased Amount Recovered",
  });

  expect(
    addRegexToStat({
      id: "explicit.stat_2254480358",
      text: "# to Level of all [Cold|Cold] [Spell|Spell] Skills",
      type: "explicit",
    })
  ).toStrictEqual({
    id: "explicit.stat_2254480358",
    regex:
      /(?:\+|-)?(\d+(?:.\d+)?)? to Level of all (?:Cold|Cold) (?:Spell|Spell) Skills/,
    type: "explicit",
    text: "# to Level of all [Cold|Cold] [Spell|Spell] Skills",
  });

  expect(
    addRegexToStat({
      id: "explicit.stat_1873752457",
      text: "Gains # Charges per Second",
      type: "explicit",
    })
  ).toStrictEqual({
    id: "explicit.stat_1873752457",
    regex: /Gains (?:\+|-)?(\d+(?:.\d+)?)? Charges per Second/,
    type: "explicit",
    text: "Gains # Charges per Second",
  });

  expect(
    addRegexToStat({
      id: "explicit.stat_1054098949",
      text: "+#% Monster Elemental Resistances",
      type: "explicit",
    })
  ).toStrictEqual({
    id: "explicit.stat_1054098949",
    regex: /\+(?:\+|-)?(\d+(?:.\d+)?)?% Monster Elemental Resistances/,
    type: "explicit",
    text: "+#% Monster Elemental Resistances",
  });

  expect(
    addRegexToStat({
      id: "explicit.stat_1940865751",
      text: "Adds # to # [Physical|Physical] Damage",
      type: "explicit",
    })
  ).toStrictEqual({
    id: "explicit.stat_1940865751",
    text: "Adds # to # [Physical|Physical] Damage",
    regex:
      /Adds (?:\+|-)?(\d+(?:.\d+)?)? to (?:\+|-)?(\d+(?:.\d+)?)? (?:Physical|Physical) Damage/,
    type: "explicit",
  });
});
