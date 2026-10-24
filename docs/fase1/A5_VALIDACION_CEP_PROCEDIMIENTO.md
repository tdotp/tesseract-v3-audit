# A5-CEP — Validación corta del bundle A5 en Illustrator CEP real: procedimiento

Estado: **PREPARADO, NO EJECUTADO. Nada instalado.** Solo se ejecutó `tools/a4/a4.sh preflight` (solo lectura) → **PREFLIGHT CORRECTO** (2026-10-24: build reproducible, dry-run correcto, `PlayerDebugMode` 11/12 = 1, puerto 8088 libre, Illustrator cerrado).
Base: PC6 aprobado (cierre de A5, `be23895`). Reutiliza el procedimiento y las herramientas de A4 (`A4_PROCEDIMIENTO.md`, `tools/a4/`), que se ejecutaron y revirtieron con éxito el 2026-10-23.
Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Objetivo y alcance
**Objetivo:** comprobar en el Chromium 99 real de CEP que el bundle de A5 (construido desde `src/`) se comporta igual que el bundle validado en A4 en lo que A5 movió de sitio: **carga del panel, extracción, arte, diálogo de guardado y exportación GLB**.
**Qué se mueve en A5 y qué valida cada prueba:**
| Módulo de A5 | Lo valida |
|---|---|
| `host/test-connection`, `host/extract` | V-2 (Test Connection, extracción real) |
| `host/art` | V-4 (arte Front/Back real) |
| `host/save-dialog`, `bridge/fs` | V-3 (diálogo «Save GLB» **real**, guardar y cancelar) y V-5 (GLB) |
| `bridge/cep` | V-2…V-5 (todas las llamadas a Illustrator pasan por él) |
| `config/look` | V-5 (GLB byte a byte: espesor, colores) |
**Fuera de alcance (no se toca ni se corrige):** geometría, plegado, renderer, materiales, goldens, baseline, plugin instalado, KI-01…KI-26 (incluidos KI-22, KI-24, KI-25 y KI-26, que **deben** reproducirse tal cual). No se repiten las medidas de A4 de rendimiento y fuga: A5 no tocó la escena. La fuga Δ=0 del bundle A5 está cubierta en navegador; en CEP solo se repite si el usuario lo pide.

## 2. Identidad del paquete [MEDIDO]
| Dato | Valor |
|---|---|
| Fuente | `src/` en `be23895` (o el commit de esta preparación, que no cambia `src/`) |
| `dist/main.js` | sha256 `70de82a82f90c91b3f794bc62fa02f34d86d06d11dfe0c77af4ed8d660e70701` = `tests/golden/dist-a5.SHA256SUMS` |
| Diferencia con A4 | Solo `main.js`; los otros 12 archivos de `dist/` son idénticos a los de A4. **No** es el bundle de A4: ver la excepción binaria y la equivalencia en `A5_INFORME.md` §1 |
| Identidad CEP | `com.tato.tesseract.v3` / `com.tato.tesseract.v3.panel`, menú **Tesseract V3**, destino `~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3` (igual que A4) |

## 3. Valores esperados (baseline de regresión vigente)
Fuentes: evidencia de A4 en CEP real (`docs/fase1/a4-real/`), pruebas de A5 y `docs/fase1/a5/bridge-a5-baseline.json` (30 casos del puente, resultados actuales congelados como baseline de regresión).
| Qué | Esperado |
|---|---|
| Textos ExtendScript que llegan a Illustrator | test 48 B `444efa9b8bdb7395` · extraer 5536 B `bd4c215d56fb4cdc` · arte 5677 B `ab1c20da805454b7` · guardar 188 B `be6c47e148487d9d` (SHA-256, 16 hex) |
| Extracción N0-A (Caja Botánica ×1,0) | JSON idéntico a `docs/fase1/a4-real/extraccion-panel-caja.json`; «✅ No problems found» |
| Paso a 3D | **11 de 13 paneles**, 10 pliegues (KI-04/KI-22) |
| GLB caja, pose plana / todas a 60° | `737bcd23…` (33 436 B) / `87aa2e4c…` (54 224 B): los mismos que A4 en CEP real y que el bundle A5 en Chrome headless (`a4-cdp.test.mjs`, verificado el 2026-10-24) |
| GLB con arte (N0-B) | `b4973a54840cd0c1…` (295 440 B), A4 en CEP real [INFERENCIA: es determinista porque los PNG los exporta Illustrator sin marca de tiempo interna; A4 lo obtuvo dos veces] |
| Diálogo real «Save GLB», guardar | Historial: `Exporting GLB…` → `GLB saved: <ruta>` → `GLB exported from current 3D pose` (**KI-25**); 1 escritura, `err 0`; archivo = GLB plano `737bcd23…` |
| Diálogo real, cancelar | Historial: `Exporting GLB…` → `GLB export cancelled` → `GLB exported from current 3D pose` (**KI-25**); 0 escrituras |
| Documento N0-B tras el arte | Estado idéntico antes y después (capas, visibilidad, bloqueo, artboard activo, selección, guardado) |
| Consola | 0 errores |

