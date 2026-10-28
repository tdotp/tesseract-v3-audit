# Tesseract V3 — Handoff integral para auditoría (RC 3.0.0-rc.1)

Fecha: 2026-10-28 · Repositorio local: `…/Antigravity/Tesseract/Tesseract v3` (rama `main`, sin remoto configurado) · Auditoría: `https://github.com/tdotp/tesseract-v3-audit`, rama `audit/f2a2`.
Commit de referencia del contenido: `2a55610c349f87ceb540d1a06e1a3989b40c17bf` (informe del RC). Este documento llega en el commit documental siguiente (`git log -1`).
**Documento autocontenido:** permite retomar el proyecto en un chat nuevo sin el historial. Idioma de trabajo con el usuario: **español**; evidencia antes que afirmaciones.

**Etiquetas de verificación (se usan en todo el documento):**
- **[REAL]** observado en Adobe Illustrator 30.8.2 real (CEP 12.1.1, Chromium 99.0.4844.84, macOS), por DevTools remoto del panel o por AppleScript / Eventos del Sistema;
- **[AUTO]** comprobado por pruebas automatizadas (Node o Chrome headless con el arnés del panel);
- **[ESTÁTICO]** revisado leyendo el código o los documentos, sin ejecución;
- **[PENDIENTE]** sin comprobar.

Ninguna hipótesis se presenta como medida.

---

## 1. Objetivo funcional y alcance actual

**Qué es Tesseract:**
- Un plugin **CEP** (panel HTML + three.js r132) para **Adobe Illustrator**.
- Lee un **troquel** del documento: corte en la capa `Cuts` y pliegues en la capa `Creases`.
- Lo convierte en **paneles**, construye el **árbol de plegado** y lo **pliega en 3D**.
- Aplica **arte** frontal y trasero (capas o mesas `Front`/`Back`, `Tiro`/`Retiro`) y **materiales** (Kraft, Gray y White board, con espesor).
- Exporta **GLB** (y PNG, con el botón oculto).
- Illustrator sigue siendo el único editor vectorial.

**Estado al cierre (2026-10-28):**
- **Producto original:** «Tesseract», instalado en `/Library/…/CEP/extensions/tesseract`. **Intacto**; nunca se modifica.
- **V3 normal** (`dist/`, huella `dist-a9`): la modernización de F1 (modularización sin cambios visibles). Usa solo el motor **legacy**. **No está instalado.**
- **V3 release candidate 3.0.0-rc.1:** bundle con **dos motores**:
  - **legacy** por defecto (modo **sombra**);
  - motor **experimental exacto** `experimental-f2a2`, activable en el panel.
  - Es el que está **instalado** (`~/Library/…/CEP/extensions/tesseract-v3-experimental`) y **validado en real**.
  - Recomendación técnica: **APTO CON RESERVAS** (`docs/release/TESSERACT_V3_RELEASE_CANDIDATE.md` §0).
- **No autorizado:** publicación estable, distribución, firma con un certificado, reemplazo del original y F2B.

## 2. Arquitectura

```
Illustrator (ExtendScript)                     Panel CEP (Chromium 99, IIFE único)
 src/host/*.js  ── evalScript ──►  src/bridge/cep.js, fs.js
  extract.js (troquel → DielineV1 JSON)           │
  art.js (exporta Front/Back a PNG temporales)    ▼
  save-dialog.js (File.saveDialog «Save GLB»)   src/main.js (shell + composición: S, log, setStatus, fábricas)
  test-connection.js                              ├─ src/ui/      controller (eventos, validación, «Continue to 3D»), fold-controls (deslizadores, base),
                                                  │               picking (Shift/Alt+clic), views (pestañas, vistas)
                                                  ├─ src/app/     state (estado S sellado, 26 campos), actions (arte, PNG, GLB)
                                                  ├─ src/scene/   viewport (cámara orbital, eventos del lienzo), panel-meshes, crease-visuals, labels, materials, artwork, three-utils
                                                  ├─ src/fold/    folding (pivotes jerárquicos), angles
                                                  ├─ src/export/  glb-scene, glb-builder, glb-image, glb-bytes
                                                  └─ src/core/engine.js  ── contrato GeometryEngine v1 ──► src/core/legacy/ (motor vigente)

Bundle NORMAL (tools/build/build.mjs → dist/, id com.tato.tesseract.v3.panel)              = src/ tal cual; huella tests/golden/dist-a9.SHA256SUMS
Bundle RC/EXPERIMENTAL (tools/build/build-experimental.mjs → dist-experimental/, id com.tato.tesseract.v3.experimental.panel)
  = el MISMO src/main.js con 3 sustituciones de import (solo desde src/main.js):
    './core/engine.js'      → experimental/integracion/entrada-cep.js       selector legacy/experimental + punto de control __tessMotorExperimental
    './ui/fold-controls.js' → experimental/integracion/fold-controls-cep.js fábrica REAL + motor intermediario (interfaz-cep.js)
    './ui/controller.js'    → experimental/integracion/controller-cep.js    fábrica REAL + motor intermediario (interfaz-cep.js)
  selector.js ─┬─ src/core/engine.js (legacy real)
               └─ motor-v1.js ─► experimental/plegado/ (adaptador, árbol) ─► experimental/geometria/ (núcleo exacto)
```

