# Plan maestro de Tesseract V3 (documento rector)

Versión 1.0 · 2026-10-23 · Estado: **consolidado a partir de lo aprobado por Tato** (alcance V3 pegado en la Fase 0, `TESSERACT_MEJORA/00–03`, decisiones D1–D8 y condiciones del 2026-10-23). Este documento manda: si otro documento lo contradice, se corrige el otro o se registra la excepción aquí.
Los cambios a este plan requieren aprobación de Tato y se anotan en §9.

## 1. Propósito

Evolucionar el plugin de Illustrator Tesseract (panel CEP + three.js) hacia una arquitectura modular, con geometría más fiel, plegado 3D, materiales/cantos PBR, acabados especiales, visor fluido, exportación e integración con Photoshop y Dimension, **conservando la funcionalidad actual y priorizando estabilidad, rendimiento y compatibilidad**.

## 2. Alcance

**Dentro (aprobado V3):** interpretación geométrica avanzada · plegado 3D · materiales y cantos PBR optimizados · acabados especiales (UVI, emboss/deboss, foil, mate/brillo) · visor 3D fluido · exportación GLB y OBJ · captura PNG básica · abrir en **Photoshop mediante PNG** · abrir en **Adobe Dimension mediante GLB** · rediseño UX/UI del panel.

**Fuera:** editor 2D de Tesseract Web · render fotográfico / path tracing · IA generativa · reemplazar Illustrator como editor vectorial.

**Restricciones permanentes:** Illustrator es el único editor vectorial · se conserva CEP/Chromium y el renderer three.js · la extensión instalada no se modifica · el trabajo ocurre solo sobre la copia aislada de V3 · sin atribución de IA en commits (autor único) · sin push ni publicación sin autorización · no se instala nada en la carpeta CEP del usuario sin autorización explícita (a 2026-10-23: **no autorizado**).

## 3. Las ocho fases (0–7)

| Fase | Contenido | Entra en alcance V3 | Depende de | Estado |
|---|---|---|---|---|
| **0** | Auditoría y preparación (informe, matriz de reutilización, mapa de dependencias, arquitectura, riesgos, baseline) | — | — | **Completada y aprobada** (2026-10-23) |
| **1** | Base técnica: aislamiento, **corrección de la fuga GPU**, pruebas de caracterización, build IIFE, `GeometryEngine`, modularización sin cambios visibles, validación de paridad | Estabilidad / rendimiento | 0 | **En curso:** A0 ✔, A1 ✔ (checkpoint 1 pendiente de revisión) |
| **2** | Motor geométrico. **2A:** normalización geométrica de creases + clasificación estricta, con validación formal (V1–V8). **2B:** motor candidato de Tesseract Web detrás de interruptor, con criterios de promoción | Interpretación geométrica avanzada | 1, corpus de troqueles | Pendiente |
| **3** | Visor 3D fluido (render bajo demanda), materiales y cantos PBR, entorno; **spike de compatibilidad PBR** previo | Materiales y cantos PBR; visor fluido | 1 (fuga = 0 en CEP real), spike | Pendiente |
| **4** | Acabados especiales: UVI, emboss/deboss, foil, mate/brillo (capas con sufijos → máscaras); ExtendScript a `.jsx` | Acabados especiales | 3 | Pendiente |
| **5** | Exportadores: GLB (unidades, **12 errores del validador**, extensiones solo si Dimension las lee), OBJ, captura PNG | Exportación GLB y OBJ; PNG básico | 3–4; calibración de unidades en Dimension | Pendiente |
| **6** | Integraciones: **PNG → Photoshop**, **GLB → Dimension** | Abrir en Photoshop / Dimension | 5 (GLB válido y escala calibrada) | Pendiente |
| **7** | Rediseño UX/UI del panel (layout, visor grande, reestructura del DOM) | Rediseño UX/UI | 1 (capa `ui`) | Pendiente |

**Compuertas entre fases** (no se pasa a la siguiente sin cumplirlas y sin la aprobación de Tato):
- **1→2:** G1 (panel mínimo carga en CEP; requiere autorización de instalación), G2 (paridad de `core/legacy` con los golden masters), G3 (validación de paridad en Illustrator).
- **2A→2B:** puertas V1–V8 de normalización cumplidas sobre el corpus aprobado.
- **2B→promoción del motor candidato:** los 7 criterios de promoción (§5).
- **1→3:** fuga GPU = 0 **medida en el panel real de Illustrator** y spike de compatibilidad PBR concluido.
- **5→6:** GLB sin errores del validador + unidades calibradas en Dimension.

## 4. Decisiones confirmadas (2026-10-23)

