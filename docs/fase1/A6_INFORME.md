# Fase 1 · A6 — Separación del motor geométrico tras `GeometryEngine`: informe (punto de control PC7)

Fecha: 2026-10-25 · Autorización: el usuario aprobó `A6_PROPUESTA.md` y las decisiones D-A6-1…D-A6-10 el 2026-10-24 (D-A6-8 = B: preparar la validación en CEP real; **instalación NO autorizada**) · Base: `31459fc` · Cierre: commit de A6.7 (ver `git log`).
Estado: **A6 completada dentro del alcance aprobado. Nada instalado. A7, F2 y la validación en CEP real NO iniciadas.** Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Resumen
El motor geométrico vigente sale de la clausura de `src/main.js` a `src/core/legacy/` (8 módulos) y queda detrás de la interfaz **`GeometryEngine` v1** (`src/core/engine.js`), con una única implementación, `legacy`, y sin selector. Las 23 funciones movidas conservan **exactamente su texto**: solo cambian la sangría de la clausura y el `export`, y lo verifica una prueba. La única función cuyo texto cambia es `validateGeometry`, partida en cálculo puro (`validateDieline`) y presentación (D-A6-3). `main.js` llama al motor solo a través de `geometryEngine`. El resultado es idéntico al baseline por tres caminos: cargador por texto, **módulo ES real** y bundle en Chrome. Eso incluye los 11 de 13 paneles, los árboles de plegado, la validación con sus `id`, el log del motor (texto y orden), los píxeles y el **GLB byte a byte**. Los 36 controles negativos siguen detectándose y se añadieron 10 nuevos, todos detectados. No se corrigió ningún defecto.

## 2. Commits
| Commit | Paso | Contenido |
|---|---|---|
| `09dc069` | — | Propuesta aprobada con las decisiones anotadas + batería previa sobre `31459fc` |
| `083cd7e` | **A6.0a** | Caracterización sin tocar `src/`: golden de logs del motor desde el baseline (T6), contratos implícitos (T3), log de depuración en 5 flujos en navegador (T1); 3 controles nuevos |
| `8585aaf` | **A6.0b** | Andamiaje: huella vigente `dist-a6` (`dist-a5` congelada + T7), texto idéntico (T2), límites de `core/` (T5), cargador con definición única, mutaciones con «exactamente 1 línea» |
| `68a4960` | **A6.1** | `core/legacy/constants.js` (TOLERANCE_MM, GRAPH_EPS) |
| `20f5f25` | **A6.2** | `geom2d.js` (12 funciones), `topology.js`, `log.js` (*sink*) |
| `c6e9abb` | **A6.3** | `adjacency.js`, `fold-tree.js` |
| `ee13177` | **A6.4** | `panels.js`; 2 controles nuevos y lagunas de cobertura medidas |
| `62cbb56` | **A6.5** | `validate.js` con `validateDieline`; `validateGeometry` = presentación; 1 control nuevo |
| `26a1479` | **A6.6** | `core/engine.js` (contrato v1 + `createLegacyEngine`); las 7 llamadas vía `geometryEngine`; T4 sobre el módulo real; 4 controles nuevos |
| (A6.7) | **A6.7** | Cierre: este informe, procedimiento CEP preparado y su comparador, `KNOWN_ISSUES`, `tests/README`, `HANDOFF` |
Todos con un solo autor, sin trailers de IA y sin push. Cada paso se cerró con `tests/run-all.sh --mutations` en verde antes del commit (salidas en `docs/fase1/a6/run-all-A6.*.txt`).

