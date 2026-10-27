# A9-CEP — Validación corta del bundle A9 en Illustrator CEP real: procedimiento

Estado: **PREPARADO, NO EJECUTADO. Nada instalado.** La autorización de A9.5–A9.6 (2026-10-27) **no** cubre instalar ni cargar el bundle en Illustrator (D-A9-12). Ejecutar esto requiere una autorización **expresa y fechada** del usuario, aparte.
Base: cierre de A9 (PC10, `A9_INFORME.md`). Reutiliza el procedimiento y las herramientas de A4–A8 (`A8_VALIDACION_CEP_PROCEDIMIENTO.md`, `tools/a4/`), ejecutadas y revertidas con éxito del 2026-10-23 al 2026-10-26.
Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Objetivo y alcance
**Objetivo:** comprobar en el Chromium 99 real de CEP que el bundle de A9 —interfaz y orquestación separadas en `ui/views.js`, `ui/fold-controls.js`, `ui/picking.js`, `app/actions.js` y `ui/controller.js`, con 3 envoltorios de enlace tardío y un único `bindEvents`— se comporta **exactamente igual** que el bundle de A8 validado en real, y **probar por primera vez en real Shift+clic y Alt+clic** (riesgo R13, pendiente desde A4). La comparación automática es contra la evidencia real de A8 (`docs/fase1/a8-real/`).

| Cambio de A9 | Lo valida |
|---|---|
| `ui/views.js`, `ui/controller.js` (validación, 2D, preset, 15 manejadores en `bindEvents`) | V-1 (arranque, consola), V-2 (paridad caja: extracción, validación, 11 de 13, base, plegado, espesor, presets, lienzo), V-6 (manual: pestañas, Escape, debug) |
| `ui/fold-controls.js` + envoltorio de `updateSelectedCreaseVisuals` | V-2 (plegado, base) y V-6 (manual: deslizadores, ALL, Reset Flat, base por select, resaltado de la crease) |
| `ui/picking.js` + 2 envoltorios de pick | **V-6 (manual): Shift+clic y Alt+clic en el lienzo real** y V-6b (consola sin `Pick error`) |
| `app/actions.js` (arte, PNG, GLB) | V-3 (GLB en 2 poses), V-4 (**GLB con arte `b4973a54…` byte a byte**), V-5 (diálogo «Save GLB» real con KI-25) |

**Fuera de alcance:** validador Khronos (KI-02), rendimiento/FPS en real, Windows. No se corrige nada: KI-01…KI-29 deben reproducirse tal cual (KI-04/KI-22: 11 de 13; KI-06: el hueco de N0-B no se recorta; KI-24 no se ejerce; KI-25: el mensaje final sobrescribe el resultado del guardado; **KI-29: Alt+clic puede seleccionar una crease distinta de la clicada**).

## 2. Identidad del paquete [MEDIDO al cierre de A9]
| Dato | Valor |
|---|---|
| Fuente | `src/` al cierre de A9 (commit de A9.5; ver `A9_INFORME.md`) |
| `dist/main.js` | sha256 `e5902a3cc3deccf19f07c236a8fd4d6b98834baae30c564dfc367350406f9d46` = `tests/golden/dist-a9.SHA256SUMS` |
| Diferencia con A8 | Solo `main.js`; los otros 12 archivos de `dist/` son idénticos a los de A8/A7/A6/A5/A4 |
| Identidad CEP | `com.tato.tesseract.v3` / `com.tato.tesseract.v3.panel`, menú **Tesseract V3**, destino `~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3` (igual que A4–A8) |

