# 08 — Decisiones D1–D8: alternativas, recomendación, riesgos y consecuencias

Fecha: 2026-10-23 · Estado: **para tu decisión; nada implementado** (solo análisis y pruebas en el scratchpad; los scripts y resultados nuevos están en `tools/baseline/`).
Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**, como en los documentos anteriores.
El desglose de esfuerzo está en `09_ESTIMACION_FASE1_REVISADA.md`.

## 0. Cómo se reflejan tus seis prioridades

| Prioridad | Dónde se resuelve | Efecto en el plan |
|---|---|---|
| 1. Fuga GPU antes de PBR | D2 | La corrección pasa a ser **la primera tarea de código**, sobre la copia aislada y antes de modularizar; la Fase 3 (PBR) queda bloqueada por una puerta medible (Δ recursos = 0). |
| 2. Motor actual = referencia funcional | D3, D4 | El motor del plugin **no se modifica**: se congela como referencia (copia intacta con huellas) y se usa de oráculo. |
| 3. No reemplazar directamente el motor | D3 | Interfaz `GeometryEngine` en Fase 1; el motor de Tesseract Web entra como **candidato detrás de un interruptor**, con criterios de promoción por escrito. |
| 4. Pliegues que no alcanzan/sobresalen: normalización validada | D4 | Nueva sub-fase **2A** (normalizador + validación formal) **antes** de cualquier cambio de motor. |
| 5. Investigar unidades del GLB antes de tocar la escala | D6 | Fase 1 **no cambia** la escala; se entrega un kit de calibración (3 GLB) y un protocolo para que veas qué hace Dimension. |
| 6. Extensión instalada intacta; copia aislada | D1 | Protocolo de aislamiento con huellas SHA-256, ID de bundle propio y guardas automáticas. |

## 1. Hallazgos nuevos que condicionan las decisiones (medidos hoy)

1. **Un normalizador "ingenuo" no funciona** [MEDIDO, `normalization_prototype.mjs`]. Probé en el scratchpad un normalizador independiente del motor (recortar excesos, fusionar extremos de crease a ≤0.5 mm, ajustar al contorno y a otras creases). Resultado: con la exportación real de Illustrator el `core` **sigue fallando** (Δ área 0.024 mm²); con el fixture JSON, donde el `core` funcionaba, **lo rompe** (Δ 0.014 mm²); el motor legacy no cambia (13 paneles con el SVG real; 11 con el JSON). El contorno quedó intacto y el proceso fue idempotente, pero siguen apareciendo astillas diminutas **fuera del contorno** junto a la crease 7 (por la forma del contorno en esa esquina). Conclusión: "normalización validada" **es un trabajo de ingeniería propio**, no un parche de 20 líneas.
2. **La clasificación estricta de caras sí cierra el área** [MEDIDO]. Contando solo caras cuyo centroide está estrictamente dentro del contorno (sin la tolerancia inclusiva de 0.5 mm que usa `topology.ts`), la suma da **exactamente** el área del contorno en ambos fixtures (15521.328267 y 27593.190020 mm²). Las astillas son geometría fuera del corte, no material. La solución real combina normalización de creases **y** clasificación estricta, validadas juntas.
3. **Unidades del GLB:** la especificación glTF 2.0 fija **metros** y +Y arriba ([Khronos](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)). El plugin escribe milímetros (±~200 unidades) y Fantastic Fold metros (±0.07). **No hay documentación pública que diga cómo escala Dimension un GLB**: la página de formatos de Adobe devolvió HTTP 403 y la búsqueda no encontró nada sobre unidades [NO VERIFICADO]. Hay que medirlo (D6).
4. **El GLB actual no pasa el validador oficial de Khronos** [MEDIDO, `gltf-validator`]: **12 errores** (`ACCESSOR_VECTOR3_NON_UNIT`: normales de longitud 0 en `mesh_9` y `mesh_30`, 4 triángulos degenerados), 19 avisos informativos (`TEXCOORD_0` sin usar) y 2 (`IMAGE_NPOT_DIMENSIONS`). El de Fantastic Fold: 0 errores. Efecto en Dimension: [NO VERIFICADO]. Es una razón adicional para no tocar el exportador hasta la Fase 5 pero sí medirlo ahora.
5. **Huellas del plugin instalado** (para el protocolo de aislamiento) [CONFIRMADO]: `main.js` SHA-256 `719942d1…8ce44`; `index.html` `1850eefe…37a1a`; `manifest.xml` `0effcee8…46c55`; `three.min.js` `434f6c55…a7cf`. Los hashes completos están en §D1.

