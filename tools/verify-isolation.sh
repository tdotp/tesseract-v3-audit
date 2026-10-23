#!/bin/bash
# Verifica el aislamiento de Tesseract V3 (decisión D1). Solo LECTURA. Sale con código != 0 si algo no coincide.
#   1) reference/legacy-baseline coincide byte a byte con reference/legacy-baseline.SHA256SUMS
#   2) la extensión INSTALADA coincide con ese mismo baseline (no ha sido modificada por nadie)
#   3) panel/ solo difiere del baseline en archivos esperados (lista abajo)
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALLED="${TESSERACT_INSTALLED:-/Library/Application Support/Adobe/CEP/extensions/tesseract}"
fail=0
echo "== 1) baseline congelado vs manifiesto"
( cd "$ROOT/reference/legacy-baseline" && shasum -a 256 -c ../legacy-baseline.SHA256SUMS --quiet ) && echo "OK" || { echo "FALLA: el baseline cambió"; fail=1; }
extra=$(cd "$ROOT/reference/legacy-baseline" && find . -type f ! -name .DS_Store | LC_ALL=C sort | diff - <(cut -c67- "$ROOT/reference/legacy-baseline.SHA256SUMS" | LC_ALL=C sort) || true)
[ -z "$extra" ] || { echo "FALLA: archivos de más/de menos en el baseline:"; echo "$extra"; fail=1; }
echo "== 2) extensión instalada vs baseline"
if [ -d "$INSTALLED" ]; then
  ( cd "$INSTALLED" && shasum -a 256 -c "$ROOT/reference/legacy-baseline.SHA256SUMS" --quiet ) && echo "OK (archivos del baseline idénticos)" || { echo "FALLA: la extensión instalada difiere del baseline"; fail=1; }
  extra=$(cd "$INSTALLED" && find . -type f ! -name .DS_Store | LC_ALL=C sort | diff - <(cut -c67- "$ROOT/reference/legacy-baseline.SHA256SUMS" | LC_ALL=C sort) || true)
  [ -z "$extra" ] || { echo "FALLA: la instalada tiene archivos distintos:"; echo "$extra"; fail=1; }
else echo "AVISO: no se encontró $INSTALLED"; fail=1; fi
echo "== 3) panel/ vs baseline (diferencias esperadas)"
d=$(diff -rq "$ROOT/reference/legacy-baseline" "$ROOT/panel" | grep -v '\.DS_Store' || true)
echo "${d:-(sin diferencias)}"
echo "== 4) no hay rutas instaladas del bundle V3 en el CEP del usuario (no autorizado)"
if [ -e "$HOME/Library/Application Support/Adobe/CEP/extensions/tesseract-v3" ]; then echo "AVISO: existe tesseract-v3 en CEP del usuario"; fail=1; else echo "OK (no instalado)"; fi
exit $fail
