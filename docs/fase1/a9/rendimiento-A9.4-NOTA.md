# A9.4 — Nota de rendimiento (D-A9-14)
- 10 corridas (`rendimiento-A9.4-10corridas.json`): todo OK; el máximo, `clic_alt_ms` +9,4 % (0,160 → 0,175 ms), está por debajo del umbral, pero es justo la ruta que A9.4 toca (un marco de pila más por el envoltorio de enlace tardío), así que se repitió.
- 20 corridas (`rendimiento-A9.4-20corridas.json`): `clic_alt_ms` −3,2 % (media 0,157 ref / 0,152 act; ambos en 0,11–0,20 ms), `clic_shift_ms` −0,7 %; todo OK.
- Conclusión [MEDIDO]: variación de un instrumento cuantizado (resolución de 0,1 ms de `performance.now()`, media de 10 clics ⇒ paso de 0,01 ms); el envoltorio no tiene coste medible.
