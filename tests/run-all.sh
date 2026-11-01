#!/bin/bash
# Ejecuta TODA la batería de la LÍNEA DE PRODUCTO (D-0, 2026-11-01; antes: caracterización de A2). Uso: tests/run-all.sh [--mutations] [--soak]
# Orden completo, siempre en secuencia: tests/run-all.sh → tests/run-experimental.sh → tests/run-historico.sh (F1 / dist-a9 desde su commit congelado).
#   --mutations  añade los controles negativos (aplican mutaciones a COPIAS de panel/ y exigen que las pruebas fallen)
#   --soak       añade la prueba larga de 25 ciclos de plegado sin crecimiento de recursos
cd "$(dirname "$0")/.." || exit 2; fail=0
echo "== 1/5 aislamiento"; tools/verify-isolation.sh || fail=1
echo "== 2/5 build del bundle (IIFE, chrome99) y verificación"; node tools/build/build.mjs && node tools/build/build.mjs --verify && tools/install.sh --dry-run | tail -1 || fail=1
echo "== 3/5 Node (geometría, defectos, extracción, arte, GLB, .jsx, aislamiento, build, Chromium 99, instalador dry-run)"; node --test 'tests/node/*.test.mjs' 2>&1 | grep -E "^(✖|ℹ (tests|pass|fail|skipped))" ; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
echo "== 4/5 navegador (Chrome headless: baseline · panel · bundle; y con APIs reducidas a Chromium 99)"
if [[ " $* " == *" --soak "* ]]; then export SOAK=1; fi
node --test tests/browser/browser.test.mjs 2>&1 | grep -E "^(✖|ℹ (tests|pass|fail|skipped))"; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
node --test tests/browser/a7.test.mjs 2>&1 | grep -E "^(✖|ℹ (tests|pass|fail|skipped))"; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
node --test tests/browser/a8.test.mjs 2>&1 | grep -E "^(✖|ℹ (tests|pass|fail|skipped))"; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
node --test tests/browser/a9.test.mjs 2>&1 | grep -E "^(✖|ℹ (tests|pass|fail|skipped))"; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
node --test tests/browser/chromium99.test.mjs 2>&1 | grep -E "^(✖|ℹ (tests|pass|fail|skipped))"; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
node --test tests/browser/bridge.test.mjs 2>&1 | grep -E "^(✖|ℹ (tests|pass|fail|skipped))"; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
node --test tests/browser/a5-observar.test.mjs 2>&1 | grep -E "^(✖|ℹ (tests|pass|fail|skipped))"; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
node --test tests/browser/a4-cdp.test.mjs 2>&1 | grep -E "^(✖|ℹ (tests|pass|fail|skipped))"; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
echo "== 5/5 línea de producto 3.0.1-dev (D-0: robustez H-02/H-03/H-05/KI-24/H-07; GLB KI-02/H-06 en Node y en el bundle de producto)"
node --test 'tests/producto/*.test.mjs' 2>&1 | grep -E "^(✖|ℹ (tests|pass|fail|skipped))"; [ "${PIPESTATUS[0]}" = 0 ] || fail=1
if [[ " $* " == *" --mutations "* ]]; then echo "== controles negativos"; tests/tools/mutation-check.sh || fail=1; tests/tools/mutation-check-browser.sh || fail=1; tests/tools/mutation-check-dist.sh || fail=1; fi
[ $fail = 0 ] && echo "TODO EN VERDE" || echo "HAY FALLOS"; exit $fail
