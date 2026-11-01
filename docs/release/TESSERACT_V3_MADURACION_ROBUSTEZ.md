# Tesseract V3 — Maduración del producto: robustez y exportación (3.0.1-dev.1)

Fecha: 2026-11-01 · Encargo: «Tesseract V3 — Maduración del producto: robustez y exportación» (lote único) · HEAD inicial: `43125543b4ed54f0eca1d4764e112c6e6baa6666` · Rama local `main` (sin push).
Etiquetas: **[AUTO]** pruebas automatizadas (Node o Chrome headless) · **[REAL]** Adobe Illustrator 30.8.2 real (CEP 12.1.1, Chromium 99) · **[ESTÁTICO]** lectura de código · **[PENDIENTE]** sin comprobar.

> **Estado final del lote (2026-11-01):** H-02, H-03, H-05, H-07, KI-24, KI-02, H-06 y **KI-37** corregidos con pruebas. Versión `3.0.1-dev.1`, `main.js` de producto `e69e4ba8…` (§7). Baterías de producto, experimental e histórica en verde (§15). **Queda sin comprobar:** el validador oficial de Khronos, Dimension y Cinema 4D (§10). El flujo de KI-37 dentro del panel CEP real ya se validó (§15.4).

## 1. Decisión D-0 registrada

Aprobada por el usuario el 2026-11-01:

1. El RC `3.0.0-rc.1` es la línea de desarrollo del producto. El RC queda **cerrado** como referencia: se reconstruye byte a byte desde `7258524` (`build-rc.mjs --commit 7258524 --verify`, prueba `f2a3-rc`).
2. `dist-a9` queda **congelado** como referencia histórica de F1. Su fuente congelada es el commit `4312554` (`HIST_COMMIT` en `tests/lib/d0.mjs`).
3. Se permiten cambios justificados en `src/`. Cada versión tiene su propia identificación, sus huellas y sus pruebas.
4. El motor legacy sigue dentro del producto (modo sombra por defecto); el experimental sigue siendo de activación explícita. No cambió el motor predeterminado.
5. El plugin original y `TesserArt_Validator` no se tocan.

**Transición de build y verificación (ambas líneas se validan, nada se desactiva):**

| Línea | Qué verifica | Cómo |
|---|---|---|
| **A. Histórica (F1)** | `dist-a9` íntegro y reproducible desde su fuente congelada; todas las aserciones de F1 sin cambios («src = referencia», KI-24/KI-28 «se preservan», GLB byte a byte) | `tests/run-historico.sh`: clona el repositorio en un temporal, se coloca en `4312554` y ejecuta **su** `tests/run-all.sh` sin modificar. Además `build.test` reproduce `dist-a9` desde el `src/` de `4312554` en la batería de producto |
| **B. Producto** | Contratos vigentes, defectos corregidos, huellas nuevas | `tests/run-all.sh` (5 pasos; el 5.º es `tests/producto/`) |
| **C. Experimental** | Núcleo, adaptador, árbol, selector, bundle; Caja Botánica 13/12 | `tests/run-experimental.sh` |
| **D. Exportación** | Estructura glTF y dimensiones físicas | `tests/producto/glb-node.test.mjs`, `producto-navegador.test.mjs`, `tests/lib/glb-conformidad.mjs` |

**Cómo se reorientaron las pruebas de F1 sin debilitarlas.** `tests/lib/d0.mjs` es la única lista de diferencias autorizadas: funciones cambiadas (con motivo), funciones, módulos e imports nuevos, la sustitución exacta de H-02 en el script de arte, las 3 líneas de `main.js` y los 2 manejadores de `bindEvents` que cambian. Las pruebas de texto e inventario de A5–A9 comparan **listas exactas**: una diferencia no declarada falla y una declarada que no aparezca también falla. Las comparaciones byte a byte de GLB entre el bundle y el baseline pasan a ser **semánticas** (posiciones ×0,001, mismos nodos, triángulos no nulos, UV, materiales, imágenes byte a byte cuando el codificador es el mismo). Baseline y `panel/` se siguen comparando byte a byte entre sí. Ninguna prueba se eliminó ni se omitió; ningún golden ni huella histórica se modificó (lo comprueba `tests/producto/d0.test.mjs`).

## 2. Archivos modificados

Código (`42446bb`):
- `src/host/art.js` (H-02) · `src/host/doc-identity.js` (**nuevo**, H-05) · `src/app/actions.js` (H-03, H-05) · `src/app/state.js` (+`currentDocIdentity`)
- `src/ui/controller.js` (H-05, KI-24) · `src/fold/folding.js` (KI-24: `buildChildrenOfMap`) · `src/main.js` (cableado; 3 líneas) · `src/scene/artwork.js` (comentario)
- `src/export/glb-scene.js` (KI-02, H-06, H-07) · `src/export/glb-builder.js` (H-06: generador y `asset.extras`)
- `tools/build/build-experimental.mjs` (versión 3.0.1-dev.1, manifiesto 3.0.1) · `tools/a4/a5-observar.mjs` (reconoce el envoltorio de identidad)

