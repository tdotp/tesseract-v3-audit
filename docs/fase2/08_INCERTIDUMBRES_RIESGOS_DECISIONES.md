# F2.0 · 08 — Incertidumbres, riesgos, contradicciones y decisiones pendientes

## 1. Incertidumbres

| Id | Incertidumbre | Por qué importa | Cómo resolverla |
|---|---|---|---|
| U-1 | ν_max (ruido) y ℓ_min (característica real más corta) medidos en **un solo troquel** | Fijan ε_snap y el dominio S1 | Corpus de ≥ 10 troqueles reales (Plan §5); `ki22-predicados.mjs` sobre cada uno |
| U-2 | Intención de los escalones de 0,5 mm (¿compensación de espesor?) | Si fueran errores de dibujo, la respuesta correcta sería fusionarlos (otro modelo) | DP-1 (usuario) |
| U-3 | Conteo «13» sin verificación humana | Criterio 1 del Plan §5 | DP-2 (usuario) |
| U-4 | Comportamiento del candidato en CEP real (Chromium 99) | Solo compilado con `target=chrome99`, no ejecutado | Validación CEP con autorización tras F2A-5 |
| U-5 | Origen de KI-02 (normales nulas) | Posible relación con vértices colineales/duplicados del legacy | Comprobar en F2A-6 con el candidato |
| U-6 | Troqueles con perforaciones, muescas o detalles < 0,1 mm | Podrían caer en la banda ambigua con ε_snap = 0,05 | Corpus; el motor los marcaría ambiguos (P-6), no los rompería en silencio |
| U-7 | Transición de la caja simple a ≈ ×0,383 sin predicado de entrada | Hay decisiones sobre puntos **creados** por el troceado que el análisis estático no ve | Traza dinámica de E3 (instrumentación pendiente, `02`) — no afecta a la conclusión de KI-22 |

## 2. Riesgos de F2A

| Id | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-1 | Calibrar ε_snap con un solo troquel y que falle en otros | Alta sin corpus | Alto | ε como parámetro; banda ambigua con diagnóstico; puerta F2A-6 con corpus |
| R-2 | Confundir «más paneles» con «correcto» | Media | Alto | Exigir O-A ∧ O-B ∧ O-C ∧ O-F; nunca aceptar por conteo |
| R-3 | Las pruebas de texto idéntico y el cargador por texto (`tests/lib/legacy.mjs` concatena todo `src/`) chocan con funciones nuevas en `src/core/candidate/` | Alta | Medio | Nombres distintos y verificar en F2A-1; si hace falta, ajuste del cargador **aprobado** (como D-A9-5) |
| R-4 | Romper la paridad del modo por defecto al cablear el interruptor | Baja | Alto | F2A-5 aislado; GLB/logs/escena byte a byte; control negativo |
| R-5 | Excepciones del candidato rompen la UI | Media | Medio | Convertirlas en diagnósticos (M9) antes de F2A-5 |
| R-6 | Rendimiento de predicados exactos | Baja | Bajo | Medir (hoy 1,7 ms / 0,65 ms) |
| R-7 | Duplicar el motor web y que diverja del original | Media | Bajo | Cabecera de procedencia + prueba de paridad con el bundle del web en F2A-1 |
| R-8 | Base por defecto distinta (área neta) ⇒ pose inicial distinta ⇒ GLB distinto en modo candidato | Alta | Bajo | DP-6; solo afecta al modo candidato |
| R-9 | Cambiar el sentido del contorno en Illustrator cambia hoy el resultado del legacy (D4) — usuarios reales pueden verlo ya | Media | Medio | Registrar como defecto (propuesta KI-31) |

## 3. Contradicciones detectadas en documentos (propuesta de resolución)

