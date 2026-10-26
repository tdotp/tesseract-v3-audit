// A7.1 — Estado de dominio compartido de la aplicación (docs/fase1/A7_PROPUESTA.md §4.1, D-A7-2).
// Los 26 campos que antes eran variables de la clausura de main.js, con los MISMOS valores iniciales. El objeto está sellado: una asignación a un campo
// que no existe lanza TypeError (módulos en modo estricto) en vez de crear estado nuevo en silencio. Sin THREE ni DOM: solo referencias que guarda y comparte.
// Se quedan en main.js lastData, problems y los widgets del DOM; labelCache y creaseLinesGroup son privados de su módulo.
import { DEFAULT_THICKNESS_MM } from '../config/look.js';

export function createAppState(){
  return Object.seal({
    /* material */
    currentThicknessMm: DEFAULT_THICKNESS_MM,
    currentMaterialPreset: 'white',
    /* motor (salidas de GeometryEngine; mismas referencias, sin copiar) */
    currentPanelData: null,
    currentAdjEdges: null,
    /* plegado */
    currentBasePanelIndex: 0,
    baseSelectionConfirmed: false,
    foldTree: [],
    foldSigns: [],
    foldAngles: [],
    foldCenter: {x:0,y:0},
    selectedFoldEdgeIdx: -1,
    /* escena de plegado */
    foldRoot: null,
    panelGroupMap: [],
    panelLabelSprites: [],
    /* visor */
    renderer3d: null,
    scene3d: null,
    camera3d: null,
    raycaster3d: null,
    pointer3d: null,
    orbitState: null,
    /* malla de paneles */
    panelMeshes: [],
    foldData: null,
    /* pliegues visuales */
    creasePickables: [],
    creaseVisuals: [],
    foldBridgeGroup: null,
    /* arte */
    currentArtState: null
  });
}
