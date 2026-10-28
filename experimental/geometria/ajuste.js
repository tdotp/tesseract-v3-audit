// F2A-1 — AJUSTE EXPERIMENTAL de extremos de crease (solo si el llamador pasa `eps` explícito; sin valor por defecto en el núcleo).
// Autorización F2A-1, punto 3: ε (p. ej. 0,05 mm) es un PARÁMETRO EXPERIMENTAL solo para extremos de crease; nunca se aplica a contornos,
// huecos, cortes ni a los predicados topológicos. Mismo esquema que el oráculo de F2A-0 (B → A → C):
//   B agrupa extremos de crease a ≤ ε (vértices interiores y extremos que ya tocan un corte EXACTAMENTE son anclas): el grupo se lleva a
//     su ancla o a su MEDIA EXACTA (punto homogéneo);
//   A si ese punto está a distancia lateral ≤ ε de un corte, se PROYECTA EXACTAMENTE sobre él (punto homogéneo que está exactamente sobre
//     el segmento: evita el fallo del motor web, KI-34, y la incoherencia de una incidencia «declarada»);
//   C extremos aún libres → proyección exacta sobre el segmento de otra crease (T con ruido), iterada hasta el punto fijo.
// Las DECISIONES (≤ ε, banda, candidato más cercano) usan distancias en double: son decisiones de tolerancia, no topológicas.
import { sobreSegmentoG as sobreSegmentoExacto, proyectarExacto, mediaExacta, compararDistancias2 } from './predicados.js';

// ¿el candidato c está más cerca de p que el mejor actual? Exacto si las distancias aproximadas casi empatan (junto a una esquina del
// corte dos segmentos pueden estar a la misma distancia salvo 1e-16: la elección debe coincidir con la de la aritmética exacta).
// Distancia lateral APROXIMADA (double) de p a [a, b]: solo para seleccionar candidatos; las decisiones finas se toman en exacto.
function distAprox(p, a, b) { const rx = b.x - a.x, ry = b.y - a.y, L = rx * rx + ry * ry; let t = L ? ((p.x - a.x) * rx + (p.y - a.y) * ry) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(p.x - a.x - t * rx, p.y - a.y - t * ry); }
// ¿p está EXACTAMENTE sobre [a, b]? Solo se evalúa en exacto si la distancia aproximada es despreciable
const sobreSegmentoG = (p, a, b) => distAprox(p, a, b) <= 1e-9 * (1 + Math.abs(p.x) + Math.abs(p.y)) && sobreSegmentoExacto(p, a, b);
// Proyección exacta solo sobre los candidatos que pueden ganar: el más cercano en double y los que casi empatan con él
function mejorProyeccion(p, segs) {
  const ds = segs.map((s) => distAprox(p, s.a, s.b)); let m = Infinity; for (const d of ds) if (d < m) m = d;
  let best = null; segs.forEach((s, i) => { if (ds[i] - m > 1e-9 * (1 + m)) return; const pr = { ...proyectarExacto(p, s.a, s.b), s }; if (masCerca(p, pr, best)) best = pr; });
  return { best, ds };
}
const masCerca = (p, c, best) => !best || (Math.abs(c.d - best.d) > 1e-9 * (1 + c.d + best.d) ? c.d < best.d : compararDistancias2(p, c.punto, p, best.punto) < 0);

