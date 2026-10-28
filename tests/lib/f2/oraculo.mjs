// F2A-0 — ORÁCULO GEOMÉTRICO independiente del legacy (y del motor web). Solo pruebas: nunca se empaqueta ni lo importa src/.
// Independencia (docs/fase2/F2A0_01_ORACULO.md): no importa src/ ni tesseract-web; aritmética racional exacta (racional.mjs); sin
// tolerancias salvo el AJUSTE declarado de la etapa 1 (opcional, ε experimental, DP-3); identidad de vértices EXACTA; orden angular
// exacto (sin atan2); clasificación de caras por PARIDAD de contornos cerrados cruzados (regla par-impar), no por centroide.
//
// Etapas:  0 entrada exacta (+ transformación exacta opcional; curvas como anclas o muestreadas en t = k/N, puntos exactos)
//          1 ajuste tipado (solo extremos de crease; el contorno, los huecos y los cortes NUNCA se mueven):
//              B agrupación de extremos de crease a ≤ ε entre sí (vértices interiores y extremos sobre un corte = anclas)
//              A el punto del grupo (ancla o media exacta) → segmento de corte más cercano por distancia LATERAL ≤ ε (proyección exacta)
//              C extremo libre → segmento de otra crease a ≤ ε (proyección exacta; se itera hasta el punto fijo)
//              banda (ε, ρ·ε] ⇒ diagnóstico «banda-ambigua» sin mover; candidatos alternativos a > ε del elegido ⇒ «ambiguo»
//          2 arreglo plano exacto (todas las parejas, solapes colineales incluidos) · 3 ciclos (DCEL) · 4 regiones y paridad
//          5 paneles, adyacencias, asignación de cada tramo de crease, componentes, conservación de área y Euler
import * as Q from './racional.mjs';

const { ZERO, ONE } = Q;

// ---------- etapa 0 ----------
function bezier(p0, p1, p2, p3, t) { // cúbica exacta en t racional
  const mt = Q.resta(ONE, t), a = Q.mul(Q.mul(mt, mt), mt), b = Q.mul(Q.mul(Q.entero(3), Q.mul(mt, mt)), t), c = Q.mul(Q.mul(Q.entero(3), mt), Q.mul(t, t)), d = Q.mul(Q.mul(t, t), t);
  const comb = (k) => Q.suma(Q.suma(Q.mul(a, p0[k]), Q.mul(b, p1[k])), Q.suma(Q.mul(c, p2[k]), Q.mul(d, p3[k])));
  return { x: comb('x'), y: comb('y') };
}
const esCurvo = (a, b) => !(Q.pIgual(a.right, a.anchor) && Q.pIgual(b.left, b.anchor));
function polilinea(path, cerrado, opciones, tr) {
  const pts = (path.points || []).map((p) => ({ anchor: tr(Q.pDouble(p.anchor)), left: tr(Q.pDouble(p.left || p.anchor)), right: tr(Q.pDouble(p.right || p.anchor)) }));
  if (pts.length < 2) return [];
  const N = opciones.curvas && opciones.curvas.muestras ? opciones.curvas.muestras : 0;
  const out = [pts[0].anchor]; const n = pts.length, ult = cerrado ? n : n - 1;
  for (let i = 0; i < ult; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    if (N && esCurvo(a, b)) for (let k = 1; k < N; k++) out.push(bezier(a.anchor, a.right, b.left, b.anchor, Q.div(Q.entero(k), Q.entero(N))));
    out.push(b.anchor);
  }
  if (cerrado) out.pop(); // el último es el primero
  return out;
}

