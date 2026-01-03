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
  'explicit.stat_3372524247': { pattern: 'fire_resistance_%', name: 'Fire Resistance' },
  'explicit.stat_4220027924': { pattern: 'cold_resistance_%', name: 'Cold Resistance' },
  'explicit.stat_1671376347': { pattern: 'lightning_resistance_%', name: 'Lightning Resistance' },
  'explicit.stat_2923486259': { pattern: 'chaos_resistance_%', name: 'Chaos Resistance' },

  // Attributes
  'explicit.stat_4080418644': { pattern: 'strength', name: 'Strength' },
  'explicit.stat_3261801346': { pattern: 'dexterity', name: 'Dexterity' },
  'explicit.stat_328541901': { pattern: 'intelligence', name: 'Intelligence' },
};

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
  console.log('TODO: Implement tier extraction');
}

main();
