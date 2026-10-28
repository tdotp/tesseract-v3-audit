# F2A-0 — Oráculos, fixtures y pruebas geométricas · Informe

Fecha: 2026-10-27 · Base: `7f7049b` (F2.0, descendiente de `1cc1065`) · Autorización: DP-10 (solo pruebas, fixtures, oráculos y documentación). **Sin cambios en `src/`, `panel/`, motor legacy, `GeometryEngine`, escena, plegado, artwork, exportaciones, tolerancias, dependencias, goldens ni huellas históricas.** F2A-1 **no** iniciada.

## 1. Decisiones aplicadas

DP-1 detalles de 0,5 mm conservados (provisional) · DP-2 13 paneles como **candidato**, validado por contornos, área, adyacencias y asignación de creases · DP-3 ε = 0,05 solo en pruebas (`EPS_EXP`), nunca en producto · DP-4 predicados exactos evaluados (`F2A0_07` §3), sin dependencias · DP-5 motor web no incorporado; diferencias explicadas (`F2A0_06`) · DP-6/DP-8 aplazadas · DP-7 diseñado, no implementado (`F2A0_07` §6) · DP-9 KI-31…KI-34 registrados con evidencia reproducible; correcciones documentales con el texto anterior conservado · DP-10 ejecutado.

## 2. Entregables

| Entregable | Dónde |
|---|---|
| Oráculo documentado e independiente | `tests/lib/f2/{racional,oraculo}.mjs` · `F2A0_01_ORACULO.md` |
| Fixtures reproducibles | `tests/lib/f2/fixtures-f2.mjs` (22 sintéticos analíticos) + fixtures reales sin cambios |
| Pruebas independientes del legacy | `tests/node/f2-oraculo`, `f2-caja-botanica`, `f2-metamorficas` (79) |
| Pruebas históricas separadas | `tests/node/f2-legacy-historico` (16, prefijo HISTÓRICO) |
| Resultados metamórficos | `F2A0_02` §4 |
| Matriz de correspondencia de paneles y creases | `evidencia/f2a0-matriz-correspondencia.md` |
| Clasificación topología / geometría / representación / discretización | `F2A0_03_CLASIFICACION.md` · `tests/lib/f2/comparar.mjs` |
| Registro de ambigüedades | `F2A0_04_AMBIGUEDADES.md` (A-1…A-12) |
| Cobertura y límites de los oráculos | `F2A0_05_COBERTURA_Y_LIMITES.md` |
| Diferencias del motor web (DP-5) | `F2A0_06_MOTOR_WEB.md` |
| Propuesta técnica de F2A-1 (+ DP-4, DP-7) | `F2A0_07_PROPUESTA_F2A1.md` |
| KI-31…KI-34 y correcciones C-1, C-2, C-3, C-4, C-8 | `docs/KNOWN_ISSUES.md`, `docs/fase0/08…` (D4), `docs/fase1/NIVEL0_INFORME.md` §3.2, `tests/fixtures/PROVENANCE.md` |

## 3. Resultados principales [MEDIDO]

1. **13 paneles candidatos con correspondencia individual.** La extracción original del plugin, **sin ningún ajuste ni tolerancia**, da 13 paneles en un arreglo exacto: área conservada **exactamente** (27 449,924319 mm²), 12 adyacencias, cada una de las 12 creases separa exactamente la pareja esperada, una componente. La extracción de Illustrator real (con ε experimental 0,05: 19 ajustes de ≤ 0,005 mm) y el histórico ×0,75 dan **la misma topología**; las áreas difieren ≤ 0,23 mm² (representación).
2. **Metamórficas:** con transformaciones exactas (escala en dominio, traslación hasta 1e7, rotaciones 90°/180°/53,13°, reflexión) y con todas las permutaciones de entrada, el resultado es **idéntico** y A' = s²·A exacta. En double, la topología es idéntica y ΔA ≤ 1e-6 mm²; sin ajuste, una rotación de 37° rompe incidencias a 1e-14 mm (representación, recuperada con ε ≥ 1e-6). Fuera de dominio el oráculo **avisa**.
3. **Legacy frente al oráculo (HISTÓRICO):** a ×1 pierde paneles **distintos** según la extracción (`C10`+`C7` en la original; `C0` fusionado + `C7` en la de Illustrator); a ×0,75 acierta el conteo con bordes desplazados hasta 60 mm² normalizados. Se reproducen además KI-04, 05, 06, 18, 19 sobre sintéticos y los nuevos KI-31 (sentido del contorno), KI-32 (coordenadas 1e7) y KI-33 (hueco soldado a 5 mm).
4. **Motor web (DP-5):** acierta con la extracción original porque no tiene nada que ajustar; con la de Illustrator real su ajuste (vértice a vértice, en double) abre la unión C7–C9 1,5e-5 mm y deja tres extremos a ~1e-14 mm del corte; el oráculo, que agrupa uniones y proyecta en exacto, da 13.
5. **Predicados (DP-4):** en troqueles reales el 60–73 % de las orientaciones son exactamente 0; recomendación para F2A-1: `orient2d` adaptativo con expansiones de punto flotante (sin BigInt ni dependencias).
6. **Casos indeterminados** registrados (A-1…A-12); destaca A-6: con una crease paralela al corte a 0,004 mm, la tolerancia del legacy probablemente acierta la intención y el oráculo exacto la marca como astilla.

## 4. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| Preflight (HEAD `7f7049b`, árbol limpio, CEP de usuario solo `TesserArt_Validator`) | OK |
| `node --test 'tests/node/*.test.mjs'` | **663: 662 pass + 1 omitida** (568 previas sin cambios + 95 nuevas) |
| `tests/run-all.sh` (sin `--mutations`/`--soak`: no cambia código de producto ni pruebas de F1) | **TODO EN VERDE** (`EXIT=0`): aislamiento OK, build verificado, Node 662 + 1 omitida, navegador 52 · a7 13 · a8 31 · a9 32 · Chromium-99 4 · puente 6 · a5-observar 3 · A4-CDP 7 (`evidencia/run-all-F2A-0.txt`) |
| `node --test tests/node/f2-*.test.mjs` | 95/95 |

## 5. Aislamiento

Archivos nuevos solo en `tests/lib/f2/`, `tests/node/f2-*`, `tests/golden/f2-caja-botanica.golden.json`, `tests/tools/make-f2-golden.mjs`, `tools/f2/` y `docs/`; ediciones documentales en `KNOWN_ISSUES.md`, `fase0/08`, `NIVEL0_INFORME.md`, `PROVENANCE.md` y `HANDOFF.md`. `git diff 7f7049b -- src panel reference tests/golden/*.SHA256SUMS tests/golden/*.pins.json tests/fixtures/real tests/fixtures/illustrator-real` vacío. Nada instalado en CEP; sin push; `tesseract-web` solo leído.

## 6. Contradicciones registradas y no resueltas

C-5 (comentario de `src/core/engine.js`: no se puede editar `src/`), C-6 (tabla de fases del Plan maestro: requiere aprobación del plan), C-7 (comentario del repositorio web: no se modifica), C-8 (la prueba histórica `known-issues` llama «correcto ≈ 7114.16» al área de las esquinas; la Bézier del fixture mide ≈ 7102,26; no se modifica la prueba de F1).

## 7. Decisiones que necesito antes de modificar código

D-F2A1-1…5 (`F2A0_07` §7): ubicación del candidato (`experimental/geometria/` fuera de `src/`), predicados adaptativos propios, identidad simbólica de vértices, objetivo de rendimiento ≤ legacy y mecanismo experimental A + B para F2A-5. **Parada:** F2A-0 termina aquí.
