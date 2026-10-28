// F2A-2 — ADAPTADOR EXPERIMENTAL del núcleo geométrico (experimental/geometria/) al contrato PanelModel v1 de src/core/engine.js.
// No lo importa src/, no está conectado al panel CEP ni a GeometryEngine; el legacy sigue siendo el motor del producto.
//
// Contrato v1 (leído de src/core/engine.js, no se modifica ni se duplica):
//   Panel      {vertices: Point[] (CCW), edges: {u, v, type:'boundary'|'crease'}[], area (≥ 0), centroid (ponderado por área)}
//   CreaseEdge {a, b, creaseIdx, segIdx}   a/b SON los anchor de la entrada
//   PanelModel {panels: Panel[], creaseEdges: CreaseEdge[], creases: Path[]}
// Todo lo que v1 no puede expresar va en UN campo declarado, `f2a2` (los objetos v1 no llevan campos extra):
//   f2a2.paneles[i]   {id, creases, areaNeta, huecos: [{tipo, vertices (CW)}], bordesCorte, islas}   (i = índice del panel v1)
//   f2a2.conversiones conversiones con pérdida de precisión o de representación (siempre presentes, con su cuenta)
//   f2a2.diagnosticos diagnósticos del núcleo (ajuste, banda-ambigua, astilla, ambiguo) y del adaptador
//   f2a2.detalle      NO enumerable: estructuras del núcleo (arreglo y caras) que usan construirAdyacencias/construirArbolPlegado
// Decisiones (docs/fase2/F2A2_INFORME.md §2): `area` = área BRUTA del contorno exterior (como el legacy; DP-6 sigue aplazada), el área
// neta va en f2a2; `vertices` = anillo exterior sin antenas (tramos de crease colgantes que entran y salen del panel); `edges` = aristas
// atómicas del anillo exterior (una crease superpuesta a un corte es 'boundary'); `creaseEdges` = los del legacy (segmentos de la ENTRADA,
// con alias de sus anchor; el segmento de cierre de una crease cerrada no entra, como en el legacy, y se declara aparte).
import { nucleoDetallado } from '../geometria/nucleo.js';
import { areaPoligono } from '../geometria/caras.js';

export const CONTRATO_PANEL_MODEL = 1;
export const MOTOR = 'experimental-f2a2';

export class ErrorPanelModel extends Error {
  constructor(codigo, diagnosticos) { super(codigo + ': ' + diagnosticos.map((d) => d.mensaje).join('; ')); this.name = 'ErrorPanelModel'; this.codigo = codigo; this.diagnosticos = diagnosticos; }
}

const esC = (t) => /^C\d+$/.test(t);
const finito = (v) => typeof v === 'number' && isFinite(v);
// Dominio de los predicados exactos (sin desbordamiento ni subdesbordamiento en los productos; probado hasta 1e7 mm)
const fueraDeDominio = (v) => Math.abs(v) > 1e9 || (v !== 0 && Math.abs(v) < 1e-100);

