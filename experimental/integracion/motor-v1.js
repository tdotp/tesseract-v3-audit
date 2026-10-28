// F2A-3 · I-1 — Fachada GeometryEngine v1 del motor EXPERIMENTAL (núcleo exacto F2A-1 + adaptador y árbol F2A-2/2R/2P). Fuera de src/:
// solo la usa el selector del bundle experimental. Contrato: docs/fase2/F2A3_HANDOFF.md §8.1 y condición C-01 (alternativa B).
//   · buildPanels(d) adapta el troquel y calcula UNA vez, sobre el arreglo exacto, las adyacencias del modelo; las adjunta al arreglo
//     `panels` con una clave Symbol PRIVADA de este módulo (no se exporta), no enumerable, no configurable: viajan con el objeto, sin
//     estado del motor ni global (I1). El árbol NO se calcula aquí: solo en buildFoldTree y solo para la base pedida.
//   · buildAdjacency(panels, creaseEdges) y buildFoldTree(panels, adjacency, base) conservan la firma v1 y comprueban la IDENTIDAD de
//     sus argumentos (el arreglo `panels` devuelto, su `creaseEdges` y su arreglo de adyacencias). Copias, mezclas de dos construcciones
//     (aunque sean del mismo documento), modelos del legacy u objetos de otro documento ⇒ ErrorPanelModel('modelo-ajeno'): nunca un
//     resultado recalculado en silencio.
//   · Las salidas son de SOLO LECTURA (D-F2A2P-2): pueden compartir arreglos internos. `congelar: true` las congela en profundidad
//     (modo de depuración, D-F2A3-7).
//   · validate es el del legacy, INYECTADO (este módulo no importa src/). Las excepciones del núcleo se propagan sin envolver (I7).
// `dependencias` sustituye funciones del adaptador SOLO en pruebas (inyección de fallos por etapa, C-02); el bundle no la usa.
import { adaptarPanelModel, construirAdyacencias, construirArbolPlegado, baseDefecto, ErrorPanelModel, MOTOR } from '../plegado/index.js';

export const CONTRATO_MOTOR = 1;
export const ID_MOTOR_EXPERIMENTAL = MOTOR;
export const EPS_EXPERIMENTAL = 0.05; // mm; parámetro experimental declarado (DP-3, D-F2A3-5): ajuste de extremos de crease, nunca del contorno
const MODELO = Symbol('tesseract.f2a3.modelo'); // PRIVADO: no se exporta (C-01)
const DEPENDENCIAS = Object.freeze({ adaptarPanelModel, construirAdyacencias, construirArbolPlegado, baseDefecto });

const error = (codigo, etapa, mensaje, extra) => new ErrorPanelModel(codigo, [{ tipo: 'error', codigo, etapa, mensaje: `${etapa}: ${mensaje}`, ...extra }]);
const ajeno = (etapa, mensaje) => error('modelo-ajeno', etapa, mensaje);
// Registro adjunto a un arreglo `panels` de este módulo; propiedad PROPIA (un objeto que lo herede por prototipo no cuenta) y con la referencia de vuelta intacta
function registroDe(panels) {
  if (!panels || typeof panels !== 'object' || !Object.prototype.hasOwnProperty.call(panels, MODELO)) return null;
  const r = panels[MODELO]; return r && r.panels === panels ? r : null;
}
// ¿`panels` es un arreglo devuelto por buildPanels de un motor de este módulo? (predicado exportado; el símbolo sigue privado)
export const esModeloExperimental = (panels) => registroDe(panels) !== null;

export function congelarProfundo(o, vistos = new Set()) {
  if (!o || typeof o !== 'object' || vistos.has(o)) return o; vistos.add(o);
  for (const k of Reflect.ownKeys(o)) { const d = Object.getOwnPropertyDescriptor(o, k); if (d && 'value' in d) congelarProfundo(d.value, vistos); }
  return Object.freeze(o);
}

// Forma mínima de lo que devuelven el adaptador y construirAdyacencias (también con dependencias inyectadas): sin ella no se adjunta nada
function comprobarModelo(m) { if (!m || !Array.isArray(m.panels) || !Array.isArray(m.creaseEdges)) throw error('adaptador-incoherente', 'buildPanels', 'el adaptador no devolvió {panels[], creaseEdges[]}'); }
function comprobarAdyacencias(m, A) {
  const n = m.panels.length;
  if (!A || !Array.isArray(A.adyacencias)) throw error('adaptador-incoherente', 'buildPanels', 'construirAdyacencias no devolvió {adyacencias[]}');
  for (const a of A.adyacencias) if (!a || !Number.isInteger(a.panelA) || !Number.isInteger(a.panelB) || a.panelA < 0 || a.panelB < 0 || a.panelA >= n || a.panelB >= n) throw error('adaptador-incoherente', 'buildPanels', 'adyacencia con un panel fuera de 0…' + (n - 1));
}

