/**
 * Writes the client copy of the DSA curriculum (client/src/pages/CodeVisualizer/learn/curriculum.json)
 * from the server seed (server/src/data/dsaCurriculum.ts). The client shows these lessons as cards and
 * pages even before the server has the curriculum; tests/dsaCurriculum.test.ts fails if they drift.
 *
 * Run after editing the seed:  cd server && node scripts/gen-dsa-curriculum-client.js
 */
const path = require('path');
const fs = require('fs');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });
const { DSA_CURRICULUM, DSA_SEED_VERSION } = require(path.join(__dirname, '../src/data/dsaCurriculum.ts'));
const target = path.join(__dirname, '../../client/src/pages/CodeVisualizer/learn/curriculum.json');
fs.writeFileSync(target, JSON.stringify({ version: DSA_SEED_VERSION, modules: DSA_CURRICULUM }, null, 1) + '\n');
console.log(`Wrote ${DSA_CURRICULUM.length} modules (seed v${DSA_SEED_VERSION}) to ${path.relative(process.cwd(), target)}`);
