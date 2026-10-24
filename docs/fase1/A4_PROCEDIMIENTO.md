# A4 — Primera carga del bundle V3 en el CEP real: procedimiento exacto

Estado: **PREPARADO. NO EJECUTADO. NADA INSTALADO.** Fecha de preparación: 2026-10-23. Para ejecutarlo hace falta la **autorización EXPRESA del usuario en el chat** ("autorizo instalar V3 para A4"); la herramienta exige además la fecha de esa autorización en la línea de comandos (`--autorizado-por-usuario=AAAA-MM-DD`) y se niega sin ella.
Etiquetas: **[MEDIDO]** probado en esta sesión · **[CONFIRMADO]** leído en código/archivos · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Qué es A4 y qué NO es
**Es:** cargar por primera vez el **bundle** (`dist/`, IIFE, V3) en el CEP de Illustrator 2026 (Chromium 99 real), **junto a** la extensión instalada (que no se toca), y comprobar: que carga, que es el paquete esperado, que funciona igual que la referencia (lista de paridad P-1…P-10), y las medidas de rendimiento/fuga dentro del Chromium real.
**No es:** refactorizar, cambiar geometría, normalizar, corregir KI-02/04/22, tocar `panel/`, el baseline o el plugin instalado. Los defectos conocidos **se esperan y se registran**, no se corrigen: en particular, con la Caja Botánica real (×1.0) el panel debe mostrar **11 paneles** (KI-04/KI-22), no 13.

## 2. Identidad del paquete que se instalaría [MEDIDO]
| Dato | Valor |
|---|---|
| Fuente | `panel/main.js` sha256 `91b42b7b…` → `dist/main.js` sha256 `bc2606957595d086ac8b81d2e3af019e0c1d44344bd8c273c9ddb45bb159b5bd` (126 415 B; reproducible) |
| `ExtensionBundleId` / `Extension Id` | `com.tato.tesseract.v3` / `com.tato.tesseract.v3.panel` (el instalado: `com.tato.tesseract` / `com.tato.tesseract.panel`; **sin colisión**) |
| Menú / versión | **Tesseract V3** / 3.0.0 (el instalado: «Tesseract» / 0.1.0) |
| Destino | `~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3` (nivel usuario; **nunca** `/Library`) |
| Archivos | 13 de contenido + `SHA256SUMS` + `BUILD_INFO.json` (794 527 B) + `.debug` (lo escribe el instalador, no forma parte de `dist/`) |
| Manifiesto | `CSXS 12.0`, host `ILST [0.0,99.9]`, `AutoVisible`, 480×640 (mín. 400×560) — idéntico al instalado salvo ids, versión y menú [MEDIDO: `diff`] |
| `PlayerDebugMode` | CSXS.10/11/12 = 1 en esta máquina [MEDIDO] (el bundle no está firmado: con 1 carga igual que el instalado) |
| DevTools remoto | `.debug` con `Host ILST Port 8088` solo en la copia instalada; el puerto 8088 está libre [MEDIDO]; solo escucha en loopback |

