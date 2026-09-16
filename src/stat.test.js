import { expect, test } from "bun:test";
import { addRegexToStat } from "./stat.js";

test("numeric placeholders reject missing values and non-decimal separators", () => {
  for (const value of ["", "+", "1x25", "1 25", "1,25", "--5", "+-5"]) {
    const { regex } = addRegexToStat({ text: "#% to Fire Resistance", type: "explicit" });
    expect(regex.test(`${value}% to Fire Resistance`)).toBe(false);
  }
});

test("explicit stats accept desecrated modifiers with LF and Windows CRLF", () => {
  for (const suffix of ["", " (desecrated)"]) {
    for (const lineEnding of ["\n", "\r\n"]) {
      const { regex } = addRegexToStat({
        text: "#% to Fire Resistance",
        type: "explicit",
      });
      const match = regex.exec(`+33% to Fire Resistance${suffix}${lineEnding}`);
      expect(Number(match?.[1])).toBe(33);
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
  expect(Number(implicitStat.regex.exec("+22% to Fire Resistance (implicit)")?.[1])).toBe(22);
});

test.each([
  ["#% increased Amount Recovered", "50% increased Amount Recovered", [50]],
  ["# to Level of all [Cold|Cold] [Spell|Spell] Skills", "+2 to Level of all Cold Spell Skills", [2]],
  ["Gains # Charges per Second", "Gains 0.25 Charges per Second", [0.25]],
  ["+#% Monster Elemental Resistances", "+30% Monster Elemental Resistances", [30]],
  ["Adds # to # [Physical|Physical] Damage", "Adds 10 to 20 Physical Damage", [10, 20]],
  ["#% to Fire Resistance", "-12.5% to Fire Resistance", [-12.5]],
])("matches numeric values in %s", (template, itemText, values) => {
  const stat = addRegexToStat({ text: template, type: "explicit" });
  const match = stat.regex.exec(itemText);
  expect(match?.slice(1).map(Number)).toEqual(values);
  expect(stat.text).toBe(template);
  expect(stat.type).toBe("explicit");
});

test.each([
  ["# to maximum Mana", "+62(55-64) to maximum Mana", [62]],
  ["#% increased Energy Shield", "49(43-55)% increased Energy Shield", [49]],
  ["#% reduced Charm Charges used", "19(19-17)% reduced Charm Charges used", [19]],
  ["#% to Fire Resistance", "-12.5(-15.5--10)% to Fire Resistance", [-12.5]],
  ["Gains # Charges per Second", "Gains 0.25(0.20-0.30) Charges per Second", [0.25]],
  ["+#% Monster Elemental Resistances", "+30(+25-+35)% Monster Elemental Resistances", [30]],
  ["Adds # to # [Physical|Physical] Damage", "Adds 10(8-12) to 20(18-22) Physical Damage", [10, 20]],
])("advanced rolls capture only the rolled values in %s", (template, itemText, values) => {
  for (const lineEnding of ["\n", "\r\n"]) {
    const { regex } = addRegexToStat({ text: template, type: "explicit" });
    expect(regex.exec(itemText + lineEnding)?.slice(1).map(Number)).toEqual(values);
  }
});

test("advanced rolls preserve modifier suffix distinctions", () => {
  for (const suffix of ["", " (desecrated)", " (implicit)", " (enchant)", " (rune)", " (crafted)", " (fractured)", " (mutated)"]) {
    for (const type of ["explicit", "implicit", "enchant"]) {
      const { regex } = addRegexToStat({ text: "#% to Fire Resistance", type });
      const expected = type === "explicit" ? ["", " (desecrated)"].includes(suffix) : suffix === ` (${type})`;
      expect(regex.test(`+33(31-35)% to Fire Resistance${suffix}`)).toBe(expected);
    }
  }
});

test("advanced rolls reject malformed bounds instead of partially matching them", () => {
  for (const range of ["()", "(55-)", "(-64)", "(55x64)", "(55-64-70)", "(55-64", "(tier 7)"]) {
    const { regex } = addRegexToStat({ text: "# to maximum Mana", type: "explicit" });
    expect(regex.test(`+62${range} to maximum Mana`)).toBe(false);
  }
});

test.each(["implicit", "enchant"])("multiline %s stats accept legacy and per-line labels", (type) => {
  for (const lineEnding of ["\n", "\r\n"]) {
    for (const intermediateSuffix of ["", ` (${type})`]) {
      const { regex } = addRegexToStat({ text: "First #\nSecond #", type });
      expect(regex.exec(`First 10(8-12)${intermediateSuffix}${lineEnding}Second 20(18-22) (${type})`)?.slice(1)).toEqual(["10", "20"]);
    }
  }
});

test("charm slot templates match singular and plural copied modifiers", () => {
  for (const template of ["Has # Charm Slot", "Has # Charm Slots"]) {
    for (const [itemText, value] of [["Has 1 Charm Slot", "1"], ["Has 2 Charm Slots", "2"], ["Has 2(1-3) Charm Slots", "2"]]) {
      for (const type of ["explicit", "implicit"]) {
        const { regex } = addRegexToStat({ text: template, type });
        const suffix = type === "implicit" ? " (implicit)" : "";
        expect(regex.exec(itemText + suffix)?.slice(1)).toEqual([value]);
      }
    }
  }
});

test("fixed modifier annotations preserve modifier type distinctions", () => {
  for (const suffix of ["", " (desecrated)", " (implicit)", " (rune)"]) {
    const { regex } = addRegexToStat({ text: "Map contains an additional Essence", type: "explicit" });
    const match = regex.exec(`Map contains an additional Essence — Unscalable Value${suffix}`);
    expect(Boolean(match)).toBe(["", " (desecrated)"].includes(suffix));
    if (match) expect(match.slice(1)).toEqual([]);
  }
});

test("literal parentheses do not become numeric capture groups", () => {
  const { regex } = addRegexToStat({ text: "Grants [Fire|Cold] (Local)", type: "explicit" });
  expect(regex.exec("Grants Fire (Local)")?.slice(1)).toEqual([]);
  expect(regex.test("Grants Fire Local")).toBe(false);
});