## 4. Herramientas
| Herramienta | Uso | Estado |
|---|---|---|
| `tools/a4/a4.sh` (preflight, install, verify, diagnose, rollback) | Igual que A4; comprueba contra el `dist/` vigente | Probada en A4 real; `preflight` ejecutado ahora: CORRECTO |
| `tools/a4/cdp-run.mjs` (targets, identity, console) | Identidad del panel cargado (SHA-256 de `main.js` = `dist/`) y consola | Probada en A4 real |
| `tools/a4/a4-paridad.mjs caja\|arte` | P-0…P-8 conducidos por DevTools (sustituye el diálogo solo durante P-8) | Probada en A4 real |
| `tools/a4/glb-baseline.mjs` | Referencia GLB en Chrome headless; **ahora construye el bundle desde `src/`** (antes desde `panel/`) | `a4-cdp.test.mjs` 7/7: bundle A5 = GLB del CEP real de A4 |
| **`tools/a4/a5-observar.mjs instalar\|leer [--restaurar]`** (nuevo) | Observador **pasivo**: registra estados, scripts (tipo, longitud, SHA-256) y escrituras sin sustituir nada; veredicto contra §3 | `tests/browser/a5-observar.test.mjs` 3/3 (Chrome headless + puente simulado). **En CEP real: [NO VERIFICADO]** (A4 ya envolvió `evalScript` y `cep.fs.writeFile` en CEP real sin problemas) |
| **`tools/a4/a5-estado-doc.sh <archivo>`** (nuevo, solo lectura) | Estado del documento N0-* activo (formato de A4) | Sintaxis bash, JSX y escape comprobados; **contra Illustrator real: [NO VERIFICADO]** |
| `node tools/illustrator/run-nivel0.mjs a4-open N0-A\|N0-B` / `a4-close` | Abre/cierra sin guardar un documento desechable | Probada en A4 real |

## 5. Procedimiento (desde `Tesseract v3/`; ante cualquier FALLA: detener, `diagnose`, rollback)
**Paso 0 — Autorización (usuario).** Mensaje expreso específico, p. ej.: «Autorizo instalar temporalmente el bundle A5 en CEP para su validación, hoy AAAA-MM-DD». Sin él no se pasa de aquí. La fecha va en `--autorizado-por-usuario`.

**Paso 1 — Línea base (solo lectura).**
```bash
git status --short                                   # vacío; anotar git rev-parse --short HEAD
node tools/build/build.mjs && diff dist/SHA256SUMS tests/golden/dist-a5.SHA256SUMS && echo "dist = A5"
tools/verify-isolation.sh && tools/a4/a4.sh preflight
```
**Paso 2 — Usuario:** guardar el trabajo real y cerrar Illustrator.

**Paso 3 — Instalar y verificar.**
```bash
tools/a4/a4.sh install --autorizado-por-usuario=AAAA-MM-DD --debug-port=8088   # INSTALACIÓN CORRECTA
tools/a4/a4.sh verify && tools/verify-isolation.sh --a4-instalado             # VERIFY CORRECTO; el estricto (sin flag) debe fallar mientras esté instalada
```
**Paso 4 — Usuario:** abrir Illustrator **sin documentos** y **Ventana ▸ Extensiones ▸ Tesseract V3**.

**V-1 Carga del panel.**
```bash
node tools/a4/cdp-run.mjs targets --out=tests/results/a5-cep
node tools/a4/cdp-run.mjs identity --out=tests/results/a5-cep             # IDENTIDAD CORRECTA y SHA-256 de main.js = 70de82a8…
node tools/a4/cdp-run.mjs console --reload --seconds=10 --out=tests/results/a5-cep   # 0 errores desde la carga
```
**V-2 Extracción + observador.** (El observador se instala después de `--reload`, que lo borraría.)
```bash
node tools/illustrator/run-nivel0.mjs a4-open N0-A
node tools/a4/a5-observar.mjs instalar
node tools/a4/a4-paridad.mjs caja --tag=N0-A --out=tests/results/a5-cep   # P-0, P-1, P-2, P-3…P-6, P-8 (GLB en 2 poses, diálogo sustituido SOLO aquí)
```
Esperado: P-0 `OK_FROM_ILLUSTRATOR`; P-1 sin avisos y JSON = A4; P-2 11 de 13; P-8 `737bcd23…` y `87aa2e4c…`.

