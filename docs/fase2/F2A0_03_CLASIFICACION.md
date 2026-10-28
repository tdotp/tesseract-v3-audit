# F2A-0 · 03 — Clasificación de diferencias: topología, geometría, representación y discretización

Implementada en `tests/lib/f2/comparar.mjs` (`compararOraculos`, `compararLegacy`). Cada diferencia entre dos resultados se clasifica en la **primera** clase que la explique:

| Clase | Criterio operativo | Ejemplo medido |
|---|---|---|
| **Topología** | Cambia el conjunto de paneles (identificados por las creases que los separan), un panel se pierde, se divide o se fusiona, cambia una adyacencia o la asignación de una crease, o cambia el número de componentes | Legacy ×1 frente al oráculo: pierde `C10` y `C7` (original) o fusiona `C0` con `C0 C8` (Illustrator real) |
| **Geometría** | Topología igual (emparejamiento 1:1), pero el área de un panel difiere más que la cota de representación: un borde se ha movido (p. ej. fusión de vértices a 0,5 mm) | Legacy ×1 original: ±19,90 mm² (franja 0,4974 × 40 mm) en `C0 C8`, `C3 C11`, `C4 C8 C9`; legacy ×0,75: −60,11 mm² en `C6 C7 C9 C10` |
| **Representación** | Topología igual y \|ΔA\| ≤ ν·perímetro del panel, con ν = ruido declarado de la entrada (0,005 mm medido en el viaje SVG); o, para transformaciones en double, \|ΔA\| del orden del redondeo (≤ 1e-6 mm²) | Original frente a Illustrator real: ΔA −0,158…+0,229 mm² con cotas 0,44–1,63 mm²; rotación de 37° en double |
| **Discretización** | Topología igual; ΔA atribuible solo al tratamiento de curvas (anclas frente a N muestras), y decrece con N | Esquinas redondeadas: 7 000 (anclas) < 7 101,77 (16) < área con 64 muestras < 7 102,26 (integración fina) |
| **Idéntico** | Firma y áreas exactas iguales | Todas las permutaciones de entrada y las transformaciones exactas |

## Reglas

1. **Nunca se acepta una diferencia por el número de paneles.** Dos resultados con 13 paneles pueden ser de clase «geometría» (legacy ×0,75) y dos con distinto número son siempre «topología».
2. La cota de representación se **declara** (ν); no se ajusta para que una comparación pase. Con ν = 0 la misma comparación degrada a «geometría» (así lo fijan las pruebas históricas).
3. Un fallo es **numérico** si desaparece con aritmética exacta y origen local (traslación 1e7: KI-32; sentido del contorno: KI-31), **por tolerancia** si su escala crítica coincide con una característica de la entrada (KI-22), y **estructural** si persiste con aritmética exacta y ε → 0 (adyacencia estricta/conectividad, KI-04). La clasificación anterior describe el *efecto*; esta, la *causa*.
4. La discretización solo se mide entre representaciones del **mismo** oráculo (anclas frente a muestras); comparar el legacy (anclas) con el motor web (16 muestras) mezclaría discretización con topología: por eso el oráculo usa anclas por defecto.
