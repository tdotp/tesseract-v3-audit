# Fase 1 · A5 — Propuesta de refactorización estructural controlada (para revisión)

Fecha: 2026-10-23 · Punto de partida: `fac94bb` (A4 ejecutado y revertido) · Estado: **PROPUESTA. No se ha modificado código de producto, pruebas ni herramientas.**
Etiquetas: **[MEDIDO]** · **[CONFIRMADO por lectura]** · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Verificación inicial (antes de cualquier cambio)

| Comprobación | Resultado |
|---|---|
| Git | HEAD `fac94bb`, árbol limpio, sin remoto, un solo autor, 0 commits con trailers de IA [MEDIDO] |
| Baseline congelado | 15/15 archivos = `reference/legacy-baseline.SHA256SUMS` [MEDIDO] |
| `panel/` | 14/14 huellas = `tests/golden/panel.pins.json`; `main.js` sha256 `91b42b7b…1706` (baseline + parche A1) [MEDIDO] |
| Aislamiento | `tools/verify-isolation.sh` verde; extensión instalada = baseline; **V3 no instalado** (CEP de usuario solo contiene `TesserArt_Validator`) [MEDIDO] |
| Batería | `tests/run-all.sh --mutations` → **TODO EN VERDE**: Node 233/233 · navegador 44/44 · Chromium-99 con APIs reducidas 4/4 · A4-CDP 7/7 · controles negativos 26/26 (11 + 10 + 5) [MEDIDO] |

## 2. Lo que condiciona cómo se puede modularizar (hallazgos de la inspección)

1. **Las pruebas leen el código por texto, no por módulo.** `tests/lib/legacy.mjs` extrae 24 funciones de geometría **por nombre y con sangría exacta de 4 espacios**, y las constantes con expresiones regulares (`^    var GRAPH_EPS = …`). Si una función se mueve a un módulo, el objetivo «panel» deja de cargarse.
2. **El arnés de navegador inyecta `window.__dbg` dentro de la clausura.** `tools/baseline/setup_harness.py` inserta, justo antes de `function setStatus(m){…}`, un objeto con *getters* sobre variables de la clausura (`renderer3d`, `scene3d`, `camera3d`, `orbitState`, `foldTree`, `panelMeshes`, `foldAngles`, `foldData`, …). Si `setStatus` o ese estado se mueven de ámbito, los getters fallan en ejecución. Un segundo parche se ancla en el texto de `pathToFileURL`.
3. **El bundle está fijado por huellas en tres sitios** (`tests/golden/dist.SHA256SUMS`, `build.test.mjs`, `tests/lib/dist.mjs`) y la evidencia de A4 fija el `main.js` cargado en el CEP real (`bc260695…b5bd`). Cualquier refactorización cambia los bytes del bundle.
4. **Los controles negativos mutan `panel/main.js` por `sed`** con patrones textuales (26 mutaciones).
5. **Rutas del puente CEP sin prueba alguna** [MEDIDO por búsqueda]: resultado `EvalScript error.`/vacío/`null`, JSON inválido («Parse error»), `{error}` del extractor, CEP ausente (`ensureCep`), «Nothing to build/preview», botón Test Connection en el arnés, guardado cancelado / descarga de respaldo / fallo de `cep.fs.writeFile`. Son exactamente las rutas que A5 movería.
6. **Defecto latente no registrado (propuesto como KI-24)** [CONFIRMADO por lectura, en baseline y `panel/`]: `applyMaterialPreset` llama a `buildChildrenOfMap()`, **que no existe**. Cambiar el stock (White/Kraft/Gray) **antes** de pasar a 3D actualiza el preset y la UI y después lanza `ReferenceError` (consola). Con un modelo 3D construido no ocurre (va por la rama de reconstrucción). Se **preserva** y se fija con una prueba.
7. Mapa de acoplamiento (análisis léxico de las 101 funciones de la clausura; `CREASE_HINGE_SEGMENTS` está declarada y no se usa): las funciones de geometría pura solo dependen de `GRAPH_EPS`, `TOLERANCE_MM` y `log`, **salvo** `validateGeometry`, que escribe DOM (`problemsList`, `validationStatus`, `continueBtn`) y llama a `render2D`. Escena, pliegue y UI comparten ~35 variables de clausura (detalle en el anexo A).

Consecuencia: **antes de mover una sola función hay que preparar la red** (paso A5.0); y en A5 conviene mover solo lo que **no comparte estado de escena** para que el anclaje de `__dbg` siga siendo válido sin tocar el arnés del baseline.