## 3. Herramientas preparadas (todas probadas en un HOME temporal; ninguna ejecutada contra el CEP real salvo `preflight`, solo lectura)
| Herramienta | Función | Pruebas |
|---|---|---|
| `tools/a4/a4.sh preflight` | Solo lectura: build reproducible, dry-run del instalador, repo limpio, `PlayerDebugMode`, puerto libre, estado de Illustrator | `a4-herramienta.test.mjs`; **ejecutado en real: PREFLIGHT CORRECTO** (2026-10-23) |
| `tools/a4/a4.sh snapshot [archivo]` | Huella estructural (ruta+tamaño) de **cada** extensión de `/Library/.../extensions` y `~/Library/.../extensions` | idem |
| `tools/a4/a4.sh install --autorizado-por-usuario=AAAA-MM-DD [--debug-port=N]` | Staging en `/tmp` con huellas → copia a `tesseract-v3` → `.debug` → verificación completa → registro. **Rollback automático** si la verificación falla | idem (incl. fallo inyectado) |
| `tools/a4/a4.sh verify` | Identidad del manifiesto, huellas = `dist/`, sin archivos extra, `.debug` válido, permisos, **las demás extensiones idénticas al snapshot previo**, `verify-isolation.sh --a4-instalado` | idem |
| `tools/a4/a4.sh diagnose [--port=N]` | Solo lectura: destino, snapshot, `PlayerDebugMode`, Illustrator, procesos `CEPHtmlEngine`, objetivos de DevTools, líneas de `~/Library/Logs/CSXS` con «tesseract», caché CEP, informes de fallo, `verify` | idem |
| `tools/a4/a4.sh rollback --autorizado-por-usuario=AAAA-MM-DD` | Borra **solo** `…/extensions/tesseract-v3` (exige que su manifiesto sea el bundle V3), compara con el snapshot previo y ejecuta `verify-isolation.sh` estricto | idem |
| `tools/a4/cdp-run.mjs targets\|identity\|console\|measure\|leak` | DevTools remoto (`127.0.0.1:8088`): identidad del panel cargado (id de extensión, host ILST, Chromium 99, three r132, **SHA-256 del `main.js` cargado = `dist/`**), consola, `measure_ui.js`, `leak_cycles.js`. Se niega ante 0 o >1 objetivos y **nunca** actúa sobre el panel del plugin instalado | `tests/browser/a4-cdp.test.mjs` (Chrome headless real) |
| `node tools/illustrator/run-nivel0.mjs a4-open N0-A\|N0-B` / `a4-close` | Abre/prepara **un** documento desechable `N0-*` para probar el panel; lo cierra sin guardar | guardas N0-* comprobadas estáticamente |
| `tools/verify-isolation.sh --a4-instalado` | Como el estricto, pero admite exactamente `tesseract-v3` idéntica a `dist/` (+`.debug`) | idem |
Garantías verificadas por prueba [MEDIDO]: `a4.sh` **no** cierra/abre/reinicia Illustrator (`osascript` solo cuenta documentos), no usa `sudo`, no cambia preferencias, no escribe en `/Library`, no borra nada fuera de `tesseract-v3` y su staging temporal; el CEP real del usuario no cambió durante las pruebas.

## 4. Riesgos y mitigaciones
| # | Riesgo | Mitigación |
|---|---|---|
| R1 | Colisión de identidad con otra extensión | Comprobada en `install.sh --dry-run` (sistema y usuario) y en `verify` |
| R2 | Pérdida de trabajo si Illustrator se cierra con documentos sin guardar | La herramienta **no** toca Illustrator; reinicia **el usuario** tras guardar. `preflight` avisa si hay documentos abiertos |
| R3 | Modificar el plugin instalado o sus preferencias | Nunca se escribe en `/Library`; `verify` compara la estructura de todas las demás extensiones con el snapshot previo; `verify-isolation.sh` exige idéntica al baseline |
| R4 | El bundle no carga en Chromium 99 real (APIs/CSS) | Compatibilidad respaldada por análisis estático y ejecución con APIs reducidas (A3), **no probada en real**: A4 es esa prueba. Si falla, se aplica el rollback y se registra el error exacto de la consola |
| R5 | Dos paneles (instalado y V3) abiertos a la vez | Ids y menús distintos; en A4 se abre **solo V3** durante las pruebas. `localStorage`/caché compartidos entre ambos: [NO VERIFICADO] |
| R6 | DevTools remoto abierto | Solo loopback; `.debug` existe únicamente en la copia V3 y desaparece con el rollback |
| R7 | Pruebas que modifican el documento (arte: artboard activo/visibilidad, KI-21) | Solo documentos desechables `N0-*`, cerrados sin guardar; el arte solo en N0-B |
| R8 | Cachés de CEP que mantengan el menú tras el rollback | Reiniciar Illustrator; si persiste, `diagnose` lista `~/Library/Caches/CSXS/cep_cache`; comportamiento de caché [NO VERIFICADO] |
| R9 | Un fallo a mitad de la instalación | Staging verificado antes de copiar; si `verify` falla tras copiar, rollback automático **solo** de lo creado y comparación con el snapshot previo |
| R10 | Confundir el resultado de KI-22 (11 paneles) con una regresión | Esperado y fijado: `tests/golden/illustrator-real.golden.json` |

## 5. Procedimiento paso a paso
Todos los comandos desde `Tesseract v3/`. **Cada paso tiene un criterio; ante cualquier FALLA se detiene y se decide rollback.**

**Paso 0 — Autorización (usuario).** Mensaje expreso en el chat, p. ej. «Autorizo instalar V3 para A4 el AAAA-MM-DD». Sin él, no se pasa de aquí.

**Paso 1 — Línea base (solo lectura).**
```bash
tools/verify-isolation.sh                       # debe terminar en 0 (V3 no instalado, baseline y plugin intactos)
tools/a4/a4.sh preflight                        # debe terminar en PREFLIGHT CORRECTO
git status --short                              # sin cambios sin confirmar; anotar `git rev-parse --short HEAD`
```
*Criterio:* todo OK. Un AVISO sobre Illustrator abierto es informativo.