**V-3 Diálogo «Save GLB» REAL (usuario, en el panel).**
1. Pulsar **Reset Flat** (pestaña de pliegues) para volver a la pose plana.
2. Pulsar **Export GLB** → en el diálogo de Illustrator, carpeta `/private/tmp/tesseract_a5/` (crearla si hace falta; **no** el Escritorio), nombre `a5-plano` → **Guardar**. Esperar «GLB exported from current 3D pose».
3. Pulsar **Export GLB** otra vez → **Cancelar** en el diálogo.
```bash
node tools/a4/a5-observar.mjs leer        # scripts = §3; 1 escritura err 0; archivo = 737bcd23…; historial con KI-25 (guardar y cancelar)
```
**V-4 Arte Front/Back (documento con arte).**
```bash
node tools/illustrator/run-nivel0.mjs a4-close && node tools/illustrator/run-nivel0.mjs a4-open N0-B
tools/a4/a5-estado-doc.sh tests/results/a5-cep/n0b-estado-antes.txt
node tools/a4/a4-paridad.mjs arte --tag=N0-B --out=tests/results/a5-cep   # P-1, P-2, P-7 (modo Layers), P-7b GLB con arte
tools/a4/a5-estado-doc.sh tests/results/a5-cep/n0b-estado-despues.txt
diff tests/results/a5-cep/n0b-estado-antes.txt tests/results/a5-cep/n0b-estado-despues.txt && echo "documento intacto"
```
Usuario: mirar el modelo con arte en el visor (orientación y colores) — reserva visual pendiente desde A4.
**V-5 Cierre de la observación.**
```bash
node tools/a4/a5-observar.mjs leer --restaurar   # OBSERVACIÓN CORRECTA: test, extraer, arte y guardar = baseline; archivo del diálogo real = 737bcd23…
node tools/a4/cdp-run.mjs console --seconds=10 --out=tests/results/a5-cep
node tools/illustrator/run-nivel0.mjs a4-close   # Illustrator vuelve a 0 documentos
tools/a4/a4.sh diagnose && tools/a4/a4.sh verify
```
**Paso 6 — Evidencia.** Copiar `tests/results/a5-cep/` y los registros de `tests/results/a4/` (snapshot, install-record, diagnóstico) a `docs/fase1/a5-real/` (como `.txt`/`.json`: `*.log` está ignorado por git), más los GLB de `/private/tmp/tesseract_a4/` y `/private/tmp/tesseract_a5/`. Fijar la evidencia con una prueba (como `a4-evidencia.test.mjs`). Redactar `A5_VALIDACION_CEP_INFORME.md`.
**Paso 7 — Rollback (siempre).** Usuario: cerrar Illustrator. Luego:
```bash
tools/a4/a4.sh rollback --autorizado-por-usuario=AAAA-MM-DD && tools/verify-isolation.sh   # ROLLBACK CORRECTO; estricto en verde
```
Usuario: reabrir Illustrator y comprobar que «Tesseract V3» ya no está y que «Tesseract» (instalado) sigue funcionando.

## 6. Criterios de aceptación
| # | Criterio |
|---|---|
| V-1 | Instala, `verify` correcto, identidad correcta con `main.js` = `70de82a8…`, 0 errores de consola desde la carga |
| V-2 | Test Connection y extracción = A4 (JSON idéntico); 11 de 13 paneles; textos test/extraer = §3 |
| V-3 | El diálogo **real** se abre desde el panel; guardar escribe un GLB = `737bcd23…` con `err 0`; cancelar no escribe; historial con KI-25 exactamente como en §3; texto guardar = §3 |
| V-4 | Arte en modo Layers; GLB con arte = `b4973a54…`; documento N0-B idéntico antes/después; texto arte = §3 |
| V-5 | GLB de la caja en 2 poses = `737bcd23…` / `87aa2e4c…`; 0 errores de consola en toda la sesión |
| V-6 | Ningún documento real abierto ni modificado; Illustrator en 0 documentos al terminar; rollback correcto y `verify-isolation.sh` estricto en verde |
| Fallo | Cualquier diferencia no documentada ⇒ detener, `diagnose`, rollback e informe. **No se corrige nada en caliente** |

## 7. Riesgos específicos
| Riesgo | Mitigación |
|---|---|
| El observador no funciona igual en el CEP real | Solo envuelve lo que A4 ya envolvió en CEP real; si `instalar` falla, se valida V-3 con el historial visible y el archivo en disco (comparando SHA-256 a mano) y se registra |
| `a5-estado-doc.sh` no probado contra Illustrator | Solo lectura y guarda N0-*; si falla, se compara con el procedimiento de A4 (lectura manual) y se registra |
| El diálogo real guarda en otra carpeta o añade `.glb` | El script del diálogo añade `.glb` si falta (comportamiento esperado); `leer` lee la ruta que devolvió Illustrator |
| Diferencias por el arte (PNG de Illustrator) | Si el GLB con arte difiere de A4, se compara el PNG exportado y el tamaño (KI-23) antes de calificarlo; puede ser un cambio de Illustrator, no del bundle |
| Caché de CEP de A4 (`cep_cache/ILST_30.8.2_com.tato.tesseract.v3.panel`) | Mismo id: se reutiliza; si el panel muestra la versión vieja, `identity` lo detecta por el SHA-256 |

## 8. Lo que NO cubre
Rendimiento, FPS y fuga en CEP (cubiertos en A4; A5 no tocó la escena) · Shift+clic en el lienzo · validador Khronos · Windows · troqueles reales de trabajo distintos de N0-A/N0-B.
