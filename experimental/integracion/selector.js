// F2A-3 · I-2 — Selector legacy / experimental con la forma GeometryEngine v1. Exporta createLegacyEngine con el MISMO nombre y firma que
// importa src/main.js, para que el bundle experimental (tools/build/build-experimental.mjs) lo sustituya a './core/engine.js' sin cambiar src/.
// docs/fase2/F2A3_HANDOFF.md §8.2 y condiciones C-02 / C-03. Sin estado de módulo, sin globales, sin persistencia: todo vive en la clausura
// de cada llamada y un selector nuevo SIEMPRE arranca en sombra.
//   · SOMBRA (predeterminado, C-03): cada operación v1 devuelve EXACTAMENTE lo que devuelve el legacy (mismos objetos, mismas excepciones,
//     mismas líneas de log en el mismo orden). Después, con `programar` (en el bundle, setTimeout 0), el experimental se ejecuta sobre una
//     COPIA PROFUNDA de la entrada y sobre sus propios objetos, dentro de try/catch, y solo se anota una comparación estructurada en
//     registro(). Nunca recibe objetos del legacy, nunca escribe en el log y sus excepciones (Error o no) nunca se propagan.
//   · ACTIVO (solo con cambiarModo('activo', { confirmacion: 'ACTIVAR-EXPERIMENTAL' }), visible en el log, no persistente, C-02):
//     buildPanels intenta el experimental; si falla, la construcción COMPLETA se rehace con el legacy (fallback atómico, con mensaje y
//     registro). buildAdjacency / buildFoldTree / defaultBaseIndex despachan por el ORIGEN DEL MODELO (no por el modo actual): los modelos
//     experimentales solo los toca el experimental y los legacy solo el legacy; cualquier mezcla ⇒ modelo-ajeno. LÍMITE de la API v1: un
//     fallo experimental POSTERIOR a buildPanels (árbol, base) no puede rehacerse atómicamente con el legacy (la interfaz ya tiene los
//     paneles experimentales) ⇒ la construcción se DETIENE con ErrorPanelModel('construccion-detenida') y diagnóstico; nunca se devuelve un
//     árbol legacy para paneles experimentales. La solución transaccional (buildModel completo) queda para un contrato v2.
// Opciones (además de las de createLegacyEngine): eps, congelar, programar(f), reloj(), umbralSombraMs, avisarCambioDeOrigen (por defecto true;
// la interfaz experimental lo desactiva porque ella misma reinicia la base) y, solo en pruebas, crearLegacy, crearExperimental, dependenciasExperimentales.
// Fuera de v1 (Entrega 2 y RC): tiempos() de cada operación, suscribir(fn) a los cambios de modo, diagnosticos(panelData, base) del modelo experimental y simularFallo(etapa), un
// interruptor de DEPURACIÓN no persistente que hace fallar al experimental en una etapa para validar la recuperación en Illustrator real.
import { createLegacyEngine as crearMotorLegacy, GEOMETRY_ENGINE_CONTRACT } from '../../src/core/engine.js';
import { createExperimentalEngine, esModeloExperimental, EPS_EXPERIMENTAL, ID_MOTOR_EXPERIMENTAL } from './motor-v1.js';
import { ErrorPanelModel } from '../plegado/index.js';

export { GEOMETRY_ENGINE_CONTRACT };
export const ID_SELECTOR = 'selector-f2a3';
export const CONFIRMACION_ACTIVO = 'ACTIVAR-EXPERIMENTAL';
export const MAX_REGISTRO = 200;
export const UMBRAL_SOMBRA_MS = 250;

