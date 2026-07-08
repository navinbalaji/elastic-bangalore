#!/usr/bin/env bash
# Build one release archive: scripts/build-one.sh <version> <goos> <goarch>
set -euo pipefail

VERSION="${1:?version required, e.g. v0.1.0}"
GOOS="${2:?goos required}"
GOARCH="${3:?goarch required}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
NAME="elastic-bangalore"
PKG="./cmd/elastic-bangalore/"

cd "$ROOT"
mkdir -p "$DIST"
cp lab-guide.md internal/guide/assets/lab-guide.md

out="$NAME"
[[ "$GOOS" == "windows" ]] && out="${NAME}.exe"

export GOOS GOARCH
ldflags="-s -w"
if [[ "$GOOS" == "darwin" ]]; then
  export CGO_ENABLED=1
  ldflags="-s -w -linkmode=external"
else
  export CGO_ENABLED=0
fi

bin="dist/${out}"
go build -ldflags="$ldflags" -o "$bin" "$PKG"

stage="dist/stage-${GOOS}-${GOARCH}"
rm -rf "$stage"
mkdir -p "$stage"
cp "$bin" "$stage/$out"
cp lab-guide.md properties-dataset.csv README.md INSTALL.txt "$stage/"

archive_base="${NAME}_${VERSION}_${GOOS}_${GOARCH}"
if [[ "$GOOS" == "windows" ]]; then
  (cd "$stage" && zip -r "../${archive_base}.zip" .)
else
  tar -czf "dist/${archive_base}.tar.gz" -C "$stage" .
fi

rm -rf "$stage" "$bin"
echo "Built dist/${archive_base}.*"
