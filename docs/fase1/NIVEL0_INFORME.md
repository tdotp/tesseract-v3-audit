# Fase 1 · Nivel 0 — validación en Adobe Illustrator real

Fecha: 2026-10-23 · Entorno real: **Illustrator 30.8.2 · ExtendScript 4.5.6 · macOS 26.6.2** · Estado: **ejecutado completo (conjunto mínimo + resto). A4, instalación en CEP y refactorización estructural NO iniciados.**
Etiquetas: **[MEDIDO]** en Illustrator real · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**. Detalle por fila: `NIVEL0_DIFERENCIAS_MAQUETA_VS_REAL.md`. Evidencia cruda: `docs/fase1/nivel0-real/` (16 JSON de ejecución, informe del analizador, registros de ejecución).

## 1. Qué se hizo
Se abrieron, uno a uno, los 6 documentos desechables de `tools/illustrator/docs-prueba/` mediante control de la aplicación (`osascript`), se ejecutaron los scripts de Nivel 0 (inventario, extracción, arte) y se cerraron **sin guardar**. 16 ejecuciones de script: 7 del conjunto mínimo (N0-A survey+extract; N0-B survey+extract+art; N0-C survey+extract) y 9 del resto (N0-D, N0-F, N0-G survey+extract; N0-B con artboards «Front/Back» survey+art; N0-B con `Creases` oculta y `Cuts` bloqueada, extracción).

## 2. Cumplimiento de las condiciones de la autorización
| # | Condición | Resultado |
|---|---|---|
| 1 | No modificar ni guardar documentos reales de trabajo | **Cumplido** [MEDIDO]: solo se abrieron copias en `/tmp` de los 6 SVG (SHA-256 verificado contra el repositorio); nombre `N0-*` exigido antes de cada acción; cierre con `DONOTSAVECHANGES`; Illustrator terminó con **0 documentos**, igual que al empezar |
| 2 | Comprobar el documento activo antes de cada ejecución | **Cumplido:** guardia en el orquestador (`startsWith('N0-')`) y en cada script de preparación/cierre |
| 3 | No instalar V3 ni modificar la extensión instalada | **Cumplido:** `verify-isolation.sh` verde; la extensión `tesseract` instalada es idéntica al baseline; `~/Library/Application Support/Adobe/CEP/extensions/` contiene solo `TesserArt_Validator` |
| 4 | Conjunto mínimo de 7 pruebas primero | **Cumplido** (sin anomalías) |
| 5 | Guardianes de estado antes/después de cada prueba | **Cumplido:** las 16 ejecuciones devolvieron `identicos: true` y `restaurado: []` (el guardián nunca tuvo que corregir nada) |
| 6 | Detenerse ante restauración fallida o comportamiento no previsto | Aplicado: la **1.ª ejecución se abortó** (ver §4: Illustrator importa el SVG como una sola capa; y la respuesta de cierre se perdía) y se corrigió el método antes de repetir. En las ejecuciones finales no hubo anomalías |
| 7 | Conservar JSON y ejecutar el analizador | **Hecho:** `docs/fase1/nivel0-real/` + `INFORME_NIVEL0.md` + `resultados.json` |
| 8 | Registrar diferencias maqueta ↔ real | **Hecho:** `NIVEL0_DIFERENCIAS_MAQUETA_VS_REAL.md` (M1…M17) |
| 9 | Mantener baseline, `panel/` e instalación intactos | **Cumplido:** `git diff` de `panel/`, `reference/` y baseline vacío; huellas verdes |

## 3. Resultados
Resumen del analizador: **✅ 51 · 🔶 2 · ❌ 0 · sondas distintas de la maqueta: 0**. Las 2 diferencias son una sola causa (la escala de N0-A, §3.2).

