# A9 — Punto de control del Bloque 1 (A9.0a–A9.2), parada obligatoria antes de A9.3

Fecha: 2026-10-27 · Ejecutado por Opus High en un chat nuevo, siguiendo `docs/fase1/A9_HANDOFF.md` · Base de producto: `3ea0d8a` (A8 validada en CEP real) · Decisiones D-A9-1…16 aprobadas (`A9_PROPUESTA.md` §16–§17).
**Estado: Bloque 1 COMPLETADO y en verde. A9.3–A9.6 (Bloque 2) NO iniciados y NO autorizados. V3 NO instalada.**
Etiquetas: [MEDIDO] · [CONFIRMADO] · [INFERENCIA] · [NO VERIFICADO].

## 1. HEAD y estado del árbol
- Partida verificada [MEDIDO]: HEAD `485deef`, árbol limpio, sin remoto, autor único, `git diff 3ea0d8a -- src panel tests tools reference` vacío, `verify-isolation.sh` verde, `dist/main.js` = `4addceb7…` = `dist-a8`, CEP de usuario solo `TesserArt_Validator`, precheck `EXIT=0`.
- Cierre: HEAD = commit documental de este informe (ver `git log -1`), árbol limpio, sin remoto, autor único, sin trailers.

## 2. Commits
| Paso | Commit | Contenido |
|---|---|---|
| A9.0a | `4034b05` | Caracterización H1–H6 + soak de UI (`tests/browser/a9.test.mjs`, `tests/lib/a9.mjs`), golden `ui-a9` desde el baseline (`a9.pins.json`), 14 controles; sin cambios de código |
| A9.0b | `e3614d3` | `a9-texto-identico`, `a9-limites`, `dist-a9` (= `dist-a8`), `HISTÓRICO A8`, `a9-perf`, `a9-equivalencia`, inventario de patrones; 5 controles; sin cambios de código |
| A9.1 | `1b056f5` | `src/ui/views.js` (`createViews`, 9 funciones, `interactionMode` privado); 4 controles; `dist-a9` regenerada (`main.js` `ea8529eb…`) |
| A9.2 | `7c2ad11` | `src/app/actions.js` (`createActions`: `refreshArtwork`, `exportPNG`, `exportGLB`); ajustes A y B; control n.º 11 re-anclado; 4 controles; `dist-a9` regenerada (`main.js` `2ada5d6a…`) |
| Cierre | este commit | Informe, `HANDOFF.md`, `tests/README.md`, `KNOWN_ISSUES.md` (KI-29 y lagunas de A9); sin cambios de código |

## 3. Arquitectura implementada
```
src/main.js        724 l. (830 en 3ea0d8a → 779 tras A9.1)   shell + raíz de composición + orquestación que aún no se mueve (Bloque 2)
src/ui/views.js     66 l.  createViews(S, deps) → syncMaterialPresetUI, setInteractionMode, ensureCep, showImport, show3D, setDebugVisible, setActiveTab,
                           syncMaterialInputs, setArtStatus   (interactionMode privado; importa solo hasCep de bridge/cep)
src/app/actions.js  69 l.  createActions(S, deps) → refreshArtwork (async), exportPNG, exportGLB (async)
                           (importa buildArtworkExportScript de host/art, evalScriptJSON de bridge/cep, saveBlobWithDialog de bridge/fs; document solo en exportPNG)
```
Orden de composición: `S` → materials → labels → angles → viewport → artwork → crease-visuals → panel-meshes → folding → glb-image → glb-scene → glb-builder → **views → actions**. Ninguna fábrica nueva tiene efectos al crearse (regla 5 de `a9-limites`; control n.º 18). Siguen en `main.js`: consulta del DOM, `S`, `setStatus` (ancla del arnés), `log`, `clearLog`, `geometryEngine`, `__tessDebugView`, guarda «UI mismatch», arranque, los 15 manejadores, `lastData`/`problems`, `validateGeometry`, `render2D`, `applyMaterialPreset`, `resetValidationUI`, los controles de plegado y el picking (todo eso es Bloque 2). `main.js` deja de importar `host/art.js` y `bridge/fs.js`; de `bridge/cep.js` importa `evalScript` y `pathToFileURL` (este último sin uso, rareza preservada, D-A9-10).

