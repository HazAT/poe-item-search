import fs from 'fs';
import path from 'path';

const APIS = [
    {
        name: 'PoE 2 (trade2)',
        url: 'https://www.pathofexile.com/api/trade2/data/stats',
        output: 'tests/fixtures/stats.json'
    },
    {
        name: 'PoE 1 (trade)',
        url: 'https://www.pathofexile.com/api/trade/data/stats',
        output: 'tests/fixtures/stats-poe1.json'
    }
];

async function fetchStats() {
    console.log('Fetching latest stats from PoE Trade APIs...\n');

    for (const api of APIS) {
        try {
            console.log(`Fetching ${api.name}...`);
            const response = await fetch(api.url, {
                headers: {
                    'User-Agent': 'poe-item-search/1.0 (https://github.com/poe-item-search)'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const outputPath = path.join('./', api.output);

            fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
            console.log(`  Saved to ${api.output}`);
        } catch (error) {
            console.error(`  Error fetching ${api.name}: ${error.message}`);
        }
    }

    console.log('\nDone!');
}

fetchStats();
