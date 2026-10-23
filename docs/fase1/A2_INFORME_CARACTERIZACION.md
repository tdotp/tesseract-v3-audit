# Fase 1 · Punto de control 2 — A2: Banco de caracterización

Fecha: 2026-10-23 · Estado: **entrega para revisión. A3 y la refactorización estructural NO iniciados.** Modelo usado: Sonnet (permitido para A2).
Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Cumplimiento del alcance y de las restricciones

| Alcance / restricción | Resultado |
|---|---|
| 1. Pruebas reproducibles del comportamiento actual y de la corrección GPU | **Hecho.** `tests/run-all.sh` (Node + Chrome headless real, sin dependencias) |
| 2. Ampliar geometría, plegado, materiales, artwork y exportación | **Hecho** (§3): 26 troqueles × 2 motores, árboles de plegado de todas las bases, 3 presets, espesor, luces, arte, GLB, interacciones, extracción |
| 3. Registrar métricas base y defectos sin corregirlos | **Hecho:** `tests/golden/metrics.base.json`; `docs/KNOWN_ISSUES.md` (KI-01…20 + matriz de cobertura). **Ningún defecto se corrigió** |
| 4. Panel actual sin nuevos cambios de código | **Cumplido** [MEDIDO]: `panel/` verificado por huellas (`tests/golden/panel.pins.json`); `git diff 6b76385 -- panel` vacío |
| 5. Preservar la comparación con el baseline congelado | **Hecho:** cada prueba corre contra `reference/legacy-baseline` **y** `panel/`; los golden se generan solo desde el baseline |
| 6. Procedimiento para validar en Illustrator real sin instalarlo | **Hecho** (preparado, **no ejecutado**): `docs/fase1/PROCEDIMIENTO_VALIDACION_ILLUSTRATOR.md` + 3 `.jsx` en `tools/illustrator/` |
| No modificar la extensión instalada / no instalar V3 en CEP | **Cumplido:** `verify-isolation.sh` verde (instalada idéntica al baseline; V3 no instalado) |
| No iniciar A3 / no cambiar motor / no corregir exportadores / no alterar originales | **Cumplido** |
| `HANDOFF.md` autocontenido | **Entregado** (`HANDOFF.md` en la raíz) |

## 2. Resultados de las pruebas

| Batería | Resultado |
|---|---|
| **Node** (`node --test 'tests/node/*.test.mjs'`, ≈2 s) | **155/155** |
| **Navegador** (Chrome headless real con GPU Apple M1 Max, ≈2.5 min) | **26/26** (28/28 con `--soak`, que añade 25 ciclos de plegado) |
| **Controles negativos** — mutaciones sobre copias de `panel/` | **21/21 detectadas** (11 Node + 10 navegador). Cada serie exige antes una ejecución limpia que pase |
| **Aislamiento** (`verify-isolation.sh`, huellas de `panel/`, un solo autor, sin remoto, sin trailers) | Verde |
| Ejecución completa `tests/run-all.sh --mutations --soak` | "TODO EN VERDE" (6 min 34 s) |

Los controles negativos **encontraron y corrigieron pruebas débiles** durante A2: una invocación mal formada que hacía "detectar" todo, un filtro de paneles pequeños sin fixture que lo ejercitara (se añadieron 3), y una tolerancia sin cobertura lateral (se añadieron 3 fixtures de T).

### Desglose Node (155)
| Archivo | Pruebas | Qué fija |
|---|---|---|
| `geometry-golden` | 60 | 26 fixtures × (baseline, panel) contra golden: paneles, áreas, centroides, adyacencias, árboles de plegado de todas las bases (≤12 paneles), validador, contadores de topología; constantes (tolerancias, presets, offsets); determinismo; la entrada no se muta |
| `known-issues` | 28 | KI-04…09 y 17…19 con valores concretos y el valor "correcto" documentado; causa raíz de KI-04 |
| `extraction` | 37 | `EXTRACT_SCRIPT` sobre la maqueta de Illustrator: ida y vuelta del troquel real, unidades, nombres de capa, KI-10 (subcadena, grupo anidado), compuestos, ocultas/bloqueadas, heurísticas de contorno abierto, errores |
| `artwork-script` | 16 | Script de arte: artboards vs capas, nombres Front/Back/Tiro/Retiro, escala 100–800 %, restauración de visibilidad y artboard activo |
| `glb-inspector` | 4 | Inspector de GLB propio; kit de unidades (m vs mm vs nodo con escala 0.001); KI-02 sobre el GLB de evidencia |
| `jsx-validation-scripts` | 6 | Los `.jsx` de Illustrator: idénticos a lo generado, mismo resultado que el plugin, sin modificar el documento, solo ES3 |
| `isolation` | 4 | Guarda de aislamiento, diferencias permitidas de `panel/`, huellas, autoría |

