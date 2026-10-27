# F2.0 · 05 — Matriz de fixtures y oráculos

**El resultado del legacy no es la verdad geométrica.** Cada fixture se acompaña del oráculo que lo juzga y de su grado de independencia respecto al legacy.

## 1. Fixtures reales y derivados de Illustrator

| Fixture | Procedencia | Escala / unidades | Paneles esperados | Peculiaridades | Legacy (×1 del archivo) | Resultado independiente | KI que reproduce |
|---|---|---|---|---|---|---|---|
| `tests/fixtures/real/caja-botanica-real.dieline.json` | Salida del extractor del plugin sobre el documento original (copiado de `tesseract-web` `c0aeb34`) | ×1, mm, Y negativa (−351…−148) | **13** [3 oráculos; **falta verificación humana**] | 69 vértices de contorno (13 aristas de longitud 0), 10 aristas curvas, escalones de 0,4974–0,501 mm, extremos de crease **exactamente** sobre el corte, sin huecos | 11 paneles, Σ = 26 102,35 (−5,4 % del contorno aplanado) | 13 caras, Σ = 27 593,190 = contorno aplanado (motor web, ε 0,001–0,5, ×0,25–×4) | KI-04, KI-07, KI-22 |
| `tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json` | N0-A: SVG exportado por Illustrator, reabierto en Illustrator 30.8.2 real y extraído con el script del plugin | ×1, mm, Y positiva (148…372) | 13 (mismo troquel) | 56 vértices (2 de longitud 0), 9 curvas, ruido ν ≤ 0,005 mm en extremos de crease, 1 arista curva de 0,0035 mm | 11 paneles, Σ = 26 769,12 | 13 caras con snap+fusión ε ∈ [0,02, 0,1] (|ΔA| ≤ 0,072 mm²); el motor web tal cual **falla** (pierde 1 600 mm²) | KI-04, KI-22 |
| `tests/fixtures/real/caja-botanica-illustrator-export.dieline.json` (histórico A2, congelado) | Derivado del SVG con `make-illustrator-fixture.mjs` interpretando 1 px = 1 px CSS | **×0,75** (error de unidades del generador) | 13 | Igual que la anterior a ×0,75 (escalones de 0,375 mm) | 13 paneles, Σ = 15 425,94 (geometría incorrecta: franjas reasignadas); a ×1,5 de su escala ya da 11 | Oráculo de la anterior escalado; el motor web tal cual falla («1 panel disconnected») a todas las escalas | KI-22 (como caso a ×0,75) |
| `…/caja-botanica-illustrator-export.svg` | Exportación SVG real de Illustrator | px | — | Fuente del anterior | — | — | — |
| `ill-real-caja-simple` | N0-B: SVG sintético extraído por Illustrator real | ×1 | 2 (verificable a mano: 100×60 con crease central y hueco 10×10) | Hueco a 5 mm del borde superior | 2 paneles, Σ = 6 000 (KI-06: sin restar el hueco) | 2 caras, 5 900 netos (web) | KI-06, **KI-22** (a s < 0,648: 3 paneles, 11 350 mm²), D3 |
| `ill-real-compuesto` | N0-F: trazado compuesto | ×1 | 2 | Igual geometría que la caja simple con trazado compuesto | Igual que la caja simple | Igual | KI-06, KI-22 |
| `ill-real-curvas` | N0-G: Bézier | ×1 | 2 | Esquinas curvas | 2 paneles, 7 000 (anclas) | 7 101,77 (aplanado web, 16 muestras) | KI-07 |

Fixtures sintéticos (A2, `tests/lib/fixtures.mjs`): `crease-exacta/corta-0.3/0.6/sobresale-0.3/0.6`, `t-exacta`, `t-desalineada-0.375/0.6/1.0/2.5/5`, `hueco-centrado/descentrado`, `panel-pequeno-4.5mm2/muy-pequeno-1.5mm2/delgado-40x1`, `esquinas-redondeadas`, rejillas 2×2…8×8, `rejilla-lineas-completas-3x3`, `rejilla-4x4-densa-25`. Son **oráculos exactos por construcción** (paneles y áreas conocidos analíticamente). Nota: `t-desalineada-0.375` («caso Illustrator») se basó en la lectura a ×0,75 corregida en `01` §6; sigue siendo un caso válido de T desalineada, no una reproducción del troquel real.

**Ausente:** el corpus de 8–10 troqueles reales prometido por el usuario (D4/2A, Plan §5 criterio 1). Sin él, ν_max, ℓ_min y ε_snap solo están medidos en **un** troquel.

## 2. Oráculos disponibles

