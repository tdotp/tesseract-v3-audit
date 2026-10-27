#!/usr/bin/env node
// F2.0 — Diagnóstico de KI-22: ejecuta el pipeline legacy instrumentado sobre un troquel a varias escalas, normaliza cada etapa a ×1
// (coordenadas / s, áreas / s²) y localiza la PRIMERA etapa en la que dos escalas divergen. Solo lectura de src/; no modifica nada.
// Uso: node tools/f2/ki22-diagnostico.mjs [troquel.json] [--escalas 0.5,0.75,1,2] [--ref 1] [--json salida.json]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { ejecutarEtapas, verificarReplica, escalar } from './lib/etapas.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2); const opt = (k, def) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : def; };
const file = args.find((a) => a.endsWith('.json') && args[args.indexOf(a) - 1] !== '--json') || path.join(ROOT, 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json');
const escalas = opt('--escalas', '0.5,0.75,0.9,0.99,0.995,0.998,0.999,1,1.001,1.01,1.25,1.5,2').split(',').map(Number);
const ref = Number(opt('--ref', '1')); const salida = opt('--json', null);
const base = JSON.parse(fs.readFileSync(file, 'utf8'));
const TOL = 1e-6; // mm, tras normalizar a ×1 (solo para absorber el redondeo de x·s/s)

const r = (x, n = 6) => Math.round(x * 10 ** n) / 10 ** n;
const normSegs = (lista, s) => lista.map((g) => { const a = [r(g.p1.x / s), r(g.p1.y / s)], b = [r(g.p2.x / s), r(g.p2.y / s)]; const [u, v] = (a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1])) ? [a, b] : [b, a]; return u.concat(v).join(','); }).sort();
const normPts = (lista, s) => lista.map((p) => [r(p.x / s, 5), r(p.y / s, 5)].join(',')).sort();
const normAreas = (lista, s) => lista.map((f) => r(f.area / (s * s), 3)).sort((a, b) => a - b);
const diffMulti = (A, B) => { const m = new Map(); A.forEach((x) => m.set(x, (m.get(x) || 0) + 1)); B.forEach((x) => m.set(x, (m.get(x) || 0) - 1)); const soloA = [], soloB = []; for (const [k, v] of m) { if (v > 0) soloA.push(...Array(v).fill(k)); if (v < 0) soloB.push(...Array(-v).fill(k)); } return { soloA, soloB }; };

const res = {};
for (const s of [...new Set([...escalas, ref])].sort((a, b) => a - b)) {
  const d = escalar(base, s); const E = ejecutarEtapas(d);
  res[s] = { s, E, replicaOK: verificarReplica(d, E) };
}

// Firma normalizada por etapa (lo que debería ser invariante ante escala si el motor fuera invariante)
const firma = (x) => {
  const { E, s } = x;
  return {
    E1_contornos: `${E.e1_contornos.total}/${E.e1_contornos.shells}/${E.e1_contornos.holes}`,
    E2_segmentos_entrada: normSegs(E.e2_segmentos.lista, s).join(';'),
    E3_troceado: normSegs(E.e3_troceado.lista, s).join(';'),
    E4_vertices: normPts(E.e4_grafo.verts, s).join(';'),
    E5_caras: normAreas(E.e5_caras.lista, s).join(';'),
    E6_paneles_filtrados: E.e6_filtros.paneles + ' ' + JSON.stringify(E.e6_filtros.porMotivo),
    E7_estricta: E.e7_estricta.porCrease.map((c) => c.comparten.length).join(','),
    E8_conectividad: E.e8_conectividad.conservados + ' de ' + E.e8_conectividad.antes,
    E9_plegado: `${E.e9_plegado.adyacencias} ady · árbol ${E.e9_plegado.arbol}`,
    E10_validacion: String(E.e10_validacion.problemas),
  };
};

const R = res[ref]; const fR = firma(R);
const tabla = []; const primeras = {};
for (const s of Object.keys(res).map(Number).sort((a, b) => a - b)) {
  const x = res[s]; const f = firma(x); const E = x.E;
  const etapas = Object.keys(fR); const primera = etapas.find((k) => f[k] !== fR[k]) || null; primeras[s] = primera;
  tabla.push({ escala: s, replica: x.replicaOK ? 'OK' : 'DIFIERE', segIn: E.e2_segmentos.total, segSplit: E.e3_troceado.segmentos, iter: E.e3_troceado.iteraciones, V: E.e4_grafo.vertices, Earis: E.e4_grafo.aristas, caras: E.e5_caras.total, panelesFiltro: E.e6_filtros.paneles, estricta2: E.e7_estricta.compartidasPor2, paneles: E.e8_conectividad.conservados, ady: E.e9_plegado.adyacencias, avisos: E.e10_validacion.problemas, areaN: r(E.areaTotal / (s * s), 3), primeraDivergencia: primera });
}
console.log(`Troquel: ${path.relative(ROOT, file)} · referencia ×${ref}`);
console.table(tabla);

// Detalle de la divergencia entre la referencia y cada escala que diverge: qué cambia exactamente en la primera etapa
const detalle = {};
for (const s of Object.keys(res).map(Number)) {
  const k = primeras[s]; if (!k) continue; const A = res[ref], B = res[s];
  let d = null;
  if (k === 'E3_troceado') d = diffMulti(normSegs(A.E.e3_troceado.lista, A.s), normSegs(B.E.e3_troceado.lista, B.s));
  else if (k === 'E4_vertices') d = diffMulti(normPts(A.E.e4_grafo.verts, A.s), normPts(B.E.e4_grafo.verts, B.s));
  else if (k === 'E5_caras') d = diffMulti(normAreas(A.E.e5_caras.lista, A.s), normAreas(B.E.e5_caras.lista, B.s));
  detalle[s] = { primeraEtapa: k, ['solo_x' + ref]: d && d.soloA, ['solo_x' + s]: d && d.soloB };
}
for (const [s, d] of Object.entries(detalle)) {
  console.log(`\n×${s}: primera divergencia en ${d.primeraEtapa}`);
  for (const [k, v] of Object.entries(d)) if (Array.isArray(v)) console.log(`  ${k} (${v.length}):`, v.slice(0, 12).join('  '));
}
if (salida) {
  const out = { troquel: path.relative(ROOT, file), referencia: ref, tabla, detalle,
    porEscala: Object.fromEntries(Object.entries(res).map(([s, x]) => [s, { replicaOK: x.replicaOK, e1: x.E.e1_contornos, e3: { segmentos: x.E.e3_troceado.segmentos, iteraciones: x.E.e3_troceado.iteraciones }, e4: { vertices: x.E.e4_grafo.vertices, aristas: x.E.e4_grafo.aristas, grados: x.E.e4_grafo.grados }, e5: { total: x.E.e5_caras.total, euler: x.E.e5_caras.euler }, e6: x.E.e6_filtros, e7: x.E.e7_estricta, e8: x.E.e8_conectividad, e9: x.E.e9_plegado, e10: x.E.e10_validacion }])) };
  fs.mkdirSync(path.dirname(salida), { recursive: true }); fs.writeFileSync(salida, JSON.stringify(out, null, 1) + '\n'); console.log('\n→ ' + salida);
}
