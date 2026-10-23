# Informe Nivel 0 — validación en Illustrator real

Carpeta analizada: `/Users/gerardocalambasposada/Documents/Antigravity/Tesseract/Tesseract v3/docs/fase1/nivel0-real`

Entorno real: Illustrator **30.8.2** · ExtendScript **4.5.6** · SO **Macintosh OS 26.6.2/64** · locale en_US

**Resumen:** ✅ 51 · 🔶 diferencias 2 · ❌ fallas 0 · ◻︎ no verificables 0 · ⏳ no ejecutadas 0 · sondas distintas de la maqueta: 0

## N0-A — N0-A_caja_real_export.svg
Exportación real de Illustrator de la Caja Botánica (capas Cuts y Creases; Creases contiene un grupo de un nivel). Es el SVG original, sin tocar.

| Comprobación | Estado | Detalle |
|---|---|---|
| INT-survey | ✅ OK | estado del documento idéntico antes/después |
| INT-extract | ✅ OK | estado del documento idéntico antes/después |
| L0-2 | ✅ OK | capas (arriba→abajo): Cuts, Creases |
| L0-1 | ✅ OK | profundidad de grupos {"Cuts":0,"Creases":1} |
| L0-5 | ✅ OK | artboard 500.00×500.00 mm (1 px = 1 pt confirmado) |
| L0-3 | ✅ OK | extracción sin error (capa de corte «Cuts», de pliegue «Creases») |
| L0-2b | ✅ OK | capa de corte elegida «Cuts» |
| L0-4k | 🔶 DIF | factor de escala uniforme real/esperado = 1.33333; con la escala normalizada todos los invariantes coinciden |
| L0-4 | ✅ OK | invariantes iguales tras normalizar la escala — IGUALES salvo un factor uniforme ×1.3333 (el SVG está en px a 96 dpi y se reabrió 1 px = 1 pt) |
| L0-6n | ✅ OK | motor vigente con la extracción real normalizada a la escala esperada: 13p/15425.9453mm²/12adj/0avisos vs esperado 13p/15425.9426mm²/12adj/0avisos |
| L0-6 | 🔶 DIF | real 11p/26769.1212mm²/10adj/0avisos vs esperado 13p/15425.9426mm²/12adj/0avisos |

## N0-B — N0-B_caja_simple_arte.svg
Caja 100×60 mm con un hueco de 10×10 mm y 1 crease; capas Cuts, Creases, Front y Back (arte por capas).

| Comprobación | Estado | Detalle |
|---|---|---|
| INT-survey | ✅ OK | estado del documento idéntico antes/después |
| INT-extract | ✅ OK | estado del documento idéntico antes/después |
| INT-art | ✅ OK | estado del documento idéntico antes/después |
| L0-2 | ✅ OK | capas (arriba→abajo): Cuts, Creases, Front, Back |
| L0-1 | ✅ OK | profundidad de grupos {"Cuts":0,"Creases":0,"Front":0,"Back":0} |
| L0-5 | ✅ OK | artboard 140.00×100.00 mm (1 px = 1 pt confirmado) |
| L0-3 | ✅ OK | extracción sin error (capa de corte «Cuts», de pliegue «Creases») |
| L0-2b | ✅ OK | capa de corte elegida «Cuts» |
| L0-4 | ✅ OK | invariantes del troquel iguales a los esperados (puntos, áreas, bbox, huecos, creases, manijas) |
| L0-6 | ✅ OK | motor vigente sobre la extracción real: 2 paneles, área 5999.9999, 1 adyacencias, 0 avisos (= esperado) |
| L0-7 | ✅ OK | modo layers, front y back exportados, PNG 3176×2264 (escala 800.0 %), estado restaurado |

## N0-C — N0-C_grupos_anidados.svg
Igual que B pero la capa Creases tiene un grupo dentro de otro grupo. KI-10 predice que el extractor FALLA ("Script error").

| Comprobación | Estado | Detalle |
|---|---|---|
| INT-survey | ✅ OK | estado del documento idéntico antes/después |
| INT-extract | ✅ OK | estado del documento idéntico antes/después |
| L0-2 | ✅ OK | capas (arriba→abajo): Cuts, Creases |
| L0-1 | ✅ OK | profundidad de grupos {"Cuts":0,"Creases":2} |
| L0-5 | ✅ OK | artboard 140.00×100.00 mm (1 px = 1 pt confirmado) |
| L0-3 | ✅ OK | KI-10 REPRODUCIDO en Illustrator real: «Script error: undefined is not an object line:90» |