**Paso 2 — Preparar Illustrator (usuario).** Guardar los documentos reales y **cerrar Illustrator** (Cmd+Q). Las pruebas usarán solo documentos desechables que abre la herramienta.

**Paso 3 — Instalar (con la fecha de la autorización).**
```bash
tools/a4/a4.sh install --autorizado-por-usuario=AAAA-MM-DD --debug-port=8088
```
*Criterio:* termina en `INSTALACIÓN CORRECTA`; crea `tests/results/a4/snapshot-antes.txt` e `install-record.json`. Si algo falla, la herramienta hace el rollback automático y lo dice.

**Paso 4 — Verificar sin Illustrator.**
```bash
tools/a4/a4.sh verify                           # VERIFY CORRECTO: identidad, huellas = dist/, otras extensiones intactas
tools/verify-isolation.sh --a4-instalado        # verde; el modo estricto (sin flag) debe FALLAR a propósito mientras V3 esté instalada
```

**Paso 5 — Arrancar Illustrator y abrir el panel (usuario).** Abrir Illustrator **sin documentos**; menú **Ventana ▸ Extensiones ▸ Tesseract V3**. Anotar: ¿aparece el menú?, ¿carga la interfaz?, ¿hay diálogos de error? (Ver §7 si no aparece.)

**Paso 6 — Identidad del panel cargado (DevTools).**
```bash
node tools/a4/cdp-run.mjs targets               # debe haber 1 objetivo con «tesseract-v3» en la URL
node tools/a4/cdp-run.mjs identity              # IDENTIDAD CORRECTA: id com.tato.tesseract.v3.panel, host ILST, Chrome/99, three 132, SHA-256 de main.js = dist/
node tools/a4/cdp-run.mjs console --seconds=10  # 0 errores tras abrir el panel (P-9, parte 1)
```

**Paso 7 — Documento desechable + pruebas funcionales.**
```bash
node tools/illustrator/run-nivel0.mjs a4-open N0-A      # abre y prepara la Caja Botánica a ×1.0 (capas Cuts/Creases)
```
Pruebas de paridad (en el panel; anotar resultado y capturas):
| ID | Acción | Esperado en A4 (valores medidos con los fixtures reales ×1.0) |
|---|---|---|
| P-0 | «Test Connection» | Responde sin error (puente `evalScript` real) |
| P-1 | «Extract Dieline» | Extrae sin error; **0 avisos** de validación (`illustrator-real.golden`); 12 creases |
| P-2 | «Continue to 3D» | **11 paneles / 10 pliegues** (KI-04/KI-22; el plugin instalado debe mostrar lo mismo: ver P-11) |
| P-3 | Base por defecto y cambio de base (Shift+clic) | La base inicial es el panel P0; el selector coincide |
| P-4 | Sliders por crease, «ALL», «Selected crease», Reset Flat | Plegado coherente; sin errores en consola |
| P-5 | Espesor (0.25 por defecto; 0.1–20; inválidos rechazados) | Igual que la referencia |
| P-6 | Presets White/Kraft/Gray | Colores de `tests/golden/constants.golden.json` |
| P-7 | Arte Front/Back (solo con `a4-close` + `a4-open N0-B`) | Se ve y orienta bien; PNG de ≈3176×2264 (KI-23); artboard/visibilidad restaurados |
| P-8 | «Export GLB» | Abre el diálogo de guardar de Illustrator (**elegir `/private/tmp/tesseract_a4/` o similar, no el Escritorio**); el archivo se abre en un visor; unidades en mm (KI-03) |
| P-9 | Consola sin errores durante toda la sesión | `cdp-run.mjs console` con 0 errores |
| P-10 | Fuga = 0 | `cdp-run.mjs leak --cycles=6` ⇒ peor delta 0/0/0/0; Monitor de Actividad: memoria de `CEPHtmlEngine` sin crecimiento sostenido |
| P-11 | **Comparación con el plugin instalado** (cerrar V3, abrir «Tesseract», mismo documento) | Mismos paneles/pliegues y comportamiento; el instalado muestra la fuga KI-01 (esperado) |
```bash
node tools/a4/cdp-run.mjs measure               # FPS, plegado, costes por tick, recursos (guardado en tests/results/a4/)
node tools/a4/cdp-run.mjs leak --cycles=6       # tools/baseline/leak_cycles.js dentro del Chromium real
node tools/a4/cdp-run.mjs console --seconds=10
node tools/illustrator/run-nivel0.mjs a4-close  # cierra el documento desechable SIN guardar; Illustrator vuelve a 0 documentos
```
*Criterio:* ninguna prueba abre/modifica documentos reales; al final Illustrator sin documentos y sin cambios guardados.