**Garantía clave:** `src/` no menciona `experimental/` y no ha cambiado desde F1. El bundle normal sigue byte a byte en `dist-a9` [AUTO: `f2a3-bundle`, `f2a1/f2a2-aislamiento`, `build.test`].

## 3. Árbol de módulos y responsabilidades (rutas principales)

| Ruta | Responsabilidad |
|---|---|
| `src/main.js` | Shell y raíz de composición: consulta el DOM, crea el estado `S`, `log`, `setStatus` y `geometryEngine`; crea las fábricas y llama a `bindEvents` |
| `src/core/engine.js` | Contrato **GeometryEngine v1** y su única implementación `legacy` |
| `src/core/legacy/{topology,panels,adjacency,fold-tree,validate,geom2d,log}.js` | Motor legacy: grafo plano, caras, filtros, adyacencias estrictas y de respaldo, BFS del árbol, validación previa. Texto idéntico al plugin original |
| `src/ui/controller.js` | Eventos, extracción, validación, vista 2D, «Continue to 3D», espesor, preset, arte, exportaciones |
| `src/ui/fold-controls.js` | Panel `#fold-panel`: deslizadores por crease, ALL, Reset, select de base; `setBasePanel`, `buildFoldUI` |
| `src/ui/picking.js` | Shift+clic (base) y Alt+clic (crease) con el raycaster |
| `src/scene/viewport.js` | Renderizador, cámara orbital, eventos de puntero del lienzo (`onUp` llama al picking) |
| `src/scene/{panel-meshes,crease-visuals,materials,artwork,labels}.js` | Mallas extruidas, líneas y puentes de pliegue, materiales, texturas de arte, etiquetas |
| `src/fold/{folding,angles}.js` | Aplicar el plegado (pivote en `crease.a`, signo) y los ángulos de presentación |
| `src/export/*.js` · `src/app/actions.js` | Escena de exportación, construcción del GLB, imágenes, PNG (`<a download>`) |
| `src/host/*.js` · `src/bridge/*.js` | Textos ExtendScript; puente CEP y guardado de archivos |
| `experimental/geometria/` | **Núcleo exacto F2A-1**: predicados con expansiones, arreglo con vértices simbólicos, caras (DCEL), ajuste ε (`nucleo.js`, `arreglo.js`, `caras.js`, `predicados.js`, `ajuste.js`) |
| `experimental/plegado/adaptador.js` | `adaptarPanelModel(d, {eps})` → `PanelModel` v1 + `f2a2` (detalle del núcleo no enumerable); `ErrorPanelModel(codigo, diagnosticos)` |
| `experimental/plegado/arbol.js` | `construirAdyacencias` (uniones plegable/ambigua/no-plegable, H-01) · `construirArbolPlegado` (ciclos reales, bosque, H-02) · `baseDefecto` |
| `experimental/integracion/motor-v1.js` | Fachada v1 del experimental (Symbol privado, identidad, árbol solo para la base pedida) |
| `experimental/integracion/selector.js` | Selector: sombra, activo, fallback, despacho por origen, registro, tiempos, `simularFallo` (depuración) |
| `experimental/integracion/entrada-cep.js` | Sustituye al motor en el RC: programa la sombra y publica el punto de control |
| `experimental/integracion/interfaz-cep.js` (+ `fold-controls-cep.js`, `controller-cep.js`) | Barra de motor, KI-30, base transaccional, detención sin restos, diagnósticos agrupados |
| `tools/build/build.mjs` · `build-experimental.mjs` · `build-rc.mjs` | Bundle normal · bundle RC/experimental · artefacto RC reproducible desde un commit |
| `tools/a4/a4.sh` · `a4-experimental.sh` · `tools/verify-isolation.sh` | Instalación A4 (V3 normal, histórico) · instalación aislada del experimental · comprobación de aislamiento |
| `tools/a4/cdp-run.mjs` · `f2a3-cep.mjs` · `f2a3-rc-real.mjs` · `tools/illustrator/run-nivel0.mjs` | Conductores CDP de las validaciones reales; apertura y cierre de documentos desechables N0-* |
| `tests/run-all.sh` · `tests/run-experimental.sh` | Baterías (siempre en secuencia, nunca a la vez) |
| `tests/lib/f2/oraculo.mjs` · `racional.mjs` | Oráculo geométrico racional exacto e independiente (F2A-0) |
| `tests/golden/*` · `tests/fixtures/*` | Huellas y goldens de F1 (no se modifican); troqueles reales y sintéticos |

## 4. Legacy frente a experimental