## 3. Mapa modular objetivo (Fase 1 completa) y qué entra en A5

```
src/                       (módulos ES; esbuild los empaqueta en UN IIFE para Chromium 99 → dist/main.js)
  main.js                  raíz de composición (al principio: copia exacta de panel/main.js)
  config/look.js           A5   presets de material, espesor por defecto, constantes visuales (CREASE_*, FOLD_BRIDGE_*, ART_*)
  host/                    A5   ExtendScript como CADENAS idénticas (extract, art, test, save-dialog)
  bridge/cep.js            A5   evalScript (crudo y JSON), detección de CEP, pathToFileURL
  bridge/fs.js             A5   diálogo de guardado vía Illustrator, cep.fs.writeFile, descarga de respaldo
  core/legacy/             A6   geometría vigente sin cambios (+ TOLERANCE_MM, GRAPH_EPS) · validate · topology · panels · adjacency · fold-tree
  core/engine.js           A6   interfaz GeometryEngine con UNA implementación: 'legacy' (sin interruptor en la UI)
  state/                   A7   contenedor explícito de las ~35 variables
  scene/                   A7   renderer, órbita, paneles, bisagras, etiquetas, arte, picking + ResourceTracker (estructura de la corrección A1)
  export/glb.js            A8   escritor GLB envuelto sin cambios (mm, mismos bytes)
  ui/                      A9   vistas DOM, panel de pliegue, tabs (mismos ids, atajos y CSS)
panel/                     estáticos (index.html, style.css, libs/, CSXS/, iconos) — main.js queda CONGELADO como «referencia A1»
```

Reglas de dependencia (verificadas por prueba a partir de A5): `host` no importa nada · `bridge` importa `host` y solo toca `window.__adobe_cep__`/`window.cep` **en el momento de la llamada** (nunca al cargar el módulo) · `config` no importa nada · nada de `src/` salvo `main.js` toca el DOM en A5 · ningún módulo de A5 importa `THREE`.

## 4. Alcance propuesto para A5 (lo de menor riesgo) y lo que queda fuera

**Dentro de A5:** preparación de la red de pruebas, `config/look`, `host`, `bridge/cep`, `bridge/fs`.
**Fuera de A5 (cada uno con su propio punto de control):** geometría y tolerancias (A6), estado/escena/plegado/órbita/arte/fuga (A7), exportación GLB (A8), UI y cableado (A9), cualquier `GeometryEngine` (A6), KI-22, three.js, unidades GLB, `.jsx` reales (diferido por doc 09), instalación en CEP.

## 5. Secuencia exacta de A5 (un commit por paso; batería completa + mutaciones en verde antes de cada commit)

