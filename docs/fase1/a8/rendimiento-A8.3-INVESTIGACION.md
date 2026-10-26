# A8.3 — «INVESTIGAR (> 10 %)» en `construir_ms`: ruido, no degradación

Primera medición (10 corridas, `rendimiento-A8.3.json`): `construir_ms` 34.5 → 40.0 ms (**+15.9 %**, umbral D-A7-13: > 10 % investigar). La métrica mide `continuar_a_3d_sincrono_ms`, que **no ejecuta nada de la exportación** (src/export/ solo actúa al pulsar «Export GLB»).
Muestras crudas de esa medición: ref `50.9 33.4 28.2 40.6 25.5 23.6 41 38.6 35.6 25.8` · act `48.4 39.8 39.9 38.3 38.7 40.1 41.6 42.4 39 40.3`. La referencia es **bimodal** (cuatro corridas rápidas de 23–28 ms frente a ≈ 38–41 ms en el resto); el bundle actual es unimodal en ≈ 38–42 ms.
Repetición con 20 corridas intercaladas (`rendimiento-A8.3-repeticion.json`): ref `38.8` → act `38.45` (**−0.9 %**); ambos con valores atípicos rápidos aislados (22–28 ms) en las dos ramas. Resto de métricas: OK en las dos mediciones.
Conclusión [MEDIDO]: artefacto de la mediana de 10 muestras con modos rápidos aislados en la referencia (el ruido del propio arnés se estimó en ±5 %, y en A8.0b A7-vs-A7 dio +0.4 %). Sin degradación. Se commitea con las dos mediciones adjuntas.
