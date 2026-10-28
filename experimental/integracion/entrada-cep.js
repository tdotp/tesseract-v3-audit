// F2A-3 · I-3 — Módulo que el bundle EXPERIMENTAL usa EN LUGAR de src/core/engine.js: tools/build/build-experimental.mjs resuelve aquí
// solo el import './core/engine.js' de src/main.js (src/ no cambia). Exporta createLegacyEngine con la misma firma y devuelve el selector.
// Es la ÚNICA pieza de experimental/integracion/ que toca el entorno del navegador:
//   · la sombra se programa con setTimeout(0): el legacy termina y la interfaz sigue antes de que el experimental empiece;
//   · publica un punto de control de solo lectura, NO enumerable, `__tessMotorExperimental`, para activar o desactivar el modo activo
//     desde la consola de depuración de CEP. El modo NO vive ahí (vive en la clausura del selector) ni se guarda en ningún almacenamiento:
//     al recargar el panel vuelve a sombra. Procedimiento: docs/fase2/F2A3_ENTREGA1_INFORME.md §6.
import { createLegacyEngine as crearSelector, CONFIRMACION_ACTIVO, GEOMETRY_ENGINE_CONTRACT } from './selector.js';

export { GEOMETRY_ENGINE_CONTRACT };
export const CONTROL_GLOBAL = '__tessMotorExperimental';
export const AYUDA = `Tesseract V3 (experimental) · motor de geometría. Por defecto: SOMBRA (la interfaz usa el legacy).
  ${CONTROL_GLOBAL}.modo()                                → 'sombra' | 'activo'
  ${CONTROL_GLOBAL}.activar('${CONFIRMACION_ACTIVO}')      → modo ACTIVO (modelos nuevos con el experimental; pulse «Continue to 3D»)
  ${CONTROL_GLOBAL}.desactivar()                          → vuelve a SOMBRA
  ${CONTROL_GLOBAL}.registro()                            → comparaciones, fallbacks y fallos anotados
  ${CONTROL_GLOBAL}.congelarSalidas(true | false)         → depuración: congela en profundidad los modelos experimentales nuevos
Nada es persistente: al recargar el panel vuelve a SOMBRA.`;

export function createLegacyEngine(options) {
  const motor = crearSelector({ ...(options || {}), programar: (f) => { setTimeout(f, 0); } });
  const control = Object.freeze({
    selector: motor.id, ayuda: () => AYUDA, modo: () => motor.modo(),
    activar: (confirmacion) => motor.cambiarModo('activo', { confirmacion }), desactivar: () => motor.cambiarModo('sombra'),
    registro: () => motor.registro(), origenDelModelo: (panelData) => motor.origenDelModelo(panelData), congelarSalidas: (v) => motor.congelarSalidas(v),
  });
  Object.defineProperty(globalThis, CONTROL_GLOBAL, { value: control, enumerable: false, writable: false, configurable: true });
  return motor;
}
