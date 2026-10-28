// F2A-2 — Adyacencias y ÁRBOL DE PLEGADO experimentales sobre un PanelModel de adaptarPanelModel(). No lo importa src/; el plegado
// real de V3 (src/fold/, src/core/legacy/fold-tree.js) no cambia.
// Salidas con la forma v1 de src/core/engine.js (objetos v1 sin campos extra; lo demás en listas paralelas `detalle`):
//   AdjacencyEdge {panelA, panelB, crease: {a, b}, creaseIdx}     una por PAREJA de paneles (el legacy da una por segmento de crease)
//   FoldEdge      {parent, child, crease: {a, b}, sign: 1 | -1}  pivote en crease.a; sign acoplado a la orientación a→b, como el legacy
// Reglas (docs/fase2/F2A2_INFORME.md §3; corregidas en F2A-2R, docs/fase2/F2A2R_INFORME.md):
//   · cada pareja de paneles que comparte aristas de crease es una UNIÓN con TODAS sus aristas y segmentos de origen, clasificada:
//       plegable     todas las aristas sobre UNA recta (orientación exacta) ⇒ bisagra rígida; eje = su envolvente sobre esa recta,
//                    orientada como el segmento de crease de la entrada
//       ambigua      varias rectas, todas PARALELAS (producto vectorial exacto = 0): solo una decisión geométrica explícita (p. ej.
//                    unificar ejes desplazados, A-1) podría convertirla en bisagra
//       no-plegable  rectas no paralelas: ninguna bisagra rígida es compatible con la geometría
//     solo las plegables se publican como AdjacencyEdge v1 (y solo ellas pueden ser FoldEdge); las otras quedan en `uniones` con su
//     diagnóstico (H-01: antes se tomaba el grupo colineal más largo como bisagra válida)
//   · lado: el panel está a la IZQUIERDA de cada semiarista de su ciclo CCW (topología, no centroide) ⇒ sign exacto también en paneles
//     no convexos; sign = +1 si el hijo está a la izquierda de a→b (misma convención que computeFoldSign del legacy)
//   · árbol BFS por niveles desde una base EXPLÍCITA; el padre de cada panel es el vecino del nivel anterior con la crease compartida
//     más larga y, a igualdad, el que entró antes en el árbol; los hijos se ordenan por padre y por su vértice mínimo (x, y): nada
//     depende del orden de la entrada salvo empates exactos que se cuentan en `empates`
//   · ciclos sobre el grafo COMPLETO de bisagras plegables (H-02): árbol en la componente de la base y bosque generador en las demás;
//     una adyacencia es de ciclo solo si cierra un ciclo en su componente; número ciclomático = m − n + c = número de adyacencias de ciclo
import { orientG, cruzDireccionesG } from '../geometria/predicados.js';
import { ErrorPanelModel } from './adaptador.js';

const esC = (t) => /^C\d+$/.test(t);
const idx = (id) => Number(id.slice(1));
const ref = (r) => { const m = /^C(\d+):(\d+)$/.exec(r); return m ? { c: Number(m[1]), s: Number(m[2]) } : null; };

function detalleDe(modelo) {
  const D = modelo && modelo.f2a2 && modelo.f2a2.detalle;
  if (!D) throw new ErrorPanelModel('modelo', [{ tipo: 'error', codigo: 'modelo', mensaje: 'el modelo no viene de adaptarPanelModel (falta f2a2.detalle)' }]);
  return D;
}