## 3. Mapa definitivo de módulos [MEDIDO]
```
src/
  main.js            1857 l.  (2440 antes de A6)  DOM, estado, escena, plegado, arte, GLB, UI, cableado; usa el motor SOLO vía geometryEngine
  core/
    engine.js          48 l.  contrato GeometryEngine v1 (tipos, invariantes) + createLegacyEngine({log})          importa: legacy/{log,validate,panels,adjacency,fold-tree}
    legacy/
      constants.js      4 l.  TOLERANCE_MM = 0.5, GRAPH_EPS = 0.5 (absolutas en mm, KI-22)                    —
      log.js            5 l.  setLogSink / log — ÚNICO estado de módulo de core/                                  —
      geom2d.js        96 l.  distPtSeg, dist2d, ptEq, segSegIntersect, pointOnSeg, polygonSignedArea, polygonCentroid,
                              pointOnSegment2D, pointInPolygonInclusive, faceBounds, getPolyCentroid, edgeMatch    constants
      topology.js     114 l.  buildTopology                                                                       geom2d, log
      adjacency.js    143 l.  buildAdjacencyStrict, buildAdjacency                                                constants, geom2d, log
      fold-tree.js     47 l.  computeFoldSign, buildFoldTree, getDefaultBaseIndex                                 geom2d, log
      panels.js       169 l.  contourContainsContour, classifyClosedCutContours, buildPanels                      adjacency, geom2d, log, topology
      validate.js      41 l.  segsFromPath, buildAllSegs, validateDieline                                         constants, geom2d
  config/ host/ bridge/       sin cambios desde A5
```
Imports de `main.js` desde `core/`: `createLegacyEngine` (`core/engine.js`) y `getPolyCentroid` (`core/legacy/geom2d.js`, excepción temporal D-A6-7 para la escena hasta A7). Reglas verificadas por `a6-limites` y `a5-limites`: `core/` no importa nada de fuera de `core/` · `legacy/` no importa `engine.js` · sin ciclos · sin THREE, `window`, `document`, `console` ni `localStorage` · sin estado de módulo salvo el *sink* · todo `core/` se carga en Node sin globales.

## 4. Contrato `GeometryEngine` v1
Documentado en la cabecera de `src/core/engine.js` y en `A6_PROPUESTA.md` §5.
| Operación | Firma | Implementación `legacy` |
|---|---|---|
| `validate` | `(dieline) → {problems}` | `validateDieline` |
| `buildPanels` | `(dieline) → {panels, creaseEdges, creases}` | `buildPanels` |
| `buildAdjacency` | `(panels, creaseEdges) → AdjacencyEdge[]` | `buildAdjacency` |
| `buildFoldTree` | `(panels, adjacency, baseIndex) → FoldEdge[]` | `buildFoldTree` |
| `defaultBaseIndex` | `(panelModel) → number` | `getDefaultBaseIndex` |
Además, `id: 'legacy'` y `contract: 1`. El objeto está congelado y **cada operación ES la función original**, sin envoltorio ni copia (lo prueba T4 por identidad). El log llega por `createLegacyEngine({ log })`. Invariantes I1–I10, todos medidos: sin DOM/THREE/estado · determinista · **no muta la entrada** (I3, antes [NO VERIFICADO], ahora [MEDIDO] en todos los troqueles y etapas) · alias de objetos compartidos entre entrada y salida (I4, ahora fijado) · identidad por índice · `crease.a→b` acoplado al signo · mm y tolerancias absolutas · excepciones sin envolver (6 casos con el mismo `TypeError` y mensaje que el baseline) · log idéntico · 0 paneles no es error.

## 5. Pruebas [MEDIDO]
| Batería | Antes de A6 (`31459fc`) | Cierre de A6 (`run-all.sh --mutations --soak`) |
|---|---|---|
| Node | 336 | **412** (411 en verde + 1 omitida a propósito: «validateGeometry idéntica» deja de aplicar tras A6.5 y la sustituye `a6-validacion`) |
| Navegador `browser` | 44 (48 con `--soak`) | **52 (56 con `--soak`)**: +8 del log de depuración (T1) |
| Chromium-99 · puente CEP · `a5-observar` · A4-CDP | 4 · 6 · 3 · 7 | 4 · 6 · 3 · 7 |
| Controles negativos | 36 | **46/46** (Node 22 · navegador 18 · bundle 6) |
| Aislamiento | verde | verde en cada paso (baseline 15/15, `panel/` 14/14, V3 no instalada) |
Salida completa del cierre: `docs/fase1/a6/run-all-cierre-A6.txt`. **Soak:** GPU Δ=0 tras 25 ciclos de plegado en el bundle (caja e ill).

