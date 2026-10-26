# A7-CEP — Validación corta del bundle A7 en Illustrator CEP real: procedimiento

Estado: **PREPARADO, NO EJECUTADO. Nada instalado.** La autorización de A7 (2026-10-25) **no** cubre instalar ni cargar el bundle en Illustrator. Ejecutar esto requiere una autorización **expresa y fechada** del usuario, aparte.
Base: cierre de A7 (PC8). Reutiliza el procedimiento y las herramientas de A4, A5 y A6 (`A4_PROCEDIMIENTO.md`, `A6_VALIDACION_CEP_PROCEDIMIENTO.md`, `tools/a4/`), ejecutadas y revertidas con éxito el 2026-10-23, el 2026-10-24 y el 2026-10-25.
Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Objetivo y alcance
**Objetivo:** comprobar en el Chromium 99 real de CEP que el bundle de A7, con el estado en `src/app/state.js` y la escena y el plegado en `src/scene/` y `src/fold/`, se comporta **exactamente igual** que el bundle de A6 validado en real. La comparación es automática contra la evidencia real de A6 (`docs/fase1/a6-real/`). A diferencia de A6, **A7 sí toca la escena, el arte y el plegado**, así que la validación incluye el **arte** (N0-B) y la **fuga GPU en real**.

| Cambio de A7 | Lo valida |
|---|---|
| Estado compartido en `S` (26 campos) | V-2 y V-3: extracción, 3D, base, plegado, espesor, presets y GLB idénticos a A6 |
| Visor (`scene/viewport.js`: renderer, luces, rejilla, ejes, capa de órbita, bucle) | V-1 (carga sin errores), V-2 (hashes del lienzo) |
| Malla de paneles, materiales y etiquetas (`scene/panel-meshes.js`, `materials.js`, `labels.js`) | V-2 (paso a 3D, presets, espesor) y V-5 (liberación en reconstrucciones) |
| Arte (`scene/artwork.js`) | V-4: `a4-paridad arte` sobre N0-B y GLB con arte `b4973a54…` |
| Pliegues visuales y plegado (`scene/crease-visuals.js`, `fold/folding.js`) | V-2 (P-4 plegado) y V-3 (GLB a 60°: el orden de inserción en la escena define el GLB) |
| Rutas de liberación de A1 movidas con su texto | **V-5: GPU Δ = 0 en real** (`cdp-run leak`) |

**Fuera de alcance:** el diálogo «Save GLB» real y los textos ExtendScript (A7 no los tocó; se validaron en real en A5). Tampoco entran Shift+clic en el lienzo real, el validador Khronos ni Windows. No se corrige nada: KI-01…KI-27 deben reproducirse tal cual (KI-04/KI-22: 11 de 13; KI-06: el hueco de N0-B no se recorta).

## 2. Identidad del paquete [MEDIDO al cierre de A7]
| Dato | Valor |
|---|---|
| Fuente | `src/` al cierre de A7 (ver `A7_INFORME.md`) |
| `dist/main.js` | sha256 `9784ec70e103a1eb8f91d8d58e2104585466f498a94e554d41d994bcce8944fc` = `tests/golden/dist-a7.SHA256SUMS` |
| Diferencia con A6 | Solo `main.js`; los otros 12 archivos de `dist/` son idénticos a los de A6/A5/A4 |
| Identidad CEP | `com.tato.tesseract.v3` / `com.tato.tesseract.v3.panel`, menú **Tesseract V3**, destino `~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3` (igual que A4–A6) |

## 3. Valores esperados
| Qué | Esperado |
|---|---|
| Identidad | `main.js` cargado = `9784ec70…` (A7), `Chrome/99.0.4844.84`, CEP 12.1.1, three r132 |
| `a4-paridad caja` sobre N0-A | **Idéntica** a `docs/fase1/a6-real/paridad-caja-2026-10-26T03-15-02-116Z.json` (comparador con referencia explícita; solo se ignoran fecha, tiempos y nº de eventos de consola) |
| `a4-paridad arte` sobre N0-B | **Idéntica** a `docs/fase1/a6-real/paridad-arte-2026-10-26T03-15-33-260Z.json` |
| GLB caja plano / todas a 60° / arte | `737bcd23…` (33 436 B) / `87aa2e4c…` (54 224 B) / `b4973a54…` (295 440 B): los mismos que A4–A6 en real y que el bundle A7 en Chrome headless |
| GPU (`cdp-run leak --cycles=3`) | Veredicto «SIN CRECIMIENTO ACUMULATIVO»: Δ texturas/buffers/VAO/programas = 0 tras el ciclo de calentamiento (como A4 en real) |
| Consola | 0 errores (el único aviso conocido, «"abc" cannot be parsed», lo provoca la prueba de espesor) |