| # | Decisión | Elegida | Resumen |
|---|---|---|---|
| D1 | Repo y aislamiento | **A** | Repo único en `Tesseract v3/`; `reference/legacy-baseline/` congelado con SHA-256; copia de trabajo `panel/`; ID propio `com.tato.tesseract.v3.panel`; instalación solo a nivel de usuario y solo con autorización |
| D2 | Fuga GPU | **A→B** | Parche mínimo primero en la copia aislada; luego `ResourceTracker` en la escena modular |
| D3 | Motor web | **B** | Interfaz `GeometryEngine`; el motor vigente sigue como referencia; el motor web es candidato experimental |
| D4 | Pliegues que no alcanzan/sobresalen | **A** | Normalizador + clasificación estricta, reservado a la sub-fase 2A, con validación formal |
| D5 | Plataformas | **A** | macOS hasta la Fase 3; decidir Windows y mínimos de GPU con datos |
| D6 | Unidades GLB | **A** | Investigar con el kit de calibración en Dimension; no tocar la escala hasta completarla |
| D7 | three.js | **C** | r132 hasta el spike de compatibilidad PBR |
| D8 | Plan maestro | **C** | Este documento |

**Condiciones adicionales de Tato (2026-10-23):**
1. Empezar por la fuga GPU y demostrar ausencia de crecimiento tras ciclos repetidos de plegado.
2. Conservar el comportamiento funcional actual como referencia.
3. Implementar `GeometryEngine` sin sustituir todavía el motor vigente.
4. Motor web = candidato experimental sujeto a criterios de promoción.
5. Normalización geométrica y clasificación estricta reservadas a la sub-fase 2A.
6. No modificar las unidades del GLB hasta completar la calibración en Dimension.
7. Mantener three.js r132 hasta el spike de compatibilidad PBR.
8. Este documento como rector, con las ocho fases y las integraciones con Photoshop y Dimension.
9. Registrar los 12 errores del validador GLB como defecto pendiente, a corregir antes de habilitar la integración con Dimension (ver `docs/KNOWN_ISSUES.md`, KI-02).
Más: no se instala la copia V3 en la carpeta CEP del usuario todavía; los 3 GLB de calibración y el corpus de troqueles los entrega Tato por separado.

## 5. Criterios de promoción del motor candidato (D3)

Todos, y con visto bueno de Tato: (1) corpus aprobado (≥10 troqueles reales, incl. la exportación real de Illustrator) sin paneles perdidos respecto al conteo esperado verificado por una persona; (2) conservación de área estricta; (3) mismas adyacencias y árbol donde el motor vigente acierta; (4) diagnósticos legibles en la UI para todo error; (5) tiempo ≤ motor vigente en todos los casos; (6) validación visual de Tato en Illustrator; (7) plan de retirada del motor vigente (fecha o condición). Mientras tanto el motor vigente es la **referencia funcional**: toda diferencia se clasifica como *defecto conocido* (registro en `KNOWN_ISSUES.md`) o *regresión*.

## 6. Política de entregas y puntos de control

- Se trabaja por **entregas verificables**. Cada entrega presenta: cambios realizados (resumen y diff), pruebas ejecutadas y resultados, regresiones comprobadas (incluida una prueba de sensibilidad del propio test), riesgos nuevos y cómo reproducir.
- **No se avanza a una intervención de alto riesgo sin presentar esos resultados y recibir autorización.** Se consideran de alto riesgo: extracción de geometría (`core/legacy`), extracción de escena, cualquier cambio en exportadores o en la escala del GLB, instalación en CEP del usuario, cambio de motor por defecto, actualización de three.js, y cualquier cambio de comportamiento visible.
- Antes de cada entrega: `tools/verify-isolation.sh` en verde (baseline intacto, extensión instalada idéntica al baseline, V3 no instalado).
- Los cambios de comportamiento van en commits propios y descritos como tales.

## 7. Calidad y evidencia

Etiquetas de evidencia: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**. Lo no probado en Illustrator real se declara así. Los resultados de rendimiento en navegador son piso optimista (Chromium 152 / M1 Max), no CEP.

## 8. Mapa de documentos

| Documento | Para qué |
|---|---|
| `docs/fase0/00–09` | Auditoría, arquitectura, riesgos, baseline, decisiones y estimación |
| `docs/KNOWN_ISSUES.md` | Registro de defectos conocidos (referencia funcional) |
| `docs/fase1/` | Informes de entrega y puntos de control de la Fase 1 |
| `reference/` | Baseline congelado y manifiesto de huellas |
| `tools/` | Verificación de aislamiento y mediciones reproducibles |

## 9. Registro de cambios del plan

| Fecha | Cambio | Aprobado por |
|---|---|---|
| 2026-10-23 | Versión 1.0: consolidación de alcance, fases 0–7, decisiones D1–D8 y condiciones | Tato (confirmación D1–D8 y condiciones 1–9) |