**Pruebas nuevas:** T1 log de depuración (navegador) · T2 `a6-texto-identico` (23 funciones) · T3 `a6-contratos` · T4 `a6-engine` (módulo ES real) · T5 `a6-limites` · T6 `a6-logs-golden` (golden nuevo **generado solo desde el baseline**, `geometry-logs.golden.json`, fijado por `a6.pins.json`) · T7 en `build.test` (`dist-a5` se reproduce desde el `src/` de `31459fc`) · `a6-validacion` · `a6-cep-preparacion`.

**Controles negativos nuevos (10), todos con un fallo real que ve al menos una prueba de comportamiento:**
| # | Mutación | La detecta |
|---|---|---|
| 1 | Texto del log de la adyacencia estricta | `a6-logs-golden` (el golden de geometría no lo ve) |
| 2 | La adyacencia estricta copia el `creaseEdge` (rompe alias) | `a6-contratos` |
| 3 | `setBasePanel` deja de llamar a `buildFoldTree` (nº de llamadas) | log de depuración en navegador (T1) |
| 4 | `eps` de la adyacencia robusta 1.0 → 0.1 | golden de geometría (rutas de respaldo) |
| 5 | Signo de pliegue invertido | goldens (árboles) |
| 6 | `id` de problema desde P0 | `a6-validacion` (el golden no incluía el `id`) |
| 7 | El adaptador ignora la base (Node) | T4 (G2 por el módulo real) |
| 8 | El adaptador clona la entrada | T4 (alias) |
| 9 | `core/legacy/log.js` toca `document` | `a5-limites`/`a6-limites` y T4 (error en Node) |
| 10 | El adaptador ignora la base (bundle real en Chrome) | log de depuración en navegador (T1) |
Adaptaciones de herramientas (D-A6-5), sin pérdida de detección: 3 patrones de constantes reescritos con el mismo cambio de valor; 1 patrón propio de A6.0a reapuntado a la llamada vía `geometryEngine`; ahora cada patrón debe cambiar **exactamente una línea** (antes bastaba con «algo cambió»); el cargador exige **definición única** de cada función y tolerancia; `a5-limites` limita sus inventarios exactos a lo que no es `core/` (sus reglas recorren también `core/`).

## 6. Evidencia de equivalencia
**Geometría (puerta G2) por tres caminos [MEDIDO]:**
| Camino | Qué se compara | Resultado |
|---|---|---|
| Cargador por texto (baseline · panel · src) | `geometry.golden.json` (26 fixtures), `illustrator-real.golden.json` (4), golden de logs, problemas completos, alias, no mutación, excepciones | idéntico |
| **Módulo ES real** `src/core/engine.js` (T4) | los mismos goldens por el contrato | idéntico; Caja Botánica real ×1.0 = **11 de 13** |
| Bundle en Chrome headless | GEO en página = golden; log de depuración en 5 flujos = baseline (`docs/fase1/a6/logflow-*.json`); regresión con píxeles, escena y GLB (`regresion-bundle-*.json`: `poses_identicas`, `escena_identica`, `glb_identico` = true; paneles 11/11 y 13/13) | idéntico |
**Texto:** T2 compara las 23 funciones con `panel/main.js`. Además, en cada paso se comparó el bundle **función a función** (`tests/tools/bundle-eq.mjs`, `docs/fase1/a6/equivalencia-bundle-A6.*.txt`): A6.1–A6.4 son solo relocalización; A6.2 añade únicamente el *sink*, y esbuild renombra el `log` de la clausura a `log2`; A6.5 cambia solo `validateGeometry` y añade `validateDieline`; A6.6 añade `createLegacyEngine` y cambia solo las líneas de llamada. Diffs crudos en `diff-bundle-A6.*.txt`.
**GLB [MEDIDO]** (`docs/fase1/a6/glb-referencia-A6.json`, mismo guion que en el CEP real sobre la extracción real de Illustrator): baseline = referencia A1 = **bundle A6**: plano `737bcd2312da1191…` (33 436 B) y todas a 60° `87aa2e4c5cc39092…` (54 224 B), **los mismos hashes que A4 y A5 obtuvieron en el CEP real**. `a4-cdp.test.mjs` 7/7. `glb.golden.json` sin cambios.

