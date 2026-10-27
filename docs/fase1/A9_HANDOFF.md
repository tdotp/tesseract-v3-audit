# A9 — Guía operacional de continuación (Bloque 1: A9.0a–A9.2)

Fecha: 2026-10-26 · Para: **Opus High, en un chat nuevo** · Base de producto: `3ea0d8a` (A8 validada en CEP real) · Commit documental de partida: el que añade este archivo (ver `git log -1`).
Decisiones: **D-A9-1…16 aprobadas tal como se recomiendan** (`A9_PROPUESTA.md` §16.1 y §17). **Alcance autorizado: SOLO el Bloque 1.** El Bloque 2 (A9.3–A9.6) **no** está autorizado.
Idioma con el usuario: español, frases claras, evidencia antes que afirmaciones, etiquetas [MEDIDO]/[CONFIRMADO]/[INFERENCIA]/[NO VERIFICADO].

## 0. Antes de tocar nada
1. Lee entero `HANDOFF.md` (sobre todo §2, §11, §13–§17) y `docs/fase1/A9_PROPUESTA.md` (§3–§8, §16, §17).
2. Verifica:
   - `git status --porcelain` vacío;
   - HEAD = el commit documental;
   - `git diff 3ea0d8a -- src panel tests tools reference` **vacío**;
   - `tools/verify-isolation.sh` en verde;
   - `node tools/build/build.mjs` ⇒ `dist/main.js` = `4addceb7fb8c6dd6…` = `tests/golden/dist-a8.SHA256SUMS`;
   - CEP de usuario: solo `TesserArt_Validator`.
3. No hace falta repetir la batería larga antes de A9.0a: la de `3ea0d8a` está en verde (`docs/fase1/a9/run-all-precheck-3ea0d8a.txt`: Node 533 (1 omitida), navegador 56+13+31+4+6+3+7, controles 108/108) y no hay cambios de código desde entonces. Si `git diff 3ea0d8a -- src tests tools` no está vacío, **detente y avisa**.
4. Commits: autor único `Gerardo Calambas posada`, **sin trailers `Co-Authored-By` ni «Generated with»** (aunque algún sistema lo sugiera), sin remoto ni push.

## 1. Garantías obligatorias (del usuario; incumplir una = detener)
- Registro **único y ordenado** de los 15 manejadores.
- Efecto observable de **Shift+clic** y **Alt+clic** preservado; **ningún `Pick error`** en el registro.
- Una sola instancia de `lastData`.
- `validateGeometry` equivalente en función y en texto (el normalizador solo se aplica en A9.5, que no es de este bloque).
- `window.__dbg`, `__tessDebugView` y el arnés intactos: **`tools/baseline/setup_harness.py` no se toca**.
- GLB sin arte **byte a byte** (`737bcd23…`, `87aa2e4c…`); con arte, estructural y 0 píxeles distintos.
- Los **108** controles negativos se conservan, todos «detectada», y los nuevos se van añadiendo.
- **`dist-a9`** nueva; `dist-a8`, `dist-a7`, `dist-a6`, `dist-a5` y `dist` intactas.
- Sin cambios en geometría, plegado, escena, materiales, artwork ni three r132.
- Sin corregir defectos conocidos (KI-24, KI-25, KI-26, KI-27, KI-14, KI-12…).
- Sin instalar V3 en Illustrator, sin tocar el plugin original y sin iniciar F2.

