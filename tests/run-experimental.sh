#!/bin/bash
# F2A-1 — Pruebas del núcleo geométrico EXPERIMENTAL (experimental/geometria/). Van aparte de tests/node/ a propósito: son intensivas en
# CPU y, ejecutadas en paralelo con la batería de F1, provocan carreras ya latentes en pruebas de F1 (install-dry-run comprueba que no
# quede ningún /tmp/tess-iso.*, que install.sh crea mientras corre). Se ejecutan DESPUÉS de tests/run-all.sh, nunca a la vez.
cd "$(dirname "$0")/.." || exit 2
node --test 'tests/experimental/*.test.mjs' 2>&1 | grep -E "^(✖|ℹ (tests|pass|fail|skipped))"; s=${PIPESTATUS[0]}
[ "$s" = 0 ] && echo "EXPERIMENTAL EN VERDE" || echo "EXPERIMENTAL CON FALLOS"; exit "$s"