export function construirAdyacencias(modelo) {
  const D = detalleDe(modelo); const V = D.arreglo.vertices; const { reg } = D.caras;
  const pDeR = new Map(D.regionDePanel.map((r, i) => [r, i]));
  const pares = new Map(); const nP = D.regionDePanel.length;
  for (const e of D.arreglo.aristas) {
    let hayC = false, hayOtro = false; for (const t of e.tags) { if (esC(t)) hayC = true; else hayOtro = true; } if (!hayC || hayOtro) continue;
    const a = pDeR.get(reg(e.h[0].ciclo)), b = pDeR.get(reg(e.h[1].ciclo)); if (a == null || b == null || a === b) continue;
    const lo = a < b ? a : b, hi = a < b ? b : a, k = lo * nP + hi; let p = pares.get(k); if (!p) { p = { a: lo, b: hi, ar: [] }; pares.set(k, p); }
    const refs = []; for (const r of e.refs) { const x = ref(r); if (x) refs.push(x); } refs.sort((x, y) => x.c - y.c || x.s - y.s);
    // F2A-2P: cadenas de segmento y de crease de la arista calculadas una sola vez (antes, en cada agregado)
    p.ar.push({ e, refs, seg: refs.map((r) => 'C' + r.c + ':' + r.s), cr: refs.map((r) => 'C' + r.c), hA: a === lo ? e.h[0] : e.h[1], L: Math.hypot(V[e.u].x - V[e.v].x, V[e.u].y - V[e.v].y) });
  }
  const adyacencias = [], detalle = [], uniones = [], diagnosticos = [];
  const largo = (g) => g.reduce((s, x) => s + x.L, 0);
  const segs = (g) => { const u = new Set(); for (const x of g) for (const t of x.seg) u.add(t); return [...u].sort(); };
  const creasesDe = (g) => { const u = new Set(); for (const x of g) for (const t of x.cr) u.add(t); return [...u].sort((x, y) => idx(x) - idx(y)); };
  const agregados = (g) => ({ creases: creasesDe(g), segmentos: segs(g), longitud: largo(g) });
  for (const p of [...pares.values()].sort((x, y) => x.a - y.a || x.b - y.b)) {
    // referencia determinista: menor (crease, segmento) y, a igualdad, menor vértice
    p.ar.sort((x, y) => x.refs[0].c - y.refs[0].c || x.refs[0].s - y.refs[0].s || Math.min(x.e.u, x.e.v) - Math.min(y.e.u, y.e.v));
    const grupos = []; for (const x of p.ar) { const g = grupos.find((g) => { const [P, Q] = g[0].e.dir; return orientG(P, Q, x.e.dir[0]) === 0 && orientG(P, Q, x.e.dir[1]) === 0; }); if (g) g.push(x); else grupos.push([x]); }
    const paralelo = (g) => { const [P, Q] = grupos[0][0].e.dir, [R, S2] = g[0].e.dir; return cruzDireccionesG(P, Q, R, S2) === 0; };
    const clase = grupos.length === 1 ? 'plegable' : grupos.every(paralelo) ? 'ambigua' : 'no-plegable';
    const u = uniones.length;
    // agregados de cada recta y de la unión; si hay una sola recta (plegable), la unión, su recta y el detalle COMPARTEN los mismos
    // arreglos y valores (mismos elementos en el mismo orden: el resultado serializado es idéntico; los objetos de salida son de solo lectura)
    const ag = grupos.map(agregados); const T = grupos.length === 1 ? ag[0] : agregados(p.ar); const creasesTodas = T.creases;
    // la unión conserva TODAS sus aristas atómicas (coordenadas y segmentos de origen), agrupadas por recta
    uniones.push({ panelA: p.a, panelB: p.b, clase, adyacencia: -1, creases: creasesTodas, segmentos: T.segmentos, longitudTotal: T.longitud,
      grupos: grupos.map((g, j) => ({ creases: ag[j].creases, segmentos: ag[j].segmentos, longitud: ag[j].longitud, aristas: g.map((x) => ({ u: { x: V[x.e.u].x, y: V[x.e.u].y }, v: { x: V[x.e.v].x, y: V[x.e.v].y }, segmentos: x.seg })) })) });
    if (clase !== 'plegable') {
      diagnosticos.push({ tipo: clase === 'ambigua' ? 'union-ambigua' : 'union-no-plegable', union: u, panelA: p.a, panelB: p.b, rectas: grupos.length, creases: creasesTodas, segmentos: T.segmentos, longitudTotal: T.longitud,
        motivo: clase === 'ambigua' ? 'aristas sobre rectas paralelas distintas: sin un eje único; requiere una decisión geométrica explícita' : 'aristas sobre rectas no paralelas: ninguna bisagra rígida es compatible' });
      continue;
    }
    const G = grupos[0];
    const r0 = G[0].refs[0]; const pts = D.creases[r0.c].pts; const s0 = pts[r0.s], s1 = pts[(r0.s + 1) % pts.length];
    const dx = s1.x - s0.x, dy = s1.y - s0.y; const pr = (v) => (v.x - s0.x) * dx + (v.y - s0.y) * dy;
    let wLo = -1, wHi = -1, tLo = 0, tHi = 0; for (const x of G) for (let q = 0; q < 2; q++) { const w = q ? x.e.v : x.e.u, t = pr(V[w]); if (wLo < 0 || t < tLo) { tLo = t; wLo = w; } if (wHi < 0 || t > tHi) { tHi = t; wHi = w; } }
    const A = { x: V[wLo].x, y: V[wLo].y }, B = { x: V[wHi].x, y: V[wHi].y };
    // lado: el panel a está a la izquierda de su semiarista; ¿coincide su sentido con a→b del eje?
    const lados = new Set(G.map((x) => { const h = x.hA; return (V[h.t].x - V[h.o].x) * (B.x - A.x) + (V[h.t].y - V[h.o].y) * (B.y - A.y) > 0 ? p.a : p.b; }));
    if (lados.size !== 1) throw new ErrorPanelModel('adaptador-incoherente', [{ tipo: 'error', codigo: 'lado', mensaje: `pareja ${p.a}-${p.b}: lado del eje incoherente entre sus aristas` }]);
    const orden = G.slice().sort((x, y) => (pr(V[x.e.u]) + pr(V[x.e.v])) - (pr(V[y.e.u]) + pr(V[y.e.v])));
    let tramos = 1; for (let k = 1; k < orden.length; k++) { const u = orden[k - 1].e, v = orden[k].e; if (![u.u, u.v].some((w) => w === v.u || w === v.v)) tramos++; }
    const creasesEje = ag[0].creases; // una sola recta: G y la unión tienen las mismas aristas en el mismo orden
    const k = adyacencias.length; uniones[u].adyacencia = k;
    adyacencias.push({ panelA: p.a, panelB: p.b, crease: { a: A, b: B }, creaseIdx: idx(creasesEje[0]) });
    detalle.push({ union: u, creases: creasesTodas, creasesEje, segmentos: ag[0].segmentos, longitud: ag[0].longitud, longitudTotal: T.longitud, aristas: G.length, tramos, izquierda: [...lados][0] });
    if (creasesEje.length > 1) diagnosticos.push({ tipo: 'adyacencia-varias-creases', adyacencia: k, creases: creasesEje });
    if (tramos > 1) diagnosticos.push({ tipo: 'adyacencia-discontinua', adyacencia: k, tramos });
  }
  return { adyacencias, detalle, uniones, diagnosticos };
}