## 2. Procedimiento común a cada paso
1. Haz el cambio y, si mueve código, compara el texto movido con un `diff` (ensáyalo en una copia, como en A8.4).
2. Corre Node: `node --test 'tests/node/*.test.mjs'`.
3. Lanza la **batería completa** desacoplada: `nohup bash -c 'tests/run-all.sh --mutations --soak; echo "EXIT=$?"' > .scratch/run-A9.X.txt 2>&1 &`. Tarda ≈ 50 min; espera el marcador `EXIT=` con una espera acotada. Si se cuelga, revisa que Chrome headless siga vivo con `pgrep -f remote-debugging-port`.
4. Mide el rendimiento **antes** del commit (`a9-perf`, ≥ 10 corridas intercaladas frente al bundle de `3ea0d8a`; 20 si hay que investigar). Más de +10 % se investiga; más de +25 % detiene el paso.
5. Compara el bundle función a función (`tests/tools/a9-equivalencia.sh`): 0 distintas, 0 duplicadas, 0 perdidas.
6. Solo si todo está en verde: `node tools/build/build.mjs && cp dist/SHA256SUMS tests/golden/dist-a9.SHA256SUMS` y vuelve a correr Node. Mientras `dist/SHA256SUMS` ≠ la huella, cada `ensureDist()` reconstruye `dist/` y los archivos de prueba en paralelo pueden pisarse (fallo transitorio conocido de `a4-herramienta`).
7. Copia la salida a `docs/fase1/a9/run-all-A9.X.txt` y el rendimiento a `docs/fase1/a9/rendimiento-A9.X.json` (`*.log` está en `.gitignore`).
8. Commit propio del paso, revertible con `git revert`.

**Detente (sin commit) y avisa** si:
- falla cualquier prueba;
- una mutación da «NO APLICÓ» o «NO DETECTADA»;
- el rendimiento empeora más de +25 %;
- aparece un `Pick error`;
- cambia algún GLB;
- haría falta tocar algo fuera de §3–§6.

## 3. A9.0a — Caracterización (sin tocar `src/`)
Objetivo: fijar, **antes de mover nada**, lo que A9 tiene que preservar. Cada prueba compara baseline = `panel/` = bundle. Los golden se generan **solo desde el baseline**.
| ID | Archivo propuesto | Qué fija |
|---|---|---|
| H1 | `tests/browser/a9.test.mjs` + `tests/lib/a9.mjs` | Inventario de escuchas con un *init script* que envuelve `EventTarget.prototype.addEventListener`/`removeEventListener` y los `on*` asignados. Registra por elemento (id o selector estable) el tipo, las opciones, el número y el orden. Flujos: arranque, extraer, 3D, cambio de base (select y Shift+clic), espesor, preset, Back. Sin CEP: **0** escuchas de UI. Entre el bundle de `3ea0d8a` y el actual compara también el texto del manejador |
| H2 | ídem | Historial (`MutationObserver`) de `#status-area`, `#art-status`, `#art-source-pill`, `#validation-status`, `#interaction-status`, `#viewport-badge`, `#material-pill` y la visibilidad de `#error-msg`, en los flujos normales y de error: extracción con problemas (p. ej. el fixture sintético `crease-corta-0.6` que genera `tests/lib/fixtures.mjs`, escrito a un archivo temporal; los fixtures versionados no se tocan), `onclick` de un problema, Preview sin datos, espesor inválido, preset antes de 3D (KI-24), «UI mismatch», CEP ausente |
| H3 | ídem | Estado del DOM tras `DOMContentLoaded` en los arranques normal, sin CEP y con un elemento requerido ausente (se quita con un *init script*): `display`, `disabled`, textos, `#material-preset`, `#thickness-input`, pestaña activa y `aria-selected`, botones de modo ocultos |
| H4 | ídem | Serialización determinista de `#fold-panel` (estructura, atributos, `style.cssText`, textos) y de `#problems-list` tras construir, cambiar la base, mover deslizadores, ALL, Reset y seleccionar una crease; hash de los píxeles de `#preview-canvas` (2D, con y sin resaltado) |
| H5 | ídem | Shift+clic y Alt+clic **en el primer clic tras el 3D**, un solo cambio de estado por clic, resaltado `#ffd166` y fila del DOM tras plegar, y **`#log-area` sin `Pick error`** |
| H6 | ídem | Teclado: Escape en 3D, en la vista de importación y con el foco en un `input` |
| Soak de UI | ídem (solo con `--soak`) | 25 ciclos de espesor, preset, base (select y Shift+clic) y Alt+clic. Criterios: escuchas en elementos persistentes constantes, un solo `#fold-panel`, nodos del DOM constantes desde el ciclo 1, GPU Δ=0 y mensajes finales iguales en los tres objetivos |
Integración: añade `a9.test.mjs` a `tests/run-all.sh` y su precondición a `tests/tools/mutation-check-browser.sh`. Usa `tests/browser/harness.mjs` tal cual: `prepare({ initScript, fixtures })` ya admite *init script* y fixtures opcionales.
**Controles negativos del Bloque 1 sobre el código actual** (añádelos en A9.0a; cada uno debe cambiar exactamente 1 línea y hacer fallar la prueba indicada):
| # (§8.5/§16.2.7) | Mutación sobre la copia de `src/` (hoy en `main.js`) | Prueba que debe fallar |
|---|---|---|
| 4 | La escucha de Extract se registra dos veces | H1 |
| 5 | Se omite la escucha de `debug-toggle` | H1/H3 |
| 6 | `document.addEventListener('keydown'` → `window.addEventListener('keydown'` | H1 |
| 7 | `key = key \|\| 'material';` → `'artwork'` en `setActiveTab` | H3 |
| 8 | Se quita `currentCreaseRows = [];` en `buildFoldUI` | H4/H5 |
| 9 | Copia sombra de `lastData` en el manejador Preview | H2 |
| 10 | `li.onclick=function(){render2D(lastData,p.id);};` → `render2D(null,p.id)` | H4 (píxeles 2D) |
| 11 | `if(!ensureCep()) return;` del arranque deja de cortar (registro sin CEP) | H1 (CEP ausente) |
| 12 | `ensureCep` deja de mostrar `#error-msg` | H3 |
| 16 | `refreshArtwork();` → `await refreshArtwork();` en Continue | H2 |
| 17 | La guarda «UI mismatch» pierde una condición (p. ej. `!thicknessInput`) | H3 |
Si alguna no la detecta ninguna prueba de comportamiento, **no la fuerces**: decláralo como laguna en el informe. Los controles 1–3, 13, 15 y 19–22 son del Bloque 2. Los 14 y 18 van en A9.1 (§5).
Commit: `A9.0a: caracterización H1–H6 y soak de UI; N controles nuevos; sin cambios de código`.