---

## D1 — Estructura del repo, ID de bundle y aislamiento

**Contexto.** Quieres trabajar solo sobre una copia aislada y dejar intacta la extensión instalada (prioridad 6).

| Alternativa | Qué implica | Ventajas | Riesgos |
|---|---|---|---|
| **A. Repo único en `Tesseract v3/` + baseline congelado + instalación paralela** | `reference/legacy-baseline/` (copia intacta, solo lectura, con manifiesto de SHA-256), `src/` y `panel/` de trabajo, bundle `com.tato.tesseract.v3.panel`, menú "Tesseract V3" | Simple; una sola cosa que mantener; aislamiento verificable | Si el web necesita `core` más adelante habrá que extraer un paquete |
| B. Monorepo pnpm (`core`, `scene`, `panel` como paquetes) | Mismo patrón que el repo web | Límites muy estrictos | Más configuración y fricción para una sola aplicación; sin beneficio hoy |
| C. Seguir editando una copia plana de `main.js` sin repo | Cambios directos | Arranque inmediato | Sin historial ni pruebas; es lo que hoy impide evolucionar |

**Recomendación: A**, con este protocolo de aislamiento (todo verificable por script):
1. **Baseline congelado:** `reference/legacy-baseline/` = copia de `tesseract-instalado-copia` + `SHA256SUMS`; permisos de solo lectura; una prueba falla si cambia un byte. Referencias de hoy (instalado, `/Library/Application Support/Adobe/CEP/extensions/tesseract`):
   - `main.js` `719942d134d2c5aebb2ed5781cfce25eb5a93fede1583fb05624e64ae6c8ce44`
   - `index.html` `1850eefe3f4522f7dc85c555f1916ea505577f88fb156cf1aa871c2cf5c37a1a`
   - `CSXS/manifest.xml` `0effcee89a9f3d2e862acd55cda242d20def8a079024d10a7b27df80d4f46c55`
   - `libs/three.min.js` `434f6c554d856b46265626505ad48aabb52c8a9ab16aa45fd526b8f55ff2a7cf`
2. **Guarda de la instalación:** `pnpm check` y `install.sh` calculan las huellas de la carpeta instalada antes y después y abortan si difieren.
3. **Identidad propia:** bundle `com.tato.tesseract.v3`, extensión `com.tato.tesseract.v3.panel`, menú "Tesseract V3"; ambos paneles pueden convivir.
4. **Instalación solo a nivel de usuario** (`~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3/`), nunca en `/Library/...`, y **solo con tu OK explícito** cada vez que se instale algo en tu Illustrator (`--dry-run` por defecto).
5. **Escrituras acotadas:** el trabajo solo escribe en `Tesseract v3/` y en el scratchpad de la sesión; nunca en `tesseract-instalado-copia`, `tesseract-web` ni la extensión instalada. (Declaro el único desvío de la Fase 0: sobrescribí un `launch.json` ajeno y lo restauré; este protocolo existe para que no se repita.)
6. **Sin remoto ni push** sin tu autorización; autor único; sin atribución de IA en commits.

**Consecuencias.** *Arquitectura:* sin cambios (doc 03). *Funcionalidad:* ninguna. *Rendimiento:* ninguno. *Esfuerzo:* 0.5–1 día (tarea A0) + 0.25 día de guardas dentro de la tarea de build. *Riesgo residual:* que algo (otra herramienta, actualización de Illustrator) cambie la carpeta instalada sin que lo hagamos nosotros: las huellas lo detectan y dejan de ser "nuestra" referencia.

**Necesito de ti:** confirmar A, y el permiso para instalar en `~/Library/Application Support/Adobe/CEP/extensions/` cuando llegue F1-A3/A4.

---

## D2 — Cuándo y cómo corregir la fuga de recursos GPU

