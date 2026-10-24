// Constantes visuales y de material del panel (A5.1). Valores idénticos a los de panel/main.js (referencia A1); solo cambia dónde viven.
// Las tolerancias geométricas (TOLERANCE_MM, GRAPH_EPS) NO están aquí: se moverán con la geometría (A6). CREASE_HINGE_SEGMENTS se declara y no se usa (igual que antes).
export const DEFAULT_THICKNESS_MM = 0.25;
export const MATERIAL_PRESETS = {
  white: { key:'white', label:'White board', shell:'#d9d5cc', shellBase:'#ece7dd', line:'#bbb3a5', hinge:'#e5dfd3' },
  kraft: { key:'kraft', label:'Kraft board', shell:'#b7aa87', shellBase:'#c7b996', line:'#8e7f5c', hinge:'#b49a6c' },
  gray:  { key:'gray',  label:'Gray board',  shell:'#aaa7a0', shellBase:'#bab7b0', line:'#807b74', hinge:'#9c978f' }
};
export const CREASE_HINGE_RADIUS_FACTOR = 0.46;
export const CREASE_HINGE_MIN_RADIUS = 0.45;
export const CREASE_HINGE_SEGMENTS = 10;
export const CREASE_HINGE_SHOW_THRESHOLD_DEG = 2.0;
export const FOLD_BRIDGE_TOP_Z = 0.003;
export const FOLD_BRIDGE_BOTTOM_Z = 0.003;
export const CREASE_LINE_Z_OFFSET = 0.18;
export const ART_TOP_OFFSET = 0.08;
export const ART_BOTTOM_OFFSET = 0.08;
