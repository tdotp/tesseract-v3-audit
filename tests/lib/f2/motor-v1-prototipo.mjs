// F2A-3 (preparación) — PROTOTIPO DE PRUEBAS, no código de producto: fachada con la forma GeometryEngine v1 sobre el motor experimental,
// para caracterizar la alternativa recomendada en docs/fase2/F2A3_PROPUESTA.md (§4, alternativa B) sin tocar src/ ni experimental/.
// buildPanels calcula una sola vez, sobre el arreglo exacto, las adyacencias y el árbol de cada modelo, y las adjunta al arreglo `panels`
// con una clave Symbol NO enumerable (viaja con el objeto, no hay estado del motor ni global). buildAdjacency(panels, creaseEdges) y
// buildFoldTree(panels, adjacency, base) mantienen su firma v1 y comprueban la IDENTIDAD de los argumentos: si no son los del modelo
// (p. ej. una copia del arreglo), lanzan un error explícito en lugar de recalcular algo distinto.
import { adaptarPanelModel, construirAdyacencias, construirArbolPlegado, baseDefecto, ErrorPanelModel } from '../../../experimental/plegado/index.js';

export const MODELO_F2A3 = Symbol('tesseract.f2a3.modelo');
const ajeno = (que) => new ErrorPanelModel('modelo-ajeno', [{ tipo: 'error', codigo: 'modelo-ajeno', mensaje: `${que}: los argumentos no son los objetos que devolvió buildPanels de este motor` }]);

export function crearMotorExperimentalPrototipo({ eps = null } = {}) {
  return Object.freeze({
    id: 'experimental-f2a2', contract: 1,
    validate: (d) => ({ problems: [] }), // decisión pendiente (F2A3_PROPUESTA §11): los avisos del validador legacy frente a los diagnósticos f2a2
    buildPanels(d) {
      const m = adaptarPanelModel(d, { eps }); const A = construirAdyacencias(m);
      Object.defineProperty(m.panels, MODELO_F2A3, { value: Object.freeze({ modelo: m, ady: A, creaseEdges: m.creaseEdges }), enumerable: false });
      return m;
    },
    buildAdjacency(panels, creaseEdges) { const x = panels && panels[MODELO_F2A3]; if (!x || x.creaseEdges !== creaseEdges) throw ajeno('buildAdjacency'); return x.ady.adyacencias; },
    buildFoldTree(panels, adjacency, baseIndex) { const x = panels && panels[MODELO_F2A3]; if (!x || x.ady.adyacencias !== adjacency) throw ajeno('buildFoldTree'); return construirArbolPlegado(x.modelo, x.ady, baseIndex).aristas; },
    defaultBaseIndex: (m) => baseDefecto(m),
    // fuera del contrato v1: diagnósticos completos (uniones no plegables, componentes, ciclos) para una interfaz futura
    diagnosticos(panels, baseIndex) { const x = panels && panels[MODELO_F2A3]; if (!x) throw ajeno('diagnosticos'); const T = construirArbolPlegado(x.modelo, x.ady, baseIndex); return [...x.modelo.f2a2.diagnosticos, ...x.ady.diagnosticos, ...T.diagnosticos]; },
  });
}