**Contexto.** Medido: +11 texturas, +~50 buffers, +~20 geometrías por tick de slider (1100 texturas por cada 100 ticks); causas localizadas en el código: etiquetas P0… recreadas en cada `applyFolding` (L1842), líneas y cajas de selección de cada crease recreadas en `rebuildCreaseVisuals` (L1700–1733) y `foldRoot` retirado sin liberar (L1822). Los puentes sí se liberan (L1679).

| Alternativa | Qué implica | Ventajas | Riesgos |
|---|---|---|---|
| **A. Parche mínimo en la copia aislada, antes de modularizar** | Liberar lo retirado y cachear las etiquetas; sin cambiar la estructura | Cumple la prioridad 1 de inmediato; diff pequeño y revisable; valida la sonda automática; no toca geometría | Se reescribirá al modularizar (~0.25 día de retrabajo); hay que **no** liberar lo compartido (geometrías/materiales de paneles, texturas de arte) |
| B. Corregir dentro de la escena modular (`ResourceTracker`) | Solución limpia, pero llega semanas después | Sin retrabajo | La fuga sigue viva durante toda la Fase 1; mide mal las pruebas de paridad (memoria creciente) |
| C. Rediseño "crear una vez + `setPose`" | El árbol de escena se construye al cargar; el slider solo cambia rotaciones | Mejor costo por tick y base para render bajo demanda | 2–3 días; cambia el grafo de escena (riesgo de `renderOrder`/picking); mejor junto a la Fase 3 |

**Recomendación: A → B → (C solo si las mediciones lo justifican).**
- **Ahora (A):** tarea de código nº 1, sobre una copia aislada ("legacy-hotfix"), dejando el baseline intacto. Criterio de aceptación **automatizable**: `measure_ui.js` tras 100 ticks → Δ texturas = 0, Δ buffers = 0, Δ VAOs = 0, Δ geometrías ≤ 3; el arte sigue visible tras 100 ticks (no se liberaron texturas compartidas); misma imagen en 3 poses; la geometría/paneles/adyacencias son **idénticos** (las pruebas de caracterización pasan sin cambios).
- **Fase 1 (B):** el `ResourceTracker` hereda el criterio como prueba permanente.
- **Puerta para la Fase 3:** no se introduce ningún mapa PBR hasta que la sonda dé Δ = 0 **también medida en el panel real de Illustrator** (no solo en el navegador).

**Consecuencias.** *Arquitectura:* añade `ResourceTracker` a `scene/`. *Funcionalidad:* ninguna visible. *Rendimiento:* elimina crecimiento de memoria GPU (≈1 MB por tick estimado, 215 MB tras 200 ticks [INFERENCIA numérica]); coste por tick igual o menor. *Esfuerzo:* 0.5–1 día (A) + ya incluido en la tarea de escena (B). *Riesgo:* liberar de más → texturas de arte o geometrías compartidas inválidas (se detecta con la prueba de arte y la comparación de imágenes).

**Necesito de ti:** confirmar A→B y la regla de puerta para la Fase 3.

---

## D3 — Motor de `tesseract-web`: cómo y cuándo se incorpora

**Contexto.** Prioridad 2 y 3: el motor actual es la referencia funcional y **no se reemplaza directamente**. Hechos: el `core` da 13/13 paneles, curvas, huecos y conservación de área, y es 15× a >1000× más rápido, pero falla con la exportación real de Illustrator y lanza excepciones donde el legacy "sigue adelante".

| Alternativa | Qué implica | Ventajas | Riesgos |
|---|---|---|---|
| A. Copiar `core` al repo ya y conectarlo | Reemplazo rápido | Beneficios de golpe | Contradice tus prioridades; cambia resultados visibles (11→13 paneles) sin A/B; hereda el fallo con Illustrator |
| **B. Interfaz `GeometryEngine` en Fase 1; `core` entra como candidato en Fase 2B, tras el normalizador, detrás de un interruptor; legacy por defecto hasta aprobar** | Adaptador del legacy (sin cambiarlo) + contrato de salida con diagnósticos | Cumple 2 y 3; A/B reproducible; reversible | Mantener dos motores un tiempo; exige disciplina para retirar el interruptor |
| C. Depender del repo web (paquete externo) | Sin copia | Sin duplicación | Acopla ciclos de dos productos; el repo web no debe tocar el plugin; procedencia difusa |
| D. Escribir un motor nuevo propio | A medida | Control total | Reinventa lo que ya está probado (70 pruebas); coste alto |

