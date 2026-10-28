// F2A-1 — NÚCLEO GEOMÉTRICO EXPERIMENTAL (arreglo plano con predicados robustos). No lo importa src/, no está conectado al panel CEP
// ni a GeometryEngine; el legacy sigue siendo el motor del producto. Entrada: Dieline v1 (mm). Salida con la misma forma que el resumen
// del oráculo de F2A-0 (tests/lib/f2/oraculo.mjs) para poder compararlos.
// Opciones: eps (número; SIN valor por defecto: sin él no hay ajuste), rho (3), curvas ('anclas' | {muestras: N}).
import { construirArreglo } from './arreglo.js';
import { construirCaras, areaPoligono, dentroPoligono } from './caras.js';
import { ajustarExtremos } from './ajuste.js';

function bezier(p0, p1, p2, p3, t) { const m = 1 - t, a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t; return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y }; }
function polilinea(path, cerrado, curvas) {
  const pts = path && path.points ? path.points : []; if (pts.length < 2) return [];
  const N = curvas && curvas.muestras ? curvas.muestras : 0; const n = pts.length, ult = cerrado ? n : n - 1;
  const out = [{ x: pts[0].anchor.x, y: pts[0].anchor.y }];
  for (let i = 0; i < ult; i++) {
    const a = pts[i], b = pts[(i + 1) % n]; const L = a.left || a.anchor, R = a.right || a.anchor, BL = b.left || b.anchor;
    const curvo = !(R.x === a.anchor.x && R.y === a.anchor.y && BL.x === b.anchor.x && BL.y === b.anchor.y); void L;
    if (N && curvo) for (let k = 1; k < N; k++) out.push(bezier(a.anchor, R, BL, b.anchor, k / N));
    out.push({ x: b.anchor.x, y: b.anchor.y });
  }
  if (cerrado) out.pop(); return out;
}
const ordId = (a, b) => (a[0] === b[0] ? Number(a.slice(1)) - Number(b.slice(1)) : a < b ? -1 : 1);
const esCerrado = (t) => /^(B|H\d+)$/.test(t);

