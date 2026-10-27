# F2.0 — Diagnóstico geométrico, contrato matemático y preparación de F2A · Informe

Fecha: 2026-10-27 · Base: `1cc1065` (cierre de F1) · Modalidad: investigación y especificación. **Sin cambios en código de producción, goldens, huellas, fixtures ni CEP.** F2A **no** iniciada.

## 1. Documentos

| # | Documento | Contenido |
|---|---|---|
| 01 | `01_DIAGNOSTICO_KI22.md` | Reproducción, primera divergencia, mecanismo (D1–D6), hechos/hipótesis/conclusiones, correcciones a documentos previos |
| 02 | `02_MAPA_PIPELINE.md` | Illustrator → extracción → … → escena: módulos, unidades, coordenadas, tolerancias, descartes, instrumentación |
| 03 | `03_TOLERANCIAS_Y_POLITICA.md` | Inventario de 20 tolerancias del motor + 4 de extracción; análisis absoluto/relativo/canónico/robusto/cuantizado; política P-1…P-6 |
| 04 | `04_CONTRATO_MATEMATICO.md` | Invariantes estrictos M1–M11 y con dominio S1–S4; contrato v2 aditivo; identificadores estables; numérico frente a topológico |
| 05 | `05_FIXTURES_Y_ORACULOS.md` | Matriz de fixtures, oráculos O-A…O-H y diseño de 8 familias de pruebas |
| 06 | `06_EVALUACION_MOTOR_WEB.md` | Motor de `tesseract-web` medido frente al legacy; alternativas A–E |
| 07 | `07_PLAN_F2A.md` | Unidades F2A-0…F2A-6 con hipótesis, archivos, pruebas, riesgos, rollback y regla de huellas |
| 08 | `08_INCERTIDUMBRES_RIESGOS_DECISIONES.md` | U-1…U-7, R-1…R-9, contradicciones C-1…C-7, KI propuestos, decisiones DP-1…DP-10 |
| — | `evidencia/` (+ `README.md`) | Salidas de los 5 scripts de `tools/f2/` y de la batería |

## 2. Hallazgo principal de KI-22

**La primera divergencia es la etapa E3 (troceado de segmentos, `pointOnSeg` en `buildTopology`).** El troquel real tiene decenas de características geométricas de **0,497–0,504 mm** (escalones del contorno y creases paralelas escalonadas) y el motor decide con un umbral fijo de **0,5 mm**: entre ×0,75 y ×1,0 cambian 35 decisiones de predicados, y a ×1,0 hay 66 predicados a menos del 2 % de su escala crítica. Las 10 transiciones de un barrido de 601 escalas están explicadas, cada una, por un predicado concreto que cruza 0,5 mm.

Además: (1) ni el 13 de ×0,75 ni el 11 de ×1,0 son correctos — un oráculo independiente (arreglo exacto con conservación de área y creases efectivas) da **13 paneles** y muestra que a ×0,75 el legacy acierta el conteo pero reasigna franjas de 0,5 × 40 mm entre paneles; (2) KI-22 son **dos defectos apilados**: la tolerancia (D1) y la adyacencia estricta + filtro de conectividad (D2, KI-04) — bajar ε solo da 11 paneles invariantes; (3) los extremos de crease **tocan** el corte (0,0000 mm en la extracción original, ≤ 0,005 mm tras el SVG): las «holguras de 0,375 mm» de la Fase 0 eran estos escalones vistos a ×0,75.

## 3. Política de tolerancias propuesta (resumen; detalle en `03` §3)

- **Geométrica, absoluta y física:** `ε_snap` (provisional **0,05 mm**, media geométrica de ruido 0,005 y característica 0,497; ventana medida 0,02–0,1 mm) usada **solo** para proyectar extremos libres de crease sobre el corte o sobre otra crease por distancia lateral; banda ambigua `[ε/3, 3ε]` ⇒ diagnóstico, nunca decisión silenciosa.
- **Numérica, relativa a la magnitud de las coordenadas** (tras origen local): `δ_num = 64·u·M`; decisiones de lado/colinealidad con `orient2d` exacto.
- **El contorno y los huecos no se mueven ni se fusionan nunca**; los filtros de área/delgadez pasan a diagnóstico.
- **No** tolerancia relativa al tamaño de la pieza (las escalas relevantes son físicas) y **no** normalización por escala; **sí** traslación a origen local.
- Valores pendientes de calibración con el corpus; la invariancia ante escala se exige dentro de un dominio declarado (`S1`).

## 4. Riesgos principales de F2A

R-1 calibración con un solo troquel (sin corpus) · R-2 aceptar por conteo y no por oráculos · R-3 colisión de funciones nuevas con las pruebas de texto idéntico/cargador · R-4 paridad del modo por defecto al cablear el interruptor · R-5 excepciones del candidato en la UI. Detalle y mitigaciones en `08` §2.

## 5. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| Preflight: rama `main`, HEAD `1cc1065`, árbol limpio; CEP de usuario solo `TesserArt_Validator`; extensión instalada = baseline | OK |
| `tests/run-all.sh` (sin `--mutations`/`--soak`: F2.0 no cambia código ni pruebas) | **TODO EN VERDE** (`EXIT=0`): aislamiento OK, build verificado, Node **567 + 1 omitida** (= cierre de F1), navegador 52 · a7 13 · a8 31 · a9 32 · Chromium-99 4 · puente 6 · a5-observar 3 · A4-CDP 7 (`evidencia/run-all-F2.0.txt`) |
| Réplica instrumentada = `buildPanels` real | OK en todas las ejecuciones (13 escalas × 3 fixtures + barridos) |
| Control de la sombra parametrizada (ε = 0,5 ≡ motor real, 5 fixtures × 7 escalas) | OK |
| `git status` de `tesseract-web` tras la evaluación | limpio |

## 6. Aislamiento

Solo se añadieron `tools/f2/` (scripts diagnósticos que importan `src/core/legacy/` sin modificarlo) y `docs/fase2/`; `HANDOFF.md` actualizado. Bundles del motor web y salidas temporales en `tests/results/f2/` (ignorado por git). No se modificó `src/`, `panel/`, `reference/`, `tests/` (salvo resultados ignorados), goldens, huellas, fixtures ni el plugin original; nada instalado en CEP; sin push.

## 7. Decisiones para aprobar antes de implementar

DP-1 intención de los escalones de 0,5 mm · DP-2 confirmar 13 paneles · DP-3 política de tolerancias provisional · DP-4 predicados exactos propios · DP-5 copiar el motor web a `src/core/candidate/` · DP-6 base por defecto (área bruta) · DP-7 forma del interruptor (en F2A-5) · DP-8 aviso temprano en el validador del legacy (tarea aparte) · DP-9 registrar KI-31…KI-34 y corregir C-1…C-7 · **DP-10 autorizar F2A-0** (solo oráculos y pruebas). Tabla completa en `08` §5.

**Parada:** F2.0 termina aquí. No se inicia F2A ni se modifica el motor sin autorización expresa.