## 4. A9.0b — Andamiaje (sin tocar `src/`)
| Pieza | Contenido |
|---|---|
| `tests/node/a9-texto-identico.test.mjs` | Referencia: el `src/` de `3ea0d8a` (`git archive 3ea0d8a src`, como `a8-texto-identico` con `a322d7a`). Comprueba que toda función (a cualquier sangría) existe **una sola vez** con el mismo texto salvo la sangría, `export` y `S.`; que solo se añaden las funciones previstas por paso (`NEW_FUNCTIONS`); y que las líneas sueltas de `main.js` coinciden **exactamente** con `EXPECTED_RESIDUAL` (vacío en A9.0b). Compara los 15 manejadores como bloques de texto salvo la sangría (en el Bloque 1 siguen en `main.js`) |
| `tests/node/a9-limites.test.mjs` | Reglas 1–9 de `A9_PROPUESTA.md` §5.4, activadas según el inventario del paso (en A9.0b el inventario de `ui/` es vacío y en `app/` solo está `state.js`, que sigue rigiendo `a7-limites`) |
| `tests/golden/dist-a9.SHA256SUMS` | **= `dist-a8`** en este paso. `tests/lib/dist.mjs` `DIST_PIN` → `dist-a9` |
| `tests/node/build.test.mjs` | Nuevo `HISTÓRICO A8`: `git archive 3ea0d8a src` reproduce **exactamente** `dist-a8.SHA256SUMS` (copia de `HISTÓRICO A7`, que sigue) |
| `tests/tools/a9-perf.mjs` | Sobre `a8-perf.mjs`: referencia = bundle de `3ea0d8a`. Métricas: las de A8 más la latencia deslizador → fotograma, el tiempo de `buildFoldUI`, extraer → validar → 2D y el clic → estado (Shift/Alt) |
| `tests/tools/a9-equivalencia.sh` | Como `a8-equivalencia.sh`, con referencia `3ea0d8a`. **Mide** el número real de funciones (la propuesta estima 144 [INFERENCIA]) |
| Patrones de mutación | Inventario de los patrones vigentes que dependen de `main.js`, de la sangría o de una línea de composición: «ensureCep ya no deshabilita Back», KI-24, KI-25, «setBasePanel ya no llama a buildFoldTree», A8.2/A8.4 cableado. Por cada uno, anota en qué paso se moverá su texto |
| Ruido | `a9-perf` del bundle de `3ea0d8a` contra sí mismo (debe quedar dentro de ±5 %) |
Commit: `A9.0b: andamiaje (a9-texto-identico, a9-limites, dist-a9 = dist-a8, HISTÓRICO A8, a9-perf, a9-equivalencia); sin cambios de código`.