## 4. Funciones extraídas (texto)
- **A9.1:** 9/9 idénticas byte a byte salvo −2 espacios por línea (`docs/fase1/a9/texto-A9.1.txt`). **A9.2:** 3/3 (`texto-A9.2.txt`). Lo fijan además `a7/a8/a9-texto-identico` (texto salvo sangría, `export` y `S.`; una sola definición; solo las funciones nuevas previstas: `createViews`, `createActions`; líneas sueltas de `main.js` exactamente las previstas, recalculadas con un verificador que solo escribe si la diferencia coincide con la intención del paso).
- Los 15 manejadores siguen en `main.js` con su texto y su orden (`a9-texto-identico`, bloques comparados sin sangría). El de «Export GLB» (KI-25) sigue en `main.js` (D-A8-2 / ajuste B).

## 5. Caracterización H1–H6 y soak de UI (A9.0a) [MEDIDO]
Baseline, `panel/` y bundle idénticos en todo; golden solo desde el baseline (`tests/golden/ui-a9.golden.json`, fijado por `a9.pins.json`, sin hashes de píxeles). 36 pruebas (con `SOAK=1`).
| ID | Qué fija | Resultado |
|---|---|---|
| H1 | Escuchas por elemento, tipo, opciones, número y orden en arranque, extraer, 3D, base (select y Shift+clic), espesor, preset, Back y 3D otra vez; sin CEP y con «UI mismatch» | Las 15 escuchas de `main.js` (16 registros: pestañas ×4, sin botones de modo) **una vez y en orden** en todos los flujos; 0 duplicados; escuchas persistentes constantes; sin CEP y con «UI mismatch», **ninguna**. Texto de cada manejador = bundle de 3ea0d8a (se excluye el de `DOMContentLoaded`, que es toda la clausura) |
| H2 | Línea de tiempo única de `#status-area`, `#art-status`, `#art-source-pill`, `#validation-status` (+ clase), `#interaction-*`, `#viewport-badge`, `#material-pill`, `display` de vistas/`#error-msg`/salida/lienzo y `disabled` de botones, en 8 flujos (normal, problemas con el fixture sintético `crease-corta-0.6` inyectado en la página, sin datos, espesor, KI-24, pestañas/depuración, «UI mismatch», sin CEP) | Idéntico; fijados: `refreshArtwork` sin `await` en Continue (estado 3D antes que el arte), KI-24 (`ReferenceError`), espesor `0.3mm`/`20.0mm` (KI-14), «Build 3D first», «CEP bridge not found.» |
| H3 | DOM tras `DOMContentLoaded` en 4 arranques (normal, sin CEP, sin `#thickness-input`, sin `#preview-canvas`) | Idéntico; normal: estado «Ready», pestaña Material; sin CEP: `#error-msg` visible y 6 botones deshabilitados; «UI mismatch»: solo el mensaje |
| H4 | `#fold-panel` y `#problems-list` serializados (estructura, atributos, `style`, valores, `onclick`) en 12 acciones; hash de píxeles 2D con y sin resaltado | Idéntico; un solo `#fold-panel`; el resaltado de un problema cambia los píxeles y Preview lo quita |
| H5 | Shift+clic y Alt+clic como **primer clic tras el 3D**; resaltado tras plegar; registro | Un solo cambio de estado por clic; resaltado `#ffd166`/opacidad 1 y fila `rgba(255, 209, 102, 0.1)` tras plegar; **ningún `Pick error`** en ningún objetivo. Hallazgo: Alt+clic elige la crease más cercana a la cámara dentro del umbral 40 (**KI-29**, registrado, no corregido) |
| H6 | Escape en 3D, importación, `input`, `select`, `textarea` | Solo actúa en 3D fuera de `input`/`textarea`; en un `<select>` sí actúa (rareza preservada) |
| Soak de UI | 25 ciclos de espesor, preset, base (select y Shift+clic) y Alt+clic | Escuchas persistentes y activas constantes, 0 duplicados, un `#fold-panel`, nodos del DOM constantes, ningún `Pick error`; GPU: buffers/VAO/programas constantes desde el ciclo 2 y mismo estado ⇒ mismos contadores (periodo de 22 ciclos); baseline crece (KI-01, control positivo) |