Pruebas e infraestructura (`42446bb`): `tests/lib/d0.mjs`, `tests/lib/glb-conformidad.mjs`, `tests/lib/dist.mjs`, `tests/run-all.sh`, `tests/run-historico.sh`, `tests/producto/*` (4 archivos nuevos), huellas nuevas `tests/golden/dist-3.0.1-dev.1.SHA256SUMS` y `tests/golden/producto-3.0.1-dev.1.SHA256SUMS`, y la reorientación D-0 de 18 archivos de pruebas de F1/F2A-3.

Validación real (`5954144`): `tools/a4/v301-real.mjs`, `tools/glb/c4d-medir.py`, evidencia en `docs/release/evidencia/maduracion/`.

## 3. Defectos corregidos

| ID | Clase (auditoría) | Corrección | Prueba que falla antes y pasa después |
|---|---|---|---|
| **H-02 / KI-21** | Defecto demostrado por inspección | `exportArtboardByIndex` restaura la mesa activa en un `finally` (cambio mínimo: una línea del script ExtendScript) | `robustez.test.mjs`: `exportFile` que lanza en Back y en Front ⇒ la mesa original vuelve a estar activa; el modo capas no cambia. Antes: la mesa quedaba en la de Front/Back |
| **H-03 (KI-35)** | Defecto demostrado por inspección | Número de solicitud en `refreshArtwork`; una solicitud solo aplica su arte si sigue siendo la última **y** el modelo (`S.currentPanelData`) y el documento (`S.currentDocIdentity`) son los de su inicio. Lo cargado por una solicitud descartada o fallida se libera. Las texturas del arte anterior se liberan **después** de pasar overlays **y puentes de plegado** al arte nuevo | `producto-navegador.test.mjs`: dos refrescos (el primero responde después) ⇒ gana el último; fallo parcial (front carga, back falla) ⇒ el arte vigente no cambia y la front se libera; reconstruir a mitad de carga ⇒ la vieja se descarta; a 60° los puentes usan el arte nuevo y ninguna textura en uso está liberada |
| **H-05 (KI-36)** | Defecto demostrado por inspección | `host/doc-identity.js`: la extracción y el arte viajan dentro de un envoltorio que devuelve `{tessDoc, r}` con nombre, ruta completa y `xmpMM:DocumentID`. «Continue to 3D» hace **una** comprobación puntual (sin vigilancia continua). Si el documento cambió, invalida la extracción y pide extraer de nuevo. El arte de un documento distinto del del modelo no se aplica | `robustez.test.mjs` (maqueta de Illustrator: mismo nombre en otra carpeta, sin guardar con otro DocumentID, sin documento, XMP ilegible, rutas con comillas) y `producto-navegador.test.mjs` (flujo completo con N0-A/N0-B simulados) |
| **KI-24** | Defecto reproducido (A5) | `buildChildrenOfMap` declarado en `fold/folding.js` (lo usa también `applyFolding`) y cableado al controlador; sin escena no se rehacen pliegues | Node (fábrica real) y navegador: cambiar el preset antes del 3D no lanza; el 3D se construye con ese preset |
| **H-07 / KI-28** | Riesgo no reproducido en real | El máximo de índices es `used.length − 1` (sin `Math.max.apply`) | 130 000 índices (Uint16) y 150 000 índices sobre 70 000 vértices (Uint32): el baseline lanza `RangeError`, src exporta |
| **KI-02** | Defecto medido (Fase 0) y **reproducido en el RC** | Se quitan los triángulos de **área exactamente nula** (índices repetidos o vértices alineados) y los vértices que nadie usa; una normal nula en un vértice usado se repara con la suma de las normales de sus caras. Los triángulos finos pero con área se conservan | Ver §5 |
| **H-06 / KI-03** | Desviación de la especificación | Las **posiciones** (y su min/max) se convierten mm → m **una vez**, en `glb-scene.js`; las normales no se escalan; la escena interna sigue en mm | Ver §6 |

