// Documentos de prueba DESECHABLES para el Nivel 0 (se abren en Illustrator con Archivo ▸ Abrir; no se guardan).
// Cada documento define: el SVG, el troquel esperado (DielineV1, mm), la maqueta equivalente (para autoprueba del analizador) y las expectativas.
// Supuestos a CONFIRMAR en Illustrator real (si no se cumplen, es una diferencia a registrar): 1 px del SVG = 1 pt; cada <g id="X"> de primer nivel se importa como capa "X";
// el orden de capas de doc.layers es de ARRIBA a ABAJO (la última <g> del SVG queda arriba).
import { FIXTURES, clone } from '../../tests/lib/fixtures.mjs'; import { layer, path, poly, group, compound } from '../../tests/lib/mock-illustrator.mjs';
export const MM_PER_PT = 0.352778; const PX = (mm) => +(mm / MM_PER_PT).toFixed(6);
const shift = (d, dx, dy) => { const o = clone(d); const mv = (b) => b.points.forEach((q) => ['anchor', 'left', 'right'].forEach((k) => { q[k].x += dx; q[k].y += dy; })); mv(o.outerBoundary); o.holes.forEach(mv); o.creases.forEach(mv); o.cutLines.forEach((c) => mv(c.geom)); return o; };
function dPath(b, sx = PX, closeIt = b.closed) { const P = b.points; let s = `M${sx(P[0].anchor.x)},${sx(P[0].anchor.y)}`; const n = closeIt ? P.length : P.length - 1;
  const isCurved = (p, q) => ['x', 'y'].some((a) => Math.abs(p.right[a] - p.anchor[a]) > 1e-4 || Math.abs(q.left[a] - q.anchor[a]) > 1e-4);
  for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % P.length]; const curved = isCurved(p, q);
    if (closeIt && i === P.length - 1 && !curved) break; // el cierre recto lo hace Z (sin punto duplicado)
    s += curved ? `C${sx(p.right.x)},${sx(p.right.y)} ${sx(q.left.x)},${sx(q.left.y)} ${sx(q.anchor.x)},${sx(q.anchor.y)}` : `L${sx(q.anchor.x)},${sx(q.anchor.y)}`; } return s + (closeIt ? 'Z' : ''); }
const bbox = (d) => { const a = [d.outerBoundary, ...d.holes, ...d.creases].flatMap((b) => b.points.map((p) => p.anchor)); return [Math.min(...a.map((p) => p.x)), Math.min(...a.map((p) => p.y)), Math.max(...a.map((p) => p.x)), Math.max(...a.map((p) => p.y))]; };
const svgWrap = (d, body, margin = 20) => { const [x0, y0, x1, y1] = bbox(d); const W = PX(x1 + margin), H = PX(y1 + margin); return { W, H, svg: `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${body}\n</svg>\n`, artboardMm: [+(W * MM_PER_PT).toFixed(3), +(H * MM_PER_PT).toFixed(3)] }; };
const STROKE_CUT = 'fill="none" stroke="#28aae1" stroke-width="0.75"', STROKE_CREASE = 'fill="none" stroke="#d3195b" stroke-width="0.5"';
const cutsG = (d) => `  <g id="Cuts">\n    <path ${STROKE_CUT} d="${dPath(d.outerBoundary)}"/>\n${d.holes.map((h) => `    <path ${STROKE_CUT} d="${dPath(h)}"/>`).join('\n')}\n  </g>`;
const creasesG = (d, wrap = (s) => s) => `  <g id="Creases">\n${wrap(d.creases.map((c) => `    <path ${STROKE_CREASE} d="${dPath(c)}"/>`).join('\n'))}\n  </g>`;
const artG = (d, id, color) => { const [x0, y0, x1, y1] = bbox(d); return `  <g id="${id}">\n    <rect x="${PX(x0)}" y="${PX(y0)}" width="${PX(x1 - x0)}" height="${PX(y1 - y0)}" fill="${color}"/>\n  </g>`; };
const mockPaths = (d) => ({ cuts: [path(d.outerBoundary), ...d.holes.map((h) => path(h))], creases: d.creases.map((c) => path(c)) });
const base = (id) => { const a = FIXTURES[id].build(); return clone(a); };
const simple = () => { const d = base('hueco-descentrado'); d.holes = [{ closed: true, points: [[30, 25], [40, 25], [40, 35], [30, 35]].map(([x, y]) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } })) }];
  const out = { ...d, outerBoundary: { closed: true, points: [[20, 20], [120, 20], [120, 80], [20, 80]].map(([x, y]) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } })) }, creases: [{ closed: false, points: [[70, 20], [70, 80]].map(([x, y]) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } })) }], holes: d.holes }; return out; };