### Desglose navegador (26)
GPU (baseline crece; panel sin crecimiento en 2 fixtures × con/sin arte) · regresión baseline↔panel en 2 fixtures (píxeles en 4 poses, escena, GLB) · escena/materiales (2) · arte (2) · GLB (4 + 3 de comparación) · interacciones (2) · métricas (3).

## 3. Cobertura por área

| Área | Qué se caracteriza | Dónde |
|---|---|---|
| Geometría | 26 troqueles: 2 reales, rejillas hasta 8×8 y densa, huecos (centrado/descentrado), curvas, **pliegues que no alcanzan (0.3/0.6 mm) y sobresalen (0.3/0.6 mm)**, T exacta y desalineada (0.375/0.6/1/2.5/5 mm lateral), paneles pequeños/delgados, creases de largo completo, sin creases | `geometry-golden`, `known-issues` |
| Plegado | Árbol de plegado desde cada base, signo por crease (`computeFoldSign`), adyacencias; plegado en escena (ALL=30/60°), bisagras/puentes con y sin arte; Shift+clic (base), Alt+clic (crease), órbita/pan/zoom/Esc | golden + navegador |
| Materiales | 3 presets (colores de panel base y no base, aristas, bisagras), `MeshPhongMaterial`, DoubleSide, especular/brillo; espesor 0.25/2 y topes 0.1/20; entradas inválidas; luces, renderer (antialias, `preserveDrawingBuffer`), cámara | navegador |
| Artwork | Script de extracción de arte (maqueta); overlays por panel (22), UV contra el artboard completo (error < 1e-5), desplazamientos `+0.08/−0.08`, `renderOrder` 60, material y textura, bisagras texturizadas | `artwork-script`, navegador |
| Exportación | Estructura del GLB (nodos, mallas, materiales, accesores, imágenes, extensiones), unidades (mm), `roughness 1`, `BLEND`, hash idéntico baseline/panel, inspector de normales | navegador, `glb-inspector` |
| GPU | Texturas, buffers, VAOs y programas WebGL vivos tras ciclos repetidos | navegador |
| Extracción | Lógica de ExtendScript sobre maqueta (⚠ no es Illustrator) | `extraction` |

## 4. Métricas base (informativas)

Entorno: Chrome headless real con GPU Apple M1 Max (ANGLE/Metal), Node v24.12; **no es CEP/Illustrator**. Archivo: `tests/golden/metrics.base.json`.

**Motor geométrico** (mediana, ms): caja real (81 segmentos, 7 reinicios) **30.1** · export de Illustrator (68 seg.) **8.3** · rejilla 4×4 (28 seg.) 9.1 · 6×6 (64) 73.9 · 8×8 (116) **320** · 4×4 densa (128) 100.3. Coherente con la Fase 0 (≈ n^2.5).

| Navegador (fixture caja, 100 ticks) | Baseline | Panel (con parche A1) |
|---|---|---|
| FPS en reposo / orbitando | 61 / 60.6 (limitado a 60 Hz) | 60.6 / 60.6 |
| Plegado por tick (mediana / p95) | 0.9 / 1.2 ms | 0.6 / 0.8 ms |
| Crecimiento por 100 ticks (texturas / buffers / VAOs) | **+1111 / +5050 / +2020** | **0 / 0 / 0** |
| "Continue to 3D" síncrono | 29.9 ms | 30.4 ms |
| Exportar GLB sin arte | 8 ms | 8 ms |

## 5. Hallazgos nuevos de A2 (registrados, no corregidos)

