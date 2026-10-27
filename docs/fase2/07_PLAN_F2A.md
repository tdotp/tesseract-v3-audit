# F2.0 · 07 — Plan técnico incremental de F2A (propuesta; NO implementado)

**Objetivo de F2A:** un motor candidato que resuelva KI-22 (y, por construcción, KI-04, KI-18 y los descartes silenciosos) **detrás de `GeometryEngine`**, con el legacy como motor por defecto e intacto, y con evidencia objetiva (oráculos de `05`) de que su resultado es correcto.
**Principio:** una operación geométrica por unidad; cada unidad es un commit propio, reversible con `git revert`, con su batería en verde antes de la siguiente.

## Regla de huellas (cuándo se permite romper hashes)

| Huella / referencia | Durante F2A-0…F2A-4 | En F2A-5 | Después (2B / promoción) |
|---|---|---|---|
| `reference/legacy-baseline/`, `panel.pins.json`, `fixtures.pins.json` | **Intactas** | Intactas | Intactas |
| Goldens del legacy (`geometry.golden.json`, `illustrator-real.golden.json`, `geometry-logs.golden.json`, `a6-*`) | **Intactos** (el legacy no cambia) | Intactos | Intactos mientras el legacy exista |
| Huellas históricas `dist.SHA256SUMS`, `dist-a5…dist-a8` | Intactas | Intactas | Intactas |
| Huella vigente `dist-a9` (`main.js` `e5902a3c…`) | **Intacta**: el candidato vive en `src/core/candidate/` y `main.js` no lo importa (esbuild no lo empaqueta) — se comprueba en cada paso | **Única ruptura permitida**: el interruptor de desarrollo entra en el bundle ⇒ nueva huella `dist-f2a`; `dist-a9` pasa a histórica («HISTÓRICO A9» reconstruye `1cc1065`). Exige paridad del modo por defecto: logs del motor, escena y GLB **byte a byte** iguales a A9 | Nueva huella al promover |
| Goldens del candidato | Nuevos, **derivados de oráculos** (nunca del legacy) | Nuevos | — |

## Unidades

### F2A-0 · Arnés de oráculos y metamórficas (sin código de producto) — complejidad **M**
- **Hipótesis:** los oráculos O-A/O-B/O-C y la firma canónica detectan las fallas del legacy medidas en F2.0 y no dan falsos positivos en los fixtures analíticos.
- **Archivos:** `tests/lib/f2/{oraculos,firma,metamorficas}.mjs`, `tests/node/f2-oraculos.test.mjs`, `tests/node/f2-legacy-caracterizacion.test.mjs`, fixtures sintéticos nuevos de las familias 3, 4, 7 y 8 (`tests/lib/fixtures.mjs` **solo añadir**; los existentes no se tocan), promoción de `tools/f2/lib/etapas.mjs` a `tests/lib/`.
- **Contrato:** firma canónica (04 §4); oráculos como funciones puras sobre `(Dieline, PanelModel)`.
- **Pruebas que deben pasar:** oráculos sobre fixtures analíticos = valor exacto; sobre el legacy, **caracterización** de sus fallos actuales (p. ej. «legacy, Caja Botánica (extracción original) ×1: incumple O-A en 1 347,6 mm² frente al polígono de anclas; extracción de Illustrator real: 681,1 mm²»): se fijan como hechos, no se marcan como «esperado correcto». Controles negativos: mutar un oráculo ⇒ falla.
- **Resultado geométrico esperado:** ninguno nuevo (no hay motor nuevo).
- **Riesgos:** confundir caracterización con aceptación; tiempo de la batería (barridos finos ⇒ limitar a 50–100 escalas en la batería y dejar 601 en `tools/f2`).
- **Rollback:** revertir el commit (solo pruebas).

### F2A-1 · Candidato «arreglo exacto» (port del motor web) — **M**
- **Hipótesis:** el arreglo plano del web reproduce sobre V3 sus resultados medidos: 13 y área exacta en `caja-botanica-real`; error explícito en `ill-real-caja-botanica`.
- **Archivos:** `src/core/candidate/{arrangement,faces,holes,flatten}.js` (copia JS del TS de `c0aeb34` con cabecera de procedencia; nombres de función distintos de los del legacy para no romper `a6-texto-identico`/cargador por texto — ver R-3), `tests/node/f2-candidato-paridad-web.test.mjs`.
- **Contrato:** `buildArrangement(segments) → {vertices, edges, faces}` puro; sin DOM/THREE/estado (I1 de v1).
- **Pruebas:** paridad con el bundle del web en los 7 fixtures × 15 escalas (`tools/f2/motor-web.mjs` como referencia); `dist/` sigue = `dist-a9`.
- **Riesgos:** diferencias TS→JS; sintaxis no compatible con Chromium 99 (comprobar con `chromium99-compat`).
- **Rollback:** revertir; el producto no lo usa.

### F2A-2 · Origen local y predicados exactos — **S–M**
- **Hipótesis:** con origen local + `orient2d` adaptativo desaparecen los fallos **numéricos** (traslación 1e7, sentido del contorno) sin cambiar ningún resultado en el dominio normal.
- **Archivos:** `src/core/candidate/predicates.js` (implementación propia o vendorizada: DP-4), `arrangement.js`.
- **Contrato:** todas las decisiones de lado/colinealidad/intersección por `orient2d`; identidad de vértices por `δ_num = 64·u·M`.
- **Pruebas:** metamórficas M3–M5 (traslación ±10⁵ y 10⁷ si se declara en dominio, rotaciones, reflexión, permutaciones) idénticas; paridad F2A-1 sin cambios en los fixtures.
- **Riesgos:** coste de rendimiento (medir: hoy 1,7 ms).
- **Rollback:** revertir la unidad; F2A-1 queda.