**Causa de KI-02, medida.** En la exportación real del RC en modo activo (`docs/release/evidencia/exportaciones/rc-activo-plano.glb`) las 18 normales nulas son exactamente los 18 vértices de 6 triángulos de área cero de las tapas de `mesh_2` y `mesh_8`. Los contornos del modelo experimental conservan vértices alineados (extremos de crease sobre el borde): la triangulación los convierte en triángulos de área nula, y `computeVertexNormals` les da normal 0. En el GLB de evidencia de la Fase 0 (plugin original) son astillas nulas en coordenadas locales pero no en mundo; en ese caso se conservan y su normal se repara.

**Cambio de interfaz:** ninguno visible. Solo un mensaje nuevo cuando se rechaza construir («The active document changed since the extraction. Extract the dieline again.») o aplicar arte. El idioma sigue el de los mensajes vecinos; la unificación de idioma queda para la etapa de UX.

## 4. Pruebas antes y después

Todas en secuencia, con el experimental retirado temporalmente (el aislamiento estricto lo exige). Evidencia: `docs/release/evidencia/maduracion/v301-baterias.txt`, `v301-experimental.txt`, `v301-historico.txt`.

| Batería | Antes (RC, 2026-10-28) | Después (3.0.1-dev, `42446bb` + `1c03c18`) |
|---|---|---|
| `tests/run-all.sh` · aislamiento + build | verde | verde (`dist/` íntegro y reproducible) |
| · Node | 662 + 1 omitida | **663 + 1 omitida, 0 fallos** (+1: reproducción de `dist-a9` desde `4312554`) |
| · navegador (8 archivos) | 52 · 13 · 31 · 32 · 4 · 6 · 3 · 7 | **los mismos 148, 0 fallos** (comparaciones del bundle reorientadas a D-0) |
| · producto (`tests/producto/`, nuevo) | — | **91/91** tras KI-37 (robustez 13 · KI-37 10 · GLB en Node 48 · navegador 15 · D-0 5); 78/78 antes de KI-37 |
| `tests/run-experimental.sh` | 464/464 | **465/465** (+1: el RC cerrado se reconstruye desde `7258524`) |
| `tests/run-historico.sh` (nuevo; F1 sin cambios sobre `4312554`) | — | **TODO EN VERDE**: Node 662 + 1 omitida, navegador 148/148 |

**Incidencias durante las baterías, todas resueltas y documentadas:**
- La primera ejecución experimental dio **461/464**. Las 3 pruebas comparaban el RC con «el árbol actual», que con D-0 es la línea evolucionada. Ahora verifican el RC **cerrado** desde `7258524` (zip `8f4edc7d…`, `main.js` `b36f3d89…`). La alarma de mutaciones en sitio admite el `sort` del arreglo local de vértices usados, con su justificación.
- La primera ejecución histórica falló por el entorno, no por el código: el clon estaba dentro del temporal del sistema, que varias pruebas de F1 tratan como zona permitida, y faltaba `tests/results/`. El clon va ahora en `.scratch/` (ignorado por git) y con esa carpeta. Las pruebas congeladas no se tocaron.

**Prueba de cada defecto antes y después:**
- **KI-24, KI-28 y KI-21:** el «antes» lo sigue exigiendo la batería histórica, que pasa (los defectos siguen presentes y preservados en `4312554`). El «después» lo exige `tests/producto/` y, en las pruebas de F1 reorientadas, la diferencia D-0 declarada: por ejemplo, `a9 · H2`, `bridge` y `a9-limites` exigen que el ReferenceError **ya no** aparezca.
- **KI-02:** el «antes» está medido en el RC: en la exportación real `rc-activo-plano.glb` y en el bundle RC reconstruido desde `7258524` en la misma escena (18 `ACCESSOR_VECTOR3_NON_UNIT`, 6 triángulos de área nula). El «después» da 0 errores.
- **H-02, H-03 y H-05:** el «antes» está demostrado por inspección (auditoría) y, para H-02, por la prueba de F1 `jsx-validation-scripts` (preservada en la histórica). Las pruebas nuevas **no se ejecutaron contra el código anterior**: describen el comportamiento corregido.

## 5. Validación de GLB

- **Validador oficial de Khronos (`gltf-validator`): NO ejecutado.** No está instalado en este equipo y no se descargó nada sin autorización. **No se declara conformidad completa con Khronos.**
- **Comprobador independiente** (`tests/lib/glb-conformidad.mjs`). Implementa desde la especificación un subconjunto de las reglas de **error** del validador oficial: contenedor y chunks, referencias, límites de vistas y accesores, min/max de POSITION frente a los float32, normales unitarias, índices en rango y sin valor de reinicio, `count % 3`, recuentos de atributos, imágenes y texturas. Se **calibró** con la única medición oficial disponible: sobre el GLB de evidencia de la Fase 0 da exactamente lo que dio el validador oficial (12 `ACCESSOR_VECTOR3_NON_UNIT` y nada más).
- **Antes:** la exportación real del RC en modo activo tiene **18 errores** `ACCESSOR_VECTOR3_NON_UNIT` y 6 triángulos de área nula. Las demás exportaciones del RC tienen 0 errores.
- **Después, 0 errores y 0 triángulos degenerados en todos los casos:**
  - 48 escenas sintéticas de three.js r132 (N4 + casos de KI-02);
  - bundle de producto en Chrome headless: sombra y activo; plano, 60° y con arte;
  - **exportaciones reales en Illustrator** (§9): sombra plano y 60°, activo plano y 60°, sombra con arte a 60°.
