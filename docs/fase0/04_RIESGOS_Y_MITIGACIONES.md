# 04 — Riesgos y mitigaciones

Probabilidad (P) e impacto (I): A/M/B (alta/media/baja). "Fase" = dónde se mitiga. Las evidencias remiten al informe (doc 00) y al baseline (doc 05).

## 1. Modularización y compatibilidad CEP

| ID | Riesgo | P | I | Evidencia | Mitigación | Fase |
|---|---|---|---|---|---|---|
| R1 | El bundle compilado no carga en CEP 12 (módulos ES por `file://`, política de archivos, rutas). | M | A | Chromium 99, manifiesto sin `CEFCommandLine` [CONFIRMADO]; comportamiento de `file://` [NO VERIFICADO en el panel] | Salida **IIFE** (sin `import`), panel V3 mínimo como primer entregable y puerta de control (G1) antes de mover código; depuración remota con archivo `.debug`. | 1 |
| R2 | Regresiones silenciosas al modularizar (no hay pruebas, `main.js` de 2656 líneas con estado en clausura). | A | A | doc 02 §4 | Pruebas de **caracterización** previas al movimiento (fixtures, números del motor actual, GLB estructural); mover por rangos sin reescribir; validación en Illustrator al cierre. | 1 |
| R3 | La modularización "arregla" cosas y cambia el comportamiento sin querer (p. ej. paneles que hoy se pierden). | M | M | H4: 11/13 paneles [MEDIDO] | Regla: Fase 1 **preserva** el defecto y lo documenta como *known issue*; el cambio se hace en Fase 2 con interruptor y A/B. | 1–2 |
| R4 | ExtendScript embebido como cadenas: al extraerlo a `.jsx` cambia el contexto (ámbito, `$.evalFile`, `<ScriptPath>`) y se rompe la extracción. | M | A | H8; `<ScriptPath>` [A VALIDAR en CEP 12] | Mover primero **tal cual** (mismo texto) y comparar el JSON extraído con el golden en un documento de prueba (manual, Tato). Plan B: seguir con cadenas generadas en el build. | 1 |
| R5 | La extracción actual falla con grupos anidados y nombres de capa ambiguos. | M | M | H8 [por lectura] | Caso de prueba en Illustrator con grupo-en-grupo; arreglar en Fase 2 junto con diagnósticos ("capa no encontrada", "ambigua"). | 2 |
| R6 | Windows no probado (rutas `file://`, `Folder.temp`, `File.saveDialog`). | M | M | Sin evidencia | Decidir D5; si entra, probar `pathToFileURL`/guardado en Windows en Fase 1 y fijar mínimos. | 1 |
| R7 | CEP se retira (UXP). | B (corto plazo) | A (largo) | Solo en documentos previos [NO VERIFICADO] | Mantener `core/materials/finishes/export` sin dependencia de CEP; solo `host` y `bridge` se reescriben. Reconfirmar fechas con Adobe antes de planear. | continuo |
| R8 | Firmado y distribución: hoy solo funciona con `PlayerDebugMode=1` (activo en esta máquina para CSXS 11 y 12). | A (si se distribuye) | A | [CONFIRMADO] defaults | Definir distribución (ZXP firmado) antes de la Fase 7; no bloquea las Fases 1–6. | 7 |

## 2. Geometría

| ID | Riesgo | P | I | Evidencia | Mitigación | Fase |
|---|---|---|---|---|---|---|
| R9 | El motor actual pierde paneles/material en silencio (acantilado de 0.5 mm; centroide-en-hueco; cara exterior como panel). | A | A | H4/H5 [MEDIDO] | Incluir en Fase 1 la **validación visible** mínima: contar paneles y área vs. contorno y avisar (no cambiar geometría). Corrección real en Fase 2. | 1–2 |
| R10 | Cambiar de motor altera la cantidad de paneles/resultados que el usuario ya conoce (11→13). | A | M | doc 01 | Interruptor `legacy/core`, A/B sobre corpus de troqueles reales; informe de diferencias; retirada del legacy solo con aprobación. | 2 |
| R11 | Política de tolerancia mal diseñada vuelve a ocultar material (lección de MVP1 del repo web) o rechaza troqueles reales de Illustrator. | M | A | Experimento: Δ 0.024 mm² por astillas exteriores [MEDIDO] | Opción A del doc 03 §6 con diagnósticos explícitos por cada ajuste; casos de aceptación = export real de Illustrator; no relajar el 1e-8. D4. | 2 |
| R12 | Aplanar curvas dispara el costo del motor actual (n^2.5). | A (si se hace dentro del legacy) | A | 81→~300 segmentos ≈ 3 s [INFERENCIA]; ≈10.5 s a 484 [MEDIDO] | **No** portar curvas al legacy: pasar directamente al `core` (n^1.9). Si hiciera falta, Web Worker para el análisis. | 2 |
| R13 | `core` lanza excepciones (panel desconectado, hueco que toca una crease, huecos anidados) que la UI actual no sabe mostrar. | A | M | topology.ts [CONFIRMADO] | Capa de diagnósticos estructurados (qué panel/dónde) y mensajes en el panel; definir si "hueco sobre pliegue" se soporta. | 2 |

## 3. Renderizado y rendimiento

