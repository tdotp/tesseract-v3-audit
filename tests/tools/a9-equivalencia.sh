#!/bin/bash
# A9 — Equivalencia función a función entre el bundle de la REFERENCIA (src/ de 3ea0d8a, A8 validada en CEP real) y el bundle ACTUAL (src/), a cualquier sangría y sin «S.».
#   tests/tools/a9-equivalencia.sh [salida.txt]       (sale con 1 si alguna función preexistente cambió, se duplicó o desapareció)
cd "$(dirname "$0")/../.." || exit 2
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; REF=${A9_REF:-3ea0d8a}
git archive "$REF" src | tar -x -C "$TMP" || exit 2
node tools/build/build.mjs --entry "$TMP/src/main.js" --assets "$PWD/panel" --out "$TMP/ref" >/dev/null || exit 2
node tools/build/build.mjs --out "$TMP/act" >/dev/null || exit 2
OUT=$(node tests/tools/a7-bundle-eq.mjs "$TMP/ref/main.js" "$TMP/act/main.js"); RC=$?
# A9: además, ninguna función preexistente puede DESAPARECER (soloEnAnterior) — a7-bundle-eq solo falla con distintas o duplicadas
if [ "$RC" = 0 ] && node -e 'const o=JSON.parse(process.argv[1]); process.exit(o.soloEnAnterior.length ? 1 : 0)' "$OUT"; then :; else RC=1; fi
echo "$OUT"; [ -n "$1" ] && echo "$OUT" > "$1"; exit $RC
