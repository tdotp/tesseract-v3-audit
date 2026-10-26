// Contrato GeometryEngine v1 (A6.6, D-A6-1) con UNA sola implementación: 'legacy', el motor geométrico vigente sin cambios.
// No hay interruptor ni selector de motor (el candidato web es 2B). Un motor es un objeto congelado; cada operación es síncrona,
// no toca DOM, THREE ni el estado de la aplicación y propaga sus excepciones sin envolverlas (docs/fase1/A6_PROPUESTA.md §5).
//
// Tipos (mm, eje Y hacia arriba como en Illustrator):
//   Point          {x, y}
//   PathPoint      {anchor: Point, left: Point, right: Point}       left/right = manejadores Bézier (el legacy los ignora: KI-07)
//   Path           {closed, points: PathPoint[]}
//   Dieline        {version, units:'mm', thickness_mm, outerBoundary: Path, holes: Path[], cutLines: {geom: Path}[], creases: Path[], meta, error?}
//   Problem        {id:'P1'…, type, dist, point}                    point ES el anchor de la entrada
//   Panel          {vertices: Point[] (CCW), edges: {u, v, type:'boundary'|'crease'}[], area (≥ 0), centroid (ponderado por área)}
//   CreaseEdge     {a, b, creaseIdx, segIdx}                         a/b SON los anchor de la entrada
//   PanelModel     {panels: Panel[], creaseEdges: CreaseEdge[], creases: Path[]}
//   AdjacencyEdge  {panelA, panelB, crease: {a, b}, creaseIdx}       creaseIdx −1 = sin crease de origen
//   FoldEdge       {parent, child, crease: {a, b}, sign: 1 | -1}      pivote en crease.a; sign acoplado a la orientación a→b
//
// Invariantes (I1–I10): sin DOM/THREE/estado · determinista (incluido el orden) · no muta la entrada · la salida PUEDE compartir objetos con la
// entrada y entre etapas (solo lectura) · identidad de panel = índice; de pliegue = índice en el árbol · unidades mm y tolerancias absolutas (KI-22) ·
// excepciones sin envolver · log: mismo texto y orden, síncrono, por el sink · 0 paneles no es un error.
//
// Operaciones:
//   validate(d: Dieline) → {problems: Problem[]}
//   buildPanels(d: Dieline) → PanelModel
//   buildAdjacency(panels: Panel[], creaseEdges: CreaseEdge[]) → AdjacencyEdge[]
//   buildFoldTree(panels: Panel[], adjacency: AdjacencyEdge[], baseIndex: number) → FoldEdge[]
//   defaultBaseIndex(m: PanelModel) → number
import { setLogSink } from './legacy/log.js';
import { validateDieline } from './legacy/validate.js';
import { buildPanels } from './legacy/panels.js';
import { buildAdjacency } from './legacy/adjacency.js';
import { buildFoldTree, getDefaultBaseIndex } from './legacy/fold-tree.js';

export const GEOMETRY_ENGINE_CONTRACT = 1;

// El adaptador NO envuelve: cada operación ES la función original (mismo cuerpo, misma aridad, mismas excepciones).
// options.log recibe cada mensaje del motor (el sink es único: el último createLegacyEngine manda).
export function createLegacyEngine(options){
  setLogSink(options && options.log);
  return Object.freeze({
    id: 'legacy',
    contract: GEOMETRY_ENGINE_CONTRACT,
    validate: validateDieline,
    buildPanels: buildPanels,
    buildAdjacency: buildAdjacency,
    buildFoldTree: buildFoldTree,
    defaultBaseIndex: getDefaultBaseIndex
  });
}
