# Procedimiento de validación en Illustrator real

Estado: **preparado, NO ejecutado.** Nada de lo que sigue se ha corrido en un Illustrator real ni se ha instalado nada en tu CEP. Escrito para A2 (2026-10-23).
Por qué existe: todo lo medido hasta ahora corre en Chrome con un puente CEP **simulado** y una **maqueta** de Illustrator. Eso valida la lógica, no el comportamiento de Illustrator 2026 (30.8.2) ni de su Chromium 99.

Regla común: trabaja siempre sobre una **copia** del documento (aunque los scripts del Nivel 0 son de solo lectura). No cierres Illustrator con cambios sin guardar de otros documentos mientras pruebas.

## Resumen de niveles

| Nivel | Qué hace | Instala algo | Autorización |
|---|---|---|---|
| **0** | Ejecuta `.jsx` sueltos (Archivo ▸ Scripts ▸ Otro script…) que leen el documento y guardan un JSON | **No** | Ya dada de hecho: los ejecutas tú cuando quieras |
| **1** | Instala una copia aislada del panel con ID propio para medir y validar paridad | **Sí** (carpeta de usuario) | **NO autorizado todavía** — requiere tu OK explícito |
| **2** | Lista de paridad completa del panel (A11) | (usa el Nivel 1) | Tras el Nivel 1 |

---

## Nivel 0 — sin instalar nada

Scripts en `tools/illustrator/` (generados desde el baseline congelado; ver abajo cómo verificar que no han cambiado):

| Script | Qué hace | Modifica el documento |
|---|---|---|
| `tesseract_doc_survey.jsx` | Inventario: versión de Illustrator, artboards, árbol de capas (visibles/bloqueadas), conteos por tipo y **profundidad máxima de grupos** | No (solo lectura) |
| `tesseract_extract_check.jsx` | Ejecuta el `EXTRACT_SCRIPT` del plugin **tal cual** y guarda su JSON | No (solo lectura) |
| `tesseract_art_check.jsx` ⚠ | Ejecuta el script de arte del plugin: exporta PNG a la carpeta temporal | **Transitorio**: cambia el artboard activo y la visibilidad de capas y los **restaura**; no guarda el documento |

### Pasos
1. Abre una **copia** del troquel (idealmente la Caja Botánica y 1–2 troqueles más; el corpus de D4).
2. `Archivo ▸ Scripts ▸ Otro script…` (⌘F12) → elige `tesseract_doc_survey.jsx` → guarda el JSON donde quieras.
3. Repite con `tesseract_extract_check.jsx`.
4. (Opcional) con un documento que tenga artboards o capas `Front`/`Back`/`Tiro`/`Retiro`: `tesseract_art_check.jsx` ⚠.
5. Envíame las rutas de los JSON y anota: versión de Illustrator, sistema operativo, si apareció algún diálogo de error.

### Qué hago yo con tus archivos
```bash
# análisis del troquel con el motor vigente + riesgos de normalización (extremos casi coincidentes, curvas, huecos, filtro de conectividad)
node tests/tools/analyze-dieline.mjs <tu_extraccion.json>
# comparación de una extracción real contra un fixture (p. ej. la Caja Botánica)
node tests/tools/compare-extraction.mjs <tu_extraccion.json> tests/fixtures/real/caja-botanica-real.dieline.json
```

### Comprobaciones del Nivel 0
| ID | Comprobación | Esperado (según la maqueta y los fixtures) | Qué significa un desvío |
|---|---|---|---|
| L0-1 | `survey`: `maxGroupDepth` en la capa de corte y de crease | 0 ó 1 | **≥ 2 ⇒ el extractor actual falla** (KI-10): confirmaría el defecto en Illustrator real |
| L0-2 | `survey`: nombres de capa | La capa de corte contiene `cut/corte/troquel/die…` y no hay otra capa anterior cuyo nombre contenga `die`/`cut`/`fold`… | Una capa ajena anterior sería elegida por error (KI-10, subcadena) |
| L0-3 | `extract_check`: `error` ausente | JSON con `outerBoundary`, `creases` | Un `error` documenta cuál de los casos falla |
| L0-4 | Misma Caja Botánica: `compare-extraction` contra el fixture | `ok: true` con tolerancia 1e-6 mm (si es el mismo documento) | Diferencias ⇒ el documento cambió, o el comportamiento real de Illustrator difiere de la maqueta (hallazgo importante) |
| L0-5 | Unidades: ancho del artboard en mm del `survey` vs medida conocida | Coincide (1 pt = 0.352778 mm) | Si no, hay escala o unidades de documento inesperadas |
| L0-6 | `analyze-dieline`: `paneles` y `filtro_de_conectividad` | Caja Botánica (JSON): 11 de 14; export de Illustrator: 13 de 14 | Otro valor ⇒ documento distinto o comportamiento nuevo |
| L0-7 | `art_check`: `mode`, rutas PNG en la carpeta temporal, escala (`exportScale`), y que las capas vuelvan a su visibilidad original | `mode` = `artboards` o `layers`; PNG existen | Capas que no se restauran ⇒ defecto grave del script de arte |

