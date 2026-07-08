#!/usr/bin/env bash
# Build macOS universal binary (arm64 + amd64): scripts/build-macos-universal.sh <version>
set -euo pipefail

VERSION="${1:?version required, e.g. v0.1.0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
NAME="elastic-bangalore"
PKG="./cmd/elastic-bangalore/"

cd "$ROOT"
mkdir -p "$DIST"
cp lab-guide.md internal/guide/assets/lab-guide.md

build_arch() {
  local arch="$1"
  export GOOS=darwin
  export GOARCH="$arch"
  export CGO_ENABLED=1
  go build -ldflags="-s -w -linkmode=external" -o "dist/${NAME}-${arch}" "$PKG"
}

build_arch arm64
build_arch amd64

lipo -create -output "dist/${NAME}" "dist/${NAME}-arm64" "dist/${NAME}-amd64"
rm -f "dist/${NAME}-arm64" "dist/${NAME}-amd64"

stage="dist/stage-darwin-universal"
rm -rf "$stage"
mkdir -p "$stage"
cp "dist/${NAME}" "$stage/${NAME}"
cp lab-guide.md properties-dataset.csv README.md INSTALL.txt "$stage/"

archive="dist/${NAME}_${VERSION}_darwin_universal.tar.gz"
tar -czf "$archive" -C "$stage" .
rm -rf "$stage" "dist/${NAME}"
echo "Built $archive"