// ---------- etapa 1: ajuste tipado ----------
// Orden (determinista e independiente del orden de entrada): B) agrupar puntos de crease a ≤ ε (union-find; los vértices interiores y los
// extremos que ya tocan exactamente un corte son anclas) → A) cada grupo sin ancla se lleva a su media exacta y, si ese punto está a
// distancia lateral ≤ ε de un corte, se proyecta sobre él → C) extremos aislados sobre segmentos de otra crease (T con ruido), iterado.
function ajustar(cortes, creases, eps, rho, diag) {
  if (!eps) return;
  const eps2 = Q.mul(eps, eps), banda2 = Q.mul(eps2, Q.mul(rho, rho));
  const segsCorte = []; for (const c of cortes) for (let i = 0; i < c.pts.length - (c.cerrado ? 0 : 1); i++) segsCorte.push({ a: c.pts[i], b: c.pts[(i + 1) % c.pts.length], src: c.id });
  const cr = new Map(creases.map((c) => [c.id, c]));
  const get = (n) => cr.get(n.c).pts[n.k]; const set = (n, p) => { cr.get(n.c).pts[n.k] = p; };
  const tocaCorte = (p) => segsCorte.some((s) => Q.sobreSegmento(p, s.a, s.b));
  const nodos = [];
  creases.forEach((c) => c.pts.forEach((p, k) => { const esExt = !c.cerrado && (k === 0 || k === c.pts.length - 1); nodos.push({ c: c.id, k, esExt, ancla: !esExt || tocaCorte(p) }); }));
  // B) grupos
  const par = nodos.map((_, i) => i); const raiz = (i) => (par[i] === i ? i : (par[i] = raiz(par[i])));
  for (let i = 0; i < nodos.length; i++) for (let j = i + 1; j < nodos.length; j++) {
    if (nodos[i].ancla && nodos[j].ancla) continue; if (nodos[i].c === nodos[j].c && !(nodos[i].esExt && nodos[j].esExt)) continue;
    if (Q.cmp(Q.dist2(get(nodos[i]), get(nodos[j])), eps2) <= 0) par[raiz(i)] = raiz(j);
  }
  const grupos = new Map(); nodos.forEach((n, i) => { const r = raiz(i); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(n); });
  const resuelto = new Set(); const clave = (n) => n.c + ':' + n.k;
  for (const g of grupos.values()) {
    const moviles = g.filter((n) => !n.ancla); if (!moviles.length) continue;
    const anclas = g.filter((n) => n.ancla).map(get).filter((p, i, a) => a.findIndex((q) => Q.pIgual(p, q)) === i);
    let rep, regla;
    if (anclas.length > 1) { diag.push({ tipo: 'ambiguo', etapa: 'B', grupo: g.map(clave), anclas: anclas.length }); continue; }
    if (anclas.length === 1) { rep = anclas[0]; regla = 'B-ancla'; }
    else {
      rep = Q.pMedia(g.map(get)); regla = g.length > 1 ? 'B-media' : null;
      // A) el punto del grupo se une al corte más cercano por distancia lateral
      let best = null; const cands = [];
      for (const s of segsCorte) { const pr = Q.proyectar(rep, s.a, s.b); if (Q.cmp(pr.d2, banda2) <= 0) cands.push(pr); if (!best || Q.cmp(pr.d2, best.d2) < 0) best = { ...pr, src: s.src }; }
      if (best && !Q.esCero(best.d2) && Q.cmp(best.d2, eps2) <= 0) {
        if (cands.some((c) => Q.cmp(Q.dist2(c.q, best.q), eps2) > 0)) diag.push({ tipo: 'ambiguo', etapa: 'A', grupo: g.map(clave), motivo: 'otro corte a ≤ ρ·ε lejos del elegido' });
        rep = best.q; regla = 'A-corte:' + best.src;
      } else if (best && Q.esCero(best.d2)) regla = regla || 'A-ya-sobre-corte';
    }
    if (!regla) continue;
    for (const n of moviles) { const d2 = Q.dist2(get(n), rep); if (!Q.esCero(d2)) diag.push({ tipo: 'ajuste', regla, crease: n.c, extremo: n.k, d_mm: Math.sqrt(Q.aNumero(d2)) }); set(n, rep); resuelto.add(clave(n)); }
  }
  // C) extremos aún libres → segmento de otra crease (T con ruido), iterado hasta el punto fijo
  const libres = nodos.filter((n) => n.esExt && !n.ancla && !resuelto.has(clave(n)));
  for (let pasada = 0; pasada < 20; pasada++) {
    let cambios = 0;
    for (const n of libres) {
      const p = get(n); let best = null;
      for (const c of creases) { if (c.id === n.c) continue; for (let i = 0; i < c.pts.length - (c.cerrado ? 0 : 1); i++) { const pr = Q.proyectar(p, c.pts[i], c.pts[(i + 1) % c.pts.length]); if (!best || Q.cmp(pr.d2, best.d2) < 0) best = { ...pr, src: c.id }; } }
      if (!best || Q.esCero(best.d2) || Q.cmp(best.d2, eps2) > 0) continue;
      if (pasada === 0) diag.push({ tipo: 'ajuste', regla: 'C-crease:' + best.src, crease: n.c, extremo: n.k, d_mm: Math.sqrt(Q.aNumero(best.d2)) });
      set(n, best.q); cambios++;
    }
    if (!cambios) break; if (pasada === 19) diag.push({ tipo: 'ambiguo', etapa: 'C', motivo: 'sin punto fijo en 20 pasadas' });
  }
  // banda ambigua: extremos que no tocan nada exactamente y tienen geometría a (ε, ρ·ε]
  const todos = [...segsCorte]; creases.forEach((c) => { for (let i = 0; i < c.pts.length - (c.cerrado ? 0 : 1); i++) todos.push({ a: c.pts[i], b: c.pts[(i + 1) % c.pts.length], src: c.id }); });
  for (const n of nodos.filter((x) => x.esExt)) {
    const p = get(n); let dmin = null;
    for (const s of todos) { if (s.src === n.c) continue; const d2 = Q.proyectar(p, s.a, s.b).d2; if (!dmin || Q.cmp(d2, dmin) < 0) dmin = d2; }
    if (dmin && !Q.esCero(dmin) && Q.cmp(dmin, eps2) > 0 && Q.cmp(dmin, banda2) <= 0) diag.push({ tipo: 'banda-ambigua', crease: n.c, extremo: n.k, d_mm: Math.sqrt(Q.aNumero(dmin)) });
  }
}

