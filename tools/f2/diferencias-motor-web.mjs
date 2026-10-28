#!/usr/bin/env node
// F2A-0 (DP-5) — ¿Por qué el motor web acierta con la extracción original y lanza con la de Illustrator real?
// Separa sus dos etapas: (1) su AJUSTE (snapCreaseVerticesToBoundary, 0.500001 mm, todas las creases contra el contorno aplanado) y
// (2) su GRAFO PLANO (double, NUMERIC_EPS/PARAM_EPS = 1e-9, fusión 1e-6). Se pasa la salida de (1) al ORÁCULO EXACTO sin ajuste:
//   si el oráculo conserva el área y da 13 ⇒ el fallo está en (2) (numérica/filtros); si no ⇒ está en la política de ajuste (1).
// Solo lectura de tesseract-web (empaquetado a tests/results/f2/). Uso: node tools/f2/diferencias-motor-web.mjs [--json salida.json]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { webSombra } from './lib/sombra.mjs';
import { oraculo, resumen } from '../../tests/lib/f2/oraculo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2); const salida = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const W = await webSombra();
const FIX = { 'caja-botanica-real': 'tests/fixtures/real/caja-botanica-real.dieline.json', 'ill-real-caja-botanica': 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json' };
const pt = (p) => ({ anchor: { x: p.x, y: p.y }, left: { x: p.x, y: p.y }, right: { x: p.x, y: p.y } });
const out = {};
for (const [n, f] of Object.entries(FIX)) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const outer = W.flattenPath(d.outerBoundary);
  const bs = []; for (let i = 0; i < outer.length; i++) bs.push({ start: outer[i], end: outer[(i + 1) % outer.length], type: 'boundary' });
  // (1) ajuste del web, registrado vértice a vértice
  const movidos = [];
  const creasesWeb = d.creases.map((c, ci) => { const pts = W.flattenPath(c); const sn = W.snapCreaseVerticesToBoundary(pts, bs); sn.forEach((q, k) => { const dd = Math.hypot(q.x - pts[k].x, q.y - pts[k].y); if (dd > 0) movidos.push({ crease: 'C' + ci, vertice: k, d_mm: dd }); }); return sn; });
  // (1)+(oráculo exacto): mismo contorno (aplanado igual que el web: 16 muestras) y creases ya ajustadas por el web, sin ajuste propio
  const dWeb = { ...d, outerBoundary: { closed: true, points: outer.map(pt) }, holes: [], cutLines: [], creases: creasesWeb.map((ps) => ({ closed: false, points: ps.map(pt) })) };
  const O_webSnap = resumen(oraculo(dWeb, { eps: null }));
  // referencia: oráculo con su propio ajuste tipado sobre el mismo contorno aplanado
  const O_propio = resumen(oraculo({ ...d, outerBoundary: { closed: true, points: outer.map(pt) } }, { eps: '0.05' }));
  // (2) motor web completo
  let web; try { const t = W.buildFoldTopology({ outerBoundary: d.outerBoundary, holes: [], creases: d.creases, thickness: 0.25 }); web = { paneles: t.panels.length, error: null }; } catch (e) { web = { paneles: null, error: e.message.slice(0, 140) }; }
  // uniones crease–crease que el web NO ajusta: extremos de crease a distancia (0, 0.05] de otra crease tras su ajuste
  const ext = []; creasesWeb.forEach((ps, ci) => { ext.push({ c: ci, p: ps[0] }); ext.push({ c: ci, p: ps[ps.length - 1] }); });
  const uniones = []; for (let i = 0; i < ext.length; i++) for (let j = i + 1; j < ext.length; j++) { if (ext[i].c === ext[j].c) continue; const dd = Math.hypot(ext[i].p.x - ext[j].p.x, ext[i].p.y - ext[j].p.y); if (dd > 0 && dd <= 0.05) uniones.push({ a: 'C' + ext[i].c, b: 'C' + ext[j].c, d_mm: dd, en: [ext[i].p.x.toFixed(4), ext[i].p.y.toFixed(4)] }); }
  out[n] = { webCompleto: web, verticesMovidosPorElAjusteWeb: movidos.length, maxMovimiento_mm: Math.max(0, ...movidos.map((m) => m.d_mm)), unionesCreaseCreaseSinCerrar: uniones,
    oraculoSobreAjusteWeb: { paneles: O_webSnap.paneles.length, adyacencias: O_webSnap.adyacencias.length, conservacionExacta: O_webSnap.conservacion.exacta, creasesQueSeparan: O_webSnap.creases.filter((c) => c.pares.length).length, colganteMm: +O_webSnap.creases.reduce((s, c) => s + c.colganteMm, 0).toFixed(4), astillas: O_webSnap.ambiguedades.length, panelesArea: O_webSnap.paneles.map((p) => +p.areaMm2.toFixed(3)) },
    oraculoAjustePropio: { paneles: O_propio.paneles.length, adyacencias: O_propio.adyacencias.length, conservacionExacta: O_propio.conservacion.exacta } };
}
console.log(JSON.stringify(out, null, 1));
if (salida) { fs.mkdirSync(path.dirname(salida), { recursive: true }); fs.writeFileSync(salida, JSON.stringify(out, null, 1) + '\n'); }