### 3.1 Confirmaciones (la maqueta acertó)
- **KI-10 confirmado en Illustrator real.** Grupo dentro de grupo en `Creases` ⇒ el extractor devuelve `"Script error: undefined is not an object line:90"` (N0-C). La capa de corte se elige por subcadena: «Studies» gana a «Cuts» (N0-D). Las capas oculta/bloqueada se leen igual: resultado idéntico byte a byte (N0-B).
- Sondas de ExtendScript: `GroupItem` no tiene `layers` (leerla lanza `TypeError`, nº 21); `anchor/leftDirection/rightDirection` son arrays de 2; los hijos de un `CompoundPathItem` son `PathItem`; manijas Bézier extraídas correctamente (N0-F, N0-G con invariantes idénticos a los esperados).
- Unidades: 1 px del SVG = 1 pt; origen del artboard abajo-izquierda con eje Y hacia arriba (los invariantes de traslación/reflejo del analizador siguen siendo válidos).
- Motor vigente sobre extracciones reales de N0-B, N0-F y N0-G: mismos paneles, área, adyacencias y avisos que el esperado.
- Arte: modo `layers` y modo `artboards` exportan front y back (escala 800 %); estado del documento idéntico antes/después en ambos modos (rama feliz).

### 3.2 Hallazgo principal: la escala absoluta cambia el resultado del motor (KI-22; reproduce KI-04 con datos reales)
- La extracción de Illustrator real sobre el SVG exportado de la Caja Botánica (N0-A) mide **175.0 × 223.5 mm**, con 12 creases de 39 / 39.5 / 40 / 120 mm: **idéntica a la salida real del plugin** (`caja-botanica-real`). El motor vigente da **11 paneles, 10 adyacencias, 0 avisos**: es el defecto KI-04 («11 de 13») reproducido de extremo a extremo con datos que produjo Illustrator.
- La maqueta/analizador esperaban 13 porque el fixture de A2 derivado del SVG estaba **a ×0.75** (px CSS en lugar de 1 px = 1 pt). Normalizada a esa escala, la extracción real da **13 paneles / 15 425.945 mm² / 12 adyacencias / 0 avisos** (= esperado).
- Barrido de escala sobre la extracción real [MEDIDO, motor sin modificar]: ×0.50…×0.99 ⇒ 13 paneles; ×1.00…×2.00 ⇒ 11 paneles (21 escalas muestreadas); **siempre 0 avisos** (la pérdida es silenciosa).
- **Interpretación [INFERENCIA]:** las tolerancias en mm absolutos (KI-04, KI-17, KI-18) hacen que un troquel cuyas holguras sean ≈ 0.5 mm funcione o falle según su escala. Es argumento a favor de la normalización geométrica de la subfase 2A (D4-A), medida en mm reales con el criterio de tolerancia *relativo al tamaño de la pieza*. No se ha corregido nada.
- Efecto en la evidencia de A2: los golden y pruebas que usan `caja-botanica-illustrator-export.dieline.json` siguen siendo válidos **como caso a escala ×0.75**; no representan el tamaño real. No se modificó ningún fixture ni golden (decisión para el siguiente punto de control; anotado en `tests/fixtures/PROVENANCE.md`).

### 3.3 Otras diferencias respecto de la maqueta
- **PNG de arte 3176 × 2264 px**, no 3175 × 2268: Illustrator exporta el artboard redondeado a pt enteros (397 × 283 pt) × 8 [MEDIDO]. La relación de aspecto cambia ≈ 0.16 % [INFERENCIA: estiramiento del arte en V]. Registrado como **KI-23** (baja).
- **Importación de SVG a una sola capa «Layer 1»** con los `<g id>` como grupos (M5): afecta al *método de prueba* de documentos desechables, no al plugin. Se resolvió con `tesseract_prep_doc.jsx` (solo `N0-*`).
- Texto del error real («undefined is not an object») distinto del de V8: cosmético.

