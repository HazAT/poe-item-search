import { expect, test } from "vitest";
import { getSearchQuery, matchUnique, matchStatsOnItem } from "./item.js";
import { addRegexToStats } from "./stat.js";
import lifeFlask1 from "../tests/fixtures/lifeflask1.txt?raw";
import rings1 from "../tests/fixtures/rings1.txt?raw";
import charms1 from "../tests/fixtures/charms1.txt?raw";
import gloves1 from "../tests/fixtures/gloves1.txt?raw";
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

  // expect(getSearchQuery(gloves1, stats)).toStrictEqual({
  //   stats: [
  //     {
  //       filters: [
  //         {
  //           id: "explicit.stat_1873752457",
  //           value: {
  //             min: "0.25",
  //           },
  //         },
  //         {
  //           id: "explicit.stat_700317374",
  //           value: {
  //             min: "50",
  //           },
  //         },
  //       ],
  //       type: "and",
  //     },
  //   ],
  // });
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

test("matchStatsOnItem", () => {
  const regexStats = addRegexToStats(stats);
  expect(matchStatsOnItem(gloves1, regexStats)).toStrictEqual([
    {
      id: "explicit.stat_1671376347",
      regex:
        /(?:\+|-)?(\d+(?:.\d+)?)?% to (?:Resistances|Lightning Resistance)/,
      text: "#% to [Resistances|Lightning Resistance]",
      type: "explicit",
      value: {
        min: "12",
      },
    },
    {
      id: "explicit.stat_4220027924",
      regex: /(?:\+|-)?(\d+(?:.\d+)?)?% to (?:Resistances|Cold Resistance)/,
      text: "#% to [Resistances|Cold Resistance]",
      type: "explicit",
      value: {
        min: "6",
      },
    },
    {
      id: "explicit.stat_691932474",
      regex: /(?:\+|-)?(\d+(?:.\d+)?)? to (?:Accuracy|Accuracy) Rating/,
      text: "# to [Accuracy|Accuracy] Rating",
      type: "explicit",
      value: {
        min: "339",
      },
    },
    {
      id: "explicit.stat_1368271171",
      regex: /Gain (?:\+|-)?(\d+(?:.\d+)?)? Mana per Enemy Killed/,
      text: "Gain # Mana per Enemy Killed",
      type: "explicit",
      value: {
        min: "3",
      },
    },
    {
      id: "explicit.stat_4015621042",
      regex:
        /(?:\+|-)?(\d+(?:.\d+)?)?% increased (?:EnergyShield|Energy Shield)/,
      text: "#% increased [EnergyShield|Energy Shield]",
      type: "explicit",
      value: {
        min: "60",
      },
    },
    {
      id: "explicit.stat_3299347043",
      regex: /(?:\+|-)?(\d+(?:.\d+)?)? to maximum Life/,
      text: "# to maximum Life",
      type: "explicit",
      value: {
        min: "113",
      },
    },
  ]);
});
