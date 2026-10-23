# Nivel 0 — revisión de los scripts antes de ejecutarlos (condición 4)

Fecha: 2026-10-23 · Alcance: `tools/illustrator/tesseract_doc_survey.jsx`, `tesseract_extract_check.jsx`, `tesseract_art_check.jsx` (generados por `tools/illustrator/make-jsx.mjs` desde el baseline congelado).
Evidencia: lectura completa del código generado + 9 pruebas automáticas sobre la maqueta (`tests/node/jsx-validation-scripts.test.mjs`) incl. controles negativos del guardián. **Ninguno se ha ejecutado en Illustrator real.**

## 1. Qué toca cada script

| | `survey` | `extract` | `art` |
|---|---|---|---|
| Lee del documento | capas (nombre, visible, bloqueo), conteos de elementos, profundidad de grupos, artboards, **sondas** de comportamiento de ExtendScript | todo lo que lee el plugin (capas Cuts/Creases, anclas y manijas) | capas, artboards |
| **Escribe en el documento** | **Nada** | **Nada** | **Transitorio**: artboard activo y `visible` de capas (lo hace el script del plugin); restaurados |
| Escribe fuera del documento | JSON en `~/Desktop/Tesseract_Nivel0/` | JSON en la misma carpeta | JSON ahí + **PNG24 en `Folder.temp/tesseract_art`** (como el plugin) |
| Guarda / cierra / crea / borra elementos del documento | No | No | No (`exportFile` exporta; no altera el documento) |
| Cuadros de diálogo | 1 `alert` final | 1 `alert` final | 1 `alert` final |

Prohibiciones verificadas por prueba en el código generado: no aparecen `.save(`, `.saveAs(`, `doc.close(`, `.remove(`, `app.open(`, `documents.add`, `.delete(`, `.rotate(`/`.translate(`/`.resize(`; la **única ruta de escritura** es `Folder.desktop.fsName + "/Tesseract_Nivel0"`; sintaxis solo ES3.

## 2. El guardián de estado (añadido en esta revisión)
Antes de ejecutar: `__tess_snap()` registra nº de documentos, nombre, **artboard activo**, nº de artboards, **nº de elementos**, **tamaño de la selección**, `doc.saved` y, por cada capa (recursivo): nombre, **visible** y **bloqueada**; y guarda la **referencia a la selección**.
Después (en un `finally`, **también si el script del plugin lanza error**): `__tess_restore()` devuelve artboard activo, visibilidad y bloqueo de cada capa a lo registrado; `__tess_restore_selection()` reasigna la selección si su tamaño cambió; `__tess_integrity()` toma una segunda fotografía, **compara ambas** y deja `antes`, `despues`, `identicos`, `restaurado` (qué hubo que corregir) y `seleccionRestaurada` en el JSON. El aviso final dice **SÍ/NO**.
Pruebas (maqueta): estado idéntico en los tres scripts; la exportación falla a mitad ⇒ artboard activo restaurado y registrado; cambios hostiles de visibilidad/bloqueo/artboard/selección ⇒ restaurados y registrados.

## 3. Hallazgos de la revisión
| # | Hallazgo | Severidad | Tratamiento |
|---|---|---|---|
| R1 | **El script de arte del plugin no restaura el artboard activo si una exportación falla** (`exportArtboardByIndex` lo restaura solo en el camino feliz, sin `finally`). Reproducido en la maqueta | Media (defecto del producto) | Registrado como **KI-21**, **preservado**; el guardián lo compensa en el Nivel 0 |
| R2 | El script de arte restaura visibilidad en `finally` pero **no registra el bloqueo** de capas | Baja | El guardián sí lo registra y restaura |
| R3 | `alert` es modal: bloquea hasta pulsar OK | Info | Esperado; el aviso es el canal de integridad |
| R4 | Los PNG de `art` quedan en la carpeta temporal (≈8 MB c/u, como hace el plugin); el script **no los borra** | Baja | Se informa su tamaño real (`png.ancho/alto/bytes`); se pueden borrar a mano |
| R5 | Cambiar visibilidad/artboard/selección puede dejar **pasos en el historial de deshacer** aunque el estado final sea idéntico | Info | [NO VERIFICADO]; por eso se usan solo documentos desechables y se cierra sin guardar |
| R6 | Escribir en el Escritorio puede disparar el permiso de macOS para Illustrator | Info | Documentado en la guía |
| R7 | `doc.saved` y `selection` son propiedades cuyo comportamiento exacto en un documento recién abierto desde SVG no está verificado | Info | Se comparan antes/después (no se asume su valor absoluto) |
| R8 | `eval` del JSON del plugin dentro del script (`eval("("+raw+")")`) | Baja | Entrada: el JSON generado por el propio script del plugin; solo en documentos desechables |

## 4. Conclusión
Los tres scripts son **de solo lectura sobre el documento** salvo el de arte, cuyas modificaciones son **transitorias, acotadas (artboard activo, visibilidad) y restauradas con evidencia**; el estado se verifica antes/después en cada ejecución. Seguros para documentos de prueba desechables; **no se recomienda** ejecutarlos sobre trabajos reales hasta ver los resultados del Nivel 0.

## 5. Adenda (ejecución real, 2026-10-23): script de preparación y orquestador
Dos herramientas nuevas, **ambas restringidas a documentos desechables `N0-*`**, revisadas y cubiertas por `tests/node/nivel0-automatizacion.test.mjs`:
| | `tesseract_prep_doc.jsx` | `run-nivel0.mjs` |
|---|---|---|
| Motivo | Illustrator importa el SVG como **una sola capa con grupos** (M5); convierte cada `<g id>` raíz en una capa del mismo nombre | Abre, prepara, ejecuta los 3 scripts y cierra los documentos con `osascript`; compara el inventario de documentos antes/después |
| Escribe en el documento | **Sí (solo desechable):** crea capas, mueve el contenido, `remove()` del grupo vacío y de la capa original vacía (2 `.remove()` en todo el código) | No directamente; abre/cierra documentos |
| Guardas | Se niega si el nombre activo no empieza por `N0-`; exige exactamente 1 capa inicial | Exige nombre `N0-*` antes de cada script y de cada cierre; no admite un `N0-*` ya abierto; aborta (`Anomaly`) ante integridad no idéntica, restauración necesaria o inventario final distinto del inicial |
| Guardar/instalar | Nunca guarda ni cierra | Cierra siempre con `SaveOptions.DONOTSAVECHANGES`; no referencia CEP ni `install.sh`; única eliminación: su carpeta de staging en `/tmp` |
| Efectos laterales | — | Cambia `app.userInteractionLevel` a `DONTDISPLAYALERTS` solo al abrir/cerrar y lo restaura; si el evento de cierre no responde (`-1712`) mata `osascript` y **verifica por inventario** |
Hallazgos de la ejecución real que afectan a esta revisión: R1 (KI-21) no se pudo contrastar en real (rama de fallo no provocada); R4: los PNG de `art` siguen quedando en la carpeta temporal (se borraron a mano los 4 `N0-B_*`); R8 (`eval`) sin incidencias; R5 (historial de deshacer) no observable al cerrar sin guardar. Resultado: **16/16 ejecuciones con estado idéntico antes/después y 0 restauraciones**.
