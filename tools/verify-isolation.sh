#!/bin/bash
# Verifica el aislamiento de Tesseract V3 (decisión D1). Solo LECTURA. Sale con código != 0 si algo no coincide.
#   1) reference/legacy-baseline coincide byte a byte con reference/legacy-baseline.SHA256SUMS
#   2) la extensión INSTALADA coincide con ese mismo baseline (no ha sido modificada por nadie)
#   3) panel/ solo difiere del baseline en archivos esperados (lista abajo)
#   4) V3 no está instalada en el CEP del usuario (estricto por defecto; `--a4-instalado` admite SOLO tesseract-v3 idéntica a dist/, para A4 autorizado)
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
V3_PARENT="$HOME/Library/Application Support/Adobe/CEP/extensions"
if [ "${1:-}" = "--a4-instalado" ]; then
  # Modo A4 (SOLO tras autorización explícita de instalación): se admite exactamente UNA copia, tesseract-v3, idéntica a dist/ (más .debug) y ninguna otra tesseract-v3*.
  DISTD="${TESS_DIST_DIR:-$ROOT/dist}"; V3="$V3_PARENT/tesseract-v3"; otros=$(ls -d "$V3_PARENT"/tesseract-v3* 2>/dev/null | grep -v '/tesseract-v3$' || true)
  if [ -n "$otros" ]; then echo "FALLA: hay copias tesseract-v3* distintas de tesseract-v3:"; echo "$otros"; fail=1
  elif [ ! -d "$V3" ]; then echo "OK (modo A4: no hay copia instalada)"
  else
    if (cd "$V3" && shasum -a 256 -c "$DISTD/SHA256SUMS" --quiet 2>/dev/null); then ok4=1; else ok4=0; fi
    extra=$(cd "$V3" && find . -type f ! -name .DS_Store ! -name .debug ! -name SHA256SUMS ! -name BUILD_INFO.json | LC_ALL=C sort | diff - <(cut -c67- "$DISTD/SHA256SUMS" | LC_ALL=C sort) || true)
    if [ "$ok4" = 1 ] && [ -z "$extra" ]; then echo "OK (modo A4: tesseract-v3 idéntica a dist/, salvo .debug)"; else echo "FALLA: tesseract-v3 no coincide con dist/ ${extra:+(archivos distintos: $extra)}"; fail=1; fi
  fi
elif ls -d "$V3_PARENT/tesseract-v3"* >/dev/null 2>&1; then echo "AVISO: existe una copia tesseract-v3* en el CEP del usuario (no autorizada o pendiente de retirar)"; fail=1; else echo "OK (no instalado)"; fi
exit $fail