const vMin = (P) => P.vertices.reduce((m, v) => (v.x < m.x || (v.x === m.x && v.y < m.y) ? v : m));
const cmpClave = (a, b) => a.x - b.x || a.y - b.y;

// Base por defecto: mayor área v1 (bruta), como getDefaultBaseIndex del legacy; a igualdad exacta, menor vértice mínimo (no el índice).
export function baseDefecto(modelo, { area = 'bruta' } = {}) {
  const P = modelo.panels; if (!P.length) return -1; const ar = (i) => (area === 'neta' ? modelo.f2a2.paneles[i].areaNeta : P[i].area);
  let m = 0; for (let i = 1; i < P.length; i++) if (ar(i) > ar(m) || (ar(i) === ar(m) && cmpClave(vMin(P[i]), vMin(P[m])) < 0)) m = i; return m;
}

// BFS por niveles desde `raiz` sobre las bisagras plegables (reglas de la cabecera). Devuelve aristas FoldEdge, adyacencia de cada una y niveles.
function bfsNiveles(P, A, X, vec, raiz, claves) {
  const otro = (k, i) => (A[k].panelA === i ? A[k].panelB : A[k].panelA);
  const nivel = P.map(() => -1), pos = P.map(() => -1); nivel[raiz] = 0; pos[raiz] = 0;
  const aristas = [], adyDeArista = []; const empates = { padre: 0, orden: 0 }; let frontera = [raiz], L = 0, cuenta = 1;
  while (frontera.length) {
    const mejor = new Map();
    for (const p of frontera) for (const k of vec[p]) {
      const c = otro(k, p); if (nivel[c] !== -1) continue; const m = mejor.get(c);
      if (!m) { mejor.set(c, k); continue; }
      const lk = X[k].longitud, lm = X[m].longitud, tol = 1e-9 * Math.max(lk, lm);
      if (Math.abs(lk - lm) <= tol) { empates.padre++; if (pos[p] < pos[otro(m, c)]) mejor.set(c, k); } else if (lk > lm) mejor.set(c, k);
    }
    const hijos = [...mejor.keys()].sort((a, b) => { const pa = pos[otro(mejor.get(a), a)], pb = pos[otro(mejor.get(b), b)]; if (pa !== pb) return pa - pb; const c = cmpClave(claves[a], claves[b]); if (c) return c; empates.orden++; return a - b; });
    L++; for (const c of hijos) { const k = mejor.get(c), p = otro(k, c); nivel[c] = L; pos[c] = cuenta++; aristas.push({ parent: p, child: c, crease: A[k].crease, sign: X[k].izquierda === c ? 1 : -1 }); adyDeArista.push(k); }
    frontera = hijos;
  }
  return { aristas, adyDeArista, nivel, empates };
}