- **Equivalencia con las referencias**, comparando triángulo a triángulo con posiciones ×0,001, UV, normales donde la histórica era válida y materiales:
  - la sombra real (3.0.1-dev) equivale a las exportaciones **reales** de A7 (`737bcd23` plano, `87aa2e4c` 60°);
  - el activo real (3.0.1-dev) equivale al activo **real** del RC (`7da50989`), con exactamente sus 6 triángulos de área nula menos.
  - En headless, la sombra del bundle de producto da **los mismos bytes** que en el CEP real (`ffafe55f…` plano, `cd799b59…` 60°).
- Se mantienen la geometría válida, el orden de nodos (invariante G1), los materiales, las imágenes y la alineación del contenedor. Solo dejan de exportarse los triángulos de área nula, los vértices que nadie usa y las mallas sin ningún triángulo con área.

## 6. Comprobación de unidades

- **Conversión:** posiciones y su min/max ×0,001, **una sola vez**, en `export/glb-scene.js`. El min/max se calcula sobre los valores float32 que se escriben. Las normales no se escalan (son direcciones). No hay nodo de escala. La escena interna, el motor e Illustrator siguen en mm. `asset.extras.tesseract = {unidades: 'm', unidadInterna: 'mm', escalaAplicada: 0.001}` es **solo informativo**.
- **Comprobación numérica independiente [AUTO + REAL]:**
  - Caja Botánica plana: 0,174999 × 0,00025 × 0,223499 m, igual a 174,999 × 0,25 × 223,499 mm del GLB histórico real × 0,001 (tolerancia 10⁻⁶ m).
  - El espesor de 0,25 mm sale 0,00025 m. Mínimos, máximos y centro coinciden ×0,001.
  - Una caja de 175 × 0,25 × 223,5 mm desplazada (10; 0,125; −40) da el mismo tamaño y centro en metros.
- **Real [REAL]:** las cinco exportaciones reales miden menos de 1 m de lado (por ejemplo, sombra plano 0,174999 × 0,00025 × 0,223499 m).
- **Consumidores externos: PENDIENTES.**
  - **Adobe Dimension** está instalado pero no es scriptable. Comprobarlo exige abrir el GLB a mano: `docs/release/evidencia/maduracion/glb/real-sombra-plano.glb` debe medir 175 × 0,25 × 223,5 mm.
  - **Cinema 4D 2026** (`c4dpy`, con `tools/glb/c4d-medir.py` preparado) se detiene en la selección interactiva de licencia de Maxon. No se inició sesión en ninguna cuenta.
  - No se instaló ningún otro consumidor.

## 7. Nuevas huellas y referencias

| Qué | Valor |
|---|---|
| Versión | **3.0.1-dev.1** (manifiesto CEP `3.0.1`; etiqueta en `BUILD_INFO.json`). **No es un RC aprobado** |
| Bundle de producto (`dist-experimental/`) | `tests/golden/producto-3.0.1-dev.1.SHA256SUMS` · `main.js` `e69e4ba81c74460d521c69d93fcfa64fde97d1358631391575452a0fdfaa4f40` (con KI-37). La huella de esta versión sin publicar se actualizó; el primer candidato, validado con el panel en §9, fue `5f4ce999…` |
| Bundle normal (legacy, solo vehículo de pruebas) | `tests/golden/dist-3.0.1-dev.1.SHA256SUMS` · `main.js` `78513c597d0fc4375139b9b246d07629304c32667cbf0f1d3c9b08988a76fb7e` (con KI-37; antes `0603c7f5…`) |
| Histórica (sin cambios) | `tests/golden/dist-a9.SHA256SUMS` · `main.js` `e5902a3c…` |
| RC cerrado (sin cambios) | `main.js` `b36f3d89…`, zip `8f4edc7d…` desde `7258524` |
| Referencias GLB nuevas | No hay goldens binarios nuevos: las salidas de 3.0.1-dev se comparan **semánticamente** con las referencias históricas reales (A7 `737bcd23`/`87aa2e4c`, A8 arte `b4973a54`) y con el RC reconstruido. Se fijan dimensiones (0,174999 × 0,00025 × 0,223499 m en plano), número de mallas (11 sombra, 13 activo; 31 a 60°), estructura, materiales, imágenes, normales válidas y pose |