export const DOCS = {};
{ // A — exportación REAL de Illustrator (capa Creases con un grupo de un nivel)
  const d = FIXTURES['real-illustrator-export'].build(); const { fs } = { fs: null };
  DOCS['N0-A'] = { archivo: 'N0-A_caja_real_export.svg', desc: 'Exportación real de Illustrator de la Caja Botánica (capas Cuts y Creases; Creases contiene un grupo de un nivel). Es el SVG original, sin tocar.', dieline: d, svgFile: 'tests/fixtures/real/caja-botanica-illustrator-export.svg',
    esLayers: ['Cuts', 'Creases'], maxGroupDepth: { Cuts: 0, Creases: 1 }, cutLayer: 'Cuts', creaseLayer: 'Creases',
    mock: () => ({ layers: [layer('Cuts', [path(d.outerBoundary)]), layer('Creases', [group(...d.creases.map((c) => path(c)))])], artboards: [{ name: 'Artboard 1', rect: [0, 1417.32, 1417.32, 0] }] }), artboardMm: [500, 500], art: null };
}
{ // B — caja simple con hueco, 1 crease y arte Front/Back por capas
  const d = simple(); const w = svgWrap(d, [artG(d, 'Back', '#ffd166'), artG(d, 'Front', '#06d6a0'), creasesG(d), cutsG(d)].join('\n'));
  DOCS['N0-B'] = { archivo: 'N0-B_caja_simple_arte.svg', desc: 'Caja 100×60 mm con un hueco de 10×10 mm y 1 crease; capas Cuts, Creases, Front y Back (arte por capas).', dieline: d, svg: w.svg, esLayers: ['Cuts', 'Creases', 'Front', 'Back'], maxGroupDepth: { Cuts: 0, Creases: 0, Front: 0, Back: 0 }, cutLayer: 'Cuts', creaseLayer: 'Creases', artboardMm: w.artboardMm,
    mock: () => ({ layers: [layer('Cuts', mockPaths(d).cuts), layer('Creases', mockPaths(d).creases), layer('Front', [poly([[0, 0], [1, 0], [1, 1]])]), layer('Back', [poly([[0, 0], [1, 0], [1, 1]])])], artboards: [{ name: 'Artboard 1', rect: [0, w.H, w.W, 0] }] }), art: { mode: 'layers', front: true, back: true } };
}
{ // C — grupos anidados en Creases (KI-10)
  const d = simple(); const w = svgWrap(d, [creasesG(d, (s) => `    <g id="externo">\n      <g id="interno">\n${s}\n      </g>\n    </g>`), cutsG(d)].join('\n'));
  DOCS['N0-C'] = { archivo: 'N0-C_grupos_anidados.svg', desc: 'Igual que B pero la capa Creases tiene un grupo dentro de otro grupo. KI-10 predice que el extractor FALLA ("Script error").', dieline: d, svg: w.svg, esLayers: ['Cuts', 'Creases'], maxGroupDepth: { Cuts: 0, Creases: 2 }, extractError: 'Script error', artboardMm: w.artboardMm,
    mock: () => ({ layers: [layer('Cuts', mockPaths(d).cuts), layer('Creases', [group(group(...mockPaths(d).creases))])], artboards: [{ name: 'Artboard 1', rect: [0, w.H, w.W, 0] }] }), art: null };
}
{ // D — capa señuelo "Studies" por encima de Cuts (KI-10, coincidencia por subcadena)
  const d = simple(); const decoy = `  <g id="Studies">\n    <path ${STROKE_CUT} d="M${PX(10)},${PX(10)}L${PX(30)},${PX(10)}L${PX(30)},${PX(30)}Z"/>\n  </g>`;
  const w = svgWrap(d, [creasesG(d), cutsG(d), decoy].join('\n'));
  DOCS['N0-D'] = { archivo: 'N0-D_capa_Studies.svg', desc: 'Igual que B pero con una capa "Studies" (contiene "die") ARRIBA de Cuts. KI-10 predice que el extractor toma "Studies" como capa de corte.', dieline: d, svg: w.svg, esLayers: ['Studies', 'Cuts', 'Creases'], maxGroupDepth: { Studies: 0, Cuts: 0, Creases: 0 }, cutLayer: 'Studies', creaseLayer: 'Creases', extractExpect: 'decoy', artboardMm: w.artboardMm,
    mock: () => ({ layers: [layer('Studies', [poly([[10, 10], [30, 10], [30, 30]])]), layer('Cuts', mockPaths(d).cuts), layer('Creases', mockPaths(d).creases)], artboards: [{ name: 'Artboard 1', rect: [0, w.H, w.W, 0] }] }), art: null };
}
{ // F — trazado compuesto (contorno + hueco en un solo <path>)
  const d = simple(); const one = `${dPath(d.outerBoundary)}${dPath(d.holes[0])}`; const w = svgWrap(d, [creasesG(d), `  <g id="Cuts">\n    <path ${STROKE_CUT} fill-rule="evenodd" d="${one}"/>\n  </g>`].join('\n'));
  DOCS['N0-F'] = { archivo: 'N0-F_trazado_compuesto.svg', desc: 'Contorno y hueco como UN trazado compuesto (evenodd) en Cuts. Comprueba CompoundPathItem en Illustrator real.', dieline: d, svg: w.svg, esLayers: ['Cuts', 'Creases'], maxGroupDepth: { Cuts: 0, Creases: 0 }, cutLayer: 'Cuts', creaseLayer: 'Creases', artboardMm: w.artboardMm,
    mock: () => ({ layers: [layer('Cuts', [compound(path(d.outerBoundary), path(d.holes[0]))]), layer('Creases', mockPaths(d).creases)], artboards: [{ name: 'Artboard 1', rect: [0, w.H, w.W, 0] }] }), art: null };
}
{ // G — curvas Bézier (esquinas redondeadas)
  const d = shift(FIXTURES['esquinas-redondeadas'].build(), 20, 20); const w = svgWrap(d, [creasesG(d), cutsG(d)].join('\n'));
  DOCS['N0-G'] = { archivo: 'N0-G_curvas.svg', desc: 'Rectángulo 120×60 mm con esquinas redondeadas (Bézier) y 1 crease. Comprueba manijas leftDirection/rightDirection en Illustrator real.', dieline: d, svg: w.svg, esLayers: ['Cuts', 'Creases'], maxGroupDepth: { Cuts: 0, Creases: 0 }, cutLayer: 'Cuts', creaseLayer: 'Creases', artboardMm: w.artboardMm,
    mock: () => ({ layers: [layer('Cuts', mockPaths(d).cuts), layer('Creases', mockPaths(d).creases)], artboards: [{ name: 'Artboard 1', rect: [0, w.H, w.W, 0] }] }), art: null };
}