export function construirArbolPlegado(modelo, ady, base) {
  const P = modelo.panels, n = P.length; const A = ady.adyacencias, X = ady.detalle, U = ady.uniones || [];
  if (!Number.isInteger(base) || base < 0 || base >= n) throw new ErrorPanelModel('base-invalida', [{ tipo: 'error', codigo: 'base', mensaje: `base ${base} fuera de 0…${n - 1}` }]);
  const vec = P.map(() => []); A.forEach((x, k) => { vec[x.panelA].push(k); vec[x.panelB].push(k); });
  const claves = P.map(vMin);
  const T0 = bfsNiveles(P, A, X, vec, base, claves);
  // grafo COMPLETO de bisagras plegables: componentes (la de la base primero) y bosque generador determinista en las demás
  const pp = P.map((_, i) => i); const rz = (i) => (pp[i] === i ? i : (pp[i] = rz(pp[i]))); A.forEach((x) => { pp[rz(x.panelA)] = rz(x.panelB); });
  // componentes en orden de su panel menor (inserción ascendente), con la de la base primero; índice de componente de cada panel
  const comps = new Map(); P.forEach((_, i) => { const r = rz(i); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(i); });
  const rBase = rz(base); const componentes = [comps.get(rBase)]; for (const [r, c] of comps) if (r !== rBase) componentes.push(c);
  const compDe = new Array(n); componentes.forEach((c, j) => { for (const i of c) compDe[i] = j; });
  const enArbol = new Set(T0.adyDeArista); const bosque = new Set();
  for (const c of componentes.slice(1)) { // raíz = mayor área v1 de la componente; a igualdad, menor vértice mínimo (como baseDefecto)
    const raiz = c.reduce((m, i) => (P[i].area > P[m].area || (P[i].area === P[m].area && cmpClave(claves[i], claves[m]) < 0) ? i : m));
    for (const k of bfsNiveles(P, A, X, vec, raiz, claves).adyDeArista) bosque.add(k);
  }
  // partición en una pasada (orden ascendente de adyacencia): fuera del árbol de la base = ciclos + componentes no alcanzadas
  const fuera = [], noAlcanzadas = [], ciclo = [];
  for (let k = 0; k < A.length; k++) { if (enArbol.has(k)) continue; fuera.push(k); if (bosque.has(k)) noAlcanzadas.push(k); /* bosque de otras componentes: NO son ciclos */ else ciclo.push(k); /* cierran un ciclo */ }
  const numeroCiclomatico = A.length - n + componentes.length;
  if (numeroCiclomatico !== ciclo.length) throw new ErrorPanelModel('adaptador-incoherente', [{ tipo: 'error', codigo: 'ciclomatico', mensaje: `ν = ${numeroCiclomatico} ≠ ${ciclo.length} adyacencias de ciclo` }]);
  const noAlcanzados = P.map((_, i) => i).filter((i) => T0.nivel[i] === -1);
  const diagnosticos = [];
  if (componentes.length > 1) {
    // uniones no plegables o ambiguas que unirían componentes distintas: la desconexión se debe (también) a ellas
    const porUnion = U.map((x, j) => ({ union: j, clase: x.clase, componentes: [compDe[x.panelA], compDe[x.panelB]].sort((a, b) => a - b) })).filter((x) => x.clase !== 'plegable' && x.componentes[0] !== x.componentes[1]);
    diagnosticos.push({ tipo: 'componente-desconectado', componentes: componentes.slice(1), noAlcanzados, adyacenciasNoAlcanzadas: noAlcanzadas, unionesNoPlegablesEntreComponentes: porUnion });
  }
  if (ciclo.length) diagnosticos.push({ tipo: 'ciclo', adyacencias: ciclo, numeroCiclomatico, porComponente: componentes.map((c, j) => ({ componente: j, adyacencias: ciclo.filter((k) => compDe[A[k].panelA] === j) })).filter((x) => x.adyacencias.length) });
  return { aristas: T0.aristas, base, niveles: T0.nivel, adyacenciaDeArista: T0.adyDeArista, componentes, noAlcanzados, adyacenciasFueraDelArbol: fuera, adyacenciasNoAlcanzadas: noAlcanzadas, adyacenciasCiclo: ciclo, numeroCiclomatico, empates: T0.empates, diagnosticos };
}
