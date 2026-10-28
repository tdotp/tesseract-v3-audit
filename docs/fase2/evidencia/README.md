# Evidencia reproducible de F2.0

Generada en `1cc1065` + scripts de `tools/f2/` (Node 24.12, macOS). Cada `.txt` es la salida de consola y cada `.json` la salida completa del mismo comando. Regenerar (≈ 30 s en total):

```bash
cd "Tesseract v3"; EV=docs/fase2/evidencia
node tools/f2/ki22-diagnostico.mjs --json $EV/ki22-etapas-ill-real-caja-botanica.json > $EV/ki22-etapas-ill-real-caja-botanica.txt
node tools/f2/ki22-diagnostico.mjs tests/fixtures/real/caja-botanica-real.dieline.json --json $EV/ki22-etapas-caja-botanica-real.json > $EV/ki22-etapas-caja-botanica-real.txt
node tools/f2/ki22-diagnostico.mjs tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json --escalas 0.25,0.5,0.6,0.7,0.75,1,2 --json $EV/ki22-etapas-ill-real-caja-simple.json > $EV/ki22-etapas-ill-real-caja-simple.txt
node tools/f2/ki22-predicados.mjs --json $EV/ki22-predicados-ill-real-caja-botanica.json > $EV/ki22-predicados-ill-real-caja-botanica.txt
node tools/f2/ki22-predicados.mjs tests/fixtures/real/caja-botanica-real.dieline.json --json $EV/ki22-predicados-caja-botanica-real.json > $EV/ki22-predicados-caja-botanica-real.txt
node tools/f2/ki22-predicados.mjs tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json --json $EV/ki22-predicados-ill-real-caja-simple.json > $EV/ki22-predicados-ill-real-caja-simple.txt
node tools/f2/motor-web.mjs --json $EV/motor-web-vs-legacy.json > $EV/motor-web-vs-legacy.txt
node tools/f2/experimento-tolerancias.mjs --json $EV/experimento-tolerancias.json > $EV/experimento-tolerancias.txt
node tools/f2/metamorficas.mjs --json $EV/metamorficas-y-correspondencia.json > $EV/metamorficas-y-correspondencia.txt
```

| Archivo | Qué demuestra | Documento |
|---|---|---|
| `ki22-etapas-*.{txt,json}` | Etapas E1–E10 por escala, réplica = `buildPanels` real (columna `replica`), primera divergencia y elementos distintos | `01` §3.1, §3.3 |
| `ki22-predicados-*.{txt,json}` | Escala crítica de cada predicado con 0,5 mm y explicación de cada transición del barrido de 601 escalas | `01` §3.3, §3.4 |
| `motor-web-vs-legacy.{txt,json}` | Legacy y motor web (`c0aeb34`, solo lectura) sobre 6 fixtures × 15 escalas | `06` §2 |
| `experimento-tolerancias.{txt,json}` | Sombras parametrizadas (control ε = 0,5 ≡ motor real: **OK**) con ε de 0,001 a 0,5 mm | `03` §3, `06` §2 |
| `metamorficas-y-correspondencia.{txt,json}` | Traslación, rotación, reflexión, permutaciones; correspondencia panel a panel con el oráculo | `01` §3.2, §3.5 |
| `run-all-F2.0.txt` | Batería de regresión `tests/run-all.sh` en el estado entregado | `00` §5 |

**Resultados negativos conservados:** el motor web tal cual falla con la extracción real (`motor-web-vs-legacy`); el legacy con ε pequeño sigue sin conservar área (`experimento-tolerancias`); la conservación de área sola no detecta fusiones de paneles (web con snap 0,001: 8 paneles con área conservada).
Los bundles del motor web se escriben en `tests/results/f2/` (ignorado por git) y requieren la carpeta hermana `../tesseract-web` en `c0aeb34`.

## F2A-0 (2026-10-27)

```bash
node tools/f2/matriz-correspondencia.mjs                                    # → f2a0-matriz-correspondencia.{md,json}
node tools/f2/diferencias-motor-web.mjs --json $EV/f2a0-diferencias-motor-web.json > $EV/f2a0-diferencias-motor-web.txt
node tools/f2/evaluar-predicados.mjs --json $EV/f2a0-evaluacion-predicados.json > $EV/f2a0-evaluacion-predicados.txt
node tests/tools/make-f2-golden.mjs                                         # → tests/golden/f2-caja-botanica.golden.json (desde el oráculo)
node --test tests/node/f2-*.test.mjs                                         # 95 pruebas de F2A-0
```

| Archivo | Qué demuestra | Documento |
|---|---|---|
| `f2a0-matriz-correspondencia.{md,json}` | 13 paneles y 12 creases del oráculo en las 3 extracciones frente al legacy (×1 y ×0,75), con clase de cada diferencia | `F2A0_02` §3, §5 |
| `f2a0-diferencias-motor-web.{json,txt}` | Por qué el motor web acierta con la extracción original y lanza con la de Illustrator real (DP-5, KI-34) | `F2A0_06` |
| `f2a0-evaluacion-predicados.{json,txt}` | Frecuencia de orientaciones exactamente nulas y coste de tres estrategias de predicado (DP-4) | `F2A0_07` §3 |
| `run-all-F2A-0.txt` | Batería de regresión con las pruebas de F2A-0 | `F2A0_00` §4 |