## 5. A9.1 — `src/ui/views.js`
**Funciones** (texto idéntico, −2 espacios): `syncMaterialPresetUI`, `setInteractionMode`, `ensureCep`, `showImport`, `show3D`, `setDebugVisible`, `setActiveTab`, `syncMaterialInputs`, `setArtStatus`. La variable `var interactionMode = 'fold';` pasa a ser **privada de la fábrica** (solo la usa `setInteractionMode` [MEDIDO]).
**Forma:**
```js
// A9.1 — Presentación … (comentario de cabecera como en A7/A8)
import { hasCep } from '../bridge/cep.js';

export function createViews(S, deps){
  var { importView, threeView, outputArea, tabButtons, tabPanels, thicknessInput, materialPresetSelect, materialPill, artStatus, artSourcePill,
        modeFoldBtn, modeBaseBtn, interactionModePill, interactionStatus, viewportBadge, viewport3d,
        errorMsg, testBtn, extractBtn, previewBtn, continueBtn, backBtn, export3dBtn, setStatus, getMaterialPreset } = deps;
  var interactionMode = 'fold';
  …9 funciones…
  return { syncMaterialPresetUI, setInteractionMode, ensureCep, showImport, show3D, setDebugVisible, setActiveTab, syncMaterialInputs, setArtStatus };
}
```
- Comprueba con `grep` la lista de `deps`: cada nombre libre de las 9 funciones tiene que llegar por `deps`, por el import o ser global (`document` no aparece en ellas [MEDIDO]).
- En `main.js`:
  - sale `var interactionMode = 'fold';`;
  - salen las 9 funciones;
  - entra `import { createViews } from './ui/views.js';`;
  - entra la línea de composición **después de `createGlbBuilder`**: `var { syncMaterialPresetUI, … } = createViews(S, { … });`.
- `hasCep` ya no se usa en `main.js`: quítalo de su import de `bridge/cep.js` y deja el resto de la línea como está. `pathToFileURL` ya se importa hoy sin usarse en `main.js` [MEDIDO]: es una rareza que se **conserva** (D-A9-10).
- **Por qué funciona el orden:** hoy `setInteractionMode` y `syncMaterialPresetUI` se llaman solo en tiempo de ejecución (desde orquestadores) o en el arranque, que va después de la composición. Ninguna fábrica de escena las recibe en `deps` [MEDIDO en las líneas de composición].
- **Ajustes de pruebas previstos (D-A9-9):**
  - `a5-limites`: inventario + `ui/views.js`, prefijo `ui/` en los filtros y la lista de imports de `main.js`;
  - `a7-limites`: regla 8 también sobre `ui/`;
  - `a7`/`a8`/`a9-texto-identico`: `NEW_FUNCTIONS` + `createViews` y `EXPECTED_RESIDUAL`;
  - `a9-limites`: inventario y reglas de `views.js` (sin `THREE`, sin `window`, sin `document`, import solo de `bridge/cep`, sin efectos al crearse).