**Recomendación: B.** Definición de "referencia funcional": (i) golden masters congelados; (ii) toda diferencia entre motores se clasifica como **defecto conocido del legacy** (lista H3–H6 del informe) o **regresión**; (iii) el candidato debe **igualar** al legacy donde el legacy es correcto y solo diferir en los defectos listados, con evidencia de área.
**Criterios para promover el candidato a motor por defecto (todos):** 1) corpus aprobado por ti (≥10 troqueles reales incl. Illustrator export) sin paneles perdidos respecto a lo esperado; 2) conservación de área estricta; 3) mismas adyacencias y árbol donde el legacy acierta; 4) diagnósticos legibles en la UI para todo error; 5) tiempo ≤ legacy en todos los casos; 6) validación visual tuya en Illustrator; 7) plan de retirada del legacy (fecha o condición).

**Consecuencias.** *Arquitectura:* `core/` expone `GeometryEngine`; `legacy` y `candidate` como implementaciones. *Funcionalidad:* igual en Fase 1; mejora (curvas, huecos) solo al promover. *Rendimiento:* sin cambio hasta promover; después fuerte mejora. *Esfuerzo:* +0.25 día en Fase 1 (interfaz); Fase 2B ≈ 5–8 días [INFERENCIA, baja confianza]. *Riesgo:* deriva entre motores si se prolonga el periodo dual.

**Necesito de ti:** confirmar B y los 7 criterios (o ajustarlos).

---

## D4 — Pliegues que no alcanzan o sobresalen: normalización geométrica validada

**Contexto.** Illustrator produce creases con extremos a ~0.375 mm de donde deberían tocarse y otros que sobresalen del corte. Regla del repo web: "el troquel importado jamás se altera". Aclaración propuesta: **el documento de Illustrator nunca se modifica** (V3 no escribe en él); el **modelo interno** puede normalizarse, solo creases (nunca el contorno de corte), con informe de cada ajuste.

> **Corrección (F2.0/F2A-0, 2026-10-27; el texto original se conserva arriba):** con la extracción a escala real los extremos de crease **tocan** el corte (0,0000 mm en `caja-botanica-real`; ≤ 0,005 mm tras el viaje por SVG). Los «~0.375 mm» eran escalones de diseño de ≈ 0,5 mm vistos en el fixture a ×0,75 (KI-22). El normalizador de 2A pasa a ser un **ajuste tipado de ruido** (≤ ε, solo extremos de crease), no un cierre de holguras de 0,375 mm. Evidencia: `docs/fase2/01_DIAGNOSTICO_KI22.md` §6, `tests/node/f2-caja-botanica.test.mjs`.

Evidencia: ver §1 (hallazgos 1–2).

| Alternativa | Qué implica | Ventajas | Riesgos |
|---|---|---|---|
| **A. Normalizador independiente del motor + clasificación estricta, con validación formal (sub-fase 2A)** | Etapa `normalizeDieline(DielineV1) → (DielineV1', informe)` previa a cualquier motor; clasificación estricta en el candidato | Una sola solución para ambos motores; ajustes auditables; conserva el rigor de área (sin relajar 1e-8) | Es trabajo de investigación + corpus real (el prototipo ingenuo falló); sin corpus no se puede validar |
| B. Parchear solo el `core` (fusión + clasificación estricta) | Cambia el candidato únicamente | Menos piezas | Deja al legacy con sus defectos (aceptable: es referencia) pero mezcla "arreglo" y "motor" en el mismo cambio, difícil de validar |
| C. Asistente de reparación con aprobación del usuario | La UI lista cada casi-acierto y el usuario aprueba | Máxima fidelidad, sin heurísticas ocultas | Illustrator los produce de forma rutinaria: fricción constante |
| D. Modo tolerante con informe | Relaja tolerancias | Rápido | Riesgo de volver al borrado silencioso (lección de MVP1 del repo web); **no recomendado** |

