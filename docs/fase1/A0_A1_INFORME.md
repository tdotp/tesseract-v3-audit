# Fase 1 · Punto de control 1 — A0 (aislamiento) y A1 (fuga GPU)

Fecha: 2026-10-23 · Commits locales (autor único, sin trailers, sin remoto): `296db0f` A0 · `76a85ab` herramienta de ciclos · `6b76385` A1.
Estado: **entrega para revisión. No se ha avanzado a la refactorización estructural** (A2 en adelante).

## 1. Qué se entrega

### A0 — Aislamiento
| Elemento | Detalle |
|---|---|
| `reference/legacy-baseline/` | Copia exacta del plugin instalado (15 archivos, incl. `main.js.bak`), **solo lectura**, manifiesto `reference/legacy-baseline.SHA256SUMS`. Idéntica a `tesseract-instalado-copia` y a la extensión instalada |
| `panel/` | Copia de trabajo aislada = baseline **sin `main.js.bak`** (código muerto); el único otro cambio es el parche A1 |
| `tools/verify-isolation.sh` | Comprueba: baseline vs manifiesto, extensión instalada vs baseline, diferencias de `panel/`, y que V3 **no** esté instalado en el CEP del usuario. Probado con control negativo (copia manipulada → falla con código 1) |
| `LICENSE`, `third_party/PROVENANCE.md`, `.gitignore` | Propietario; procedencia de cada elemento |
| Git local | Rama `main`, 3 commits, un único autor (`Gerardo Calambas posada`, la misma identidad autodetectada del repo web), sin `remote`, sin `Co-Authored-By` |
| `docs/PLAN_MAESTRO_V3.md`, `docs/KNOWN_ISSUES.md` | Plan rector (8 fases, D1–D8, condiciones 1–9, política de entregas) y registro de defectos (KI-02 = los 12 errores del validador GLB, pendiente antes de habilitar Dimension) |

**Estado de la regla de aislamiento ahora:** `verify-isolation.sh` en verde; la extensión instalada no cambió; V3 no está instalado en `~/Library/Application Support/Adobe/CEP/extensions/` (no autorizado).

### A1 — Corrección de la fuga de recursos GPU (único cambio de comportamiento)
Causa localizada y corregida en `panel/main.js` (49 líneas cambiadas; **3 funciones modificadas, 3 añadidas, 96 idénticas** al baseline, comprobado con `tools/baseline/regression/functions_diff.mjs`):

| Función | Cambio |
|---|---|
| `makePanelLabelSprite` (+`getLabelResources`, `disposeLabelCache`) | Textura y material de cada etiqueta (P0, P1…) en caché por (texto, base); se liberan al reconstruir. Antes: 11 texturas nuevas por evento de slider |
| `rebuildCreaseVisuals` (+`disposeCreaseVisuals`) | Libera líneas visibles y cajas de selección anteriores. Antes: ~20 geometrías por evento, nunca liberadas |
| `clearAllMeshes` | Libera el subárbol de cada panel (aristas `EdgesGeometry`, overlays de arte) y las cachés. Antes solo geometría/material del panel |

No se tocó ninguna función de geometría, topología, plegado, arte ni exportación. Las texturas de arte compartidas siguen liberándose solo por `disposeCurrentArtTextures()`.

## 2. Resultados de las pruebas

Método: arnés de navegador (shim CEP + fixture `caja-botanica-real.json`: 11 paneles, 10 pliegues), sondas externas sobre el contexto WebGL (recursos vivos = creados − borrados). Cada **ciclo** = slider de crease 0→90→0, slider ALL 0→90→0, Reset Flat, cambio de base ida y vuelta, espesor 0.25→0.5→0.25, material white→kraft→white, Back + Continue to 3D (reconstrucción completa) y, con arte, Refresh Artwork. Detalle: `tools/baseline/results/A1_leak_cycles.json`.

### 2.1 Crecimiento acumulativo (condición 1)
| Ejecución | Texturas / ciclo | Buffers / ciclo | VAOs / ciclo | Programas | Veredicto |
|---|---|---|---|---|---|
| **Baseline**, sin arte, 6 ciclos | **+102** (+1052 el 1.º) | **+5155** | **+2095** | 0 | **CRECE** (acumulado ciclo 6: 1562 / 30 930 / 12 570) |
| **Baseline**, con arte, 6 ciclos | +102 (+1052 el 1.º) | +5595 | +2315 | 0 | **CRECE** |
| **Con parche**, sin arte, 6 ciclos | 0 | 0 | 0 | 0 | **Sin crecimiento** |
| **Con parche**, con arte + refresh, 8 ciclos | 0 | 0 | 0 | 0 | **Sin crecimiento** |
| **Con parche**, sin arte, **25 ciclos** (2 350 eventos de slider + 25 reconstrucciones) | 0 | 0 | 0 | 0 | **Sin crecimiento** |