| Oráculo | Independiente del legacy | Qué garantiza | Limitación |
|---|---|---|---|
| **O-A Conservación de área** (Σ paneles = área(R), con τ_A) | Sí (cálculo directo sobre la entrada) | No se pierde ni se duplica material | No ve fusiones de paneles (dos paneles unidos conservan área): el motor web con snap 0,001 conserva área con **8** paneles |
| **O-B Creases efectivas** (cada arista de crease entre dos caras distintas) | Sí | Detecta fusiones de paneles y creases colgantes | Requiere el arreglo; una crease mal ajustada que cae sobre otra puede pasar |
| **O-C Euler** | Sí | Coherencia del grafo plano | Necesario, no suficiente |
| **O-D Metamórficas** (escala en dominio, traslación, rotación, reflexión, permutaciones) | Sí | Invariancia | No dice cuál de dos resultados es el correcto |
| **O-E Construcción analítica** (fixtures sintéticos) | Sí | Valor exacto | Solo geometrías simples |
| **O-F Conteo verificado por una persona** | Sí | Intención de diseño | Manual; pendiente para la Caja Botánica |
| **O-G Área exacta de Bézier** (Green sobre cúbicas, forma cerrada) | Sí | Referencia para el aplanado | No implementado |
| **O-H Prueba de `tesseract-web`** (`topology.test.ts`: 13 paneles, 12 creases) | Sí (otro motor, otra lógica) | Segunda opinión | Mismo autor/época; solo sobre `caja-botanica-real` |

**Oráculo de referencia propuesto para KI-22:** O-A ∧ O-B ∧ O-C ∧ O-F (13 paneles verificados por el usuario) sobre los dos fixtures ×1 de la Caja Botánica. Hoy se cumplen O-A, O-B, O-C y O-H con el arreglo exacto; **O-F pendiente** (decisión DP-2).

## 3. Diseño de pruebas (para F2A; ninguna implementada en la batería en F2.0)

| Familia | Casos | Oráculo | Esperado |
|---|---|---|---|
| **1. Metamórficas** | Escala s ∈ {dominio S1} en malla fina (≥ 200 puntos), traslación ±{10³, 10⁵}, rotación {1°, 37°, 90°, 180°}, reflexión, sentido de trazados, orden de entrada, vértice inicial | O-D con firma canónica | Firma idéntica; fuera de dominio ⇒ diagnóstico `out-of-domain` |
| **2. Conectividad y componentes** | Caja Botánica (13), rejillas, panel aislado sin crease (diagnóstico `disconnected`), dos componentes de igual área | O-A, O-B, árbol | Ningún panel desaparece; componentes extra = diagnóstico |
| **3. Intersecciones T** | `t-exacta`, `t-desalineada-{0.01, 0.03, 0.05, 0.1, 0.375, 0.6}` (alrededor de ε_snap), T con 3 y 4 ramas, T sobre el contorno | O-E, O-B | T exacta: 3 paneles y 2 adyacencias (hoy pierde uno, KI-04); desalineada < ε_snap: igual; en la banda ambigua: diagnóstico; > ε_snap·ρ: crease colgante reportada |
| **4. Casi coincidentes** | crease sobre el corte con desfase lateral {0, 0.0035, 0.01, 0.05, 0.2} mm; dos creases paralelas a {0.005, 0.5} mm (escalón de Caja Botánica) | O-A, O-B | Desfase < ε_snap ⇒ una arista; 0,5 mm ⇒ **dos** líneas y una franja de 0,5 mm asignada al panel correcto |
| **5. Contornos y huecos** | hueco centrado/descentrado, hueco que toca una crease, huecos anidados/solapados, hueco cerca del borde (caja simple a s < 0,65) | O-E, M10 | Hueco asignado a un panel con área neta, o diagnóstico; nunca soldado al contorno |
| **6. Determinismo** | 20 ejecuciones; permutaciones de §1 | igualdad byte a byte de la salida canónica | Idéntica |
| **7. Límites de tolerancia** | Para cada característica L de un fixture, escalas `s·L = ε_snap·(1 ± 10⁻⁶)` | S1/P-6 | Cambio solo dentro de la banda ambigua y siempre con diagnóstico |
| **8. Conservación de caras válidas** | `panel-pequeno-4.5mm2`, `muy-pequeno-1.5mm2`, `delgado-40x1` (hoy descartados en silencio, KI-19) | O-A, M8 | Presentes como paneles o como `discarded-face` con área |

**Pruebas de sensibilidad** (requisito del Plan §6): cada familia lleva al menos un control negativo (mutación del motor que la prueba debe detectar), como en F1.
