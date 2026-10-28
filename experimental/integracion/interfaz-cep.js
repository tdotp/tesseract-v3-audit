// F2A-3 · I-6 — Interfaz del motor experimental, SOLO en el bundle experimental (src/ no cambia: el bundle normal sigue en dist-a9).
// tools/build/build-experimental.mjs sustituye, solo para src/main.js, './ui/fold-controls.js' y './ui/controller.js' por envoltorios
// (fold-controls-cep.js, controller-cep.js) que crean las fábricas REALES con un motor intermediario (`motor`) en lugar del selector. El
// intermediario tiene la forma GeometryEngine v1, recibe el estado S de la aplicación y añade, sin tocar el código de la interfaz:
//   · KI-30: cuando cambian el documento o el motor de origen respecto a la construcción anterior, la base vuelve a la del motor en uso
//     (S.currentBasePanelIndex = −1 ⇒ la interfaz llama a defaultBaseIndex). La PRIMERA construcción no cambia (base inicial de siempre).
//   · Cambio de base TRANSACCIONAL: si buildFoldTree falla para un modelo que ya tenía un árbol válido, se restaura la base anterior y se
//     devuelve el último árbol válido; después se restauran los ángulos y la crease seleccionada. Sin resultados parciales.
//   · Si falla el PRIMER árbol de una construcción, se vacía el estado de plegado (ningún árbol de otro modelo queda aplicado) y se propaga
//     el error: la interfaz muestra «3D error: …» y esta barra explica la detención.
//   · Barra permanente (#tess-exp-motor, bajo la línea de estado): modo SOMBRA / ACTIVO, motor que produjo la construcción actual,
//     activación con confirmación en dos pasos y desactivación, mensajes de fallback o detención y diagnósticos geométricos legibles.
// Las mezclas entre modelos legacy y experimentales las impide el selector (despacho por origen; modelo-ajeno).
import { CONFIRMACION_ACTIVO } from './selector.js';

const INTERFACES = new WeakMap(); // S → interfaz: una por panel, compartida por los dos envoltorios
export const ID_BARRA = 'tess-exp-motor';
const ETIQUETAS = { 'union-no-plegable': 'Unión no plegable: no se usa como bisagra', 'union-ambigua': 'Unión ambigua: bloqueada (sin bisagra)', 'componente-desconectado': 'Pieza desconectada de la base: queda plana',
  ciclo: 'Ciclo de bisagras: se pliega un árbol; el resto no', ajuste: 'Extremo de crease ajustado (ε)', 'crease-colgante': 'Crease colgante: un extremo no toca el corte ni otra crease',
  'crease-sin-efecto': 'Crease sin efecto: no separa paneles', cruce: 'Cruce de líneas', 'cruce-aproximado': 'Cruce aproximado', astilla: 'Panel astilla (muy delgado)', 'vertice-pinzado': 'Vértice pinzado',
  'antenas-fuera-del-contorno': 'Líneas fuera del contorno', 'adyacencia-discontinua': 'Bisagra discontinua', 'adyacencia-varias-creases': 'Bisagra formada por varias creases', 'curvas-a-polilinea': 'Curvas aproximadas por polilíneas',
  'islas-dudosas': 'Islas dudosas', 'huecos-solo-en-extension': 'Huecos solo en la extensión', 'punto-ajustado-redondeado': 'Punto ajustado redondeado', 'banda-ambigua': 'Banda ambigua', ambiguo: 'Caso ambiguo', error: 'Error' };
const etiqueta = (t) => ETIQUETAS[t] || t;
const valor = (v) => (typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : Array.isArray(v) ? v.slice(0, 6).map(valor).join(', ') + (v.length > 6 ? '…' : '') : v && typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v));
export function describirDiagnostico(d) { // texto legible: etiqueta + mensaje o campos relevantes (sin origen ni tipo)
  const campos = Object.keys(d || {}).filter((k) => !['origen', 'tipo', 'mensaje', 'codigo'].includes(k)).map((k) => `${k} ${valor(d[k])}`);
  return `${etiqueta(d && d.tipo)}${d && d.mensaje ? ': ' + String(d.mensaje).slice(0, 160) : ''}${campos.length ? ' · ' + campos.join(' · ').slice(0, 160) : ''}`;
}
const textoError = (e) => { try { return (e && (e.codigo || e.name)) ? `${e.codigo || e.name}: ${String(e.message || '').replace(/^[\w-]+: /, '').slice(0, 220)}` : String(e); } catch (x) { return 'error'; } };

export function interfazDe(S, selector) { let i = INTERFACES.get(S); if (!i) { i = crearInterfaz(S, selector); INTERFACES.set(S, i); } return i; }