**Recomendación: A, como sub-fase 2A con "especificación y pruebas de aceptación antes del código".** Definición de **"validada"** (8 puertas, todas automatizables salvo la 7):
- **V1** el contorno de corte queda **idéntico bit a bit** (hash).
- **V2** cada ajuste ≤ 0.5 mm, y queda registrado (tipo, crease, antes/después, distancia) como diagnóstico `warning`.
- **V3** idempotencia: normalizar dos veces no produce ajustes nuevos.
- **V4** con clasificación estricta: Σ áreas de paneles = área del contorno − huecos, error relativo ≤ 1e-6 (**sin** relajar la regla del core), cero caras fuera del contorno contadas, cero paneles desconectados.
- **V5** invariancia por perturbación: troqueles sintéticos con extremos movidos aleatoriamente ≤ ε dan el mismo nº de paneles y adyacencias que sin perturbar.
- **V6** el nº de paneles coincide con el conteo esperado, verificado por una persona, de cada pieza del corpus.
- **V7** revisión visual tuya del plegado 3D de cada pieza del corpus (≥ 10: caja simple, con solapas, con curvas, con ventana, grande, y los 2 troqueles actuales).
- **V8** ambos motores (legacy por el adaptador y candidato) se evalúan sobre la salida normalizada y las diferencias quedan explicadas.
**No cambia el legacy.** No sé aún si la normalización mejora el 11/13 del legacy (el prototipo no lo logró); es una pregunta de la sub-fase 2A, no una promesa.

**Consecuencias.** *Arquitectura:* módulo `core/normalize/` independiente de motor y de UI. *Funcionalidad:* aceptación de más troqueles reales de Illustrator, con avisos legibles. *Rendimiento:* despreciable (lineal en nº de creases). *Esfuerzo:* 2A ≈ 4–7 días + 1 día de revisión tuya [INFERENCIA, **confianza baja**: depende del corpus]; en Fase 1 solo 0.5–1 día para reunir el corpus y escribir la especificación V1–V8. *Riesgo:* que el corpus revele casos (notches, creases colineales con el borde) que exijan reglas adicionales; mitigación: puertas V5/V6 y alcance incremental por familias de casos.

**Necesito de ti:** 8–10 troqueles reales (con curvas, ventana, grandes, y los que dieron problemas) y confirmar que la regla se interpreta como "el documento de Illustrator no se toca; el modelo interno solo ajusta creases con informe".

---

## D5 — Plataformas, versiones mínimas y GPU mínima

**Contexto.** Solo hay evidencia en macOS (Illustrator 30.8.2, Chromium 99). Windows no se ha probado; la GPU de destino es desconocida y condiciona PBR/texturas (Fase 3).

| Alternativa | Ventajas | Riesgos |
|---|---|---|
| **A. macOS hasta la Fase 3; decidir Windows y mínimos con datos del spike** | Foco; el spike aporta cifras reales | Si luego Windows es obligatorio, habrá retrabajo en rutas/diálogos |
| B. macOS + Windows desde la Fase 1 | Detecta antes los problemas de rutas | Necesita equipo Windows; +2–4 días [INFERENCIA]; ralentiza el camino crítico |
| C. Fijar hoy un mínimo "por estimación" | Claridad | Sin datos; puede ser inconsistente con lo medible |

**Recomendación: A**, con higiene desde ya (rutas y guardado solo vía `bridge/`; sin concatenar `file://` por el código; sin dependencias de macOS). Decidir mínimos de GPU con los resultados de F1-14 y las medidas CEP de F1-04; la versión mínima de Illustrator se fija leyendo la tabla oficial de versiones de CEP de Adobe [NO VERIFICADO por mí; la tabla no está en esta máquina].

**Consecuencias.** *Arquitectura:* `bridge` aísla lo dependiente de SO. *Funcionalidad:* sin cambio. *Rendimiento:* los mínimos pueden acotar tamaño de textura/calidad por defecto. *Esfuerzo:* 0 hoy; Windows sumaría 2–4 días cuando se decida. *Riesgo:* descubrir tarde que un cliente usa Windows o una GPU integrada débil.