| Aspecto | Legacy (`src/core/legacy`) | Experimental (`experimental-f2a2`) |
|---|---|---|
| Aritmética | Coma flotante con **tolerancias absolutas en mm** (0,5 mm) | Predicados **exactos** (expansiones), vértices simbólicos; ε = 0,05 mm **solo** para ajustar extremos de crease (DP-3) |
| Caja Botánica (N0-A real) | **11 paneles**, 10 pliegues (KI-04/KI-22: descarta 2 paneles reales) [REAL] | **13 paneles**, 12 pliegues [REAL] |
| Dependencia de la escala / del sentido | Sí (KI-22, KI-31, KI-32) | No: invariante, igual que el oráculo [AUTO] |
| Uniones no colineales (H-01) | Las usa como bisagras | Clasifica plegable / ambigua / no-plegable; solo las plegables son bisagras [AUTO] |
| Ciclos y componentes (H-02) | Silencio | Solo ciclos reales; diagnósticos `ciclo` y `componente-desconectado` [AUTO] |
| Errores | `TypeError` crudos | `ErrorPanelModel` con código (`entrada-invalida`, `nucleo-incoherente`, `modelo-ajeno`, `base-invalida`…) |
| Diagnósticos en la interfaz | No | Barra del RC, agrupados por tipo [REAL] |
| Coste en CEP (`buildPanels`, N0-A) | 12,7 ms | 16,2 ms [REAL] |

## 5. Contratos e invariantes

**GeometryEngine v1** (`src/core/engine.js`):
- `validate(d) → {problems}`
- `buildPanels(d) → PanelModel`
- `buildAdjacency(panels, creaseEdges) → AdjacencyEdge[]`
- `buildFoldTree(panels, adjacency, base) → FoldEdge[]`
- `defaultBaseIndex(m) → número`

**Invariantes I1–I10:**
- sin DOM, THREE ni estado; determinista; no muta la entrada;
- salida de solo lectura (puede compartir objetos);
- identidad de panel = índice; unidades en mm;
- excepciones sin envolver; log por el sink.

**PanelModel v1:** `{panels: [{vertices CCW, edges:[{u,v,type}], area, centroid}], creaseEdges: [{a,b,creaseIdx,segIdx}] (a/b = anclas de la entrada), creases}`.

**AdjacencyEdge** `{panelA, panelB, crease:{a,b}, creaseIdx}` · **FoldEdge** `{parent, child, crease, sign}`, con pivote en `crease.a`.

**Experimental (C-01, alternativa B):**
- `buildPanels` adjunta las adyacencias exactas a `panels` con un `Symbol` **privado** (no exportado, no enumerable).
- `buildAdjacency`, `buildFoldTree` y `defaultBaseIndex` exigen la **identidad** de `panels`, `creaseEdges` y adyacencias. Una copia o una mezcla da `modelo-ajeno`.
- El **árbol se calcula solo para la base pedida**.

**Selector:**
- **Sombra** (C-03): devuelve exactamente el legacy; el experimental se ejecuta después (`setTimeout`) sobre una copia y solo se compara.
- **Activo** (C-02): fallback atómico si falla `buildPanels`; `construccion-detenida` si falla después (límite de la API v1).
- **Despacho por origen del modelo**: no depende del modo actual.

**Política geométrica:**
- detalles de 0,5 mm intencionales (DP-1);
- los 13 paneles de la Caja Botánica son un candidato, no el único criterio (DP-2);
- contorno inmutable;
- `area` bruta (DP-6 aplazada).

## 6. Estado por fases

| Fase | Estado | Documentos |
|---|---|---|
| F0–F1 (A0–A9) | **Cerrada** (`1cc1065`): modularización sin cambios visibles; validaciones A4–A9 en CEP real, revertidas | `HANDOFF.md` §1–§17, `docs/fase1/*` |
| F2.0 | Diagnóstico de KI-22 | `docs/fase2/00…08` |
| F2A-0 | Oráculo exacto independiente | `docs/fase2/F2A0_*` |
| F2A-1 | Núcleo experimental = oráculo | `F2A1_INFORME.md` |
| F2A-2 / 2R / 2P | Adaptador, árbol, correcciones H-01/H-02, optimización (788/788 idénticos) | `F2A2_INFORME.md`, `F2A2R_INFORME.md`, `F2A2P_INFORME.md` |
| F2A-3 | Propuesta auditada; **Entrega 1** (I-1…I-4); **Entrega 2** (I-5…I-7, validación real) | `F2A3_PROPUESTA.md`, `F2A3_ENTREGA1_INFORME.md`, `F2A3_ENTREGA2_INFORME.md` |
| RC 3.0.0-rc.1 | **Preparado**, APTO CON RESERVAS | `docs/release/TESSERACT_V3_RELEASE_CANDIDATE.md` |
| F2B y siguientes | No iniciadas, no autorizadas | `docs/PLAN_MAESTRO_V3.md` |

## 7. Release candidate 3.0.0-rc.1

