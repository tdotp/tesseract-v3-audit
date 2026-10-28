// F2A-3 (preparación) — Ejecuta los CONSUMIDORES REALES de producción (src/scene, src/fold, src/export; sin modificarlos) sobre un
// PanelModel, sus adyacencias y su árbol, en Node con three.js r132 real (entorno de A8: tests/lib/a8.mjs setupEnv). Solo se sustituyen
// por funciones vacías las dependencias de DOM o arte (etiquetas, arte, registro). Sirve para comprobar que ningún consumidor muta los
// datos del motor: se le pasan objetos congelados en profundidad (los módulos ES son estrictos ⇒ escribir en ellos lanza TypeError).
import { setupEnv } from '../a8.mjs';

export function congelar(o, vistos = new Set()) {
  if (!o || typeof o !== 'object' || vistos.has(o)) return o; vistos.add(o);
  for (const k of Reflect.ownKeys(o)) { const d = Object.getOwnPropertyDescriptor(o, k); if (d && 'value' in d) congelar(d.value, vistos); }
  return Object.freeze(o);
}
// Instantánea estructural (enumerable) para comparar antes/después además de la congelación
export const instantanea = (x) => JSON.stringify(x);

// Recorre el grafo de objetos y devuelve, por cada objeto alcanzado desde más de una ruta, las rutas (mapa de alias)
export function mapaDeAlias(raiz, nombre = '$', max = 200000) {
  const rutas = new Map(); let n = 0;
  (function ir(o, ruta) { if (!o || typeof o !== 'object' || ++n > max) return; const r = rutas.get(o); if (r) { r.push(ruta); return; } rutas.set(o, [ruta]);
    for (const k of Object.keys(o)) ir(o[k], Array.isArray(o) ? ruta + '[' + k + ']' : ruta + '.' + k); })(raiz, nombre);
  return [...rutas.entries()].filter(([, r]) => r.length > 1).map(([o, r]) => ({ tipo: Array.isArray(o) ? 'array' : 'objeto', rutas: r }));
}

let modulos = null;
async function cargar() {
  if (modulos) return modulos; setupEnv();
  const [{ createAppState }, { createMaterials }, { createFoldAngles }, { createCreaseVisuals }, { createPanelMeshes }, { createFolding }, { createGlbScene }, { createGlbImage }, { createGlbBuilder }] = await Promise.all([
    import('../../../src/app/state.js'), import('../../../src/scene/materials.js'), import('../../../src/fold/angles.js'), import('../../../src/scene/crease-visuals.js'),
    import('../../../src/scene/panel-meshes.js'), import('../../../src/fold/folding.js'), import('../../../src/export/glb-scene.js'), import('../../../src/export/glb-image.js'), import('../../../src/export/glb-builder.js')]);
  return (modulos = { createAppState, createMaterials, createFoldAngles, createCreaseVisuals, createPanelMeshes, createFolding, createGlbScene, createGlbImage, createGlbBuilder });
}

// Mismo flujo que build3D → buildFoldUI → applyFolding → exportGLB de la interfaz, sin DOM. `espia` (opcional) se llama como etiqueta de panel.
export async function ejecutarConsumidores({ modelo, adyacencias, arbol, base, angulo = 60, espia = null }) {
  const X = await cargar(); const S = X.createAppState(); S.scene3d = new THREE.Scene();
  const mat = X.createMaterials(S); const ang = X.createFoldAngles(S); const nada = () => {};
  const cv = X.createCreaseVisuals(S, { getFoldHingeHex: mat.getFoldHingeHex, signedDisplayAngle: ang.signedDisplayAngle, updateSelectedCreaseVisuals: nada });
  const pm = X.createPanelMeshes(S, { log: nada, getPanelShellHex: mat.getPanelShellHex, getEdgeLineHex: mat.getEdgeLineHex, applyArtworkToScene: nada, disposeLabelCache: nada, disposeCreaseVisuals: cv.disposeCreaseVisuals });
  const etiqueta = () => { if (espia) espia(S); return new THREE.Object3D(); };
  const fo = X.createFolding(S, { makePanelLabelSprite: etiqueta, refreshPanelMaterials: mat.refreshPanelMaterials, rebuildCreaseVisuals: cv.rebuildCreaseVisuals });
  S.currentBasePanelIndex = base; S.currentPanelData = modelo; const construidos = pm.build3DFromPanels(modelo, null);
  S.currentAdjEdges = adyacencias; S.foldTree = arbol; S.foldSigns = arbol.map((e) => e.sign || 1); S.foldAngles = arbol.map(() => angulo); S.foldCenter = S.foldData ? S.foldData.center : { x: 0, y: 0 };
  fo.applyFolding();
  const img = X.createGlbImage({ log: nada }); const gs = X.createGlbScene(S); const gb = X.createGlbBuilder({ buildExportSceneMeshes: gs.buildExportSceneMeshes, textureToImageBytes: img.textureToImageBytes });
  const blob = gb.buildGLBBlobFromCurrentView(); const bytes = blob ? (await blob.arrayBuffer()).byteLength : 0;
  return { mallas: construidos, puentes: (S.creaseVisuals || []).length, glbBytes: bytes };
}