| Paso | Qué se hace | Contrato / dependencias | Prueba de equivalencia |
|---|---|---|---|
| **A5.0a** Caracterización del puente (solo pruebas) | Nuevas pruebas de navegador con variantes del *shim* CEP: `EvalScript error.`, vacío, `null`, JSON inválido, `{error}` del extractor y del arte, CEP ausente, Test Connection, «Nothing to build/preview», guardado cancelado / descarga de respaldo / `writeFile` con `err≠0`, **KI-24** (stock antes de 3D ⇒ `ReferenceError` y estado resultante). Cada caso registra estado visible (`status`, `error-msg`, botones, textarea, consola, descargas) | No cambia producto ni arnés del baseline | Deben pasar **sobre el código sin mover**: baseline = `panel/` en todos los casos. Registrar KI-24 en `KNOWN_ISSUES.md` |
| **A5.0b** Andamiaje sin cambio de código | `src/main.js` = **copia byte a byte** de `panel/main.js`; `build.mjs` toma la entrada de `src/main.js` y los estáticos de `panel/`; `panel/main.js` queda congelado (huellas intactas) como **referencia A1**; cargador de Node con objetivo `src`; mutaciones redirigidas a `src/`; nueva huella vigente `tests/golden/dist-a5.SHA256SUMS` y la de A3/A4 queda **intacta** como histórica (la evidencia de A4 sigue apuntando a ella) | — | **Prueba fuerte:** el `dist/main.js` producido desde `src/` debe ser **byte a byte** el de A4 (`bc260695…b5bd`). Tres objetivos en navegador: baseline · referencia A1 (`panel/`) · bundle desde `src/` |
| **A5.1** `config/look.js` | Mueve `DEFAULT_THICKNESS_MM`, `MATERIAL_PRESETS`, `CREASE_HINGE_*`, `FOLD_BRIDGE_*`, `CREASE_LINE_Z_OFFSET`, `ART_*` como `export const` con los mismos valores. **`TOLERANCE_MM` y `GRAPH_EPS` NO se mueven** (van con la geometría en A6) | Comprobado [MEDIDO por búsqueda]: ninguna de las 11 se reasigna ni se muta (hoy son `var`; como módulo pasan a solo lectura) | `constants.golden.json` sobre el objetivo `src`; píxeles, escena, GLB byte a byte; mutaciones de preset/espesor/offset siguen detectadas |
| **A5.2** `host/*` | `EXTRACT_SCRIPT`, `buildArtworkExportScript()`, el JSX de Test Connection y el del diálogo de guardado pasan a módulos que exportan **las mismas cadenas** | Funciones/constantes puras, sin estado | Igualdad de cadena (y SHA-256) baseline = `src` para los 4 textos; pruebas de la maqueta de Illustrator (`extraction`, `artwork-script`) ejecutadas sobre los textos de `src`; mutaciones `PT` y tope 800 detectadas |
| **A5.3** `bridge/cep.js` | `evalScriptJSON`, `pathToFileURL`, `evalScript(script, cb)` (envoltorio crudo para Test y Extract, que conservan su propio manejo de errores), `hasCep()`; `ensureCep` sigue en `main.js` (toca DOM) y consulta `hasCep()` | Lectura perezosa de `window.__adobe_cep__`; mismas cadenas de error; mismo orden de *callbacks* (asincronía idéntica: sin `await` añadido) | A5.0a completo + arte (UV, offsets) + parche 2 del arnés aplicado (aserción de 1 coincidencia) |
| **A5.4** `bridge/fs.js` | `askSavePathViaIllustrator`, `blobToBase64`, `triggerDownload`, `saveBlobWithDialog` | Mismo contrato de retorno `{cancelled, path, fallback}`; mismos mensajes | A5.0a (cancelado/respaldo/error) + GLB byte a byte guardado por el *shim* de `saveDialog` |
| **A5.5** Cierre | Prueba de límites de importación (reglas de §3), informe `A5_INFORME.md`, `KNOWN_ISSUES.md` y `HANDOFF.md` actualizados | — | `run-all.sh --mutations --soak`; `verify-isolation.sh`; **punto de control PC6** |

Estimación [INFERENCIA]: 1,5–2,5 días de trabajo asistido (A5.0 es la mayor parte).

## 6. Pasos posteriores (NO incluidos en A5; cada uno exige aprobación aparte)

| Paso | Contenido | Riesgo | Puerta |
|---|---|---|---|
| A6 | `core/legacy` (24 funciones, texto idéntico; `validateGeometry` separado de su escritura en DOM mediante un *sink* inyectado) + `GeometryEngine` con solo `legacy` | Medio (geometría) | **G2**: `geometry.golden.json` y `illustrator-real.golden.json` idénticos para `src`; 11/13 preservado |
| A7 | `state` + `scene` + `ResourceTracker` (absorbe el parche A1); requiere sustituir el anclaje de `__dbg` por un gancho de pruebas explícito **solo en la copia del arnés** | **Alto** | Píxeles 4 poses, picking, GPU Δ=0 |
| A8 | `export/glb` envuelto sin cambios | Medio | GLB byte a byte (2 fixtures × poses) |
| A9 | `ui` + `app` | Alto | Interacciones idénticas; validación en Illustrator (G3) |

## 7. Riesgos de A5 y mitigación

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | Romper el anclaje de `__dbg`/`pathToFileURL` del arnés y perder las pruebas de navegador | A5 no mueve `setStatus` ni estado de escena; el arnés ya aborta si no encuentra exactamente 1 coincidencia (fallo ruidoso, no silencioso) |
| R2 | El renombrado de identificadores de esbuild al fusionar módulos cambia el texto que buscan los parches | Igual que R1; además prueba que verifica el parche sobre el bundle en cada paso |
| R3 | Diferencias sutiles de asincronía en el puente (orden de *callbacks*, microtareas) | No convertir *callbacks* en `async/await`; pruebas A5.0a con secuencias observables |
| R4 | Cadenas ExtendScript alteradas (escape `\\` en literales) | Igualdad de cadena con SHA-256 contra el baseline antes de usarlas |
| R5 | Captura temprana de `window.__adobe_cep__` al cargar el módulo | Contrato de lectura perezosa + caso «CEP ausente» y caso «shim instalado después» |
| R6 | Constantes pasan de `var` a `const` de módulo | Comprobación previa de no reasignación; fallo sería un `TypeError` visible en las pruebas |
| R7 | Cambiar huellas «a mano» para que pasen | Las huellas históricas no se tocan; la vigente se regenera solo en el commit del paso, con su diff de bytes explicado |
| R8 | El puente real de Illustrator no se ejercita (solo el *shim*) | Riesgo residual declarado. Opcional, solo con autorización expresa: recarga A4 corta (P-0, P-1, P-7, P-8) del bundle de A5 |
| R9 | Equivalencia «incluidos los defectos» | KI-01 (corregido en A1) y KI-02…KI-24 quedan fijados por las pruebas existentes + A5.0a; ningún paso cambia geometría, tolerancias, GLB, arte ni UI |