## 8. Estado de las pruebas históricas

- `tests/run-historico.sh` ejecuta **sin modificar** el `tests/run-all.sh` del commit congelado `4312554`: aislamiento, `dist-a9`, Node, navegador, KI-24/KI-28 «se preservan» y GLB byte a byte con los archivos reales. Resultado: **TODO EN VERDE**.
- En la batería de producto, `build.test` reproduce además `tests/golden/dist-a9.SHA256SUMS` (`main.js` `e5902a3c…`) desde el `src/` de `4312554`.
- `tests/producto/d0.test.mjs` comprueba que ninguna huella ni golden de `tests/golden/` cambió respecto de `4312554`, que `reference/`, `tests/fixtures/` y `panel/` no cambiaron, y que la huella vigente es un archivo **nuevo**.
- El RC cerrado se reconstruye byte a byte desde `7258524` (`build-rc --verify` y `f2a3-rc`).

## 9. Resultados en Illustrator real

**Esta tabla corresponde al primer candidato, anterior a KI-37; la validación real de KI-37 está en §15.4.** Adobe Illustrator 30.8.2, CEP 12.1.1, Chromium 99.0.4844.84 (macOS). Panel `com.tato.tesseract.v3.experimental.panel` con el `main.js` de producto `5f4ce999…`, modo sombra al cargar. Conducido con `tools/a4/v301-real.mjs` (DevTools 8089 + AppleScript) sobre copias desechables de N0-A y N0-B, que se abrieron, prepararon y cerraron sin guardar. Illustrator empezó y terminó con **0 documentos**. **0 errores de consola.** Evidencia: `docs/release/evidencia/maduracion/real-todo.json`, `capturas/`, `glb/real-*.glb`.

| Comprobación | Resultado |
|---|---|
| KI-24: preset Kraft antes de construir | Sin excepción; la píldora pasa a «Kraft board» |
| **H-05**: extraer en N0-A, activar N0-B y «Continue to 3D» | **Rechazado**: «The active document changed since the extraction. Extract the dieline again.» Sin 3D; Continue deshabilitado; vista 2D limpia (captura `H05-rechazo.png`) |
| H-05: volver a N0-A, extraer y construir | 3D listo (11 paneles, sombra) |
| **H-05**: «Refresh Artwork» con N0-B activo y el modelo de N0-A | **No se aplica**: «Artwork not applied: the active document is not the one the 3D model was built from…» |
| Activo (experimental) en N0-A | 13 paneles, 12 pliegues; GLB plano y a 60° |
| **H-03**: N0-B, plegado a 60°, dos «Refresh Artwork» seguidos | Arte cargado; 4 texturas liberadas (las del arte anterior y las del intento descartado); sin errores |
| **H-02** | La mesa activa sigue siendo la original (0) tras la exportación de arte por mesas Front/Back. **El camino de excepción NO se pudo provocar en real**: con la carpeta de arte sin escritura, y también con un archivo en su lugar, `exportFile` de Illustrator **no lanza**: falla en silencio (nuevo hallazgo **KI-37**, §10). El camino de excepción está cubierto con fallo inyectado en la maqueta [AUTO] |
| GLB (diálogo sustituido por una ruta, como en F2A-3) | 5 exportaciones con 0 errores, 0 triángulos degenerados y en metros. Equivalentes a las referencias reales (§5). El diálogo nativo no cambió (`host/save-dialog.js` sin cambios) y no se volvió a probar |

**Interacciones manuales con la mano del usuario:** no se hicieron (entrada de confianza por CDP). Siguen pendientes, como en el RC.

## 10. Riesgos pendientes

| Riesgo | Clase | Valoración y siguiente paso |
|---|---|---|
| **KI-37** | **Corregido** (§15) | Validado en el panel CEP real. Queda la limitación de visibilidad del mensaje de §15.5 |
| Validador oficial de Khronos no ejecutado | Limitación de verificación | Ejecutar `gltf-validator` (requiere autorización para descargarlo) sobre `docs/release/evidencia/maduracion/glb/` |
| Dimension y Cinema 4D sin comprobar | Pendiente externo | Abrir `real-sombra-plano.glb` en Dimension: debe medir 175 × 0,25 × 223,5 mm |
| H-05 no detecta cambios dentro del MISMO documento después de extraer | Límite declarado | Volver a extraer, como antes. Evita vigilancia continua (requisito del encargo) |
| H-05: los documentos abiertos desde SVG no tienen `xmpMM:DocumentID` en Illustrator real | Límite observado | La identidad se apoya en nombre y ruta, que ya los distinguen; los documentos sin guardar sí traen DocumentID |
| Huecos 3D y curvas Bézier (H-01, H-04) | Limitación conocida | Sin cambios; no entraban en este lote |
| UX/UI: auditoría y rediseño | Pendiente de producto | No iniciado |
| Activo: el orden de paneles del troquel real difiere del fixture de headless | Diferencia preexistente (también en el RC) | Sin efecto en la geometría; se compara real con real |
| Paquete sin firmar; corpus real de 2 documentos; Windows sin probar | Heredados del RC | Sin cambios |

