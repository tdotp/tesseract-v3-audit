#!/usr/bin/env node
// F2A-2P — Perfilado REPRODUCIBLE de construirAdyacencias() y construirArbolPlegado() (experimental/plegado/arbol.js) sin instrumentar
// el código: (a) medianas de tiempo por función; (b) perfil de CPU muestreado (node:inspector, 25 µs) con conteo por LÍNEA, repartido en
// etapas por rangos de líneas del propio archivo, localizados por marcas de texto (no por números fijos); (c) heap retenido por parte del
// resultado (uniones, detalle, adyacencias, diagnósticos, árbol).
// Uso: node --expose-gc tools/f2/perfil-plegado.mjs [--modulo ruta/a/experimental] [--json salida.json]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url'; import { Session } from 'node:inspector/promises';
import { gridDieline } from '../../tests/lib/fixtures.mjs';
import { CASOS_F2A2R } from '../../tests/lib/f2/casos-plegado.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const args = process.argv.slice(2); const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const EXP = path.resolve(opt('--modulo') || path.join(ROOT, 'experimental')); const ARBOL = path.join(EXP, 'plegado/arbol.js');
const M = await import(pathToFileURL(path.join(EXP, 'plegado/index.js')).href);
const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const CASOS = {
  'caja-botanica-real': () => [rd('tests/fixtures/real/caja-botanica-real.dieline.json'), null], 'ill-real-caja-botanica (ε 0.05)': () => [rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), 0.05],
  'histórico ×0.75 (ε 0.05)': () => [rd('tests/fixtures/real/caja-botanica-illustrator-export.dieline.json'), 0.05], 'ill-real-caja-simple': () => [rd('tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json'), null],
  'rejilla 2×2': () => [gridDieline(2), null], 'rejilla 4×4': () => [gridDieline(4), null], 'rejilla 6×6': () => [gridDieline(6), null], 'rejilla 8×8': () => [gridDieline(8), null],
  'rejilla 3×3 líneas completas': () => [gridDieline(3, { fullLines: true }), null], 'rejilla 4×4 densa (25 puntos por arista)': () => [gridDieline(4, { extra: 25 }), null],
  'F2A-2R cicloFuera (2 componentes)': () => [CASOS_F2A2R.cicloFuera(), null], 'A-7 ill-real sin ajuste (no plegables)': () => [rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), null],
};
// Etapas por rangos de líneas, localizados por marcas de texto del archivo (si una marca falta, la herramienta se detiene)
const texto = fs.readFileSync(ARBOL, 'utf8').split('\n'); const linea = (marca, desde = 0) => { const i = texto.findIndex((l, k) => k >= desde && l.includes(marca)); if (i < 0) throw new Error('marca no encontrada: ' + marca); return i; };
let ETAPAS = null; try { // el código de F2A-2 (2a00433) no tiene estas etapas: entonces solo se miden tiempos y memoria
const iAdy = linea('export function construirAdyacencias'), iGr = linea('const adyacencias = [], detalle = [], uniones = [], diagnosticos = [];', iAdy), iG = linea('const G = grupos[0];', iGr), iFinAdy = linea('return { adyacencias, detalle, uniones, diagnosticos };', iG);
const iBfs = linea('function bfsNiveles'), iFinBfs = linea('return { aristas, adyDeArista, nivel, empates };', iBfs), iArb = linea('export function construirArbolPlegado'), iT0 = linea('const T0 = bfsNiveles', iArb), iComp = linea('grafo COMPLETO', iT0), iDiag = linea('const diagnosticos = [];', iComp), iFinArb = linea('return { aristas: T0.aristas', iDiag);
ETAPAS = [['1 agrupación por pareja', iAdy, iGr - 1], ['2 clasificación y conservación (uniones)', iGr, iG - 1], ['3 adyacencias plegables (eje, lado, detalle)', iG, iFinAdy], ['4 BFS y elección de padres', iBfs, iFinBfs], ['4b preparación del árbol (vecinos, claves)', iArb, iT0], ['5 componentes, bosque y partición', iComp, iDiag - 1], ['6 diagnósticos y salida', iDiag, iFinArb]];
} catch (e) { console.log('# sin reparto por etapas: ' + e.message); }
const etapaDe = (l0) => { const l = l0 - 1; const e = (ETAPAS || []).find(([, a, b]) => l >= a && l <= b); return e ? e[0] : null; };