## 7. Huellas
| Huella | Estado |
|---|---|
| `tests/golden/dist-a6.SHA256SUMS` (**vigente**, nueva) | `main.js` = `6e36e32534104a7863f087ba876cd981f41d81b88aafcf09f4860640eaf78c8b`; los otros 12 archivos, idénticos a A5/A4 |
| `dist-a5.SHA256SUMS` (A5, validada en CEP real) | **Intacta**; T7 comprueba que se reproduce desde el `src/` de `31459fc` |
| `dist.SHA256SUMS` (A3/A4), `panel.pins.json`, `reference/legacy-baseline.SHA256SUMS` | **Intactas** |
| Goldens `geometry`, `constants`, `glb`, `illustrator-real`, `fixtures.pins` | **Sin cambios** |
| Nuevos | `geometry-logs.golden.json` (desde el baseline) + `a6.pins.json` |

## 8. Defectos y lagunas
- **Ningún defecto cambia.** KI-04/KI-22 (11 de 13 a ×1.0; 13 a ×0.75), KI-05…KI-09, KI-17…KI-20, KI-24, KI-25 y KI-26, preservados; KI-01 sigue corregido (Δ=0, soak).
- **Lagunas de cobertura medidas** (no son defectos, `KNOWN_ISSUES.md` § «Lagunas de cobertura (A6)»): subir el `eps` de la adyacencia robusta, la fracción de solape 0.20, el `creaseIdx` del segundo respaldo y el desempate del filtro de conectividad no cambian ningún resultado con los fixtures actuales. Durante A6 solo los protegía T2. Conviene cubrirlas con fixtures en F2 antes de tocar esa lógica.

## 9. Incidencias
1. **Chrome headless del arnés murió** durante la primera batería de A6.0a (prueba «GLB · bundle», antes de llegar a las pruebas nuevas). El ejecutor quedó esperando la conexión sin límite de tiempo durante unos 17 minutos. No había informe de fallo de Chrome. Se detuvo y se relanzó, y salió en verde. Causa: [NO VERIFICADO]. Esa salida se perdió con el cierre de la app (incidencia 2).
2. **La app de Claude se cerró** a mitad de la segunda batería de A6.0a; murió la batería y se vació el *scratchpad*. El trabajo sin commit seguía en el árbol. Desde entonces las baterías se lanzan desacopladas (`nohup`), con el registro en `.scratch/` (ignorado por git).
3. **Errores propios, corregidos antes de cada commit:** una expresión regular de comprobación de T6; el número de líneas del bloque de validación (12, no 13); un comentario al final de una línea de import que la prueba de límites no reconocía; y el comparador de paridad, que en el primer intento contaba los eventos de consola de DevTools (dependen de la sesión). Ninguno afectó al producto.

## 10. Qué NO se verificó [NO VERIFICADO]
El bundle de A6 **no se cargó en Illustrator/CEP real** (no autorizado). La equivalencia se apoya en Node, el módulo real, Chrome headless y las APIs reducidas a Chromium 99. Los GLB y la paridad coinciden con los valores que A4 y A5 midieron en el CEP real, pero sobre Chrome 152, no sobre el Chromium 99 auténtico. Tampoco: Windows, troqueles de trabajo distintos de los fixtures, ni la causa de la incidencia 1.

## 11. Validación corta en Illustrator real (preparada, NO ejecutada)
`docs/fase1/A6_VALIDACION_CEP_PROCEDIMIENTO.md`: V-1 identidad (`main.js` = `6e36e325…`) · V-2 `a4-paridad caja` comparada **automáticamente** con la evidencia real de A5 mediante `tools/a4/a6-comparar-paridad.mjs`, que da «idéntica» entre A4 y A5 reales y detecta cambios (prueba `a6-cep-preparacion`, 5/5) · V-3 GLB en 2 poses · V-4 cierre y rollback. **Requiere autorización expresa y fechada.**

## 12. Punto de control PC7 — decisiones del usuario
1. Aceptar A6 con la puerta G2 cumplida por tres caminos y las lagunas de cobertura registradas.
2. Autorizar (con fecha), o no, la validación corta en CEP real del §11.
3. Siguiente paso: A7 (estado + escena + `ResourceTracker`, que exige sustituir el anclaje de `__dbg`) o F2/2A (KI-22). **Ninguno se inicia sin nueva autorización.**