## 4. Herramientas (todas probadas en real en A4–A6)
`tools/a4/a4.sh` (preflight, install, verify, diagnose, rollback) · `tools/a4/cdp-run.mjs` (targets, identity, console, leak) · `tools/a4/a4-paridad.mjs caja|arte` · `tools/a4/a6-comparar-paridad.mjs <nuevo.json> <referencia.json>` (con la **referencia A6 explícita**; `tests/node/a7-cep-preparacion.test.mjs` comprueba que da «idéntica» entre las evidencias reales de A5 y A6 y que los GLB reales de A6 tienen los hashes esperados) · `tools/illustrator/run-nivel0.mjs a4-open|a4-close` · `tools/a4/a5-estado-doc.sh` (estado de N0-B antes y después).

## 5. Procedimiento (desde `Tesseract v3/`; ante cualquier FALLA: detener, `diagnose`, rollback)
**Paso 0 — Autorización (usuario).** Mensaje expreso, p. ej.: «Autorizo instalar temporalmente el bundle A7 en CEP para su validación, hoy AAAA-MM-DD». Sin él no se pasa de aquí. La fecha va en `--autorizado-por-usuario=AAAA-MM-DD`.

**Paso 1 — Línea base (solo lectura).**
```bash
git status --short                                   # vacío; anotar git rev-parse --short HEAD
node tools/build/build.mjs && diff dist/SHA256SUMS tests/golden/dist-a7.SHA256SUMS && echo "dist = A7"
tools/verify-isolation.sh && tools/a4/a4.sh preflight
```
**Paso 2 — Usuario:** guardar el trabajo real y cerrar Illustrator (las herramientas exigen 0 documentos).

**Paso 3 — Instalar y verificar.**
```bash
tools/a4/a4.sh install --autorizado-por-usuario=AAAA-MM-DD --debug-port=8088   # INSTALACIÓN CORRECTA
tools/a4/a4.sh verify && tools/verify-isolation.sh --a4-instalado             # VERIFY CORRECTO
```
**Paso 4 — Usuario:** abrir Illustrator **sin documentos** y **Ventana ▸ Extensiones ▸ Tesseract V3**. Si el panel no carga en la primera sesión (incidencia de A5 y A6), reiniciar Illustrator. **Comprobar que de verdad cargó:** `curl -s 127.0.0.1:8088/json/list` debe listar el panel. No basta con que el usuario diga «panel abierto».

**V-1 Carga del panel.**
```bash
node tools/a4/cdp-run.mjs targets --out=tests/results/a7-cep
node tools/a4/cdp-run.mjs identity --out=tests/results/a7-cep                         # IDENTIDAD CORRECTA y SHA-256 de main.js = 9784ec70…
node tools/a4/cdp-run.mjs console --reload --seconds=10 --out=tests/results/a7-cep    # 0 errores desde la carga
```
**V-2 y V-3 Caja: extracción, validación, 3D, base, plegado, espesor, presets y GLB.**
```bash
node tools/illustrator/run-nivel0.mjs a4-open N0-A
node tools/a4/a4-paridad.mjs caja --tag=N0-A --out=tests/results/a7-cep
node tools/a4/a6-comparar-paridad.mjs tests/results/a7-cep/paridad-caja-*.json docs/fase1/a6-real/paridad-caja-2026-10-26T03-15-02-116Z.json   # PARIDAD IDÉNTICA
shasum -a 256 /private/tmp/tesseract_a4/pose*.glb                                    # 737bcd23… y 87aa2e4c…
```
**V-5 GPU en real** (con N0-A abierto y el 3D construido): `node tools/a4/cdp-run.mjs leak --cycles=3 --out=tests/results/a7-cep` → «SIN CRECIMIENTO ACUMULATIVO». Después, `node tools/illustrator/run-nivel0.mjs a4-close`.