| Dato | Valor |
|---|---|
| Identidad | `com.tato.tesseract.v3.experimental.panel`, menú «Tesseract V3 (experimental)», manifiesto 3.0.0, ILST `[0.0,99.9]`, CSXS 12.0 |
| Commit de origen | `7258524024aa20a0f987c6c72d6228849917a368` |
| `main.js` | `b36f3d8998555391627cc995a73e1f63714624015122b5e9a1400fe7d8275428`: construido, instalado y validado [REAL] |
| Artefacto | `release/tesseract-v3-3.0.0-rc.1.zip`, sha256 `8f4edc7d288ac12f01913a73d92e54965494b5ccf8d4b2b0485cffaa9dd08d75`. **Excluido de git** a propósito; se reconstruye byte a byte con `node tools/build/build-rc.mjs --commit 7258524 [--verify]` |
| Firma | **Sin firmar**: carga solo con `PlayerDebugMode=1`, ya configurado y no modificado. Evaluación de ZXP/UPIA en el informe del RC §9 |

## 8. Pruebas automatizadas, evidencias y limitaciones

**Baterías** (última ejecución: RC, `docs/release/evidencia/run-all-RC.txt`) [AUTO]:
- `tests/run-all.sh` → **TODO EN VERDE**: aislamiento estricto, `dist-a9`, Node 662 + 1 omitida, navegador 52, a7 13, a8 31, a9 32, Chromium-99 4, puente 6, a5-observar 3, A4-CDP 7.
- Después, `tests/run-experimental.sh` → **464/464**.
- Se ejecutan **siempre en secuencia** (hay una carrera conocida entre `install-dry-run` y `a4-herramienta`).
- Con el experimental instalado, el paso 1 de `run-all` (aislamiento estricto) falla **a propósito**: hay que retirarlo y restaurarlo (§13).

**Pruebas experimentales clave:**
- `tests/experimental/f2a1-*`: núcleo = oráculo.
- `f2a2-*` y `f2a2r-hallazgos`: adaptador, árbol, H-01/H-02.
- `f2a3-contratos`: consumidores reales sobre modelos congelados.
- `f2a3-motor` (18), `f2a3-selector` (62), `f2a3-bundle` (11), `f2a3-navegador` (6), `f2a3-interfaz` (5), `f2a3-instalador` (6).
- `f2a3-cep-evidencia` (5) y `f2a3-rc` (8): fijan la evidencia real y la reproducibilidad.

**Evidencias reales** (todas en git; GitHub las muestra):
- `docs/release/evidencia/` (RC): JSON por ejecución, `capturas/` del panel real, `exportaciones/` (GLB y PNG), `rendimiento-*.json`.
- `docs/fase2/evidencia/f2a3-cep/` (Entrega 2).
- `docs/fase1/a4-real … a9-real/` (F1).

**Limitaciones de las pruebas:**
- Chrome headless **no es CEP**: la compatibilidad con Chromium 99 se emula eliminando las APIs posteriores [AUTO], y se confirma en CEP real solo para los flujos de §9.
- El corpus real son 2 documentos desechables (N0-A y N0-B).
- Windows no se ha probado.

## 9. Resultados en Illustrator real [REAL]

Todo con documentos **desechables** (N0-A, N0-B), cerrados sin guardar; N0-B quedó idéntico antes y después.

| Comprobación | Resultado |
|---|---|
| Carga y convivencia | Menú: Libraries, Tesseract, **Tesseract V3 (experimental)**, Validador editorial; 4 motores CEP a la vez sin errores de JavaScript |
| Extracción, validación y 2D | `Extraction complete`, `✅ No problems found`, vista 2D dibujada |
| Sombra = legacy | GLB plano **`737bcd23…`** y GLB con arte **`b4973a54…`** byte a byte iguales a las referencias reales de A4–A9, **también por el diálogo nativo** |
| Activo | Caja Botánica 13 paneles / 12 pliegues; GLB plano `7da50989…`; con arte `f497a548…` (estable entre versiones) |
| Shift+clic / Alt+clic | Funcionan en los dos modos y tras plegar (CDP `Input.dispatchMouseEvent` escalado por `devicePixelRatio` 1,25); 0 `Pick error` |
| Base, ángulos, Reset, materiales, espesor, PNG | Correctos en los dos modos |
| Diálogo nativo «Save GLB» | Guardar = mismos bytes que la ruta sustituida; Cancelar no escribe; KI-25 visible |
| Recuperación | Cambio de base fallido ⇒ base y ángulos conservados; detención sin restos; fallback legacy visible (fallos provocados con `simularFallo`) |
| Cambio de documento / recarga | KI-30: la base se reinicia; recargar ⇒ SOMBRA |
| Instalación / desinstalación / reinstalación | Con reinicio de Illustrator: el menú aparece y desaparece; las demás extensiones quedan idénticas (snapshot) |

**Interacciones manuales** (a ojo del usuario): solo las de A9 (bundle normal). En el RC, las interacciones se hicieron con **entrada de confianza por CDP**, que no es una mano humana [PENDIENTE: confirmación manual del usuario].

## 10. Panel y flujos de uso

