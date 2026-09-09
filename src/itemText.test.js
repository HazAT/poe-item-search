import { expect, test } from "bun:test";
import { normalizeItemText } from "./itemText.js";
import { matchStatsOnItem } from "./item.js";
import { addRegexToStats } from "./stat.js";

const lifeStats = addRegexToStats({ result: [{ entries: [
  { id: "explicit.life", text: "# to maximum Life", type: "explicit" },
  { id: "implicit.life", text: "# to maximum Life", type: "implicit" },
] }] });

test.each(["\n", "\r\n"])("normalizes implicit headers and preserves %j line endings", (lineEnding) => {
  const lines = [
    "{ Implicit Modifier }",
    "20% of Flask Recovery applied Instantly",
    "{ Implicit Modifier — Charm }",
    "Has 2(1-3) Charm Slots",
  ];
  expect(normalizeItemText(lines.join(lineEnding))).toBe([
    lines[0],
    `${lines[1]} (implicit)`,
    lines[2],
    `${lines[3]} (implicit)`,
  ].join(lineEnding));
});

test("ordinary item text and inline modifier labels remain unchanged", () => {
  const item = "Item Class: Belts\r\n--------\r\n+25 to maximum Life (implicit)\r\n+40 to maximum Life\r\n";
  expect(normalizeItemText(item)).toBe(item);
});

test.each(["implicit", "explicit", "desecrated", "rune", "crafted", "fractured", "mutated", "enchant"])(
  "preserves existing %s labels under an implicit header", (tag) => {
    const item = `{ Implicit Modifier }\n+25 to maximum Life (${tag})`;
    expect(normalizeItemText(item)).toBe(item);
  },
);

test("tags every line of a modifier, including multiline stats", () => {
  const item = "{ Implicit Modifier }\nFirst stat 10\nSecond stat 20\nContinuation 30";
  expect(normalizeItemText(item)).toBe(
    "{ Implicit Modifier }\nFirst stat 10 (implicit)\nSecond stat 20 (implicit)\nContinuation 30 (implicit)",
  );
});

test.each(["--------", "-------------", "", "   "])("resets header context at %j", (boundary) => {
  const item = `{ Implicit Modifier }\n+25 to maximum Life\n${boundary}\n+40 to maximum Life`;
  expect(normalizeItemText(item)).toBe(
    `{ Implicit Modifier }\n+25 to maximum Life (implicit)\n${boundary}\n+40 to maximum Life`,
  );
});

test.each(["Prefix", "Suffix", "Explicit", "Desecrated", "Desecrated Prefix", "Desecrated Suffix"])(
  "%s headers reset implicit context and use explicit filters", (kind) => {
    const item = `{ Implicit Modifier }\n+25 to maximum Life\n{ ${kind} Modifier "Healthy" (Tier: 1) — Life }\n+40 to maximum Life`;
    expect(matchStatsOnItem(item, lifeStats).map(({ id, value }) => ({ id, value }))).toEqual([
      { id: "explicit.life", value: { min: "40" } },
      { id: "implicit.life", value: { min: "25" } },
    ]);
  },
);

test.each(["Rune", "Crafted Prefix", "Fractured Suffix", "Mutated Prefix", "Enchant", "Enchantment", "Future Prefix"])(
  "excludes %s header contents until a boundary", (kind) => {
    const item = `{ ${kind} Modifier }\n+25 to maximum Life\n+30 to maximum Life\n--------\n+40 to maximum Life`;
    expect(matchStatsOnItem(item, lifeStats).map(({ id, value }) => ({ id, value }))).toEqual([
      { id: "explicit.life", value: { min: "40" } },
    ]);
  },
);

test("unknown headers reset implicit context and cannot leak into explicit matches", () => {
  const item = "{ Implicit Modifier }\n+25 to maximum Life\n{ Future Modifier }\n+30 to maximum Life\n{ Prefix Modifier }\n+40 to maximum Life";
  expect(normalizeItemText(item)).toBe(
    "{ Implicit Modifier }\n+25 to maximum Life (implicit)\n{ Future Modifier }\n\n{ Prefix Modifier }\n+40 to maximum Life",
  );
});

test("unrecognized brace headers are conservative", () => {
  const item = "{ Implicit Modifier }\n+25 to maximum Life\n{ Something else }\n+40 to maximum Life";
  expect(matchStatsOnItem(item, lifeStats).map(({ id }) => id)).toEqual(["implicit.life"]);
});

test("inline excluded tags under an implicit header stay excluded", () => {
  const item = "{ Implicit Modifier }\n+25 to maximum Life (rune)\n+30 to maximum Life (crafted)";
  expect(matchStatsOnItem(item, lifeStats)).toEqual([]);
});
