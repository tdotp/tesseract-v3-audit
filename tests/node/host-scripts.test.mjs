// A5.2 — Los textos ExtendScript que el panel envía a Illustrator (extracción, arte, Test Connection, diálogo de guardado) son IDÉNTICOS
// en el baseline, la referencia A1 (panel/) y la fuente modular (src/host/); y los módulos de src/host/ son cadenas puras (sin imports, DOM ni THREE).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { TARGETS, extractScripts } from '../lib/legacy.mjs'; import { arteD0, D0_MODULOS_NUEVOS } from '../lib/d0.mjs';
// D-0 (3.0.1-dev): src/ = baseline salvo las sustituciones H-02 y KI-37 del script de arte (exactas, una vez cada una) y los módulos nuevos de host/ declarados en tests/lib/d0.mjs.
// La igualdad estricta de F1 sigue en la batería histórica (tests/run-historico.sh).
const sha16 = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const S = Object.fromEntries(Object.entries(TARGETS).map(([k, f]) => [k, extractScripts(f)]));
const EXPECTED = { extract: [5536, 'bd4c215d56fb4cdc'], art: [5677, 'ab1c20da805454b7'], test: [48, '444efa9b8bdb7395'], save: [188, 'be6c47e148487d9d'] }; // medido sobre el baseline congelado
for (const [k, [len, h]] of Object.entries(EXPECTED)) test(`texto ExtendScript «${k}»: baseline = panel = src (igualdad de cadena; longitud y SHA-256 fijadas)`, () => {
  assert.equal(S.baseline[k].length, len); assert.equal(sha16(S.baseline[k]), h); assert.equal(S.panel[k], S.baseline[k], 'panel');
  const esperado = k === 'art' ? arteD0(S.baseline.art) : S.baseline[k]; assert.equal(S.src[k], esperado, 'src');
});
test('src/host/: módulos de cadenas puras — sin import, sin window/document, sin THREE', () => {
  const dir = path.join(path.dirname(TARGETS.src), 'host'); const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  assert.deepEqual(files, ['art.js', 'extract.js', 'save-dialog.js', 'test-connection.js', ...D0_MODULOS_NUEVOS.filter((m) => m.startsWith('host/')).map((m) => m.slice(5))].sort());
  for (const f of files) { const code = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\/\/.*$/gm, '').replace(/'(?:[^'\\\n]|\\.)*'/g, "''");
    assert.doesNotMatch(code, /^\s*import\s/m, f); assert.doesNotMatch(code, /\b(window|document|THREE)\b/, f); }
});