**Paso 8 — Diagnóstico de cierre y evidencia.**
```bash
tools/a4/a4.sh diagnose                         # informe en tests/results/a4/diagnostico-*.txt
tools/a4/a4.sh verify                           # sigue verde tras usar el panel
tools/verify-isolation.sh --a4-instalado
```
Copiar a `docs/fase1/a4-real/` los JSON de `tests/results/a4/` (la carpeta `tests/results/` no se versiona) y redactar el informe A4. **Detenerse** y presentar resultados.

**Paso 9 — Rollback (siempre disponible; obligatorio si falla un criterio de aceptación, o si el usuario lo pide).**
```bash
# 1) usuario: cerrar Illustrator
tools/a4/a4.sh rollback --autorizado-por-usuario=AAAA-MM-DD     # ROLLBACK CORRECTO
# 2) usuario: reabrir Illustrator → el menú «Tesseract V3» ya no debe estar
tools/verify-isolation.sh                                        # estricto: V3 no instalada, baseline y plugin intactos
```
*Criterio:* snapshot posterior = snapshot previo; `verify-isolation.sh` en 0; el plugin «Tesseract» sigue funcionando.

## 6. Criterios de aceptación de A4 (go / no-go)
| Criterio | Debe cumplirse |
|---|---|
| C1 | Instalación y `verify` correctos; el resto de extensiones (incl. «Tesseract») estructuralmente idénticas al snapshot previo |
| C2 | El panel V3 carga en Illustrator 30.8.2, y `cdp-run identity` da IDENTIDAD CORRECTA (incl. Chrome/99 y SHA-256 de `main.js`) |
| C3 | P-0…P-9 sin diferencias respecto de la referencia, salvo las **ya conocidas y documentadas** (KI-02, KI-03, KI-04/22, KI-23) |
| C4 | `leak` = 0 en el Chromium real y sin errores en consola |
| C5 | Cero modificaciones a documentos reales; cierre de los desechables sin guardar; Illustrator sin documentos al terminar |
| C6 | Rollback probado (al final o por fallo) y `verify-isolation.sh` estricto en 0 |
| Fallo | Cualquier error de carga, diferencia de comportamiento no documentada o incumplimiento de C1/C5 ⇒ rollback + informe; no se avanza a A5 |

## 7. Si no aparece el menú o no carga
1. `tools/a4/a4.sh diagnose` y revisar «registros CSXS» y «caché CEP».
2. Comprobar `defaults read com.adobe.CSXS.12 PlayerDebugMode` (=1) y que Illustrator se **reinició** tras instalar.
3. Comprobar que el manifiesto no colisiona (`install.sh --dry-run` antes de instalar lo comprueba) y que hay una única copia `tesseract-v3*`.
4. No reintentar a ciegas: registrar el síntoma, hacer rollback y presentar el diagnóstico.

## 8. Evidencia que se archiva
`tests/results/a4/` → `snapshot-antes.txt`, `snapshot-ahora.txt`, `snapshot-tras-rollback*.txt`, `install-record.json`, `diagnostico-*.txt`, `cdp-identity-*.json`, `cdp-console-*.json`, `cdp-measure-*.json`, `cdp-leak-*.json`; capturas de pantalla del panel; versiones (Illustrator, macOS, `git rev-parse HEAD`, `BUILD_INFO.json`). Plantilla de informe: la de `PROCEDIMIENTO_VALIDACION_ILLUSTRATOR.md` ampliada con P-0…P-11 y C1…C6.

## 9. Límites de esta preparación
- **Nada se ha instalado ni cargado en el CEP real.** Solo se ejecutó `a4.sh preflight` (solo lectura) contra el sistema real; el resto, en un HOME temporal y en Chrome headless.
- `cdp-run.mjs` se probó contra Chrome 155 con un puente CEP simulado: la lectura de `__adobe_cep__.getExtensionId()/getHostEnvironment()` en el CEP real es [NO VERIFICADO] (la API existe en `CSInterface`, pero no se ha ejecutado aquí); si devolviera otra forma, `identity` marcaría FALLA y habría que ajustar la sonda, sin riesgo para el sistema.
- `fetch` del propio `main.js` desde `file://` dentro de CEP [NO VERIFICADO]; si falla, `identity` lo indica y la huella se comprueba con `a4.sh verify` (archivos en disco).
- La automatización de la interfaz de Illustrator (abrir el menú del panel) no está preparada: lo hace el usuario.
- El permiso de macOS para el diálogo «Guardar GLB» y la ruta elegida: a elegir por el usuario.
