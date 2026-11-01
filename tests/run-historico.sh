#!/bin/bash
# D-0 (2026-11-01) — Batería HISTÓRICA de F1. Ejecuta SIN CAMBIOS el tests/run-all.sh del commit congelado de la línea histórica (HIST_COMMIT de
# tests/lib/d0.mjs: la fuente de dist-a9) en un clon temporal del repositorio, con sus pruebas, goldens y huellas de entonces. Así las aserciones de
# F1 («src = referencia», KI-24/KI-28 «se preservan», dist-a9 byte a byte…) siguen verificando el artefacto histórico mientras tests/run-all.sh
# verifica la línea de producto. Uso: tests/run-historico.sh [--mutations] [--soak]   (mismos argumentos que el run-all histórico)
# - Solo LECTURA sobre este repositorio: clona en un directorio temporal, quita el remoto del clon (la prueba de aislamiento exige que no haya),
#   enlaza node_modules y ../TESSERACT_MEJORA (evidencia opcional que algunas pruebas leen junto al repositorio) y lo borra todo al terminar.
# - Como el run-all histórico empieza por el aislamiento ESTRICTO, exige que no haya ninguna copia tesseract-v3* instalada (igual que antes de D-0).
# - Ejecutar DESPUÉS de tests/run-all.sh y tests/run-experimental.sh, nunca a la vez.
set -u
cd "$(dirname "$0")/.." || exit 2; ROOT="$(pwd)"
HIST=$(node --input-type=module -e "import { HIST_COMMIT } from './tests/lib/d0.mjs'; console.log(HIST_COMMIT)") || exit 2
T=$(mktemp -d "${TMPDIR:-/tmp}/tess-historico.XXXXXX") || exit 2; trap 'rm -rf "$T"' EXIT
git clone -q --no-hardlinks "$ROOT" "$T/repo" && git -C "$T/repo" checkout -q --detach "$HIST" && git -C "$T/repo" remote remove origin || { echo "no se pudo preparar el clon en $HIST"; exit 2; }
[ "$(git -C "$T/repo" rev-parse HEAD)" = "$HIST" ] || { echo "el clon no está en $HIST"; exit 2; }
ln -s "$ROOT/node_modules" "$T/repo/node_modules"; [ -d "$ROOT/../TESSERACT_MEJORA" ] && ln -s "$(cd "$ROOT/../TESSERACT_MEJORA" && pwd)" "$T/TESSERACT_MEJORA"
echo "== batería HISTÓRICA de F1 (dist-a9) sobre $HIST, sin cambios, en un clon temporal"
( cd "$T/repo" && tests/run-all.sh "$@" ); s=$?
[ "$s" = 0 ] && echo "HISTÓRICO EN VERDE" || echo "HISTÓRICO CON FALLOS"; exit "$s"
