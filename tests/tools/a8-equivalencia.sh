#!/bin/bash
# A8 — Equivalencia función a función entre el bundle de la REFERENCIA (src/ de a322d7a, A7 validada en CEP real) y el bundle ACTUAL (src/), a cualquier sangría y sin «S.».
#   tests/tools/a8-equivalencia.sh [salida.txt]       (sale con 1 si alguna función preexistente cambió, se duplicó o desapareció)
cd "$(dirname "$0")/../.." || exit 2
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; REF=${A8_REF:-a322d7a}
git archive "$REF" src | tar -x -C "$TMP" || exit 2
node tools/build/build.mjs --entry "$TMP/src/main.js" --assets "$PWD/panel" --out "$TMP/ref" >/dev/null || exit 2
node tools/build/build.mjs --out "$TMP/act" >/dev/null || exit 2
OUT=$(node tests/tools/a7-bundle-eq.mjs "$TMP/ref/main.js" "$TMP/act/main.js"); RC=$?
echo "$OUT"; [ -n "$1" ] && echo "$OUT" > "$1"; exit $RC