1. Abrir **Ventana ▸ Extensiones ▸ Tesseract V3 (experimental)**. Bajo la línea de estado aparece la **barra de motor**: «Motor: SOMBRA (legacy)», la construcción actual y los diagnósticos.
2. **Test Connection** (opcional) → **Extract Dieline** (lee `Cuts`/`Creases`; valida y dibuja en 2D; Debug muestra el JSON) → **Continue to 3D**.
3. **En 3D:**
   - orbitar arrastrando; desplazar con botón derecho o Shift+arrastre; rueda para el zoom;
   - **Shift+clic** sobre un panel = base;
   - **Alt+clic** sobre una línea roja = crease seleccionada;
   - pestaña **Material**: stock y espesor;
   - pestaña **Artwork**: «Refresh Artwork» desde las capas o mesas `Front`/`Back`;
   - pestaña **Creases**: deslizadores por pliegue, ALL, Reset Flat y select de base;
   - pestaña **Debug**.
4. **Export GLB** abre el diálogo nativo de Illustrator. El botón PNG está oculto (KI-12).
5. **Motor experimental:** «Activar experimental» → «Confirmar» → volver a construir. La barra muestra «ACTIVO (experimental)». «Volver a sombra» revierte. **Nada persiste**: al recargar vuelve a sombra.
6. **Mensajes de la barra:**
   - fallback («…usa el motor LEGACY completo»);
   - detención («Construcción DETENIDA…»);
   - base fallida («No se pudo cambiar la base…»);
   - diagnósticos agrupados.

## 11. Materiales, texturas, arte y exportación

- **Materiales:** presets Kraft, Gray y White board (`src/scene/materials.js`); espesor en mm. La extrusión, los cantos y los puentes de pliegue usan el stock.
- **Arte:**
  - `src/host/art.js` exporta Front/Back a PNG temporales: modo capas o mesas de trabajo.
  - KI-23: el artboard se redondea a pt enteros.
  - KI-21: no restaura la mesa activa si falla.
  - `src/scene/artwork.js` lo proyecta sobre toda la mesa.
  - KI-26/KI-27: mensajes de error de textura [PENDIENTE de confirmar].
- **GLB:**
  - `src/export/*`: unidades **mm** (KI-03, la especificación pide metros); `roughness 1`; arte con 2 imágenes.
  - **KI-02:** 12 errores del validador Khronos (normales de longitud 0).
  - KI-13: arte de 4096 px ⇒ ~18 MB y ~1,4 s.
- **PNG:** `toDataURL` del lienzo + `<a download>`, con el botón oculto (KI-12). En el RC se validó capturando la URL.

## 12. Compatibilidad CEP / Chromium 99

- **Validado [REAL]:** Illustrator 30.8.2 (2026), CEP 12.1.1, Chromium 99.0.4844.84, macOS.
- **Construcción:** el código se construye con `esbuild --target=chrome99` sin avisos, y las pruebas buscan APIs posteriores a la 99 [AUTO].
- **Particularidades medidas en real:**
  - `devicePixelRatio` = 1,25 en el panel;
  - con el diálogo modal de ExtendScript abierto, el renderizador del panel queda bloqueado;
  - Escape no llega al diálogo «Save As»; Cmd+punto sí.
- **No probado:** Windows; versiones de Illustrator anteriores a la 30.8.

## 13. Identidad, instalación, desinstalación y rollback

| Extensión | Identidad | Ubicación | Estado |
|---|---|---|---|
| Tesseract original | `com.tato.tesseract.panel` | `/Library/Application Support/Adobe/CEP/extensions/tesseract` | **Intacto**: byte a byte = `reference/legacy-baseline` (`verify-isolation.sh`) |
| Validador editorial | `com.tato.editorialvalidator.panel` (carpeta `TesserArt_Validator`) | `~/Library/…/CEP/extensions/TesserArt_Validator` | **Intacto** (snapshot idéntico) |
| V3 normal | `com.tato.tesseract.v3.panel` | (no instalado) | — |
| V3 RC / experimental | `com.tato.tesseract.v3.experimental.panel` | `~/Library/…/CEP/extensions/tesseract-v3-experimental` (`.debug`, puerto 8089) | **Instalado**, `main.js` `b36f3d89…` |

**Instalar** (requiere la fecha de una autorización expresa):

```bash
node tools/build/build-experimental.mjs
```

```bash
tools/a4/a4-experimental.sh preflight
```

```bash
tools/a4/a4-experimental.sh install --autorizado-por-usuario=AAAA-MM-DD [--debug-port=8089]
```

Después, reiniciar Illustrator.

**Desinstalar / rollback** (borra solo la carpeta experimental y se niega con otra identidad; después hay que reiniciar Illustrator):

```bash
tools/a4/a4-experimental.sh uninstall --autorizado-por-usuario=AAAA-MM-DD
```

**Aislamiento:**

```bash
tools/verify-isolation.sh
```

```bash
tools/verify-isolation.sh --experimental-instalado
```

El primero es el estricto (sin V3 instalado) y el segundo admite solo el experimental, idéntico a `dist-experimental/`.

