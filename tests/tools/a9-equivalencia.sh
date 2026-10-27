#!/bin/bash
# A9 — Equivalencia función a función entre el bundle de la REFERENCIA (src/ de 3ea0d8a, A8 validada en CEP real) y el bundle ACTUAL (src/), a cualquier sangría y sin «S.».
#   tests/tools/a9-equivalencia.sh [salida.txt]       (sale con 1 si alguna función preexistente cambió, se duplicó o desapareció)
cd "$(dirname "$0")/../.." || exit 2
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; REF=${A9_REF:-3ea0d8a}
git archive "$REF" src | tar -x -C "$TMP" || exit 2
node tools/build/build.mjs --entry "$TMP/src/main.js" --assets "$PWD/panel" --out "$TMP/ref" >/dev/null || exit 2
node tools/build/build.mjs --out "$TMP/act" >/dev/null || exit 2
# A9.3: a9-bundle-eq (a7-bundle-eq + renombrados de esbuild declarados); falla si alguna función preexistente cambia, se duplica o DESAPARECE
OUT=$(node tests/tools/a9-bundle-eq.mjs "$TMP/ref/main.js" "$TMP/act/main.js"); RC=$?
# A9.5: los 15 manejadores (anónimos, fuera del alcance de a9-bundle-eq): bloque de registros de la referencia = cuerpo de bindEvents, línea a línea
if grep -q "function bindEvents()" "$TMP/act/main.js"; then H=$(node tests/tools/a9-manejadores-bundle.mjs "$TMP/ref/main.js" "$TMP/act/main.js") || RC=1; OUT=$(node -e 'const o=JSON.parse(process.argv[1]); o.manejadores=JSON.parse(process.argv[2]); console.log(JSON.stringify(o,null,1))' "$OUT" "$H"); fi
echo "$OUT"; [ -n "$1" ] && echo "$OUT" > "$1"; exit $RC
