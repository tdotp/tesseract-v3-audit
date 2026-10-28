// F2A-1 — Generador de troqueles sintéticos aleatorios DEGENERADOS (rejilla gruesa: solapes colineales, T exactas, cruces, creases sobre
// el corte y colgantes, más algunas oblicuas). Determinista dada la función r() de números aleatorios.
const pt = (x, y) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } }); const path_ = (ps, closed) => ({ closed, points: ps.map(([x, y]) => pt(x, y)) });
export const generador = (semilla) => () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
export function sintetico(r) {
  const g = 10, W = 8, Hh = 6; const L = r() < 0.4;
  const outer = L ? [[0, 0], [W, 0], [W, 3], [4, 3], [4, Hh], [0, Hh]] : [[0, 0], [W, 0], [W, Hh], [0, Hh]];
  const creases = []; const nc = 2 + Math.floor(r() * 7);
  for (let k = 0; k < nc; k++) {
    const t = r(); let a, b;
    if (t < 0.4) { const y = Math.floor(r() * (Hh + 1)), x0 = Math.floor(r() * W), x1 = x0 + 1 + Math.floor(r() * (W - x0)); a = [x0, y]; b = [x1, y]; }
    else if (t < 0.8) { const x = Math.floor(r() * (W + 1)), y0 = Math.floor(r() * Hh), y1 = y0 + 1 + Math.floor(r() * (Hh - y0)); a = [x, y0]; b = [x, y1]; }
    else if (t < 0.92) { const x0 = Math.floor(r() * W), y0 = Math.floor(r() * Hh), d = 1 + Math.floor(r() * 3); a = [x0, y0]; b = [x0 + d, y0 + d]; }
    else { a = [r() * W, r() * Hh]; b = [r() * W, r() * Hh]; }
    creases.push(path_([a, b].map(([x, y]) => [x * g, y * g]), false));
  }
  return { version: '1.0', units: 'mm', outerBoundary: path_(outer.map(([x, y]) => [x * g, y * g]), true), holes: [], cutLines: [], creases };
}

