// scripts/generate-tier-data.js
import fs from 'fs';
import path from 'path';

const MODS_PATH = 'tests/fixtures/mods.json';
const MODS_BY_BASE_PATH = 'tests/fixtures/mods_by_base.json';
const OUTPUT_PATH = 'src/data/tiers.json';

// Stat IDs we care about (trade API ID -> game data stat pattern)
const STAT_WHITELIST = {
  // Damage to Attacks
  'explicit.stat_3032590688': { pattern: 'attack_minimum_added_physical_damage', name: 'Physical Damage to Attacks' },
  'explicit.stat_1573130764': { pattern: 'attack_minimum_added_fire_damage', name: 'Fire Damage to Attacks' },
  'explicit.stat_4067062424': { pattern: 'attack_minimum_added_cold_damage', name: 'Cold Damage to Attacks' },

  // Resistances
  'explicit.stat_3372524247': { pattern: 'base_fire_damage_resistance_%', name: 'Fire Resistance' },
  'explicit.stat_4220027924': { pattern: 'base_cold_damage_resistance_%', name: 'Cold Resistance' },
  'explicit.stat_1671376347': { pattern: 'base_lightning_damage_resistance_%', name: 'Lightning Resistance' },
  'explicit.stat_2923486259': { pattern: 'base_chaos_damage_resistance_%', name: 'Chaos Resistance' },

  // Attributes
  'explicit.stat_4080418644': { pattern: 'additional_strength', name: 'Strength' },
  'explicit.stat_3261801346': { pattern: 'additional_dexterity', name: 'Dexterity' },
  'explicit.stat_328541901': { pattern: 'additional_intelligence', name: 'Intelligence' },

  // Life
  'explicit.stat_3299347043': { pattern: 'base_maximum_life', name: 'Maximum Life' },
  'explicit.stat_983749596': { pattern: 'maximum_life_+%', name: 'Increased Maximum Life' },

  // Life Regeneration (game data is per minute, trade API is per second - divide by 60)
  'explicit.stat_3325883026': { pattern: 'base_life_regeneration_rate_per_minute', name: 'Life Regeneration per Second', divisor: 60 },
  'explicit.stat_44972811': { pattern: 'life_regeneration_rate_+%', name: 'Increased Life Regeneration Rate' },

  // Mana
  'explicit.stat_1050105434': { pattern: 'base_maximum_mana', name: 'Maximum Mana' },
  'explicit.stat_2748665614': { pattern: 'maximum_mana_+%', name: 'Increased Maximum Mana' },

  // NOTE: Armour/Evasion/Energy Shield stats are NOT included because:
  // - Trade API uses global stat IDs even for local mods on armor pieces
  // - But the game data has different tiers for global (jewelry) vs local (armor) mods
  // - This causes item class mismatch: helmet uses global stat ID but needs local tier data
  // - Until we can properly map armor slots to their defense tier data, these are excluded
};

// Item classes we care about (trade API names)
const ITEM_CLASSES = ['Gloves', 'Boots', 'Body Armours', 'Helmets', 'Rings', 'Amulets', 'Belts', 'Quivers'];

// Map item class to spawn_weight tags
const CLASS_TO_TAGS = {
  'Gloves': ['gloves'],
  'Boots': ['boots'],
  'Body Armours': ['body_armour'],
  'Helmets': ['helmet'],
  'Rings': ['ring'],
  'Amulets': ['amulet'],
  'Belts': ['belt'],
  'Quivers': ['quiver'],
};

function findModsByStatPattern(mods, pattern) {
  const matches = [];

  for (const [modId, mod] of Object.entries(mods)) {
    if (!mod.stats) continue;

    const hasMatchingStat = mod.stats.some(stat =>
      stat.id && stat.id.includes(pattern)
    );

    if (hasMatchingStat) {
      matches.push({ modId, ...mod });
    }
  }

  return matches;
}

function canSpawnOnClass(mod, itemClass) {
  const tags = CLASS_TO_TAGS[itemClass];
  if (!tags || !mod.spawn_weights) return false;

  for (const sw of mod.spawn_weights) {
    if (tags.includes(sw.tag) && sw.weight > 0) {
      return true;
    }
  }
  return false;
}

