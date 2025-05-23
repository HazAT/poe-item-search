import { expect, test } from "vitest";
import { getSearchQuery, matchUniqueItem, matchStatsOnItem } from "./item.js";
import { addRegexToStats } from "./stat.js";
import lifeFlask1 from "../tests/fixtures/lifeflask1.txt?raw";
import rings1 from "../tests/fixtures/rings1.txt?raw";
import charms1 from "../tests/fixtures/charms1.txt?raw";
import gloves1 from "../tests/fixtures/gloves1.txt?raw";
import chest2 from "../tests/fixtures/chest2.txt?raw";
import stats from "../tests/fixtures/stats.json";
import belts1 from "../tests/fixtures/belts1.txt?raw";

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
  expect(getSearchQuery(rings1, stats)).toEqual(
    expect.objectContaining({
      stats: expect.arrayContaining([
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              id: "explicit.stat_4080418644",
              value: { min: "13" },
            }),
            expect.objectContaining({
              id: "explicit.stat_3291658075",
              value: { min: "24" },
            }),
            expect.objectContaining({
              id: "explicit.stat_1050105434",
              value: { min: "53" },
            }),
          ]),
        }),
      ]),
      term: "Polcirkeln",
    })
  );
});

test("matchStatsOnItem", () => {
  const regexStats = addRegexToStats(stats);

  expect(matchStatsOnItem(chest2, regexStats)).toEqual(
    expect.arrayContaining([
      {
        id: "explicit.stat_2593651571",
        regex:
          /^\+(?:\+|-)?(\d+(?:.\d+)?)?% to all (?:Resistances|Elemental Resistances) per Socketed (?:Rune|Rune) or (?:SoulCore|Soul Core)(?! \(implicit\))$/gm,
        text: "+#% to all [Resistances|Elemental Resistances] per Socketed [Rune|Rune] or [SoulCore|Soul Core]",
        type: "explicit",
        value: {
          min: "10",
        },
      },
      {
        id: "explicit.stat_3523867985",
        regex:
          /^(?:\+|-)?(\d+(?:.\d+)?)?% increased (?:Armour|Armour), (?:Evasion|Evasion) and (?:EnergyShield|Energy Shield)(?! \(implicit\))$/gm,
        text: "#% increased [Armour|Armour], [Evasion|Evasion] and [EnergyShield|Energy Shield]",
        type: "explicit",
        value: {
          min: "253",
        },
      },
      {
        id: "explicit.stat_911712882",
        regex:
          /^(?:\+|-)?(\d+(?:.\d+)?)?% increased Maximum Mana per Socketed (?:Rune|Rune) or (?:SoulCore|Soul Core)(?! \(implicit\))$/gm,
        text: "#% increased Maximum Mana per Socketed [Rune|Rune] or [SoulCore|Soul Core]",
        type: "explicit",
        value: {
          min: "5",
        },
      },
    ])
  );

  expect(matchStatsOnItem(gloves1, regexStats)).toEqual(
    expect.arrayContaining([
      {
        id: "explicit.stat_1671376347",
        regex:
          /^(?:\+|-)?(\d+(?:.\d+)?)?% to (?:Resistances|Lightning Resistance)(?! \(implicit\))$/gm,
        text: "#% to [Resistances|Lightning Resistance]",
        type: "explicit",
        value: {
          min: "14",
        },
      },
      {
        id: "explicit.stat_4220027924",
        regex:
          /^(?:\+|-)?(\d+(?:.\d+)?)?% to (?:Resistances|Cold Resistance)(?! \(implicit\))$/gm,
        text: "#% to [Resistances|Cold Resistance]",
        type: "explicit",
        value: {
          min: "6",
        },
      },
      {
        id: "explicit.stat_691932474",
        regex:
          /^(?:\+|-)?(\d+(?:.\d+)?)? to (?:Accuracy|Accuracy) Rating(?! \(implicit\))$/gm,
        text: "# to [Accuracy|Accuracy] Rating",
        type: "explicit",
        value: {
          min: "339",
        },
      },
      {
        id: "explicit.stat_1368271171",
        regex:
          /^Gain (?:\+|-)?(\d+(?:.\d+)?)? Mana per Enemy Killed(?! \(implicit\))$/gm,
        text: "Gain # Mana per Enemy Killed",
        type: "explicit",
        value: {
          min: "3",
        },
      },
      {
        id: "explicit.stat_4015621042",
        regex:
          /^(?:\+|-)?(\d+(?:.\d+)?)?% increased (?:EnergyShield|Energy Shield)(?! \(implicit\))$/gm,
        text: "#% increased [EnergyShield|Energy Shield]",
        type: "explicit",
        value: {
          min: "60",
        },
      },
      {
        id: "explicit.stat_3299347043",
        regex: /^(?:\+|-)?(\d+(?:.\d+)?)? to maximum Life(?! \(implicit\))$/gm,
        text: "# to maximum Life",
        type: "explicit",
        value: {
          min: "113",
        },
      },
    ])
  );
});

test("matchImplicit", () => {
  const regexStats = addRegexToStats(stats);
  expect(matchStatsOnItem(belts1, regexStats)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "explicit.stat_1836676211",
        value: { min: "23" },
      }),
      expect.objectContaining({
        id: "implicit.stat_1836676211",
        value: { min: "29" },
      }),
    ])
  );
});

test("matchRingColdResistance", () => {
  const regexStats = addRegexToStats(stats);
  expect(matchStatsOnItem(rings1, regexStats)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "implicit.stat_4220027924",
        value: { min: "22" },
      }),
    ])
  );
});

test("getSearchQueryWithResistances", () => {
  const query = getSearchQuery(gloves1, stats);
  expect(query.stats).toEqual([
    {
      type: "and",
      filters: expect.arrayContaining([
        expect.objectContaining({
          id: "explicit.stat_691932474",
          value: { min: "339" },
        }),
        expect.objectContaining({
          id: "explicit.stat_1368271171",
          value: { min: "3" },
        }),
        expect.objectContaining({
          id: "explicit.stat_4015621042",
          value: { min: "60" },
        }),
        expect.objectContaining({
          id: "explicit.stat_3299347043",
          value: { min: "113" },
        }),
      ]),
    },
    {
      type: "weight",
      filters: expect.arrayContaining([
        {
          id: "explicit.stat_4220027924", // Cold
          value: { weight: 1, min: 6 },
          disabled: false,
        },
        {
          id: "explicit.stat_1671376347", // Lightning
          value: { weight: 1, min: 14 },
          disabled: false,
        },
        {
          id: "explicit.stat_3372524247", // Fire
          value: { weight: 1 },
          disabled: true,
        },
        {
          id: "explicit.stat_2923486259", // Chaos
          value: { weight: 1 },
          disabled: true,
        },
      ]),
      value: { min: 20 }, // 6 (Cold) + 14 (Lightning) = 20
    },
  ]);
});

test("getSearchQueryWithoutResistances", () => {
  const query = getSearchQuery(lifeFlask1, stats);
  expect(query.stats).toEqual([
    {
      type: "and",
      filters: expect.arrayContaining([
        expect.objectContaining({
          id: "explicit.stat_1873752457",
          value: { min: "0.25" },
        }),
        expect.objectContaining({
          id: "explicit.stat_700317374",
          value: { min: "50" },
        }),
      ]),
    },
  ]);
});
