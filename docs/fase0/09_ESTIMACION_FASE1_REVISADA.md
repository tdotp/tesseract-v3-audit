# 09 — Desglose revisado de la estimación (13–22 días → qué es realmente Fase 1)

Fecha: 2026-10-23 · Sustituye el cuadro de esfuerzo del doc 06 §2 **si apruebas las decisiones del doc 08** (las tareas y criterios de aceptación detallados del doc 06 siguen siendo la referencia, salvo lo indicado aquí).
Unidad: **días de trabajo asistido** (jornada con Claude escribiendo/ejecutando y tú validando). **Estimaciones mías, ±40 %**, sin histórico previo de este equipo; los rangos se suman tal cual (el total esperado ≈ el punto medio). Lo más incierto: tus validaciones en Illustrator (esperas, reinicios de CEP) y el corpus de troqueles.

## 1. Resultado en una línea

| Concepto | Antes (doc 06) | Ahora |
|---|---|---|
| **Fase 1 — tareas de código necesarias para cerrarla (Pista A)** | 13–22 (incluía spike y todo) | **11–19** (≈ 15 esperado) |
| Pista B — habilitadores de decisiones (en paralelo; no son criterio de salida de la Fase 1, pero deben estar listos antes de la Fase 2/3/5) | dentro de las 13–22 | **1.5–3** |
| Diferido a fases posteriores (salió de la Fase 1) | — | ≈ **2–3** (host→.jsx 0.5–1, reestructurar UI 1–1.5, módulo completo de exportación 0.5) |
| Nuevo y **posterior** (consecuencia de tus prioridades) | — | Sub-fase 2A normalizador validado ≈ 4–7 (+1 tuyo); 2B motor candidato A/B ≈ 5–8 (baja confianza) |

Por qué la Pista A baja aunque se añaden tareas: se añade el parche de fuga (0.5–1) y la interfaz de motor (0.25), pero se difiere la reestructuración de UI (se rehará en el rediseño de la Fase 7, hacerla dos veces es desperdicio), la conversión de ExtendScript a `.jsx` (no bloquea nada hasta la Fase 4) y el módulo completo de exportación (hasta la Fase 5).

## 2. Pista A — necesarias para cerrar la Fase 1

Orden = orden de ejecución. "Antes" = tarea equivalente del doc 06.

| ID | Tarea | Resp. | Días | Antes | Por qué es necesaria | Cambio frente a doc 06 |
|---|---|---|---|---|---|---|
| A0 | Aislamiento: repo, baseline congelado con SHA-256, guardas de huella, README/licencia/procedencia (D1) | Claude | 0.5–1 | F1-01 | Prioridad 6: sin esto no hay copia aislada verificable | Se añade manifiesto de huellas y baseline de solo lectura |
| **A1** | **Parche de fuga GPU en copia aislada + sonda automática** (D2) | Claude | 0.5–1 | F1-10 (mitad) | **Prioridad 1**; precondición de PBR | **Pasa a ser la primera tarea de código** |
| A2 | Banco de caracterización: legacy intacto y legacy+parche como oráculos; defectos documentados como "comportamiento esperado actual" | Claude | 1–1.5 | F1-02 | Sin pruebas no se puede mover código ni comparar motores | Dos oráculos (baseline y parche) |
| A3 | Build IIFE + instalación paralela con guardas (ID y menú propios) | Claude | 1–1.5 | F1-03 | Necesario para cargar V3 en Illustrator sin tocar lo instalado | Incluye verificación de huellas antes/después |
| A4 | Panel mínimo en CEP + **medición base real** (Tato) — **Puerta G1** | Tato + Claude | 0.5–1 | F1-04 | Confirma que el bundle carga y fija el piso de rendimiento en Illustrator; mide la sonda con el parche | Se añade medir la fuga en CEP real |
| A5 | `bridge` (evalScript→Promise, fs); **ExtendScript se queda como cadenas** (generadas desde un módulo) | Claude | 0.5–1 | F1-05 | Los módulos necesitan un puente único | **Sin mover a `.jsx`** (diferido) |
| A6 | `core/legacy` extraído sin cambios + **interfaz `GeometryEngine`** (D3) — **Puerta G2** | Claude | 1.75–2.75 | F1-06 | Sin extraer la geometría no hay motores intercambiables ni pruebas de normalización | +0.25 por la interfaz |
| A7 | `state` + `scene` + `ResourceTracker` (estructura de la corrección de A1) | Claude | 2.5–3.5 | F1-07 + F1-10 | Base de PBR/acabados; la fuga queda prohibida por diseño | Absorbe el resto de F1-10 (+0.5) |
| A8 | `export` envuelto como módulo **sin cambios** (GLB en mm, mismos bytes lógicos) | Claude | 0.5–1 | F1-08 | Aislar el escritor GLB del estado; la escala no se toca (D6) | Reducido: solo envoltorio + pruebas estructurales |
| A9 | `ui` mínima sobre el store (los paneles DOM siguen como están) | Claude | 0.5–1 | F1-09 | El store debe gobernar la UI; no se reestructura el DOM | Reducido: la reestructuración va a Fase 7 |
| A10 | Puertas de calidad: tipado, límites de importación, licencias, tamaño de bundle, huellas | Claude | 0.5–1 | F1-11 | Hace cumplir las reglas del doc 03 | Añade verificación de huellas |
| A11 | Validación de paridad en Illustrator — **Puerta G3** | Tato + Claude | 1–2 | F1-12 | Cierre contra el comportamiento real | Lista de comprobación incluye: fuga = 0 en CEP real |
| A12 | ADRs y cierre de Fase 1 (known issues, qué entra en 2A) | Claude | 0.5 | F1-13 | Trazabilidad | — |
| | **Total Pista A** | | **11.25–18.75** | | | |

