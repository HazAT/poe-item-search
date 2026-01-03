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

function calculateAvgMin(stats) {
  // For damage stats with min/max (2 stats), average the minimums
  if (stats.length === 2) {
    const minStat = stats.find(s => s.id.includes('minimum'));
    const maxStat = stats.find(s => s.id.includes('maximum'));
    if (minStat && maxStat) {
      return (minStat.min + maxStat.min) / 2;
    }
  }
  // For single-value stats, use the minimum
  if (stats.length === 1) {
    return stats[0].min;
  }
  return stats[0].min;
}

function buildTiersForStat(mods, statConfig, itemClasses) {
  const matches = findModsByStatPattern(mods, statConfig.pattern);

  // Filter to prefix/suffix only (exclude corrupted, essence, etc.)
  const craftable = matches.filter(m =>
    m.generation_type === 'prefix' || m.generation_type === 'suffix'
  );

  // Sort by required_level descending (highest = T1)
  craftable.sort((a, b) => b.required_level - a.required_level);

  const tiersByClass = {};

  for (const itemClass of itemClasses) {
    const applicableMods = craftable.filter(m => canSpawnOnClass(m, itemClass));

    if (applicableMods.length === 0) continue;

    tiersByClass[itemClass] = applicableMods.map((mod, index) => ({
      tier: index + 1,
      name: mod.name,
      min: mod.stats.length === 2
        ? [mod.stats[0].min, mod.stats[1].min]
        : mod.stats[0].min,
      max: mod.stats.length === 2
        ? [mod.stats[0].max, mod.stats[1].max]
        : mod.stats[0].max,
      avgMin: calculateAvgMin(mod.stats),
      ilvl: mod.required_level,
    }));
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
