#!/usr/bin/env node
// F2A-1 — Estrés DIFERENCIAL núcleo experimental frente al oráculo (semilla fija; determinista):
//  (a) N transformaciones de semejanza aleatorias (rotación cualquiera, escala ×0.5–×2, traslación hasta 1e5) de las 3 extracciones de la
//      Caja Botánica (con ε experimental 0.05 las que tienen ruido; la original también sin ajuste tras transformaciones exactas);
//  (b) M troqueles sintéticos aleatorios DEGENERADOS: contorno rectangular o en L y creases en una rejilla gruesa (solapes colineales,
//      T exactas, cruces, creases sobre el corte, colgantes) más algunas oblicuas; sin ajuste.
// Uso: node tools/f2/estres-candidato.mjs [--n 60] [--m 400] [--semilla 7] [--json salida.json]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { nucleo } from '../../experimental/geometria/nucleo.js';
import { oraculo } from '../../tests/lib/f2/oraculo.mjs';
import { transformarDouble } from '../../tests/lib/f2/comparar.mjs';
import { compararConOraculo } from '../../tests/lib/f2/comparar-nucleo.mjs';
import { sintetico } from '../../tests/lib/f2/aleatorios.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2); const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const N = Number(opt('--n', 60)), M = Number(opt('--m', 400)); let semilla = Number(opt('--semilla', 7)); const salida = opt('--json', null);
const rnd = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const FIX = [['caja-botanica-real', rd('tests/fixtures/real/caja-botanica-real.dieline.json'), '0.05'], ['ill-real-caja-botanica', rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), '0.05'], ['histórico ×0.75', rd('tests/fixtures/real/caja-botanica-illustrator-export.dieline.json'), '0.05']];

const res = { transformaciones: { casos: 0, fallos: [] }, sinteticos: { casos: 0, fallos: [], conPaneles: 0, conCruces: 0, conColgantes: 0 } };
const t0 = Date.now();
for (let k = 0; k < N; k++) {
  const [n, d, eps] = FIX[k % FIX.length]; const ang = rnd() * 2 * Math.PI, s = 0.5 + rnd() * 1.5, tx = (rnd() - 0.5) * 2e5, ty = (rnd() - 0.5) * 2e5, c = Math.cos(ang), sn = Math.sin(ang);
  const dt = transformarDouble(d, (p) => ({ x: s * (c * p.x - sn * p.y) + tx, y: s * (sn * p.x + c * p.y) + ty }));
  res.transformaciones.casos++;
  try { const C = nucleo(dt, { eps: Number(eps) }); compararConOraculo(C, oraculo(dt, { eps })); if (C.paneles.length !== 13) throw new Error('paneles ' + C.paneles.length); }
  catch (e) { res.transformaciones.fallos.push({ k, fixture: n, ang, s, tx, ty, error: String(e.message).split('\n')[0].slice(0, 160) }); }
}
for (let k = 0; k < M; k++) {
  const d = sintetico(rnd); res.sinteticos.casos++;
  try { const C = nucleo(d); compararConOraculo(C, oraculo(d)); if (C.paneles.length > 1) res.sinteticos.conPaneles++; if (C.arreglo.cruces) res.sinteticos.conCruces++; if (C.creases.some((x) => x.colgante > 0)) res.sinteticos.conColgantes++; }
  catch (e) { res.sinteticos.fallos.push({ k, error: String(e.message).split('\n')[0].slice(0, 160), dieline: d }); }
}
res.segundos = (Date.now() - t0) / 1000;
console.log(`Transformaciones: ${res.transformaciones.casos} casos, ${res.transformaciones.fallos.length} fallos`);
console.log(`Sintéticos degenerados: ${res.sinteticos.casos} casos (${res.sinteticos.conPaneles} con >1 panel, ${res.sinteticos.conCruces} con cruces, ${res.sinteticos.conColgantes} con creases colgantes), ${res.sinteticos.fallos.length} fallos`);
for (const f of [...res.transformaciones.fallos, ...res.sinteticos.fallos].slice(0, 10)) console.log('  ✗', JSON.stringify({ ...f, dieline: undefined }));
console.log(`(${res.segundos} s)`);
if (salida) { fs.mkdirSync(path.dirname(salida), { recursive: true }); fs.writeFileSync(salida, JSON.stringify(res, null, 1) + '\n'); }
