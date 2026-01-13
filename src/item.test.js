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
const gloves2 = await Bun.file("tests/fixtures/gloves2.txt").text();
const talisman1 = await Bun.file("tests/fixtures/talisman1.txt").text();
const charm2 = await Bun.file("tests/fixtures/charm2.txt").text();
const sceptre1 = await Bun.file("tests/fixtures/sceptre1.txt").text();
const chest3 = await Bun.file("tests/fixtures/chest3.txt").text();
const staff1 = await Bun.file("tests/fixtures/staff1.txt").text();
const staff2 = await Bun.file("tests/fixtures/staff2.txt").text();

test("matchStats", () => {
  expect(getSearchQuery(lifeFlask1, stats)).toStrictEqual({
    filters: {
      type_filters: {
        filters: {
          category: {
            option: "flask.life",
          },
        },
      },
    },
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
        // Non-attribute, non-spell-damage stats in "and" filter
        expect.objectContaining({
          type: "and",
          filters: expect.arrayContaining([
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
        // Cold damage now in spell damage weighted filter
        expect.objectContaining({
          type: "weight",
          filters: expect.arrayContaining([
            expect.objectContaining({
              id: "explicit.stat_3291658075", // #% increased Cold Damage
              value: { weight: 1, min: 24 },
              disabled: false,
            }),
          ]),
          value: { min: 24 },
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
        // Found resistances - enabled with weight and min
        expect.objectContaining({
          id: "explicit.stat_4220027924", // Cold Resistance
          value: { weight: 1, min: 6 },
          disabled: false,
        }),
        expect.objectContaining({
          id: "explicit.stat_1671376347", // Lightning Resistance
          value: { weight: 1, min: 14 },
          disabled: false,
        }),
        // Missing resistances - disabled with weight only
        expect.objectContaining({
          id: "explicit.stat_3372524247", // Fire Resistance
          value: { weight: 1 },
          disabled: true,
        }),
        expect.objectContaining({
          id: "explicit.stat_2923486259", // Chaos Resistance
          value: { weight: 1 },
          disabled: true,
        }),
      ]),
      value: { min: 20 }, // 6 + 14 = 20
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

// New fixture tests for regression prevention

test("gloves2 - melee gloves with phys/fire/cold damage", () => {
  const regexStats = addRegexToStats(stats);
  const matched = matchStatsOnItem(gloves2, regexStats);

  // Should match physical damage to attacks with averaged value (10+20)/2 = 15
  expect(matched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "explicit.stat_3032590688", // Adds # to # Physical Damage to Attacks
        value: { min: 15 },
      }),
    ])
  );

  // Should match fire damage to attacks with averaged value (23+34)/2 = 28.5
  expect(matched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "explicit.stat_1573130764", // Adds # to # Fire damage to Attacks
        value: { min: 28.5 },
      }),
    ])
  );

  // Should match cold damage to attacks with averaged value (3+5)/2 = 4
  expect(matched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "explicit.stat_4067062424", // Adds # to # Cold damage to Attacks
        value: { min: 4 },
      }),
    ])
  );

  // Should match melee skills level
  expect(matched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "explicit.stat_9187492", // # to Level of all Melee Skills
        value: { min: "2" },
      }),
    ])
  );

  // Should match cold resistance (Fire Resistance has (desecrated) suffix so won't match)
  expect(matched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "explicit.stat_4220027924", // Cold Resistance
        value: { min: "39" },
      }),
    ])
  );

  // Check cold resistance uses explicit stat in weighted filter (fire won't be since it has desecrated suffix)
  const query = getSearchQuery(gloves2, stats);
  expect(query.stats).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "weight",
        filters: expect.arrayContaining([
          // Cold resistance found - enabled
          expect.objectContaining({
            id: "explicit.stat_4220027924", // Cold Resistance
            value: { weight: 1, min: 39 },
            disabled: false,
          }),
          // Other resistances disabled
          expect.objectContaining({
            id: "explicit.stat_3372524247", // Fire Resistance
            disabled: true,
          }),
        ]),
        value: { min: 39 }, // Only cold resistance contributes
      }),
    ])
  );
});

test("talisman1 - physical weapon with implicit", () => {
  const regexStats = addRegexToStats(stats);
  const matched = matchStatsOnItem(talisman1, regexStats);

  // Should match implicit max rage
  expect(matched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "implicit.stat_1181501418", // # to Maximum Rage
        value: { min: "10" },
      }),
    ])
  );

  // Should match increased physical damage
  expect(matched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "explicit.stat_1509134228", // #% increased Physical Damage
        value: { min: "162" },
      }),
    ])
  );

  // Should match attack speed
  expect(matched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "explicit.stat_681332047", // #% increased Attack Speed
        value: { min: "24" },
      }),
    ])
  );

  // Should match melee skills level
  expect(matched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "explicit.stat_9187492", // # to Level of all Melee Skills
        value: { min: "5" },
      }),
    ])
  );
});

test("charm2 - unique charm", () => {
  // Should identify as unique
  expect(matchUniqueItem(charm2)).toStrictEqual("Nascent Hope");
});

test("sceptre1 - caster sceptre with spirit", () => {
  const regexStats = addRegexToStats(stats);
  const matched = matchStatsOnItem(sceptre1, regexStats);

  // Should match increased spirit
  expect(matched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "explicit.stat_3984865854", // #% increased Spirit
        value: { min: "39" },
      }),
    ])
  );

  // Should match max mana
  expect(matched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "explicit.stat_1050105434", // # to maximum Mana
        value: { min: "143" },
      }),
    ])
  );
});

