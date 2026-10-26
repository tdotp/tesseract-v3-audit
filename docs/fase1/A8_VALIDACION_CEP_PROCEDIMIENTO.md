# A8-CEP — Validación corta del bundle A8 en Illustrator CEP real: procedimiento

Estado: **PREPARADO, NO EJECUTADO. Nada instalado.** La autorización de A8.4–A8.5 (2026-10-26) **no** cubre instalar ni cargar el bundle en Illustrator. Ejecutar esto requiere una autorización **expresa y fechada** del usuario, aparte.
Base: cierre de A8 (PC9, `A8_INFORME.md`). Reutiliza el procedimiento y las herramientas de A4–A7 (`A4_PROCEDIMIENTO.md`, `A5_VALIDACION_CEP_PROCEDIMIENTO.md`, `A7_VALIDACION_CEP_PROCEDIMIENTO.md`, `tools/a4/`), ejecutadas y revertidas con éxito el 2026-10-23, 24, 25 y 26.
Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Objetivo y alcance
**Objetivo:** comprobar en el Chromium 99 real de CEP que el bundle de A8, con la exportación GLB en `src/export/` (4 módulos), se comporta **exactamente igual** que el bundle de A7 validado en real, y **cerrar la igualdad binaria del GLB con arte** (`b4973a54…`), que Chrome headless no puede comprobar (otro codificador PNG). La comparación es automática contra la evidencia real de A7 (`docs/fase1/a7-real/`).

| Cambio de A8 | Lo valida |
|---|---|
| `glb-bytes.js` (relleno, vistas) y `glb-builder.js` (contenedor, JSON, vistas, materiales) | V-3: GLB plano `737bcd23…` y a 60° `87aa2e4c…` byte a byte |
| `glb-scene.js` (recorrido de la escena, matrices de la pose) | V-2 (plegado) y V-3 (GLB a 60°) |
| `glb-image.js` (texturas → PNG con el lienzo de Chromium 99) | **V-4: GLB con arte = `b4973a54…` byte a byte** (lo único que headless no puede probar) |
| `exportGLB` + diálogo (siguen en `main.js`, ahora llaman al constructor inyectado) | V-5: diálogo «Save GLB» **real**, guardar y cancelar (KI-25 tal cual) |

**Fuera de alcance:** Shift+clic en el lienzo real, el validador Khronos (KI-02), rendimiento/FPS en real y Windows. No se corrige nada: KI-01…KI-28 deben reproducirse tal cual (KI-04/KI-22: 11 de 13; KI-06: el hueco de N0-B no se recorta; KI-25: el mensaje final sobrescribe el resultado del guardado).

## 2. Identidad del paquete [MEDIDO al cierre de A8]
| Dato | Valor |
|---|---|
| Fuente | `src/` al cierre de A8 (commit de A8.4 `7c95b0b`; ver `A8_INFORME.md`) |
| `dist/main.js` | sha256 `4addceb7fb8c6dd662a460fb4c8e9c25ad9d715ad1e883e10a66acc858a552bd` = `tests/golden/dist-a8.SHA256SUMS` |
| Diferencia con A7 | Solo `main.js`; los otros 12 archivos de `dist/` son idénticos a los de A7/A6/A5/A4 |
| Identidad CEP | `com.tato.tesseract.v3` / `com.tato.tesseract.v3.panel`, menú **Tesseract V3**, destino `~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3` (igual que A4–A7) |

