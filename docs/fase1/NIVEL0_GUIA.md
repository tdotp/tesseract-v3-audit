# Nivel 0 — guía paso a paso para validar en Illustrator real (sin instalar nada)

Estado: **preparada, NO ejecutada.** Duración estimada: 15–25 minutos. **No se instala nada**, no se tocan tus documentos ni la extensión `tesseract`.
Qué haces tú: abrir los documentos de prueba y ejecutar los scripts. Qué hago yo: analizar los JSON, compararlos con los contratos y registrar las diferencias (informe automático).

## 0. Reglas de seguridad
1. **Solo documentos de prueba desechables**: los 6 SVG de `tools/illustrator/docs-prueba/`. No ejecutes los scripts sobre un trabajo tuyo.
2. **Cierra cada documento de prueba SIN guardar** al terminar (Cmd+W → "No guardar").
3. Los scripts **no guardan, no cierran, no crean ni borran elementos** del documento y **no instalan nada**. Cada uno compara el estado del documento **antes y después** (documento, artboard activo, selección, nº de elementos, visibilidad y bloqueo de capas), lo restaura si algo cambió y te lo dice en el aviso final.
4. Si un aviso dice **"Estado del documento idéntico antes/después: NO"**: **detente**, no sigas con ese documento, cierra sin guardar y avísame.
5. Revisión de los scripts (qué leen y qué escriben, líneas por línea): `docs/fase1/NIVEL0_REVISION_SCRIPTS.md`.

## 1. Qué se escribe en tu disco
Una carpeta **`~/Desktop/Tesseract_Nivel0/`** con un JSON por ejecución (`<documento>__survey.json`, `__extract.json`, `__art.json`). El script de arte además exporta PNG a la carpeta temporal de Illustrator (como hace el plugin). Para deshacerlo todo: borra esa carpeta y los `.jsx`.
Nota macOS: la primera vez, Illustrator puede pedirte permiso para escribir en el Escritorio; **permítelo** (o dime y cambiamos la carpeta de salida).

## 2. Documentos de prueba (`tools/illustrator/docs-prueba/`)
| Doc | Archivo | Para qué sirve | Qué predice la maqueta |
|---|---|---|---|
| **N0-A** | `N0-A_caja_real_export.svg` | La **exportación real de Illustrator** de la Caja Botánica (SVG original, sin tocar) | Extracción correcta; el motor vigente da 13 paneles |
| **N0-B** | `N0-B_caja_simple_arte.svg` | Caja simple con hueco, 1 crease y arte por capas **Front/Back** | Extracción correcta; arte en modo `layers`, PNG de ≈4096 px |
| **N0-C** | `N0-C_grupos_anidados.svg` | **Grupo dentro de grupo** en la capa Creases (KI-10) | El extractor **falla** con "Script error" |
| **N0-D** | `N0-D_capa_Studies.svg` | Capa **"Studies"** ("die") encima de Cuts (KI-10, subcadena) | El extractor toma "Studies" como capa de corte |
| **N0-F** | `N0-F_trazado_compuesto.svg` | Contorno + hueco como **un trazado compuesto** | 1 contorno + 1 hueco extraídos por separado |
| **N0-G** | `N0-G_curvas.svg` | Esquinas redondeadas **Bézier** | Manijas `leftDirection/rightDirection` correctas |

## 3. Procedimiento
Para **cada** documento (orden recomendado A → B → C → D → F → G):
1. `Archivo ▸ Abrir…` → elige el SVG. (Si Illustrator pregunta por opciones de importación, acepta las predeterminadas.)
2. Ejecuta **`tesseract_doc_survey.jsx`**: `Archivo ▸ Scripts ▸ Otro script…` (⌘F12) → selecciona `tools/illustrator/tesseract_doc_survey.jsx`. Aparece un aviso con la ruta del JSON y el estado de integridad. Pulsa OK.
3. Ejecuta **`tesseract_extract_check.jsx`** igual. Mismo aviso.
4. **Solo en N0-B:** ejecuta además **`tesseract_art_check.jsx`** (⚠ cambia temporalmente el artboard activo y la visibilidad de capas y lo restaura; el aviso confirma la integridad).
5. Cierra el documento **sin guardar**.

Mínimo útil si tienes poco tiempo: **N0-A (survey + extract), N0-B (survey + extract + art) y N0-C (survey + extract)** = 7 ejecuciones.

### Pasos opcionales (documentos desechables)
- **Artboards Front/Back (modo `artboards` del script de arte):** en N0-B abre `Ventana ▸ Mesas de trabajo`, duplica la mesa y renómbralas `Front` y `Back`; ejecuta `tesseract_art_check.jsx`. Esperado: `mode: "artboards"`. Cierra sin guardar.
- **Capas ocultas/bloqueadas:** en N0-B oculta la capa `Creases` y bloquea `Cuts`; ejecuta `tesseract_extract_check.jsx`. Esperado (comportamiento actual, KI-10): se extrae igual; el aviso final debe decir idéntico antes/después.

## 4. Entregar los resultados
Opción 1 (recomendada): dime **"listo"**; leo `~/Desktop/Tesseract_Nivel0/` y genero el informe.
Opción 2: ejecuta tú mismo
```bash
cd "Tesseract v3" && node tests/tools/nivel0-analizar.mjs ~/Desktop/Tesseract_Nivel0
```
→ crea `tests/results/nivel0/INFORME_NIVEL0.md` (resumen ✅/🔶/❌ por documento, sondas de ExtendScript vs maqueta y la lista de diferencias a registrar).
Además cuéntame: versión de Illustrator, si apareció algún diálogo inesperado, si pidió permisos, y cualquier cosa rara en pantalla.

## 5. Qué compara el informe
| ID | Comprobación | Fuente |
|---|---|---|
| INT | Estado idéntico antes/después en cada ejecución | `_integridad` de cada JSON |
| L0-1 | Profundidad máxima de grupos por capa | survey |
| L0-2 / L0-2b | Nombres y orden de capas; capa de corte/pliegue elegida | survey / extract |
| L0-3 | Extracción sin error (o el error esperado: KI-10) | extract |
| L0-4 | Invariantes del troquel (puntos, áreas, bbox, huecos, creases, manijas) frente al esperado, **invariantes a traslación y reflejo** (origen y eje Y de Illustrator pueden diferir) | extract |
| L0-5 | Tamaño del artboard en mm (1 px del SVG = 1 pt) | survey |
| L0-6 | El **motor vigente** sobre la extracción real da lo mismo que sobre el troquel esperado (paneles, área, adyacencias, avisos) | extract + golden de comportamiento |
| L0-7 | Arte: modo, lados, escala y tamaño real del PNG | art |
| Sondas | Comportamiento de ExtendScript real frente a las suposiciones de la maqueta (`GroupItem` sin `layers`, arrays de 2, hijos de compuestos…) | survey |

## 6. Si algo falla
- **El documento no tiene las capas esperadas** (p. ej. Illustrator no importó los `<g id>` como capas): sigue; el informe lo marcará como diferencia (L0-2) y me dice cómo se importa realmente.
- **Un script muestra un error de Illustrator**: apunta el texto, cierra sin guardar y avísame; el JSON de ese script puede no existir.
- **No quieres escribir en el Escritorio**: dímelo; cambio la carpeta de salida y regenero los scripts.
- **Para volver al estado inicial**: cerrar los documentos sin guardar y borrar `~/Desktop/Tesseract_Nivel0/`.