// ---------- etapas 2–5 ----------
export function oraculo(dieline, opciones = {}) {
  const tr = opciones.transformar || ((p) => p);
  const eps = opciones.eps == null ? null : Q.deTexto(opciones.eps), rho = Q.deTexto(opciones.rho || '3');
  const diag = [];
  // 0. entrada exacta. Contornos cerrados (paridad): contorno exterior y huecos. Cortes abiertos: separan pero no cambian la paridad.
  const cortes = [];
  if (dieline.outerBoundary) cortes.push({ id: 'B', cerrado: true, paridad: true, pts: polilinea(dieline.outerBoundary, true, opciones, tr) });
  (dieline.holes || []).forEach((h, i) => cortes.push({ id: 'H' + i, cerrado: true, paridad: true, pts: polilinea(h, true, opciones, tr) }));
  (dieline.cutLines || []).forEach((k, i) => { const g = k.geom || k; cortes.push({ id: 'K' + i, cerrado: !!g.closed, paridad: !!g.closed, pts: polilinea(g, !!g.closed, opciones, tr) }); });
  const creases = (dieline.creases || []).map((c, i) => ({ id: 'C' + i, cerrado: !!c.closed, pts: polilinea(c, !!c.closed, opciones, tr) }));
  const hashCortes = () => cortes.map((c) => c.id + ':' + c.pts.map(Q.pClave).join(';')).join('|');
  const hashAntes = hashCortes();
  // 1. ajuste
  ajustar(cortes, creases, eps, rho, diag);
  const contornoIntacto = hashCortes() === hashAntes;
  // 2. arreglo plano exacto
  const segs = []; let longitudCero = 0;
  const add = (pts, cerrado, tag) => { for (let i = 0; i < pts.length - (cerrado ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if (Q.pIgual(a, b)) { longitudCero++; continue; } segs.push({ a, b, tag, ts: [ZERO, ONE] }); } };
  for (const c of cortes) add(c.pts, c.cerrado, c.id); for (const c of creases) add(c.pts, c.cerrado, c.id);
  const bb = (s) => ({ x0: Q.min(s.a.x, s.b.x), x1: Q.max(s.a.x, s.b.x), y0: Q.min(s.a.y, s.b.y), y1: Q.max(s.a.y, s.b.y) }); segs.forEach((s) => { s.bb = bb(s); });
  const addT = (s, t) => { if (Q.signo(t) < 0 || Q.cmp(t, ONE) > 0) return; if (!s.ts.some((u) => Q.igual(u, t))) s.ts.push(t); };
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const s1 = segs[i], s2 = segs[j];
    if (Q.cmp(s1.bb.x1, s2.bb.x0) < 0 || Q.cmp(s2.bb.x1, s1.bb.x0) < 0 || Q.cmp(s1.bb.y1, s2.bb.y0) < 0 || Q.cmp(s2.bb.y1, s1.bb.y0) < 0) continue;
    const r = Q.pResta(s1.b, s1.a), s = Q.pResta(s2.b, s2.a), qp = Q.pResta(s2.a, s1.a), rxs = Q.cruz(r, s);
    if (!Q.esCero(rxs)) { const t = Q.div(Q.cruz(qp, s), rxs), u = Q.div(Q.cruz(qp, r), rxs); if (Q.signo(t) >= 0 && Q.cmp(t, ONE) <= 0 && Q.signo(u) >= 0 && Q.cmp(u, ONE) <= 0) { addT(s1, t); addT(s2, u); } continue; }
    if (!Q.esCero(Q.cruz(qp, r))) continue; // paralelos distintos
    const rr = Q.punto(r, r), ss = Q.punto(s, s);
    addT(s1, Q.div(Q.punto(Q.pResta(s2.a, s1.a), r), rr)); addT(s1, Q.div(Q.punto(Q.pResta(s2.b, s1.a), r), rr));
    addT(s2, Q.div(Q.punto(Q.pResta(s1.a, s2.a), s), ss)); addT(s2, Q.div(Q.punto(Q.pResta(s1.b, s2.a), s), ss));
  }
  const V = [], vid = new Map(); const idDe = (p) => { const k = Q.pClave(p); if (!vid.has(k)) { vid.set(k, V.length); V.push(p); } return vid.get(k); };
  const aristas = new Map(); // "u|v" (u<v) → {u, v, tags:Set}
  for (const s of segs) {
    s.ts.sort(Q.cmp); const r = Q.pResta(s.b, s.a);
    for (let k = 0; k + 1 < s.ts.length; k++) {
      const u = idDe(Q.pSuma(s.a, Q.pEscala(r, s.ts[k]))), v = idDe(Q.pSuma(s.a, Q.pEscala(r, s.ts[k + 1])));
      const key = u < v ? u + '|' + v : v + '|' + u; if (!aristas.has(key)) aristas.set(key, { u: Math.min(u, v), v: Math.max(u, v), tags: new Set() }); aristas.get(key).tags.add(s.tag);
    }
  }
  // 3. semiaristas y ciclos (orden angular exacto alrededor de cada vértice)
  const H = []; const salientes = V.map(() => []);
  for (const e of aristas.values()) { const h1 = { o: e.u, t: e.v, e }, h2 = { o: e.v, t: e.u, e }; h1.tw = h2; h2.tw = h1; H.push(h1, h2); salientes[e.u].push(h1); salientes[e.v].push(h2); }
  const mitad = (d) => (Q.signo(d.y) > 0 || (Q.esCero(d.y) && Q.signo(d.x) > 0) ? 0 : 1);
  salientes.forEach((lista, o) => { lista.forEach((h) => { h.dir = Q.pResta(V[h.t], V[o]); }); lista.sort((a, b) => mitad(a.dir) - mitad(b.dir) || -Q.signo(Q.cruz(a.dir, b.dir))); lista.forEach((h, i) => { h.idx = i; }); });
  const ciclos = [];
  for (const h0 of H) {
    if (h0.ciclo != null) continue; const c = { id: ciclos.length, hs: [] }; let h = h0;
    do { h.ciclo = c.id; c.hs.push(h); const lst = salientes[h.t]; h = lst[(h.tw.idx - 1 + lst.length) % lst.length]; } while (h !== h0 && c.hs.length <= H.length);
    c.area = Q.areaPoligono(c.hs.map((x) => V[x.o])); ciclos.push(c);
  }
  // componentes conexas del grafo y Euler
  const pv = V.map((_, i) => i); const rz = (i) => (pv[i] === i ? i : (pv[i] = rz(pv[i]))); for (const e of aristas.values()) pv[rz(e.u)] = rz(e.v);
  const compDe = new Map(); V.forEach((_, i) => { if (salientes[i].length) { const r = rz(i); if (!compDe.has(r)) compDe.set(r, compDe.size); } });
  const nComp = compDe.size; const euler = { V: V.filter((_, i) => salientes[i].length).length, E: aristas.size, ciclos: ciclos.length, componentes: nComp }; euler.ok = euler.V - euler.E + euler.ciclos === 2 * nComp;
  // 4. regiones: ciclo exterior de cada componente (el de menor área con signo) se une a la cara que contiene la componente (o a la no acotada)
  const porComp = new Map(); ciclos.forEach((c) => { const k = compDe.get(rz(c.hs[0].o)); c.comp = k; if (!porComp.has(k)) porComp.set(k, []); porComp.get(k).push(c); });
  const exterior = new Map(); for (const [k, cs] of porComp) exterior.set(k, cs.reduce((m, c) => (Q.cmp(c.area, m.area) < 0 ? c : m)));
  const region = ciclos.map((c) => c.id); const NOACOTADA = -1;
  for (const [k, ext] of exterior) {
    const v = V[ext.hs[0].o]; let cont = null;
    for (const c of ciclos) { if (c.comp === k || Q.signo(c.area) <= 0 || c === exterior.get(c.comp)) continue; if (Q.dentroPoligono(v, c.hs.map((x) => V[x.o])) && (!cont || Q.cmp(c.area, cont.area) < 0)) cont = c; }
    region[ext.id] = cont ? cont.id : NOACOTADA; ext.contenidaEn = cont ? cont.id : NOACOTADA;
  }
  const reg = (cid) => { let r = region[cid]; while (r !== NOACOTADA && region[r] !== r) r = region[r]; return r; };
  // paridad por BFS desde la región no acotada: cruzar una arista con k etiquetas de contorno cerrado cambia la paridad k veces
  const paridadEtiqueta = (e) => [...e.tags].filter((t) => /^(B|H\d+)$/.test(t) || cortes.some((c) => c.id === t && c.paridad && /^K/.test(t))).length % 2;
  const vecinos = new Map(); const addV = (a, b, p) => { if (!vecinos.has(a)) vecinos.set(a, []); vecinos.get(a).push([b, p]); };
  for (const e of aristas.values()) { const [h1, h2] = H.filter((h) => h.e === e); const a = reg(h1.ciclo), b = reg(h2.ciclo); const p = paridadEtiqueta(e); addV(a, b, p); addV(b, a, p); }
  const par2 = new Map([[NOACOTADA, 0]]); const cola = [NOACOTADA]; let paridadCoherente = true;
  while (cola.length) { const a = cola.shift(); for (const [b, p] of vecinos.get(a) || []) { const v = par2.get(a) ^ p; if (!par2.has(b)) { par2.set(b, v); cola.push(b); } else if (par2.get(b) !== v) paridadCoherente = false; } }
  // 5. paneles = regiones acotadas con paridad impar
  const regiones = [...new Set(ciclos.map((c) => reg(c.id)))].filter((r) => r !== NOACOTADA);
  const paneles = [];
  for (const r of regiones) {
    const c = ciclos[r]; if (Q.signo(c.area) <= 0) continue; if (par2.get(r) !== 1) continue;
    let area = c.area; const islas = ciclos.filter((x) => x.contenidaEn === r); for (const x of islas) area = Q.suma(area, x.area);
    paneles.push({ region: r, area, poligono: c.hs.map((h) => V[h.o]), islas: islas.length });
  }
  // tramos de crease y adyacencias
  const panelDeRegion = new Map(paneles.map((p, i) => [p.region, i]));
  const tramos = []; const ady = new Map();
  for (const e of aristas.values()) {
    const cr = [...e.tags].filter((t) => /^C\d+$/.test(t)); if (!cr.length) continue;
    const [h1, h2] = H.filter((h) => h.e === e); const a = panelDeRegion.get(reg(h1.ciclo)), b = panelDeRegion.get(reg(h2.ciclo));
    const L = Math.sqrt(Q.aNumero(Q.dist2(V[e.u], V[e.v]))); const sobreCorte = [...e.tags].some((t) => !/^C\d+$/.test(t));
    const tipo = sobreCorte ? 'sobre-corte' : a == null && b == null ? 'fuera' : a === b ? 'colgante' : a == null || b == null ? 'borde' : 'separa';
    for (const c of cr) tramos.push({ crease: c, tipo, a, b, longitud: L });
    if (tipo === 'separa') { const k = Math.min(a, b) + '|' + Math.max(a, b); if (!ady.has(k)) ady.set(k, { a: Math.min(a, b), b: Math.max(a, b), creases: new Set(), longitud: 0 }); const x = ady.get(k); cr.forEach((c) => x.creases.add(c)); x.longitud += L; }
  }
  paneles.forEach((p, i) => { p.creases = [...new Set(tramos.filter((t) => t.tipo === 'separa' && (t.a === i || t.b === i)).map((t) => t.crease))].sort(ordId); p.bordesCorte = 0; });
  for (const e of aristas.values()) { if (![...e.tags].some((t) => !/^C\d+$/.test(t))) continue; for (const h of H.filter((x) => x.e === e)) { const i = panelDeRegion.get(reg(h.ciclo)); if (i != null) paneles[i].bordesCorte++; } }
  // orden canónico: firma = creases que lo separan + área (independiente del orden de entrada y del sentido de los trazados)
  const firma = (p) => p.creases.join(' ') + '|' + Q.texto(p.area);
  const orden = paneles.map((_, i) => i).sort((i, j) => (firma(paneles[i]) < firma(paneles[j]) ? -1 : firma(paneles[i]) > firma(paneles[j]) ? 1 : 0));
  const nuevo = new Map(orden.map((viejo, k) => [viejo, k])); const P = orden.map((i) => paneles[i]);
  tramos.forEach((t) => { if (t.a != null) t.a = nuevo.get(t.a); if (t.b != null) t.b = nuevo.get(t.b); });
  const adyacencias = [...ady.values()].map((x) => { const a = nuevo.get(x.a), b = nuevo.get(x.b); return { a: Math.min(a, b), b: Math.max(a, b), creases: [...x.creases].sort(ordId), longitud: x.longitud }; }).sort((x, y) => x.a - y.a || x.b - y.b);
  // componentes de paneles por adyacencia
  const pp = P.map((_, i) => i); const rp = (i) => (pp[i] === i ? i : (pp[i] = rp(pp[i]))); adyacencias.forEach((x) => { pp[rp(x.a)] = rp(x.b); });
  const componentes = new Set(P.map((_, i) => rp(i))).size;
  // conservación EXACTA frente al área par-impar calculada sin el arreglo (contornos cerrados anidados, sin cruzarse)
  const cerrados = cortes.filter((c) => c.paridad && c.pts.length >= 3);
  let areaEsperada = ZERO; let contornosCruzados = false;
  for (const c of cerrados) {
    let prof = 0; for (const o of cerrados) { if (o === c) continue; const v = c.pts.find((q) => !o.pts.some((_, i) => Q.sobreSegmento(q, o.pts[i], o.pts[(i + 1) % o.pts.length]))); if (!v) { contornosCruzados = true; continue; } if (Q.dentroPoligono(v, o.pts)) prof++; }
    const A = Q.areaPoligono(c.pts); const absA = Q.signo(A) < 0 ? Q.neg(A) : A; areaEsperada = prof % 2 ? Q.resta(areaEsperada, absA) : Q.suma(areaEsperada, absA);
  }
  let areaGenerada = ZERO; for (const p of P) areaGenerada = Q.suma(areaGenerada, p.area);
  // astillas: ancho medio 2A/P < ε (solo diagnóstico; el panel se conserva)
  P.forEach((p, i) => { let per = 0; for (let k = 0; k < p.poligono.length; k++) per += Math.sqrt(Q.aNumero(Q.dist2(p.poligono[k], p.poligono[(k + 1) % p.poligono.length]))); p.anchoMedio = per ? (2 * Q.aNumero(p.area)) / per : 0; if (eps && p.anchoMedio < Q.aNumero(eps)) diag.push({ tipo: 'astilla', panel: 'F' + i, anchoMedio_mm: p.anchoMedio, area_mm2: Q.aNumero(p.area) }); });
  return {
    opciones: { eps: opciones.eps == null ? null : String(opciones.eps), rho: String(opciones.rho || '3'), curvas: opciones.curvas || 'anclas' },
    contornoIntacto, segmentosLongitudCero: longitudCero, diagnosticos: diag,
    arreglo: { vertices: euler.V, aristas: euler.E, ciclos: euler.ciclos, componentesGrafo: nComp, eulerOK: euler.ok, paridadCoherente },
    paneles: P.map((p, i) => ({ id: 'F' + i, creases: p.creases, area: p.area, areaMm2: Q.aNumero(p.area), anchoMedioMm: p.anchoMedio, vertices: p.poligono.length, bordesCorte: p.bordesCorte, islas: p.islas, poligono: p.poligono })),
    adyacencias, tramos, componentesPaneles: componentes,
    creases: creases.map((c) => { const ts = tramos.filter((t) => t.crease === c.id); const sum = (k) => ts.filter((t) => t.tipo === k).reduce((s, t) => s + t.longitud, 0); return { id: c.id, separa: sum('separa'), colgante: sum('colgante'), sobreCorte: sum('sobre-corte'), fuera: sum('fuera'), borde: sum('borde'), pares: [...new Set(ts.filter((t) => t.tipo === 'separa').map((t) => Math.min(t.a, t.b) + '-' + Math.max(t.a, t.b)))].sort() }; }),
    conservacion: { esperada: areaEsperada, generada: areaGenerada, exacta: Q.igual(areaEsperada, areaGenerada), esperadaMm2: Q.aNumero(areaEsperada), generadaMm2: Q.aNumero(areaGenerada), contornosCruzados },
  };
}
function ordId(a, b) { return a[0] === b[0] ? Number(a.slice(1)) - Number(b.slice(1)) : a < b ? -1 : 1; }

