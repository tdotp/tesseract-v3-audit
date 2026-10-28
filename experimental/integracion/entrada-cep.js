// F2A-3 · I-3 — Módulo que el bundle EXPERIMENTAL usa EN LUGAR de src/core/engine.js: tools/build/build-experimental.mjs resuelve aquí
// solo el import './core/engine.js' de src/main.js (src/ no cambia). Exporta createLegacyEngine con la misma firma y devuelve el selector.
// Junto con la interfaz experimental (interfaz-cep.js, Entrega 2), es la única pieza de experimental/integracion/ que toca el entorno del navegador:
//   · la sombra se programa con setTimeout(0): el legacy termina y la interfaz sigue antes de que el experimental empiece;
//   · publica un punto de control de solo lectura, NO enumerable, `__tessMotorExperimental`, para activar o desactivar el modo activo
//     desde la consola de depuración de CEP. El modo NO vive ahí (vive en la clausura del selector) ni se guarda en ningún almacenamiento:
//     al recargar el panel vuelve a sombra. En la Entrega 2 la activación también está en la barra del panel (interfaz-cep.js).
//     Procedimiento: docs/fase2/F2A3_ENTREGA2_INFORME.md.
import { createLegacyEngine as crearSelector, CONFIRMACION_ACTIVO, GEOMETRY_ENGINE_CONTRACT } from './selector.js';

export { GEOMETRY_ENGINE_CONTRACT };
export const CONTROL_GLOBAL = '__tessMotorExperimental';
export const AYUDA = `Tesseract V3 (experimental) · motor de geometría. Por defecto: SOMBRA (la interfaz usa el legacy).
  ${CONTROL_GLOBAL}.modo()                                → 'sombra' | 'activo'
  ${CONTROL_GLOBAL}.activar('${CONFIRMACION_ACTIVO}')      → modo ACTIVO (modelos nuevos con el experimental; pulse «Continue to 3D»)
  ${CONTROL_GLOBAL}.desactivar()                          → vuelve a SOMBRA
  ${CONTROL_GLOBAL}.registro()                            → comparaciones, fallbacks y fallos anotados
  ${CONTROL_GLOBAL}.tiempos()                             → milisegundos de cada operación del motor (modo y origen)
  ${CONTROL_GLOBAL}.congelarSalidas(true | false)         → depuración: congela en profundidad los modelos experimentales nuevos
  ${CONTROL_GLOBAL}.simularFallo('buildFoldTree' | 'buildPanels' | null) → depuración: hace fallar al experimental para probar la recuperación
Nada es persistente: al recargar el panel vuelve a SOMBRA.`;

export function createLegacyEngine(options) {
  const motor = crearSelector({ ...(options || {}), programar: (f) => { setTimeout(f, 0); }, reloj: () => performance.now(), avisarCambioDeOrigen: false }); // la interfaz experimental reinicia la base (KI-30)
  const control = Object.freeze({
    selector: motor.id, ayuda: () => AYUDA, modo: () => motor.modo(),
    activar: (confirmacion) => motor.cambiarModo('activo', { confirmacion }), desactivar: () => motor.cambiarModo('sombra'),
    registro: () => motor.registro(), origenDelModelo: (panelData) => motor.origenDelModelo(panelData), congelarSalidas: (v) => motor.congelarSalidas(v),
    simularFallo: (etapa) => motor.simularFallo(etapa === undefined ? null : etapa), diagnosticos: (panelData, base) => motor.diagnosticos(panelData, base), tiempos: () => motor.tiempos(),
  });
  Object.defineProperty(globalThis, CONTROL_GLOBAL, { value: control, enumerable: false, writable: false, configurable: true });
  return motor;
}