**Rollback del código:** volver a cualquier punto de §19. `src/` no cambió desde F1: el producto normal no requiere rollback.

## 14. Rendimiento y memoria [REAL, MEDIDO]

Medido en CEP real, N0-A, 5 ejecuciones por modo con el panel recién cargado. Medianas:

| Medida | Sombra | Activo |
|---|---|---|
| Extracción | 54 ms | 54 ms |
| 3D | 67 ms | 72 ms |
| `buildPanels` | 12,7 ms | 16,2 ms |
| Adyacencias | ≤ 0,6 ms | ≤ 0,6 ms |
| Árbol | 0,3 ms | 0,3 ms |
| Plegado síncrono | 3,4 ms | 3,6 ms |
| Plegado hasta pintar | 60 ms | 63 ms |
| GLB | 32 ms | 32 ms |
| Heap JS tras construir | 4,8 MB | 5,4 MB |

- En sombra, la ejecución diferida del experimental añade 13 ms, **después** de que la interfaz responde.
- Metodología y rangos: informe del RC §5. La GPU no se midió.
- Las cifras de Node (F2A-2P) **no** son CEP.

## 15. Problemas conocidos por severidad

Detalle completo en `docs/KNOWN_ISSUES.md` (KI-01…KI-34).

| Severidad | Problema | Estado en el RC |
|---|---|---|
| **Crítica (geometría legacy)** | **KI-22** el resultado depende de la escala; **KI-04** se descartan paneles reales (11 de 13) | **Presentes en el legacy** (también en sombra, por diseño); **corregidos con el motor experimental** [REAL/AUTO] |
| Alta | **KI-02** GLB con 12 errores de Khronos (normales nulas) | Presente en los dos motores [AUTO] |
| Alta (legacy) | **KI-31** depende del sentido del contorno · **KI-32** coordenadas grandes · **KI-33** soldadura lateral · KI-17/18/19 pérdidas silenciosas | Legacy; el experimental no las tiene [AUTO] |
| Media | **KI-24** cambiar el stock **antes** del 3D lanza `ReferenceError` · **KI-21** el arte no restaura la mesa activa si falla · **KI-10** grupos anidados en Cuts/Creases fallan en la extracción · KI-05/06/07 huecos y curvas · KI-08 coste n^2.5 · KI-09 · KI-11 render continuo · KI-13 | Presentes (código compartido sin cambios) [AUTO/ESTÁTICO] |
| Media | **KI-03** GLB en mm | Pendiente de la calibración en Dimension |
| Baja / cosmética | **KI-25** el mensaje final tapa la ruta guardada · **KI-12** botón PNG oculto · **KI-14** «0.3mm» para 0,25 · KI-16 · **KI-29** Alt+clic puede elegir la crease vecina | Presentes [REAL para KI-25/KI-12/KI-14] |
| Pendiente de confirmar | KI-26, KI-27, KI-28 | [PENDIENTE] |
| **Corregidas en el RC** (solo bundle experimental) | **KI-30** (base entre documentos y motores); cambio de base no transaccional; ausencia de indicador de motor | [REAL] |

## 16. Riesgos para documentos y para producción

- **Documentos:**
  - la extracción es de solo lectura [REAL en A4–A9 y RC: documento idéntico antes y después];
  - el arte exporta PNG temporales y cambia la visibilidad o la mesa activa, y la restaura [REAL];
  - **KI-21**: si falla una exportación de arte en modo mesas, la mesa activa puede no restaurarse (riesgo bajo; no destruye contenido) [ESTÁTICO/AUTO];
  - el plugin **no escribe en el documento**.
  - Herramientas de validación: `run-nivel0.mjs a4-open` exige 0 documentos abiertos y cierra **solo** documentos N0-* sin guardar. Un documento de trabajo del usuario estuvo abierto una vez durante la Entrega 2 y **no se tocó** (se preguntó).
- **Producción:**
  - paquete sin firmar;
  - corpus real reducido para el motor experimental;
  - límite de fallback de la API v1 (detención visible, nunca mezcla);
  - las baterías estrictas exigen retirar temporalmente el experimental.

## 17. Pendiente y mejoras opcionales

**Pendiente** (requiere decisión o autorización del usuario):
1. Firma ZXP: certificado, `ZXPSignCmd` y canal de distribución.
2. Corpus real más amplio antes de hacer predeterminado el experimental.
3. Llevar KI-30, la base transaccional y el indicador al bundle normal, si se mantiene (cambiaría `dist-a9`).
4. Confirmación manual de Shift+clic y Alt+clic en el RC.
5. Contrato v2 transaccional (`buildModel`).
6. F2B y fases 3–7 del plan maestro (materiales PBR, acabados, visor, exportaciones OBJ/PNG, Photoshop/Dimension).

**Mejoras opcionales:**
- KI-02 (normales del GLB), KI-24, KI-25, KI-12, KI-14;
- presupuesto de memoria de GPU;
- Windows.

## 18. Restricciones (no alterar el plugin original)