| ID | Riesgo | P | I | Evidencia | Mitigación | Fase |
|---|---|---|---|---|---|---|
| R14 | **Fuga de recursos GPU por tick** (texturas/buffers/VAOs). Con PBR de 2048 px se vuelve crítica. | A (ya ocurre) | A | H1 [MEDIDO] | `ResourceTracker`, crear-una-vez/`setPose`, sonda automática (Δ=0 tras 100 ticks) como criterio de aceptación permanente. | 1 |
| R15 | Memoria: arte 2×PNG de 4096 px ≈ 3280×4096×4 B ≈ 54 MB cada uno en GPU (≈ 71 MB con mipmaps) ⇒ ~140 MB solo de arte [INFERENCIA numérica, GPU no medida]; PBR 2048² ≈ 21 MB/mapa (cifra de documentos previos). | M | A | doc 05 §5 | Presupuesto por escena; cargar solo el material activo; limitar el arte a 4096 en el lado largo (ya) y evaluar compresión/mipmaps propios; mínimo de GPU (D5). | 3 |
| R16 | El render continuo y `preserveDrawingBuffer:true` encarecen equipos modestos o pantallas DPR 2. | M | M | H2 | Render bajo demanda, `pixelRatio ≤ 2`, captura sin `preserveDrawingBuffer`. | 3 |
| R17 | WebGL2/PBR/entorno (PMREM) en el Chromium 99 de CEP sin probar (rendimiento, extensiones, límites de textura). | M | A | [NO VERIFICADO] | Spike F1-14 (panel desechable con `MeshPhysicalMaterial` + entorno + 2 texturas 2048², medir en CEP) **antes** de comprometer la Fase 3. | 1 |
| R18 | Actualizar three (r132→≥r150) cambia gestión de color e iluminación (apariencia). | A | M | Notas de versiones de three (conocimiento general) | Actualizar solo en Fase 3, tras tener imágenes de referencia por fixture; nunca junto con la modularización. | 3 |
| R19 | Z-fighting del arte con la cara (offset 0.08 mm) a distancias grandes; hipótesis de los "paneles negros con rayas". | B–M | M | H11: no reproducido | Recoger la captura/archivo de origen; probar en el hardware de la captura; si se confirma: `polygonOffset` o profundidad logarítmica. | 3 |

## 4. Exportación e integraciones

| ID | Riesgo | P | I | Evidencia | Mitigación | Fase |
|---|---|---|---|---|---|---|
| R20 | GLB en mm: escala errónea en Adobe Dimension (y en cualquier visor que asuma metros). | A | A | H7 [CONFIRMADO en archivos; efecto NO VERIFICADO] | Prueba inmediata en Dimension 4.1.9 (instalado) con el GLB de evidencia; exportar en metros (decisión D6); prueba de ida y vuelta en Blender y Dimension. | 5 |
| R21 | Extensiones glTF (`KHR_materials_clearcoat`, texturas PBR) no leídas por Dimension; transparencias `BLEND` mal ordenadas. | M | M | [NO VERIFICADO] | Lista de compatibilidad probada por visor; `MASK` para bordes duros; degradar con elegancia (UVI→rugosidad) si no hay extensión. | 5 |
| R22 | Abrir Photoshop/Dimension desde CEP: la app no está abierta, rutas con espacios, permisos, Windows. | M | M | Apps instaladas [CONFIRMADO]; mecanismo [A VALIDAR] | Probar `File.execute()`/`BridgeTalk`/`system.callSystem` desde ExtendScript en un spike; escribir PNG/GLB a carpeta temporal conocida; mensaje claro si falla. | 6 |
| R23 | El PNG actual depende de `toDataURL`+`<a download>` (probablemente no funciona en CEP; botón oculto). | M | B | [INFERENCIA] | Usar `cep.fs.writeFile` + el mismo diálogo de Illustrator que el GLB. | 5 |
| R24 | `evalScript` y exportación de arte bloquean Illustrator (síncrono); en documentos grandes la UI se congela. | M | M | Arte 4096 px ×2 ≈ 0.2 s en el arnés (no representa a Illustrator) | Medir en Illustrator real (F1-04); indicador de progreso; resolución configurable. | 1–4 |

## 5. Alcance, datos y gobernanza

| ID | Riesgo | P | I | Mitigación |
|---|---|---|---|---|
| R25 | Texturas/HDRI con licencia incompatible (FF usa Adobe Stock: no reutilizable, ya decidido). | M | A | Solo CC0 (Poly Haven/ambientCG) o propias; registrar licencia por archivo en `third_party/licenses/`; revisar cada activo. |
| R26 | Atribución de IA o autoría ajena en commits del repo V3 (regla del repo web y tu preferencia). | M | M | Sin trailers; autor = Gerardo; verificación `git log --format='%an'` antes de cada push; sin push sin tu OK. |
| R27 | Aumento de alcance (texturas, acabados) sin medir el techo de hardware. | M | A | D5 + spike F1-14 + presupuesto por material en el plan de Fase 3. |
| R28 | Copiar código desde carpetas con historial contaminado (`~/Downloads/tesseract-web*`). | B | M | Copiar solo desde `Documents/Antigravity/Tesseract/tesseract-web`; `PROVENANCE.md` con commit. |
| R29 | La instalación de V3 pisa o rompe el plugin actual. | B | A | ID de bundle y carpeta distintos; nunca escribir en `/Library/.../extensions/tesseract`; `install.sh` con verificación previa. |
