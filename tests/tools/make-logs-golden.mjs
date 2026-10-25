// A6 (D-A6-6) — Genera el golden de logs del motor geométrico SOLO desde el baseline congelado (nunca desde panel/ ni src/).
// No toca ningún golden histórico. Uso: node tests/tools/make-logs-golden.mjs --update      (sin --update no escribe nada)
import fs from 'node:fs'; import path from 'node:path';
import { FIXTURES, ROOT } from '../lib/fixtures.mjs'; import { TARGETS, loadGeometry, sha256 } from '../lib/legacy.mjs'; import { trace } from '../lib/engine-trace.mjs';
import { FAMILY } from './make-illustrator-real-fixtures.mjs';
if (!process.argv.includes('--update')) { console.log('Dry-run: pasa --update para generar tests/golden/geometry-logs.golden.json desde el baseline.'); process.exit(0); }
const L = loadGeometry(TARGETS.baseline);
const real = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, `tests/fixtures/illustrator-real/${id}.dieline.json`), 'utf8'));
const golden = { _fuente: 'reference/legacy-baseline/main.js', _sha256_main_js: sha256(TARGETS.baseline), fixtures: {}, illustratorReal: {} };
for (const [id, f] of Object.entries(FIXTURES)) golden.fixtures[id] = trace(L, f.build());
for (const id of Object.keys(FAMILY)) golden.illustratorReal[id] = trace(L, real(id));
const out = path.join(ROOT, 'tests/golden/geometry-logs.golden.json'); fs.writeFileSync(out, JSON.stringify(golden, null, 1));
console.log('golden de logs escrito:', Object.keys(golden.fixtures).length, '+', Object.keys(golden.illustratorReal).length, 'troqueles; sha256', sha256(out));