**V-4 Arte (N0-B).**
```bash
node tools/illustrator/run-nivel0.mjs a4-open N0-B
tools/a4/a5-estado-doc.sh tests/results/a7-cep/n0b-estado-antes.txt      # solo lectura; N0-B activo
node tools/a4/a4-paridad.mjs arte --tag=N0-B --out=tests/results/a7-cep
node tools/a4/a6-comparar-paridad.mjs tests/results/a7-cep/paridad-arte-*.json docs/fase1/a6-real/paridad-arte-2026-10-26T03-15-33-260Z.json   # PARIDAD IDÉNTICA
tools/a4/a5-estado-doc.sh tests/results/a7-cep/n0b-estado-despues.txt    # = antes (y = docs/fase1/a6-real/n0b-estado-antes.txt)
```
Usuario: confirmar a simple vista la orientación y los colores del arte. El hueco sigue sin recortarse (KI-06, preexistente).

**V-6 Cierre.**
```bash
node tools/a4/cdp-run.mjs console --seconds=10 --out=tests/results/a7-cep
node tools/illustrator/run-nivel0.mjs a4-close    # Illustrator vuelve a 0 documentos
tools/a4/a4.sh diagnose && tools/a4/a4.sh verify
```
**Paso 5 — Evidencia.** Copiar `tests/results/a7-cep/` y los registros de `tests/results/a4/` (snapshot, install-record, diagnóstico) a `docs/fase1/a7-real/` (como `.json`/`.txt`, porque `*.log` está ignorado por git), junto con los GLB. Fijar la evidencia con una prueba (como `a6-cep-evidencia.test.mjs`) y redactar `A7_VALIDACION_CEP_INFORME.md`.

**Paso 6 — Rollback (siempre).** Usuario: cerrar Illustrator. Luego:
```bash
tools/a4/a4.sh rollback --autorizado-por-usuario=AAAA-MM-DD && tools/verify-isolation.sh   # ROLLBACK CORRECTO; estricto en verde
```
Usuario: reabrir Illustrator y comprobar que «Tesseract V3» ya no está y que «Tesseract» (instalado) sigue funcionando.

## 6. Criterios de aceptación
| # | Criterio |
|---|---|
| V-1 | Instala; `verify` correcto; identidad con `main.js` = `9784ec70…`; 0 errores de consola desde la carga |
| V-2 | `a6-comparar-paridad` con referencia A6 → **PARIDAD IDÉNTICA** en caja (incluye 11 de 13, validación, log de paneles, base, hashes del lienzo, espesor, presets y GLB) |
| V-3 | GLB plano `737bcd23…` y a 60° `87aa2e4c…` |
| V-4 | Paridad idéntica en arte, GLB con arte `b4973a54…`, N0-B idéntico antes y después, arte confirmado a simple vista por el usuario |
| V-5 | GPU Δ = 0 en real tras el calentamiento |
| V-6 | 0 errores de consola en toda la sesión; Illustrator en 0 documentos; ningún documento real abierto ni modificado; rollback correcto y `verify-isolation.sh` estricto en verde |
| Fallo | Cualquier diferencia ⇒ detener, `diagnose`, rollback e informe. **No se corrige nada en caliente** |

## 7. Riesgos específicos
| Riesgo | Mitigación |
|---|---|
| Diferencia de entorno y no del bundle | El comparador ignora solo `fecha`, `ms` y `eventos`. Entre A5 y A6 reales da «idéntica» (`a7-cep-preparacion`) |
| `leak` mueve el panel (sliders, espesor, preset, reconstrucción) | Se ejecuta **después** de `a4-paridad caja`, que necesita el estado inicial |
| Caché de CEP con una versión vieja | `identity` lo detecta por el SHA-256 de `main.js` |
| Panel que no carga en la primera sesión | Reiniciar Illustrator; verificar con `curl` el puerto 8088 |

## 8. Lo que NO cubre
Diálogo «Save GLB» real y textos ExtendScript (validados en A5; A7 no los tocó) · Shift+clic en el lienzo real · rendimiento y FPS en real (solo hay medición en Chrome headless: `docs/fase1/a7/rendimiento-*.json`) · validador Khronos · Windows · troqueles de trabajo distintos de N0-A y N0-B.