## N0-D — N0-D_capa_Studies.svg
Igual que B pero con una capa "Studies" (contiene "die") ARRIBA de Cuts. KI-10 predice que el extractor toma "Studies" como capa de corte.

| Comprobación | Estado | Detalle |
|---|---|---|
| INT-survey | ✅ OK | estado del documento idéntico antes/después |
| INT-extract | ✅ OK | estado del documento idéntico antes/después |
| L0-2 | ✅ OK | capas (arriba→abajo): Studies, Cuts, Creases |
| L0-1 | ✅ OK | profundidad de grupos {"Studies":0,"Cuts":0,"Creases":0} |
| L0-5 | ✅ OK | artboard 140.00×100.00 mm (1 px = 1 pt confirmado) |
| L0-3 | ✅ OK | extracción sin error (capa de corte «Studies», de pliegue «Creases») |
| L0-2b | ✅ OK | capa de corte elegida «Studies» (KI-10 por subcadena REPRODUCIDO en real) |

## N0-F — N0-F_trazado_compuesto.svg
Contorno y hueco como UN trazado compuesto (evenodd) en Cuts. Comprueba CompoundPathItem en Illustrator real.

| Comprobación | Estado | Detalle |
|---|---|---|
| INT-survey | ✅ OK | estado del documento idéntico antes/después |
| INT-extract | ✅ OK | estado del documento idéntico antes/después |
| L0-2 | ✅ OK | capas (arriba→abajo): Cuts, Creases |
| L0-1 | ✅ OK | profundidad de grupos {"Cuts":0,"Creases":0} |
| L0-5 | ✅ OK | artboard 140.00×100.00 mm (1 px = 1 pt confirmado) |
| L0-3 | ✅ OK | extracción sin error (capa de corte «Cuts», de pliegue «Creases») |
| L0-2b | ✅ OK | capa de corte elegida «Cuts» |
| L0-4 | ✅ OK | invariantes del troquel iguales a los esperados (puntos, áreas, bbox, huecos, creases, manijas) |
| L0-6 | ✅ OK | motor vigente sobre la extracción real: 2 paneles, área 5999.9999, 1 adyacencias, 0 avisos (= esperado) |

## N0-G — N0-G_curvas.svg
Rectángulo 120×60 mm con esquinas redondeadas (Bézier) y 1 crease. Comprueba manijas leftDirection/rightDirection en Illustrator real.

| Comprobación | Estado | Detalle |
|---|---|---|
| INT-survey | ✅ OK | estado del documento idéntico antes/después |
| INT-extract | ✅ OK | estado del documento idéntico antes/después |
| L0-2 | ✅ OK | capas (arriba→abajo): Cuts, Creases |
| L0-1 | ✅ OK | profundidad de grupos {"Cuts":0,"Creases":0} |
| L0-5 | ✅ OK | artboard 160.00×100.00 mm (1 px = 1 pt confirmado) |
| L0-3 | ✅ OK | extracción sin error (capa de corte «Cuts», de pliegue «Creases») |
| L0-2b | ✅ OK | capa de corte elegida «Cuts» |
| L0-4 | ✅ OK | invariantes del troquel iguales a los esperados (puntos, áreas, bbox, huecos, creases, manijas) |
| L0-6 | ✅ OK | motor vigente sobre la extracción real: 2 paneles, área 7000.0004, 1 adyacencias, 0 avisos (= esperado) |

## Sondas de ExtendScript real vs suposiciones de la maqueta

| Sonda | Maqueta | Real | Estado |
|---|---|---|---|
| GroupItem: typeof .layers | "undefined" | "undefined" | ✅ OK |
| GroupItem: leer .layers.length lanza | true | true | ✅ OK |
| Layer: typeof .layers | "object" | "object" | ✅ OK |
| PathPoint.anchor es Array de 2 | ["[object Array]",2] | ["[object Array]",2] | ✅ OK |
| leftDirection/rightDirection de longitud 2 | [2,2] | [2,2] | ✅ OK |
| CompoundPathItem: hijos son PathItem con padre CompoundPathItem | ["PathItem","CompoundPathItem"] | ["PathItem","CompoundPathItem"] | ✅ OK |
| PathItem.typename | "PathItem" | "PathItem" | ✅ OK |
| Layer.typename | "Layer" | "Layer" | ✅ OK |

## Diferencias a registrar (maqueta ↔ ExtendScript real)

- **N0-A · L0-4k** (DIF): factor de escala uniforme real/esperado = 1.33333; con la escala normalizada todos los invariantes coinciden
- **N0-A · L0-6** (DIF): real 11p/26769.1212mm²/10adj/0avisos vs esperado 13p/15425.9426mm²/12adj/0avisos
