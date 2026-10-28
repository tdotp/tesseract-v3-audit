// F2A-1 — Estrés diferencial reducido (la corrida grande, 300 + 2000 casos, está en docs/fase2/evidencia/f2a1-estres.*): núcleo = oráculo
// en troqueles sintéticos aleatorios degenerados y en transformaciones de semejanza aleatorias de la Caja Botánica (semilla fija).
import { test } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../lib/fixtures.mjs';
import { nucleo } from '../../experimental/geometria/nucleo.js';
import { oraculo } from '../lib/f2/oraculo.mjs';
import { transformarDouble } from '../lib/f2/comparar.mjs';
import { compararConOraculo } from '../lib/f2/comparar-nucleo.mjs';
import { sintetico, generador } from '../lib/f2/aleatorios.mjs';

test('150 troqueles sintéticos aleatorios degenerados (sin ajuste): núcleo = oráculo', () => { const r = generador(11); for (let k = 0; k < 150; k++) { const d = sintetico(r); compararConOraculo(nucleo(d), oraculo(d)); } });
test('6 semejanzas aleatorias (rotación, escala ×0.5–×2, traslación ≤ 1e5) de la extracción de Illustrator real con ε 0.05: núcleo = oráculo y 13 paneles', () => {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), 'utf8')); const r = generador(5);
  for (let k = 0; k < 6; k++) { const a = r() * 2 * Math.PI, s = 0.5 + r() * 1.5, tx = (r() - 0.5) * 2e5, ty = (r() - 0.5) * 2e5, c = Math.cos(a), sn = Math.sin(a); const dt = transformarDouble(d, (p) => ({ x: s * (c * p.x - sn * p.y) + tx, y: s * (sn * p.x + c * p.y) + ty })); const C = nucleo(dt, { eps: 0.05 }); compararConOraculo(C, oraculo(dt, { eps: '0.05' })); assert.equal(C.paneles.length, 13); }
});
