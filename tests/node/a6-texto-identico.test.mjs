// A6 (T2) — Mover no cambia ni un carácter: cada función del motor geométrico tiene en src/ (esté en main.js o en core/legacy/)
// EXACTAMENTE el mismo texto que en panel/main.js (referencia A1 congelada), normalizando solo la sangría de 4 espacios de la clausura y «export».
// Única excepción declarada (D-A6-3): validateGeometry, que se parte en A6.5 (ver su prueba propia).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { TARGETS, GEOMETRY_FUNCTIONS, sourceText, extractFunctions } from '../lib/legacy.mjs';

const MOVED = GEOMETRY_FUNCTIONS.filter((n) => n !== 'validateGeometry');
const panel = extractFunctions(fs.readFileSync(TARGETS.panel, 'utf8')); const base = extractFunctions(fs.readFileSync(TARGETS.baseline, 'utf8'));
const srcText = sourceText(TARGETS.src); const src = extractFunctions(srcText);
const norm = (t) => { const L = t.split('\n'); return L[0].startsWith('    ') ? L.map((l) => (l.startsWith('    ') ? l.slice(4) : l)).join('\n') : t; };

test('23 funciones del motor (todas salvo validateGeometry) y la referencia A1 = baseline en esas funciones', () => {
  assert.equal(MOVED.length, 23); for (const n of MOVED) assert.equal(panel.get(n), base.get(n), n);
});
for (const n of MOVED) test(`texto idéntico: ${n}`, () => {
  assert.ok(src.has(n), n + ' no está en src/'); assert.equal(norm(src.get(n)), norm(panel.get(n)));
  assert.equal((srcText.match(new RegExp('^(?: {4}|)(?:export )?function ' + n + '\\(', 'gm')) || []).length, 1, 'una sola definición');
});
test('validateGeometry: idéntica mientras no exista validateDieline (A6.5 la parte)', { skip: src.has('validateDieline') ? 'partida en A6.5: ver a6-validacion' : false }, () => {
  assert.equal(norm(src.get('validateGeometry')), norm(panel.get('validateGeometry')));
});
