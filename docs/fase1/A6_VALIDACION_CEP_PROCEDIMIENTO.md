# A6-CEP — Validación corta del bundle A6 en Illustrator CEP real: procedimiento

Estado: **PREPARADO, NO EJECUTADO. Nada instalado.** La instalación **no está autorizada**: requiere una autorización **expresa y fechada** del usuario, aparte (D-A6-8 = B).
Base: cierre de A6 (PC7). Reutiliza el procedimiento y las herramientas de A4/A5 (`A4_PROCEDIMIENTO.md`, `A5_VALIDACION_CEP_PROCEDIMIENTO.md`, `tools/a4/`), ejecutadas y revertidas con éxito el 2026-10-23 y el 2026-10-24.
Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Objetivo y alcance
**Objetivo:** comprobar en el Chromium 99 real de CEP que el bundle de A6, con el motor geométrico en `src/core/` detrás de `GeometryEngine`, se comporta **exactamente igual** que el bundle de A5 validado en real. Comparación automática contra la evidencia real de A5 (`docs/fase1/a5-real/`).

**Qué cambió en A6 y qué lo valida:**
| Cambio de A6 | Lo valida |
|---|---|
| `validateGeometry` partida (cálculo en `core/legacy/validate.js`) | V-2: estado de validación, lista de problemas y botón Continue tras la extracción real |
| `buildPanels`, topología y geometría 2D en `core/legacy/` | V-2: paso a 3D, **11 de 13** paneles, líneas del log de depuración |
| `buildAdjacency` / `buildFoldTree` / `defaultBaseIndex` vía `geometryEngine` | V-2: cambio de base (P-3), plegado (P-4, hashes del lienzo), espesor (P-5), presets (P-6) |
| Log del motor por el *sink* (`createLegacyEngine({log})`) | V-2: las líneas del log que recoge `a4-paridad` (P-2) son las mismas que en A5 |
| Todo lo anterior en el GLB | V-3: GLB de la caja en 2 poses = A4/A5 byte a byte |

**Fuera de alcance:** el diálogo «Save GLB» real, el arte Front/Back y los textos ExtendScript. A6 no los tocó y ya se validaron en real en A5. Tampoco entran rendimiento, fuga ni Shift+clic. No se corrige nada: KI-01…KI-26 deben reproducirse tal cual (KI-04/KI-22: 11 de 13).

## 2. Identidad del paquete [MEDIDO al cierre de A6]
| Dato | Valor |
|---|---|
| Fuente | `src/` al cierre de A6 (ver `A6_INFORME.md`) |
| `dist/main.js` | sha256 `6e36e32534104a7863f087ba876cd981f41d81b88aafcf09f4860640eaf78c8b` = `tests/golden/dist-a6.SHA256SUMS` |
| Diferencia con A5 | Solo `main.js`; los otros 12 archivos de `dist/` son idénticos a los de A5/A4 |
| Identidad CEP | `com.tato.tesseract.v3` / `com.tato.tesseract.v3.panel`, menú **Tesseract V3**, destino `~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3` (igual que A4/A5) |

## 3. Valores esperados
| Qué | Esperado |
|---|---|
| Identidad | `main.js` cargado = `6e36e325…` (A6), `Chrome/99.0.4844.84`, CEP 12.1.1, three r132 |
| Salida de `a4-paridad caja` sobre N0-A | **Idéntica** a `docs/fase1/a5-real/paridad-caja-2026-10-24T22-02-34-826Z.json` salvo fecha, tiempos y nº de eventos de consola, según `tools/a4/a6-comparar-paridad.mjs`. Incluye P-0, P-1 (JSON de extracción y «✅ No problems found»), P-2 (11 de 13, líneas del log), P-3…P-6 (base, hashes del lienzo, espesor, presets) y P-8 (GLB) |
| GLB caja, plano / todas a 60° | `737bcd23…` (33 436 B) / `87aa2e4c…` (54 224 B): los mismos que A4 y A5 en real y que el bundle A6 en Chrome headless (`a4-cdp.test.mjs`) |
| Consola | 0 errores (el único aviso conocido, «"abc" cannot be parsed», lo provoca la propia prueba de espesor) |

## 4. Herramientas
| Herramienta | Uso | Estado |
|---|---|---|
| `tools/a4/a4.sh` (preflight, install, verify, diagnose, rollback) | Igual que A4/A5; comprueba contra el `dist/` vigente (= `dist-a6`) | Probada en real dos veces |
| `tools/a4/cdp-run.mjs` (targets, identity, console) | Identidad y consola del panel cargado | Probada en real |
| `tools/a4/a4-paridad.mjs caja` | P-0…P-8 conducidos por DevTools (sustituye el diálogo solo durante P-8) | Probada en real |
| **`tools/a4/a6-comparar-paridad.mjs <nuevo.json>`** (nuevo, solo lectura) | Compara campo a campo con la evidencia real de A5; salida 0 = «PARIDAD IDÉNTICA» | `tests/node/a6-cep-preparacion.test.mjs` 5/5: A4 = A5 en real (caja y arte); detecta cambios de hash, nº de paneles, GLB y errores de consola. **En CEP real: [NO VERIFICADO]** (lee un JSON; no toca CEP) |
| `node tools/illustrator/run-nivel0.mjs a4-open N0-A` / `a4-close` | Abre y cierra sin guardar el documento desechable | Probada en real |

