import { expect, test } from "vitest";
import { getSearchQuery, matchUnique } from "./item.js";
import lifeFlask1 from "../tests/fixtures/lifeflask1.txt?raw";
import rings1 from "../tests/fixtures/rings1.txt?raw";
import charms1 from "../tests/fixtures/charms1.txt?raw";
import stats from "../tests/fixtures/stats.json";

test("matchStats", () => {
  expect(getSearchQuery(lifeFlask1, stats)).toStrictEqual({
    stats: [
      {
        filters: [
          {
            id: "explicit.stat_1873752457",
            value: {
              min: "0.25",
            },
          },
          {
            id: "explicit.stat_700317374",
            value: {
              min: "50",
            },
          },
        ],
        type: "and",
      },
    ],
  });
});

test("matchUnique", () => {
  expect(matchUnique(rings1)).toStrictEqual("Polcirkeln");
  expect(matchUnique(charms1)).toBeUndefined();
});

test("unique", () => {
  expect(getSearchQuery(rings1, stats)).toStrictEqual({
    term: "Polcirkeln",
  });
});