| Id | Contradicción | Propuesta |
|---|---|---|
| C-1 | `fase0/08` D4: «creases con extremos a ~0.375 mm de donde deberían tocarse». Medido: tocan (0,0000 mm) o ≤ 0,005 mm; los 0,375 eran escalones de 0,5 mm vistos a ×0,75 | Añadir una nota de corrección en D4 citando `01` §6; el normalizador de 2A pasa a ser «ajuste tipado de ruido», no «cerrar holguras de 0,375» |
| C-2 | `KNOWN_ISSUES` KI-04 (b): «8 pares de extremos a 0,497–0,501 mm a ambos lados del corte de 0,5 mm» se presentaba como holgura a cerrar | Reescribir como «creases paralelas escalonadas 0,5 mm (geometría real) que la tolerancia de 0,5 mm fusiona» |
| C-3 | `NIVEL0_INFORME` §3.2 y KI-22: «×0,50…×0,99 ⇒ 13; ×1,00…×2,00 ⇒ 11» | Añadir los resultados no monótonos (12 a ×0,995 y ×0,999) y que «11» son ≥ 3 geometrías |
| C-4 | `PROVENANCE.md`: «la extracción (175.0 × 223.5 mm) coincide con `caja-botanica-real`» | Coinciden en tamaño y troquel, **no** en vértices (56 frente a 69), en coordenadas (Y con otro origen y signo) ni en ruido (0 frente a ≤ 0,005 mm); el motor web distingue ambas |
| C-5 | Comentario de invariantes de `src/core/engine.js`: «unidades mm y tolerancias absolutas (KI-22)» presentaba «absolutas» como la causa | La causa es el **valor** (≈ ℓ) y el uso no tipado; la política propuesta sigue siendo absoluta (física) |
| C-6 | Plan maestro §3 Fase 1: «En curso…» (desactualizado tras el cierre de F1) | Actualizar la tabla de fases al aprobar F2.0 |
| C-7 | Motor web: comentario «mirrors the plugin's endpoint tolerance» (0,500001) | Para V3 la tolerancia de snap no debe heredar 0,5 mm (D1) |

Ningún documento previo se ha editado en F2.0 salvo `HANDOFF.md` (solo se registra aquí); se propone corregirlos al aprobar.

## 4. Defectos nuevos propuestos para `KNOWN_ISSUES.md` (no registrados todavía)

| Id propuesto | Defecto | Evidencia |
|---|---|---|
| KI-31 | El resultado del legacy depende del **sentido** del contorno (12 frente a 11 paneles en la Caja Botánica ×1) | `metamorficas-y-correspondencia.txt` |
| KI-32 | Pérdida de precisión con coordenadas grandes (traslación 1e7 mm ⇒ 7 paneles); fuera del lienzo de Illustrator (±5 780 mm), latente | Ídem |
| KI-33 | `pointOnSeg` suelda un hueco al contorno a 5 mm laterales en la caja simple a s < 0,648 (alcance lateral ∝ √len) | `ki22-predicados-ill-real-caja-simple.txt` |
| KI-34 | El motor candidato web lanza con la extracción real de Illustrator (ruido ≤ 0,005 mm en uniones crease–crease) | `motor-web-vs-legacy.txt` (afecta solo a la evaluación de 2B) |

## 5. Decisiones que el usuario debe aprobar antes de F2A

| Id | Decisión | Opciones | Recomendación |
|---|---|---|---|
| **DP-1** | ¿Los escalones de ≈ 0,5 mm entre creases y en el contorno de la Caja Botánica son intencionales? | (a) Sí, geometría real que se conserva · (b) No, errores que se fusionan | **(a)** — coincide con el oráculo de área exacta |
| **DP-2** | ¿La Caja Botánica tiene 13 paneles (O0–O12 del oráculo, tabla en `01` §3.2)? | Confirmar / corregir | Confirmar tras verlo en Illustrator |
| **DP-3** | Política de tolerancias `03` §3 (roles separados; ε_snap = 0,05 mm provisional; ρ = 3; sin filtros silenciosos) | Aprobar / ajustar | Aprobar como provisional, calibrar con el corpus |
| **DP-4** | Predicados exactos: implementación propia (≈ 150 líneas, `orient2d` adaptativo) o vendorizar `robust-predicates` (licencia Unlicense, sin verificar compatibilidad con la política de licencias del proyecto) | Propia / vendorizada | Propia (sin dependencias nuevas) |
| **DP-5** | Copiar el motor web a `src/core/candidate/` (con procedencia) en vez de depender del repositorio web | Copiar / depender | Copiar |
| **DP-6** | Base por defecto del candidato: mayor área bruta (como el legacy) o neta (como el web) | Bruta / neta | Bruta (menos diferencias en 2B) |
| **DP-7** | Forma del interruptor de desarrollo en F2A-5 (p. ej. `localStorage`/query no persistente, solo en build de desarrollo) | — | Decidir en la propuesta de F2A-5 |
| **DP-8** | ¿Aviso temprano en el validador del legacy para geometría a 0,5 mm ± banda (mitigación en producción, cambio visible)? | Sí (tarea aparte) / No | Sí, como tarea aparte de bajo riesgo |
| **DP-9** | Registrar KI-31…KI-34 y aplicar las correcciones C-1…C-7 | Aprobar / no | Aprobar |
| **DP-10** | Autorizar F2A-0 (solo pruebas y oráculos, sin código de producto) | Autorizar / no | Autorizar; F2A-1+ con autorización por bloque |