// Resumen serializable (para goldens y comparaciones): sin racionales internos salvo el área exacta como texto.
export function resumen(R) {
  const r6 = (x) => Math.round(x * 1e6) / 1e6;
  return {
    opciones: R.opciones, contornoIntacto: R.contornoIntacto, segmentosLongitudCero: R.segmentosLongitudCero, arreglo: R.arreglo,
    ajustes: R.diagnosticos.filter((d) => d.tipo === 'ajuste').length, ambiguedades: R.diagnosticos.filter((d) => d.tipo !== 'ajuste'),
    paneles: R.paneles.map((p) => ({ id: p.id, creases: p.creases, area: Q.texto(p.area), areaMm2: r6(p.areaMm2), vertices: p.vertices, bordesCorte: p.bordesCorte, islas: p.islas, centroideMm: centroide(p.poligono) })),
    adyacencias: R.adyacencias.map((x) => ({ a: x.a, b: x.b, creases: x.creases, longitudMm: r6(x.longitud) })),
    creases: R.creases.map((c) => ({ id: c.id, separaMm: r6(c.separa), colganteMm: r6(c.colgante), sobreCorteMm: r6(c.sobreCorte), fueraMm: r6(c.fuera), bordeMm: r6(c.borde), pares: c.pares })),
    componentesPaneles: R.componentesPaneles,
    conservacion: { exacta: R.conservacion.exacta, esperadaMm2: r6(R.conservacion.esperadaMm2), generadaMm2: r6(R.conservacion.generadaMm2), esperada: Q.texto(R.conservacion.esperada), contornosCruzados: R.conservacion.contornosCruzados },
  };
}
export function centroide(poli) { const A = Q.areaPoligono(poli); if (Q.esCero(A)) return null; let cx = Q.ZERO, cy = Q.ZERO; for (let i = 0; i < poli.length; i++) { const p = poli[i], q = poli[(i + 1) % poli.length], k = Q.cruz(p, q); cx = Q.suma(cx, Q.mul(Q.suma(p.x, q.x), k)); cy = Q.suma(cy, Q.mul(Q.suma(p.y, q.y), k)); } const s = Q.mul(Q.entero(6), A); const r6 = (x) => Math.round(Q.aNumero(Q.div(x, s)) * 1e6) / 1e6; return [r6(cx), r6(cy)]; }