## 6. Controles negativos
| | Node | Navegador | Bundle | Total |
|---|---|---|---|---|
| Al empezar (3ea0d8a) | 57 | 45 | 6 | **108** |
| A9.0a | 57 | 59 (+14) | 6 | 122 |
| A9.0b | 62 (+5) | 59 | 6 | 127 |
| A9.1 | 63 (+1) | 62 (+3) | 6 | 131 |
| A9.2 | 64 (+1) | 65 (+3) | 6 | **135** |
- Los 108 previos siguen todos «detectada» en la batería final de cada paso (0 «NO APLICÓ», 0 «NO DETECTADA»); en la **primera** batería de A9.2 uno dio «NO APLICÓ» por colisión del patrón (§10.13) y se re-ancló. Los afectados por A9.1/A9.2 sin re-anclar («puente: ensureCep ya no deshabilita Back», «A9 · H3: ensureCep…», «A8 · exportGLB: el diálogo se abre ANTES…», KI-25, «puente: mensaje de escritura de GLB», «guardado: cancelar…») siguen detectados. El n.º 11 y el vigente «A8.3 · glb-scene: no refresca matrixWorld» se re-anclaron en A9.2 (§10.3 y §10.13).
- Nuevos (27), numerados según `A9_PROPUESTA.md` §8.5/§16.2.7 cuando corresponde: 4, 5, 6, 11 (H1) · 9, 16 (H2) · 12, 17 (H3) · 8, 10 (H4) · 3 de H5 (error tragado por el `try/catch` del visor con efectos idénticos; `createViewport` con `pickPanelFromEvent` indefinido; `rebuildCreaseVisuals` sin resaltado) · soak (escucha de Reset en `#three-view` por reconstrucción) · 5 de A9.0b (texto de un manejador, línea suelta, segunda declaración de `lastData`, envoltorio no previsto, ancla del arnés) · A9.1: 18, copia de `S`, `materialPill` por `artSourcePill`, 14 (solo `a9-limites`) · A9.2: `setStatus` por `setArtStatus`, `refreshArtwork` sin liberar texturas (GPU con arte), copia de `S`, `document` fuera de `exportPNG`. Causa de cada detección: `docs/fase1/a9/controles-A9.0a-detalle.txt` y §10.
- **Lagunas declaradas (no forzadas):** n.º 7 (rama por defecto de `setActiveTab`, inalcanzable) y «`exportGLB` pierde `!S.foldRoot`» (solo alcanzable con escena y 0 paneles; ningún flujo lo ejerce). El n.º 14 solo lo ve `a9-limites`. Detalle en `KNOWN_ISSUES.md` («Lagunas de cobertura (A9)»).
- Pendientes del Bloque 2 (no aplicables aún): 1, 2, 3, 13, 15, 19, 20, 21, 22. El objetivo final de A9 (≥ 130) ya se supera con 135, sin controles decorativos: cada uno vigila un invariante de una prueba nueva o un cableado del paso.