export function crearInterfaz(S, selector) {
  const E = { diag: null, pendiente: null, fallida: null, ultimaClave: null, ultimoValido: null, construccion: null, mensaje: null, confirmando: false, log: null, setStatus: null, plegado: null, applyFolding: null, dom: null };
  const escribir = (m) => { try { if (E.log) E.log(m); } catch (x) { /* el registro nunca rompe la interfaz */ } };
  const mensaje = (tipo, texto) => { E.mensaje = texto ? { tipo, texto } : null; if (texto) escribir(texto); refrescar(); };
  const huella = (d) => { try { return JSON.stringify(d); } catch (x) { return String(Math.random()); } };

  const motor = Object.freeze({
    id: selector.id, contract: selector.contract, validate: selector.validate,
    buildPanels(d) {
      const m = selector.buildPanels(d); const origen = selector.origenDelModelo(m); const clave = huella(d) + '|' + origen;
      const ultimo = selector.registro().filter((x) => x.etapa === 'buildPanels' && !x.sombra).pop();
      const fallback = origen === 'legacy' && selector.modo() === 'activo' && ultimo && ultimo.fallback ? ultimo.causa : null;
      E.mensaje = fallback ? { tipo: 'aviso', texto: `El motor experimental no pudo construir este troquel (${fallback.codigo || fallback.nombre}); esta construcción usa el motor LEGACY completo.` } : null;
      if (E.ultimaClave !== null && clave !== E.ultimaClave && Array.isArray(m && m.panels) && m.panels.length) {
        S.currentBasePanelIndex = -1; S.baseSelectionConfirmed = false; // KI-30: la interfaz elige la base por defecto del motor en uso
        escribir(`Base reiniciada (KI-30): documento o motor distinto del de la construcción anterior; se usa la base por defecto del motor ${origen}.`);
      }
      E.ultimaClave = clave; E.ultimoValido = null; E.pendiente = null; E.fallida = null; E.construccion = { origen, paneles: Array.isArray(m && m.panels) ? m.panels.length : 0, fallback, panelData: m };
      refrescarDespues(); return m;
    },
    buildAdjacency: (panels, creaseEdges) => selector.buildAdjacency(panels, creaseEdges),
    buildFoldTree(panels, adjacency, baseIndex) {
      const prev = E.ultimoValido;
      try { const T = selector.buildFoldTree(panels, adjacency, baseIndex); E.ultimoValido = { panels, adjacency, base: baseIndex, tree: T, confirmado: S.baseSelectionConfirmed };
        if (E.fallida && (E.fallida.panels !== panels || E.fallida.conservada !== baseIndex)) { E.fallida = null; E.mensaje = null; } // otro cambio de base correcto: el aviso ya no aplica
        refrescarDespues(); return T; }
      catch (e) {
        if (prev && prev.panels === panels && prev.adjacency === adjacency && S.currentPanelData && S.currentPanelData.panels === panels) { // cambio de base fallido ⇒ transacción
          S.currentBasePanelIndex = prev.base; S.baseSelectionConfirmed = prev.confirmado; E.fallida = { panels, conservada: prev.base };
          if (!E.pendiente || E.pendiente.panels !== panels) { // una sola restauración por transacción: el redibujado de setBasePanel puede volver a pasar por aquí
            E.pendiente = { panels, base: prev.base, angulos: Array.isArray(S.foldAngles) ? S.foldAngles.slice() : [], seleccion: S.selectedFoldEdgeIdx, todas: valorTodas() };
            mensaje('error', `No se pudo cambiar la base a P${baseIndex} (${textoError(e)}). Se conserva la base P${prev.base} con su plegado.`);
            const p = E.pendiente; Promise.resolve().then(() => { if (E.pendiente === p) E.pendiente = null; restaurar(p); }); // después de que setBasePanel termine (síncrono)
          }
          return prev.tree;
        }
        S.foldTree = []; S.foldSigns = []; S.foldAngles = []; S.selectedFoldEdgeIdx = -1; E.ultimoValido = null; // ningún árbol de otro modelo queda aplicado
        if (typeof document !== 'undefined') { const fp = document.getElementById('fold-panel'); if (fp) fp.remove(); }
        mensaje('error', `Construcción DETENIDA por el motor experimental (${textoError(e)}). No se mezclan resultados con el legacy: vuelva a sombra o reconstruya.`);
        throw e;
      }
    },
    defaultBaseIndex: (m) => selector.defaultBaseIndex(m),
  });

  function deslizadorTodas() { return typeof document === 'undefined' ? null : document.querySelector('#fold-panel details.all-creases input[type=range]'); }
  function valorTodas() { const t = deslizadorTodas(); return t ? t.value : null; }
  function restaurar(p) { // ángulos y crease seleccionada del último estado válido, si el modelo y la base siguen siendo esos
    if (!S.currentPanelData || S.currentPanelData.panels !== p.panels || S.currentBasePanelIndex !== p.base || !Array.isArray(S.foldTree) || S.foldTree.length !== p.angulos.length) return;
    S.foldAngles = p.angulos.slice(); S.selectedFoldEdgeIdx = p.seleccion < S.foldTree.length ? p.seleccion : (S.foldTree.length ? 0 : -1);
    try { if (E.plegado) { for (let i = 0; i < S.foldTree.length; i++) E.plegado.updatePerCreaseRow(i); E.plegado.syncSelectedCreaseUI(); } const t = deslizadorTodas(); if (t && p.todas !== null) t.value = p.todas; if (E.applyFolding) E.applyFolding(); } catch (x) { escribir('Interfaz experimental: no se pudieron redibujar los ángulos restaurados: ' + textoError(x)); }
    if (E.setStatus) E.setStatus(`Base change failed · base=P${p.base} kept`);
  }

  // ── barra permanente ──
  function crearBarra() {
    if (typeof document === 'undefined' || E.dom) return; const estado = document.getElementById('status-area'); if (!estado || !estado.parentNode) return;
    const el = (tag, css, txt) => { const x = document.createElement(tag); if (css) x.style.cssText = css; if (txt) x.textContent = txt; return x; };
    const boton = (txt, fondo) => el('button', `font:inherit;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.25);background:${fondo};color:#fff;cursor:pointer`, txt);
    const barra = el('div', 'margin:6px 0;padding:6px 8px;border-radius:8px;font-size:11px;line-height:1.35;background:rgba(80,120,255,.10);border:1px solid rgba(120,150,255,.35);color:inherit');
    barra.id = ID_BARRA; barra.setAttribute('role', 'region'); barra.setAttribute('aria-label', 'Motor de geometría (Tesseract V3 experimental)');
    const fila = el('div', 'display:flex;flex-wrap:wrap;gap:6px;align-items:center');
    const modo = el('span', 'font-weight:700;padding:1px 6px;border-radius:5px'); modo.className = 'tess-exp-modo';
    const construccion = el('span', 'opacity:.9;flex:1 1 auto'); construccion.className = 'tess-exp-construccion';
    const activar = boton('Activar experimental', 'rgba(255,140,0,.55)'); activar.className = 'tess-exp-activar';
    const desactivar = boton('Volver a sombra', 'rgba(255,255,255,.12)'); desactivar.className = 'tess-exp-desactivar';
    fila.append(el('span', 'opacity:.75', 'Motor:'), modo, construccion, activar, desactivar);
    const confirmar = el('div', 'display:none;margin-top:5px;gap:6px;align-items:center;flex-wrap:wrap'); confirmar.className = 'tess-exp-confirmar';
    const si = boton('Confirmar', 'rgba(255,140,0,.75)'); si.className = 'tess-exp-confirmar-si'; const no = boton('Cancelar', 'rgba(255,255,255,.12)'); no.className = 'tess-exp-confirmar-no';
    confirmar.append(el('span', '', '¿Construir los modelos NUEVOS con el motor experimental? No es persistente (al recargar vuelve a sombra).'), si, no);
    const aviso = el('div', 'display:none;margin-top:5px;padding:3px 6px;border-radius:5px'); aviso.className = 'tess-exp-mensaje';
    const diag = el('details', 'margin-top:4px'); diag.className = 'tess-exp-diag'; const resumen = el('summary', 'cursor:pointer;opacity:.85'); const lista = el('ul', 'margin:4px 0 0 16px;padding:0');
    diag.append(resumen, lista); barra.append(fila, confirmar, aviso, diag);
    activar.addEventListener('click', () => { E.confirmando = true; refrescar(); });
    no.addEventListener('click', () => { E.confirmando = false; refrescar(); });
    si.addEventListener('click', () => { E.confirmando = false; const ok = selector.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }); mensaje(ok ? 'info' : 'error', ok ? 'Modo ACTIVO: pulse «Continue to 3D» (o vuelva a extraer) para construir con el motor experimental.' : 'No se pudo activar el motor experimental.'); });
    desactivar.addEventListener('click', () => { E.confirmando = false; selector.cambiarModo('sombra'); mensaje('info', 'Modo SOMBRA: las construcciones nuevas usan el legacy; el modelo en pantalla conserva su motor hasta reconstruir.'); });
    estado.parentNode.insertBefore(barra, estado.nextSibling);
    E.dom = { barra, modo, construccion, activar, desactivar, confirmar, aviso, resumen, lista };
  }

  function diagnosticos() {
    const c = E.construccion; if (!c) return { titulo: 'Diagnósticos: sin construcción', items: [] };
    if (c.origen === 'experimental') { const base = S.currentBasePanelIndex; // un árbol por (modelo, base): se reutiliza mientras no cambien
      if (!E.diag || E.diag.panelData !== c.panelData || E.diag.base !== base) E.diag = { panelData: c.panelData, base, lista: selector.diagnosticos(c.panelData, base) };
      const ds = E.diag.lista; const cuenta = {}; for (const d of ds) cuenta[etiqueta(d.tipo).split(':')[0]] = (cuenta[etiqueta(d.tipo).split(':')[0]] || 0) + 1;
      return { titulo: ds.length ? `Diagnósticos geométricos (${ds.length}): ${Object.entries(cuenta).map(([k, n]) => `${n} × ${k.toLowerCase()}`).join(', ')}` : 'Diagnósticos geométricos: ninguno', items: ds.map(describirDiagnostico) }; }
    const cmp = selector.registro().filter((x) => x.sombra && x.etapa === 'buildPanels').pop();
    if (!cmp) return { titulo: 'Comparación en sombra: pendiente', items: [] };
    if (cmp.fallo) return { titulo: 'Comparación en sombra: el experimental falló', items: [`${cmp.fallo.codigo || cmp.fallo.nombre}: ${cmp.fallo.mensaje}`] };
    const k = cmp.comparacion; if (!k) return { titulo: 'Comparación en sombra: no disponible', items: [cmp.motivo || ''] };
    return { titulo: `Comparación en sombra: legacy ${k.legacy.paneles} paneles · experimental ${k.experimental.paneles} paneles${k.coincide ? ' (coinciden)' : ''}`,
      items: k.diferencias.map((x) => x.campo === 'areas' ? 'Las áreas de los paneles difieren' : `${x.campo}: legacy ${JSON.stringify(x.legacy)} · experimental ${JSON.stringify(x.experimental)}`) };
  }

  function refrescar() {
    crearBarra(); const D = E.dom; if (!D) return; const activo = selector.modo() === 'activo';
    D.modo.textContent = activo ? 'ACTIVO (experimental)' : 'SOMBRA (legacy)'; D.modo.dataset.modo = activo ? 'activo' : 'sombra'; D.modo.style.background = activo ? 'rgba(255,140,0,.85)' : 'rgba(120,150,255,.45)';
    const c = E.construccion;
    D.construccion.textContent = !c ? 'Construcción actual: ninguna' : `Construcción actual: ${c.origen === 'experimental' ? 'EXPERIMENTAL (experimental-f2a2)' : c.origen === 'legacy' ? (c.fallback ? 'LEGACY (fallback)' : 'LEGACY') : c.origen} · ${c.paneles} paneles${E.ultimoValido && E.ultimoValido.panels === (c.panelData && c.panelData.panels) ? ` · ${E.ultimoValido.tree.length} pliegues · base P${E.ultimoValido.base}` : ''}`;
    D.construccion.dataset.origen = c ? c.origen : ''; D.activar.style.display = activo ? 'none' : ''; D.desactivar.style.display = activo ? '' : 'none'; D.confirmar.style.display = E.confirmando && !activo ? 'flex' : 'none';
    const m = E.mensaje; D.aviso.style.display = m ? 'block' : 'none'; D.aviso.textContent = m ? m.texto : ''; D.aviso.dataset.tipo = m ? m.tipo : '';
    D.aviso.style.background = !m ? '' : m.tipo === 'error' ? 'rgba(255,70,70,.25)' : m.tipo === 'aviso' ? 'rgba(255,190,60,.25)' : 'rgba(120,200,120,.20)';
    let dg; try { dg = diagnosticos(); } catch (x) { dg = { titulo: 'Diagnósticos: no disponibles', items: [textoError(x)] }; }
    D.resumen.textContent = dg.titulo; D.lista.textContent = ''; for (const t of dg.items.slice(0, 40)) { const li = document.createElement('li'); li.textContent = t; D.lista.appendChild(li); }
  }
  const refrescarDespues = () => { refrescar(); if (typeof setTimeout === 'function') setTimeout(refrescar, 0); }; // la comparación en sombra llega después (FIFO)

  selector.suscribir(() => refrescar());
  return {
    motor,
    conectarPlegado(api, deps) { E.plegado = api; E.applyFolding = deps.applyFolding; E.setStatus = deps.setStatus; refrescarDespues(); },
    conectarControlador(deps) { E.log = deps.log; if (!E.setStatus) E.setStatus = deps.setStatus; refrescarDespues(); },
    refrescar: refrescarDespues,
    estado: () => ({ construccion: E.construccion ? { origen: E.construccion.origen, paneles: E.construccion.paneles, fallback: E.construccion.fallback } : null, mensaje: E.mensaje, ultimaBaseValida: E.ultimoValido ? E.ultimoValido.base : null }),
  };
}
