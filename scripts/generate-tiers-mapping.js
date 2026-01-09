// generate-tiers-mapping.js (ESM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// tiers.json está no mesmo diretório do script
const tiersPath = path.join(__dirname, 'tiers.json');
const raw = fs.readFileSync(tiersPath, 'utf8');
const data = JSON.parse(raw);

// acumula linhas do markdown
const lines = [];
lines.push('# Tiers support mapping\n');

// ids já usados em algum grupo
const usedIds = new Set();

function addSection(title, filterFn) {
  const entries = Object.entries(data).filter(([id, info]) =>
    filterFn(id, info.text || '')
  );
  if (!entries.length) return;

  lines.push(`\n## ${title}\n`);
  lines.push('| Stat ID | Text |');
  lines.push('|---------|------|');

  for (const [id, info] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    const txt = String(info.text || '').replace(/\|/g, '\\|');
    lines.push(`| \`${id}\` | ${txt} |`);
    usedIds.add(id);
  }
}

// grupos principais
addSection('Damage to Attacks', (_id, text) =>
  /damage to attacks/i.test(text)
);

addSection('Resistances', (_id, text) =>
  /resistance/i.test(text)
);

addSection('Maximum Life', (_id, text) =>
  /maximum life/i.test(text) && !/increased maximum life/i.test(text)
);

addSection('Increased Maximum Life', (_id, text) =>
  /increased maximum life/i.test(text)
);

addSection('Life Regeneration', (_id, text) =>
  /regeneration per second|regenerate/i.test(text)
);

// Other = qualquer stat que ainda não foi usado em nenhuma seção
addSection('Other', (id, _text) =>
  !usedIds.has(id)
);

const outPath = path.join(__dirname, 'TIERS_MAPPING.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('TIERS_MAPPING.md gerado em', outPath);