## 7. Baterías (`tests/run-all.sh --mutations --soak`, desacopladas, marcador `EXIT=` comprobado)
| Paso | Node | Navegador (browser · a7 · a8 · **a9** · Chromium-99 · puente · a5-observar · A4-CDP) | Controles | Resultado | Evidencia |
|---|---|---|---|---|---|
| A9.0a | 533 (532 + 1 omitida) | 56 · 13 · 31 · **36** · 4 · 6 · 3 · 7 | 122/122 | TODO EN VERDE, `EXIT=0` | `a9/run-all-A9.0a.txt` |
| A9.0b | 549 (548 + 1) | ídem | 127/127 | TODO EN VERDE, `EXIT=0` | `a9/run-all-A9.0b.txt` |
| A9.1 | 549 (548 + 1) | ídem | 131/131 | TODO EN VERDE, `EXIT=0` | `a9/run-all-A9.1.txt` |
| A9.2 | 549 (548 + 1) | ídem | 135/135 | 1.ª: `EXIT=1` («NO APLICÓ» del patrón A8.3, §10.13) · 2.ª: TODO EN VERDE, `EXIT=0` | `a9/run-all-A9.2-fallo-1.txt`, `a9/run-all-A9.2.txt` |
Aislamiento verde antes y después de cada batería.

## 8. Equivalencia de bundle, eventos, DOM, registros y GLB
- **Bundle** (`a9-equivalencia`, a cualquier sangría y sin `S.`): 3ea0d8a tiene **144 funciones** [MEDIDO; la propuesta estimaba 144]. A9.1: 144/144 idénticas + `createViews`. A9.2: 144/144 idénticas + `createViews` + `createActions`; 0 distintas, 0 duplicadas, 0 perdidas. Líneas de primer nivel (`bundle-lineas-A9.*.json`): solo cambian `var interactionMode` (entra en la fábrica) y las líneas de composición. esbuild desestructura `log: log2` en `createActions`, como ya hacían viewport, panel-meshes y glb-image (mismo texto de `refreshArtwork`).
- **Eventos, DOM y mensajes:** H1–H6 y soak idénticos en baseline, `panel/` y bundle en cada paso; mismo texto de manejadores que el bundle de 3ea0d8a.
- **Registros:** log del motor (A6, texto y orden), puente CEP (30 casos), `a5-observar`, A4-CDP sin cambios; ningún `Pick error`.
- **GLB** (A9.2, `a9/glb-A9.2.json`): sin arte, **byte a byte** con los archivos reales de Illustrator (`737bcd23…` 33 436 B; `87aa2e4c…` 54 224 B). Con arte: **estructuralmente idéntico** (esqueleto JSON, orden de claves, 26 vistas, 0 vistas no-imagen distintas) y **0 píxeles distintos** en las 2 imágenes 3176×2264; la igualdad **binaria** con `b4973a54…` no es comparable en Chrome headless (299 720 B frente a 295 440 B por el codificador PNG) y queda para A9-CEP. **No se presenta equivalencia estructural como binaria.**
- **Escena y GPU:** inventario de escena A7 y L1–L3 idénticos; soak de GPU Δ=0 (bundle y `panel/`).

## 9. Rendimiento (`a9-perf`, 10 corridas intercaladas frente al bundle de 3ea0d8a, Chrome headless; piso optimista, no CEP)
| Lectura | Resultado |
|---|---|
| Ruido (A9.0b, 3ea0d8a contra sí mismo) | −1,5 % … +5,1 % (`base_select_ms`) |
| A9.1, 10 corridas | `construir_ms` +21,3 % y `base_select_ms` +10,5 % ⇒ «investigar»; datos crudos **bimodales con los mismos grupos en referencia y actual** |
| A9.1, 20 corridas | Todo OK: `construir_ms` −10,9 %, `base_select_ms` +2,3 % (`a9/rendimiento-A9.1-INVESTIGACION.md`) |
| A9.2, 10 corridas | Todo OK: máximo `reconstruir_ms` +6,9 % |
Métricas nuevas: latencia deslizador → fotograma (≈ 21 ms, cuantizada por `requestAnimationFrame`), cambio de base por select (≈ 1 ms), clic Shift/Alt (≈ 1,3/0,15 ms), extraer → validar → 2D (≈ 6 ms). Ninguna lectura > +25 %. Se leyó cada resultado antes de su commit.