export function nucleo(dieline, opciones = {}) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const curvas = opciones.curvas || 'anclas';
  const cortes = []; if (dieline.outerBoundary) cortes.push({ id: 'B', cerrado: true, pts: polilinea(dieline.outerBoundary, true, curvas) });
  (dieline.holes || []).forEach((h, i) => cortes.push({ id: 'H' + i, cerrado: true, pts: polilinea(h, true, curvas) }));
  (dieline.cutLines || []).forEach((k, i) => { const g = k.geom || k; cortes.push({ id: 'K' + i, cerrado: !!g.closed, pts: polilinea(g, !!g.closed, curvas) }); });
  const creases = (dieline.creases || []).map((c, i) => ({ id: 'C' + i, cerrado: !!c.closed, pts: polilinea(c, !!c.closed, curvas) }));
  const huella = () => JSON.stringify(cortes.map((c) => c.pts));
  const huellaAntes = huella();
  let diag = [];
  if (opciones.eps != null) diag = ajustarExtremos(cortes, creases, Number(opciones.eps), opciones.rho == null ? 3 : Number(opciones.rho)).diag;
  const contornoIntacto = huella() === huellaAntes;
  // segmentos (sin longitud 0)
  const segs = []; let longitudCero = 0;
  const add = (c) => { for (let i = 0; i < c.pts.length - (c.cerrado ? 0 : 1); i++) { const a = c.pts[i], b = c.pts[(i + 1) % c.pts.length]; if (a === b || (!a.H && !b.H && a.x === b.x && a.y === b.y)) { longitudCero++; continue; } segs.push({ a, b, tag: c.id, ref: c.id + ':' + i }); } };
  cortes.forEach(add); creases.forEach(add);
  const arr = construirArreglo(segs);
  const F = construirCaras(arr, esCerrado);
  const { ciclos, reg, par, NO } = F;
  // paneles = regiones acotadas de paridad impar
  const regiones = [...new Set(ciclos.map((c) => reg(c.id)))].filter((r) => r !== NO);
  const P = [];
  for (const r of regiones) { const c = ciclos[r]; if (!(c.area > 0) || par.get(r) !== 1) continue; let area = c.area; const islas = ciclos.filter((x) => x.contenidaEn === r); for (const x of islas) area += x.area; P.push({ region: r, area, poligono: c.poligono, islas: islas.length }); }
  const pDeR = new Map(P.map((p, i) => [p.region, i]));
  const tramos = [], ady = new Map(); const V = arr.vertices; const largo = (e) => Math.hypot(V[e.u].x - V[e.v].x, V[e.u].y - V[e.v].y);
  for (const e of arr.aristas) {
    const cr = [...e.tags].filter((t) => /^C\d+$/.test(t)); if (!cr.length) continue;
    const a = pDeR.get(reg(e.h[0].ciclo)), b = pDeR.get(reg(e.h[1].ciclo)), L = largo(e), sc = [...e.tags].some((t) => !/^C\d+$/.test(t));
    const tipo = sc ? 'sobre-corte' : a == null && b == null ? 'fuera' : a === b ? 'colgante' : a == null || b == null ? 'borde' : 'separa';
    for (const c of cr) tramos.push({ crease: c, tipo, a, b, longitud: L });
    if (tipo === 'separa') { const k = Math.min(a, b) + '|' + Math.max(a, b); if (!ady.has(k)) ady.set(k, { a: Math.min(a, b), b: Math.max(a, b), creases: new Set(), longitud: 0 }); const x = ady.get(k); cr.forEach((c) => x.creases.add(c)); x.longitud += L; }
  }
  P.forEach((p, i) => { p.creases = [...new Set(tramos.filter((t) => t.tipo === 'separa' && (t.a === i || t.b === i)).map((t) => t.crease))].sort(ordId); p.bordesCorte = 0; });
  for (const e of arr.aristas) { if (![...e.tags].some((t) => !/^C\d+$/.test(t))) continue; for (const h of e.h) { const i = pDeR.get(reg(h.ciclo)); if (i != null) P[i].bordesCorte++; } }
  // orden canónico (firma = creases que lo separan + área)
  const firma = (p) => p.creases.join(' ') + '|' + p.area.toFixed(6);
  const orden = P.map((_, i) => i).sort((i, j) => (firma(P[i]) < firma(P[j]) ? -1 : firma(P[i]) > firma(P[j]) ? 1 : 0));
  const nuevo = new Map(orden.map((v, k) => [v, k])); const PP = orden.map((i) => P[i]);
  tramos.forEach((t) => { if (t.a != null) t.a = nuevo.get(t.a); if (t.b != null) t.b = nuevo.get(t.b); });
  const adyacencias = [...ady.values()].map((x) => { const a = nuevo.get(x.a), b = nuevo.get(x.b); return { a: Math.min(a, b), b: Math.max(a, b), creases: [...x.creases].sort(ordId), longitud: x.longitud }; }).sort((x, y) => x.a - y.a || x.b - y.b);
  const pp = PP.map((_, i) => i); const rp = (i) => (pp[i] === i ? i : (pp[i] = rp(pp[i]))); adyacencias.forEach((x) => { pp[rp(x.a)] = rp(x.b); });
  // conservación frente al área par-impar calculada SIN el arreglo
  const cerrados = cortes.filter((c) => esCerrado(c.id) && c.pts.length >= 3); let esperada = 0;
  for (const c of cerrados) { let prof = 0; for (const o of cerrados) { if (o === c) continue; const v = c.pts.find((q) => dentroPoligono(q, o.pts) !== null); if (v && dentroPoligono(v, o.pts)) prof++; } const A = Math.abs(areaPoligono(c.pts)); esperada += prof % 2 ? -A : A; }
  const generada = PP.reduce((s, p) => s + p.area, 0);
  if (opciones.eps != null) PP.forEach((p, i) => { let per = 0; for (let k = 0; k < p.poligono.length; k++) { const a = p.poligono[k], b = p.poligono[(k + 1) % p.poligono.length]; per += Math.hypot(a.x - b.x, a.y - b.y); } if (per && (2 * p.area) / per < Number(opciones.eps)) diag.push({ tipo: 'astilla', panel: 'F' + i, area_mm2: p.area }); });
  return {
    motor: 'experimental-f2a1', opciones: { eps: opciones.eps == null ? null : String(opciones.eps), rho: String(opciones.rho == null ? 3 : opciones.rho), curvas },
    contornoIntacto, segmentosLongitudCero: longitudCero, diagnosticos: diag,
    arreglo: { segmentos: arr.segmentos, cruces: arr.cruces, vertices: F.euler.V, aristas: F.euler.E, ciclos: F.euler.ciclos, componentesGrafo: F.euler.componentes, eulerOK: F.euler.ok, paridadCoherente: F.coherente, islasDudosas: F.islasDudosas, puntosExactos: arr.puntosExactos },
    paneles: PP.map((p, i) => ({ id: 'F' + i, creases: p.creases, area: p.area, vertices: p.poligono.length, bordesCorte: p.bordesCorte, islas: p.islas, poligono: p.poligono.map((v) => ({ x: v.x, y: v.y })) })),
    adyacencias, tramos, componentesPaneles: new Set(PP.map((_, i) => rp(i))).size,
    creases: creases.map((c) => { const ts = tramos.filter((t) => t.crease === c.id); const s = (k) => ts.filter((t) => t.tipo === k).reduce((x, t) => x + t.longitud, 0); return { id: c.id, separa: s('separa'), colgante: s('colgante'), sobreCorte: s('sobre-corte'), fuera: s('fuera'), borde: s('borde'), pares: [...new Set(ts.filter((t) => t.tipo === 'separa').map((t) => Math.min(t.a, t.b) + '-' + Math.max(t.a, t.b)))].sort() }; }),
    conservacion: { esperadaMm2: esperada, generadaMm2: generada, difRelativa: esperada ? (generada - esperada) / esperada : generada },
    ms: typeof performance !== 'undefined' ? performance.now() - t0 : null,
  };
}
