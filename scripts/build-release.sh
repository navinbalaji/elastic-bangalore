#!/usr/bin/env bash
# Build all platform archives locally (requires macOS host for darwin builds).
set -euo pipefail
VERSION="${1:-dev}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$ROOT/dist"
mkdir -p "$ROOT/dist"

bash "$ROOT/scripts/build-one.sh" "$VERSION" linux amd64
bash "$ROOT/scripts/build-one.sh" "$VERSION" linux arm64
bash "$ROOT/scripts/build-one.sh" "$VERSION" windows amd64
bash "$ROOT/scripts/build-one.sh" "$VERSION" windows arm64

if [[ "$(uname -s)" == "Darwin" ]]; then
  bash "$ROOT/scripts/build-macos-universal.sh" "$VERSION"
  bash "$ROOT/scripts/build-one.sh" "$VERSION" darwin amd64
  bash "$ROOT/scripts/build-one.sh" "$VERSION" darwin arm64
else
  echo "Skip macOS builds (run on macOS or use GitHub Actions)"
fi

ls -la "$ROOT/dist/"