// Diagnósticos de entrada: [] si la entrada es válida. Nunca corrige ni completa la entrada.
export function validarEntrada(d, opciones = {}) {
  const e = []; const err = (codigo, ruta, mensaje) => e.push({ tipo: 'error', codigo, ruta, mensaje: ruta ? ruta + ': ' + mensaje : mensaje });
  if (!d || typeof d !== 'object' || Array.isArray(d)) { err('dieline', '', 'la entrada no es un objeto Dieline'); return e; }
  if (d.error) err('dieline-error', 'error', 'la extracción trae un error: ' + d.error);
  if (d.units != null && d.units !== 'mm') err('unidades', 'units', `unidades «${d.units}»; el contrato v1 es en mm (no se convierte)`);
  const punto = (q, ruta, k) => { if (!q || !finito(q.x) || !finito(q.y)) err(k === 'anchor' ? 'ancla' : 'manejador', ruta, 'punto ausente o no finito'); else if (fueraDeDominio(q.x) || fueraDeDominio(q.y)) err('dominio', ruta, `coordenada fuera del dominio de los predicados (${q.x}, ${q.y})`); };
  const trazado = (p, ruta, min) => {
    if (!p || typeof p !== 'object' || !Array.isArray(p.points)) { err('trazado', ruta, 'trazado sin lista de puntos'); return; }
    if (p.points.length < min) err('trazado-corto', ruta, `${p.points.length} puntos (mínimo ${min})`);
    p.points.forEach((q, i) => { punto(q && q.anchor, `${ruta}.points[${i}].anchor`, 'anchor'); for (const k of ['left', 'right']) if (q && q[k] != null) punto(q[k], `${ruta}.points[${i}].${k}`, k); });
  };
  trazado(d.outerBoundary, 'outerBoundary', 3);
  for (const [k, min] of [['holes', 3], ['creases', 2], ['cutLines', 2]]) {
    if (d[k] == null) continue; if (!Array.isArray(d[k])) { err('lista', k, 'no es una lista'); continue; }
    d[k].forEach((p, i) => (k === 'cutLines' ? trazado(p && (p.geom || p), `cutLines[${i}].geom`, min) : trazado(p, `${k}[${i}]`, min)));
  }
  if (opciones.eps != null && !(finito(Number(opciones.eps)) && Number(opciones.eps) > 0)) err('opcion-eps', 'opciones.eps', 'ε experimental debe ser un número > 0 (sin él no hay ajuste)');
  if (opciones.rho != null && !(finito(Number(opciones.rho)) && Number(opciones.rho) >= 1)) err('opcion-rho', 'opciones.rho', 'ρ debe ser un número ≥ 1');
  const c = opciones.curvas; if (c != null && c !== 'anclas' && !(c && Number.isInteger(c.muestras) && c.muestras >= 2 && c.muestras <= 1024)) err('opcion-curvas', 'opciones.curvas', "'anclas' o {muestras: entero 2…1024}");
  return e;
}

// Separa un ciclo de caras en anillos cerrados quitando las aristas cuyas DOS semiaristas están en ese mismo ciclo (antenas y puentes
// de un panel a un hueco unido por una crease). Las parejas quitadas se anidan como paréntesis a lo largo del ciclo (grafo plano).
function anillos(c) {
  const hs = c.hs; const quitada = (h) => h.tw.ciclo === h.ciclo; let ini = hs.findIndex((h) => !quitada(h));
  const out = []; if (ini < 0) return { anillos: out, quitadas: hs.length };
  const pila = [[]], abiertas = new Set(); let quitadas = 0;
  for (let k = 0; k < hs.length; k++) {
    const h = hs[(ini + k) % hs.length];
    if (!quitada(h)) { pila[pila.length - 1].push(h); continue; }
    quitadas++; if (abiertas.has(h.tw)) { abiertas.delete(h.tw); out.push(pila.pop()); } else { abiertas.add(h); pila.push([]); }
  }
  while (pila.length) out.push(pila.pop());
  return { anillos: out.filter((r) => r.length > 0), quitadas };
}

function centroide(ps) {
  const o = ps[0]; let A = 0, cx = 0, cy = 0;
  for (let i = 0; i < ps.length; i++) { const p = ps[i], q = ps[(i + 1) % ps.length]; const px = p.x - o.x, py = p.y - o.y, qx = q.x - o.x, qy = q.y - o.y; const k = px * qy - qx * py; A += k; cx += (px + qx) * k; cy += (py + qy) * k; }
  if (A === 0) { let sx = 0, sy = 0; for (const p of ps) { sx += p.x; sy += p.y; } return { x: sx / ps.length, y: sy / ps.length }; }
  return { x: o.x + cx / (3 * A), y: o.y + cy / (3 * A) };
}