## 11. Commits

| SHA | Mensaje |
|---|---|
| `42446bbb046b18a574d1f010c5e81e421d576bc3` | feat(producto): línea 3.0.1-dev (D-0) con robustez de estado y GLB conforme |
| `1c03c18440d2bdf07695b949693c10bd1d674b0d` | test(d0): RC cerrado verificado desde 7258524 y batería histórica desde .scratch |
| `59541440e53e34e117c8ef6213969b5de150e251` | test(real): validación de 3.0.1-dev en Illustrator real y evidencia |
| `556986d` (`git rev-parse 556986d` da el SHA completo) | docs(release): informe de maduración 3.0.1-dev, KNOWN_ISSUES y HANDOFF |
| `3285ea5fae9a0ff849687a43d9d65fdff3f27af0` | fix(artwork): detectar fallos silenciosos de exportacion PNG en Illustrator |
| commit que contiene este párrafo (`git log -1 -- docs/release/TESSERACT_V3_MADURACION_ROBUSTEZ.md`) | docs(release): validacion de KI-37 en el panel CEP real |

Autor único en todos: `Gerardo Calambas posada`. Es la grafía exacta de toda la historia del repositorio; la prueba de aislamiento exige un único autor, por lo que no se cambió la minúscula. Sin trailers, sin rebase, sin squash y sin force push. Los cinco primeros, publicados con un push fast-forward autorizado en `tdotp/tesseract-v3-audit`, rama `audit/f2a2`; el último se publica solo con autorización.

## 12. Estado de los plugins instalados

- **Tesseract original** (`/Library/…/extensions/tesseract`): **intacto**, idéntico al baseline (`verify-isolation`).
- **TesserArt_Validator**: **intacto**; snapshot de las demás extensiones idéntico antes y después.
- **tesseract-v3-experimental**: durante la validación se instaló **temporalmente** el bundle 3.0.1-dev (`5f4ce999…`). Al terminar se **restauró el RC 3.0.0-rc.1** (`b36f3d89…`, manifiesto 3.0.0, `.debug` 8089), **byte a byte igual** al estado previo (`instalacion-antes.txt` / `instalacion-despues.txt`).
- Tras la segunda instalación temporal (bundle con KI-37) se restauró de nuevo el RC, otra vez **byte a byte** (`diff -r` con el respaldo tomado antes) y con el snapshot de las demás extensiones idéntico.
- Tras la validación con el panel se restauró por tercera vez el RC, byte a byte. Elegir el panel en el menú no descarga su motor: seguía ejecutando en memoria el bundle de prueba, así que se **recargó** y se comprobó que el código en ejecución es el RC (sin KI-37, modo sombra, «Ready»).
- **Illustrator quedó abierto, con 0 documentos** y el panel experimental visible con el RC. `PlayerDebugMode` no se tocó.
- Nota operativa: con el RC instalado, `dist-experimental/` del repositorio ya es el bundle de producto. Para verificar el aislamiento contra el RC instalado: `TESS_DIST_EXP_DIR="$PWD/release/tesseract-v3-3.0.0-rc.1/extension" tools/verify-isolation.sh --experimental-instalado` (verde).

## 13. Procedimiento de rollback

1. **Código:** volver a `4312554` (último commit de la línea histórica y del RC documentado): `git checkout 4312554` (o `git revert` de los commits de §11). No hay push; nada que deshacer fuera del repositorio local.
2. **Instalación** (ya está en el RC): `tools/a4/a4-experimental.sh uninstall --autorizado-por-usuario=AAAA-MM-DD` borra solo `tesseract-v3-experimental`.
3. **Reinstalar el RC:** desde un árbol `git archive 7258524 src panel experimental tools reference package.json` con `node_modules` enlazado, ejecutar `node tools/build/build-experimental.mjs` y después `tools/a4/a4-experimental.sh install --autorizado-por-usuario=AAAA-MM-DD --debug-port=8089`. Así se hizo en este lote, y el `main.js` resultante es `b36f3d89…`.
4. **Instalar 3.0.1-dev para probarlo:** `node tools/build/build-experimental.mjs`, después `tools/a4/a4-experimental.sh preflight` y `… install --autorizado-por-usuario=AAAA-MM-DD --debug-port=8089`. Reiniciar Illustrator.

