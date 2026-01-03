// scripts/generate-tier-data.test.js
import { expect, test, describe } from 'bun:test';
import fs from 'fs';

const TIERS_PATH = 'src/data/tiers.json';

describe('generated tier data', () => {
  const tiers = JSON.parse(fs.readFileSync(TIERS_PATH, 'utf-8'));

  test('has physical damage to attacks stat', () => {
    expect(tiers['explicit.stat_3032590688']).toBeDefined();
    expect(tiers['explicit.stat_3032590688'].text).toBe('Physical Damage to Attacks');
  });

  test('physical damage has Gloves tiers', () => {
    const glovesTiers = tiers['explicit.stat_3032590688']?.tiers?.Gloves;
    expect(glovesTiers).toBeDefined();
    expect(glovesTiers.length).toBeGreaterThan(0);
  });

  test('tier 1 is highest level requirement', () => {
    const glovesTiers = tiers['explicit.stat_3032590688']?.tiers?.Gloves;
    if (glovesTiers && glovesTiers.length > 1) {
      expect(glovesTiers[0].ilvl).toBeGreaterThanOrEqual(glovesTiers[1].ilvl);
    }
  });

  test('avgMin is calculated correctly for damage stats', () => {
    const glovesTiers = tiers['explicit.stat_3032590688']?.tiers?.Gloves;
    if (glovesTiers && glovesTiers[0]) {
      const tier = glovesTiers[0];
      if (Array.isArray(tier.min)) {
        // For damage range stats: avgMin = (min[0] + min[1]) / 2
        expect(tier.avgMin).toBe((tier.min[0] + tier.min[1]) / 2);
      }
    }
  });

  test('has resistance stats', () => {
    expect(tiers['explicit.stat_3372524247']).toBeDefined(); // Fire
    expect(tiers['explicit.stat_4220027924']).toBeDefined(); // Cold
    expect(tiers['explicit.stat_1671376347']).toBeDefined(); // Lightning
    expect(tiers['explicit.stat_2923486259']).toBeDefined(); // Chaos
  });

  test('has attribute stats', () => {
    expect(tiers['explicit.stat_4080418644']).toBeDefined(); // Strength
    expect(tiers['explicit.stat_3261801346']).toBeDefined(); // Dexterity
    expect(tiers['explicit.stat_328541901']).toBeDefined();  // Intelligence
  });
});