// Dieline v1 (mm) → PanelModel v1 + extensión f2a2. Opciones del núcleo: eps (experimental, sin valor por defecto), rho, curvas.
// Lanza ErrorPanelModel('entrada-invalida' | 'nucleo-incoherente' | 'adaptador-incoherente', diagnosticos).
export function adaptarPanelModel(d, opciones = {}) {
  const errores = validarEntrada(d, opciones); if (errores.length) throw new ErrorPanelModel('entrada-invalida', errores);
  const op = { eps: opciones.eps == null ? null : Number(opciones.eps), rho: opciones.rho, curvas: opciones.curvas };
  const { resumen: R, detalle: D } = nucleoDetallado(d, op);
  const fallos = [];
  if (!R.arreglo.eulerOK) fallos.push({ tipo: 'error', codigo: 'euler', mensaje: 'el arreglo no cumple la fórmula de Euler' });
  if (!R.arreglo.paridadCoherente) fallos.push({ tipo: 'error', codigo: 'paridad', mensaje: 'paridad par-impar incoherente' });
  if (!R.contornoIntacto) fallos.push({ tipo: 'error', codigo: 'contorno', mensaje: 'el ajuste modificó un corte' });
  if (fallos.length) throw new ErrorPanelModel('nucleo-incoherente', fallos);
  const V = D.arreglo.vertices; const { ciclos } = D.caras;
  const tipoArista = (e) => ([...e.tags].some((t) => !esC(t)) ? 'boundary' : 'crease');
  const diag = R.diagnosticos.map((x) => ({ origen: 'nucleo', ...x }));
  const cuenta = { cruces: new Set(), exactos: new Set(), antenas: 0, anillosNulos: 0 };
  const panels = [], ext = [], incoherentes = [];
  D.regionDePanel.forEach((r, i) => {
    const P = R.paneles[i]; const c = ciclos[r];
    const { anillos: an, quitadas } = anillos(c); cuenta.antenas += quitadas / 2;
    const islas = ciclos.filter((x) => x.contenidaEn === r).map(anillos); islas.forEach((x) => { cuenta.antenas += x.quitadas / 2; });
    const conArea = (hs) => ({ hs, area: areaPoligono(hs.map((h) => V[h.o])) });
    const propios = an.map(conArea), deIslas = islas.flatMap((x) => x.anillos.map(conArea));
    const exterior = propios.reduce((m, x) => (x.area > 0 && (!m || x.area > m.area) ? x : m), null);
    if (!exterior) { incoherentes.push({ tipo: 'error', codigo: 'sin-exterior', panel: P.id, mensaje: `${P.id}: sin anillo exterior de área positiva` }); return; }
    const huecosR = [];
    for (const x of propios.concat(deIslas)) { if (x === exterior) continue; if (x.area < 0) huecosR.push(x); else if (x.area === 0) cuenta.anillosNulos++; else diag.push({ origen: 'adaptador', tipo: 'anillo-positivo-extra', panel: P.id, area_mm2: x.area }); }
    for (const h of exterior.hs) { const v = V[h.o]; if (v.tipo === 'cruce') cuenta.cruces.add(v.id); if (v.exacto) cuenta.exactos.add(v.id); }
    const ids = exterior.hs.map((h) => h.o); if (new Set(ids).size !== ids.length) diag.push({ origen: 'adaptador', tipo: 'vertice-pinzado', panel: P.id });
    const vertices = exterior.hs.map((h) => ({ x: V[h.o].x, y: V[h.o].y }));
    const edges = exterior.hs.map((h, k) => ({ u: vertices[k], v: vertices[(k + 1) % vertices.length], type: tipoArista(h.e) }));
    const areaBruta = Math.abs(areaPoligono(vertices));
    const huecos = huecosR.map((x) => { const ts = new Set(x.hs.map((h) => tipoArista(h.e))); return { tipo: ts.size === 2 ? 'mixto' : ts.has('crease') ? 'crease' : 'hueco', area: -x.area, vertices: x.hs.map((h) => ({ x: V[h.o].x, y: V[h.o].y })) }; });
    const neta = areaBruta - huecos.reduce((s, x) => s + x.area, 0);
    let M = 1; for (const v of vertices) M = Math.max(M, Math.abs(v.x), Math.abs(v.y));
    if (Math.abs(neta - P.area) > 1e-9 * Math.max(1, P.area) + 1e-12 * M * M) incoherentes.push({ tipo: 'error', codigo: 'area', panel: P.id, mensaje: `${P.id}: bruta − huecos = ${neta} ≠ neta del núcleo ${P.area}` });
    panels.push({ vertices, edges, area: areaBruta, centroid: centroide(vertices) });
    ext.push({ id: P.id, creases: P.creases.slice(), areaNeta: P.area, huecos, bordesCorte: P.bordesCorte, islas: P.islas });
  });
  if (incoherentes.length) throw new ErrorPanelModel('adaptador-incoherente', incoherentes);
  // creaseEdges: exactamente los del legacy (segmentos de la entrada, alias de sus anchor); el cierre de una crease cerrada se declara aparte
  const creaseEdges = [], cierres = [];
  (d.creases || []).forEach((cr, ci) => { const pts = cr.points.map((p) => p.anchor); for (let i = 0; i < pts.length - 1; i++) creaseEdges.push({ a: pts[i], b: pts[i + 1], creaseIdx: ci, segIdx: i }); if (cr.closed && pts.length > 2) cierres.push({ a: pts[pts.length - 1], b: pts[0], creaseIdx: ci, segIdx: pts.length - 1 }); });
  for (const c of R.creases) { if (c.colgante > 0) diag.push({ origen: 'adaptador', tipo: 'crease-colgante', crease: c.id, longitud: c.colgante }); if (c.separa === 0) diag.push({ origen: 'adaptador', tipo: 'crease-sin-efecto', crease: c.id }); }
  if (R.arreglo.islasDudosas) diag.push({ origen: 'nucleo', tipo: 'islas-dudosas', cuenta: R.arreglo.islasDudosas });
  const curvos = (() => { let n = 0; for (const p of [d.outerBoundary, ...(d.holes || []), ...(d.creases || []), ...(d.cutLines || []).map((k) => k.geom || k)]) for (const q of p.points) for (const k of ['left', 'right']) if (q[k] && (q[k].x !== q.anchor.x || q[k].y !== q.anchor.y)) { n++; break; } return n; })();
  const conversiones = [
    { tipo: 'cruce-aproximado', cuantos: cuenta.cruces.size, perdida: 'precisión', nota: 'vértices de cruce: topología exacta, coordenadas en double (≈ 1 ulp)' },
    { tipo: 'punto-ajustado-redondeado', cuantos: cuenta.exactos.size, perdida: 'precisión', nota: 'extremos ajustados exactos (homogéneos) redondeados a double' },
    { tipo: 'antenas-fuera-del-contorno', cuantos: cuenta.antenas, perdida: 'representación', nota: 'tramos de crease con el mismo panel a ambos lados: fuera de vertices/edges; siguen en f2a2.diagnosticos' },
    { tipo: 'huecos-solo-en-extension', cuantos: ext.reduce((s, p) => s + p.huecos.length, 0), perdida: 'representación', nota: 'v1 no representa huecos (KI-06): `area` es bruta; área neta y anillos en f2a2.paneles' },
    { tipo: 'curvas-a-polilinea', cuantos: curvos, perdida: curvos ? 'representación' : 'ninguna', nota: 'Bézier tratadas como ' + (op.curvas && op.curvas.muestras ? op.curvas.muestras + ' muestras' : 'cuerdas entre anclas') },
    { tipo: 'cierre-de-crease-fuera-de-creaseEdges', cuantos: cierres.length, perdida: 'representación', nota: 'como el legacy; el núcleo sí usa el cierre' },
  ];
  const f2a2 = { motor: MOTOR, contrato: 'PanelModel v1 + extensión f2a2', unidades: 'mm', ejeY: 'arriba', orientacion: 'CCW (huecos CW)', opciones: R.opciones, paneles: ext, cierres, conversiones, diagnosticos: diag, componentes: R.componentesPaneles, conservacion: R.conservacion };
  Object.defineProperty(f2a2, 'detalle', { value: { ...D, resumen: R }, enumerable: false });
  return { panels, creaseEdges, creases: d.creases || [], f2a2 };
}