**Necesito de ti:** ¿hay clientes/usuarios en Windows? ¿qué equipo más modesto debe soportarse? ¿acceso a un equipo Windows de prueba?

---

## D6 — Unidades del GLB (investigar antes de cambiar la escala)

**Contexto.** Spec: metros. Plugin: mm. Dimension: **desconocido** (sin documentación pública hallada). Además el GLB actual tiene 12 errores de validación (normales de longitud 0).

| Alternativa | Qué implica | Ventajas | Riesgos |
|---|---|---|---|
| **A. Investigar primero con un kit de calibración; no tocar la escala en Fase 1** | 3 GLB de prueba + tabla de resultados | Decisión basada en evidencia; cero riesgo de romper GLB existentes | Retrasa la corrección unos días (no bloquea la Fase 1) |
| B. Pasar a metros ya | Cumple la spec | Probablemente correcto para Dimension | Si Dimension/otro consumidor asume otra cosa, lo "arreglado" estará mal; rompe el uso actual de GLB antiguos |
| C. Opción de exportación (m / mm) | Flexible | Resuelve ambos mundos | Más superficie de pruebas; sigue sin decidir el valor por defecto |
| D. Nodo raíz con escala 0.001 (vértices en mm, mundo en m) | Mantiene datos, corrige el mundo | Mínimo cambio | Algunos importadores aplanan/ignoran la escala del nodo raíz; hay que probarlo |

**Recomendación: A ahora → decidir entre B/C/D en la Fase 5 con los datos.** **Kit entregado** en `tools/baseline/glb_units_test/` (validado con el validador oficial de Khronos: 0 errores):
- `axes_METROS.glb` — triedro: X rojo 100 mm, Y verde 150 mm, Z azul 200 mm, expresado en **metros**.
- `axes_MILIMETROS.glb` — igual, expresado en **milímetros** (convención actual del plugin).
- `axes_MILIMETROS_nodo_escala.glb` — milímetros con un nodo raíz de escala 0.001 (alternativa D).

**Protocolo (≈15 minutos tuyos, Dimension 4.1.9 ya instalado):** abre cada archivo en Dimension (Archivo ▸ Abrir/Importar o arrastrar) y anota: tamaño que muestra el modelo (¿10/15/20 cm o 10/15/20 m?), orientación (¿el eje verde apunta hacia arriba?), y si hay avisos. Repite con el GLB actual `TESSERACT_MEJORA/evidencia/glb/Tesseract_Test_Claude_export_plugin.glb`. Puedes pegarme los resultados; yo los registro en `docs/fase0/` y fijo la decisión. Complemento mío: validar también con otros consumidores si me indicas cuáles usas (Blender no está instalado aquí).

**Consecuencias.** *Arquitectura:* el módulo `export/` recibirá `unitScale` como parámetro (Fase 5). *Funcionalidad:* sin cambio en Fase 1. *Rendimiento:* ninguno. *Esfuerzo:* 0.25–0.5 día de análisis; la corrección (escala + normales) forma parte de la Fase 5. *Riesgo:* cambiar sin datos rompe a quien ya consuma GLB en mm.

**Necesito de ti:** correr el protocolo en Dimension y reportar.

---

## D7 — Versión de three.js

**Contexto.** El plugin usa r132 (2021). Importante: **r132 ya tiene** `MeshPhysicalMaterial` (clearcoat), `PMREMGenerator`, `RGBELoader` y mapas normal/rugosidad [conocimiento general; **a confirmar en el spike**]; versiones posteriores cambian gestión de color e iluminación.

| Alternativa | Ventajas | Riesgos |
|---|---|---|
| A. Mantener r132 durante las Fases 1–2 | Cero cambios visuales; la modularización queda aislada | Conviene saber si r132 alcanza para PBR |
| B. Subir three ahora (antes de modularizar) | Terreno moderno | Mezcla dos fuentes de regresión; invalida las comparaciones de imagen |
| **C. Mantener r132 hasta el spike F1-14; después elegir: quedarse en r132 si alcanza para PBR, o subir en Fase 3 con imágenes de referencia** | Decide con datos; puede evitar una migración innecesaria | Si r132 no alcanza, la subida se hace con el equipo ya más cargado |
| D. Fijar r132 para siempre | Estabilidad | Aísla de mejoras y correcciones; el exportador de three trae extensiones nuevas solo en versiones posteriores |

