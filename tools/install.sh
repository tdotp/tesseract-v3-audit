#!/bin/bash
# Instalación paralela de Tesseract V3 en CEP — A3: SOLO MODO DRY-RUN.
#   tools/install.sh [--dry-run]            (por defecto) verifica y muestra el plan; NO escribe nada
#   tools/install.sh --snapshot             imprime el estado actual de las carpetas CEP (para comparar antes/después)
#   tools/install.sh --uninstall --dry-run  muestra qué se retiraría (rollback); NO borra nada
# La instalación real (--install) y la desinstalación real están DESHABILITADAS: requieren autorización explícita del usuario (ver HANDOFF.md).
# Variables (solo pruebas): TESS_DIST_DIR (carpeta dist), TESS_EXTRA_CEP_DIRS (carpetas CEP adicionales a revisar, separadas por ':').
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${TESS_DIST_DIR:-$ROOT/dist}"
USER_CEP="$HOME/Library/Application Support/Adobe/CEP/extensions"
SYS_CEP="/Library/Application Support/Adobe/CEP/extensions"
DEST="$USER_CEP/tesseract-v3"
EXPECT_BUNDLE="com.tato.tesseract.v3"; EXPECT_EXT="com.tato.tesseract.v3.panel"
MODE="dry-run"; UNINSTALL=0
for a in "$@"; do case "$a" in
  --dry-run) MODE="dry-run";; --snapshot) MODE="snapshot";; --uninstall) UNINSTALL=1;;
  --install|--yes|--force) echo "RECHAZADO: la instalación real está deshabilitada en A3. Requiere autorización explícita del usuario (HANDOFF.md §2)."; exit 3;;
  *) echo "opción desconocida: $a"; exit 2;; esac; done
if [ "$UNINSTALL" = 1 ] && [ "$MODE" != "dry-run" ]; then exit 2; fi

snapshot() { # listado de solo lectura de ambas carpetas CEP
  for d in "$SYS_CEP" "$USER_CEP"; do echo "## $d"; if [ -d "$d" ]; then (cd "$d" && for e in *; do [ -e "$e" ] || continue; m="$e/CSXS/manifest.xml"; id="-"; [ -f "$m" ] && id=$(python3 - "$m" <<'PY'
import sys, xml.etree.ElementTree as ET
try:
    r = ET.parse(sys.argv[1]).getroot(); print(r.get("ExtensionBundleId", "?"))
except Exception as e:
    print("manifiesto ilegible")
PY
); printf '%s\t%s\n' "$e" "$id"; done); else echo "(no existe)"; fi; done; }
[ "$MODE" = "snapshot" ] && { snapshot; exit 0; }

fail=0; ok() { echo "  OK   $1"; }; bad() { echo "  FALLA $1"; fail=1; }
echo "== Tesseract V3 · instalación en modo DRY-RUN (no se escribe nada)"
[ "$UNINSTALL" = 1 ] && { echo "== Rollback (desinstalación) — qué se retiraría:"; if [ -e "$DEST" ]; then echo "  se borraría SOLO: $DEST"; (cd "$DEST" && find . -type f | LC_ALL=C sort | sed 's/^/    /'); else echo "  $DEST no existe: no hay nada que retirar"; fi; echo "DRY-RUN: no se borró nada."; exit 0; }

echo "== 1) paquete (dist) íntegro"
if [ -d "$DIST" ] && [ -f "$DIST/SHA256SUMS" ]; then
  if (cd "$DIST" && shasum -a 256 -c SHA256SUMS --quiet 2>/dev/null); then ok "SHA256SUMS verifica ($(grep -c . "$DIST/SHA256SUMS") archivos)"; else bad "las huellas de $DIST no coinciden"; fi
  extra=$(cd "$DIST" && find . -type f ! -name .DS_Store ! -name SHA256SUMS ! -name BUILD_INFO.json | LC_ALL=C sort | diff - <(cut -c67- SHA256SUMS | LC_ALL=C sort) || true)
  [ -z "$extra" ] && ok "no hay archivos fuera de SHA256SUMS" || { bad "archivos no listados / faltantes:"; echo "$extra" | sed 's/^/        /'; }
  [ -f "$DIST/.debug" ] && echo "  AVISO: dist contiene .debug (build de validación; no distribuir)"
  [ -f "$DIST/BUILD_INFO.json" ] && ok "BUILD_INFO.json presente" || bad "falta BUILD_INFO.json"