## 8. Decisiones que necesito antes de empezar

1. **Alcance de A5:** ¿se aprueba A5 = §5 (red de pruebas + `config/look` + `host` + `bridge`), dejando geometría, escena, GLB y UI para A6–A9?
2. **Dónde vive el código nuevo:** ¿`src/` como fuente y `panel/main.js` congelado como «referencia A1» (huellas sin tocar)?
3. **Huellas del bundle:** ¿se aprueba añadir `tests/golden/dist-a5.SHA256SUMS` como huella vigente, dejando `dist.SHA256SUMS` de A3/A4 intacta como histórica?
4. **KI-24:** ¿registrarlo como defecto conocido preservado (corrección en la fase de UI)?

## Anexo A — Bloques de `panel/main.js` (líneas actuales, post-A1) y su acoplamiento [MEDIDO, análisis léxico]

| Líneas | Bloque | Usa THREE / DOM | Estado de clausura que lee o escribe | Destino |
|---|---|---|---|---|
| 7–42, 189–198 | Referencias DOM (`byId`) y aborto si faltan 20 elementos o el contexto 2D | DOM | — | A9 `ui` |
| 46–62 | Constantes | — | — | `TOLERANCE_MM`/`GRAPH_EPS` → A6; resto → **A5.1** |
| 64–85, 800–811 | ~35 variables de estado | — | — | A7 `state` |
| 87–138 | `setStatus`, `log`, getters de material, modo de interacción | DOM | `currentMaterialPreset`, `currentThicknessMm`, `interactionMode` | A9 (`setStatus` es ancla del arnés: no se mueve en A5) |
| 140–191 | Etiquetas de panel + caché (A1) | THREE + canvas | `labelCache` | A7 |
| 203–296 | `EXTRACT_SCRIPT` | — | — | **A5.2** |
| 301–382 | `ensureCep`, vistas, tabs, preset (KI-24), `pathToFileURL`, `evalScriptJSON` | DOM parcial | `currentPanelData`, `lastData`, … | puente → **A5.3**; resto → A9 |
| 384–446 | `buildArtworkExportScript` | — | — | **A5.2** |
| 448–564 | Arte: texturas, UV, overlays, `refreshArtwork` | THREE | `renderer3d`, `panelMeshes`, `currentArtState`, `foldData` | A7 |
| 569–625 | Validación (`validateGeometry` escribe DOM) | DOM | `problems`, `lastData` | A6 (con *sink*) |
| 630–662 | `render2D` | canvas | `problems` | A9 |
| 667–795 | Topología | — | `GRAPH_EPS`, `log` | A6 |
| 813–985 | Renderer, órbita, `init3D`, `clearAllMeshes` | THREE + DOM | todo el estado de escena | A7 |
| 990–1216 | Contornos, `buildPanels` (+ `shapeFromVerts`, THREE) | — | `GRAPH_EPS`, `log` | A6 (`shapeFromVerts` → A7) |
| 1218–1333 | `build3DFromPanels`, materiales, picking de panel, cámara | THREE | escena | A7 |
| 1338–1543 | Adyacencia, árbol, signo; ángulos mostrados | — / DOM (`updatePerCreaseRow`) | `foldSigns`, `foldAngles` | A6 (puros) / A9 |
| 1545–1849 | `dispose*` (A1), bisagras, visuales y picking de crease | THREE + DOM | escena + selección | A7 / A9 |
| 1854–1971 | `applyFolding`, `setBasePanel` | THREE | escena + pliegue | A7 |
| 1973–2155 | `buildFoldUI` | DOM | casi todo | A9 |
| 2157–2217 | Descarga, base64, diálogo de guardado, `cep.fs` | DOM mínimo | — | **A5.4** |
| 2219–2495 | PNG oculto, escritor GLB, `exportGLB` | THREE | `scene3d`, `foldRoot` | A8 |
| 2500–2688 | Cableado de eventos | DOM | todo | A9 |
