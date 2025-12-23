import { expect, test } from "bun:test";
import { getSearchQuery, matchUniqueItem, matchStatsOnItem } from "./item.js";
import { addRegexToStats } from "./stat.js";
import stats from "../tests/fixtures/stats.json";

const lifeFlask1 = await Bun.file("tests/fixtures/lifeflask1.txt").text();
const rings1 = await Bun.file("tests/fixtures/rings1.txt").text();
const charms1 = await Bun.file("tests/fixtures/charms1.txt").text();
const gloves1 = await Bun.file("tests/fixtures/gloves1.txt").text();
const chest2 = await Bun.file("tests/fixtures/chest2.txt").text();
const belts1 = await Bun.file("tests/fixtures/belts1.txt").text();

test("matchStats", () => {
  expect(getSearchQuery(lifeFlask1, stats)).toStrictEqual({
    stats: [
      {
        filters: [
          {
            id: "explicit.stat_700317374",
            value: {
              min: "50",
            },
          },
          {
            id: "explicit.stat_1873752457",
            value: {
              min: "0.25",
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
        // Non-attribute stats in "and" filter
        expect.objectContaining({
          type: "and",
          filters: expect.arrayContaining([
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
        // Strength in weighted attribute filter
        expect.objectContaining({
          type: "weight",
          filters: expect.arrayContaining([
            expect.objectContaining({
              id: "explicit.stat_4080418644",
              value: { weight: 1, min: 13 },
              disabled: false,
            }),
          ]),
          value: { min: 13 },
        }),
      ]),
      term: "Polcirkeln",
    })
  );
});

test("matchStatsOnItem", () => {
  const regexStats = addRegexToStats(stats);

  // chest2 - check that we match the armour/evasion/ES stat
  expect(matchStatsOnItem(chest2, regexStats)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "explicit.stat_3523867985",
        text: "#% increased Armour, Evasion and Energy Shield",
        value: { min: "253" },
      }),
    ])
  );

  // gloves1 - check key stats match (API format changed, using objectContaining for flexibility)
  expect(matchStatsOnItem(gloves1, regexStats)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "explicit.stat_1671376347",
        value: { min: "14" },
      }),
      expect.objectContaining({
        id: "explicit.stat_4220027924",
        value: { min: "6" },
      }),
      expect.objectContaining({
        id: "explicit.stat_803737631", // Accuracy Rating (new ID)
        value: { min: "339" },
      }),
      expect.objectContaining({
        id: "explicit.stat_4015621042",
        value: { min: "60" },
      }),
      expect.objectContaining({
        id: "explicit.stat_3299347043",
        value: { min: "113" },
      }),
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
          id: "explicit.stat_803737631", // Accuracy Rating (new ID)
          value: { min: "339" },
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