## 3. Valores esperados
| Qué | Esperado |
|---|---|
| Identidad | `main.js` cargado = `4addceb7…` (A8), `Chrome/99.0.4844.84`, CEP 12.1.1, three r132 |
| `a4-paridad caja` sobre N0-A | **Idéntica** a `docs/fase1/a7-real/paridad-caja-2026-10-26T13-27-53-448Z.json` (comparador con referencia explícita; solo se ignoran fecha, tiempos y nº de eventos de consola): extracción, validación, 11 de 13, base, plegado, espesor, presets, hashes del lienzo y GLB |
| `a4-paridad arte` sobre N0-B | **Idéntica** a `docs/fase1/a7-real/paridad-arte-2026-10-26T13-28-46-102Z.json` |
| GLB caja plano / todas a 60° | `737bcd2312da1191…` (33 436 B) / `87aa2e4c5cc39092…` (54 224 B): los mismos que A4–A7 en real y que el bundle A8 en Chrome headless (N1) |
| **GLB con arte** | **`b4973a54840cd0c1…` (295 440 B) byte a byte**, como A4–A7 en real. En headless el bundle A8 dio 299 720 B (`b3f56d4c…`) con estructura idéntica y 0 píxeles distintos; solo el codificador PNG difiere |
| Diálogo «Save GLB» real | Guardar: `Exporting GLB…` → `GLB saved: <ruta>` → `GLB exported from current 3D pose` (KI-25), 1 escritura con `err 0`, archivo = `737bcd23…`. Cancelar: `Exporting GLB…` → `GLB export cancelled` → `GLB exported from current 3D pose` (KI-25), 0 escrituras. Scripts ExtendScript = baseline |
| Consola | 0 errores (el único aviso conocido, «"abc" cannot be parsed», lo provoca la prueba de espesor) |
| GPU (complementario) | `cdp-run leak --cycles=3` → «SIN CRECIMIENTO ACUMULATIVO», como A7 en real |

## 4. Herramientas (todas probadas en real en A4–A7)
`tools/a4/a4.sh` (preflight, install, verify, diagnose, rollback; install/rollback exigen `--autorizado-por-usuario=AAAA-MM-DD`) · `tools/a4/cdp-run.mjs` (targets, identity, console, leak) · `tools/a4/a4-paridad.mjs caja|arte` · `tools/a4/a6-comparar-paridad.mjs <nuevo.json> <referencia.json>` (con la **referencia A7 explícita**; `tests/node/a8-cep-preparacion.test.mjs` comprueba que da «idéntica» entre las evidencias reales de A6 y A7 y que los GLB reales de A7 tienen los hashes esperados) · `tools/a4/a5-observar.mjs instalar|leer` (observación pasiva del diálogo real y de los scripts ExtendScript) · `tools/illustrator/run-nivel0.mjs a4-open|a4-close` · `tools/a4/a5-estado-doc.sh` (estado de N0-B antes y después).

## 5. Procedimiento (desde `Tesseract v3/`; ante cualquier FALLA: detener, `diagnose`, rollback)
**Paso 0 — Autorización (usuario).** Mensaje expreso, p. ej.: «Autorizo instalar temporalmente el bundle A8 en CEP para su validación, hoy AAAA-MM-DD». Sin él no se pasa de aquí. La fecha va en `--autorizado-por-usuario=AAAA-MM-DD`.

**Paso 1 — Línea base (solo lectura).**
```bash
git status --short                                   # vacío; anotar git rev-parse --short HEAD
node tools/build/build.mjs && diff dist/SHA256SUMS tests/golden/dist-a8.SHA256SUMS && echo "dist = A8"
tools/verify-isolation.sh && tools/a4/a4.sh preflight
mv tests/results/a4 tests/results/a4-ejecucion-2026-10-26   # apartar los registros de la ejecución anterior (A7-CEP), si existen
```
**Paso 2 — Usuario:** guardar el trabajo real y cerrar Illustrator (las herramientas exigen 0 documentos).

**Paso 3 — Instalar y verificar.**
```bash
tools/a4/a4.sh install --autorizado-por-usuario=AAAA-MM-DD --debug-port=8088   # INSTALACIÓN CORRECTA
tools/a4/a4.sh verify && tools/verify-isolation.sh --a4-instalado             # VERIFY CORRECTO
```
**Paso 4 — Usuario:** abrir Illustrator **sin documentos** y **Ventana ▸ Extensiones ▸ Tesseract V3**. Si el panel no carga en la primera sesión (incidencia de A5 y A6), reiniciar Illustrator. **Comprobar que de verdad cargó:** `curl -s 127.0.0.1:8088/json/list` debe listar el panel.