// cortes / creases: [{id, cerrado, pts:[punto]}] (se modifican los pts de las creases). Devuelve {diag}.
export function ajustarExtremos(cortes, creases, eps, rho = 3) {
  const diag = [];
  const segsCorte = []; for (const c of cortes) for (let i = 0; i < c.pts.length - (c.cerrado ? 0 : 1); i++) { const a = c.pts[i], b = c.pts[(i + 1) % c.pts.length]; if (a.x !== b.x || a.y !== b.y) segsCorte.push({ a, b, path: c.id }); }
  const cr = new Map(creases.map((c) => [c.id, c])); const get = (n) => cr.get(n.c).pts[n.k]; const set = (n, p) => { cr.get(n.c).pts[n.k] = p; };
  const tocaCorte = (p) => segsCorte.some((s) => sobreSegmentoG(p, s.a, s.b));
  const nodos = []; creases.forEach((c) => c.pts.forEach((p, k) => { const esExt = !c.cerrado && (k === 0 || k === c.pts.length - 1); nodos.push({ c: c.id, k, esExt, ancla: !esExt || tocaCorte(p) }); }));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y); const clave = (n) => n.c + ':' + n.k; const igual = (p, q) => p === q || (!p.H && !q.H && p.x === q.x && p.y === q.y);
  // B
  const par = nodos.map((_, i) => i); const raiz = (i) => (par[i] === i ? i : (par[i] = raiz(par[i])));
  for (let i = 0; i < nodos.length; i++) for (let j = i + 1; j < nodos.length; j++) { const a = nodos[i], b = nodos[j]; if (a.ancla && b.ancla) continue; if (a.c === b.c && !(a.esExt && b.esExt)) continue; if (dist(get(a), get(b)) <= eps) par[raiz(i)] = raiz(j); }
  const grupos = new Map(); nodos.forEach((n, i) => { const r = raiz(i); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(n); });
  const resuelto = new Set();
  for (const g of grupos.values()) {
    const mov = g.filter((n) => !n.ancla); if (!mov.length) continue;
    const anclas = g.filter((n) => n.ancla).map(get).filter((p, i, a) => a.findIndex((q) => igual(p, q)) === i);
    if (anclas.length > 1) { diag.push({ tipo: 'ambiguo', etapa: 'B', grupo: g.map(clave) }); continue; }
    let rep, regla;
    if (anclas.length === 1) { rep = anclas[0]; regla = 'B-ancla'; }
    else {
      const ps = g.map(get); rep = ps.every((p) => igual(p, ps[0])) ? ps[0] : mediaExacta(ps); regla = g.length > 1 ? 'B-media' : null;
      // «ya está sobre el corte» se decide EXACTAMENTE (una distancia aproximada de 0 puede ser 1e-17 exacta: entonces se proyecta)
      if (tocaCorte(rep)) regla = regla || 'A-ya-sobre-corte';
      else {
        const { best, ds } = mejorProyeccion(rep, segsCorte);
        if (best && best.d <= eps) {
          if (segsCorte.some((s, i) => ds[i] <= eps * rho && dist(proyectarExacto(rep, s.a, s.b).punto, best.punto) > eps)) diag.push({ tipo: 'ambiguo', etapa: 'A', grupo: g.map(clave) });
          rep = best.punto; regla = 'A-corte:' + best.s.path;
        }
      }
    }
    if (!regla) continue;
    for (const n of mov) { const d = dist(get(n), rep); if (!igual(get(n), rep)) diag.push({ tipo: 'ajuste', regla, crease: n.c, extremo: n.k, d_mm: d }); set(n, rep); resuelto.add(clave(n)); }
  }
  // C
  const libres = nodos.filter((n) => n.esExt && !n.ancla && !resuelto.has(clave(n)));
  for (let pasada = 0; pasada < 20; pasada++) {
    let cambios = 0;
    for (const n of libres) {
      const p = get(n); const segs = [];
      for (const c of creases) { if (c.id === n.c) continue; for (let i = 0; i < c.pts.length - (c.cerrado ? 0 : 1); i++) segs.push({ a: c.pts[i], b: c.pts[(i + 1) % c.pts.length], path: c.id }); }
      if (segs.some((s) => sobreSegmentoG(p, s.a, s.b))) continue;
      const { best: b0 } = mejorProyeccion(p, segs); const best = b0 && { ...b0, path: b0.s.path };
      if (!best || best.d > eps) continue;
      if (pasada === 0) diag.push({ tipo: 'ajuste', regla: 'C-crease:' + best.path, crease: n.c, extremo: n.k, d_mm: best.d });
      set(n, best.punto); cambios++;
    }
    if (!cambios) break; if (pasada === 19) diag.push({ tipo: 'ambiguo', etapa: 'C', motivo: 'sin punto fijo' });
  }
  // banda ambigua (solo informa)
  const todos = [...segsCorte]; creases.forEach((c) => { for (let i = 0; i < c.pts.length - (c.cerrado ? 0 : 1); i++) todos.push({ a: c.pts[i], b: c.pts[(i + 1) % c.pts.length], path: c.id }); });
  for (const n of nodos.filter((x) => x.esExt)) {
    const p = get(n); let dmin = Infinity, toca = false;
    for (const s of todos) { if (s.path === n.c) continue; if (sobreSegmentoG(p, s.a, s.b)) { toca = true; break; } dmin = Math.min(dmin, distAprox(p, s.a, s.b)); }
    if (!toca && dmin > eps && dmin <= eps * rho) diag.push({ tipo: 'banda-ambigua', crease: n.c, extremo: n.k, d_mm: dmin });
  }
  return { diag };
}