else bad "no hay $DIST con SHA256SUMS (ejecuta: node tools/build/build.mjs)"; fi

echo "== 2) manifiesto: XML válido, identidad V3 y sin colisiones con extensiones instaladas"
if [ -f "$DIST/CSXS/manifest.xml" ]; then
  extdirs="$SYS_CEP:$USER_CEP:${TESS_EXTRA_CEP_DIRS:-}"
  python3 - "$DIST/CSXS/manifest.xml" "$EXPECT_BUNDLE" "$EXPECT_EXT" "$extdirs" "$DEST" <<'PY' || fail=1
import sys, os, glob, xml.etree.ElementTree as ET
man, eb, ee, dirs, dest = sys.argv[1:6]; rc = 0
def ids(path):
    r = ET.parse(path).getroot(); return r.get("ExtensionBundleId"), [e.get("Id") for e in r.iter("Extension")]
try:
    bid, eids = ids(man)
except Exception as e:
    print("  FALLA el manifiesto no es XML válido:", e); sys.exit(1)
print("  OK   XML bien formado" if True else "")
if bid == eb and set(eids) == {ee}: print(f"  OK   identidad V3: bundle {bid}, extensión {ee}")
else: print(f"  FALLA identidad inesperada: bundle {bid}, extensiones {eids}"); rc = 1
clash = []
for d in [x for x in dirs.split(":") if x]:
    for m in glob.glob(os.path.join(d, "*", "CSXS", "manifest.xml")):
        if os.path.realpath(os.path.dirname(os.path.dirname(m))) == os.path.realpath(dest): continue
        try:
            b2, e2 = ids(m)
        except Exception:
            continue
        if b2 == bid or set(e2) & set(eids): clash.append((m, b2, e2))
if clash:
    for m, b2, e2 in clash: print(f"  FALLA colisión de identidad con {m} ({b2}, {e2})")
    rc = 1
else: print("  OK   sin colisión de bundle/extensión con las extensiones instaladas (sistema y usuario)")
sys.exit(rc)
PY
else bad "falta $DIST/CSXS/manifest.xml"; fi

echo "== 3) destino"
echo "  destino previsto: $DEST"
case "$DEST" in "$HOME/Library/"*) ok "dentro de ~/Library (nivel usuario)";; *) bad "el destino no está en ~/Library";; esac
case "$DEST" in /Library/*) bad "el destino está en /Library (prohibido)";; esac
[ -e "$DEST" ] && bad "el destino YA existe (no se sobrescribe)" || ok "el destino no existe (no se sobrescribiría nada)"
[ -d "$USER_CEP" ] && { [ -w "$USER_CEP" ] && ok "carpeta de extensiones de usuario existe y es escribible" || bad "carpeta de usuario sin permiso de escritura"; } || echo "  AVISO: $USER_CEP no existe (la instalación real la crearía)"
echo "== 4) aislamiento (baseline intacto; extensión instalada idéntica al baseline)"
if "$ROOT/tools/verify-isolation.sh" >/tmp/tess-iso.$$ 2>&1; then ok "verify-isolation.sh verde"; else bad "verify-isolation.sh falla:"; sed 's/^/        /' /tmp/tess-iso.$$; fi; rm -f /tmp/tess-iso.$$

echo "== 5) plan (lo que copiaría la instalación real)"
if [ -f "$DIST/SHA256SUMS" ]; then total=0; while read -r h f; do f=${f#./}; [ -f "$DIST/$f" ] || continue; sz=$(stat -f%z "$DIST/$f"); total=$((total+sz)); printf '    %-28s %9s B  %s\n' "$f" "$sz" "${h:0:12}"; done < "$DIST/SHA256SUMS"; echo "    total: $total B → $DEST"; fi
echo "== 6) rollback (cuando exista una instalación): borrar SOLO '$DEST', reiniciar Illustrator, ejecutar tools/verify-isolation.sh y 'tools/install.sh --snapshot' y comparar con el snapshot previo"
if [ $fail = 0 ]; then echo "DRY-RUN CORRECTO: todas las comprobaciones pasan. No se escribió nada. La instalación real sigue sin autorización."; exit 0; else echo "DRY-RUN CON FALLOS: ver arriba. No se escribió nada."; exit 1; fi