- **Controles nuevos de A9.1:**
  - **14:** `views.js` usa `THREE` ⇒ solo `a9-limites` (laguna declarada);
  - **18:** `createViews` llama a `setStatus` al crearse ⇒ H2/H3;
  - `createViews` copia `S` (`Object.assign({}, S)`) ⇒ debe fallar `syncMaterialInputs` (espesor) en H3/«Escena/materiales»;
  - la composición pasa `materialPill` en lugar de `artSourcePill` ⇒ H2.
- Riesgo: bajo. Mensajes afectados: «CEP bridge not found.» (H3 sin CEP) y los de modo («Base selection mode enabled» no es alcanzable: no hay botones de modo).

## 6. A9.2 — `src/app/actions.js`
**Funciones:** `refreshArtwork` (async), `exportPNG`, `exportGLB` (async), con texto idéntico.
**Forma:**
```js
import { buildArtworkExportScript } from '../host/art.js';
import { evalScriptJSON } from '../bridge/cep.js';
import { saveBlobWithDialog } from '../bridge/fs.js';

export function createActions(S, deps){
  var { log, setStatus, ensureCep, setArtStatus, loadTextureFromPath, applyArtworkToScene, disposeCurrentArtTextures, buildGLBBlobFromCurrentView } = deps;
  …3 funciones…
  return { refreshArtwork, exportPNG, exportGLB };
}
```
- Composición **después de `createViews`** (necesita `ensureCep` y `setArtStatus`).
- En `main.js` salen las 3 funciones y los imports que ya no use: `buildArtworkExportScript`, `evalScriptJSON` si no queda otro uso (los manejadores usan `evalScript`; compruébalo con `grep`) y `saveBlobWithDialog`.
- **El manejador de «Export GLB» se queda en `main.js`** hasta A9.5.
- **Ajustes de pruebas previstos (D-A9-9), sin reducir la detección:**
  - **`a7-limites`:** hoy exige «app/ no usa THREE, window ni document» para **todo** `app/`, y su inventario exacto es `app/state.js` + `scene/` + `fold/`. `exportPNG` usa `document.createElement('a')`. El ajuste aprobado es limitar esa regla de `a7-limites` a `app/state.js` y regir `app/actions.js` con `a9-limites`, de forma **más estricta**: `document` solo dentro de `exportPNG`, sin `THREE`, sin `window`, imports solo de `host/art`, `bridge/cep` y `bridge/fs`. Al mismo tiempo, la regla 8 de `S.` de `a7-limites` **se amplía** a `app/actions.js`, que hoy queda fuera por el filtro `!f.startsWith('app/')`.
  - **`a8-texto-identico`:** la prueba «exportPNG, exportGLB y el manejador de «Export GLB» siguen en main.js (D-A8-2)» falla **por diseño**. Pasa a exigir `exportPNG` y `exportGLB` **una sola vez en `app/actions.js`**, el manejador con su texto exacto en `main.js` y el import de `saveBlobWithDialog` en `app/actions.js`. Mantén la expresión regular del manejador. El comentario de `tests/lib/a8.mjs` (D-A8-2) se actualiza.
  - `a5-limites`: inventario, filtro `app/actions.js` y lista de imports de `main.js` (salen `host/art.js` y `bridge/fs.js`).
  - `a7`/`a8`/`a9-texto-identico`: `NEW_FUNCTIONS` + `createActions` y `EXPECTED_RESIDUAL`.
- **Controles que siguen aplicando sin cambios** (sus patrones no dependen de la ruta):
  - «A8 · exportGLB: el diálogo se abre ANTES de construir el Blob» (`var blob = buildGLBBlobFromCurrentView();`);
  - KI-25 (en el manejador, `main.js`);
  - «puente: mensaje de escritura de GLB»;
  - «guardado: cancelar deja de marcar cancelled».
  Comprueba que siguen «detectada».
- **Controles nuevos de A9.2:**
  - `createActions` recibe `setArtStatus` cambiado por `setStatus` ⇒ H2 / puente CEP (arte);
  - `refreshArtwork` pierde `disposeCurrentArtTextures();` antes de asignar el estado nuevo ⇒ «A7 · ciclo de vida» L1 / GPU;
  - `createActions` copia `S` ⇒ «Arte · bundle» o E4;
  - `exportGLB` pierde la guarda `!S.foldRoot` ⇒ E4 «Build 3D first».