## 10. Desviaciones respecto de la propuesta y la guía (todas sin cambiar producto)
1. **Control n.º 16:** `await refreshArtwork()` es un error de sintaxis en un manejador no `async` y `refreshArtwork();` aparece dos veces con la misma sangría (Continue y Refresh). Se implementó la misma intención en una línea: Continue espera a `refreshArtwork()` antes de su mensaje (`return refreshArtwork().then(…)`); lo detecta H2 por el orden de la línea de tiempo.
2. **Control n.º 4:** el DOM ignora un duplicado exacto; la mutación registra una segunda escucha equivalente (otra función que llama a la misma).
3. **Control n.º 11:** en el Bloque 1 no hay `bindEvents`; equivale a que el arranque ya no corte sin CEP (`ensureCep();`). En A9.2 la línea `if(!ensureCep()) return;` también aparece en `refreshArtwork` a 4 espacios: se re-ancló con las dos líneas siguientes (`sed N`, solo el arranque va seguido de `showImport();`), cambia 1 línea y falla la misma prueba (H1).
4. **Soak de GPU:** el estado de UI cambia de un ciclo a otro (base y selección), y las texturas oscilan −8/−9 sin crecer; el criterio exacto es «mismo estado ⇒ mismos contadores» (periodo 22) + buffers/VAO/programas constantes.
5. **H2:** el fixture con problemas se inyecta en la página (`window.__FIXTURE__`) en vez de escribirse en un archivo temporal; los fixtures versionados no se tocan.
6. **H1:** se excluye del texto comparado la escucha de `DOMContentLoaded` (es toda la clausura y cambia por diseño); el primer intento la incluía y habría marcado como «detectado» el control n.º 7 solo por un hash de texto, no por comportamiento.
7. **H4:** los píxeles 2D se leen de una copia del lienzo (artefacto de Chrome con `getImageData`).
8. **Primer intento del control del soak** (`baseSelect` → `#three-view`) se detectaba solo por *timeout* de 600 s (cascada de manejadores); se sustituyó por una fuga «limpia» (Reset en `#three-view`), detectada por el criterio del soak; el límite del soak bajó a 180 s.
9. **Errores míos corregidos antes de cualquier commit:** dos veces un comentario `//` en mitad de línea se tragó código de prueba (soak y `a7-limites`); se detectó al ensayar y se sustituyó por `/* */`.
10. Controles añadidos fuera de la lista numerada (H5 ×3, soak, A9.0b ×5, A9.2 `document`): cada uno demuestra que una prueba nueva detecta una alteración relevante (§6 del prompt).
11. `a9-equivalencia.sh` falla también si desaparece una función (`soloEnAnterior`), más estricto que `a8-equivalencia.sh`.
12. En `views.js` las funciones quedan separadas por una línea en blanco (en `main.js` tres de ellas iban seguidas) y en `main.js` queda el comentario de cabecera «CEP BRIDGE» sin función debajo: formato, sin efecto en el bundle ni en las pruebas de texto.
13. **Incidencia de A9.2 (fallo del arnés, corregido):** la primera batería de A9.2 terminó con `EXIT=1` por un único «NO APLICÓ» en un control vigente, `A8.3 · glb-scene: no refresca matrixWorld` (`docs/fase1/a9/run-all-A9.2-fallo-1.txt`). Causa [MEDIDO]: su patrón `^    S.scene3d.updateMatrixWorld(true);$` pasó a coincidir también con la línea de `exportGLB`, que al moverse a `app/actions.js` bajó de 6 a 4 espacios (2 líneas cambiadas ⇒ «NO APLICÓ», como debe). No es regresión: el texto de `exportGLB` es idéntico y N4 no cambia. Error mío: el inventario de A9.0b solo miró dónde caía cada patrón **antes** de mover, no las coincidencias nuevas que crea el texto movido. Corrección: el patrón se ancla con la línea anterior de `glb-scene.js` (`sed N`, misma mutación, 1 línea; N4 la sigue detectando: 15 fallos); re-escaneo de los 135 patrones sobre el árbol de A9.2: todos cambian exactamente 1 línea; batería repetida completa (`run-all-A9.2.txt`). Para el Bloque 2: **re-escanear todos los patrones tras cada movimiento** (`.scratch/inv-patterns.sh` reproducido en el inventario) antes de lanzar la batería.

