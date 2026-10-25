// A6 — Transcripción completa del log del motor geométrico, etapa por etapa, para un troquel (golden de logs, D-A6-6).
// Recorre las mismas etapas y bases que analyze(): buildPanels → buildAdjacency → buildFoldTree (cada base) → validación.
import { clone } from './fixtures.mjs';

export function trace(L, dieline) {
  const { api } = L; const d = clone(dieline); const take = () => { const l = api.logs.slice(); api.resetLogs(); return l; };
  api.resetLogs();
  const panelData = api.buildPanels(d); const out = { buildPanels: take() };
  const panels = panelData.panels;
  const adj = api.buildAdjacency(panels, panelData.creaseEdges); out.buildAdjacency = take();
  const base = panels.length ? api.getDefaultBaseIndex(panelData) : -1; out.getDefaultBaseIndex = take();
  const bases = panels.length <= 12 ? panels.map((_, i) => i) : [...new Set([0, base, panels.length - 1])];
  out.buildFoldTree = {}; for (const b of bases) { api.buildFoldTree(panels, adj, b); out.buildFoldTree['base' + b] = take(); }
  api.validateGeometry(d); out.validate = take();
  return JSON.parse(JSON.stringify(out));
}