const NO_SERIALIZABLE = '\u0000no-serializable';
const huella = (d) => { try { return JSON.stringify(d); } catch (e) { return NO_SERIALIZABLE; } };
function describir(e) { // nunca lanza (también con valores que no son Error, getters hostiles o símbolos)
  try { if (e && typeof e === 'object') return { nombre: String(e.name || 'objeto'), codigo: e.codigo ? String(e.codigo) : null, mensaje: String(e.message || '').slice(0, 300) };
    return { nombre: typeof e, codigo: null, mensaje: String(e).slice(0, 300) }; } catch (x) { return { nombre: 'no-describible', codigo: null, mensaje: '' }; }
}
const redondear = (x) => Math.round(x * 1e3) / 1e3;
function resumenModelo(m) {
  const ps = m && Array.isArray(m.panels) ? m.panels : []; const areas = ps.map((p) => (p && typeof p.area === 'number' ? p.area : NaN)).sort((a, b) => a - b);
  return { paneles: ps.length, creaseEdges: m && Array.isArray(m.creaseEdges) ? m.creaseEdges.length : 0, areaTotal: redondear(areas.reduce((s, a) => s + a, 0)), areas: areas.map(redondear) };
}
function comparar(L, X) { // comparación estructurada campo a campo (solo los campos comunes); la clase de cada diferencia la interpreta el informe
  const diferencias = []; for (const k of Object.keys(L)) if (k in X && JSON.stringify(L[k]) !== JSON.stringify(X[k])) diferencias.push({ campo: k, legacy: L[k], experimental: X[k] });
  return { coincide: diferencias.length === 0, legacy: L, experimental: X, diferencias };
}
const contar = (ds) => { const c = {}; for (const d of ds || []) { const t = (d && d.tipo) || '?'; c[t] = (c[t] || 0) + 1; } return c; };
function panelQueContiene(p, panels) { // panel experimental que contiene el centroide del panel base legacy (solo para la comparación en sombra)
  if (!p) return -1;
  for (let i = 0; i < panels.length; i++) { const v = panels[i].vertices; let dentro = false;
    for (let a = 0, b = v.length - 1; a < v.length; b = a++) if ((v[a].y > p.y) !== (v[b].y > p.y) && p.x < ((v[b].x - v[a].x) * (p.y - v[a].y)) / (v[b].y - v[a].y) + v[a].x) dentro = !dentro;
    if (dentro) return i; }
  return -1;
}

