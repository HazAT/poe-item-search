import { expect, test } from "vitest";
import { matchStats } from "./item.js";
import lifeFlask1 from "../tests/fixtures/lifeflask1.txt?raw";
import stats from "../tests/fixtures/stats.json";

test("matchStats", () => {
  expect(matchStats(lifeFlask1, stats)).toStrictEqual([
    {
      id: "explicit.stat_1873752457",
      regex: /Gains (?:\+|-)?(\d+(?:.\d+)?)? Charges per Second/,
      text: "Gains # Charges per Second",
      type: "explicit",
      value: {
        min: "0.25",
      },
    },
    {
      id: "explicit.stat_700317374",
      regex: /(?:\+|-)?(\d+(?:.\d+)?)?% increased Amount Recovered/,
      text: "#% increased Amount Recovered",
      type: "explicit",
      value: {
        min: "50",
      },
    },
  ]);
});