**Recomendación: C.** F1-14 prueba PBR + entorno + 2 texturas de 2048² en **r132 y en una versión reciente fijada**, dentro del CEP real, y mide FPS/memoria. Subir three exige bundler (desde ~r148 ya no hay `examples/js` clásicos) y comparación de imágenes.

**Consecuencias.** *Arquitectura:* `scene/` aislada de la versión (adaptadores finos para color/encoding). *Funcionalidad:* sin cambio en Fases 1–2. *Rendimiento:* se conoce el techo en CEP antes de comprometer la Fase 3. *Esfuerzo:* ya incluido en F1-14 (0.5–1 día); una subida, si procede, 1–2 días en Fase 3 [INFERENCIA]. *Riesgo:* diferencias de color/luz tras subir; mitigación: imágenes de referencia por fixture.

**Necesito de ti:** confirmar C.

---

## D8 — "Plan maestro"

**Contexto.** No existe en disco un archivo con ese nombre; se tomó el alcance pegado + `TESSERACT_MEJORA/00–03`.

| Alternativa | Ventajas | Riesgos |
|---|---|---|
| A. Dar por bueno el alcance pegado + TESSERACT_MEJORA | Sin trabajo extra | Deriva de alcance: dos fuentes que ya difieren (p. ej. "Fase 1 = modularizar" vs los 8 puntos de V3) |
| B. Me pasas el documento aprobado | Fuente única real | Si difiere, reordena fases |
| **C. Consolido `docs/PLAN_MAESTRO_V3.md`** (alcance, no-alcance, fases, puertas, registro de decisiones D1–D8) para tu firma, y lo usamos como única fuente | Elimina ambigüedad; alimenta cada cierre de fase | 0.25–0.5 día; hay que mantenerlo actualizado |

**Recomendación: C** (y B si existe otro documento: lo integro).

**Consecuencias.** *Arquitectura/funcionalidad/rendimiento:* ninguna directa. *Esfuerzo:* 0.25–0.5 día. *Riesgo:* ninguno relevante; evita retrabajo por alcance.

**Necesito de ti:** confirmar C o pasarme el documento.

---

## 2. Tabla resumen para decidir (mi elección recomendada)

| D | Elegida (recomendada) | Cambia respecto a la propuesta anterior (doc 06) |
|---|---|---|
| D1 | A — repo único + baseline congelado con huellas + instalación paralela | Se añade protocolo de aislamiento explícito |
| D2 | A→B — parche mínimo **primero**, `ResourceTracker` después; puerta para Fase 3 | La corrección sube de F1-10 (tarde) a **primera tarea de código** |
| D3 | B — `GeometryEngine` ahora; `core` solo como candidato en 2B con criterios de promoción | `core` **no** se integra en Fase 1 ni 2A |
| D4 | A — normalizador + clasificación estricta, sub-fase 2A con 8 puertas | Nueva sub-fase; el prototipo ingenuo **falló** (evidencia) |
| D5 | A — macOS hasta la Fase 3; decidir con datos | Sin cambio |
| D6 | A — investigar con kit de calibración; sin tocar escala en Fase 1 | Se añade kit + protocolo; se añade el hallazgo de 12 errores de validación |
| D7 | C — r132 hasta el spike; decidir después | Se aclara que r132 podría bastar |
| D8 | C — plan maestro consolidado para tu firma | Nuevo entregable pequeño |

## 3. Lo que necesito de ti, en orden

1. Responder D1–D8 (basta con las letras: *"D1-A, D2-A, D3-B, D4-A, D5-A, D6-A, D7-C, D8-C"* o tus cambios).
2. Correr el protocolo de GLB en Dimension (D6) y pasarme los números.
3. Enviarme 8–10 troqueles reales (D4).
4. Permiso para instalar la copia V3 en `~/Library/Application Support/Adobe/CEP/extensions/` cuando toque (D1), y fecha tentativa para tus validaciones en Illustrator.