export function createLegacyEngine(options) {
  const o = options || {};
  const log = typeof o.log === 'function' ? o.log : () => {};
  const legacy = (typeof o.crearLegacy === 'function' ? o.crearLegacy : crearMotorLegacy)(options); // mismo objeto de opciones ⇒ mismo sink de log
  const eps = o.eps === undefined ? EPS_EXPERIMENTAL : o.eps;
  const programar = typeof o.programar === 'function' ? o.programar : (f) => f();
  const reloj = typeof o.reloj === 'function' ? o.reloj : () => Date.now();
  const umbral = typeof o.umbralSombraMs === 'number' ? o.umbralSombraMs : UMBRAL_SOMBRA_MS;
  const estado = { modo: 'sombra', congelar: !!o.congelar, n: 0, ultimoOrigen: null, falloSimulado: null };
  const avisarOrigen = o.avisarCambioDeOrigen !== false; const suscriptores = new Set();
  const notificar = () => { for (const f of [...suscriptores]) { try { f(estado.modo); } catch (e) { /* un suscriptor nunca rompe el selector */ } } };
  const ETAPAS_SIMULABLES = ['buildPanels', 'buildAdjacency', 'buildFoldTree', 'defaultBaseIndex'];
  const registro = []; const legPaneles = new WeakSet(); const expObjetos = new WeakSet(); const sombraDe = new WeakMap();
  const anotar = (e) => { try { registro.push({ n: ++estado.n, modo: estado.modo, ...e }); if (registro.length > MAX_REGISTRO) registro.splice(0, registro.length - MAX_REGISTRO); } catch (x) { /* el registro nunca rompe una operación */ } };
  const crearExp = (conLog, congelar) => { // un fallo al crear el experimental nunca impide el legacy: queda anotado y el modo activo no se puede activar
    try { return (typeof o.crearExperimental === 'function' ? o.crearExperimental : createExperimentalEngine)({ log: conLog ? log : null, eps, validate: legacy.validate, congelar, dependencias: o.dependenciasExperimentales || null }); }
    catch (e) { anotar({ etapa: 'crear-experimental', fallo: describir(e) }); return null; }
  };
  const motores = { activo: crearExp(true, estado.congelar), sombra: crearExp(false, false) };

  const esObjeto = (x) => !!x && typeof x === 'object';
  const marcarExp = (x) => { if (!esObjeto(x)) return; expObjetos.add(x); if (Array.isArray(x)) for (const y of x) if (esObjeto(y)) expObjetos.add(y); };
  const esExp = (panels) => esObjeto(panels) && (expObjetos.has(panels) || esModeloExperimental(panels));
  const contieneExp = (...xs) => xs.some((x) => esObjeto(x) && (esExp(x) || (Array.isArray(x) && x.some((y) => esObjeto(y) && expObjetos.has(y)))));
  const origen = (panels) => (esExp(panels) ? 'experimental' : esObjeto(panels) && legPaneles.has(panels) ? 'legacy' : 'desconocido');
  const fallo = (codigo, etapa, mensaje, extra) => new ErrorPanelModel(codigo, [{ tipo: 'error', codigo, etapa, mensaje: `${etapa}: ${mensaje}`, ...extra }]);
  const mezcla = (etapa) => { anotar({ etapa, detenida: true, causa: { nombre: 'ErrorPanelModel', codigo: 'modelo-ajeno', mensaje: 'mezcla de objetos experimentales y legacy' } });
    log(`Motor de geometría: ${etapa} recibió objetos de construcciones o motores distintos; se rechaza la operación (no se mezclan resultados).`);
    return fallo('modelo-ajeno', etapa, 'mezcla de objetos del motor experimental con otros objetos (C-01)'); };
  const detener = (etapa, e) => { const d = describir(e); anotar({ etapa, origen: 'experimental', detenida: true, causa: d });
    log(`Motor experimental: fallo en ${etapa} (${d.codigo || d.nombre}). La construcción se DETIENE sin mezclar resultados del legacy; vuelva a «Continue to 3D» o desactive el modo activo.`);
    return e && e.codigo === 'modelo-ajeno' ? e : fallo('construccion-detenida', etapa, d.mensaje, { causa: d.codigo || d.nombre }); };
  const simulado = (etapa) => { if (estado.falloSimulado === etapa) throw fallo('fallo-simulado', etapa, 'fallo SIMULADO para depuración (simularFallo)'); };
  const enExperimental = (etapa, f) => { try { simulado(etapa); const r = f(); marcarExp(r); return r; } catch (e) { throw detener(etapa, e); } };
  const avisoOrigen = (nuevo) => { const prev = estado.ultimoOrigen; estado.ultimoOrigen = nuevo;
    if (avisarOrigen && prev && prev !== nuevo && estado.modo === 'activo') log(`Aviso: este modelo viene del motor ${nuevo} y el anterior del ${prev}; la base elegida antes puede designar otro panel (KI-30: el reinicio de la base al cambiar de motor está pendiente de la interfaz).`); };
  const registrarLegacy = (m) => { if (esObjeto(m) && esObjeto(m.panels)) legPaneles.add(m.panels); };

  // ── sombra: nunca lanza, nunca recibe objetos del legacy, nunca escribe en el log ──
  const ejecutarSombra = (etapa, f) => {
    const tarea = () => { try { const r = f(); if (r) anotar({ etapa, sombra: true, ...r, lento: typeof r.ms === 'number' && r.ms > umbral }); } catch (e) { anotar({ etapa, sombra: true, fallo: describir(e) }); } };
    try { programar(tarea); } catch (e) { anotar({ etapa, sombra: true, fallo: describir(e), programacion: true }); }
  };
  const sinModelo = (panels) => { const X = sombraDe.get(panels); return X ? null : { motivo: X === null ? 'el experimental falló en buildPanels' : 'sin construcción en sombra para este modelo' }; };
  const sombraBuildPanels = (copia, m) => {
    let L; try { L = resumenModelo(m); } catch (e) { return; } const panelsL = esObjeto(m) && esObjeto(m.panels) ? m.panels : null;
    if (!motores.sombra || copia === NO_SERIALIZABLE || copia === undefined || !panelsL) return anotar({ etapa: 'buildPanels', sombra: false, motivo: !motores.sombra ? 'experimental no disponible' : 'entrada no copiable o modelo sin panels' });
    sombraDe.set(panelsL, undefined); // marca síncrona: las etapas siguientes se programan detrás (FIFO) y encuentran el modelo o su fallo
    ejecutarSombra('buildPanels', () => { sombraDe.set(panelsL, null); const t0 = reloj(); const X = motores.sombra.buildPanels(JSON.parse(copia)); const ms = reloj() - t0;
      if (!esObjeto(X) || !Array.isArray(X.panels)) throw fallo('adaptador-incoherente', 'buildPanels', 'el experimental no devolvió un modelo');
      sombraDe.set(panelsL, X); return { ms, comparacion: comparar(L, { ...resumenModelo(X), diagnosticos: contar(X.f2a2 && X.f2a2.diagnosticos) }) }; });
  };
  const sombraAdyacencias = (panels, A) => { const L = { adyacencias: Array.isArray(A) ? A.length : null };
    ejecutarSombra('buildAdjacency', () => { const s = sinModelo(panels); if (s) return s; const X = sombraDe.get(panels); const t0 = reloj(); const n = motores.sombra.buildAdjacency(X.panels, X.creaseEdges).length; return { ms: reloj() - t0, comparacion: comparar(L, { adyacencias: n }) }; });
  };
  const sombraArbol = (panels, T, base) => {
    const c = Number.isInteger(base) && panels[base] && panels[base].centroid; const centroide = c ? { x: Number(c.x), y: Number(c.y) } : null; const L = { aristas: Array.isArray(T) ? T.length : null };
    ejecutarSombra('buildFoldTree', () => { const s = sinModelo(panels); if (s) return s; const X = sombraDe.get(panels); const bX = panelQueContiene(centroide, X.panels);
      if (bX < 0) return { baseLegacy: base, baseExperimental: null, motivo: 'la base legacy no tiene panel experimental correspondiente' };
      const t0 = reloj(); const A = motores.sombra.buildAdjacency(X.panels, X.creaseEdges); const n = motores.sombra.buildFoldTree(X.panels, A, bX).length; const ms = reloj() - t0;
      const diagnosticos = typeof motores.sombra.diagnosticos === 'function' ? contar(motores.sombra.diagnosticos(X.panels, bX)) : null;
      return { ms, baseLegacy: base, baseExperimental: bX, comparacion: comparar(L, { aristas: n }), diagnosticos }; });
  };

  function buildPanelsActivo(d) {
    log(`Motor de geometría: modo ACTIVO — esta construcción usa el motor experimental ${ID_MOTOR_EXPERIMENTAL} (no persistente; desactivar: __tessMotorExperimental.desactivar()).`); // «Continue to 3D» limpia el log: se repite en cada construcción
    const antes = huella(d); let X = null, error = null;
    try { simulado('buildPanels'); X = motores.activo.buildPanels(d); if (!esObjeto(X) || !Array.isArray(X.panels) || !Array.isArray(X.creaseEdges)) throw fallo('adaptador-incoherente', 'buildPanels', 'el experimental no devolvió {panels[], creaseEdges[]}'); }
    catch (e) { error = e; }
    if (!error) { marcarExp(X.panels); marcarExp(X.creaseEdges); avisoOrigen('experimental'); const r = resumenModelo(X); anotar({ etapa: 'buildPanels', origen: 'experimental', paneles: r.paneles, creaseEdges: r.creaseEdges }); return X; }
    const d0 = describir(error);
    if (huella(d) !== antes) { anotar({ etapa: 'buildPanels', detenida: true, motivo: 'entrada-mutada', causa: d0 });
      log(`Motor experimental: buildPanels falló (${d0.codigo || d0.nombre}) y además modificó la entrada; no se puede reconstruir con el legacy de forma segura. Construcción DETENIDA.`);
      throw fallo('construccion-detenida', 'buildPanels', 'el motor experimental modificó la entrada antes de fallar', { causa: d0.codigo || d0.nombre, motivo: 'entrada-mutada' }); }
    log(`Motor experimental: buildPanels falló (${d0.mensaje || d0.codigo || d0.nombre}). FALLBACK ATÓMICO: esta construcción usa el motor legacy COMPLETO (paneles, adyacencias y árbol).`);
    let m; try { m = legacy.buildPanels(d); } catch (e) { anotar({ etapa: 'buildPanels', origen: 'legacy', fallback: true, causa: d0, legacyLanzo: describir(e) }); throw e; }
    registrarLegacy(m); avisoOrigen('legacy'); const r = resumenModelo(m); anotar({ etapa: 'buildPanels', origen: 'legacy', fallback: true, causa: d0, paneles: r.paneles, creaseEdges: r.creaseEdges });
    return m;
  }

  function cambiarModo(modo, opciones) {
    if (modo === 'sombra') { if (estado.modo !== 'sombra') { estado.modo = 'sombra'; anotar({ control: 'modo', a: 'sombra' });
      log('Motor de geometría: modo SOMBRA (predeterminado): la interfaz usa el motor legacy y el experimental solo se compara aparte. Los modelos ya construidos conservan su motor de origen.'); notificar(); } return true; }
    if (modo !== 'activo') throw new TypeError(`cambiarModo: modo desconocido «${String(modo)}» (sombra | activo)`);
    if (!opciones || opciones.confirmacion !== CONFIRMACION_ACTIVO) { anotar({ control: 'activacion-rechazada' }); log(`Motor de geometría: activación RECHAZADA (falta la confirmación explícita). Sigue en modo ${estado.modo.toUpperCase()}.`); return false; }
    if (!motores.activo) { anotar({ control: 'activacion-rechazada', motivo: 'experimental no disponible' }); log('Motor de geometría: el motor experimental no está disponible; sigue en modo SOMBRA.'); return false; }
    if (estado.modo !== 'activo') { estado.modo = 'activo'; anotar({ control: 'modo', a: 'activo' });
      log(`Motor de geometría: modo ACTIVO — los modelos NUEVOS los construye el motor experimental ${ID_MOTOR_EXPERIMENTAL} (ε=${eps === null ? 'sin ajuste' : eps + ' mm'}). No es persistente: al recargar el panel vuelve a SOMBRA. Pulse «Continue to 3D» para reconstruir.`); notificar(); }
    return true;
  }

  function v1BuildPanels(d) {
    if (estado.modo === 'activo' && motores.activo) return buildPanelsActivo(d);
    const copia = motores.sombra ? huella(d) : undefined; // copia profunda ANTES del legacy: la sombra ve la entrada original
    const m = legacy.buildPanels(d); registrarLegacy(m); estado.ultimoOrigen = 'legacy'; sombraBuildPanels(copia, m);
    return m;
  }
  function v1BuildAdjacency(panels, creaseEdges) {
    if (esExp(panels)) return enExperimental('buildAdjacency', () => motores.activo.buildAdjacency(panels, creaseEdges));
    if (contieneExp(panels, creaseEdges)) throw mezcla('buildAdjacency');
    const A = legacy.buildAdjacency(panels, creaseEdges); if (esObjeto(panels) && legPaneles.has(panels) && sombraDe.has(panels)) sombraAdyacencias(panels, A);
    return A;
  }
  function v1BuildFoldTree(panels, adjacency, baseIndex) {
    if (esExp(panels)) return enExperimental('buildFoldTree', () => motores.activo.buildFoldTree(panels, adjacency, baseIndex));
    if (contieneExp(panels, adjacency)) throw mezcla('buildFoldTree');
    const T = legacy.buildFoldTree(panels, adjacency, baseIndex); if (esObjeto(panels) && legPaneles.has(panels) && sombraDe.has(panels)) sombraArbol(panels, T, baseIndex);
    return T;
  }
  function v1DefaultBaseIndex(m) {
    const panels = esObjeto(m) ? m.panels : undefined;
    if (esExp(panels)) return enExperimental('defaultBaseIndex', () => motores.activo.defaultBaseIndex(m));
    if (contieneExp(panels, esObjeto(m) ? m.creaseEdges : undefined)) throw mezcla('defaultBaseIndex');
    return legacy.defaultBaseIndex(m);
  }

  // Tiempos de cada operación v1 (fuera de v1: tiempos()), con el reloj inyectado (en el bundle, performance.now). Medir no cambia nada
  // observable: la excepción se propaga igual y no se escribe en el log. Lista acotada como el registro.
  const tiempos = [];
  const cronometrar = (op, f, panels) => { const t0 = reloj(); let origenOp = op === 'buildPanels' ? null : origen(panels); try { const r = f(); if (op === 'buildPanels') origenOp = origen(esObjeto(r) ? r.panels : undefined); return r; }
    finally { try { tiempos.push({ op, modo: estado.modo, origen: origenOp, ms: reloj() - t0 }); if (tiempos.length > MAX_REGISTRO) tiempos.splice(0, tiempos.length - MAX_REGISTRO); } catch (x) { /* nunca rompe la operación */ } } };

  return Object.freeze({
    id: ID_SELECTOR, contract: GEOMETRY_ENGINE_CONTRACT,
    validate: legacy.validate, // los dos modos: el validador del legacy (D-F2A3-4)
    buildPanels: (d) => cronometrar('buildPanels', () => v1BuildPanels(d)),
    buildAdjacency: (panels, creaseEdges) => cronometrar('buildAdjacency', () => v1BuildAdjacency(panels, creaseEdges), panels),
    buildFoldTree: (panels, adjacency, baseIndex) => cronometrar('buildFoldTree', () => v1BuildFoldTree(panels, adjacency, baseIndex), panels),
    defaultBaseIndex: (m) => cronometrar('defaultBaseIndex', () => v1DefaultBaseIndex(m), esObjeto(m) ? m.panels : undefined),
    // ── fuera de v1: control explícito, visible y no persistente ──
    modo: () => estado.modo,
    cambiarModo,
    origenDelModelo: (panelData) => origen(esObjeto(panelData) ? panelData.panels : undefined),
    registro: () => JSON.parse(JSON.stringify(registro)),
    tiempos: () => tiempos.map((t) => ({ ...t })),
    congelarSalidas(v) { estado.congelar = !!v; const m = crearExp(true, estado.congelar); if (m) motores.activo = m; anotar({ control: 'congelar', a: estado.congelar });
      log(`Motor experimental: salidas ${estado.congelar ? 'CONGELADAS en profundidad (depuración)' : 'sin congelar'} para los modelos nuevos.`); return estado.congelar; },
    eps,
    suscribir(fn) { if (typeof fn !== 'function') throw new TypeError('suscribir: se esperaba una función'); suscriptores.add(fn); return () => { suscriptores.delete(fn); }; },
    diagnosticos(panelData, baseIndex) { // solo modelos experimentales; nunca lanza (un fallo se devuelve como diagnóstico)
      const panels = esObjeto(panelData) ? panelData.panels : undefined; if (!esExp(panels) || !motores.activo || typeof motores.activo.diagnosticos !== 'function') return [];
      try { return JSON.parse(JSON.stringify(motores.activo.diagnosticos(panels, baseIndex))); } catch (e) { const d = describir(e); return [{ tipo: 'error', codigo: d.codigo || d.nombre, mensaje: d.mensaje }]; } },
    simularFallo(etapa) { if (etapa !== null && !ETAPAS_SIMULABLES.includes(etapa)) throw new TypeError(`simularFallo: etapa desconocida «${String(etapa)}» (${ETAPAS_SIMULABLES.join(' | ')} | null)`);
      estado.falloSimulado = etapa; anotar({ control: 'fallo-simulado', etapa });
      log(etapa ? `Depuración: el motor experimental FALLARÁ (simulado) en ${etapa} hasta simularFallo(null) o recargar el panel.` : 'Depuración: fallo simulado desactivado.'); return estado.falloSimulado; },
  });
}