## 5. Procedimiento (desde `Tesseract v3/`; ante cualquier FALLA: detener, `diagnose`, rollback)
**Paso 0 — Autorización (usuario).** Mensaje expreso, p. ej.: «Autorizo instalar temporalmente el bundle A6 en CEP para su validación, hoy AAAA-MM-DD». Sin él no se pasa de aquí. La fecha va en `--autorizado-por-usuario`.

**Paso 1 — Línea base (solo lectura).**
```bash
git status --short                                   # vacío; anotar git rev-parse --short HEAD
node tools/build/build.mjs && diff dist/SHA256SUMS tests/golden/dist-a6.SHA256SUMS && echo "dist = A6"
tools/verify-isolation.sh && tools/a4/a4.sh preflight
```
**Paso 2 — Usuario:** guardar el trabajo real y cerrar Illustrator (las herramientas exigen 0 documentos; si hay documentos reales abiertos, el usuario los guarda y cierra).

**Paso 3 — Instalar y verificar.**
```bash
tools/a4/a4.sh install --autorizado-por-usuario=AAAA-MM-DD --debug-port=8088   # INSTALACIÓN CORRECTA
tools/a4/a4.sh verify && tools/verify-isolation.sh --a4-instalado             # VERIFY CORRECTO
```
**Paso 4 — Usuario:** abrir Illustrator **sin documentos** y **Ventana ▸ Extensiones ▸ Tesseract V3**. Si todas las extensiones salen en gris (incluso Libraries de Adobe), reiniciar Illustrator (incidencia conocida de A5).

**V-1 Carga del panel.**
```bash
node tools/a4/cdp-run.mjs targets --out=tests/results/a6-cep
node tools/a4/cdp-run.mjs identity --out=tests/results/a6-cep                         # IDENTIDAD CORRECTA y SHA-256 de main.js = 6e36e325…
node tools/a4/cdp-run.mjs console --reload --seconds=10 --out=tests/results/a6-cep    # 0 errores desde la carga
```
**V-2 Motor en real: extracción, validación, 3D, base, plegado, espesor, presets y GLB.**
```bash
node tools/illustrator/run-nivel0.mjs a4-open N0-A
node tools/a4/a4-paridad.mjs caja --tag=N0-A --out=tests/results/a6-cep
node tools/a4/a6-comparar-paridad.mjs tests/results/a6-cep/paridad-caja-*.json       # PARIDAD IDÉNTICA con la evidencia real de A5
```
**V-3 GLB.** Los dos GLB que escribe P-8 en `/private/tmp/tesseract_a4/` deben tener `737bcd23…` (plano) y `87aa2e4c…` (todas a 60°): `shasum -a 256 /private/tmp/tesseract_a4/pose*.glb`.

**V-4 Cierre.**
```bash
node tools/a4/cdp-run.mjs console --seconds=10 --out=tests/results/a6-cep
node tools/illustrator/run-nivel0.mjs a4-close    # Illustrator vuelve a 0 documentos
tools/a4/a4.sh diagnose && tools/a4/a4.sh verify
```
**Paso 5 — Evidencia.** Copiar `tests/results/a6-cep/` y los registros de `tests/results/a4/` (snapshot, install-record, diagnóstico) a `docs/fase1/a6-real/` (como `.json`/`.txt`, porque `*.log` está ignorado por git), junto con los GLB. Fijar la evidencia con una prueba (como `a5-cep-evidencia.test.mjs`) y redactar `A6_VALIDACION_CEP_INFORME.md`.

**Paso 6 — Rollback (siempre).** Usuario: cerrar Illustrator. Luego:
```bash
tools/a4/a4.sh rollback --autorizado-por-usuario=AAAA-MM-DD && tools/verify-isolation.sh   # ROLLBACK CORRECTO; estricto en verde
```
Usuario: reabrir Illustrator y comprobar que «Tesseract V3» ya no está y que «Tesseract» (instalado) sigue funcionando.

## 6. Criterios de aceptación
| # | Criterio |
|---|---|
| V-1 | Instala; `verify` correcto; identidad con `main.js` = `6e36e325…`; 0 errores de consola desde la carga |
| V-2 | `a6-comparar-paridad` → **PARIDAD IDÉNTICA** con la evidencia real de A5 (incluye 11 de 13, validación, log de paneles, base, hashes del lienzo, espesor, presets y GLB) |
| V-3 | GLB plano `737bcd23…` y a 60° `87aa2e4c…` |
| V-4 | 0 errores de consola en toda la sesión; Illustrator en 0 documentos; ningún documento real abierto ni modificado; rollback correcto y `verify-isolation.sh` estricto en verde |
| Fallo | Cualquier diferencia ⇒ detener, `diagnose`, rollback e informe. **No se corrige nada en caliente** |

## 7. Riesgos específicos
| Riesgo | Mitigación |
|---|---|
| El comparador da una diferencia de entorno, no del bundle (como el nº de eventos de consola entre A4 y A5) | Ignora solo `fecha`, `ms` y `eventos`. Cualquier otra diferencia se investiga comparando el mismo campo entre A4 y A5 en real antes de calificarla |
| Caché de CEP (`cep_cache/ILST_30.8.2_com.tato.tesseract.v3.panel`) con una versión vieja | `identity` lo detecta por el SHA-256 de `main.js` |
| Extensiones en gris en la primera sesión de Illustrator | Reiniciar Illustrator (A5, incidencia 1) |

## 8. Lo que NO cubre
Diálogo «Save GLB» real, arte Front/Back y textos ExtendScript (validados en A5; A6 no los tocó) · rendimiento, FPS y fuga · Shift+clic en el lienzo · validador Khronos · Windows · troqueles de trabajo distintos de N0-A.