test("chest3 - corrupted body armour with implicit", () => {
  const regexStats = addRegexToStats(stats);
  const matched = matchStatsOnItem(chest3, regexStats);

  // Note: All explicit stats on this item have (desecrated) suffix which won't match
  // Only the implicit stat matches
  expect(matched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "implicit.stat_2251279027", // # to Level of all Corrupted Skill Gems
        value: { min: "1" },
      }),
    ])
  );

  // Verify the length - only implicit should match since all explicits have (desecrated)
  expect(matched).toHaveLength(1);
});

test("quarterstaff - weapon with type filter", async () => {
  const quarterstaff1 = await Bun.file("tests/fixtures/quaterstaff1.txt").text();
  const query = getSearchQuery(quarterstaff1, stats);

  // Should have type filter for weapon.warstaff
  expect(query.filters).toEqual({
    type_filters: {
      filters: {
        category: {
          option: "weapon.warstaff"
        }
      }
    }
  });

  // Should match increased physical damage
  expect(query.stats).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "and",
        filters: expect.arrayContaining([
          expect.objectContaining({
            id: "explicit.stat_1509134228", // #% increased Physical Damage
            value: { min: "81" },
          }),
        ]),
      }),
    ])
  );
});

test("staff1 - caster staff with spell damage weighted group", () => {
  const query = getSearchQuery(staff1, stats);

  // Should have weighted filter for spell damage stats
  // 40% increased Spell Damage + 137% increased Cold Damage = 177
  expect(query.stats).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "weight",
        filters: expect.arrayContaining([
          // Found spell damage stats - enabled
          expect.objectContaining({
            id: "explicit.stat_2974417149", // #% increased Spell Damage
            value: { weight: 1, min: 40 },
            disabled: false,
          }),
          expect.objectContaining({
            id: "explicit.stat_3291658075", // #% increased Cold Damage
            value: { weight: 1, min: 137 },
            disabled: false,
          }),
          // Missing spell damage stats - disabled
          expect.objectContaining({
            id: "explicit.stat_3962278098", // #% increased Fire Damage
            value: { weight: 1 },
            disabled: true,
          }),
          expect.objectContaining({
            id: "explicit.stat_2231156303", // #% increased Lightning Damage
            value: { weight: 1 },
            disabled: true,
          }),
          expect.objectContaining({
            id: "explicit.stat_736967255", // #% increased Chaos Damage
            value: { weight: 1 },
            disabled: true,
          }),
          expect.objectContaining({
            id: "explicit.stat_2768835289", // #% increased Spell Physical Damage
            value: { weight: 1 },
            disabled: true,
          }),
        ]),
        value: { min: 177 }, // 40 + 137 = 177
      }),
    ])
  );

  // Other stats should be in "and" filter (mana, crit spell damage bonus, mana regen, light radius)
  expect(query.stats).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "and",
        filters: expect.arrayContaining([
          expect.objectContaining({
            id: "explicit.stat_1050105434", // # to maximum Mana
            value: { min: "352" },
          }),
          expect.objectContaining({
            id: "explicit.stat_274716455", // #% increased Critical Spell Damage Bonus
            value: { min: "58" },
          }),
        ]),
      }),
    ])
  );

  // Intelligence should be in attribute weighted group
  expect(query.stats).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "weight",
        filters: expect.arrayContaining([
          expect.objectContaining({
            id: "explicit.stat_328541901", // # to Intelligence
            value: { weight: 1, min: 10 },
            disabled: false,
          }),
        ]),
        value: { min: 10 },
      }),
    ])
  );
});

test("staff2 - caster staff with gain as extra damage weighted group", () => {
  const query = getSearchQuery(staff2, stats);

  // Should have weighted filter for gain as extra damage stats
  // 54% Fire + 53% Cold = 107
  expect(query.stats).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "weight",
        filters: expect.arrayContaining([
          // Found gain as extra damage stats - enabled
          expect.objectContaining({
            id: "explicit.stat_3015669065", // Gain #% of Damage as Extra Fire Damage
            value: { weight: 1, min: 54 },
            disabled: false,
          }),
          expect.objectContaining({
            id: "explicit.stat_2505884597", // Gain #% of Damage as Extra Cold Damage
            value: { weight: 1, min: 53 },
            disabled: false,
          }),
          // Missing gain as extra damage stats - disabled
          expect.objectContaining({
            id: "explicit.stat_3278136794", // Gain #% of Damage as Extra Lightning Damage
            value: { weight: 1 },
            disabled: true,
          }),
          expect.objectContaining({
            id: "explicit.stat_3398787959", // Gain #% of Damage as Extra Chaos Damage
            value: { weight: 1 },
            disabled: true,
          }),
          expect.objectContaining({
            id: "explicit.stat_4019237939", // Gain #% of Damage as Extra Physical Damage
            value: { weight: 1 },
            disabled: true,
          }),
        ]),
        value: { min: 107 }, // 54 + 53 = 107
      }),
    ])
  );

  // Intelligence should be in attribute weighted group
  expect(query.stats).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "weight",
        filters: expect.arrayContaining([
          expect.objectContaining({
            id: "explicit.stat_328541901", // # to Intelligence
            value: { weight: 1, min: 25 },
            disabled: false,
          }),
        ]),
        value: { min: 25 },
      }),
    ])
  );
});