1. **KI-04 tiene causas raíz medidas.** (a) **Una T de creases exacta, sin imprecisión alguna, ya pierde un panel** con el motor vigente: 2 paneles que suman 1600 de 3200 mm². La adyacencia estricta compara cada crease cruda con la arista completa del panel; cuando la topología parte la arista en una T, el vecino queda sin adyacencia y el filtro de conectividad lo descarta. (b) En el troquel real hay **8 pares de extremos de crease a 0.497–0.501 mm** entre sí, a ambos lados del corte de `0.5 mm`. Esto es insumo directo de la sub-fase 2A.
2. **Los pliegues que no alcanzan pierden material sin aviso** (KI-17): 0.3 mm de holgura ⇒ −24 mm² (0.75 %) con el validador en silencio; a 0.6 mm avisa pero construye igual.
3. **La "tolerancia 0.5 mm" no es lateral** (KI-18): el criterio punto-sobre-segmento usa suma de distancias; ajusta extremos a 2.5 mm del cruce (pierde 50 mm²) y a 5 mm deja de hacerlo (se cuela la cara exterior).
4. **Paneles pequeños o delgados se descartan en silencio** (KI-19): una solapa de 40×1 mm desaparece; < 4 mm² también.
5. **Exportar GLB con arte de 4096 px pesa ≈18 MB y bloquea ≈1.4 s** (KI-13 medido).
6. **Los scripts de extracción y de arte se comportan, en la maqueta, tal como se deducía por lectura** (incluido KI-10), pero **siguen sin confirmarse en Illustrator**: es lo primero que debe validar el Nivel 0.

## 6. Procedimiento para Illustrator real (resumen)
Detalle en `docs/fase1/PROCEDIMIENTO_VALIDACION_ILLUSTRATOR.md`. **Nivel 0 (sin instalar nada, ya disponible):** ejecutas `tesseract_doc_survey.jsx` (solo lectura), `tesseract_extract_check.jsx` (solo lectura) y, si quieres, `tesseract_art_check.jsx` (transitorio, restaura todo) desde `Archivo ▸ Scripts ▸ Otro script…`; me envías los JSON y los analizo con `tests/tools/analyze-dieline.mjs` / `compare-extraction.mjs`. **Nivel 1/2 (instalación de una copia aislada y lista de paridad):** descritos, con reversión; **requieren tu autorización explícita y no se han ejecutado**.

## 7. Límites y riesgos (declarados)
1. Todo se ejecutó en Chrome 152/M1 Max con **puente CEP simulado** y **maqueta de Illustrator**; no hay evidencia de CEP real (Chromium 99) ni de ExtendScript real. Es el límite más importante.
2. Los `.jsx` solo se validaron en Node con la maqueta y con una comprobación de sintaxis ES3; **no se han corrido en el motor ExtendScript**.
3. Dos troqueles reales (misma caja) + sintéticos: el corpus real (D4) ampliará la cobertura.
4. Los golden de geometría congelan el comportamiento actual **incluidos los defectos**; cuando se corrijan (2A/2B) habrá que regenerarlos en tareas aprobadas.
5. La estructura del GLB está fijada; sus **hashes** dependen de la versión de Chrome (por eso la comparación baseline↔panel es relativa).
6. **KI-02 NO se reprodujo con los fixtures del arnés:** los 16 GLB generados (2 troqueles × 4 poses × baseline/panel) tienen **0 normales de longitud 0** [MEDIDO, `tests/results/latest/glb-ki02-normales.json`]. El defecto solo está confirmado en el GLB de evidencia (93 nodos, del documento y pose del usuario: `mesh_9` y `mesh_30`, 12 normales nulas) y su prueba es opcional (depende de `TESSERACT_MEJORA/`). Hace falta el documento/pose original o un fixture que provoque triángulos degenerados para reproducirlo en la batería; se añade a la lista de pendientes. Sigue **abierto** y bloquea la integración con Dimension.
7. KI-12, KI-14, KI-15 sin prueba (declarado en la matriz de cobertura).
8. Las pruebas de navegador lanzan una instancia de Google Chrome con un perfil temporal (se elimina al terminar); no usan tu perfil.

## 8. Cómo reproducir
```bash
cd "Tesseract v3" && tests/run-all.sh --mutations --soak    # ≈ 6.5 min; sin flags ≈ 3 min
```
Commits: ver `git log` (A2 en un commit propio sobre `980ed42`). `HANDOFF.md` actualizado.

## 9. Solicitud
Pido: (1) tu visto bueno al **Punto de Control 2**; (2) indicar si quieres ejecutar el **Nivel 0** en Illustrator y enviarme los JSON (no instala nada); (3) decidir si el siguiente paso es **A3** (build IIFE + instalación en modo `--dry-run`, sin instalar) — por su complejidad y riesgo, el HANDOFF permite asignarlo a Opus en un chat nuevo.
