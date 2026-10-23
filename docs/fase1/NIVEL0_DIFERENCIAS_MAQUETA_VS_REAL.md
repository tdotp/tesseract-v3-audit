# Registro de diferencias: maqueta de Illustrator ↔ ExtendScript real

Estado: **plantilla preparada; resultados pendientes** (el Nivel 0 aún no se ha ejecutado en Illustrator real). Se completa con `tests/results/nivel0/INFORME_NIVEL0.md` (generado por `tests/tools/nivel0-analizar.mjs`). Etiquetas: ⏳ pendiente · ✅ igual a la maqueta · 🔶 distinto (diferencia a registrar).

Cada fila es una **suposición de la maqueta** (`tests/lib/mock-illustrator.mjs`) que los tests de A2/A3 dan por buena y que el Nivel 0 puede refutar. Si alguna resulta 🔶, hay que corregir la maqueta y revisar las pruebas que dependen de ella.

| # | Suposición de la maqueta | Cómo se comprueba | Real | Estado |
|---|---|---|---|---|
| M1 | `GroupItem` **no tiene** la propiedad `layers` (`typeof g.layers === 'undefined'`) | Sonda `groupItem.typeofLayers` (survey) | — | ⏳ |
| M2 | Leer `g.layers.length` en un `GroupItem` **lanza** error (base de KI-10) | Sonda `layersLengthLanza` + texto en `mensajeError` | — | ⏳ |
| M3 | Un grupo anidado dentro de Creases hace fallar el extractor con "Script error" (KI-10) | N0-C · L0-3 | — | ⏳ |
| M4 | La capa de corte se elige por subcadena y la primera de arriba abajo gana ("Studies" antes que "Cuts") | N0-D · L0-2b | — | ⏳ |
| M5 | `doc.layers[0]` es la capa **superior** y las `<g id>` de primer nivel de un SVG se importan como capas con ese nombre; la última `<g>` queda arriba | N0-A…G · L0-2 | — | ⏳ |
| M6 | 1 px del SVG = 1 pt (el artboard mide viewBox × 0.352778 mm) | L0-5 | — | ⏳ |
| M7 | `pathPoints[i].anchor/leftDirection/rightDirection` son arrays de 2 números | Sonda `pathPoint` | — | ⏳ |
| M8 | Los hijos de un `CompoundPathItem` son `PathItem` con `parent.typename === 'CompoundPathItem'` y el extractor los toma como trazados independientes | N0-F · L0-4 + sonda `compound` | — | ⏳ |
| M9 | Las manijas Bézier se extraen y coinciden con las del SVG (invariantes de longitud de manijas) | N0-G · L0-4 | — | ⏳ |
| M10 | Coordenadas: el origen y el sentido del eje Y de ExtendScript pueden diferir del SVG; el extractor es **invariante** (el análisis no depende de ellos) | L0-4/L0-6 usan invariantes a traslación y reflejo; sonda `artboard0.rect` y `pathPoint.anchorMuestra` para inferirlos | — | ⏳ |
| M11 | El motor vigente da lo mismo sobre la extracción real que sobre el troquel esperado (13 paneles en N0-A) | N0-A · L0-6 | — | ⏳ |
| M12 | Capas **ocultas/bloqueadas** se leen igual (no se consideran visibilidad ni bloqueo) | Paso opcional de la guía | — | ⏳ |
| M13 | `exportFile` PNG24 con `artBoardClipping` y `horizontalScale/verticalScale` produce PNG de ≈ (artboard en pt × escala/100) píxeles; escala = 4096 px / lado largo, acotada a 100–800 % | N0-B · L0-7 (`png.ancho/alto`) | — | ⏳ |
| M14 | El script de arte en modo capas deja la visibilidad como estaba (el plugin lo hace en `finally`) y **no restaura** el artboard activo si falla (KI-21) | `_integridad` del art + (la rama de fallo solo se prueba en maqueta) | — | ⏳ |
| M15 | `File.saveDialog`/`File.write` con `encoding = "UTF-8"` y `Folder.desktop` funcionan como en la maqueta; escribir en el Escritorio puede pedir permiso a macOS | Ejecución de cualquier script | — | ⏳ |
| M16 | El mensaje del `TypeError` real y su `e.line` difieren del de V8 (los scripts del plugin devuelven `"Script error: " + e.message`) | N0-C: texto de `_resultado.error` | — | ⏳ |
| M17 | `doc.selection`, `doc.saved`, `doc.pageItems.length` se comportan como arrays/booleanos/enteros y no cambian al ejecutar los scripts | `_integridad` de todos los JSON | — | ⏳ |

## Diferencias encontradas
_(ninguna registrada todavía — pendiente de ejecución)_