## 4. Problemas encontrados durante la ejecución
1. **1.ª ejecución abortada** (sin preparar los documentos): el extractor devolvía «CUT layer not found» porque el SVG se importa como una capa con grupos, y la respuesta del evento de cierre no volvía (17 min de espera). Evidencia conservada en `docs/fase1/nivel0-real/run1-sin-preparacion/`. No hubo cambios en documentos reales.
2. **El cierre por AppleScript pierde la respuesta** (`-1712`) aunque Illustrator cierra el documento: 7 de 8 cierres de la ejecución final. Mitigación del orquestador: tiempo límite corto + `SIGKILL` + verificación del estado por inventario; en los 8 casos el inventario final fue idéntico al inicial.
3. **Defecto del orquestador (corregido):** `run-log.json` de la ejecución mínima fue sobrescrito por la de `rest`. Ahora se escribe `run-log-<orden>.json`. De la mínima se conserva la cola de la consola (`run-log-minimal.txt`, transcrita) y **todos los JSON de resultados íntegros**.
4. El script de arte tarda ≈ 7–9 s (dos exportaciones de 3176 × 2264 px); los PNG temporales (≈ 31 KB, arte plano) que dejó en `Folder.temp/tesseract_art` se borraron (4 archivos `N0-B_*`).

## 5. Qué sigue sin verificarse [NO VERIFICADO]
- La **rama de fallo de KI-21** (artboard activo sin restaurar si falla una exportación): solo probada en maqueta; no se provocó en real a propósito.
- El permiso de macOS para escribir en el Escritorio (la salida se redirigió a `/tmp` para evitarlo).
- Troqueles **reales de trabajo** con arte complejo, trazados compuestos con arte, documentos creados en Illustrator con capas nativas (los de prueba se prepararon desde SVG), y el comportamiento con otras versiones de Illustrator.
- Todo lo que depende de **cargar el panel en el CEP real** (Chromium 99 auténtico, manifiesto, `evalScript`): requiere A4 con instalación autorizada.
- Otras plataformas (Windows) — D5-A.

## 6. Estado de aislamiento al cerrar el Nivel 0
Baseline congelado: intacto (huellas) · extensión instalada: idéntica al baseline · `panel/`: sin cambios desde PC1 · carpeta CEP del usuario: sin `tesseract-v3*` · Illustrator: 0 documentos abiertos, `userInteractionLevel` restaurado a `DISPLAYALERTS` en cada paso · sin carpeta en el Escritorio · Git local: un solo autor, sin remoto, sin trailers de atribución.
Lo único que se escribió fuera del repositorio: `/tmp/Tesseract_Nivel0*` (copias de trabajo y salida) y PNG temporales (ya borrados).

## 7. Recomendación para el siguiente punto de control (PC4)
1. **Decidir qué hacer con KI-22** antes de cualquier refactorización: es el hallazgo con más impacto para el producto (pérdida silenciosa de paneles según la escala). Opciones: (a) tratarlo en la subfase 2A con tolerancias relativas/normalización validada con las 3 escalas de N0-A; (b) añadir primero un aviso de validación (no cambia el motor) — requiere autorización porque modifica comportamiento observable.
2. **Decidir el destino de los fixtures a ×0.75** (conservarlos como «caso a escala reducida» y añadir el fixture a escala real extraído por Illustrator) — cambia goldens de A2/A3, por eso no se hizo.
3. **Autorizar A4 (primera carga del bundle en el CEP real)**, con alcance acotado: instalar `tesseract-v3` (id `com.tato.tesseract.v3`), snapshot antes/después, rollback probado, lista de paridad y medición con `measure_ui.js`/`leak_cycles.js`. Es el único paso que cubre lo que el Nivel 0 no puede (Chromium 99 real, `evalScript`, manifiesto).
4. **La refactorización profunda con Opus en chat nuevo** puede prepararse ya (HANDOFF actualizado), pero según tu criterio **solo debe iniciarse tras A4 y con autorización**; el Nivel 0 aporta como entrada los KI-10, KI-22 y KI-23 confirmados/medidos.
