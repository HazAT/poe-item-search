import { expect, test } from "vitest";
import { getSearchQuery, matchUniqueItem, matchStatsOnItem } from "./item.js";
import { addRegexToStats } from "./stat.js";
import lifeFlask1 from "../tests/fixtures/lifeflask1.txt?raw";
import rings1 from "../tests/fixtures/rings1.txt?raw";
import charms1 from "../tests/fixtures/charms1.txt?raw";
import gloves1 from "../tests/fixtures/gloves1.txt?raw";
import chest2 from "../tests/fixtures/chest2.txt?raw";
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
  expect(matchUniqueItem(rings1)).toStrictEqual("Polcirkeln");
  expect(matchUniqueItem(charms1)).toBeUndefined();
});

test("unique", () => {
  expect(getSearchQuery(rings1, stats)).toStrictEqual({
    stats: [
      {
        filters: [
          {
            id: "explicit.stat_4080418644",
            value: {
              min: "13",
            },
          },
          {
            id: "explicit.stat_3291658075",
            value: {
              min: "24",
            },
          },
          {
            id: "explicit.stat_1050105434",
            value: {
              min: "53",
            },
          },
        ],
        type: "and",
      },
    ],
    term: "Polcirkeln",
  });
});

test("matchStatsOnItem", () => {
  const regexStats = addRegexToStats(stats);

  expect(matchStatsOnItem(chest2, regexStats)).toStrictEqual([
    {
      id: "explicit.stat_2593651571",
      regex:
        /^\+(?:\+|-)?(\d+(?:.\d+)?)?% to all (?:Resistances|Elemental Resistances) per Socketed (?:Rune|Rune) or (?:SoulCore|Soul Core)$/gm,
      text: "+#% to all [Resistances|Elemental Resistances] per Socketed [Rune|Rune] or [SoulCore|Soul Core]",
      type: "explicit",
      value: {
        min: "10",
      },
    },
    {
      id: "explicit.stat_3523867985",
      regex:
        /^(?:\+|-)?(\d+(?:.\d+)?)?% increased (?:Armour|Armour), (?:Evasion|Evasion) and (?:EnergyShield|Energy Shield)$/gm,
      text: "#% increased [Armour|Armour], [Evasion|Evasion] and [EnergyShield|Energy Shield]",
      type: "explicit",
      value: {
        min: "253",
      },
    },
    {
      id: "explicit.stat_911712882",
      regex:
        /^(?:\+|-)?(\d+(?:.\d+)?)?% increased Maximum Mana per Socketed (?:Rune|Rune) or (?:SoulCore|Soul Core)$/gm,
      text: "#% increased Maximum Mana per Socketed [Rune|Rune] or [SoulCore|Soul Core]",
      type: "explicit",
      value: {
        min: "5",
      },
    },
  ]);

  expect(matchStatsOnItem(gloves1, regexStats)).toStrictEqual([
    {
      id: "explicit.stat_1671376347",
      regex:
        /^(?:\+|-)?(\d+(?:.\d+)?)?% to (?:Resistances|Lightning Resistance)$/gm,
      text: "#% to [Resistances|Lightning Resistance]",
      type: "explicit",
      value: {
        min: "14",
      },
    },
    {
      id: "explicit.stat_4220027924",
      regex: /^(?:\+|-)?(\d+(?:.\d+)?)?% to (?:Resistances|Cold Resistance)$/gm,
      text: "#% to [Resistances|Cold Resistance]",
      type: "explicit",
      value: {
        min: "6",
      },
    },
    {
      id: "explicit.stat_691932474",
      regex: /^(?:\+|-)?(\d+(?:.\d+)?)? to (?:Accuracy|Accuracy) Rating$/gm,
      text: "# to [Accuracy|Accuracy] Rating",
      type: "explicit",
      value: {
        min: "339",
      },
    },
    {
      id: "explicit.stat_1368271171",
      regex: /^Gain (?:\+|-)?(\d+(?:.\d+)?)? Mana per Enemy Killed$/gm,
      text: "Gain # Mana per Enemy Killed",
      type: "explicit",
      value: {
        min: "3",
      },
    },
    {
      id: "explicit.stat_4015621042",
      regex:
        /^(?:\+|-)?(\d+(?:.\d+)?)?% increased (?:EnergyShield|Energy Shield)$/gm,
      text: "#% increased [EnergyShield|Energy Shield]",
      type: "explicit",
      value: {
        min: "60",
      },
    },
    {
      id: "explicit.stat_3299347043",
      regex: /^(?:\+|-)?(\d+(?:.\d+)?)? to maximum Life$/gm,
      text: "# to maximum Life",
      type: "explicit",
      value: {
        min: "113",
      },
    },
  ]);
});
