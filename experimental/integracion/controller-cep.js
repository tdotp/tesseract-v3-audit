// F2A-3 · I-6 — Sustituye a './ui/controller.js' SOLO en el bundle experimental (tools/build/build-experimental.mjs). Crea el controlador
// REAL de src/ui/controller.js (sin cambiar su texto) con el motor intermediario de la interfaz experimental (interfaz-cep.js), que reinicia
// la base al cambiar de documento o de motor (KI-30) y anuncia en la barra el motor de cada construcción.
import { createController as crearControladorReal } from '../../src/ui/controller.js';
import { interfazDe } from './interfaz-cep.js';

export function createController(S, deps) {
  const ui = interfazDe(S, deps.geometryEngine);
  ui.conectarControlador(deps);
  return crearControladorReal(S, { ...deps, geometryEngine: ui.motor });
}
