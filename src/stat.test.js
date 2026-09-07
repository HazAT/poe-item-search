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
