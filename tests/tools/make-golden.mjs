// Genera los golden masters del comportamiento geométrico y de constantes SOLO desde el baseline congelado (nunca desde panel/).
// Uso: node tests/tools/make-golden.mjs --update      (sin --update no escribe nada)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { FIXTURES, ROOT } from '../lib/fixtures.mjs'; import { TARGETS, loadGeometry, sha256 } from '../lib/legacy.mjs'; import { analyze } from '../lib/analyze.mjs';
if (!process.argv.includes('--update')) { console.log('Dry-run: pasa --update para regenerar tests/golden/*.json desde el baseline.'); process.exit(0); }
const L = loadGeometry(TARGETS.baseline);
const geometry = { _fuente: 'reference/legacy-baseline/main.js', _sha256_main_js: sha256(TARGETS.baseline), fixtures: {} };
for (const [id, f] of Object.entries(FIXTURES)) geometry.fixtures[id] = { desc: f.desc, tags: f.tags, ...analyze(L, f.build()) };
fs.writeFileSync(path.join(ROOT, 'tests/golden/geometry.golden.json'), JSON.stringify(geometry, null, 1));
fs.writeFileSync(path.join(ROOT, 'tests/golden/constants.golden.json'), JSON.stringify({ _fuente: 'reference/legacy-baseline/main.js', ...L.consts }, null, 1));
console.log('golden escritos:', Object.keys(geometry.fixtures).length, 'fixtures');