## 3. Pista B — habilitadores (en paralelo; no cierran la Fase 1)

| ID | Tarea | Resp. | Días | Habilita | Necesario antes de |
|---|---|---|---|---|---|
| B1 | Spike WebGL2/PBR en CEP: r132 **y** versión reciente, 1/3/6 mapas, entorno (F1-14) | Claude + Tato | 0.5–1 | D5 (mínimos), D7 (versión de three), plan de Fase 3 | Fase 3 |
| B2 | Investigación de unidades del GLB: protocolo del kit en Dimension (tu parte ≈15 min) + registro del resultado (D6) | Tato + Claude | 0.25–0.5 | Decisión de escala y normales en Fase 5; apertura en Dimension (Fase 6) | Fase 5 |
| B3 | Corpus de troqueles (8–10) + especificación V1–V8 de la normalización (D4) | Tato + Claude | 0.5–1 | Sub-fase 2A | Fase 2A |
| B4 | `PLAN_MAESTRO_V3.md` consolidado para tu firma (D8) | Claude | 0.25–0.5 | Control de alcance | Inicio de Fase 1 (recomendado) |
| | **Total Pista B** | | **1.5–3** | | |

B4 conviene **antes** de A0; B1–B3 corren mientras avanzan A1–A7.

## 4. Lo que salió de la Fase 1 y adónde va

| Tarea del doc 06 | Qué se difiere | Días (aprox.) | Nueva fase | Motivo |
|---|---|---|---|---|
| F1-05 | Mover ExtendScript a archivos `.jsx` + `<ScriptPath>` | 0.5–1 | **Fase 4** (acabados necesitan extraer capas nuevas desde ExtendScript) | Sin beneficio antes; riesgo R4 innecesario |
| F1-09 | Reestructurar el DOM del panel (vistas, CSS en línea, ids) | 1–1.5 | **Fase 7** (rediseño UX/UI) | Se rehace de todos modos; hacerlo dos veces es desperdicio |
| F1-08 | Módulo de exportación completo (parámetros de escala, normales, PBR, OBJ, PNG nuevo) | 0.5 (+Fase 5) | **Fase 5** | Depende de D6 y del material PBR |
| (no estaba en la Fase 1 original) | Rediseño "crear una vez + `setPose`" y render bajo demanda | 1.5–3 | **Fase 3** | Ligado a PBR; solo si las mediciones lo justifican |
| — | Windows (rutas, diálogo, instalación) | 2–4 | **Antes de Fase 3 si D5 lo exige** | Hoy no hay evidencia ni equipo |

## 5. Trabajo nuevo y posterior que nace de tus prioridades (para planificar, no para Fase 1)

| Sub-fase | Contenido | Días | Confianza | Depende de |
|---|---|---|---|---|
| **2A** | Normalizador de creases independiente del motor + clasificación estricta, con las puertas V1–V8 y corpus; informe de ajustes en la UI | 4–7 (+1 revisión tuya) | **Baja** (el prototipo ingenuo falló; depende del corpus) | G2, B3 |
| **2B** | Motor candidato `core` detrás de interruptor, diagnósticos legibles, A/B contra legacy con los 7 criterios de promoción | 5–8 | Baja–media | 2A |
| 3 | PBR, cantos, visor fluido (se estima al abrir la fase con datos de B1) | — | — | A1 (puerta de fuga), B1 |
| 5 | GLB (escala/normales/extensiones), OBJ, PNG | — | — | B2 |

## 6. Camino crítico y calendario orientativo

- Camino crítico de la Pista A: **B4 → A0 → A1 → A2 → A3 → A4 (G1) → A5 → A6 (G2) → A7 → A9 → A11 (G3) → A12** ≈ 10.5–17 días (suma de rangos). A8 y A10 corren en paralelo con A7/A9; B1–B3 en paralelo con A1–A7.
- Mi expectativa realista: **~15 días de trabajo asistido** para la Pista A; el calendario real depende de cuándo hagas A4, B2 y A11.
- **Riesgos de calendario:** (1) R1 — si el bundle no carga en CEP en G1, se inserta 1–2 días (plan B de carga clásica); (2) corpus de troqueles tarde → retrasa 2A, no la Fase 1; (3) tus ventanas de validación.

## 7. Qué cambia si decides distinto

| Si eliges… | Efecto en el esfuerzo |
|---|---|
| D2-B (arreglar la fuga solo en la escena modular) | −0.5 en A1, pero la fuga vive toda la Fase 1 y la sonda no sirve como prueba de paridad hasta A7 |
| D2-C (rediseño `setPose` ya) | +1.5–3 en Fase 1 y más riesgo visual |
| D3-A (integrar `core` ya) | −0.25 en A6 pero **contradice tus prioridades 2 y 3**; añade 2–3 días de A/B improvisado |
| D4-C (asistente de reparación) | 2A pasa a ≈ 3–5 días de UI, sin validación automática equivalente |
| D5-B (Windows ya) | +2–4 en Pista A |
| D6-B (metros ya) | −0.25 hoy, pero riesgo de GLB incorrectos en Dimension y +1–2 de retrabajo si se equivoca |
| D7-B (subir three ya) | +1–2 y contamina las pruebas de paridad (A7, A11) |
