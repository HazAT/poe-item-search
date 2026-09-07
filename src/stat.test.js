import { expect, test } from "bun:test";
import { addRegexToStat } from "./stat.js";

test("explicit stats accept desecrated modifiers with LF and Windows CRLF", () => {
  for (const suffix of ["", " (desecrated)"]) {
    for (const lineEnding of ["\n", "\r\n"]) {
      const { regex } = addRegexToStat({
        text: "#% to Fire Resistance",
        type: "explicit",
      });
      const match = regex.exec(`+33% to Fire Resistance${suffix}${lineEnding}`);
      expect(match?.[1]).toBe("33");
    }
  }
});

test("desecrated matching preserves modifier type distinctions", () => {
  for (const suffix of [" (implicit)", " (rune)", " (crafted)", " (fractured)", " (mutated)"]) {
    const { regex } = addRegexToStat({ text: "#% to Fire Resistance", type: "explicit" });
    expect(regex.test(`+33% to Fire Resistance${suffix}`)).toBe(false);
  }
  for (const type of ["implicit", "rune"]) {
    const { regex } = addRegexToStat({ text: "#% to Fire Resistance", type });
    expect(regex.test("+33% to Fire Resistance (desecrated)")).toBe(false);
  }
  const implicitStat = addRegexToStat({ text: "#% to Fire Resistance", type: "implicit" });
  expect(implicitStat.regex.exec("+22% to Fire Resistance (implicit)")?.[1]).toBe("22");
});

test("convertStatTextToItemText", () => {
  expect(
    addRegexToStat({
      id: "explicit.stat_700317374",
      text: "#% increased Amount Recovered",
      type: "explicit",
    })
  ).toStrictEqual({
    id: "explicit.stat_700317374",
    regex: /^(?:\+|-)?(\d+(?:.\d+)?)?% increased Amount Recovered(?: \(desecrated\))?(?! \(implicit\))$/gm,
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
    regex: /^(?:\+|-)?(\d+(?:.\d+)?)? to Level of all (?:Cold|Cold) (?:Spell|Spell) Skills(?: \(desecrated\))?(?! \(implicit\))$/gm,
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
    regex: /^Gains (?:\+|-)?(\d+(?:.\d+)?)? Charges per Second(?: \(desecrated\))?(?! \(implicit\))$/gm,
    text: "Gains # Charges per Second",
    type: "explicit",
  });

  expect(
    addRegexToStat({
      id: "explicit.stat_1054098949",
      text: "+#% Monster Elemental Resistances",
      type: "explicit",
    })
  ).toStrictEqual({
    id: "explicit.stat_1054098949",
    regex: /^\+(?:\+|-)?(\d+(?:.\d+)?)?% Monster Elemental Resistances(?: \(desecrated\))?(?! \(implicit\))$/gm,
    text: "+#% Monster Elemental Resistances",
    type: "explicit",
  });

  expect(
    addRegexToStat({
      id: "explicit.stat_1940865751",
      text: "Adds # to # [Physical|Physical] Damage",
      type: "explicit",
    })
  ).toStrictEqual({
    id: "explicit.stat_1940865751",
    regex: /^Adds (?:\+|-)?(\d+(?:.\d+)?)? to (?:\+|-)?(\d+(?:.\d+)?)? (?:Physical|Physical) Damage(?: \(desecrated\))?(?! \(implicit\))$/gm,
    text: "Adds # to # [Physical|Physical] Damage",
    type: "explicit",
  });
});