- **Nunca** modificar `/Library/Application Support/Adobe/CEP/extensions/tesseract` ni `reference/legacy-baseline/` (solo lectura, con huellas).
- **Nunca** modificar ni desinstalar `TesserArt_Validator`.
- **No** cambiar `PlayerDebugMode` ni otras preferencias o permisos de Adobe sin autorización expresa.
- **No** publicar V3 en `tdotp/-tesseract-illustrator-plugin` (público, MIT, versión antigua).
- **No** tocar `src/`, `panel/`, goldens, huellas ni fixtures sin un paso aprobado; **no** actualizar `dist-a9` para ocultar diferencias.
- **Git:**
  - autor único **Gerardo Calambas posada**;
  - **sin trailers `Co-Authored-By` ni «Generated with»** (preferencia del usuario sobre el código propietario);
  - sin squash, rebase ni force push;
  - push solo con autorización.
- **Illustrator:**
  - no cerrar documentos del usuario sin preguntar;
  - si Illustrator responde «Cancelado por el usuario» (−128) a la orden de salir, no forzarla.

## 19. Repositorio, rama, commits y puntos de recuperación

| Punto | SHA | Qué es |
|---|---|---|
| Cierre de F1 | `1cc1065` | Producto modularizado, validado en CEP real |
| F2A-2P | `63db9fa` | Optimización experimental cerrada |
| Propuesta F2A-3 | `8cda001` | Auditada (C-01…C-03) |
| Entrega 1 | `0eb339f2e06f71103a8ee77c1ac57223ab30f691` | I-1…I-4 (último commit publicado antes de este handoff) |
| Entrega 2 | `ec5f5d81f735b23b11f8dcc2da674fbc29c3e4e3` | I-5…I-7, validación real |
| RC | `7258524024aa20a0f987c6c72d6228849917a368` / `2a55610c349f87ceb540d1a06e1a3989b40c17bf` | Origen del artefacto / informe del RC |
| Este handoff | `git log -1` | Punto principal de recuperación |

**Repositorios:**
- **Local:** `main`, sin remoto (los pushes se hacen por URL).
- **Auditoría:** `https://github.com/tdotp/tesseract-v3-audit`, rama `audit/f2a2`.
- **Público antiguo:** `tdotp/-tesseract-illustrator-plugin` (no tocar).

**Commits desde la Entrega 1:**
- `65eb807` I-6
- `a00bfe4` I-5
- `3ba72a3` I-7
- `ec5f5d8` informe de la Entrega 2
- `217b233` tiempos y diagnósticos
- `7258524` RC
- `2a55610` informe del RC
- el commit de este handoff

## 20. Cómo retomar

1. Comprobar el repositorio:

   ```bash
   cd "/Users/gerardocalambasposada/Documents/Antigravity/Tesseract/Tesseract v3" && git log --oneline -3 && git status --short
   ```

   Esperado: HEAD = commit de este handoff, árbol limpio.
2. Verificaciones sin efectos:

   ```bash
   node tools/build/build.mjs --verify
   ```

   ```bash
   node tools/build/build-experimental.mjs --verify
   ```

   ```bash
   node tools/build/build-rc.mjs --commit 7258524 --verify
   ```

   ```bash
   tools/verify-isolation.sh --experimental-instalado
   ```

   ```bash
   tools/a4/a4-experimental.sh verify
   ```

   Esperado: `dist-a9`, `b36f3d89…`, zip `8f4edc7d…`.
3. Leer, por orden: este documento → `docs/release/TESSERACT_V3_RELEASE_CANDIDATE.md` → `HANDOFF.md` §26–§28 → `docs/KNOWN_ISSUES.md`.
4. Para ejecutar las baterías completas:
   1. retirar el experimental:

      ```bash
      tools/a4/a4-experimental.sh uninstall --autorizado-por-usuario=AAAA-MM-DD
      ```

   2. ejecutar `tests/run-all.sh` y **después** `tests/run-experimental.sh`;
   3. reinstalar y verificar.
5. Para validar en real: Illustrator sin documentos, `node tools/illustrator/run-nivel0.mjs a4-open N0-A`, `node tools/a4/f2a3-cep.mjs identidad|caja|arte|recarga` y `node tools/a4/f2a3-rc-real.mjs interacciones|dialogo|rendimiento|preparar`.
6. **Esperar la autorización expresa** antes de cualquier tarea de §17.

---

## 21. Inventario de auditoría (GPT-6)