const med = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const mide = (f, k = 30) => { for (let i = 0; i < 5; i++) f(); const ts = []; for (let i = 0; i < k; i++) { const t = performance.now(); f(); ts.push(performance.now() - t); } return +med(ts).toFixed(4); };
const ses = new Session(); ses.connect(); await ses.post('Profiler.enable'); await ses.post('Profiler.setSamplingInterval', { interval: 25 });
async function perfil(f, ms = 400) { for (let i = 0; i < 20; i++) f(); await ses.post('Profiler.start'); const t = performance.now(); let n = 0; while (performance.now() - t < ms) { f(); n++; } const { profile } = await ses.post('Profiler.stop');
  const url = pathToFileURL(ARBOL).href; const cuenta = new Map(); let total = 0, enArbol = 0;
  for (const nd of profile.nodes) { const ticks = (nd.positionTicks || []).reduce((s, p) => s + p.ticks, 0) || nd.hitCount; total += nd.hitCount; if (nd.callFrame.url !== url) continue; enArbol += nd.hitCount;
    for (const p of nd.positionTicks || []) { const e = etapaDe(p.line) || 'otras líneas de arbol.js'; cuenta.set(e, (cuenta.get(e) || 0) + p.ticks); } void ticks; }
  return { muestras: total, propiasArbol: enArbol, iteraciones: n, etapas: Object.fromEntries([...cuenta.entries()].sort()) }; }
const heap = (f) => { global.gc(); const h0 = process.memoryUsage().heapUsed; const v = []; for (let i = 0; i < 20; i++) v.push(f()); global.gc(); const h1 = process.memoryUsage().heapUsed; void v.length; return +((h1 - h0) / 20 / 1024).toFixed(1); };
if (typeof global.gc !== 'function') { console.error('Ejecutar con node --expose-gc'); process.exit(2); }

const filas = [];
for (const [n, f] of Object.entries(CASOS)) {
  const [d, eps] = f(); const m = M.adaptarPanelModel(d, { eps }); const A = M.construirAdyacencias(m); const b = M.baseDefecto(m);
  const fila = { caso: n, uniones: A.uniones ? A.uniones.length : null, plegables: A.adyacencias.length, componentes: M.construirArbolPlegado(m, A, b).componentes.length };
  fila.ady_ms = mide(() => M.construirAdyacencias(m)); fila.arbol_ms = mide(() => M.construirArbolPlegado(m, A, b));
  if (ETAPAS) { fila.perfilAdy = await perfil(() => M.construirAdyacencias(m)); fila.perfilArbol = await perfil(() => M.construirArbolPlegado(m, A, b)); }
  fila.kB = { uniones: A.uniones ? heap(() => M.construirAdyacencias(m).uniones) : null, detalle: heap(() => M.construirAdyacencias(m).detalle), adyacencias: heap(() => M.construirAdyacencias(m).adyacencias), diagnosticos: heap(() => M.construirAdyacencias(m).diagnosticos), arbol: heap(() => M.construirArbolPlegado(m, A, b)) };
  filas.push(fila);
}
const pct = (e, tot) => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, +(100 * v / tot).toFixed(1)]));
console.log(`Node ${process.version} · ${process.arch} · módulo ${path.relative(ROOT, EXP) || EXP} · mediana de 30 · perfil muestreado 25 µs durante 400 ms por función`);
console.table(filas.map((f) => ({ caso: f.caso, uniones: f.uniones, plegables: f.plegables, comp: f.componentes, ady_ms: f.ady_ms, arbol_ms: f.arbol_ms, 'kB uniones/detalle/ady/diag/árbol': Object.values(f.kB).join(' / ') })));
const sum = (k) => { if (!ETAPAS) return null; const s = {}; let t = 0; for (const f of filas) for (const [e, v] of Object.entries(f[k].etapas)) { s[e] = (s[e] || 0) + v; t += v; } return pct(s, t); };
if (ETAPAS) { console.log('Reparto de muestras propias de arbol.js por etapa (todos los casos), construirAdyacencias:'); console.table(sum('perfilAdy'));
console.log('ídem, construirArbolPlegado:'); console.table(sum('perfilArbol')); }
if (opt('--json')) { fs.mkdirSync(path.dirname(opt('--json')), { recursive: true }); fs.writeFileSync(opt('--json'), JSON.stringify({ node: process.version, arch: process.arch, modulo: path.relative(ROOT, EXP), etapas: ETAPAS && ETAPAS.map(([e, a, b]) => ({ etapa: e, lineas: [a + 1, b + 1] })), filas, repartoAdy: sum('perfilAdy'), repartoArbol: sum('perfilArbol') }, null, 1) + '\n'); }
ses.disconnect();