**V-1 Identidad, carga y consola.**
```bash
node tools/a4/cdp-run.mjs targets --out=tests/results/a8-cep
node tools/a4/cdp-run.mjs identity --out=tests/results/a8-cep                         # IDENTIDAD CORRECTA y SHA-256 de main.js = 4addceb7…
node tools/a4/cdp-run.mjs console --reload --seconds=10 --out=tests/results/a8-cep    # 0 errores desde la carga
```
**V-2 y V-3 Caja (N0-A): extracción, validación, 3D, plegado y GLB en 2 poses.** (El observador se instala después de `--reload`, que lo borraría.)
```bash
node tools/illustrator/run-nivel0.mjs a4-open N0-A
node tools/a4/a5-observar.mjs instalar
node tools/a4/a4-paridad.mjs caja --tag=N0-A --out=tests/results/a8-cep   # P-0…P-6 y P-8 (GLB en 2 poses; diálogo sustituido SOLO aquí)
node tools/a4/a6-comparar-paridad.mjs tests/results/a8-cep/paridad-caja-*.json docs/fase1/a7-real/paridad-caja-2026-10-26T13-27-53-448Z.json   # PARIDAD IDÉNTICA
shasum -a 256 /private/tmp/tesseract_a4/pose*.glb                                    # 737bcd23… y 87aa2e4c…
```
**V-5 Diálogo «Save GLB» REAL: guardar y cancelar (usuario, en el panel; N0-A con el 3D construido).**
1. Pulsar **Reset Flat** (pestaña de pliegues) para volver a la pose plana.
2. Pulsar **Export GLB** → en el diálogo de Illustrator, carpeta `/private/tmp/tesseract_a8/` (crearla si hace falta; **no** el Escritorio), nombre `a8-plano` → **Guardar**. Esperar «GLB exported from current 3D pose».
3. Pulsar **Export GLB** otra vez → **Cancelar** en el diálogo.
```bash
node tools/a4/a5-observar.mjs leer --restaurar --out=tests/results/a8-cep   # OBSERVACIÓN CORRECTA: scripts = baseline; 1 escritura err 0; historial con KI-25 (guardar y cancelar)
shasum -a 256 /private/tmp/tesseract_a8/a8-plano.glb                          # 737bcd23…
```
**V-7 GPU en real (complementario; con N0-A abierto y el 3D construido):** `node tools/a4/cdp-run.mjs leak --cycles=3 --out=tests/results/a8-cep` → «SIN CRECIMIENTO ACUMULATIVO». Va **después** de `a4-paridad caja` (mueve sliders, espesor y preset). Después, `node tools/illustrator/run-nivel0.mjs a4-close`.

**V-4 Arte (N0-B) y GLB con arte byte a byte.**
```bash
node tools/illustrator/run-nivel0.mjs a4-open N0-B
tools/a4/a5-estado-doc.sh tests/results/a8-cep/n0b-estado-antes.txt      # solo lectura; N0-B activo
node tools/a4/a4-paridad.mjs arte --tag=N0-B --out=tests/results/a8-cep   # P-1, P-2, P-7 (Layers), P-7b GLB con arte
node tools/a4/a6-comparar-paridad.mjs tests/results/a8-cep/paridad-arte-*.json docs/fase1/a7-real/paridad-arte-2026-10-26T13-28-46-102Z.json   # PARIDAD IDÉNTICA
shasum -a 256 /private/tmp/tesseract_a4/arte.glb                          # b4973a54840cd0c1… (295 440 B): IGUALDAD BINARIA CON ARTE
cmp /private/tmp/tesseract_a4/arte.glb docs/fase1/a7-real/glb/paridad-arte.glb && echo "GLB con arte = A7 real byte a byte"
tools/a4/a5-estado-doc.sh tests/results/a8-cep/n0b-estado-despues.txt    # = antes (y = docs/fase1/a7-real/n0b-estado-antes.txt)
diff tests/results/a8-cep/n0b-estado-antes.txt tests/results/a8-cep/n0b-estado-despues.txt && echo "documento intacto"
```
Usuario: confirmar a simple vista la orientación y los colores del arte. El hueco sigue sin recortarse (KI-06, preexistente).