## 3. Valores esperados
| Qué | Esperado |
|---|---|
| Identidad | `main.js` cargado = `e5902a3c…` (A9), `Chrome/99.0.4844.84`, CEP 12.1.1, three r132 |
| `a4-paridad caja` sobre N0-A | **Idéntica** a `docs/fase1/a8-real/paridad-caja-2026-10-26T23-20-40-335Z.json` (comparador con referencia explícita) |
| `a4-paridad arte` sobre N0-B | **Idéntica** a `docs/fase1/a8-real/paridad-arte-2026-10-26T23-23-49-804Z.json` |
| GLB caja plano / todas a 60° | `737bcd2312da1191…` (33 436 B) / `87aa2e4c5cc39092…` (54 224 B) |
| GLB con arte | **`b4973a54840cd0c1…` (295 440 B) byte a byte**, como A4–A8 en real |
| Diálogo «Save GLB» real | Guardar: `Exporting GLB…` → `GLB saved: <ruta>` → `GLB exported from current 3D pose` (KI-25), 1 escritura `err 0`, archivo = `737bcd23…`. Cancelar: `Exporting GLB…` → `GLB export cancelled` → `GLB exported from current 3D pose`, 0 escrituras |
| Shift+clic (manual) | La base pasa al panel clicado: el select «Base» muestra ese panel, pestaña **Material** activa, estado «Base set to P<n> · Shift + click another panel to change it» |
| Alt+clic (manual) | Se selecciona una crease: pestaña **Creases** activa, estado «Crease C<k> selected · Alt/Option + click another red line to retarget», línea en amarillo (`#ffd166`) y su fila resaltada; puede no ser la línea clicada (**KI-29**, se anota, no es fallo) |
| Consola durante las pruebas manuales | 0 errores y **ningún `[Tesseract] Pick error`** |
| GPU (complementario) | `cdp-run leak --cycles=3` → «SIN CRECIMIENTO ACUMULATIVO» |

## 4. Herramientas (todas probadas en real en A4–A8)
`tools/a4/a4.sh` (preflight, install, verify, diagnose, rollback; install/rollback exigen `--autorizado-por-usuario=AAAA-MM-DD`) · `tools/a4/cdp-run.mjs` (targets, identity, console, leak) · `tools/a4/a4-paridad.mjs caja|arte` · `tools/a4/a6-comparar-paridad.mjs <nuevo.json> <referencia.json>` (con la **referencia A8 explícita**; `tests/node/a9-cep-preparacion.test.mjs` comprueba que da «idéntica» entre las evidencias reales de A7 y A8 y que los GLB reales de A8 tienen los hashes esperados) · `tools/a4/a5-observar.mjs instalar|leer` · `tools/illustrator/run-nivel0.mjs a4-open|a4-close` · `tools/a4/a5-estado-doc.sh`. **`cdp-run console` recoge también `console.log`: el `log()` del panel escribe `[Tesseract] …`, así que un `Pick error` tragado por el `try/catch` del visor aparece ahí.**

## 5. Procedimiento (desde `Tesseract v3/`; ante cualquier FALLA: detener, `diagnose`, rollback)
**Paso 0 — Autorización (usuario).** Mensaje expreso, p. ej.: «Autorizo instalar temporalmente el bundle A9 en CEP para su validación, hoy AAAA-MM-DD». Sin él no se pasa de aquí.

**Paso 1 — Línea base (solo lectura).**
```bash
git status --short                                   # vacío; anotar git rev-parse --short HEAD
node tools/build/build.mjs && diff dist/SHA256SUMS tests/golden/dist-a9.SHA256SUMS && echo "dist = A9"
tools/verify-isolation.sh && tools/a4/a4.sh preflight
mv tests/results/a4 tests/results/a4-ejecucion-2026-10-26   # apartar los registros de A8-CEP, si existen (tras cmp con docs/fase1/a8-real/)
```
**Paso 2 — Usuario:** guardar el trabajo real y cerrar Illustrator (las herramientas exigen 0 documentos).

**Paso 3 — Instalar y verificar.**
```bash
tools/a4/a4.sh install --autorizado-por-usuario=AAAA-MM-DD --debug-port=8088   # INSTALACIÓN CORRECTA
tools/a4/a4.sh verify && tools/verify-isolation.sh --a4-instalado             # VERIFY CORRECTO
```
**Paso 4 — Usuario:** abrir Illustrator **sin documentos** y **Ventana ▸ Extensiones ▸ Tesseract V3**. Si no carga en la primera sesión, reiniciar Illustrator. Comprobar con `curl -s 127.0.0.1:8088/json/list`.

