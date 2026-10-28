# F2A-0 · 06 — Por qué el motor web acierta con la extracción original y falla con la de Illustrator real (DP-5)

Herramienta: `node tools/f2/diferencias-motor-web.mjs` (solo lectura de `tesseract-web` `c0aeb34`; evidencia `evidencia/f2a0-diferencias-motor-web.{json,txt}`). Método: separar las dos etapas del motor web — **(1) su ajuste** (`snapCreaseVerticesToBoundary`: cada vértice de crease, por separado, al punto más cercano del contorno aplanado si está a ≤ 0,500001 mm; cálculo en double) y **(2) su grafo plano** (double, `NUMERIC_EPS = PARAM_EPS = 1e-9`, fusión de vértices 1e-6) — y pasar la salida de (1) al oráculo **exacto sin ajuste propio**.

## Resultados [MEDIDO]

| | Extracción original (`caja-botanica-real`) | Illustrator real (`ill-real-caja-botanica`) |
|---|---|---|
| Vértices movidos por el ajuste web | **0** (los extremos ya están exactamente sobre el corte) | **19** (máx. 0,00497 mm) |
| Distancia exacta al corte tras su ajuste | 0 | 0 en 21 extremos; **2,55e-14** (C3a), **2,01e-14** (C7a), **1,16e-17** mm (C9b) |
| Uniones crease–crease abiertas tras su ajuste | ninguna | **C7–C9 a 1,52e-5 mm** (> su fusión de 1e-6) |
| Oráculo exacto sobre la geometría ajustada por el web | 13 paneles, área exacta, 12/12 creases | **12 paneles**, área exacta, 11/12 creases; **C3 colgante (39,003 mm)**; el panel `C3 C11` se une a la lengüeta `C3` (1 991,35 mm²) |
| Motor web completo | 13 paneles | **lanza** «geometry conservation failed» (genera 25 993,5 de 27 593,5 mm²: falta el panel `C3 C11`, 1 600 mm²) |
| Oráculo con su ajuste tipado (ε = 0,05) | 13 | 13 |

## Explicación

1. **Con la extracción original no hay nada que ajustar**: el arreglo de doubles ya es topológicamente exacto, y cualquier motor de arreglo plano correcto da los 13 paneles. Por eso el motor web y el oráculo coinciden.
2. **Con la extracción de Illustrator real** hay ruido de ≤ 0,005 mm. El ajuste del web tiene dos problemas medidos:
   - **Proyecta cada vértice por separado:** C7a y C9b eran el mismo punto de unión (a 1,5e-5 mm), pero quedan cerca de una esquina del corte y se proyectan sobre segmentos distintos ⇒ la unión se abre 1,5e-5 mm, por encima de su tolerancia de fusión (1e-6).
   - **Proyecta en double:** el punto proyectado no está exactamente sobre el segmento (2e-14 mm). Un arreglo exacto lo ve como no incidente (C3 colgante); el grafo del web, en double, tampoco cierra la región del panel `C3 C11`.
3. El paso concreto, **dentro** del grafo en double del web, por el que la región `C3 C11` queda fuera (en lugar de fusionarse con la lengüeta como en el oráculo) **no está determinado** [NO VERIFICADO]: haría falta instrumentar `planarGraph.ts`. No cambia la conclusión: el fallo procede de su **política de ajuste** (vértice a vértice, sin agrupar uniones, sin incidencia exacta) combinada con su **numérica** (double con ε fijos).
4. El oráculo evita ambos problemas porque **agrupa primero** los extremos coincidentes, mueve el grupo como un solo punto y **proyecta en aritmética exacta** (el punto queda sobre el segmento por construcción).

## Consecuencia para F2A-1 (DP-5: el motor web no se incorpora)

Del motor web se puede reutilizar la **idea** (arreglo de todas las parejas, sin filtros silenciosos, conservación de área, el contorno nunca se mueve, adyacencia por aristas del grafo), no su ajuste ni sus tolerancias. Registrado como **KI-34** (afecta solo a la evaluación de 2B).
