#!/bin/bash
# Ejecuta TODA la batería de caracterización de A2. Uso: tests/run-all.sh [--mutations] [--soak]
#   --mutations  añade los controles negativos (aplican mutaciones a COPIAS de panel/ y exigen que las pruebas fallen)
#   --soak       añade la prueba larga de 25 ciclos de plegado sin crecimiento de recursos
cd "$(dirname "$0")/.." || exit 2; fail=0
echo "== 1/3 aislamiento"; tools/verify-isolation.sh || fail=1
echo "== 2/3 Node (geometría, defectos conocidos, extracción, arte, GLB, .jsx, aislamiento)"; node --test 'tests/node/*.test.mjs' 2>&1 | grep -E "^(✖|ℹ (tests|pass|fail|skipped))" ; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
echo "== 3/3 navegador (Chrome headless: GPU, regresión, materiales, arte, GLB, interacciones, métricas)"
if [[ " $* " == *" --soak "* ]]; then export SOAK=1; fi
node --test tests/browser/browser.test.mjs 2>&1 | grep -E "^(✖|ℹ (tests|pass|fail|skipped))"; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
if [[ " $* " == *" --mutations "* ]]; then echo "== controles negativos"; tests/tools/mutation-check.sh || fail=1; tests/tools/mutation-check-browser.sh || fail=1; fi
[ $fail = 0 ] && echo "TODO EN VERDE" || echo "HAY FALLOS"; exit $fail