**V-1 Identidad, arranque y consola.**
```bash
node tools/a4/cdp-run.mjs targets --out=tests/results/a9-cep
node tools/a4/cdp-run.mjs identity --out=tests/results/a9-cep                         # IDENTIDAD CORRECTA y SHA-256 de main.js = e5902a3c…
node tools/a4/cdp-run.mjs console --reload --seconds=10 --out=tests/results/a9-cep    # 0 errores desde la carga (arranque: guarda, ensureCep, bindEvents)
```
**V-2 y V-3 Caja (N0-A).**
```bash
node tools/illustrator/run-nivel0.mjs a4-open N0-A
node tools/a4/a5-observar.mjs instalar
node tools/a4/a4-paridad.mjs caja --tag=N0-A --out=tests/results/a9-cep
node tools/a4/a6-comparar-paridad.mjs tests/results/a9-cep/paridad-caja-*.json docs/fase1/a8-real/paridad-caja-2026-10-26T23-20-40-335Z.json   # PARIDAD IDÉNTICA
shasum -a 256 /private/tmp/tesseract_a4/pose*.glb                                    # 737bcd23… y 87aa2e4c…
```
**V-5 Diálogo «Save GLB» REAL (usuario; N0-A con el 3D construido).** Reset Flat → **Export GLB** → carpeta `/private/tmp/tesseract_a9/`, nombre `a9-plano` → **Guardar**; después **Export GLB** → **Cancelar**.
```bash
node tools/a4/a5-observar.mjs leer --restaurar --out=tests/results/a9-cep   # OBSERVACIÓN CORRECTA: scripts = baseline; 1 escritura err 0; KI-25 en guardar y cancelar
shasum -a 256 /private/tmp/tesseract_a9/a9-plano.glb                          # 737bcd23…
```
**V-6 Interfaz a mano (usuario) con la consola capturando (D-A9-12; R13).** En una terminal, **antes** de empezar: `node tools/a4/cdp-run.mjs console --seconds=240 --out=tests/results/a9-cep`. En el panel, con N0-A y el 3D construido, en este orden, anotando lo que se ve:
1. **Primer clic tras el 3D:** pulsar **Back** y **Continue to 3D** de nuevo; el primer clic sobre el lienzo debe ser **Shift+clic** sobre un panel que no sea la base ⇒ cambia la base (select «Base» y estado «Base set to P…»), pestaña Material.
2. Un clic **sin** modificador sobre otro panel ⇒ no cambia nada.
3. **Alt+clic** sobre una línea roja ⇒ pestaña Creases, estado «Crease C… selected», línea amarilla y fila resaltada; anotar la línea clicada y la seleccionada (KI-29).
4. Mover el deslizador **ALL** a ~60° ⇒ el modelo se pliega; la crease seleccionada sigue amarilla. Mover un deslizador de una crease concreta. **Reset Flat** ⇒ plano.
5. Cambiar la base con el select **Base** ⇒ se reconstruye el panel de pliegues.
6. Pestañas **Material / Artwork / Creases / Debug** ⇒ cada una activa su panel. **Escape** con la vista 3D ⇒ «Crease selection mode enabled»; Escape con el foco en el campo de espesor ⇒ nada.
7. Espesor `0.8` + **Apply** ⇒ «Thickness applied: 0.8mm»; espesor `0` ⇒ «Thickness must be greater than 0». Preset **Kraft** ⇒ «Material preset applied: Kraft board» (el 3D existe: no se ejerce KI-24).
8. Casilla **Debug** ⇒ muestra/oculta la salida JSON (en la vista de importación).
Al terminar la captura: el archivo `console-*.json` de `tests/results/a9-cep/` debe tener **0 errores y ninguna entrada `[Tesseract] Pick error`**.
**V-7 GPU (complementario):** `node tools/a4/cdp-run.mjs leak --cycles=3 --out=tests/results/a9-cep` → «SIN CRECIMIENTO ACUMULATIVO». Después, `node tools/illustrator/run-nivel0.mjs a4-close`.