Notas: el −10 en texturas del ciclo 1 es esperado (al inicio se muestran 11 etiquetas hasta que el usuario elige base; luego solo 1: las 10 sobrantes se liberan). El heap de JS oscila (≈10–30 MB) sin tendencia creciente en los 25 ciclos (recolección de basura).

### 2.2 Regresiones (condición 2: comportamiento actual como referencia)
| Comprobación | Resultado |
|---|---|
| Píxeles del canvas 3D, 4 poses (plano; ALL=90°; otra base; con arte 2×PNG de 4096 px) | **0 píxeles distintos** en las 4 |
| Sensibilidad del propio test (control negativo: mover 5° un pliegue solo en la copia) | 11 001 píxeles distintos → el test **sí detecta** diferencias |
| Estructura de la escena (mallas, líneas, sprites, grupos, triángulos, llamadas de dibujo) | Idéntica en las 4 poses; 11 paneles y 10 pliegues en ambas |
| GLB exportado, sin arte (30 592 B) y con arte (18 187 072 B) | **Idénticos byte a byte** (SHA-256 coincide) |
| Funciones de `main.js` | 96 idénticas · 3 modificadas · 3 añadidas · 0 eliminadas |
| Geometría/paneles/adyacencias | Sin cambios por construcción (ninguna de esas funciones se modificó) |
| Aislamiento | `verify-isolation.sh` verde; extensión instalada intacta |

## 3. Límites y riesgos residuales (declarados)
1. **Medido en navegador, no en Illustrator.** Chromium 152 / M1 Max, no el Chromium 99 de CEP. Los **conteos de recursos** son válidos; los tiempos no. La confirmación en el panel real es la **puerta para la Fase 3** y requiere instalar una copia (no autorizado todavía; ver §5).
2. El canvas de comparación es de 424×276 px (el tamaño del panel en el arnés): suficiente para detectar cambios de geometría/orden de dibujo, no valida diferencias sub-píxel en pantallas de más resolución.
3. Un solo troquel (11 paneles). El parche es independiente de la geometría, pero el corpus real (D4) ampliará la cobertura.
4. Se miden recursos **WebGL**; la memoria de GPU en bytes no es observable desde el navegador (estimación previa: ≈1 MB por tick evitado).
5. Riesgo de diseño del parche: las etiquetas comparten material/textura por (texto, base). Si en el futuro se reutilizan sprites fuera de `clearAllMeshes`, hay que respetar el ciclo de vida de la caché (cubierto hoy por la prueba de 25 ciclos y la de reconstrucción).
6. La extracción real (ExtendScript), el guardado con diálogo de Illustrator y el arte exportado por Illustrator **no se ejercitaron** (el arnés los simula).

## 4. Cómo reproducirlo
```bash
cd "Tesseract v3"
tools/verify-isolation.sh                                   # aislamiento
node tools/baseline/regression/functions_diff.mjs           # qué funciones cambiaron
# arnés (copias editables en una carpeta temporal) y servidor estático local:
python3 tools/baseline/setup_harness.py reference/legacy-baseline <fixture.json> /tmp/h/base
python3 tools/baseline/setup_harness.py panel                    <fixture.json> /tmp/h/fix
cp tools/baseline/regression/* tools/baseline/harness_art.js /tmp/h/ && (cd /tmp/h && python3 -m http.server 8779)
# en el navegador: /base/ y /fix/ → await tesseractLeakCycles({cycles: 25})   |   /compare.html → await tesseractCompareFrames()
```
`<fixture.json>` = `caja-botanica-real.json` de `tesseract-web/packages/core/src/__tests__/fixtures/`.

## 5. Siguiente intervención y lo que necesito
Propuesta (sin iniciar): **A2 — banco de caracterización** (riesgo bajo: solo pruebas, no cambia código del panel): fixtures, golden masters del motor vigente (baseline y parche como oráculos), defectos documentados como comportamiento esperado.
Después vendría **A3 (build IIFE + instalación paralela)**. Su componente de *instalación* **sigue sin autorización**: puedo construir y probar el bundle en navegador, pero la puerta G1 (carga en Illustrator real, medición base y confirmación de la fuga en CEP) **no puede cerrarse sin instalar** una copia. Necesito que decidas cuándo (y si) lo autorizas; entretanto A2–A3 avanzan solo con navegador.

**Pido:** (1) tu visto bueno a este punto de control; (2) autorización para iniciar A2; (3) criterio sobre la instalación para G1.