## 14. Recomendación de continuidad

- El lote está **cerrado** con las reservas de §10 y §15.4. **Lo siguiente lo define dirección de arte y producto**; este lote no inició UX/UI, visor, materiales, huecos, curvas, F2B ni distribución.
- Verificaciones cortas que siguen abiertas antes de considerar un RC 3.0.1:
  1. ejecutar el validador oficial de Khronos sobre `docs/release/evidencia/maduracion/glb/` (requiere autorizar su descarga);
  2. medir `real-sombra-plano.glb` en Adobe Dimension (debe dar 175 × 0,25 × 223,5 mm);
  3. Cinema 4D, cuando haya licencia;
  4. confirmar a mano Shift+clic y Alt+clic.
- **3.0.1-dev.1 no es un RC aprobado.** Tampoco hay firma ni distribución estable.

## 15. KI-37: cierre

### 15.1 Causa
En Illustrator 30.8.2, `doc.exportFile()` puede terminar **sin excepción y sin escribir el archivo** si no puede crear el PNG. Se reprodujo en real dejando sin escritura la carpeta de arte y también poniendo un archivo en su lugar. El script confiaba en la ausencia de excepciones: devolvía `ok` con una ruta inexistente, el panel intentaba cargarla y `TextureLoader` rechazaba con un `Event` sin `message`. De ahí «Artwork load failed: undefined» (también KI-26).

### 15.2 Implementación
- **`src/host/art.js`** (ES3):
  - tras cada `exportFile` crea un `File` nuevo y exige que exista y que `length > 0`;
  - una excepción de `exportFile` también se convierte en un error con contexto;
  - el error lleva la marca `tessUsuario`, y el `catch` exterior devuelve `{error, usuario: true}`, sin `line:` ni rutas de resultado;
  - el contexto indica el lado y el nombre de la mesa o capa: `frontal (Front)`, `trasero (Back)`, `frontal (Tiro)`, `trasero (Retiro)`;
  - los `finally` existentes (mesa activa y visibilidad) no cambian.
- **Mensajes:**
  - «No se pudo exportar el artwork frontal (Front). Illustrator no creó el archivo PNG. Verifique la carpeta temporal y vuelva a intentarlo.»
  - «… Illustrator creó el archivo PNG vacío. …»
  - «… Illustrator informó: \<detalle\>. …»
- **`src/app/actions.js`:**
  - un error con `usuario` se muestra tal cual, sin intentar cargar ninguna textura;
  - si el PNG existe pero no carga como textura, el mensaje indica el lado afectado («No se pudo cargar como textura el PNG del artwork trasero. Vuelva a actualizar el artwork.»), en lugar de `undefined`;
  - los errores ajenos conservan su formato técnico.
- **Sin cambios:** `src/export`, `src/core`, `src/fold`, `src/scene`, `experimental/`, `panel/` y `reference/`. Tampoco se modificó el puente CEP.
- **Pruebas e infraestructura:** la maqueta de Illustrator simula ahora la escritura (`escritura.bytes`: bytes, `null` sin archivo, 0 vacío, o lanzar); `tests/lib/d0.mjs` declara las sustituciones exactas del script (`D0_ARTE_KI37`); `tests/producto/ki37.test.mjs` es nuevo.

### 15.3 Pruebas antes y después
| Prueba | Antes de la corrección (`evidencia/maduracion/ki37/rojo-*.txt`) | Después |
|---|---|---|
| `tests/producto/ki37.test.mjs` | **7 de 10 fallan** | **10/10** |
| `tests/producto/producto-navegador.test.mjs` | **4 de 15 fallan** | **15/15** |

Cubren: PNG válido; `exportFile` sin excepción y sin archivo; archivo vacío; Front correcto y Back con fallo (sin rutas parciales); fallo con excepción; contexto Tiro/Retiro; modo capas con visibilidad intacta; mesa activa restaurada tras cada fallo; arte vigente conservado (también en overlays y puentes a 60°), sin cargas de textura y sin liberar nada en uso; textura frontal parcial liberada sin afectar a las texturas en uso.

**Baterías finales, en secuencia** (`evidencia/maduracion/ki37/baterias.txt`), con el RC retirado temporalmente:
| Batería | Resultado |
|---|---|
| `tests/run-all.sh` | **TODO EN VERDE**: Node 663 + 1 omitida · navegador 52 · 13 · 31 · 32 · 4 · 6 · 3 · 7 · producto 91 |
| `tests/run-experimental.sh` | **465/465** (Caja Botánica 13 paneles y 12 pliegues sin cambios) |
| `tests/run-historico.sh` | **TODO EN VERDE**: Node 662 + 1 omitida · navegador 148 |