**V-4 Arte (N0-B) y GLB con arte byte a byte.**
```bash
node tools/illustrator/run-nivel0.mjs a4-open N0-B
tools/a4/a5-estado-doc.sh tests/results/a9-cep/n0b-estado-antes.txt
node tools/a4/a4-paridad.mjs arte --tag=N0-B --out=tests/results/a9-cep
node tools/a4/a6-comparar-paridad.mjs tests/results/a9-cep/paridad-arte-*.json docs/fase1/a8-real/paridad-arte-2026-10-26T23-23-49-804Z.json   # PARIDAD IDÉNTICA
shasum -a 256 /private/tmp/tesseract_a4/arte.glb                          # b4973a54840cd0c1… (295 440 B)
cmp /private/tmp/tesseract_a4/arte.glb docs/fase1/a8-real/glb/paridad-arte.glb && echo "GLB con arte = A8 real byte a byte"
tools/a4/a5-estado-doc.sh tests/results/a9-cep/n0b-estado-despues.txt
diff tests/results/a9-cep/n0b-estado-antes.txt tests/results/a9-cep/n0b-estado-despues.txt && echo "documento intacto"
```
Usuario: confirmar a simple vista el arte (el hueco sigue sin recortarse: KI-06).

**V-8 Cierre.**
```bash
node tools/a4/cdp-run.mjs console --seconds=10 --out=tests/results/a9-cep
node tools/illustrator/run-nivel0.mjs a4-close
tools/a4/a4.sh diagnose && tools/a4/a4.sh verify
```
**Paso 5 — Evidencia.** Copiar `tests/results/a9-cep/` y los registros de `tests/results/a4/` a `docs/fase1/a9-real/` (como `.json`/`.txt`), con los GLB y las notas del usuario de V-6. Fijar la evidencia con una prueba (como `a8-cep-evidencia.test.mjs`) y redactar `A9_VALIDACION_CEP_INFORME.md`.

**Paso 6 — Rollback (siempre, también si algo falla).** Usuario: cerrar Illustrator. Luego:
```bash
tools/a4/a4.sh rollback --autorizado-por-usuario=AAAA-MM-DD && tools/verify-isolation.sh   # ROLLBACK CORRECTO; estricto en verde
```
Usuario: reabrir Illustrator y comprobar que «Tesseract V3» ya no está y que «Tesseract» (instalado) sigue funcionando.

## 6. Criterios de aceptación
| # | Criterio |
|---|---|
| V-1 | Instala; `verify` correcto; identidad con `main.js` = `e5902a3c…`; 0 errores de consola desde la carga |
| V-2 | `a6-comparar-paridad` con referencia A8 → **PARIDAD IDÉNTICA** en caja |
| V-3 | GLB plano `737bcd23…` y a 60° `87aa2e4c…` |
| V-4 | Paridad idéntica en arte; **GLB con arte = `b4973a54…` byte a byte**; N0-B idéntico antes y después; arte confirmado a simple vista |
| V-5 | Diálogo real: guardar = `737bcd23…` con `err 0`; cancelar no escribe; KI-25 tal cual; scripts ExtendScript = baseline |
| V-6 | Los 8 puntos manuales con el resultado esperado; Shift+clic y Alt+clic funcionan **en el primer clic tras el 3D**; consola con 0 errores y **ningún `Pick error`**; KI-29 anotado |
| V-7 | (complementario) GPU Δ = 0 tras el calentamiento |
| V-8 | 0 errores en toda la sesión; Illustrator en 0 documentos; ningún documento real abierto ni modificado; rollback correcto y `verify-isolation.sh` estricto en verde |
| Fallo | Cualquier diferencia ⇒ detener, `diagnose`, rollback e informe. **No se corrige nada en caliente.** |

**F1 no se declara cerrada hasta que el usuario apruebe esta validación real.**

## 7. Riesgos específicos
| Riesgo | Mitigación |
|---|---|
| Diferencia de entorno y no del bundle | El comparador ignora solo `fecha`, `ms` y `eventos`. Entre A7 y A8 reales da «idéntica» (`a9-cep-preparacion`) |
| Eventos de ratón reales (pointer, overlay, `setPointerCapture`) distintos de los sintéticos de headless | Es justo lo que mide V-6; un fallo de cableado dejaría `Pick error` en la consola |
| `leak` y `a4-paridad` mueven el panel | V-6 va después de V-5 y antes de V-7; el panel se reconstruye con Back/Continue al empezar V-6 |
| Panel que no carga en la primera sesión | Reiniciar Illustrator; verificar con `curl` el puerto 8088 |

## 8. Lo que NO cubre
Rendimiento y FPS en real · validador Khronos (KI-02) · Windows · troqueles de trabajo distintos de N0-A y N0-B · la medición automática de las escuchas (H1) en real (solo se comprueba su efecto y la consola).
