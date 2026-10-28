// F2A-3 · I-6 — Sustituye a './ui/fold-controls.js' SOLO en el bundle experimental (tools/build/build-experimental.mjs). Crea la fábrica REAL
// de src/ui/fold-controls.js (sin cambiar su texto) con el motor intermediario de la interfaz experimental (interfaz-cep.js): cambio de base
// transaccional y KI-30 sin tocar src/.
import { createFoldControls as crearControlesReales } from '../../src/ui/fold-controls.js';
import { interfazDe } from './interfaz-cep.js';

export function createFoldControls(S, deps) {
  const ui = interfazDe(S, deps.geometryEngine);
  const api = crearControlesReales(S, { ...deps, geometryEngine: ui.motor });
  ui.conectarPlegado(api, deps);
  return api;
}