**Regresión comprobada:** los GLB de headless de hoy son **byte a byte iguales** a los del candidato anterior (`ffafe55f…` sombra plano, `cd799b59…` sombra 60°, `6d618320…` activo plano, `e873a319…` activo 60°), y `ffafe55f…` y `cd799b59…` coinciden además con la exportación del CEP real. Por tanto no cambian geometría, número de paneles, árbol y ángulos de plegado, base, materiales y espesor, contenido del GLB, conversión a metros ni normales. Solo se modificaron dos archivos de `src/`.

### 15.4 Illustrator real
`node tools/a4/v301-real.mjs script` (`evidencia/maduracion/ki37/real-script.json`): Illustrator 30.8.2, copias desechables de N0-A y N0-B, textos ExtendScript del producto enviados como cadena Unicode, igual que `evalScript`. Procedimiento de fallo reversible: se registró el contenido y el modo de `tesseract_art` (carpeta de Tesseract), solo se quitó la escritura y se restauró `755`; **nada se borró** (`faltan: []`). Se empezó y terminó con 0 documentos.

| Comprobado en real | Resultado |
|---|---|
| Flujo normal, capas y mesas | PNG en disco, firma PNG correcta (28–31 KB); mesa activa y capas intactas |
| N0-A: extracción con identidad; sin arte | 12 creases, modo `none` |
| **KI-37, modo capas, sin escritura** | «No se pudo exportar el artwork frontal (Front). Illustrator no creó el archivo PNG. Verifique…», `usuario: true`, sin rutas; capas intactas |
| **KI-37 + H-02, mesas Tiro/Retiro, sin escritura** | Mensaje con `frontal (Tiro)`, acentos correctos; **mesa activa restaurada: el camino del `finally` ya se ejerce en real** |
| Recuperación al restaurar el permiso | Exporta de nuevo los dos PNG |

**Panel CEP real, con la sesión desbloqueada** (`node tools/a4/v301-real.mjs todo`; `evidencia/maduracion/ki37/real-panel.json`): panel con el `main.js` `e69e4ba8…`, modo sombra, 0 errores de consola; se empezó y terminó con 0 documentos.

| Comprobado en el panel real | Resultado |
|---|---|
| **KI-37, capas, sin escritura** | `art-status`: mensaje exacto con `frontal (Front)`; indicador «Art error»; capas y mesa activa intactas |
| **Arte vigente conservado** | GLB con arte **idéntico antes y después del fallo** (`67ba14d7…`) |
| Recuperación | Al restaurar el permiso, «Artwork loaded from layers» |
| **KI-37 + H-02, mesas, sin escritura** | Mensaje exacto; mesa activa original (0) restaurada; después «Artwork loaded from artboards» |
| Carpeta `tesseract_art` | Modo `755` restaurado; `faltan: []` |
| H-05, H-03 (doble refresco), KI-24, activo 13/12 | Igual que en §9, con este bundle |
| GLB reales | 0 errores y 0 degenerados; **mismos bytes que el candidato anterior**: `ffafe55f…`, `cd799b59…`, `49b756b7…`, `c9d0a4de…`, `67ba14d7…` |

**Solo con maqueta, no reproducidos en real:** el archivo vacío, «Front correcto y Back falla» y la excepción de `exportFile`. La comprobación del mensaje en el panel se hizo por el texto del DOM (`art-status`): la captura `real-panel-pestana-material.png` tiene activa la pestaña Material y **no** lo muestra (§15.5). La interacción fue por CDP, no con la mano del usuario.

### 15.5 Limitaciones restantes de KI-37
- Los PNG correctos de un intento parcial (Front escrito y Back fallido) quedan en la carpeta temporal, como cualquier exportación anterior; no se borran.
- **Visibilidad del mensaje:** `art-status` está dentro de la pestaña **Artwork** (comportamiento anterior a KI-37). Al pulsar «Refresh Artwork» se ve, porque el botón está en esa pestaña. En el refresco automático de «Continue to 3D» está activa la pestaña Material y la línea de estado superior no lo muestra: **el usuario no ve el fallo hasta abrir Artwork**. No se cambió: corresponde a la revisión de UX/UI, salvo que se decida antes.
- Los mensajes de KI-37 están en español y el resto del panel sigue en inglés; la unificación corresponde a UX/UI.
- La comprobación es de existencia y tamaño, no de validez interna del PNG; un PNG corrupto con datos llegaría a la carga de textura y daría el mensaje de textura.