## 11. Defectos y riesgos pendientes
- Ningún defecto conocido cambia (KI-01…KI-28 tal cual; KI-24/25/26/27 reproducidos por H2, puente CEP y E4/E5). **Nuevo: KI-29** (Alt+clic elige la crease más cercana a la cámara dentro del umbral 40), pendiente de confirmación y **no corregido**.
- **Riesgos para el Bloque 2:** (a) A9.3/A9.4 mueven las tres funciones que `createViewport`/`createCreaseVisuals` capturan al crearse: H5 ya demuestra que un cableado roto deja `Pick error` y que el resaltado tras plegar se vigila; (b) A9.5 mueve `lastData`, `validateGeometry` y los 15 manejadores: hará falta re-anclar los patrones con sangría de los manejadores (n.º 4, 5, 6, 9, 16, KI-25) y del arranque (n.º 11), y el ajuste del cargador (§8.4 de la propuesta); (c) KI-29 hace que «Alt+clic en la línea X» no sea un oráculo fiable: las pruebas fijan lo que hace el baseline; (d) Shift/Alt+clic **nunca se han probado en CEP real** (R13).

## 12. Aislamiento y huellas
- `verify-isolation.sh` verde en cada paso; V3 **no instalada**; CEP de usuario solo `TesserArt_Validator`; plugin original y `reference/` intactos; `panel/`, goldens, fixtures y huellas históricas sin cambios.
- `dist-a9.SHA256SUMS` vigente (`main.js` `2ada5d6abf5b7b07…` tras A9.2; `ea8529eb…` tras A9.1; = `dist-a8` en A9.0b). `dist-a8`, `dist-a7`, `dist-a6`, `dist-a5` y `dist` intactas; `build.test` las reconstruye (HISTÓRICO A8 desde `3ea0d8a` = `4addceb7…`).

## 13. Qué NO se verificó [NO VERIFICADO]
- Nada se ejecutó en Illustrator ni en CEP real (no autorizado): Chromium 99 auténtico, GLB con arte binario, Shift/Alt+clic reales, KI-29 en real.
- La latencia deslizador → fotograma está cuantizada por `requestAnimationFrame`; Chrome 155 headless/M1 Max es un piso optimista.

## 14. Condiciones concretas para iniciar A9.3
1. Autorización nueva y expresa del usuario para el Bloque 2 (A9.3–A9.6), citando D-A9-3/4/5/6/9 (envoltorios, picking, `lastData`/`validateGeometry`, `bindEvents`, ajuste del cargador).
2. Partir de este HEAD con el árbol limpio y `dist/` = `dist-a9`; repetir solo la verificación inicial (no la batería, si no hay cambios de código).
3. A9.3 debe introducir el envoltorio de `updateSelectedCreaseVisuals` en la línea de `createCreaseVisuals`, activar `WRAPPERS = 1` en `a9-limites`, mover las 7 funciones y los 6 widgets privados y re-anclar los patrones de `buildFoldUI` con sangría (n.º 8, soak); los controles 1 y 13 se añaden en ese paso.
4. Decidir, si se quiere, sobre KI-29 (registrar solo, o tarea de F7) y sobre las dos lagunas declaradas.
5. A9-CEP solo con autorización aparte y fechada (D-A9-12).