**V-6 Cierre.**
```bash
node tools/a4/cdp-run.mjs console --seconds=10 --out=tests/results/a8-cep
node tools/illustrator/run-nivel0.mjs a4-close    # Illustrator vuelve a 0 documentos
tools/a4/a4.sh diagnose && tools/a4/a4.sh verify
```
**Paso 5 — Evidencia.** Copiar `tests/results/a8-cep/` y los registros de `tests/results/a4/` (snapshot, install-record, diagnóstico) a `docs/fase1/a8-real/` (como `.json`/`.txt`, porque `*.log` está ignorado por git), junto con los GLB (`/private/tmp/tesseract_a4/pose*.glb`, `arte.glb` y `/private/tmp/tesseract_a8/a8-plano.glb`). Fijar la evidencia con una prueba (como `a7-cep-evidencia.test.mjs`) y redactar `A8_VALIDACION_CEP_INFORME.md`.

**Paso 6 — Rollback (siempre, también si algo falla).** Usuario: cerrar Illustrator. Luego:
```bash
tools/a4/a4.sh rollback --autorizado-por-usuario=AAAA-MM-DD && tools/verify-isolation.sh   # ROLLBACK CORRECTO; estricto en verde
```
Usuario: reabrir Illustrator y comprobar que «Tesseract V3» ya no está y que «Tesseract» (instalado) sigue funcionando.

## 6. Criterios de aceptación
| # | Criterio |
|---|---|
| V-1 | Instala; `verify` correcto; identidad con `main.js` = `4addceb7…`; 0 errores de consola desde la carga |
| V-2 | `a6-comparar-paridad` con referencia A7 → **PARIDAD IDÉNTICA** en caja (11 de 13, validación, log de paneles, base, plegado, hashes del lienzo, espesor, presets y GLB) |
| V-3 | GLB plano `737bcd23…` y a 60° `87aa2e4c…` |
| V-4 | Paridad idéntica en arte; **GLB con arte = `b4973a54…` byte a byte** (cierra la igualdad binaria que headless no puede comprobar); N0-B idéntico antes y después; arte confirmado a simple vista por el usuario |
| V-5 | Diálogo real: guardar escribe un GLB = `737bcd23…` con `err 0`; cancelar no escribe; historial con KI-25; scripts ExtendScript = baseline |
| V-6 | 0 errores de consola en toda la sesión; Illustrator en 0 documentos; ningún documento real abierto ni modificado; rollback correcto y `verify-isolation.sh` estricto en verde |
| V-7 | (complementario) GPU Δ = 0 tras el calentamiento |
| Fallo | Cualquier diferencia ⇒ detener, `diagnose`, rollback e informe. **No se corrige nada en caliente.** Si solo difiere el GLB con arte, comparar estructura y píxeles con `tests/lib/a8.mjs` (`compareStructural`) antes de concluir, y no atribuirlo al entorno sin evidencia |

## 7. Riesgos específicos
| Riesgo | Mitigación |
|---|---|
| Diferencia de entorno y no del bundle | El comparador ignora solo `fecha`, `ms` y `eventos`. Entre A6 y A7 reales da «idéntica» (`a8-cep-preparacion`) |
| El GLB con arte depende del codificador PNG de Chromium 99 | Es lo que se quiere medir: A4–A7 dieron `b4973a54…` en ese mismo Chromium. Si difiere, se separa estructural/píxeles/binario como en N3 |
| `leak` mueve el panel (sliders, espesor, preset, reconstrucción) | Se ejecuta **después** de `a4-paridad caja` y del diálogo real |
| El observador se pierde al recargar | Se instala después de `console --reload` y se lee con `--restaurar` |
| Caché de CEP con una versión vieja | `identity` lo detecta por el SHA-256 de `main.js` |
| Panel que no carga en la primera sesión | Reiniciar Illustrator; verificar con `curl` el puerto 8088 |

## 8. Lo que NO cubre
Shift+clic en el lienzo real · rendimiento y FPS en real (solo hay medición en Chrome headless: `docs/fase1/a8/rendimiento-*.json`) · validador Khronos (KI-02) · Windows · troqueles de trabajo distintos de N0-A y N0-B · el límite de KI-28 en Chromium 99 (inalcanzable con los troqueles reales: máximo 120 índices).