export function createExperimentalEngine({ log = null, eps = EPS_EXPERIMENTAL, validate, congelar = false, dependencias = null } = {}) {
  if (typeof validate !== 'function') throw new TypeError('createExperimentalEngine: falta `validate` (el validador del legacy, inyectado)');
  if (eps !== null && !(typeof eps === 'number' && Number.isFinite(eps) && eps >= 0)) throw new TypeError('createExperimentalEngine: `eps` debe ser null o un número ≥ 0 (mm)');
  const D = dependencias ? Object.freeze({ ...DEPENDENCIAS, ...dependencias }) : DEPENDENCIAS;
  const escribir = typeof log === 'function' ? log : () => {};
  const exigir = (panels, etapa) => { const r = registroDe(panels); if (!r) throw ajeno(etapa, '`panels` no es el arreglo que devolvió buildPanels del motor experimental (¿copia, modelo legacy u otro objeto?)'); return r; };
  const informe = (panels, adjacency, baseIndex, etapa) => {
    const r = exigir(panels, etapa); if (adjacency !== r.adyacencias) throw ajeno(etapa, 'las adyacencias no son las de la MISMA construcción que `panels`');
    const T = D.construirArbolPlegado(r.modelo, r.ady, baseIndex); // solo la base pedida; base inválida ⇒ ErrorPanelModel('base-invalida')
    if (!T || !Array.isArray(T.aristas)) throw error('adaptador-incoherente', etapa, 'construirArbolPlegado no devolvió {aristas[]}');
    if (congelar) congelarProfundo(T);
    return { r, T };
  };
  return Object.freeze({
    id: ID_MOTOR_EXPERIMENTAL, contract: CONTRATO_MOTOR,
    validate, // D-F2A3-4: el del legacy (paridad de interfaz); los diagnósticos experimentales van aparte (diagnosticos)
    buildPanels(d) {
      const m = D.adaptarPanelModel(d, { eps }); comprobarModelo(m); const A = D.construirAdyacencias(m); comprobarAdyacencias(m, A);
      const r = Object.freeze({ modelo: m, ady: A, panels: m.panels, creaseEdges: m.creaseEdges, adyacencias: A.adyacencias });
      Object.defineProperty(m.panels, MODELO, { value: r, enumerable: false, writable: false, configurable: false });
      if (congelar) congelarProfundo(r);
      escribir(`=== buildPanels (${ID_MOTOR_EXPERIMENTAL}, ε=${eps === null ? 'sin ajuste' : eps + ' mm'}) === panels=${m.panels.length}`);
      return m;
    },
    buildAdjacency(panels, creaseEdges) {
      const r = exigir(panels, 'buildAdjacency'); if (creaseEdges !== r.creaseEdges) throw ajeno('buildAdjacency', '`creaseEdges` no pertenece a la MISMA construcción que `panels`');
      escribir('Adjacency edges: ' + r.adyacencias.length + ' (experimental exacto)');
      return r.adyacencias;
    },
    buildFoldTree(panels, adjacency, baseIndex) {
      const { T } = informe(panels, adjacency, baseIndex, 'buildFoldTree');
      escribir('Fold tree edges: ' + T.aristas.length + ' (base=P' + baseIndex + ', experimental)');
      return T.aristas;
    },
    defaultBaseIndex(m) {
      const r = exigir(m && m.panels, 'defaultBaseIndex'); if (m.creaseEdges !== r.creaseEdges) throw ajeno('defaultBaseIndex', 'el modelo mezcla `panels` y `creaseEdges` de construcciones distintas');
      return D.baseDefecto(r.modelo);
    },
    // Fuera de v1: diagnósticos completos (uniones no plegables o ambiguas, componentes desconectadas, ciclos) para la base pedida
    diagnosticos(panels, baseIndex) {
      const r = exigir(panels, 'diagnosticos'); const { T } = informe(panels, r.adyacencias, baseIndex, 'diagnosticos');
      return [...(r.modelo.f2a2 ? r.modelo.f2a2.diagnosticos : []), ...(r.ady.diagnosticos || []), ...(T.diagnosticos || [])];
    },
  });
}