Verificación de integridad de los `.jsx`: `node --test tests/node/jsx-validation-scripts.test.mjs` comprueba que son idénticos a lo que se genera desde el baseline (`node tools/illustrator/make-jsx.mjs`), que solo usan sintaxis ES3 y que, sobre la maqueta, no alteran el documento. **No** se han ejecutado en el motor ExtendScript real.

---

## Nivel 1 — panel aislado en Illustrator (REQUIERE AUTORIZACIÓN; no ejecutar todavía)

**Qué se instalaría y dónde** (nada en `/Library/...`, nunca la extensión `tesseract` instalada):
- Carpeta de usuario: `~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3-validation/` con una copia de `panel/` (para A4: el build).
- En esa copia: `CSXS/manifest.xml` con `ExtensionBundleId="com.tato.tesseract.v3.validation"`, `Extension Id="com.tato.tesseract.v3.validation.panel"` y menú **"Tesseract V3 (validación)"**; archivo `.debug` con el puerto 8088:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <ExtensionList><Extension Id="com.tato.tesseract.v3.validation.panel"><HostList><Host Name="ILST" Port="8088"/></HostList></Extension></ExtensionList>
  ```
- `PlayerDebugMode` ya está en 1 para CSXS 11 y 12 en esta máquina (comprobado); no se cambia ninguna preferencia del sistema.

**Antes de instalar:** `tools/verify-isolation.sh` en verde y anotar el listado de `~/Library/Application Support/Adobe/CEP/extensions/`.
**Reversión:** borrar `tesseract-v3-validation/`, reiniciar Illustrator, comprobar de nuevo `verify-isolation.sh` (que ahora también exige que V3 no esté instalado) y el listado.

**Medidas dentro del panel real** (DevTools en `http://localhost:8088` desde Chrome):
```js
// pegar cada archivo en la consola y ejecutar
await tesseractBaseline({ skipGlb: true })        // tools/baseline/measure_ui.js  (FPS, plegado, coste por tick, recursos)
await tesseractLeakCycles({ cycles: 6 })          // tools/baseline/leak_cycles.js (debe dar "SIN CRECIMIENTO ACUMULATIVO")
```
Guardar los resultados en `tests/results/cep_<máquina>_<fecha>.json` (carpeta ignorada por git; copiar a `docs/fase1/` los que se quieran conservar).

## Nivel 2 — lista de paridad en Illustrator (A11)

Contra el plugin actual (o su copia con otro ID) con el **mismo documento**. Valores de referencia para la Caja Botánica salen de la batería automática (`tests/results/latest/*.json`, `tests/golden/`):

| ID | Comprobación | Referencia automática |
|---|---|---|
| P-1 | Extracción y validación (estado "No problems found" o los avisos esperados) | `analyze-dieline`: 0 avisos |
| P-2 | Paneles al pasar a 3D | 11 paneles / 10 pliegues (motor vigente, KI-04) |
| P-3 | Base por defecto, Shift+clic cambia la base, el selector coincide | Pruebas de interacción |
| P-4 | Sliders por crease, "ALL", "Selected crease", Reset Flat, signo de pliegue | Golden de árboles y signos |
| P-5 | Espesor 0.25 por defecto; 0.1–20; valores inválidos rechazados | Prueba de espesor |
| P-6 | Presets White/Kraft/Gray con los colores esperados | `tests/golden/constants.golden.json` |
| P-7 | Arte Front/Back y Tiro/Retiro (artboards y capas): se ve, orientación correcta, bisagras con arte | Pruebas de arte (UV por artboard) |
| P-8 | Exportar GLB abre en Blender / otro visor; el tamaño es el de la maqueta en mm (KI-03) | `tests/golden/glb.golden.json` |
| P-9 | Sin errores en la consola del panel durante toda la sesión | `H.browser.errors` vacío |
| P-10 | Fuga = 0 (`tesseractLeakCycles`), y memoria del proceso `CEPHtmlEngine` sin crecimiento sostenido (Monitor de Actividad) | Prueba GPU |

## Plantilla para devolver resultados
```
Illustrator: <versión> · SO: <versión> · Documento: <nombre/copia> · Fecha: <>
L0-1 … L0-7: <ok / desvío + detalle>
Archivos: <rutas de los JSON>
Notas (diálogos, errores, tiempos percibidos): <>
```
