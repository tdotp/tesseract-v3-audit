# Registro de defectos conocidos (referencia funcional)

Actualizado: 2026-10-23. El motor y el exportador vigentes son la **referencia funcional** (Plan maestro §5): estos defectos se **preservan a propósito** hasta la fase indicada; una diferencia de comportamiento solo es aceptable si corresponde a uno de estos registros.
Evidencia: `docs/fase0/00_INFORME_AUDITORIA.md`, `tools/baseline/results/`. Etiquetas: [MEDIDO] [CONFIRMADO] [INFERENCIA] [NO VERIFICADO].

| ID | Defecto | Severidad | Evidencia | Fase de corrección | Estado |
|---|---|---|---|---|---|
| **KI-01** | **Fuga de recursos GPU** por cada tick de plegado y por cada reconstrucción (etiquetas, líneas/cajas de selección, aristas y overlays de arte no liberados) | Alta | [MEDIDO] antes: +5155 buffers, +2095 VAO, +102 texturas por ciclo | **1 (A1)** | **Corregido en la copia aislada** (commit del parche); Δ = 0 en 25/8/6 ciclos [MEDIDO en navegador]. **Pendiente:** confirmar en el panel real de Illustrator (puerta para Fase 3) |
| **KI-02** | **El GLB exportado no pasa el validador oficial de Khronos: 12 errores** `ACCESSOR_VECTOR3_NON_UNIT` (normales de longitud 0 en `mesh_9` y `mesh_30`; 4 triángulos degenerados). Además 19 avisos informativos (`TEXCOORD_0` sin usar) y 2 `IMAGE_NPOT_DIMENSIONS` | **Alta para Dimension** | [MEDIDO] `gltf-validator` sobre `Tesseract_Test_Claude_export_plugin.glb`; el GLB de Fantastic Fold: 0 errores | **5**; **debe quedar corregido antes de habilitar la integración con Dimension (Fase 6)** | **Abierto — defecto pendiente.** Efecto concreto en Dimension: [NO VERIFICADO] |
| KI-03 | GLB en **milímetros** (la especificación glTF fija metros); sin nodo de escala; sin extensiones; `roughness 1`; arte con `alphaMode BLEND`; un nodo por malla (93) | Media–Alta | [CONFIRMADO] archivos de evidencia; spec Khronos | 5 (tras calibración en Dimension) | Abierto; **no se modifica la escala hasta completar la calibración** (condición 6) |
| KI-04 | El filtro de conectividad descarta paneles reales: 11 de 13 con `caja-botanica-real.json` (−1347.6 mm², 4.9 %) por un acantilado de tolerancia (`< 0.5 mm`) | Alta | [MEDIDO] | 2A/2B | Abierto (preservado) |
| KI-05 | Un panel cuyo centroide cae dentro de un hueco (ventana centrada) se descarta completo | Media–Alta | [MEDIDO] caso sintético | 2B | Abierto (preservado) |
| KI-06 | Los huecos no se restan del panel extruido (`Shape` sin `holes`) | Media | [MEDIDO] +200 mm² en caso sintético | 2B | Abierto (preservado) |
| KI-07 | Las curvas Bézier se ignoran en 3D (solo anclas); 0.52 % del área en el troquel real | Media | [MEDIDO] | 2B | Abierto (preservado) |
| KI-08 | Topología ≈ n^2.5 (≈10.5 s con 484 segmentos; 30 ms con el troquel real) | Media | [MEDIDO] | 2B (no portar curvas al motor vigente) | Abierto (preservado) |
| KI-09 | Si no hay adyacencia por crease, la cara exterior se cuela como panel | Media | [MEDIDO] | 2 | Abierto (preservado) |
| KI-10 | Extracción ExtendScript: grupos anidados dentro de Cuts/Creases probablemente fallan (`layer.layers.length` sobre un `GroupItem`); coincidencia de capa por subcadena (`"die"` ⊂ "Studies"); sin considerar capas ocultas/bloqueadas | Media | [CONFIRMADO por lectura]; [NO VERIFICADO] en Illustrator | 2 / 4 | Abierto (preservado) |
| KI-11 | Bucle de render continuo (75 fps en reposo), `preserveDrawingBuffer:true`, `pixelRatio` sin tope | Media | [MEDIDO] / [CONFIRMADO] | 3 | Abierto (preservado) |
| KI-12 | El botón de captura PNG existe en el código pero está oculto; depende de `toDataURL` + `<a download>` | Baja | [CONFIRMADO] | 5 | Abierto (preservado) |
| KI-13 | La exportación GLB con arte de 4096 px produce ≈18 MB y bloquea la UI ≈1.4 s (re-codifica los PNG) | Media | [MEDIDO] en navegador (M1 Max) | 5 | Abierto (preservado) |
| KI-14 | Estado de espesor muestra `0.3mm` para 0.25 (`toFixed(1)`) | Cosmética | [MEDIDO] | 7 | Abierto (preservado) |
| KI-15 | "Paneles negros con rayas" de una captura previa: no reproducido; hipótesis de z-fighting del arte (offset 0.08 mm) | ? | [MEDIDO] no reproduce en M1 Max | 3 | Abierto; requiere el origen de la captura |
| KI-16 | `OrbitControls.js` se carga y no se usa; `main.js.bak` en la extensión instalada | Baja | [CONFIRMADO] | 1 (A3) / n.a. | `main.js.bak` ya excluido de `panel/`; `OrbitControls.js` se retira en A3 |