function calculateAvgMin(stats, pattern) {
  // For damage stats with min/max (2 stats), average the minimums
  if (stats.length === 2) {
    const minStat = stats.find(s => s.id.includes('minimum'));
    const maxStat = stats.find(s => s.id.includes('maximum'));
    if (minStat && maxStat) {
      return (minStat.min + maxStat.min) / 2;
    }
  }

  // If pattern provided, find the matching stat
  if (pattern) {
    const matchingStat = stats.find(s => s.id.includes(pattern));
    if (matchingStat) {
      return matchingStat.min;
    }
  }

  // For single-value stats, use the minimum
  if (stats.length === 1) {
    return stats[0].min;
  }
  return stats[0].min;
}

function getStatValues(stats, pattern) {
  // For damage stats with min/max ranges, return array
  if (stats.length === 2) {
    const minStat = stats.find(s => s.id.includes('minimum'));
    const maxStat = stats.find(s => s.id.includes('maximum'));
    if (minStat && maxStat) {
      return {
        min: [minStat.min, maxStat.min],
        max: [minStat.max, maxStat.max],
      };
    }
  }

  // If pattern provided, find the matching stat
  if (pattern) {
    const matchingStat = stats.find(s => s.id.includes(pattern));
    if (matchingStat) {
      return { min: matchingStat.min, max: matchingStat.max };
    }
  }

  // Single stat
  if (stats.length === 1) {
    return { min: stats[0].min, max: stats[0].max };
  }

  return { min: stats[0].min, max: stats[0].max };
}

function buildTiersForStat(mods, statConfig, itemClasses) {
  const matches = findModsByStatPattern(mods, statConfig.pattern);
  const divisor = statConfig.divisor || 1;

  // Filter to prefix/suffix only (exclude corrupted, essence, etc.)
  let craftable = matches.filter(m =>
    m.generation_type === 'prefix' || m.generation_type === 'suffix'
  );

  // Filter out hybrid mods (mods with unrelated stats) unless explicitly allowed
  // Keep mods where: single stat, or all stats match the pattern (for range stats like damage)
  if (!statConfig.includeHybrids) {
    craftable = craftable.filter(m => {
      if (m.stats.length === 1) return true;
      // For 2-stat mods, check if it's a min/max range (both stats should contain 'minimum' or 'maximum')
      if (m.stats.length === 2) {
        const hasMinMax = m.stats.some(s => s.id.includes('minimum')) &&
                         m.stats.some(s => s.id.includes('maximum'));
        if (hasMinMax) return true;
      }
      // Otherwise it's a hybrid mod - exclude it
      return false;
    });
  }

  // Sort by required_level descending (highest = T1)
  craftable.sort((a, b) => b.required_level - a.required_level);

  const tiersByClass = {};

  // Helper to apply divisor and round to 1 decimal place
  const applyDivisor = (value) => {
    if (Array.isArray(value)) {
      return value.map(v => Math.round((v / divisor) * 10) / 10);
    }
    return Math.round((value / divisor) * 10) / 10;
  };

  for (const itemClass of itemClasses) {
    const applicableMods = craftable.filter(m => canSpawnOnClass(m, itemClass));

    if (applicableMods.length === 0) continue;

    tiersByClass[itemClass] = applicableMods.map((mod, index) => {
      const values = getStatValues(mod.stats, statConfig.pattern);
      return {
        tier: index + 1,
        name: mod.name,
        min: applyDivisor(values.min),
        max: applyDivisor(values.max),
        avgMin: applyDivisor(calculateAvgMin(mod.stats, statConfig.pattern)),
        ilvl: mod.required_level,
      };
    });
  }

  return tiersByClass;
}

async function main() {
  console.log('Generating tier data...\n');

  // Check if source files exist
  if (!fs.existsSync(MODS_PATH)) {
    console.error(`Error: ${MODS_PATH} not found`);
    console.error('Download mods.json from poe-mods data source');
    process.exit(1);
  }

  console.log('Loading mods data...');
  const mods = JSON.parse(fs.readFileSync(MODS_PATH, 'utf-8'));

  console.log(`Loaded ${Object.keys(mods).length} mods`);

  const output = {};

  // Process each whitelisted stat
  for (const [statId, config] of Object.entries(STAT_WHITELIST)) {
    console.log(`Processing: ${config.name}`);

    const tiers = buildTiersForStat(mods, config, ITEM_CLASSES);
    const classCount = Object.keys(tiers).length;

    if (classCount > 0) {
      output[statId] = {
        text: config.name,
        tiers: tiers,
      };
      console.log(`  -> ${classCount} item classes with tiers`);
    } else {
      console.log(`  -> No tiers found (skipping)`);
    }
  }

  // Write output
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nWritten to ${OUTPUT_PATH}`);
  console.log(`Total stats: ${Object.keys(output).length}`);
}

main();