| Área | Archivos principales | Qué revisar | Evidencia existente |
|---|---|---|---|
| Código de producción | `src/main.js`, `src/ui/*`, `src/app/*`, `src/scene/*`, `src/fold/*`, `src/export/*`, `src/host/*`, `src/bridge/*` | Corrección, estados de error, fugas, acoplamiento | Pruebas de F1 (`tests/node/*`, `tests/browser/*`); `docs/fase1/A*_INFORME.md` |
| Panel y archivos CEP | `panel/index.html`, `panel/style.css`, `panel/CSXS/manifest.xml`, `panel/libs/three.min.js` (r132) | Manifiesto, permisos, recursos | `build.test`, `chromium99-compat` |
| Motor legacy | `src/core/legacy/*.js`, `src/core/engine.js` | KI-04/17/18/19/22/31/32/33 (presentes por diseño) | `tests/node/known-issues*.test.mjs`, `docs/fase2/01_DIAGNOSTICO_KI22.md` |
| Motor experimental | `experimental/geometria/*.js` | Exactitud de los predicados, arreglo, ajuste ε, rendimiento (criterio 5) | `tests/experimental/f2a1-*`, `tests/lib/f2/oraculo.mjs`, `F2A1_INFORME.md` |
| Modelos y DCEL | `experimental/plegado/adaptador.js` (+ `f2a2.detalle`) | Conversión a `PanelModel` v1, anillos y huecos, coherencia | `f2a2-adaptador`, `f2a2-legacy` |
| Adyacencias y árbol | `experimental/plegado/arbol.js` | H-01/H-02, uniones, ciclos, bases, signos | `f2a2-arbol`, `f2a2r-hallazgos`, `F2A2R/F2A2P_INFORME.md` |
| Render 3D / three.js | `src/scene/viewport.js`, `panel-meshes.js`, `crease-visuals.js`, `three-utils.js` | Recursos de GPU (KI-01, KI-11), cámara | `tests/browser/browser.test.mjs` (soak GPU), `a7.test.mjs` |
| Picking e interacciones | `src/ui/picking.js`, `src/ui/fold-controls.js`, `src/scene/viewport.js` | KI-29; doble manejador pointer/mouse | `a9.test.mjs`; `docs/release/evidencia/interacciones-*.json` [REAL] |
| Arte y materiales | `src/host/art.js`, `src/scene/artwork.js`, `src/scene/materials.js`, `src/app/actions.js` | KI-21/23/24/26/27 | `nivel0`, A4–A9-CEP, `arte-*.json` [REAL] |
| PNG y GLB | `src/export/*.js`, `src/bridge/fs.js`, `src/host/save-dialog.js` | KI-02/03/12/13/25/28 | `glb-inspector`, `a8.test.mjs`, `dialogo-*.json` [REAL] |
| Selector y aislamiento | `experimental/integracion/{selector,motor-v1,entrada-cep}.js` | C-01/C-02/C-03, mezclas, sombra | `f2a3-selector`, `f2a3-motor`, `F2A3_ENTREGA1_INFORME.md` |
| Interfaz del RC | `experimental/integracion/{interfaz-cep,fold-controls-cep,controller-cep}.js` | KI-30, base transaccional, mensajes, accesibilidad de la barra | `f2a3-interfaz`, `F2A3_ENTREGA2_INFORME.md` |
| Bundles | `tools/build/build.mjs`, `build-experimental.mjs`, `tests/golden/dist-a9.SHA256SUMS` | Paridad, sustituciones, reproducibilidad | `f2a3-bundle`, `build.test` |
| Build, instalación y empaquetado | `tools/build/build-rc.mjs`, `tools/a4/a4-experimental.sh`, `tools/verify-isolation.sh`, `tools/install.sh` | Seguridad de las rutas, rollback, determinismo | `f2a3-instalador`, `f2a3-rc`, `install-dry-run` |
| Tests, fixtures, oráculos y goldens | `tests/run-*.sh`, `tests/lib/**`, `tests/fixtures/**`, `tests/golden/**` | Calidad y cobertura; ninguna aserción relajada | `docs/release/evidencia/run-all-RC.txt` |
| Rendimiento, memoria, compatibilidad | `tools/a4/f2a3-rc-real.mjs`, `tools/f2/rendimiento-plegado.mjs` | Metodología; GPU sin medir | `docs/release/evidencia/rendimiento-*.json` [REAL] |
| UI, UX, accesibilidad, errores | `panel/index.html`, `src/ui/*`, `interfaz-cep.js` | Navegación por teclado, contraste, mensajes [PENDIENTE: sin auditoría de accesibilidad] | Capturas `docs/release/evidencia/capturas/` |
| Documentación y deuda | `HANDOFF.md`, `docs/**`, `docs/KNOWN_ISSUES.md`, `docs/PLAN_MAESTRO_V3.md` | Coherencia y deuda | — |
| Seguridad de instalación y distribución | `tools/a4/*.sh`, `.debug`, `PlayerDebugMode`, firma (RC §9) | Superficie de DevTools remoto (puerto 8089 solo en 127.0.0.1), paquete sin firmar | Informe del RC §9 |

**Archivos que GPT-6 no podrá consultar desde GitHub:**
- `release/` (artefacto RC, excluido a propósito; se reconstruye con `build-rc.mjs`);
- `dist/` y `dist-experimental/` (construidos; se reconstruyen);
- `tests/results/` (salidas locales; lo relevante está copiado en `docs/**/evidencia/`);
- `node_modules/` (solo esbuild);
- la extensión instalada en `~/Library` y `/Library`;
- los registros de CSXS.