- Riesgo: medio. Son rutas asíncronas y KI-25/KI-26/KI-27 deben seguir **tal cual**. Comprueba N1 (GLB byte a byte), N3, E1–E6, el puente CEP (30 casos) y `a5-observar`.

## 7. Parada obligatoria antes de A9.3 (fin del Bloque 1)
Crea `docs/fase1/A9_PUNTO_DE_CONTROL.md`:
1. Commits.
2. Tabla de baterías por paso (Node, navegador, controles vigentes + nuevos, soak de GPU y de UI).
3. H1–H6 con sus resultados.
4. Equivalencia de texto y de bundle (número real de funciones).
5. Rendimiento por paso.
6. Huellas: `dist-a9` regenerada, históricas intactas y `HISTÓRICO A8` en verde.
7. Ajustes de pruebas hechos, con su justificación «no reduce la detección».
8. Lagunas declaradas.
9. Incidencias.
10. Qué NO se verificó.
11. Riesgos para el Bloque 2.

Actualiza `HANDOFF.md` (§4, §11, §17) y `tests/README.md`. Haz un commit documental, entrega el SHA y **espera**. No empieces A9.3.

## 8. Lo que el Bloque 2 tendrá que resolver (solo como contexto; NO ejecutar)
- **A9.3** `ui/fold-controls.js`: 7 funciones y 6 widgets privados. El envoltorio de `updateSelectedCreaseVisuals` va en la línea de `createCreaseVisuals`.
- **A9.4** `ui/picking.js`: 2 envoltorios en la línea de `createViewport`. Deben devolver el resultado y el registro no puede tener `Pick error`.
- **A9.5** `ui/controller.js`: `lastData` y `problems` privados, la validación, la vista 2D, el preset y un `bindEvents` único con los 15 manejadores en el orden de hoy. El cargador (`tests/lib/legacy.mjs`) acepta la sangría de 2 espacios **solo para `src`**, y `a6-validacion` usa una normalización uniforme.
- **A9.6** cierre: PC10 y A9-CEP preparada sin ejecutar.
- Detalle en `A9_PROPUESTA.md` §5.3, §8.4, §16.2.

## 9. Reversión
- Cada paso es un commit propio: `git revert <sha>` lo deshace. Después, `node tools/build/build.mjs` y comprueba `dist/` frente a la huella del paso anterior.
- `dist-a8` no se toca nunca y `HISTÓRICO A8` la reconstruye desde `3ea0d8a`.
- Si un paso falla a mitad (sin commit): `git checkout -- src tests tools` y `git clean -fd src/ui src/app/actions.js` (comprueba antes con `git status` que solo borras lo creado en ese paso).

## 10. Trampas conocidas (de A5–A8)
- La batería completa con `--mutations --soak` tarda ≈ 50 min. Al cerrar la app se mata, y el *scratchpad* puede vaciarse: guarda los registros en `Tesseract v3/.scratch/`.
- El `find` del shell interactivo es `bfs` y `grep` es `ugrep`. Los scripts usan `bash` con `/usr/bin/find`.
- En `mutation-check-*.sh`, el archivo de prueba va **antes** de cualquier comentario `#` en la línea `run`. Cada patrón debe cambiar **exactamente una línea** de la copia de `src/`.
- esbuild renombra `log` de la clausura a `log2` porque choca con `core/legacy/log.js`. Revisa los renombrados del bundle en `a9-equivalencia`.
- La mediana de 10 corridas puede ser bimodal (falso +15.9 % en A8.3): si sale «investigar», repite con 20.
- `material.version` crece sin exportar (KI-11): no la uses como señal.
- El cargador de N4 (`tests/lib/a8.mjs`, `MODULE_ORDER`) solo carga `src/export/`. A9 no lo toca.
- Chrome headless 155 ≠ Chromium 99 de CEP: los resultados de navegador son un piso optimista.