### F2A-3 · Ajuste tipado de extremos de crease (P-2/P-3/P-6) — **L** (el núcleo de KI-22)
- **Hipótesis:** proyectar **solo** extremos libres de crease sobre el segmento más cercano (corte o crease ajena) a distancia lateral ≤ ε_snap, con incidencia simbólica registrada y banda ambigua, hace que los tres fixtures de la Caja Botánica den el **mismo** arreglo (13 caras) en el dominio S1, sin mover el contorno.
- **Archivos:** `src/core/candidate/snap.js`, `diagnostics.js`; constantes en `src/core/candidate/policy.js` (ε_snap = 0,05 **parámetro**, ρ = 3).
- **Contrato:** `snapCreases(dieline, policy) → {creases', incidences[], diagnostics[]}`; M2 (hash del contorno idéntico) obligatorio.
- **Pruebas:** familias 3, 4 y 7 de `05`; los tres fixtures de la Caja Botánica: firma canónica idéntica entre sí y a s ∈ [0,30, 3,33]; S2 (ε ∈ [0,025, 0,1]) sin cambios; ambigüedad reportada al construir un caso en la banda.
- **Resultados esperados:** 13 paneles, O-A con τ_A, O-B (12 creases efectivas), O-C.
- **Riesgos:** ε_snap calibrado con un solo troquel (R-1); ajuste crease–crease puede encadenar (proyectar sobre una crease que a su vez se ajusta): resolver en orden canónico y comprobar idempotencia (V3 del D4).
- **Rollback:** revertir; F2A-2 queda.

### F2A-4 · Paneles, huecos, adyacencia y diagnósticos (M7–M11) — **M**
- **Hipótesis:** adyacencia sobre aristas del arreglo + asignación única de huecos + sin filtros silenciosos cumple M7–M11 en todos los fixtures.
- **Archivos:** `src/core/candidate/{panels,adjacency,fold-tree}.js`.
- **Contrato:** salida v2 aditiva (04 §3); árbol BFS con el mismo signo que el legacy (`computeFoldSign` reutilizable por import, sin copiarlo).
- **Pruebas:** familias 2, 5, 8; KI-04 (`t-exacta` = 3 paneles y 2 adyacencias), KI-05/06/09/19 corregidos **en el candidato**; S4 (donde el legacy acierta — rejillas, caja simple ×1 — mismas adyacencias y árbol).
- **Riesgos:** cambio de la base por defecto (área neta frente a bruta) ⇒ distinta pose inicial; decidir (DP-6).
- **Rollback:** revertir.

### F2A-5 · Adaptador v1 e interruptor de desarrollo — **M** (única unidad que cambia el bundle)
- **Hipótesis:** el candidato puede alimentar escena, plegado y GLB a través de `PanelModel` v1 sin tocar `scene/`, `fold/` ni `export/`; el modo por defecto queda **idéntico** a A9.
- **Archivos:** `src/core/engine.js` (añade `createCandidateEngine`; `createLegacyEngine` sin cambios), `src/main.js` (lectura de un interruptor de desarrollo no persistente — DP-7), pruebas de paridad.
- **Contrato:** `GeometryEngine` v1 intacto + campo opcional `diagnostics` (v2 aditivo); el legacy sigue siendo el de por defecto.
- **Pruebas:** batería completa `--mutations --soak`; modo por defecto: logs del motor, inventario de escena, píxeles y GLB **byte a byte** = A9; modo candidato: Caja Botánica 13 paneles en navegador; Chromium 99 4/4.
- **Riesgos:** las pruebas por texto (`a6/a7/a9-texto-identico`, cargador) ven funciones nuevas en `src/` (R-3); el interruptor no debe filtrarse a producción (control negativo).
- **Rollback:** revertir; `dist-a9` vuelve a ser la vigente.

### F2A-6 · Informe comparativo y puerta 2A→2B — **S** (+ corpus)
- **Hipótesis:** sobre el corpus (≥ 10 troqueles reales), el candidato cumple O-A/O-B/O-C y S1 en todos o marca ambigüedad; las diferencias con el legacy se explican (V8 del D4).
- **Archivos:** `docs/fase2/F2A_INFORME.md`, `tools/f2/corpus.mjs`.
- **Pruebas:** tabla por troquel; conteos verificados por una persona (O-F).
- **Riesgos:** sin corpus no se puede cerrar la puerta (R-1).
- **Rollback:** no aplica (documental).

### Fuera de F2A (decisión aparte)
- Aviso en el validador del **legacy** cuando hay geometría en la banda ambigua de 0,5 mm (mitiga KI-22 en producción sin cambiar paneles): cambia la UI ⇒ cambio visible, requiere autorización propia (DP-8).
- Restar huecos en la escena (KI-06), curvas en 3D (KI-07), KI-02: dependen de que el candidato sea el motor por defecto (2B).

## Secuencia y dependencias

`F2A-0 → F2A-1 → F2A-2 → F2A-3 → F2A-4 → F2A-5 → F2A-6`. F2A-0 puede empezar sin el corpus; F2A-3 necesita al menos una decisión provisional sobre ε_snap (DP-3) y su calibración final necesita el corpus; F2A-6 necesita el corpus.

**Criterios de aceptación globales de F2A:** (1) legacy por defecto con todas sus huellas y goldens intactos; (2) candidato con 13 paneles en las tres variantes de la Caja Botánica y firma idéntica en el dominio S1; (3) O-A, O-B, O-C, M2, M5 en todos los fixtures; (4) ningún descarte silencioso; (5) paridad del modo por defecto byte a byte; (6) batería completa en verde con controles negativos de cada familia.
